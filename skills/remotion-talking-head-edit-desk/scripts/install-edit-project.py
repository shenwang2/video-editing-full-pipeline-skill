#!/usr/bin/env python3
from __future__ import annotations

import argparse
import copy
import json
import re
import runpy
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CONFIG = SKILL_ROOT / "config" / "edit-desk.local.json"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def safe_id(value: str) -> str:
    cleaned = re.sub(r"[^\w.\-\u4e00-\u9fff]+", "-", value, flags=re.UNICODE).strip("-.")
    return cleaned[:80] or "project"


def ensure_inside(parent: Path, child: Path) -> None:
    try:
        child.resolve().relative_to(parent.resolve())
    except ValueError as exc:
        raise ValueError(f"Asset path escapes project root: {child}") from exc


def resolve_source(asset: dict, manifest_dir: Path) -> Path | None:
    original = asset.get("originalPath")
    if original:
        candidate = Path(original)
        if candidate.exists():
            return candidate
    runtime_path = asset.get("path")
    if runtime_path:
        candidate = manifest_dir.joinpath(*str(runtime_path).replace("\\", "/").split("/"))
        if candidate.exists():
            return candidate
    return None


def probe_video(path: Path) -> dict | None:
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        return None
    command = [
        ffprobe,
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,r_frame_rate",
        "-show_entries", "format=duration",
        "-of", "json",
        str(path),
    ]
    completed = subprocess.run(command, capture_output=True, text=True, encoding="utf-8")
    if completed.returncode != 0:
        raise RuntimeError(f"ffprobe failed for {path}: {completed.stderr.strip()}")
    return json.loads(completed.stdout)


def validate_manifest(path: Path) -> None:
    validator = SKILL_ROOT / "scripts" / "validate-edit-project.py"
    completed = subprocess.run(
        [sys.executable, "-X", "utf8", str(validator), str(path)],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if completed.returncode != 0:
        raise RuntimeError(completed.stdout.strip() or completed.stderr.strip())


def validate_h3_review(manifest_dir: Path, config: dict, scope_scene_ids=None) -> dict:
    director_root = config.get("sharedDirectorRoot")
    if not director_root:
        raise ValueError("sharedDirectorRoot is required for the H3 handoff audit")
    audit_script = Path(director_root) / "scripts" / "audit-h3-opportunities.py"
    if not audit_script.is_file():
        raise FileNotFoundError(f"Authoritative H3 opportunity audit missing: {audit_script}")
    auditor = runpy.run_path(str(audit_script))["audit_directory"]
    report = auditor(manifest_dir / "analysis", scope_scene_ids)
    if not report["valid"]:
        raise ValueError("H3 opportunity review failed before installation:\n" + "\n".join(report["errors"]))
    for warning in report["warnings"]:
        print(f"H3 review warning: {warning}", file=sys.stderr)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Package a validated edit-project.json into the local AI talking-head edit desk.")
    parser.add_argument("manifest", type=Path, help="Draft edit-project.json")
    parser.add_argument("--editor-root", type=Path, help="Edit desk installation root")
    parser.add_argument("--h3-scope-scene", action="append", help="Only for a user-requested subset; default all scenes")
    args = parser.parse_args()

    manifest_path = args.manifest.resolve()
    manifest_dir = manifest_path.parent
    manifest = copy.deepcopy(load_json(manifest_path))
    config = load_json(DEFAULT_CONFIG) if DEFAULT_CONFIG.exists() else {}
    h3_review = validate_h3_review(manifest_dir, config, args.h3_scope_scene)
    configured_root = args.editor_root or config.get("editorRoot")
    if not configured_root:
        raise ValueError("No editor root configured. Set config/edit-desk.local.json or pass --editor-root.")
    editor_root = Path(configured_root).resolve()
    projects_root = editor_root / "projects"
    if not editor_root.exists():
        raise FileNotFoundError(f"Edit desk is not installed: {editor_root}")

    base_id = safe_id(str(manifest.get("project", {}).get("id") or manifest_path.stem))
    project_id = base_id
    project_root = projects_root / project_id
    if project_root.exists():
        project_id = f"{base_id}-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        project_root = projects_root / project_id
    manifest["project"]["id"] = project_id
    project_root.mkdir(parents=True, exist_ok=False)

    for asset in manifest.get("assets", []):
        runtime = str(asset.get("path", "")).replace("\\", "/").lstrip("/")
        if not runtime:
            raise ValueError(f"Asset {asset.get('id')} has no runtime path")
        destination = project_root.joinpath(*runtime.split("/"))
        ensure_inside(project_root, destination)
        if asset.get("status") != "ready":
            continue
        source = resolve_source(asset, manifest_dir)
        if source is None:
            raise FileNotFoundError(f"Ready asset source not found: {asset.get('id')}")
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)

    analysis_source = manifest_dir / "analysis"
    if analysis_source.is_dir():
        shutil.copytree(analysis_source, project_root / "analysis")

    output_manifest = project_root / "edit-project.json"
    output_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    validate_manifest(output_manifest)

    background_id = manifest["composition"]["backgroundAssetId"]
    background = next(asset for asset in manifest["assets"] if asset["id"] == background_id)
    if background.get("status") != "ready" or background.get("type") != "clean-base":
        raise ValueError("Background asset must be a ready clean-base asset")
    clean_path = project_root.joinpath(*str(background["path"]).replace("\\", "/").split("/"))
    probe = probe_video(clean_path)
    if probe and probe.get("streams"):
        stream = probe["streams"][0]
        expected = (int(manifest["composition"]["width"]), int(manifest["composition"]["height"]))
        actual = (int(stream["width"]), int(stream["height"]))
        if actual != expected:
            raise ValueError(f"Clean-base resolution {actual} does not match composition {expected}")

    print(json.dumps({
        "ok": True,
        "projectId": project_id,
        "projectRoot": str(project_root),
        "manifest": str(output_manifest),
        "h3OpportunityAudit": h3_review,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
