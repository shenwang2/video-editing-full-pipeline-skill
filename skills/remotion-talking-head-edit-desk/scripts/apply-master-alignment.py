#!/usr/bin/env python3
"""Compile the shared Section-title alignment grid into plan and desk JSON."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_atomic(path: Path, value: dict[str, Any]) -> None:
    temp = path.with_suffix(path.suffix + ".alignment.tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temp, path)


def side_of(preset: str | None) -> str:
    value = (preset or "").lower()
    if "left" in value:
        return "left"
    if "right" in value:
        return "right"
    if "full" in value:
        return "canvas"
    return "center"


def alignment_for(preset: str | None) -> tuple[str, str]:
    side = side_of(preset)
    if side == "left":
        return "sectionTitleLeft", "left"
    if side == "right":
        return "sectionTitleRight", "right"
    if side == "canvas":
        return "canvas", "center"
    return "centerAxis", "center"


def normalized_grid(width: int, height: int) -> dict[str, float]:
    scale = min(width / 2560, height / 1440)
    left = (108 * scale) / width
    return {
        "sectionTitleLeft": round(left, 8),
        "sectionTitleRight": round(1 - left, 8),
        "centerAxis": 0.5,
    }


def update_plan(path: Path, width: int, height: int) -> int:
    plan = load(path)
    visual = plan.setdefault("visualAnalysis", {})
    visual["alignmentTokens"] = normalized_grid(width, height)
    changed = 0
    for group in ("middleEvents", "enumerations", "externalMaterials"):
        for event in plan.get(group, []):
            token, edge = alignment_for(event.get("placement"))
            if event.get("alignmentToken") != token or event.get("visibleEdge") != edge:
                event["alignmentToken"] = token
                event["visibleEdge"] = edge
                changed += 1
    write_atomic(path, plan)
    return changed


def update_manifest(path: Path) -> tuple[int, int, int]:
    project = load(path)
    composition = project["composition"]
    width = int(composition["width"])
    height = int(composition["height"])
    changed = 0
    for event in project["timeline"]["foregroundEvents"]:
        placement = event["placement"]
        token, edge = alignment_for(placement.get("preset"))
        if event.get("semanticLayer") == "title":
            token, edge = "sectionTitleLeft", "left"
        if placement.get("alignmentToken") != token or placement.get("visibleEdge") != edge:
            placement["alignmentToken"] = token
            placement["visibleEdge"] = edge
            changed += 1
    write_atomic(path, project)
    return width, height, changed


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply the shared Section-title alignment grid")
    parser.add_argument("edit_project", type=Path)
    parser.add_argument("--plan", type=Path)
    args = parser.parse_args()

    manifest = args.edit_project.resolve()
    width, height, manifest_changes = update_manifest(manifest)
    plan_changes = update_plan(args.plan.resolve(), width, height) if args.plan else 0
    print(
        json.dumps(
            {
                "status": "updated",
                "editProject": str(manifest),
                "plan": str(args.plan.resolve()) if args.plan else None,
                "alignmentTokens": normalized_grid(width, height),
                "manifestEventsUpdated": manifest_changes,
                "planEventsUpdated": plan_changes,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
