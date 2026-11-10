#!/usr/bin/env python3
"""Install the curated semantic foreground components into a Remotion project."""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path


def sync_package(package_path: Path) -> list[str]:
    if not package_path.exists():
        return ["No package.json found; install @remotion/media manually."]

    data = json.loads(package_path.read_text(encoding="utf-8-sig"))
    dependencies = data.setdefault("dependencies", {})
    remotion_version = dependencies.get("remotion") or data.get("devDependencies", {}).get("remotion") or "4.0.505"
    changed: list[str] = []
    for name in ("@remotion/media",):
        if dependencies.get(name) != remotion_version:
            dependencies[name] = remotion_version
            changed.append(f"{name}@{remotion_version}")

    if changed:
        package_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return changed


def copy_tree(source: Path, destination: Path, force: bool) -> list[Path]:
    if destination.exists() and not force:
        raise SystemExit(f"Destination already exists: {destination}. Re-run with --force to replace it.")
    if destination.exists():
        shutil.rmtree(destination)
    shutil.copytree(source, destination)
    return [path for path in destination.rglob("*") if path.is_file()]


def copy_sfx(source: Path, destination: Path) -> list[Path]:
    if not source.exists():
        raise SystemExit(f"Bundled SFX library is missing: {source}")
    destination.mkdir(parents=True, exist_ok=True)
    copied: list[Path] = []
    for path in source.iterdir():
        if path.is_file():
            target = destination / path.name
            shutil.copy2(path, target)
            copied.append(target)
    return copied


def main() -> int:
    parser = argparse.ArgumentParser(description="Install the curated semantic foreground component pack")
    parser.add_argument("project", type=Path, help="Remotion project root")
    parser.add_argument("--destination", default="src/semantic-foreground-pack", help="Path inside the project")
    parser.add_argument("--sync-package", action="store_true", help="Add required Remotion dependencies")
    parser.add_argument("--force", action="store_true", help="Replace an existing semantic component pack")
    args = parser.parse_args()

    skill_root = Path(__file__).resolve().parent.parent
    source = skill_root / "assets" / "semantic-foreground-pack" / "src"
    sfx_source = skill_root / "assets" / "sfx"
    project = args.project.resolve()
    destination = (project / args.destination).resolve()
    sfx_destination = (project / "public" / "sfx").resolve()

    if not source.exists():
        raise SystemExit(f"Bundled semantic component source is missing: {source}")
    if project not in destination.parents:
        raise SystemExit("Destination must remain inside the selected project")
    if project not in sfx_destination.parents:
        raise SystemExit("SFX destination must remain inside the selected project")

    copied = copy_tree(source, destination, args.force)
    sfx_copied = copy_sfx(sfx_source, sfx_destination)
    dependency_changes = sync_package(project / "package.json") if args.sync_package else []
    print(json.dumps({
        "status": "installed",
        "source": str(source),
        "destination": str(destination),
        "filesCopied": len(copied),
        "sfxDestination": str(sfx_destination),
        "sfxAssetsCopied": [path.name for path in sfx_copied],
        "packageDependenciesAdded": dependency_changes,
        "import": "semantic-foreground-pack",
        "next": "Run npm install and npm run typecheck, then import from src/semantic-foreground-pack.",
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
