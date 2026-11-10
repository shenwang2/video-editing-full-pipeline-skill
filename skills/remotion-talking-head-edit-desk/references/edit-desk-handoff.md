# Edit Desk Handoff Contract

This file defines the stopping point and delivery format for the human-assisted editing workflow. It overrides any final-render or Remotion-project-generation instructions inherited from the autonomous director.

The current `remotion-foreground-builder-auto-reference-first` installation is the authoritative director. The edit desk owns only the handoff boundary and editable project format. This Skill keeps no copies of director files; always read them from the current autonomous director.

## Boundary

- Before preprocessing, ask whether the user wants `要 / 不要` for cleaning the recording. Complete cleaning and clean-timeline ASR only after `要`; after `不要`, keep the raw recording unchanged and use raw-source timing. Then complete semantic directing, foreground component routing, spatial planning, SFX planning, external-material discovery, H3 selection/generation, and H3 retiming before handoff.
- Do not build a per-video Remotion codebase and do not render a final composite.
- Deliver one project bundle to the installed AI talking-head edit desk. The user owns final visual adjustments and starts either a complete composite render or a transparent-foreground render from the desk.
- Ordinary project handoff reads the original Skill without modifying it. Explicitly authorized shared component/directing maintenance is performed only in the original Skill, then synchronized; the edit desk may never carry its own visual component override.

## Project bundle

Write one folder under `<editorRoot>/projects/<projectId>/`:

```text
edit-project.json
media/clean-base.mp4  # compatibility asset name; may contain a cleaned base or an unchanged copied raw source
media/h3/*.mp4
media/external/*
media/audio/*
analysis/*
```

All runtime asset paths in `edit-project.json` are relative to this project folder and use forward slashes. Absolute source paths may exist only in `originalPath` for traceability and importing.

## Timeline authority

- Stage 1 selects one `workingBase`: the cleaned base after `要`, or the unchanged raw source after `不要`.
- The installed compatibility asset path remains `media/clean-base.mp4` in both branches so the editor runtime does not need two background roles. In the `不要` branch, packaging may copy the raw file to that path but must not cut, transcode, remux, or otherwise rewrite its content.
- `composition.width`, `height`, `fps`, and `durationMs` come from the selected `workingBase`.
- Every foreground event, H3 event, caption cue, and SFX cue uses its `workingTimeline`: clean-output milliseconds after `要`, raw-source milliseconds after `不要`.
- Preserve exact original encoded width and height. H3 source resolution remains workflow-native and is scaled only at composition time.
- Transparent-foreground output preserves this same duration, width, height, frame rate, and timing. It removes only `media/clean-base.mp4` and its narration from the composition while retaining external materials, H3 takeovers, Remotion foreground, captions, SFX, and useful H3/source audio. Encode it as alpha-capable ProRes 4444 MOV, then premultiply RGB by Alpha for Jianying so colored shadows, glows, and translucent surfaces composite correctly instead of becoming saturated blur blocks.

## Mapping into `edit-project.json`

