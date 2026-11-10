# 安装这套口播编辑台

当用户要求安装时，先完整阅读 README.md，再按下面执行。

1. 检查本机 Python 3.10+、Node.js 20+（带 npm）、FFmpeg/ffprobe 是否都在 PATH；缺少时告诉用户 README“第一步”里的安装命令，不要擅自安装系统软件。检查当前 Python 能否导入 `faster_whisper`，缺少时提示用户安装。
2. 按你自己是哪个智能体选择 Skill 目录：
   - Codex：`python install.py`（默认 `$CODEX_HOME/skills`，通常是 `~/.codex/skills`）；
   - Claude Code：`python install.py --skills-dir "$HOME/.claude/skills"`；
   - 其他智能体：用 `--skills-dir` 传入它实际读取 Skill 的目录。
3. 保留现有同名安装。脚本报目录冲突时向用户说明实际路径，并用显式的新目录（`--skills-dir`、`--editor-dir`）安装，不要删除或覆盖已有内容。
4. 依赖安装失败时报告错误，不要重新运行安装脚本；按脚本提示在已复制的编辑台目录重试 `npm ci`，网络不通时可建议用户换用 `https://registry.npmmirror.com` 镜像。
5. 用安装脚本输出的编辑台路径运行 `npm run dev`，通过 <http://127.0.0.1:4312> 和 `/api/projects` 确认可用，再运行安装后的 `remotion-talking-head-edit-desk/scripts/check-installation.py`。
6. 告诉用户：重启智能体会话后，说“用口播剪辑编辑台处理这条视频：<路径>”使用编辑台版，说“用前景导演自动剪辑这条口播视频”使用全自动版。

RunningHub 是可选项，五种模式的工作流 ID 已预置，用户只需填写自己的 `apiKey`。只告诉用户安装后的 `remotion-foreground-builder-auto-reference-first/config/runninghub.local.json` 的完整路径以及申请地址 <https://www.runninghub.cn?inviteCode=3c88fac6>，让用户自己在本机编辑。不要在聊天、命令行参数或工程文件中索取、回显或记录密钥，也不要改动 `workflowId`。用 `check-installation.py` 检查，不提交收费任务。缺少 RunningHub 配置时继续本地编辑流程。
