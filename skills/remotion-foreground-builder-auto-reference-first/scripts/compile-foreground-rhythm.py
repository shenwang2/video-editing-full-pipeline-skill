#!/usr/bin/env python3
"""Compile lightweight spoken-beat rhythm into a foreground plan.

The compiler is deterministic and idempotent. It never calls a model, changes
semantic payload text, retimes H3, or assigns primary/supporting layer ranks.
"""

from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path
from typing import Any, Iterable


EVENT_COLLECTIONS = ("middleEvents", "enumerations", "externalMaterials")
REVEAL_SENSITIVE_COMPONENTS = {"VerdictStamp"}
REVEAL_SENSITIVE_PURPOSES = {"verdict"}
TIMESTAMP_EXCLUSIONS = {
    "startMs",
    "endMs",
    "hideAtMs",
    "sourceStartMs",
    "sourceEndMs",
    "segmentStartMs",
    "segmentEndMs",
}
KIND_ORDER = {"externalMaterials": 0, "enumerations": 1, "middleEvents": 2}


def frame_ms(milliseconds: float, fps: float) -> int:
    return max(0, round(round(milliseconds * fps / 1000.0) * 1000.0 / fps))


def numeric(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def iter_payload_timestamps(value: Any, key: str | None = None) -> Iterable[tuple[str, int]]:
    if isinstance(value, dict):
        for child_key, child in value.items():
            yield from iter_payload_timestamps(child, child_key)
    elif isinstance(value, list):
        for child in value:
            yield from iter_payload_timestamps(child, key)
    elif key and key.endswith("AtMs") and key not in TIMESTAMP_EXCLUSIONS and numeric(value):
        yield key, int(value)


def timeline_end(plan: dict[str, Any]) -> int:
    values: list[int] = []
    for key in ("titles",) + EVENT_COLLECTIONS + ("h3Shots",):
        for item in plan.get(key, []) or []:
            if isinstance(item, dict) and numeric(item.get("endMs")):
                values.append(int(item["endMs"]))
    return max(values, default=0)


def event_rows(plan: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    ordinal = 0
    for collection in EVENT_COLLECTIONS:
        for event in plan.get(collection, []) or []:
            if not isinstance(event, dict) or not numeric(event.get("startMs")) or not numeric(event.get("endMs")):
                continue
            rhythm = event.get("rhythm") if isinstance(event.get("rhythm"), dict) else {}
            original_start = int(rhythm.get("originalStartMs", event["startMs"]))
            original_end = int(rhythm.get("originalEndMs", event["endMs"]))
            original_show = rhythm.get("originalShowAtMs", event.get("showAtMs"))
            original_hide = rhythm.get("originalHideAtMs", event.get("hideAtMs"))
            rows.append(
                {
                    "event": event,
                    "collection": collection,
                    "ordinal": ordinal,
                    "id": str(event.get("id") or f"{collection}-{ordinal}"),
                    "originalStartMs": original_start,
                    "originalEndMs": original_end,
                    "originalShowAtMs": original_show,
                    "originalHideAtMs": original_hide,
                    "placement": event.get("placement"),
                    "compositionGroup": event.get("compositionGroup"),
                }
            )
            ordinal += 1
    return rows


def policy_for(event: dict[str, Any]) -> dict[str, Any]:
    policy = event.get("rhythmPolicy")
    return policy if isinstance(policy, dict) else {}


def is_reveal_sensitive(event: dict[str, Any], policy: dict[str, Any]) -> bool:
    if "revealSensitive" in policy:
        return bool(policy["revealSensitive"])
    component = event.get("rendererComponent") or event.get("componentId")
    purpose = event.get("semanticPurpose") or event.get("memoryType")
    return component in REVEAL_SENSITIVE_COMPONENTS or purpose in REVEAL_SENSITIVE_PURPOSES


def same_entry_cluster(first: dict[str, Any], second: dict[str, Any], window_ms: int) -> bool:
    if abs(first["originalStartMs"] - second["originalStartMs"]) > window_ms:
        return False
    first_group = first.get("compositionGroup")
    second_group = second.get("compositionGroup")
    return bool(first_group and first_group == second_group) or first["originalStartMs"] == second["originalStartMs"]


def cluster_rows(rows: list[dict[str, Any]], window_ms: int) -> list[list[dict[str, Any]]]:
    pending = sorted(rows, key=lambda row: (row["originalStartMs"], row["ordinal"]))
    clusters: list[list[dict[str, Any]]] = []
    while pending:
        seed = pending.pop(0)
        cluster = [seed]
        rest: list[dict[str, Any]] = []
        for row in pending:
            if same_entry_cluster(seed, row, window_ms):
                cluster.append(row)
            else:
                rest.append(row)
        pending = rest
        clusters.append(cluster)
    return clusters


def next_blocking_start(row: dict[str, Any], rows: list[dict[str, Any]], default_end: int) -> int:
    candidates = []
    for other in rows:
        if other is row or other.get("placement") != row.get("placement"):
            continue
        if other["originalStartMs"] < row["originalEndMs"]:
            continue
        same_group = row.get("compositionGroup") and row.get("compositionGroup") == other.get("compositionGroup")
        if same_group and row["event"].get("allowConcurrent") and other["event"].get("allowConcurrent"):
            continue
        candidates.append(other["originalStartMs"])
    return min(candidates, default=default_end)


def latest_grounded_beat(row: dict[str, Any]) -> int:
    start = row["originalStartMs"]
    end = row["originalEndMs"]
    values = [start]
    payload = row["event"].get("payload")
    for _, timestamp in iter_payload_timestamps(payload):
        # Foreground plans use absolute clean-timeline timestamps. Ignore an
        # apparent event-local value rather than guessing and moving it.
        if start - 500 <= timestamp <= end + 5000:
            values.append(timestamp)
    return max(values)


def clamp_new_transition_overlaps(rows: list[dict[str, Any]]) -> None:
    """Do not create a new unverified overlap merely to gain visual lead-in."""
    ordered = sorted(rows, key=lambda row: (row["originalStartMs"], row["ordinal"]))
    for index, row in enumerate(ordered):
        event = row["event"]
        proposed_start = int(event["startMs"])
        boundary = proposed_start
        for previous in ordered[:index]:
            if previous["originalEndMs"] > row["originalStartMs"]:
                # The source plan already intended these events to coexist.
                continue
            previous_event = previous["event"]
            previous_end = int(previous_event["endMs"])
            if previous_end <= proposed_start:
                continue
            same_group = row.get("compositionGroup") and row.get("compositionGroup") == previous.get("compositionGroup")
            verified_different_zone = (
                same_group
                and event.get("allowConcurrent")
                and previous_event.get("allowConcurrent")
                and row.get("placement") != previous.get("placement")
            )
            if verified_different_zone:
                continue
            boundary = max(boundary, previous_end)
        if boundary <= proposed_start:
            event["rhythm"]["transitionClampMs"] = 0
            continue
        old_start = int(event["startMs"])
        event["startMs"] = min(boundary, row["originalStartMs"])
        if numeric(event.get("showAtMs")) and int(event["showAtMs"]) == old_start:
            event["showAtMs"] = event["startMs"]
        event["rhythm"]["transitionClampMs"] = int(event["startMs"]) - old_start
        event["rhythm"]["entryLeadMs"] = row["originalStartMs"] - int(event["startMs"])


def compile_plan(
    source: dict[str, Any],
    *,
    fps: float = 30.0,
    entry_lead_ms: int = 140,
    stagger_ms: int = 80,
    simultaneous_window_ms: int = 60,
    minimum_final_hold_ms: int = 900,
) -> tuple[dict[str, Any], dict[str, Any]]:
    plan = copy.deepcopy(source)
    rows = event_rows(plan)
    end_limit = timeline_end(plan)
    changes: list[dict[str, Any]] = []

    for row in rows:
        event = row["event"]
        policy = policy_for(event)
        requested_lead = int(policy.get("entryLeadMs", entry_lead_ms))
        if is_reveal_sensitive(event, policy):
            requested_lead = 0
        lead = frame_ms(max(0, requested_lead), fps)
        new_start = max(0, row["originalStartMs"] - lead)
        event["startMs"] = new_start
        if numeric(row.get("originalShowAtMs")) and int(row["originalShowAtMs"]) == row["originalStartMs"]:
            event["showAtMs"] = new_start
        event["endMs"] = row["originalEndMs"]
        if numeric(row.get("originalHideAtMs")):
            event["hideAtMs"] = int(row["originalHideAtMs"])
        rhythm = event.get("rhythm") if isinstance(event.get("rhythm"), dict) else {}
        rhythm.update(
            {
                "compilerVersion": 1,
                "originalStartMs": row["originalStartMs"],
                "originalEndMs": row["originalEndMs"],
                "entryLeadMs": row["originalStartMs"] - new_start,
                "staggerDelayMs": 0,
                "revealSensitive": is_reveal_sensitive(event, policy),
                "internalProgression": "spoken-beat",
                "accumulation": "retain-spoken-items-until-event-exit-unless-explicitly-hidden",
            }
        )
        if numeric(row.get("originalShowAtMs")):
            rhythm["originalShowAtMs"] = int(row["originalShowAtMs"])
        if numeric(row.get("originalHideAtMs")):
            rhythm["originalHideAtMs"] = int(row["originalHideAtMs"])
        event["rhythm"] = rhythm

    for cluster in cluster_rows(rows, simultaneous_window_ms):
        if len(cluster) < 2:
            continue
        ordered = sorted(cluster, key=lambda row: (KIND_ORDER.get(row["collection"], 9), row["ordinal"]))
        for index, row in enumerate(ordered):
            event = row["event"]
            available_lead = int(event["rhythm"]["entryLeadMs"])
            delay = min(frame_ms(index * stagger_ms, fps), available_lead)
            if delay <= 0:
                continue
            old_start = int(event["startMs"])
            new_start = old_start + delay
            event["startMs"] = new_start
            if numeric(event.get("showAtMs")) and int(event["showAtMs"]) == old_start:
                event["showAtMs"] = new_start
            event["rhythm"]["entryLeadMs"] = row["originalStartMs"] - new_start
            event["rhythm"]["staggerDelayMs"] = delay

    for row in rows:
        event = row["event"]
        policy = policy_for(event)
        minimum_hold = int(policy.get("minimumFinalHoldMs", minimum_final_hold_ms))
        latest = latest_grounded_beat(row)
        requested_end = frame_ms(latest + max(0, minimum_hold), fps)
        blocking_start = next_blocking_start(row, rows, end_limit)
        allowed_end = min(end_limit, blocking_start) if end_limit else blocking_start
        new_end = max(row["originalEndMs"], min(requested_end, allowed_end))
        event["endMs"] = new_end
        if numeric(row.get("originalHideAtMs")) and int(row["originalHideAtMs"]) == row["originalEndMs"]:
            event["hideAtMs"] = new_end
        event["rhythm"]["latestGroundedBeatMs"] = latest
        event["rhythm"]["finalHoldMs"] = max(0, new_end - latest)
        event["rhythm"]["endExtendedMs"] = new_end - row["originalEndMs"]

    clamp_new_transition_overlaps(rows)

    for row in rows:
        event = row["event"]
        new_end = int(event["endMs"])
        if int(event["startMs"]) != row["originalStartMs"] or new_end != row["originalEndMs"]:
            changes.append(
                {
                    "eventId": row["id"],
                    "collection": row["collection"],
                    "startMs": [row["originalStartMs"], int(event["startMs"])],
                    "endMs": [row["originalEndMs"], new_end],
                    "entryLeadMs": event["rhythm"]["entryLeadMs"],
                    "staggerDelayMs": event["rhythm"]["staggerDelayMs"],
                    "transitionClampMs": event["rhythm"].get("transitionClampMs", 0),
                    "finalHoldMs": event["rhythm"]["finalHoldMs"],
                }
            )

    plan["rhythmCompilation"] = {
        "version": 1,
        "mode": "deterministic-spoken-beat-light",
        "fps": fps,
        "entryLeadMs": entry_lead_ms,
        "staggerMs": stagger_ms,
        "simultaneousWindowMs": simultaneous_window_ms,
        "minimumFinalHoldMs": minimum_final_hold_ms,
        "modelCalls": 0,
        "renderPasses": 0,
        "h3Retimed": False,
        "layerPriorityAssigned": False,
    }
    report = {
        "status": "pass",
        "eventCount": len(rows),
        "changedEventCount": len(changes),
        "changes": changes,
        "policy": plan["rhythmCompilation"],
    }
    return plan, report


def default_output(path: Path) -> Path:
    return path.with_name(f"{path.stem}.rhythm{path.suffix}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Compile lightweight spoken-beat rhythm into a foreground plan")
    parser.add_argument("plan", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--fps", type=float, default=30.0)
    parser.add_argument("--entry-lead-ms", type=int, default=140)
    parser.add_argument("--stagger-ms", type=int, default=80)
    parser.add_argument("--simultaneous-window-ms", type=int, default=60)
    parser.add_argument("--minimum-final-hold-ms", type=int, default=900)
    parser.add_argument("--check", action="store_true", help="Compile and report without writing the output plan")
    args = parser.parse_args()

    source = json.loads(args.plan.read_text(encoding="utf-8-sig"))
    compiled, report = compile_plan(
        source,
        fps=args.fps,
        entry_lead_ms=args.entry_lead_ms,
        stagger_ms=args.stagger_ms,
        simultaneous_window_ms=args.simultaneous_window_ms,
        minimum_final_hold_ms=args.minimum_final_hold_ms,
    )
    output = args.output or default_output(args.plan)
    report["input"] = str(args.plan.resolve())
    report["output"] = None if args.check else str(output.resolve())

    if not args.check:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(compiled, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
