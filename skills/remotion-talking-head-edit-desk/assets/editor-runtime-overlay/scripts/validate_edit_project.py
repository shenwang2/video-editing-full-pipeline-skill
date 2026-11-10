#!/usr/bin/env python3
"""Validate cross-field invariants for an edit-project.json file."""

from __future__ import annotations

import argparse
import json
import re
import runpy
import sys
from pathlib import Path
from typing import Any


WINDOWS_ABSOLUTE = re.compile(r"^[A-Za-z]:[\\/]")


def validate_shared_component_payload(event, label):
    # Installed editor uses generated copies; Skill-side handoff resolves upstream.
    local_module = Path(__file__).with_name('classic_component_payloads.py')
    if local_module.is_file():
        module_path = local_module
        contract_path = Path(__file__).resolve().parent.parent / 'src/legacy-component-contract.json'
    else:
        config_path = Path(__file__).resolve().parent.parent / 'config/edit-desk.local.json'
        config = json.loads(config_path.read_text(encoding='utf-8-sig'))
        director = Path(config['sharedDirectorRoot'])
        module_path = director / 'scripts/classic_component_payloads.py'
        contract_path = director / 'assets/semantic-component-contract.json'
    validator = runpy.run_path(str(module_path))['validate_component_payload']
    contract = json.loads(contract_path.read_text(encoding='utf-8-sig'))
    return validator(event, label, contract)


def add_error(errors: list[str], message: str) -> None:
    errors.append(message)


def validate_range(errors: list[str], label: str, start: Any, end: Any, duration_ms: int) -> None:
    if not isinstance(start, int) or not isinstance(end, int):
        add_error(errors, f"{label}: startMs and endMs must be integers")
        return
    if start < 0 or end <= start or end > duration_ms:
        add_error(errors, f"{label}: invalid range {start}-{end} for duration {duration_ms}")


