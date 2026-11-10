# 视频剪辑全链路skill

把一条中文口播录制剪成带前景讲解动画、关键词卡片、字幕、音效和 AI 生成讲解画面（H3）的成片。仓库里有两个配合使用的智能体 Skill，加一个本地网页编辑台。

> **仅限个人非商业使用。** 任何商业用途（包括修改、二次开发后商用）都需事先取得作者书面授权，详见 [LICENSE](LICENSE)。

- [两个 Skill 有什么区别](#两个-skill-有什么区别)
- [第一步：准备软件](#第一步准备软件)
- [第二步：下载本仓库](#第二步下载本仓库)
- [第三步：安装](#第三步安装)
- [第四步：配置 RunningHub（可选）](#第四步配置-runninghub可选)
- [第五步：剪第一条视频](#第五步剪第一条视频)
- [常见问题](#常见问题)

## 两个 Skill 有什么区别

| | 前景导演（全自动） | 口播编辑台（人机协作） |
|---|---|---|
| Skill 名 | `remotion-foreground-builder-auto-reference-first` | `remotion-talking-head-edit-desk` |
| 适合 | 想一句话交给智能体，直接拿成片 | 想自己看一遍、改一改再出片 |
| 做什么 | 预处理原片（可选）→ 转写对齐 → 逐句判断哪里需要前景讲解 → 选组件和位置 → 生成 H3 → 配字幕和音效 → **直接渲染成片** | 调用前景导演完成同样的分析和生成，但**在渲染前停下**，把结果打包成可编辑工程装进编辑台 |
| 产出 | 合成好的 MP4（也可导出透明前景层） | `edit-project.json` 工程和全部素材，在编辑台里调整后导出原分辨率 MP4 |
| 能否单独使用 | 能 | 不能，依赖前景导演 |

**两者如何搭配：**

- **前景导演负责“怎么剪”，也是组件库。** 所有导演规则都只在这个 Skill 里维护：什么时候上卡片、上什么组件、放在哪里、节奏多快、什么时候用 H3。全部前景组件的代码、样式和动画也在这里。
- **编辑台 Skill 只改“怎么交付”。** 它没有自己的规则，而是调用前景导演完成全部分析和生成，只把最后一步从“自动渲染”换成“交给你在编辑台里改”。所以两个版本剪出来的风格完全一致。
- **编辑台网页（`editor/`）** 显示整条时间线。你可以在里面换组件、换变体、改文字、调时间和位置、替换素材，然后在本机按原分辨率导出。
- **常见用法：** 简单视频直接用全自动版出片；重要的视频用编辑台版，自己把关后再导出。全自动出片后不满意，也可以对同一条视频再走一遍编辑台版。只要原片和设置没变，已经做过的转写、H3 等结果都会复用，不会重复花钱。
- **改进组件时：** 你让智能体改了前景导演里的组件或规则后，编辑台在下次打开工程前会自动同步，两边始终一致。

## 第一步：准备软件

需要以下软件。目前只在 Windows 上完整验证过，macOS 和 Linux 还没有。

| 软件 | 版本 | 用途 |
|---|---|---|
| 智能体：[Codex](https://openai.com/codex/) 或 [Claude Code](https://claude.com/claude-code) | 最新版 | 运行 Skill |
| [Python](https://www.python.org/downloads/) | 3.10 或更新 | 运行 Skill 脚本 |
| [Node.js](https://nodejs.org/) | 20 或更新（自带 npm） | 运行编辑台和 Remotion 渲染 |
| [FFmpeg](https://ffmpeg.org/download.html) | 任意近期版本（需包含 ffprobe） | 读取、剪切、合成视频 |
| [Git](https://git-scm.com/downloads) | 任意 | 下载仓库（不装也可以，见第二步） |

Windows 可以在 PowerShell 里逐行运行下面的命令来安装：

```powershell
winget install -e --id Python.Python.3.12
winget install -e --id OpenJS.NodeJS.LTS
winget install -e --id Gyan.FFmpeg
winget install -e --id Git.Git
```

装完后**关掉并重新打开** PowerShell，确认每个都能找到：

```powershell
python --version; node --version; npm --version; ffmpeg -version; ffprobe -version
```

另外还要装语音转写库 `faster-whisper`。处理新录的视频时要靠它把语音转成带时间的文字，基本属于必装：

```powershell
python -m pip install faster-whisper
```

第一次转写时会自动下载语音模型，需要联网，稍等即可。

## 第二步：下载本仓库

用 Git：

```powershell
git clone https://github.com/shenwang2/video-editing-full-pipeline-skill.git
cd video-editing-full-pipeline-skill
```

不用 Git：在仓库页面点绿色的 **Code** → **Download ZIP**，解压后在解压出的文件夹里打开 PowerShell。

## 第三步：安装

### 方式一：让智能体装（推荐）

在本仓库文件夹里打开你的智能体，发一句：

> 按这个仓库的 README 和 AGENTS.md 安装两个 Skill 和编辑台，验证编辑台能启动；RunningHub 密钥先留空，告诉我在本机哪里填。

智能体会检查软件、选对 Skill 目录、执行安装，再启动编辑台验证。

### 方式二：自己装

在仓库文件夹里运行对应的命令。

**用 Codex：**

```powershell
python install.py
```

**用 Claude Code：**

```powershell
python install.py --skills-dir "$HOME\.claude\skills"
```

安装脚本会做这些事：

- 把两个 Skill 复制到 Skill 目录（Codex 默认是 `~/.codex/skills`，Claude Code 是 `~/.claude/skills`）；
- 把编辑台复制到 `~/AI-talking-head-edit-desk`，并用 `npm ci` 安装依赖；
- 写好两个 Skill 和编辑台之间的路径配置，并生成 RunningHub 的空白配置。

想换编辑台位置，可以加参数 `--editor-dir "D:\AI口播编辑台"`。脚本**不会覆盖**已有的同名目录，遇到时会停下并告诉你是哪个路径。

**装完后一定要重启智能体（新开一个会话）**，它才能发现新装的 Skill。

### 验证安装

**打开编辑台：** 进入编辑台目录（默认是 `~/AI-talking-head-edit-desk`），双击 `启动AI口播编辑台.vbs`。它会在后台启动，并自动在浏览器打开 <http://127.0.0.1:4312>。也可以在该目录运行 `npm run dev`。项目列表一开始是空的，这是正常的。

**运行检查脚本**（Claude Code 用户把 `.codex` 换成 `.claude`）：

```powershell
python "$HOME\.codex\skills\remotion-talking-head-edit-desk\scripts\check-installation.py"
```

它会报告编辑台依赖、转写库和 RunningHub 配置的状态。这个脚本不联网、不提交任务，也不会打印密钥。

## 第四步：配置 RunningHub（可选）

H3 讲解画面是在 [RunningHub](https://www.runninghub.cn?inviteCode=3c88fac6) 上用 AI 生成的。不配置也能用：前景动画、字幕、音效和编辑台都照常工作，只是不生成 H3。

五种生成模式的**工作流已经预置好**，你只需要填自己的 API Key。五种模式是：文生视频 T2VA、首帧生视频 I2VA、首尾帧生视频 FL2VA、尾帧生视频 L2VA、参考生视频 Ref2VA。

1. 在 RunningHub 注册账号并获取 API Key：<https://www.runninghub.cn?inviteCode=3c88fac6>
2. 用记事本打开这个文件（Claude Code 用户把 `.codex` 换成 `.claude`）：

   ```text
   C:\Users\你的用户名\.codex\skills\remotion-foreground-builder-auto-reference-first\config\runninghub.local.json
   ```

3. 找到 `"apiKey": ""`，把 Key 粘贴到两个引号中间，然后保存：

   ```json
   "apiKey": "这里粘贴你的Key",
   ```

   只填这一个文件就行，另外四种模式会自动共用它。**不要改**文件里的 `workflowId` 和其他内容。

4. 再运行一次第三步的 `check-installation.py`。五种模式都显示“本地配置与节点映射通过”，就配好了。

注意：

- 生成 H3 用的是你自己的账号，消耗你自己的额度。账号权限和余额请在 RunningHub 上确认。
- 密钥只保存在你电脑上的这个文件里，仓库不包含任何密钥。**不要把 Key 发到聊天里**，也不要把 `*.local.json` 上传到任何地方。

## 第五步：剪第一条视频

1. **准备素材文件夹。** 把口播视频放进一个单独的文件夹。如果有口播稿、字幕（`.srt`）、要展示的截图、录屏或文档，也放进同一个文件夹，Skill 会自动发现并用上。原视频不会被修改。

2. **新开一个智能体会话，说明要用哪个版本。**

   想自己把关（编辑台版）：

   > 用口播剪辑编辑台处理这条视频：`D:\视频\第一条\口播.mp4`

   想直接拿成片（全自动版）：

   > 用前景导演自动剪辑这条口播视频，直接出成片：`D:\视频\第一条\口播.mp4`

3. **回答预处理问题。** 智能体会先问：“是否先处理原视频（剪气口、明显口误、重复内容）？”
   - 回答“要”：保守地剪掉无意义的停顿、明显口误和重复内容，画面分辨率不变；
   - 回答“不要”：保持原片时间线不动。

4. **等它分析和生成。** 它会转写语音，逐句判断哪里需要前景讲解，选组件，生成 H3（配了 RunningHub 的话），再配字幕和音效。视频越长耗时越久，H3 生成也要排队。

5. **拿结果。**
   - **全自动版：** 智能体直接给出成片 MP4 的位置。
   - **编辑台版：** 智能体会把工程装进编辑台，接下来这样操作：
     1. 双击 `启动AI口播编辑台.vbs` 打开编辑台，在顶部项目列表选中这个项目；
     2. 点时间线上的前景事件，在右侧修改组件、变体、开始和结束时间、位置、开关以及文字内容；
     3. 素材缺失或想换版本时，在左侧素材区点“替换”；
     4. 点“保存项目”，旧版本会自动备份到项目的 `autosave/` 文件夹；
     5. 点“导出原分辨率成片”，成片会写进项目的 `output/` 文件夹。

   编辑台的更多说明见 [editor/README.md](editor/README.md)。

6. **想调整风格？** 直接告诉智能体，例如“这类关键词卡片以后都放左边”“这一段不要 H3”。默认只改当前这条视频的工程；想让以后都生效，要明确说“把这个改进到 Skill 里”。

## 常见问题

**装完后智能体说找不到这个 Skill。**
先确认已经新开了会话。然后确认装对了目录：Codex 是 `~/.codex/skills`，Claude Code 是 `~/.claude/skills`。如果装错了，删掉装错位置的两个 Skill 文件夹和编辑台目录（`~/AI-talking-head-edit-desk`），再按第三步用正确的命令重新安装。

**安装时 `npm ci` 失败或下载很慢。**
不要重新运行 `install.py`，文件已经复制好了。进入编辑台目录，换成国内镜像后重新安装依赖：

```powershell
npm config set registry https://registry.npmmirror.com
npm ci
```

**提示找不到 `ffmpeg`、`node` 或 `python`。**
刚装好的软件要重新打开终端才生效。如果还是找不到，检查安装时有没有勾选“加入 PATH”（Python 安装器里是 *Add python.exe to PATH*）。

**编辑台打不开，或者 4312 端口被占用。**
先关掉之前开着的编辑台再试。也可以在编辑台目录里换一个端口启动，然后打开 <http://127.0.0.1:4313>：

```powershell
$env:EDIT_DESK_PORT=4313; npm run dev
```

**提示没有安装 ASR / 转写库。**
在**智能体使用的那个 Python** 里运行 `python -m pip install faster-whisper`。如果你已经有准确的字幕文件，把它和视频放在同一个文件夹里，也可以先不装。

**RunningHub 检查没通过。**
确认 Key 粘贴在两个引号中间、前后没有多余空格，文件已经保存，`workflowId` 没有被改动。如果文件改坏了，可以从本仓库 `skills/remotion-foreground-builder-auto-reference-first/config/templates/` 里复制对应的 `.example` 文件，覆盖安装目录 `config/` 下的同名文件（去掉 `.example` 后缀），再重新填一次 Key。

## 素材与许可

仓库带有 4 个可以再分发的 starter 参考示例。上游的 `creator-reference-library` 在第三方声明里限制再分发，所以没有收录。参考检索会使用这些 starter 示例和你自己有权使用的素材。请保留各目录里的第三方许可和署名，第三方组件和素材仍按各自的许可使用。

本项目自身的代码、Skill 和文档采用[个人非商业使用许可](LICENSE)：

- 个人可以免费下载、安装、学习，也可以为自己使用而修改；
- 不允许任何形式的商用，包括修改或二次开发后用于商业目的；
- 不允许再分发或转售。

商业使用需要事先取得作者的书面授权，可以在本仓库提交 Issue 联系作者。

## 验证情况

已在 Windows 隔离目录验证：两个 Skill 的安装、组件同步、编辑台的构建与启动，以及样例素材的导入、保存和 MP4 导出。五种 RunningHub 模式的预置工作流和本地节点映射测试也已通过。

全新 `npm ci` 下载受测试环境的网络限制，运行验证用的是同版本的本机依赖。
