# AI Talking-head Edit Desk

This is a separate local application. It does not replace or mutate
`remotion-foreground-builder-auto-reference-first`.

## Product boundary

- The existing autonomous skill continues through final QA and rendering.
- The companion human-assisted skill stops after producing a portable edit project.
- Both modes may compile into the same `edit-project.json` protocol.
- The edit desk imports that protocol, resolves project-relative assets, previews the timeline, exposes component variants and layout parameters, and renders only when the user requests it locally.

## Shared data, separate entrypoints

The component registry, component implementation, SFX library, semantic plan, H3 contracts, and time mapping can be reused. The existing autonomous skill remains the owner of its own workflow and files. Reuse is implemented by copying versioned runtime assets into the edit desk or by a read-only synchronization step; never by editing the autonomous skill in place.

## Runtime boundary

The browser UI must not depend on Windows absolute paths. Importing a project copies or links referenced media into a project directory and rewrites runtime references to project-relative paths. The Node process serves those assets locally. No media upload or cloud service is required for preview and rendering.

## Canonical handoff

The handoff is a project folder containing:

```text
<project>/
  edit-project.json
  media/clean-base.mp4
  media/h3/*
  media/external/*
  media/audio/*
```

`edit-project.json` is render-ready. Analysis artifacts such as
`foreground-plan.json`, `h3-candidates.json`, and `h3-retime-plans/*.json`
remain useful provenance but are not loaded directly by the edit desk.
