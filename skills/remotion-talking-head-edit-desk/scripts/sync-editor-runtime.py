#!/usr/bin/env python3
"""Copy the authoritative classic component pack verbatim; add editor adapters only."""
from __future__ import annotations
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CONFIG = SKILL_ROOT / 'config/edit-desk.local.json'
EDITOR_RUNTIME_TRANSFORM_VERSION = 'classic-authoritative-verbatim-v2'
# Control serialization, dispatch, and measured-bounds bridges only.
# No component silhouettes, default animation, or semantic routing here.
EDITOR_ADAPTER_PATHS = frozenset({
    'server.mjs', 'src/api.ts', 'src/App.tsx', 'src/componentCatalog.ts', 'src/editorPlacement.ts', 'src/types.ts',
    'src/remotion/ForegroundEventRenderer.tsx', 'src/remotion/EditComposition.tsx', 'scripts/validate_edit_project.py',
    'src/graphicSceneModel.ts', 'src/remotion/GraphicScene.tsx', 'src/GraphicSceneInspector.tsx',
})

def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding='utf-8-sig'))

def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def validate_editor_boundary() -> None:
    for relative in ('assets/semantic-foreground-pack', 'assets/semantic-component-contract.json',
                     'assets/classic-component-variant-extensions.json'):
        if (SKILL_ROOT / relative).exists():
            raise RuntimeError(f'Editor-owned visual source is forbidden: {relative}; maintain it in sharedDirectorRoot')
    overlay = SKILL_ROOT / 'assets/editor-runtime-overlay'
    actual = {p.relative_to(overlay).as_posix() for p in overlay.rglob('*') if p.is_file()}
    forbidden = actual - EDITOR_ADAPTER_PATHS
    if forbidden:
        raise RuntimeError('Unapproved editor override paths: ' + ', '.join(sorted(forbidden)))
    missing = EDITOR_ADAPTER_PATHS - actual
    if missing:
        raise RuntimeError('Missing editor adapters: ' + ', '.join(sorted(missing)))

def planned_files(director_root: Path, editor_root: Path) -> list[tuple[Path, Path]]:
    validate_editor_boundary()
    pack = director_root / 'assets/semantic-foreground-pack/src'
    if not pack.is_dir():
        raise RuntimeError(f'Authoritative component pack missing: {pack}')
    pairs = [(p, editor_root / 'src/legacy-semantic-foreground-pack' / p.relative_to(pack))
             for p in sorted(pack.rglob('*')) if p.is_file()]
    pairs.append((director_root / 'assets/semantic-component-contract.json', editor_root / 'src/legacy-component-contract.json'))
    pairs.append((director_root / 'scripts/classic_component_payloads.py', editor_root / 'scripts/classic_component_payloads.py'))
    sfx = director_root / 'assets/sfx'
    pairs.extend((p, editor_root / 'public/sfx' / p.relative_to(sfx)) for p in sorted(sfx.rglob('*')) if p.is_file())
    overlay = SKILL_ROOT / 'assets/editor-runtime-overlay'
    pairs.extend((overlay / rel, editor_root / rel) for rel in sorted(EDITOR_ADAPTER_PATHS))
    destinations = [target for _, target in pairs]
    if len(set(destinations)) != len(destinations):
        raise RuntimeError('Duplicate destination would override authoritative source')
    # Refuse unowned user files before writing; never silently delete them.
    installed_pack = editor_root / 'src/legacy-semantic-foreground-pack'
    expected = {p.relative_to(pack).as_posix() for p in pack.rglob('*') if p.is_file()}
    extras = {p.relative_to(installed_pack).as_posix() for p in installed_pack.rglob('*') if p.is_file()} - expected
    if extras:
        raise RuntimeError('Unowned classic runtime files require review before sync: ' + ', '.join(sorted(extras)))
    return pairs

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, default=DEFAULT_CONFIG)
    parser.add_argument('--director-root', type=Path)
    parser.add_argument('--editor-root', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    config = load_json(args.config.resolve())
    director = Path(args.director_root or config['sharedDirectorRoot']).resolve()
    editor = Path(args.editor_root or config['editorRoot']).resolve()
    if not (director / 'SKILL.md').is_file() or not editor.is_dir():
        raise SystemExit('Authoritative director or editor root is missing')
    pairs = planned_files(director, editor)
    validator = director / 'scripts/validate-semantic-component-pack.py'
    result = subprocess.run([sys.executable, '-X', 'utf8', str(validator)], cwd=director,
                            capture_output=True, text=True, encoding='utf-8', errors='replace')
    if result.returncode:
        raise SystemExit('Authoritative component validation failed:\n' + result.stdout + result.stderr)
    missing = [str(p) for p, _ in pairs if not p.is_file()]
    if missing:
        raise SystemExit('Missing authoritative sources: ' + ', '.join(missing))
    changed = []
    fingerprint = hashlib.sha256(EDITOR_RUNTIME_TRANSFORM_VERSION.encode())
    for source, target in pairs:
        content = source.read_bytes()
        fingerprint.update(target.relative_to(editor).as_posix().encode())
        fingerprint.update(hashlib.sha256(content).digest())
        if target.is_file() and target.read_bytes() == content:
            continue
        changed.append(target.relative_to(editor).as_posix())
        if not args.check:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
    print(json.dumps({'status': 'drift' if args.check and changed else 'synced',
                     'authoritativeDirector': str(director), 'editorRoot': str(editor),
                     'directorFingerprint': fingerprint.hexdigest(),
                     'componentPackValidation': 'pass', 'componentCopyMode': 'verbatim',
                     'editorBoundaryValidation': 'pass', 'changedFiles': changed,
                     'changedCount': len(changed), 'unchangedCount': len(pairs)-len(changed),
                     'checkOnly': args.check}, ensure_ascii=False, indent=2))
    return 2 if args.check and changed else 0

if __name__ == '__main__':
    raise SystemExit(main())
