# 安装这套口播编辑台

当用户要求安装时，先阅读 README.md，检查本机 Python、Node/npm、FFmpeg/ffprobe，再从仓库根目录执行 `python install.py`。保留现有同名安装；发生目录冲突时说明实际路径，并为并行安装使用显式新目录。依赖安装失败时报告错误，按脚本提示在已复制的编辑台目录重试 `npm ci`。

使用安装脚本输出的路径启动编辑台，并通过本地页面和 `/api/projects` 确认可用。告诉用户重启智能体会话后可以调用 `remotion-talking-head-edit-desk`。若当前智能体使用不同的 Skill 目录，安装时传入 `--skills-dir`。

RunningHub 是可选项。引导用户自行在本机填写凭据；不要在聊天、命令行参数或工程文件中索取、回显或记录密钥。用安装后的 `scripts/check-installation.py` 检查，不提交收费任务。缺少 RunningHub 配置时继续本地编辑流程。
