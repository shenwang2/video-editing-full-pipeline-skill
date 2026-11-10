#!/usr/bin/env python3
"""Choose a content-driven MiniMax H3 generation duration before prompt compilation."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Any


CLASS_RANGES: dict[str, tuple[int, int]] = {
    "single-impact": (3, 5),
    "short-sequence": (6, 9),
    "continuous-process": (10, 15),
}

PATTERN_RANGES: dict[str, tuple[float, float]] = {
    "M01": (6.0, 10.0),
    "M02": (4.0, 5.0),
    "M03": (7.0, 9.0),
    "M04": (3.0, 5.0),
    "M05": (3.0, 4.0),
    "M06": (7.0, 9.0),
    "M07": (4.0, 6.0),
    "M08": (3.0, 4.0),
    "M09": (5.0, 7.0),
    "M10": (3.0, 5.0),
}


class DurationPlanError(ValueError):
    pass


def clean(value: Any) -> str:
    return " ".join(str(value or "").split())


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def find_candidate(payload: Any, shot_id: str) -> dict[str, Any]:
    if isinstance(payload, dict) and isinstance(payload.get("selected"), list):
        candidates = payload["selected"]
    elif isinstance(payload, list):
        candidates = payload
    elif isinstance(payload, dict):
        candidates = [payload]
    else:
        raise DurationPlanError("candidate JSON must be an object, an array, or contain selected[]")
    for candidate in candidates:
        if isinstance(candidate, dict) and clean(candidate.get("id")) == shot_id:
            return candidate
    raise DurationPlanError(f"shot id not found: {shot_id}")


def source_bounds(candidate: dict[str, Any]) -> tuple[int, int]:
    anchor = candidate.get("sourceAnchor") if isinstance(candidate.get("sourceAnchor"), dict) else candidate
    start = anchor.get("startMs")
    end = anchor.get("endMs")
    if not isinstance(start, (int, float)) or isinstance(start, bool):
        raise DurationPlanError("candidate startMs/sourceAnchor.startMs must be numeric")
    if not isinstance(end, (int, float)) or isinstance(end, bool) or float(end) <= float(start):
        raise DurationPlanError("candidate endMs/sourceAnchor.endMs must be greater than startMs")
    return int(round(float(start))), int(round(float(end)))


def infer_duration_class(candidate: dict[str, Any], strong_event_count: int) -> str:
    requested = clean(candidate.get("durationClass"))
    if requested and requested != "auto":
        if requested not in CLASS_RANGES:
            raise DurationPlanError(f"unsupported durationClass: {requested}")
        return requested
    if candidate.get("continuousProcess") is True or strong_event_count >= 5:
        return "continuous-process"
    if strong_event_count >= 2:
        return "short-sequence"
    return "single-impact"


def event_target(duration_class: str, count: int) -> float:
    if duration_class == "single-impact":
        return clamp(3.0 + 0.75 * count, 3.0, 5.0)
    if duration_class == "short-sequence":
        return clamp(5.0 + 0.85 * count, 6.0, 9.0)
    return clamp(8.5 + 0.9 * count, 10.0, 15.0)


def plan_duration(candidate: dict[str, Any]) -> dict[str, Any]:
    shot_id = clean(candidate.get("id"))
    if not shot_id:
        raise DurationPlanError("candidate id is required")
    start_ms, end_ms = source_bounds(candidate)
    span = round((end_ms - start_ms) / 1000.0, 3)
    strong_events = candidate.get("strongEvents")
    if not isinstance(strong_events, list) or not strong_events:
        raise DurationPlanError("candidate strongEvents must contain the meaningful visible changes")
    normalized_events: list[dict[str, Any]] = []
    for index, event in enumerate(strong_events):
        if not isinstance(event, dict) or not clean(event.get("label")):
            raise DurationPlanError(f"strongEvents[{index}].label is required")
        at_ms = event.get("narrationAtMs")
        if not isinstance(at_ms, (int, float)) or isinstance(at_ms, bool):
            raise DurationPlanError(f"strongEvents[{index}].narrationAtMs must be numeric")
        at_ms = int(round(float(at_ms)))
        if not start_ms <= at_ms <= end_ms:
            raise DurationPlanError(f"strongEvents[{index}].narrationAtMs must fall inside the source anchor")
        normalized_events.append({"label": clean(event["label"]), "narrationAtMs": at_ms})

    count = len(normalized_events)
    duration_class = infer_duration_class(candidate, count)
    class_low, class_high = CLASS_RANGES[duration_class]
    pattern = clean(candidate.get("motionPattern")) or "NEW"
    pattern_range = PATTERN_RANGES.get(pattern)
    pattern_target = (
        clamp(sum(pattern_range) / 2.0, class_low, class_high)
        if pattern_range
        else event_target(duration_class, count)
    )
    narration_target = clamp(span, class_low, class_high)
    content_target = event_target(duration_class, count)
    raw_target = 0.60 * narration_target + 0.25 * pattern_target + 0.15 * content_target
    selected = int(clamp(round(raw_target), class_low, class_high))
    if class_low <= span <= class_high:
        nearest_to_narration = int(clamp(round(span), class_low, class_high))
        fit_limit = max(1.0, span * 0.15)
        if abs(selected - span) > fit_limit:
            selected = nearest_to_narration

    split_required = span > 15.0 or count > 6
    fit_delta = round(abs(selected - span), 3)
    fit_limit = round(max(1.0, span * 0.15), 3)
    refine_anchor = not split_required and fit_delta > fit_limit
    status = "split-shot" if split_required else "refine-anchor" if refine_anchor else "ready"
    selected_value: int | None = None if split_required else selected
    ratio = round(selected / span, 4) if span > 0 and not split_required else None
    rationale = (
        f"{count} strong visible event(s) select {duration_class}; narration spans {span:g}s; "
        f"{pattern} contributes a {pattern_range[0]:g}-{pattern_range[1]:g}s tendency; "
        f"the nearest content-and-timeline fit is {selected}s."
        if pattern_range
        else
        f"{count} strong visible event(s) select {duration_class}; narration spans {span:g}s; "
        f"the NEW motion mechanism uses the class range; the nearest content-and-timeline fit is {selected}s."
    )
    if split_required:
        rationale += " Split at a semantic completion boundary before generation."
    elif refine_anchor:
        rationale += " Tighten the source anchor to the clause supporting the action, interaction, or reveal before generation."

    return {
        "schemaVersion": 1,
        "shotId": shot_id,
        "decisionStatus": status,
        "durationClass": duration_class,
        "strongEventCount": count,
        "strongEvents": normalized_events,
        "narrationSpanSeconds": span,
        "motionPattern": pattern,
        "motionPatternRangeSeconds": list(pattern_range) if pattern_range else [class_low, class_high],
        "selectedDurationSeconds": selected_value,
        "directFitDeltaSeconds": fit_delta if not split_required else None,
        "directFitRatio": ratio,
        "selectionRationale": rationale,
        "retimePolicy": {
            "role": "fine-adjustment-only",
            "maxPlaybackRateDelta": 0.10,
            "maxHoldSeconds": 0.8,
            "regenerateBeyondBudget": True,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidate", required=True, type=Path)
    parser.add_argument("--shot-id", required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        payload = json.loads(args.candidate.read_text(encoding="utf-8-sig"))
        result = plan_duration(find_candidate(payload, args.shot_id))
    except (OSError, json.JSONDecodeError, DurationPlanError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    rendered = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        output = args.output.resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(rendered, encoding="utf-8")
    print(rendered, end="")
    return 0 if result["decisionStatus"] == "ready" else 1


if __name__ == "__main__":
    raise SystemExit(main())