- `analysis/foreground-plan.json` selected renderer entries become `timeline.foregroundEvents`.
- Each event stores the approved `componentId`, named `variantId`, semantic layer, exact start/end, placement, `alignmentToken`, `visibleEdge`, payload, style, asset IDs, composition group, and collision evidence. The edit desk must preserve the authoritative Section-title master grid; it may not collapse a measured visible-edge decision back into a placement preset alone.
- Preserve the director's selected scene context, source-aligned entrances, readable holds, and normal foreground treatment through the existing components and layers. Do not drop it because another component already expresses the core structure. Optional context source/target/reading-value notes belong to planning evidence; they are not required new runtime fields, and older valid manifests remain valid without them.
- For classic comparison events, persist the original director's selected variant, source-ordered payload and anchors. Preserve shared stable editable surface IDs and use shared geometry helpers; the component contract and animation remain upstream.
- For classic sequence events, preserve the original director's `steps[]` contract and named variant without a second selection or rhythm pass. Save/reopen must retain each step anchor and stable `sequence-step.N` override. Read rendering/state behavior from the original contract; do not define it here.
- Visible-content coordinates use `placement.boundsVersion: 2` together with `boundsMode: "visibleContent"`. Call the authoritative pack's `getSemanticVisibleBounds` through the editor adapter; never label a generic layout-zone box as visible content. For imported unversioned projects, call `normalizeProjectPlacement` before saving/handoff: it preserves the existing affine transform, hydrates media dimensions from ready assets, and upgrades only supported variants. Do not add version 2 to an old box without migration. Unsupported variants retain their legacy coordinate contract. Check material aspect, outer box, drag, uniform resize, and save/reopen when changing this adapter.
- A user move or corner-resize converts only that event to normalized placement. Its `x/y/width/height` box represents center position plus uniform scale and must drive the same transform in preview and render. Do not rewrite the semantic payload or component selection during direct manipulation. Keep H3 locked. A full-screen recorded operation demonstration must still be selectable; it remains transform-locked only while its display control is `全屏演示`. Switching it to `前景窗口` writes `payload.presentationScale: "large"`, preserves its asset/timing/audio/semantic purpose, and enables ordinary move and corner-resize behavior. Switching back writes `detailTakeover` and restores the full-canvas preset.
- Section titles remain on their section interval and use `SectionTitle`, outside the 24 semantic components. New cuts default to `referenceV2` (V2 中英标题); `standard` (经典标题) is the second selectable variant. Read the title contract in `<directorRoot>/references/layer-rules.md`. Preserve explicit variant choices on save/reopen and keep copy/timing unchanged when switching. Both variants use `mode: preset`, `preset: leftMiddle`, `alignmentToken: sectionTitleLeft`, `visibleEdge: left`, `align: left`; never restore a normalized title transform or encode a title as `InsightFocus`.
- External screenshots, recordings, demonstrations, evidence, and documents are assets plus real-object foreground events. A continuous prerecorded product/process operation demonstration that the viewer must follow defaults to `MediaFrame/recordedDemo` plus full-screen `detailTakeover`; the edit desk may manually switch that same event to a large foreground window. All other external material remains measured local/large and uses crop, zoom, focus, or callout for detail.
- Audited H3 shots become `timeline.h3Events`. Preserve the full-screen 16:9 takeover intent, source audio decision, requested/actual duration evidence, and the exact fine play/hold mapping. The generated duration must already directly fit its spoken interval; retime segments may correct at most 10% playback-rate drift and add at most 0.8 seconds of deliberate result hold. Anything larger returns upstream for anchor/prompt revision or regeneration.
- Subtitles aligned to the selected `workingTimeline` become `timeline.captionCues`. Project-wide subtitle typography and background-box controls persist in `settings.captionStyle`: font family, font size, text color, optional background fill, opacity, and corner radius. Preview and final rendering must resolve the same values, and the background box must remain content-sized rather than spanning the canvas. The editor may persist a reversible visibility choice at `settings.captionStyle.hidden`; this affects preview and final rendering but never removes the cues.
- Planned sound effects become `timeline.sfxCues`, referencing bundled or copied audio assets.

## Asset states

- `ready`: the file must be present inside the project folder when packaging finishes.
- `placeholder`: the material is intentionally missing and can be replaced in the editor.
- `missing`: an expected file failed discovery; treat this as a blocker for any event that cannot be understood without it.
- Do not mark an absent file as `ready`.

## Entrance inspection

- Selecting a foreground timeline event pauses and seeks to its exact entry frame, not entry plus a 500ms inspection offset. This is a player-control behavior only and never changes project timestamps or component animation.
- The inspector exposes `重播入场`: seek to the selected event's entry and play the existing composition. Do not generate a separate preview or comparison video to inspect a component.

## Handoff validation

The editor exposes one grouped `组件主色` override stored only at `event.style.accentColor`. Its allowed values include the seven approved room-light colors plus the twelve original renderer chromatic tokens from `warmTech`, `editorialAmber`, `jadeInk`, and `coralNight`. Text, muted, surface, and line tokens are not main-color choices. Changing the color must leave component, variant, content, semantic layer, placement, assets, and timing unchanged. `恢复样式默认色` removes only this field.

The `内部卡片颜色` selector uses that same grouped nineteen-color library. A per-card choice writes only the selected stable card's `elementOverrides[stableCardId].color`; it must not recolor sibling cards or rewrite the whole component's `style.accentColor`. Do not expose only the seven room-light colors at the inner-card level.

