# 视频剪辑全链路skill

把中文口播录制剪成带前景讲解、H3 生成画面的成片：AI 口播编辑台 + 前景导演 Skill。

> **仅限个人非商业使用。** 任何商业用途（包括修改、二次开发后商用）都需事先取得作者书面授权，详见 [LICENSE](LICENSE)。

这是两套配合使用的 Skill：`remotion-talking-head-edit-desk` 生成可编辑工程，`remotion-foreground-builder-auto-reference-first` 提供导演规则和组件；`editor/` 是本地编辑台。安装脚本创建独立副本，不会覆盖已有 Skill 或编辑台。

## 给智能体的安装任务

把仓库克隆到用户电脑后，让智能体阅读本 README，检查 Python 3.10+、Node.js 20+（带 npm）、FFmpeg/ffprobe 已在 PATH，再执行 `python install.py`。脚本通过 `npm ci` 从包仓库安装依赖，创建本地路径配置并同步共享组件；已有同名目标会停止，使用 `--skills-dir`、`--editor-dir` 指定新位置。安装结束后重启智能体会话以发现 Skill。Windows 为本次验证平台，其他系统尚未做完整验证。

可直接发给智能体：「按这个仓库 README 安装两个 Skill 和编辑台，验证本地启动；RunningHub 密钥先留空，告诉我在本机哪里填。」安装位置由脚本输出。`--skip-npm` 仅用于已有依赖的离线检查；普通安装不加这个参数。

首次启动：在安装后的编辑台目录运行 `npm run dev`，在浏览器打开终端显示的本地地址。Windows 也可双击 `启动AI口播编辑台.vbs`。项目目录初始为空，导入 JSON 或让 Skill 安装新工程。

## RunningHub 凭据

默认安装不包含任何 API Key。只做本地剪辑或编辑时可跳过。还没有 RunningHub 账号或 API Key 的，在这里注册申请：<https://www.runninghub.cn?inviteCode=3c88fac6>。五种生成模式（T2VA、I2VA、FL2VA、L2VA、Ref2VA）的工作流 ID 已预置在配置里，用户不需要自己搭建或填写工作流。要用 RunningHub 生成 H3，只需：

1. 在 [RunningHub](https://www.runninghub.cn?inviteCode=3c88fac6) 注册并获取自己的 API Key，然后打开安装位置 `remotion-foreground-builder-auto-reference-first/config/runninghub.local.json`，在本机填写自己 RunningHub 账号的 `apiKey`。其他四种模式通过 `credentialConfig` 共用这一个密钥，无需填五遍。
2. 运行安装后的编辑台 Skill 下的 `python scripts/check-installation.py`。它检查本地路径、密钥是否已填写和五种工作流的节点映射，不联网、不提交任务，也不打印密钥。

生成任务会以用户自己的密钥提交，消耗的是用户自己账号的额度。仓库的 `config/*-workflow-api.json` 是与预置工作流对应的节点结构，提交时会一并发送；不要改动这些文件或 `runninghub*.local.json` 里的 `workflowId`。

`*.local.json` 不提交仓库。智能体应引导用户在本机编辑，不读取、复制、回显或要求在聊天中粘贴密钥。

账户权限、可用模型及配额需在 RunningHub 确认；首次生成前先运行本地 dry-run。不具备条件时仍可交付本地编辑工程，外部素材可以留作待替换占位。使用原视频转写或预剪时，还需要在运行 Skill 的 Python 环境安装 `faster-whisper`（`python -m pip install faster-whisper`），首次加载模型可能下载权重；只做编辑或用已有可用字幕可先跳过。

## 素材与许可

仓库保留随包的 4 个 starter 示例；上游 `creator-reference-library` 在所附第三方声明中限制再分发，因此此候选包未收录，参考检索可使用 starter 和用户有权使用的素材。请保留各目录的第三方许可及署名，第三方组件和素材仍按各自许可使用。

本项目自身代码、Skill 和文档采用[个人非商业使用许可](LICENSE)：个人可以免费下载、安装、学习，并为自己使用而修改；不允许任何形式的商用，包括修改或二次开发后用于商业目的，也不允许再分发或转售。商业使用需事先取得作者书面授权，可在本仓库提交 Issue 联系作者。

## 验证情况

本包已在 Windows 隔离目录验证两个 Skill 安装、组件同步、编辑台构建与启动，以及样例素材导入、保存、MP4 导出；五种 RunningHub 模式的预置工作流 ID 与本地节点映射测试通过。测试没有联网提交 H3。全新 `npm ci` 下载受测试环境的网络连接限制，运行验证使用了同版本的本机依赖。

不要把自己的 `.local.json`、工程、原片、账号数据或安装日志提交到仓库。
