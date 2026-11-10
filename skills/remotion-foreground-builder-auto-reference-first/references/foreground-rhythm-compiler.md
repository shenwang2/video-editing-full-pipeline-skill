# Foreground Rhythm Compiler

Use this deterministic pass after semantic/component/spatial planning is stable and before compiling Remotion data or `edit-project.json`. It coordinates timing only. It does not call a model, render frames, alter wording, select components, assign primary/supporting layer ranks, or retime H3.

## Behavior

- Ordinary foreground events receive a short frame-rounded visual lead when the source plan contains free lead-in time, so their entry motion is near its readable state when the spoken keyword lands. The compiler clamps that lead rather than creating a new unverified transition overlap.
- `VerdictStamp` and events explicitly marked `rhythmPolicy.revealSensitive: true` start exactly on their grounded reveal. Internal result, verdict, solution, effect, completion, and item timestamps are never moved by the compiler.
- Foreground events that begin on the same spoken beat inside one composition receive a small deterministic shell-entry stagger. Existing media establishes first, then relationship graphics, then memory treatments. This is only an entry rhythm and does not assign visual priority or reduce any layer's eventual size, contrast, or motion.
- Structured items keep their original individual Spoken Beats and remain accumulated until the parent event exits unless an explicit semantic hide is already present.
- When the last grounded internal beat would otherwise have less than the minimum readable hold, extend the event only into free time before the next blocking event in the same placement. Never shorten an event or move an internal semantic reveal earlier.
- H3 shots, Section titles, captions, source media ranges, and text payloads remain unchanged.

The pass is idempotent. Original start/end values are stored in each event's `rhythm` metadata, so recompiling the same plan cannot repeatedly shift it.

## Command

```powershell
python -X utf8 scripts/compile-foreground-rhythm.py analysis/foreground-plan.json --output analysis/foreground-plan.rhythm.json --report analysis/foreground-rhythm-report.json --fps <clean-base-fps>
```

Use `analysis/foreground-plan.rhythm.json` for downstream foreground auditing, Remotion data compilation, master alignment, and edit-desk compilation. Keep `analysis/foreground-plan.json` as the semantic/spatial source plan.

Per-event exceptions are optional and require no new analysis pass:

```json
{
  "rhythmPolicy": {
    "revealSensitive": true,
    "entryLeadMs": 0,
    "minimumFinalHoldMs": 1200
  }
}
```

Use an override only when the existing semantic payload already makes the need obvious. Do not generate a rhythm policy for every event.
