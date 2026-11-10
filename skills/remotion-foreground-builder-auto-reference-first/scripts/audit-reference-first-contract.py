#!/usr/bin/env python3
"""Audit a schema-v3 reference-first MiniMax H3 contract before generation."""

from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_ROOT = SCRIPT_DIR.parent
INDEX_PATHS = {
    "creator": SKILL_ROOT / "assets" / "creator-reference-library" / "_library" / "reference-index.jsonl",
    "starter": SKILL_ROOT / "assets" / "starter-library" / "_library" / "reference-index.jsonl",
}
REFERENCE_ROLES = {"P", "C", "M"}
LIBRARIES = {"creator", "starter", "personal", "user-supplied"}
USAGES = {"mechanism-metadata", "direct-media"}
MOTION_NEGATION_TERMS = (
    "exact choreography",
    "frame-by-frame choreography",
    "exact motion",
    "exact movement",
    "exact timing",
    "exact camera behavior",
    "exact rhythm",
    "do not copy motion",
    "do not copy the motion",
    "do not copy timing",
    "do not copy the timing",
    "do not copy camera",
    "do not copy the camera",
    "do not copy choreography",
    "do not copy the choreography",
    "do not copy rhythm",
    "do not copy the rhythm",
    "不复制运动",
    "不要复制运动",
    "不复制节奏",
    "不要复制节奏",
    "不复制镜头",
    "不要复制镜头",
    "不复制编排",
    "不要复制编排",
    "准确编排",
    "精确编排",
    "逐帧编排",
    "准确运动",
    "精确运动",
    "准确节奏",
    "精确节奏",
)


