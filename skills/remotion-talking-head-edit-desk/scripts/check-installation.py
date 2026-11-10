#!/usr/bin/env python3
"""Check local paths and RunningHub setup without sending requests or printing credentials."""
from pathlib import Path
import importlib.util
import json
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]

def main() -> int:
    config = ROOT / "config/edit-desk.local.json"
    if not config.is_file():
        print("未找到安装配置。请从仓库根目录运行 install.py。")
        return 1
    settings = json.loads(config.read_text(encoding="utf-8-sig"))
    editor = Path(settings["editorRoot"])
    director = Path(settings["sharedDirectorRoot"])
    runninghub = Path(settings["sharedRunningHubConfigRoot"])
    missing = [name for name in ("node", "npm", "ffmpeg", "ffprobe") if not shutil.which(name)]
    for file in (editor / "server.mjs", editor / "node_modules/vite/package.json", director / "SKILL.md"):
        if not file.is_file():
            missing.append(str(file))
    print("编辑台：" + ("缺少 " + ", ".join(missing) if missing else "本地依赖齐全"))
    asr = any(importlib.util.find_spec(x) for x in ("faster_whisper", "funasr"))
    print("转写：" + ("已找到后端" if asr else "当前 Python 未安装 ASR；可先用已有字幕，或安装 faster-whisper。"))
    credential = runninghub / "runninghub.local.json"
    try:
        key_config = json.loads(credential.read_text(encoding="utf-8-sig"))
        has_key = bool(str(key_config.get("apiKey") or "").strip())
    except (OSError, ValueError, AttributeError):
        has_key = False
    if not has_key:
        print(f"RunningHub（可选）：工作流已预置，只需在本机填写 {credential} 的 apiKey；本地编辑不受影响。")
        print("还没有 API Key 可在此注册申请：https://www.runninghub.cn?inviteCode=3c88fac6")
        return 1 if missing else 0
    runner_path = director / "scripts/runninghub-i2v.py"
    spec = importlib.util.spec_from_file_location("runninghub_checker", runner_path)
    if not spec or not spec.loader:
        print("RunningHub：找不到工作流验证脚本。")
        return 1
    runner = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(runner)
    for template in sorted((runninghub / "templates").glob("*.local.json.example")):
        path = runninghub / template.name.removesuffix(".example")
        try:
            cfg = runner.load_config(path)
            runner.require_api_key(cfg)
        except (OSError, ValueError, runner.RunningHubError):
            print(f"{path.name}：配置缺失或映射无效。工作流 ID 已预置，请勿修改；可从安装包重新复制对应模板。")
        else:
            print(f"{path.name}：本地配置与节点映射通过；账户权限需在实际使用时确认。")
    return 1 if missing else 0

if __name__ == "__main__":
    sys.exit(main())
