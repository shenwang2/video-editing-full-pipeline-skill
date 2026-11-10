#!/usr/bin/env python3
"""Install the editor and its paired skills; never overwrite existing installations."""
from pathlib import Path
import argparse,json,os,shutil,subprocess,sys

REPO=Path(__file__).resolve().parent
NAMES=('remotion-talking-head-edit-desk','remotion-foreground-builder-auto-reference-first')
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--skills-dir',type=Path,default=Path(os.environ.get('CODEX_HOME',str(Path.home()/'.codex')))/'skills')
    parser.add_argument('--editor-dir',type=Path,default=Path.home()/'AI-talking-head-edit-desk')
    parser.add_argument('--skip-npm',action='store_true',help='For offline inspection only; editor requires npm ci before use.')
    args=parser.parse_args(); skills=args.skills_dir.expanduser().resolve(); editor=args.editor_dir.expanduser().resolve()
    targets=[skills/name for name in NAMES]+[editor]
    existing=[p for p in targets if p.exists()]
    if existing: raise SystemExit('Refusing to overwrite existing paths: '+', '.join(map(str,existing)))
    if sys.version_info < (3, 10):
        raise SystemExit('Python 3.10 or newer is required.')
    missing=[name for name in ('node','npm','ffmpeg','ffprobe') if not shutil.which(name)]
    if missing and not args.skip_npm: raise SystemExit('Install prerequisites first: '+', '.join(missing))
    for name in NAMES: shutil.copytree(REPO/'skills'/name,skills/name)
    shutil.copytree(REPO/'editor',editor)
    (editor/'projects').mkdir(exist_ok=True)
    director=skills/NAMES[1];desk=skills/NAMES[0]
    config={'editorRoot':str(editor),'sharedDirectorRoot':str(director),'sharedRunningHubConfigRoot':str(director/'config')}
    (desk/'config').mkdir(exist_ok=True)
    (desk/'config/edit-desk.local.json').write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for f in (director/'config/templates').glob('*.local.json.example'):
        shutil.copyfile(f,director/'config'/f.name.removesuffix('.example'))
    subprocess.run([sys.executable,'-X','utf8',str(desk/'scripts/sync-editor-runtime.py')],check=True)
    if not args.skip_npm:
        npm=shutil.which('npm.cmd') or shutil.which('npm')
        try:
            subprocess.run([npm,'ci','--no-audit','--no-fund'],cwd=editor,check=True)
        except subprocess.CalledProcessError:
            raise SystemExit(f'Dependencies were not installed. Retry npm ci in {editor}; do not rerun the installer over the copied files.')
    print('Installed editor:',editor)
    print('Skills:',skills)
    print('Workflow IDs are preset. To use RunningHub, only fill your own apiKey locally in:',director/'config/runninghub.local.json')
    print('Get a RunningHub API key: https://www.runninghub.cn?inviteCode=3c88fac6')
    print('RunningHub is optional. See README for local setup and checks. Restart the agent to discover the installed Skills.')
if __name__=='__main__':main()