def load_compiler():
    path = SCRIPT_DIR / "build-reference-first-h3-prompt.py"
    spec = importlib.util.spec_from_file_location("reference_first_h3_prompt_compiler", path)
    if not spec or not spec.loader:
        raise RuntimeError(f"cannot load prompt compiler: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


PROMPT_COMPILER = load_compiler()


def clean(value: Any) -> str:
    return " ".join(str(value or "").split())


def load_index(path: Path) -> dict[str, dict[str, Any]]:
    records: dict[str, dict[str, Any]] = {}
    if not path.is_file():
        return records
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        record = json.loads(line)
        asset_id = clean(record.get("id"))
        if asset_id:
            records[asset_id] = record
    return records


def resolve_media(contract_path: Path, value: Any) -> Path | None:
    text = clean(value)
    if not text:
        return None
    path = Path(text)
    if not path.is_absolute():
        path = contract_path.parent / path
    return path.resolve()


def probe_dimensions(path: Path) -> tuple[int, int]:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "csv=s=x:p=0",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    width_text, height_text = result.stdout.strip().split("x", maxsplit=1)
    return int(width_text), int(height_text)


def probe_duration(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=nw=1:nk=1",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def audit_png_2k(
    label: str,
    path: Path | None,
    errors: list[str],
    allow_missing_frames: bool,
) -> None:
    if path is None:
        return
    if allow_missing_frames:
        return
    if not path.is_file():
        errors.append(f"{label}.path does not exist: {path}")
        return
    if path.suffix.lower() != ".png":
        errors.append(f"{label}.path must be a PNG: {path}")
        return
    try:
        dimensions = probe_dimensions(path)
    except (FileNotFoundError, subprocess.CalledProcessError, ValueError) as exc:
        errors.append(f"{label}.path cannot be dimension-verified: {path} ({exc})")
        return
    if dimensions != (2048, 1152):
        errors.append(f"{label}.path must be exactly 2048x1152, got {dimensions[0]}x{dimensions[1]}")


def audit_readable_image(
    label: str,
    path: Path | None,
    errors: list[str],
    allow_missing_frames: bool,
) -> None:
    if path is None or allow_missing_frames:
        return
    if not path.is_file():
        errors.append(f"{label}.path does not exist: {path}")
        return
    if path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp", ".gif"}:
        errors.append(f"{label}.path must be PNG, JPG, JPEG, WebP, or GIF: {path}")
        return
    try:
        width, height = probe_dimensions(path)
    except (FileNotFoundError, subprocess.CalledProcessError, ValueError) as exc:
        errors.append(f"{label}.path cannot be dimension-verified: {path} ({exc})")
        return
    if width <= 0 or height <= 0:
        errors.append(f"{label}.path has invalid dimensions: {width}x{height}")


def audit(contract: dict[str, Any], contract_path: Path, allow_missing_frames: bool = False) -> dict[str, Any]:
    errors = list(PROMPT_COMPILER.validate(contract))
    warnings: list[str] = []
    resolved_references: list[dict[str, Any]] = []
    mode = clean(contract.get("generationMode"))

    anchor = contract.get("sourceAnchor")
    anchor_start: float | None = None
    anchor_end: float | None = None
    if not isinstance(anchor, dict):
        errors.append("sourceAnchor must be an object")
    else:
        start, end = anchor.get("startMs"), anchor.get("endMs")
        if not isinstance(start, (int, float)) or isinstance(start, bool):
            errors.append("sourceAnchor.startMs must be numeric")
        else:
            anchor_start = float(start)
        if not isinstance(end, (int, float)) or isinstance(end, bool):
            errors.append("sourceAnchor.endMs must be numeric")
        else:
            anchor_end = float(end)
        if anchor_start is not None and anchor_end is not None and anchor_end <= anchor_start:
            errors.append("sourceAnchor.endMs must be greater than startMs")
        if not clean(anchor.get("text")):
            errors.append("sourceAnchor.text is required")

    last_narration_ms: float | None = None
    for index, phase in enumerate(contract.get("phases") or []):
        if not isinstance(phase, dict):
            continue
        narration_at = phase.get("narrationAtMs")
        if not isinstance(narration_at, (int, float)) or isinstance(narration_at, bool):
            continue
        narration_ms = float(narration_at)
        if anchor_start is not None and narration_ms < anchor_start:
            errors.append(f"phases[{index}].narrationAtMs is before sourceAnchor")
        if anchor_end is not None and narration_ms > anchor_end:
            errors.append(f"phases[{index}].narrationAtMs is after sourceAnchor")
        if last_narration_ms is not None and narration_ms < last_narration_ms:
            errors.append(f"phases[{index}].narrationAtMs must be nondecreasing")
        last_narration_ms = narration_ms

    bundled_indexes = {name: load_index(path) for name, path in INDEX_PATHS.items()}
    role_owners: dict[str, str] = {}
    for index, reference in enumerate(contract.get("referenceContract") or []):
        prefix = f"referenceContract[{index}]"
        if not isinstance(reference, dict):
            continue
        asset_id = clean(reference.get("assetId"))
        library = clean(reference.get("library")).lower()
        usage = clean(reference.get("usage"))
        roles = reference.get("roles") if isinstance(reference.get("roles"), list) else []
        if library not in LIBRARIES:
            errors.append(f"{prefix}.library must be one of {sorted(LIBRARIES)}")
        if usage not in USAGES:
            errors.append(f"{prefix}.usage must be one of {sorted(USAGES)}")
        for role in roles:
            role_text = clean(role).upper()
            if role_text not in REFERENCE_ROLES:
                continue
            if role_text in role_owners:
                errors.append(f"reference role {role_text} is assigned more than once")
            else:
                role_owners[role_text] = asset_id
        record: dict[str, Any] | None = None
        if library in bundled_indexes:
            record = bundled_indexes[library].get(asset_id)
            if record is None:
                errors.append(f"{prefix} does not resolve in bundled {library} index: {asset_id}")
        elif library in {"personal", "user-supplied"} and not clean(reference.get("path")):
            warnings.append(f"{prefix} should record path for an external reference")
        resolved_references.append(
            {
                "assetId": asset_id,
                "library": library,
                "usage": usage,
                "roles": [clean(role).upper() for role in roles],
                "resolved": record is not None or library in {"personal", "user-supplied"},
                "license": (record or {}).get("license") if record else None,
                "summary": (record or {}).get("summary") if record else None,
            }
        )

    first_path = resolve_media(contract_path, (contract.get("firstFrame") or {}).get("path"))
    last_path = resolve_media(contract_path, (contract.get("lastFrame") or {}).get("path"))
    current_path = resolve_media(contract_path, (contract.get("currentShotReference") or {}).get("path"))
    reference_image_path = resolve_media(contract_path, (contract.get("referenceImage") or {}).get("path"))
    reference_image_2_path = resolve_media(contract_path, (contract.get("referenceImage2") or {}).get("path"))
    reference_video_path = resolve_media(contract_path, (contract.get("referenceVideo") or {}).get("path"))

    if mode in {"I2VA", "FL2VA"}:
        audit_png_2k("firstFrame", first_path, errors, allow_missing_frames)
    if mode in {"L2VA", "FL2VA"}:
        audit_png_2k("lastFrame", last_path, errors, allow_missing_frames)
    if mode == "Ref2VA":
        audit_png_2k("referenceImage", reference_image_path, errors, allow_missing_frames)
        audit_readable_image("referenceImage2", reference_image_2_path, errors, allow_missing_frames)
        video = contract.get("referenceVideo") or {}
        do_not_copy = clean(video.get("doNotCopy")).lower()
        if any(term in do_not_copy for term in MOTION_NEGATION_TERMS):
            errors.append(
                "referenceVideo.doNotCopy neutralizes the selected M reference; forbid identity/content copying, "
                "not the chosen motion, camera, timing, choreography, or rhythm"
            )
        if reference_video_path is not None and not allow_missing_frames:
            if not reference_video_path.is_file():
                errors.append(f"referenceVideo.path does not exist: {reference_video_path}")
            else:
                try:
                    duration = probe_duration(reference_video_path)
                    if not 2 <= duration <= 15:
                        errors.append(f"referenceVideo.path must be 2-15 seconds, got {duration:.2f}s")
                    source_to = (contract.get("referenceVideo") or {}).get("sourceTo")
                    if isinstance(source_to, (int, float)) and float(source_to) > duration + 0.06:
                        errors.append(
                            f"referenceVideo.sourceTo exceeds the actual clip duration {duration:.2f}s"
                        )
                except (FileNotFoundError, subprocess.CalledProcessError, ValueError) as exc:
                    errors.append(f"referenceVideo.path cannot be duration-verified: {reference_video_path} ({exc})")
    elif mode == "T2VA":
        if current_path is not None or first_path is not None or last_path is not None:
            warnings.append("T2VA does not send currentShotReference or endpoint frames to the workflow")
    else:
        if reference_image_path is not None or reference_image_2_path is not None or reference_video_path is not None:
            warnings.append(f"{mode} ignores Ref2VA-only media inputs")

    coexistence = contract.get("foregroundCoexistence")
    if not isinstance(coexistence, dict):
        errors.append("foregroundCoexistence must be an object")
    else:
        if coexistence.get("keepTitles") is not True:
            errors.append("foregroundCoexistence.keepTitles must be true")
        if coexistence.get("keepCaptions") is not True:
            errors.append("foregroundCoexistence.keepCaptions must be true")
        if not clean(coexistence.get("readabilityTreatment")):
            errors.append("foregroundCoexistence.readabilityTreatment is required")
        if not clean(coexistence.get("duplicateAvoidance")):
            errors.append("foregroundCoexistence.duplicateAvoidance is required")

    return {
        "schemaVersion": 2,
        "contractSchemaVersion": contract.get("schemaVersion"),
        "contractId": clean(contract.get("id")),
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
        "generationMode": mode,
        "motionPattern": clean(contract.get("motionPattern")),
        "durationSeconds": contract.get("durationSeconds"),
        "durationPlan": contract.get("durationPlan"),
        "resolvedReferences": resolved_references,
        "currentShotReference": str(current_path) if current_path else None,
        "firstFrame": str(first_path) if first_path else None,
        "lastFrame": str(last_path) if last_path else None,
        "referenceImage": str(reference_image_path) if reference_image_path else None,
        "referenceImage2": str(reference_image_2_path) if reference_image_2_path else None,
        "referenceVideo": str(reference_video_path) if reference_video_path else None,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--contract", required=True, type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--allow-missing-frames", action="store_true")
    args = parser.parse_args()
    contract_path = args.contract.resolve()
    try:
        contract = json.loads(contract_path.read_text(encoding="utf-8"))
        report = audit(contract, contract_path, args.allow_missing_frames)
    except (OSError, json.JSONDecodeError, RuntimeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    payload = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        output = args.output.resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(payload, encoding="utf-8")
    print(payload, end="")
    return 0 if report["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
