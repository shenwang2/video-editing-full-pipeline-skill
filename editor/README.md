# AI 口播编辑台

本地的人机协作口播剪辑编辑台。它读取 `edit-project.json`，把导演生成的前景组件、H3、字幕、音效和素材时间线转成可预览、可调整、可在本机原分辨率渲染的 Remotion 成片。

它与原来的全自动剪辑 Skill 完全分开：

- 全自动版：视频交给 Skill，直接等待最终成片。
- 编辑台版：Skill 生成干净底片、素材与剪辑 JSON，你在这里调整并决定何时渲染。

## 启动

推荐双击 `启动AI口播编辑台.vbs`，它会在后台启动服务并打开浏览器，不会闪黑色命令窗口。`启动AI口播编辑台.cmd` 是带错误提示的备用启动方式。

也可以在本目录运行：

```powershell
npm run dev
```

然后打开 <http://127.0.0.1:4312>。

## 使用

1. 用“口播剪辑编辑台版” Skill 处理视频；它会把完整项目安装到 `projects/<项目名>/`。
2. 在顶部项目列表选择项目。
3. 点击时间线上的前景事件，在右侧修改组件、变体、开始/结束时间、位置、启停与内容 JSON。
4. 素材缺失或需要换版本时，在左侧素材区点“替换”。
5. 点击“保存项目”；旧 JSON 会自动备份到项目的 `autosave/`。
6. 点击“导出原分辨率成片”；结果写入项目的 `output/`。

也可以点击“导入剪辑JSON”建立一个新项目，再逐个替换缺失素材。

## 分辨率

播放器和渲染器均读取项目 JSON 的 `composition.width`、`height`、`fps` 和 `durationMs`。编辑台不会把项目固定成 1080p、16:9 或 9:16。

## 项目文件

```text
projects/<project-id>/
  edit-project.json
  media/clean-base.mp4
  media/h3/*.mp4
  media/external/*
  media/audio/*
  analysis/*
  autosave/*
  output/*
```

所有运行时素材路径都相对于项目目录，方便移动与备份。
