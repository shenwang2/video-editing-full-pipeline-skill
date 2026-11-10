#!/usr/bin/env python3
"""Audit a foreground plan without mutating it.

Layout and variety findings are advisory. Invalid timestamps and malformed data are
structural errors. Use --strict to make warnings fail CI after a project has adopted
the full visual/spatial contract.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any
from classic_component_payloads import validate_component_payload


VISUAL_TOKEN = re.compile(
    r"[\u3400-\u9fff\uf900-\ufaff]|[A-Za-z][A-Za-z0-9]*(?:[-_.][A-Za-z0-9]+)*|\d+(?:\.\d+)?%?|[^\s]",
    re.UNICODE,
)
SENTENCE_PUNCTUATION = re.compile(r"[，,。！？!?；;：:]")


def visual_unit_count(value: str) -> int:
    """Count CJK glyphs individually and one contiguous Latin/number term as one unit."""
    return len(VISUAL_TOKEN.findall(value.strip()))


def values_at_path(value: Any, dotted_path: str) -> list[str]:
    parts = dotted_path.split(".") if dotted_path else []

    def walk(current: Any, remaining: list[str]) -> list[str]:
        if not remaining:
            return [current] if isinstance(current, str) and current.strip() else []
        head, *tail = remaining
        if head == "*":
            if not isinstance(current, list):
                return []
            return [item for child in current for item in walk(child, tail)]
        if not isinstance(current, dict) or head not in current:
            return []
        return walk(current[head], tail)

    return walk(value, parts)


def side_of(placement: str | None) -> str:
    value = (placement or "").lower()
    if "left" in value:
        return "left"
    if "right" in value:
        return "right"
    if "full" in value:
        return "full"
    if "center" in value or "main" in value:
        return "center"
    if "screen" in value:
        return "fullscreen"
    return "unknown"


def event_rows(plan: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    sources = (
        ("middle", plan.get("middleEvents", [])),
        ("enumeration", plan.get("enumerations", [])),
        ("external", plan.get("externalMaterials", [])),
        ("h3", plan.get("h3Shots", [])),
    )
    for kind, events in sources:
        for index, event in enumerate(events):
            payload = event.get("payload") if isinstance(event.get("payload"), dict) else {}
            copy_payload = dict(event)
            copy_payload.update(payload)
            start = event.get("showAtMs", event.get("startMs"))
            end = event.get("hideAtMs", event.get("endMs"))
            explicit_component = event.get("rendererComponent")
            mode = (
                explicit_component
                or event.get("rendererFallback")
                or event.get("mode")
                or event.get("presentationMode")
                or event.get("templateId")
                or "unknown"
            )
            placement = event.get("placement", "fullscreen" if kind == "h3" else None)
            rows.append(
                {
                    "id": event.get("id", f"{kind}-{index}"),
                    "kind": kind,
                    "startMs": start,
                    "endMs": end,
                    "placement": placement,
                    "side": side_of(placement),
                    "alignmentToken": event.get("alignmentToken"),
                    "visibleEdge": event.get("visibleEdge"),
                    "component": mode,
                    "variant": event.get("variant"),
                    "hasExplicitComponent": bool(explicit_component),
                    "visualFamily": event.get("visualFamily"),
                    "motionGrammar": event.get("motionGrammar"),
                    "placementReason": event.get("placementReason"),
                    "fallbackPlacements": event.get("fallbackPlacements"),
                    "routingDecision": event.get("routingDecision"),
                    "allowConcurrent": bool(event.get("allowConcurrent", False)),
                    "collisionCheckedWith": event.get("collisionCheckedWith") or [],
                    "compositionRole": event.get("compositionRole"),
                    "compositionGroup": event.get("compositionGroup"),
                    "viewingTask": event.get("viewingTask", payload.get("viewingTask")),
                    "presentationScale": event.get("presentationScale", payload.get("presentationScale")),
                    "readabilityReason": event.get("readabilityReason", payload.get("readabilityReason")),
                    "recognitionOnlyReason": event.get(
                        "recognitionOnlyReason", payload.get("recognitionOnlyReason")
                    ),
                    "mediaMode": event.get(
                        "mediaMode",
                        payload.get("mode", event.get("presentationMode", event.get("mode"))),
                    ),
                    "objectPurpose": event.get(
                        "objectPurpose",
                        event.get(
                            "semanticPurpose",
                            payload.get("objectPurpose", payload.get("semanticPurpose", payload.get("purpose"))),
                        ),
                    ),
                    "copyPayload": copy_payload,
                }
            )
    return sorted(rows, key=lambda row: (row["startMs"] if isinstance(row["startMs"], (int, float)) else -1, row["id"]))


def longest_run(rows: list[dict[str, Any]], key: str, allowed: set[str] | None = None) -> dict[str, Any]:
    best_value: str | None = None
    best_ids: list[str] = []
    current_value: str | None = None
    current_ids: list[str] = []
    for row in rows:
        value = str(row.get(key) or "unknown")
        if allowed is not None and value not in allowed:
            current_value = None
            current_ids = []
            continue
        if value == current_value:
            current_ids.append(row["id"])
        else:
            current_value = value
            current_ids = [row["id"]]
        if len(current_ids) > len(best_ids):
            best_value = current_value
            best_ids = list(current_ids)
    return {"value": best_value, "length": len(best_ids), "eventIds": best_ids}


def overlap(a: dict[str, Any], b: dict[str, Any]) -> bool:
    return a["startMs"] < b["endMs"] and b["startMs"] < a["endMs"]


def concurrency_is_verified(a: dict[str, Any], b: dict[str, Any]) -> bool:
    return (
        a.get("allowConcurrent")
        and b.get("allowConcurrent")
        and b["id"] in a.get("collisionCheckedWith", [])
        and a["id"] in b.get("collisionCheckedWith", [])
        and a.get("compositionGroup")
        and a.get("compositionGroup") == b.get("compositionGroup")
    )


def audit(plan: dict[str, Any], registry: dict[str, Any]) -> dict[str, Any]:
    rows = event_rows(plan)
    errors: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []

    for row in rows:
        if not isinstance(row["startMs"], (int, float)) or not isinstance(row["endMs"], (int, float)):
            errors.append({"code": "invalid-timestamp", "eventId": row["id"], "message": "Missing numeric start/end timestamp"})
        elif row["endMs"] <= row["startMs"]:
            errors.append({"code": "reversed-timestamp", "eventId": row["id"], "message": "End timestamp must be after start"})

    visual_analysis = plan.get("visualAnalysis") if isinstance(plan.get("visualAnalysis"), dict) else {}
    alignment_tokens = visual_analysis.get("alignmentTokens") if isinstance(visual_analysis.get("alignmentTokens"), dict) else {}
    required_tokens = {"sectionTitleLeft", "sectionTitleRight", "centerAxis"}
    missing_tokens = sorted(required_tokens - set(alignment_tokens))
    if missing_tokens:
        errors.append(
            {
                "code": "missing-master-alignment-grid",
                "message": "visualAnalysis.alignmentTokens must preserve the Section-title master grid",
                "missingTokens": missing_tokens,
            }
        )

    expected_alignment = {
        "left": ("sectionTitleLeft", "left"),
        "right": ("sectionTitleRight", "right"),
        "center": ("centerAxis", "center"),
    }
    for row in (item for item in rows if item["kind"] != "h3"):
        expected = expected_alignment.get(row["side"])
        if expected is None:
            continue
        expected_token, expected_edge = expected
        if row.get("alignmentToken") != expected_token or row.get("visibleEdge") != expected_edge:
            errors.append(
                {
                    "code": "invalid-visible-edge-alignment",
                    "eventId": row["id"],
                    "message": "Foreground event must align its actual visible surface to the Section-title master grid",
                    "placement": row["placement"],
                    "expectedAlignmentToken": expected_token,
                    "expectedVisibleEdge": expected_edge,
                    "actualAlignmentToken": row.get("alignmentToken"),
                    "actualVisibleEdge": row.get("visibleEdge"),
                }
            )

    valid_viewing_tasks = {"recognize", "read", "follow", "verify"}
    valid_presentation_scales = {"local", "large", "detailTakeover"}
    for row in (item for item in rows if item["kind"] == "external"):
        missing = [
            field
            for field in ("viewingTask", "presentationScale", "readabilityReason")
            if not row.get(field)
        ]
        if missing:
            errors.append(
                {
                    "code": "missing-external-readability-contract",
                    "eventId": row["id"],
                    "message": "External material must declare viewingTask, presentationScale, and readabilityReason",
                    "missingFields": missing,
                }
            )
            continue
        if row["viewingTask"] not in valid_viewing_tasks:
            errors.append(
                {
                    "code": "invalid-external-viewing-task",
                    "eventId": row["id"],
                    "message": f"viewingTask must be one of {sorted(valid_viewing_tasks)}",
                }
            )
        if row["presentationScale"] not in valid_presentation_scales:
            errors.append(
                {
                    "code": "invalid-external-presentation-scale",
                    "eventId": row["id"],
                    "message": f"presentationScale must be one of {sorted(valid_presentation_scales)}",
                }
            )
            continue

        if row["viewingTask"] in {"read", "follow", "verify"} and row["presentationScale"] == "local":
            errors.append(
                {
                    "code": "external-material-too-small-for-task",
                    "eventId": row["id"],
                    "message": "Material that viewers must read, follow, or verify may not use a local thumbnail",
                }
            )
        is_recorded_demo = (
            row["component"] == "MediaFrame"
            and (row.get("variant") == "recordedDemo" or row.get("mediaMode") == "recordedDemo")
        )

        if row["viewingTask"] == "follow" and not is_recorded_demo:
            errors.append(
                {
                    "code": "follow-task-without-recorded-demo",
                    "eventId": row["id"],
                    "message": "A follow task must route to MediaFrame/recordedDemo; recognition-only clips route to show",
                }
            )
        if row["viewingTask"] == "follow" and row["presentationScale"] != "detailTakeover":
            errors.append(
                {
                    "code": "follow-along-demo-not-fullscreen",
                    "eventId": row["id"],
                    "message": "Follow-along operation demonstrations must use detailTakeover",
                }
            )
        if row["presentationScale"] == "detailTakeover" and not is_recorded_demo:
            errors.append(
                {
                    "code": "invalid-detail-takeover-owner",
                    "eventId": row["id"],
                    "message": "Only MediaFrame/recordedDemo may use real-object detailTakeover; screenshots, webpages, documents, evidence, code, stills, and ordinary B-roll stay local/large",
                }
            )

        if is_recorded_demo and row["presentationScale"] != "detailTakeover":
            errors.append(
                {
                    "code": "recorded-demo-not-fullscreen",
                    "eventId": row["id"],
                    "message": "Recorded product/process operation demonstrations must use full-screen detailTakeover",
                }
            )

    non_h3 = [row for row in rows if row["kind"] != "h3"]
    side_counts = Counter(row["side"] for row in non_h3)
    role_side_counts = {
        kind: dict(Counter(row["side"] for row in non_h3 if row["kind"] == kind))
        for kind in ("middle", "enumeration", "external")
    }
    lateral_total = side_counts["left"] + side_counts["right"]
    side_shares = {
        side: (side_counts[side] / lateral_total if lateral_total else 0.0)
        for side in ("left", "right")
    }
    middle_lateral = role_side_counts["middle"].get("left", 0) + role_side_counts["middle"].get("right", 0)
    middle_side_shares = {
        side: (role_side_counts["middle"].get(side, 0) / middle_lateral if middle_lateral else 0.0)
        for side in ("left", "right")
    }
    if middle_lateral >= 6 and max(middle_side_shares.values()) >= 0.85:
        dominant = max(middle_side_shares, key=middle_side_shares.get)
        warnings.append(
            {
                "code": "middle-lane-concentration",
                "severity": "advisory",
                "message": f"{dominant} contains {middle_side_shares[dominant]:.1%} of lateral middle events; review whether role-aware counter-lane composition would improve the frame",
            }
        )

    side_run = longest_run(non_h3, "side", {"left", "right"})
    if side_run["length"] >= 4:
        warnings.append(
            {
                "code": "same-side-streak",
                "severity": "advisory",
                "message": f"{side_run['length']} consecutive events use {side_run['value']}",
                "eventIds": side_run["eventIds"],
            }
        )

    component_run = longest_run(non_h3, "component")
    if component_run["length"] >= 3:
        warnings.append(
            {
                "code": "same-component-streak",
                "severity": "advisory",
                "message": f"{component_run['length']} consecutive events use {component_run['value']}",
                "eventIds": component_run["eventIds"],
            }
        )

    missing_contract = [
        row["id"]
        for row in non_h3
        if not row["hasExplicitComponent"]
        or not row["visualFamily"]
        or not row["motionGrammar"]
        or not row["placementReason"]
        or not row["fallbackPlacements"]
    ]
    if missing_contract:
        warnings.append(
            {
                "code": "missing-visual-spatial-contract",
                "severity": "repair",
                "message": "Events are missing rendererComponent, visualFamily, motionGrammar, placementReason, or fallbackPlacements",
                "eventIds": missing_contract,
            }
        )

    components = registry.get("components", {})
    core_components = set(registry.get("coreComponents", []))
    extension_packs = registry.get("extensionPacks", {})
    extension_components = {
        component
        for pack in extension_packs.values()
        for component in pack.get("components", [])
    }
    max_candidates = int(registry.get("routingPolicy", {}).get("maxCandidateComponents", 3))
    signatures = [item.get("visualSignature") for item in components.values()]
    duplicate_signatures = sorted(signature for signature, count in Counter(signatures).items() if signature and count > 1)
    if duplicate_signatures:
        errors.append(
            {
                "code": "duplicate-registry-signature",
                "message": "Renderer registry contains duplicate visual signatures",
                "visualSignatures": duplicate_signatures,
            }
        )

    for row in non_h3:
        if not row["hasExplicitComponent"]:
            continue
        contract = components.get(row["component"])
        if not contract:
            warnings.append(
                {
                    "code": "unregistered-renderer-component",
                    "severity": "repair",
                    "message": f"{row['component']} is not registered",
                    "eventIds": [row["id"]],
                }
            )
            continue
        rendering_contract = contract.get("renderingContract", {})
        if registry.get('library', {}).get('sourceOwnership', {}).get('authoritativeSkill') == 'remotion-foreground-builder-auto-reference-first':
            payload_errors = validate_component_payload(
                {'componentId': row['component'], 'variantId': row['variant'], 'payload': row.get('copyPayload', {})},
                row['id'], registry)
            for message in payload_errors:
                errors.append({'code': 'invalid-component-payload', 'message': message, 'eventIds': [row['id']]})
        primary_paths = rendering_contract.get("primaryTextPaths") or []
        max_primary_units = int(registry.get("routingPolicy", {}).get("cardPrimaryMaxVisualUnits", 5))
        for primary_path in primary_paths:
            for primary_text in values_at_path(row.get("copyPayload", {}), primary_path):
                units = visual_unit_count(primary_text)
                if units > max_primary_units or SENTENCE_PUNCTUATION.search(primary_text):
                    errors.append(
                        {
                            "code": "card-primary-copy-not-compressed",
                            "eventId": row["id"],
                            "component": row["component"],
                            "field": primary_path,
                            "text": primary_text,
                            "visualUnits": units,
                            "maxVisualUnits": max_primary_units,
                            "message": "Card primary copy must be a 2-5-unit semantic phrase; move sentence-level explanation to the exterior auxiliary field or reroute the content",
                        }
                    )
        decision = row.get("routingDecision") or {}
        candidates = decision.get("candidateComponents") or []
        extension_candidates = [component for component in candidates if component in extension_components]
        if len(candidates) > max_candidates:
            errors.append(
                {
                    "code": "too-many-renderer-candidates",
                    "message": f"One semantic unit may expose at most {max_candidates} component candidates",
                    "eventIds": [row["id"]],
                    "candidateComponents": candidates,
                }
            )
        if len(extension_candidates) > 1:
            errors.append(
                {
                    "code": "competing-extension-components",
                    "message": "One semantic unit may not compare several extension components",
                    "eventIds": [row["id"]],
                    "extensionCandidates": extension_candidates,
                }
            )
        if row["component"] in extension_components:
            expected_pack = contract.get("extensionPack")
            evidence = set(decision.get("activationEvidence") or [])
            required_evidence = set(contract.get("activation", {}).get("requires") or [])
            fallback = decision.get("fallbackComponent")
            if decision.get("tier") != "extension" or decision.get("extensionPack") != expected_pack:
                warnings.append(
                    {
                        "code": "missing-extension-routing-contract",
                        "severity": "repair",
                        "message": f"{row['component']} requires an explicit extension routingDecision for {expected_pack}",
                        "eventIds": [row["id"]],
                    }
                )
            if not required_evidence.issubset(evidence):
                warnings.append(
                    {
                        "code": "incomplete-extension-evidence",
                        "severity": "repair",
                        "message": f"{row['component']} is missing required activation evidence",
                        "eventIds": [row["id"]],
                        "missingEvidence": sorted(required_evidence - evidence),
                    }
                )
            if row["component"] not in candidates or fallback not in core_components:
                warnings.append(
                    {
                        "code": "invalid-extension-fallback",
                        "severity": "repair",
                        "message": "Extension routing must retain the selected extension and one valid core fallback",
                        "eventIds": [row["id"]],
                    }
                )
        elif decision.get("tier") == "extension":
            warnings.append(
                {
                    "code": "core-extension-tier-mismatch",
                    "severity": "repair",
                    "message": f"Core component {row['component']} cannot be marked as an active extension",
                    "eventIds": [row["id"]],
                }
            )
        if row["visualFamily"] != contract.get("visualFamily"):
            warnings.append(
                {
                    "code": "renderer-family-mismatch",
                    "severity": "repair",
                    "message": f"{row['component']} requires visualFamily={contract.get('visualFamily')}",
                    "eventIds": [row["id"]],
                }
            )
        if row["motionGrammar"] not in contract.get("motionGrammars", []):
            warnings.append(
                {
                    "code": "renderer-motion-mismatch",
                    "severity": "repair",
                    "message": f"{row['motionGrammar']} is not allowed for {row['component']}",
                    "eventIds": [row["id"]],
                }
            )
        variants = contract.get("variants", {})
        if row["variant"] and row["variant"] not in variants:
            warnings.append(
                {
                    "code": "renderer-variant-mismatch",
                    "severity": "repair",
                    "message": f"{row['variant']} is not a registered visual variant for {row['component']}",
                    "eventIds": [row["id"]],
                }
            )
        if not row["variant"] and variants:
            warnings.append(
                {
                    "code": "implicit-renderer-variant",
                    "severity": "advisory",
                    "message": f"{row['component']} will use defaultVariant={contract.get('defaultVariant')}; new plans should choose a named variant explicitly",
                    "eventIds": [row["id"]],
                }
            )
        if row["variant"] in variants:
            variant_motion = variants[row["variant"]].get("motionGrammar")
            if variant_motion and row["motionGrammar"] != variant_motion:
                warnings.append(
                    {
                        "code": "variant-motion-mismatch",
                        "severity": "repair",
                        "message": f"{row['component']}.{row['variant']} requires motionGrammar={variant_motion}",
                        "eventIds": [row["id"]],
                    }
                )

    if not plan.get("visualAnalysis"):
        warnings.append(
            {
                "code": "missing-frame-occupancy-analysis",
                "severity": "repair",
                "message": "Plan has no visualAnalysis with representative frames and protected/whitespace zones",
            }
        )

    valid_non_h3 = [
        row
        for row in non_h3
        if isinstance(row["startMs"], (int, float)) and isinstance(row["endMs"], (int, float))
    ]
    has_rolling_middle = any(
        first["kind"] == "middle"
        and second["kind"] == "middle"
        and first["placement"] == second["placement"]
        and overlap(first, second)
        for index, first in enumerate(valid_non_h3)
        for second in valid_non_h3[index + 1 :]
    )
    has_verified_composition = any(
        concurrency_is_verified(first, second)
        for index, first in enumerate(valid_non_h3)
        for second in valid_non_h3[index + 1 :]
        if overlap(first, second)
    )
    middle_count = sum(1 for row in valid_non_h3 if row["kind"] == "middle")
    if middle_count >= 6 and not has_rolling_middle and not has_verified_composition:
        warnings.append(
            {
                "code": "serialized-middle-pattern",
                "severity": "advisory",
                "message": "Every middle event appears isolated; review whether related rows should accumulate or a primary-plus-support composition would better preserve context",
            }
        )

    for index, first in enumerate(valid_non_h3):
        for second in valid_non_h3[index + 1 :]:
            if not overlap(first, second):
                continue
            # Related middle rows in one measured queue are the only implicit
            # concurrency. Every cross-placement or cross-layer pair must be
            # explicitly and reciprocally verified in the plan.
            same_middle_queue = (
                first["kind"] == "middle"
                and second["kind"] == "middle"
                and first["placement"] == second["placement"]
            )
            if same_middle_queue or concurrency_is_verified(first, second):
                continue
            overlap_start = max(first["startMs"], second["startMs"])
            overlap_end = min(first["endMs"], second["endMs"])
            errors.append(
                {
                    "code": "unapproved-global-foreground-overlap",
                    "message": "Foreground events overlap across placements or layers without reciprocal collision verification",
                    "eventIds": [first["id"], second["id"]],
                    "overlapStartMs": overlap_start,
                    "overlapEndMs": overlap_end,
                }
            )

    composition_groups: dict[str, list[dict[str, Any]]] = {}
    for row in valid_non_h3:
        group = row.get("compositionGroup")
        if group:
            composition_groups.setdefault(str(group), []).append(row)
    primary = [row for row in non_h3 if row["kind"] in {"enumeration", "external"}]
    for index, first in enumerate(primary):
        if not isinstance(first["startMs"], (int, float)) or not isinstance(first["endMs"], (int, float)):
            continue
        for second in primary[index + 1 :]:
            if not isinstance(second["startMs"], (int, float)) or not isinstance(second["endMs"], (int, float)):
                continue
            if (
                first["side"] == second["side"]
                and first["side"] in {"left", "right", "center"}
                and overlap(first, second)
                and not concurrency_is_verified(first, second)
            ):
                warnings.append(
                    {
                        "code": "primary-layer-overlap",
                        "severity": "repair",
                        "message": f"Primary layers overlap in {first['side']}",
                        "eventIds": [first["id"], second["id"]],
                    }
                )

    component_counts = Counter(row["component"] for row in non_h3)
    family_counts = Counter(row["visualFamily"] or "missing" for row in non_h3)
    return {
        "schemaVersion": 3,
        "summary": {
            "eventCount": len(rows),
            "nonH3EventCount": len(non_h3),
            "placementCounts": dict(side_counts),
            "rolePlacementCounts": role_side_counts,
            "lateralPlacementShares": side_shares,
            "middleLateralPlacementShares": middle_side_shares,
            "componentCounts": dict(component_counts),
            "visualFamilyCounts": dict(family_counts),
            "longestSameSideRun": side_run,
            "longestSameComponentRun": component_run,
            "registeredComponentCount": len(components),
            "registeredCoreComponentCount": len(core_components),
            "registeredExtensionComponentCount": len(extension_components),
            "registeredVariantCount": sum(len(item.get("variants", {})) for item in components.values()),
            "hasRollingMiddleAccumulation": has_rolling_middle,
            "hasVerifiedComposition": has_verified_composition,
            "verifiedCompositionGroupCount": len(composition_groups),
        },
        "errors": errors,
        "warnings": warnings,
        "status": "error" if errors else ("review" if warnings else "pass"),
        "note": "Balance, density, and repetition warnings are advisory; they never force quotas, primary/supporting ranks, or plan mutation. Verified compositions preserve concurrent layers when their measured visible rectangles remain readable.",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit visual variety, placement balance, and plan contracts")
    parser.add_argument("plan", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--strict", action="store_true", help="Return non-zero when warnings exist")
    parser.add_argument("--registry", type=Path, help="Override the bundled renderer contract registry")
    args = parser.parse_args()

    plan = json.loads(args.plan.read_text(encoding="utf-8-sig"))
    registry_path = args.registry or (Path(__file__).resolve().parent.parent / "assets" / "semantic-component-contract.json")
    registry = json.loads(registry_path.read_text(encoding="utf-8-sig"))
    report = audit(plan, registry)
    payload = json.dumps(report, ensure_ascii=False, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload + "\n", encoding="utf-8")
    print(payload)
    if report["errors"]:
        return 2
    if args.strict and report["warnings"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