def validate(path: Path, check_files: bool) -> list[str]:
    errors: list[str] = []
    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError) as exc:
        return [f"Cannot read valid JSON: {exc}"]

    if data.get("schemaVersion") != "1.0.0":
        add_error(errors, "schemaVersion must be 1.0.0")

    composition = data.get("composition")
    if not isinstance(composition, dict):
        return errors + ["composition must be an object"]
    width = composition.get("width")
    height = composition.get("height")
    fps = composition.get("fps")
    duration_ms = composition.get("durationMs")
    if not isinstance(width, int) or width < 2 or not isinstance(height, int) or height < 2:
        add_error(errors, "composition width and height must be positive integers")
    if not isinstance(fps, (int, float)) or fps <= 0:
        add_error(errors, "composition fps must be positive")
    if not isinstance(duration_ms, int) or duration_ms <= 0:
        add_error(errors, "composition durationMs must be a positive integer")
        duration_ms = 1

    assets = data.get("assets")
    if not isinstance(assets, list):
        return errors + ["assets must be an array"]
    asset_by_id: dict[str, dict[str, Any]] = {}
    for index, asset in enumerate(assets):
        if not isinstance(asset, dict):
            add_error(errors, f"assets[{index}] must be an object")
            continue
        asset_id = asset.get("id")
        if not isinstance(asset_id, str) or not asset_id:
            add_error(errors, f"assets[{index}].id must be a non-empty string")
            continue
        if asset_id in asset_by_id:
            add_error(errors, f"duplicate asset id: {asset_id}")
        asset_by_id[asset_id] = asset
        asset_path = asset.get("path")
        if not isinstance(asset_path, str) or not asset_path:
            add_error(errors, f"asset {asset_id}: path must be non-empty")
        elif WINDOWS_ABSOLUTE.match(asset_path) or asset_path.startswith(("/", "\\")):
            add_error(errors, f"asset {asset_id}: path must be project-relative, got {asset_path}")
        elif "\\" in asset_path:
            add_error(errors, f"asset {asset_id}: use forward slashes in path")
        elif check_files and asset.get("status") == "ready" and not (path.parent / asset_path).is_file():
            add_error(errors, f"asset {asset_id}: ready file does not exist: {asset_path}")

    background_id = composition.get("backgroundAssetId")
    background = asset_by_id.get(background_id)
    if background is None:
        add_error(errors, f"backgroundAssetId does not resolve: {background_id}")
    elif background.get("type") != "clean-base":
        add_error(errors, "backgroundAssetId must point to a clean-base asset")
    elif background.get("width") not in (None, width) or background.get("height") not in (None, height):
        add_error(errors, "clean-base dimensions must equal composition dimensions")

    timeline = data.get("timeline")
    if not isinstance(timeline, dict):
        return errors + ["timeline must be an object"]
    seen_event_ids: set[str] = set()

    def claim_id(label: str, item: dict[str, Any]) -> None:
        event_id = item.get("id")
        if not isinstance(event_id, str) or not event_id:
            add_error(errors, f"{label}: id must be a non-empty string")
        elif event_id in seen_event_ids:
            add_error(errors, f"duplicate timeline id: {event_id}")
        else:
            seen_event_ids.add(event_id)

    for index, event in enumerate(timeline.get("foregroundEvents", [])):
        label = f"foregroundEvents[{index}]"
        if not isinstance(event, dict):
            add_error(errors, f"{label} must be an object")
            continue
        claim_id(label, event)
        validate_range(errors, label, event.get("startMs"), event.get("endMs"), duration_ms)
        if not event.get("componentId") or not event.get("variantId"):
            add_error(errors, f"{label}: componentId and variantId are required")
        errors.extend(validate_shared_component_payload(event, label))
        for asset_id in event.get("assetIds", []):
            if asset_id not in asset_by_id:
                add_error(errors, f"{label}: unresolved assetId {asset_id}")
        placement = event.get("placement", {})
        if placement.get("mode") == "normalized":
            values = [placement.get(key) for key in ("x", "y", "width", "height")]
            if not all(isinstance(value, (int, float)) for value in values):
                add_error(errors, f"{label}: normalized placement needs x, y, width and height")
            else:
                x, y, placed_width, placed_height = values
                if x < 0 or y < 0 or placed_width <= 0 or placed_height <= 0 or x + placed_width > 1 or y + placed_height > 1:
                    add_error(errors, f"{label}: normalized placement exceeds the composition")
        element_overrides = event.get("elementOverrides", {})
        if not isinstance(element_overrides, dict):
            add_error(errors, f"{label}: elementOverrides must be an object")
        else:
            for element_id, override in element_overrides.items():
                if not isinstance(element_id, str) or not element_id:
                    add_error(errors, f"{label}: elementOverrides keys must be non-empty strings")
                    continue
                if not isinstance(override, dict):
                    add_error(errors, f"{label}.elementOverrides[{element_id}]: must be an object")
                    continue
                for axis in ("x", "y"):
                    value = override.get(axis)
                    if value is not None and (not isinstance(value, (int, float)) or value < -1 or value > 1):
                        add_error(errors, f"{label}.elementOverrides[{element_id}].{axis}: must be between -1 and 1")
                scale = override.get("scale")
                if scale is not None and (not isinstance(scale, (int, float)) or scale < 0.35 or scale > 2.8):
                    add_error(errors, f"{label}.elementOverrides[{element_id}].scale: must be between 0.35 and 2.8")
                color = override.get("color")
                if color is not None and (not isinstance(color, str) or not re.fullmatch(r"#[0-9A-Fa-f]{6}", color)):
                    add_error(errors, f"{label}.elementOverrides[{element_id}].color: must be #RRGGBB")

    for index, event in enumerate(timeline.get("h3Events", [])):
        label = f"h3Events[{index}]"
        if not isinstance(event, dict):
            add_error(errors, f"{label} must be an object")
            continue
        claim_id(label, event)
        validate_range(errors, label, event.get("startMs"), event.get("endMs"), duration_ms)
        asset = asset_by_id.get(event.get("assetId"))
        if asset is None:
            add_error(errors, f"{label}: unresolved assetId {event.get('assetId')}")
        elif asset.get("type") != "h3-video":
            add_error(errors, f"{label}: asset must have type h3-video")
        if event.get("fit") != "cover":
            add_error(errors, f"{label}: H3 fit must be cover")
        previous_end = event.get("startMs", 0)
        for segment_index, segment in enumerate(event.get("retime", [])):
            segment_label = f"{label}.retime[{segment_index}]"
            segment_start = segment.get("timelineStartMs")
            segment_end = segment.get("timelineEndMs")
            validate_range(errors, segment_label, segment_start, segment_end, duration_ms)
            if isinstance(segment_start, int) and segment_start < previous_end:
                add_error(errors, f"{segment_label}: retime segments must be monotonic and non-overlapping")
            if isinstance(segment_end, int):
                previous_end = segment_end

    for index, cue in enumerate(timeline.get("captionCues", [])):
        label = f"captionCues[{index}]"
        if not isinstance(cue, dict):
            add_error(errors, f"{label} must be an object")
            continue
        claim_id(label, cue)
        validate_range(errors, label, cue.get("startMs"), cue.get("endMs"), duration_ms)
        if not isinstance(cue.get("text"), str) or not cue.get("text").strip():
            add_error(errors, f"{label}: text must be non-empty")

    for index, cue in enumerate(timeline.get("sfxCues", [])):
        label = f"sfxCues[{index}]"
        if not isinstance(cue, dict):
            add_error(errors, f"{label} must be an object")
            continue
        claim_id(label, cue)
        at_ms = cue.get("atMs")
        if not isinstance(at_ms, int) or at_ms < 0 or at_ms > duration_ms:
            add_error(errors, f"{label}: atMs is outside the composition")
        asset = asset_by_id.get(cue.get("assetId"))
        if asset is None:
            add_error(errors, f"{label}: unresolved assetId {cue.get('assetId')}")
        elif asset.get("type") not in {"sfx", "audio"}:
            add_error(errors, f"{label}: asset must have type sfx or audio")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=Path)
    parser.add_argument("--check-files", action="store_true")
    args = parser.parse_args()
    errors = validate(args.project, args.check_files)
    if errors:
        print(json.dumps({"valid": False, "errors": errors}, ensure_ascii=False, indent=2))
        return 1
    print(json.dumps({"valid": True, "project": str(args.project.resolve())}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
