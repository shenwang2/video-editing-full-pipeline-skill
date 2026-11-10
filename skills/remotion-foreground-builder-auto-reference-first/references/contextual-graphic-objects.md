# Contextual freeform objects

This is an opt-in contextual expression capability, separate from the 24 semantic component slots. It does not add a slot, variant, candidate fallback, or an Atomic preset. Existing semantic purposes continue to use their registered components. Use this capability when the user requests a context-specific object/action composition whose meaning is not a core claim, comparison, workflow, or judgment.

Authoritative code lives in `assets/semantic-foreground-pack/src/contextual/`. `ContextualGraphicScene` renders the same `GraphicScene/freeformV1` document used by the editor. Editor files are re-export bridges and UI controls only. The six existing object kinds and their poses, curves, origins, appearance transitions, connections, and element overrides retain their behavior.

## Metric accumulation object

Add a `metricBar` appearance to a freeform object and supply `metric`: `label`, nonnegative `fromValue`, greater `toValue`, `valueMode` (`exact` or `atLeast`), event-local `startMs`, later `completeMs`, optional `format` (`integer` or `compact`), optional `unit`, optional `icon` (`like` or `none`), and `progression: "illustrative"`. Set `labelPosition: "none"` when the metric supplies its own caption. Use a 4:1 body and independent object poses for placement, appearance and movement. The counter and long horizontal fill accumulate together; the arrival receives a brief accent pulse. Number, timing, color, position and uniform scale remain editable.

For a phrase such as 点赞破万, use `toValue: 10000`, `valueMode: "atLeast"`, and `format: "compact"`; the final display is `1万+`. Align completion to the spoken threshold, and retain enough hold time to read it. Intermediate values illustrate accumulation, not measured historical samples. The bar describes that accumulation, not a percentage, ranking, performance judgment, or invented goal. Exact values, units and qualifiers must match the supplied evidence. Do not replace the existing threshold judgment, keyword/number, comparison or workflow components globally.

In the edit-project envelope keep `componentId: "GraphicScene"`, `variantId: "freeformV1"`, a contextual role in provenance, and the scene document in `payload.graphicScene`. Do not add a renderingMode override or change the project's global component style. Use the shared `validateGraphicScene` before packaging, and `getGraphicSceneBounds` for editing. Bounds use a stable expanded object envelope so the selection does not jump while the bar fills. Event-local animation must finish within the event lifetime. For an autonomous Remotion composition, import `ContextualGraphicScene` from the shared pack and pass the event, assets and asset base URL inside the event's Sequence.

Regression requirements: existing freeform poses/connections/bounds remain equal at sampled times; invalid metric contracts fail; animated values are monotonic and preserve the terminal qualifier; drag, uniform resize, independent color and JSON save/reopen remain valid. Never modify the 24-slot contract or the independent Atomic Skill pair for this capability.

For a freeform event, always set `placement.boundsMode: "visibleContent"` (also when placement mode is preset), so the editing box uses the graph object envelope rather than the generic semantic layout zone. The graph body is positioned by its poses. Validate `getEventPlacementBox` against `getGraphicSceneBounds` in the saved event, not just the model in isolation.


## Contextual negation mark

Use a text object beside a `crossMark` object for an explicitly spoken denial such as 标题党 followed by a cross. This is an optional contextual object/action, not a warning or verdict template and not a new semantic slot. `crossMark` draws two round-ended strokes in sequence as the existing pose `reveal` increases from 0 to 1. Author the reveal and opacity poses relative to the spoken beat; place the cross beside the term so it never obscures readable glyphs. The label, mark color, position, size, and event-local action times remain editable. Preserve enough settled reading time.

When reviewing context, capture meaningful spoken denials, corrections, and contrastive actions even when they are not core claims. Select only cues that materially clarify the utterance; do not add a symbol to every sentence. Never reverse polarity, invent a rejected alternative, or promote casual denial into a stronger factual verdict.

Use optional `labelShadow: true` for white contextual text over a light live-action background. This opt-in readability treatment preserves prior label styling when omitted.


## Contextual region annotation

For a user-requested annotation of several visible regions in existing material, `focusRing` is a transparent outlined ellipse, with its stroke reveal driven by authored event-local poses. Combine it with exterior text objects and the existing connections. Measure targets against the actual displayed material; when a target grows or moves, author matching target poses and check both entry and final states. Keep labels readable outside the highlighted content and reserve title/caption space. Include a restrained group cue when several markers arrive together. This opt-in primitive does not replace `CalloutSpotlight`, add a semantic slot, or alter old graphic documents.


For unified technology-style emphasis, use `focusBox` (a thin unfilled rectangle with four short corner marks) around the related problem area, one `focusTag` above it, and a short straight vertical connection (`fromSide: top`, `toSide: bottom`, `bend: 0`). Keep a single accent and one compact explanation. For this user's opening criticism, prefer the group frame over separate rings, a bottom row of repeated labels, or long crossing curves. Poses own timing and target growth; all old appearances remain unchanged.


## Screenshot details and simulated chat

Use `screenshotDetail` with a real image `assetId` and `screenshot` data: source dimensions, `from`/`to` source-pixel crops, event-local zoom start/end, and an optional measured focus rectangle/time. The viewport clips the source and preserves aspect ratio. Inspect the supplied screenshot; never substitute a drawn imitation for a real control. Keep details local/large, readable on the target portrait preview, and hold the final crop through the spoken action.

A specifically requested illustrative chat action can use `chatPanel` with data-driven app name, title, prompt, status, typing start/end and send time. It labels the panel 模拟操作, shows typing then a submitted bubble and working status, and performs no external action. Do not fabricate completion, actual execution, or evidence. Use clear SVG icons and legible type; keep existing explanation components outside the chat panel. Both primitives share graphic object poses, color overrides, measured bounds, drag and uniform scale. Pair entries and meaningful actions with restrained SFX. Validate timing/data and visually inspect entry, settled text, final crop and title/subtitle clearance.
