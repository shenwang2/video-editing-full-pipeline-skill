#!/usr/bin/env python3
"""Audit H3 review coverage and shortlist consistency, not creative merit."""
from __future__ import annotations

import argparse
from collections import Counter
import json
import math
from pathlib import Path


def nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def bounds(value):
    if not isinstance(value, dict):
        return None
    start, end = value.get("startMs"), value.get("endMs")
    if not all(isinstance(n, (int, float)) and not isinstance(n, bool)
               and math.isfinite(n) for n in (start, end)):
        return None
    return (start, end) if 0 <= start < end else None


def audit(timeline, review, candidates, scope_scene_ids=None):
    errors, warnings = [], []

    def records(payload, key, label):
        value = payload.get(key) if isinstance(payload, dict) else None
        if not isinstance(value, list):
            errors.append(f"{label}.{key} must be an array")
            return []
        return value

    def index(rows, key, label):
        result = {}
        for row in rows:
            if not isinstance(row, dict) or not nonempty(row.get(key)):
                errors.append(f"{label} entry needs a non-empty {key}")
                continue
            identity = row[key]
            if identity in result:
                errors.append(f"duplicate {label} ID: {identity}")
            result[identity] = row
        return result

    scenes = index(records(timeline, "scenes", "timeline"), "id", "scene")
    if not scenes:
        errors.append("semantic timeline needs scenes before H3 review")
    scope = set(scenes) if scope_scene_ids is None else set(scope_scene_ids)
    if not scope:
        errors.append("requested scope must not be empty")
    for sid in sorted(scope - scenes.keys()):
        errors.append(f"requested scene does not exist: {sid}")
    reviews = index(records(review, "opportunities", "review"), "sceneId", "review")
    selected = index(records(candidates, "selected", "candidates"), "id", "candidate")
    for sid in sorted(scope - reviews.keys()):
        errors.append(f"missing scene review: {sid}")
    for sid in sorted(reviews.keys() - scope):
        errors.append(f"scene review outside requested scope: {sid}")

    referenced = Counter()
    reason_counts = Counter()
    blocked = []
    for sid, entry in reviews.items():
        prefix = f"review {sid}"
        scene = scenes.get(sid)
        if scene is None:
            errors.append(f"{prefix}: unknown semantic scene")
        if bounds(entry) is None or (scene is not None and bounds(entry) != bounds(scene)):
            errors.append(f"{prefix}: bounds must equal the semantic scene")
        for field in ("anchorText", "reason"):
            if not nonempty(entry.get(field)):
                errors.append(f"{prefix}: {field} must be non-empty")
        if nonempty(entry.get("reason")):
            reason_counts[" ".join(entry["reason"].split())] += 1
        for field in ("visualOpportunity", "benefit"):
            if field not in entry or (entry[field] is not None and not nonempty(entry[field])):
                errors.append(f"{prefix}: {field} must be a non-empty string or explicit null")
        opportunity = nonempty(entry.get("visualOpportunity"))
        if opportunity != nonempty(entry.get("benefit")):
            errors.append(f"{prefix}: opportunity and benefit must both be present or both null")
        if opportunity and not nonempty(entry.get("foregroundCoexistence")):
            errors.append(f"{prefix}: plausible opportunity needs foregroundCoexistence")
        decision = entry.get("decision")
        if decision not in ("selected", "not-selected", "blocked"):
            errors.append(f"{prefix}: invalid decision")
        if decision in ("selected", "blocked") and not opportunity:
            errors.append(f"{prefix}: {decision} requires a concrete opportunity")
        if decision == "blocked":
            blocked.append(sid)
            if not nonempty(entry.get("blocker")):
                errors.append(f"{prefix}: blocked requires blocker")
        elif entry.get("blocker") is not None:
            errors.append(f"{prefix}: production blocker must use decision blocked")
        ids = entry.get("candidateIds")
        if not isinstance(ids, list) or not all(nonempty(i) for i in ids):
            errors.append(f"{prefix}: candidateIds must be an array of non-empty strings")
            ids = []
        if len(ids) != len(set(ids)):
            errors.append(f"{prefix}: duplicate candidateIds")
        if (decision == "selected") != bool(ids):
            errors.append(f"{prefix}: only selected decisions must have candidateIds")
        for identity in ids:
            referenced[identity] += 1
            if identity not in selected:
                errors.append(f"{prefix}: unresolved candidate {identity}")
            elif selected[identity].get("sceneId") != sid:
                errors.append(f"{prefix}: candidate {identity} belongs to another scene")

    for identity, candidate in selected.items():
        prefix = f"candidate {identity}"
        if referenced[identity] != 1:
            errors.append(f"{prefix}: must be referenced exactly once by a selected review")
        sid = candidate.get("sceneId")
        scene = scenes.get(sid) if isinstance(sid, str) else None
        anchor = candidate.get("sourceAnchor")
        span = bounds(anchor)
        scene_span = bounds(scene)
        if span is None or scene_span is None or not (scene_span[0] <= span[0] < span[1] <= scene_span[1]):
            errors.append(f"{prefix}: sourceAnchor must fit its semantic scene")
        if not isinstance(anchor, dict) or not nonempty(anchor.get("anchorText")):
            errors.append(f"{prefix}: sourceAnchor.anchorText must be non-empty")
    if isinstance(review, dict) and "selectedCount" in review and review["selectedCount"] != len(selected):
        errors.append("review.selectedCount disagrees with candidates.selected")
    if any(count > 1 for count in reason_counts.values()):
        warnings.append("Repeated reasons: reread those scenes for specific visual comparisons; do not merely reword them.")
    if blocked:
        warnings.append("Unresolved production blockers: " + ", ".join(sorted(blocked)))
    return {"valid": not errors, "validationScope": "structure-not-creative-merit",
            "reviewedSceneCount": len(reviews), "expectedSceneCount": len(scope),
            "selectedCount": len(selected), "blockedSceneIds": sorted(blocked),
            "errors": errors, "warnings": warnings}


def audit_directory(analysis_dir, scope_scene_ids=None):
    analysis_dir = Path(analysis_dir)
    try:
        def read(name):
            return json.loads((analysis_dir / name).read_text(encoding="utf-8-sig"))
        timeline = read("semantic-timeline.json")
        foreground = read("foreground-plan.json")
        if not isinstance(foreground, dict) or not foreground:
            raise ValueError("foreground-plan.json must contain the completed plan")
        return audit(timeline, read("h3-opportunity-review.json"), read("h3-candidates.json"), scope_scene_ids)
    except (OSError, ValueError) as exc:
        return {"valid": False, "validationScope": "structure-not-creative-merit",
                "errors": [str(exc)], "warnings": []}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("analysis_dir", type=Path)
    parser.add_argument("--scope-scene", action="append", help="Only an explicitly requested subset; default all scenes")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = audit_directory(args.analysis_dir, args.scope_scene)
    rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    print(rendered, end="")
    return 0 if report["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