Before delivery:

1. Run `scripts/sync-editor-runtime.py`; it must first validate the authoritative semantic component pack, including content-sized text/peer surfaces and protected spoken-primary typography, before copying the runtime.
2. Validate the manifest with `scripts/validate-edit-project.py`.
3. Require the background asset to be a ready `clean-base` compatibility asset and record whether it is `cleaned` or `raw-pass-through`.
4. Probe the copied working base and require its width and height to match the composition.
5. Require every ready asset to exist under the project folder.
6. Require all timeline events to fit the selected working-base duration. When preprocessing was declined, require identity timing with the raw source and no cut-map remapping. Every H3 event must point to a ready duration plan, and its requested duration must match the shot contract, prompt bundle, and RunningHub job record.
7. Confirm the editor API can discover and load the manifest without rendering a frame.
8. Report the final project folder and `edit-project.json` path. Do not render unless the user explicitly switches to the autonomous skill or asks the desk to render.

Fast handoff never runs Remotion stills, contact sheets, sample composites, final renders, `npm install`, or a whole-project typecheck merely to install project JSON. Those checks are opt-in visual QA, except after reusable editor component code changes.

## Execution efficiency

- Resolve the authoritative director once. Reuse instruction files already read in full during the current run; avoid repeated whole-file dumps, repeated schema discovery, and unrelated legacy-reference reads. Read changed or still-required references before dependent actions.
- Start required ASR as soon as the working base is selected. Discover companion materials and inspect representative source/material frames while it runs. Reuse the aligned transcript for downstream planning instead of starting a duplicate transcription.
- Finish the semantic foreground plan before H3 selection as required. For H3 work that already has the required authorization, prepare its images, contract, prompt and audit, then overlap remote generation with local caption, SFX, foreground-rhythm, alignment and packaging work. This scheduling rule does not grant or change RunningHub upload or spending authorization.
- Keep one authoritative foreground plan and compile downstream artifacts from it. Fix validation failures in their originating data and rerun affected checks; do not rediscover the schema or rewrite an already valid whole project. Preserve required data and material checks. H3 source-frame inspection is distinct from rendering a Remotion composite.
- Record lightweight stage start/end times and external job IDs in `analysis/execution-timing.json`: ingestion/ASR, semantic planning, image generation, H3 submit/result, project compilation/validation, and installation. Report overlapping stages as overlapping elapsed intervals, not additive exclusive costs. Separate actual user/platform waits from local work and external generation. Do not add a model pass or render merely to measure time.

## RunningHub configuration

The human-assisted skill may read the existing autonomous skill's local RunningHub configuration, but it must never write to it. Resolve `sharedRunningHubConfigRoot` from `config/edit-desk.local.json` and pass the appropriate mode-specific `.local.json` explicitly to `<directorRoot>/scripts/runninghub-i2v.py`. Pass the audited prompt bundle without a separate duration override; the runner writes its `durationSeconds` to the configured workflow node and records `durationSource: prompt-bundle`. Do not copy API keys into the edit project, logs, manifests, or handoff response.


## Editable SFX gain

Expose an 音效 control beside the preview controls and a selectable 音效 timeline track. The mixer edits the existing settings.audio.sfxMasterGain (0–2) and each timeline.sfxCues[].volume (0–1), plus its enabled flag; keep narration and H3 gains separate. Open legacy projects at their saved gains without increasing defaults or rewriting cues. A cue can be selected by timestamp and asset name, auditioned with the actual composition mix, and stopped automatically after its window. Controls must mark the project dirty, persist through the standard save flow, and feed the same EditComposition used for preview and both export modes. The existing renderer gain limit remains authoritative; no second preview-only gain or source-file rewrite. Handle empty SFX tracks and missing/disabled assets clearly.


## Timeline sizing

The editor timeline panel must grow to contain its visible tracks, including captions and any later SFX or metadata row. Avoid a fixed panel height with hidden overflow that cuts off the last track. At shorter desktop viewport heights, let the outer page scroll so the final track remains fully reachable. Retain padding below the last rail and verify the final rail stays inside the panel after adding a new row.
