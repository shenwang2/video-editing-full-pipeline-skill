# Layer Rules

## Component Curation Boundary

For new cuts, this file governs timing, legibility, stacking, collision, captions, SFX, media audio, and real-object handling. Its older renderer names, presentation palettes, and 29+5 component examples are preserved only to reproduce historical cuts; they are not a candidate library. Select new-cut components only from `semantic-component-library.md` and `assets/semantic-component-contract.json`. If a relationship or memory slot is still pending curation, leave its component unresolved instead of reviving a legacy name from this file.

## Source Of Truth

- Use the automatically generated `analysis/semantic-timeline.json` as the authority for Section boundaries, Foreground Scene boundaries, three-layer payloads, Spoken Beats, and title timing. Build it from the source video's audio according to `remotion-semantic-director.md` and `auto-semantic-director.md`; never require user-authored segmentation markdown.
- For middle key sentence content and external-material opportunities, inspect the corrected, word-timed spoken lines inside the current semantic section and choose foreground-worthy spoken information, material references, and visual-support cues directly from those lines.
- Word-timed ASR or matching timed subtitles supply exact timestamps and spoken content. Scattered spoken lines may be merged into concise foreground statements only when the merged statement is faithful to what is spoken in that moment.
- Main titles must be concise semantic summaries of the central thesis of automatically detected sections. Synthesize them after segmentation from the complete corrected section meaning; do not merely copy a script heading, transcript sentence, or isolated keyword. A companion script may clarify wording and terminology but is not the title source unless the user explicitly locks its wording. Never add an unspoken claim, result, or promise.

## Layer Model

### Composite Layer Order

Use this back-to-front order:

1. source talking-head video;
2. one active full-screen takeover: either 16:9 H3 or a `MediaFrame/recordedDemo` operation demonstration, never two competing takeovers;
3. adaptive readability scrim or localized gradient when needed;
4. section title;
5. middle key sentence, structured enumeration, and semantic external-material foreground;
6. speech captions when the project includes them;
7. SFX audio.

H3 is a moving background carrier, not a replacement for necessary foreground information. Keep required titles and semantic foreground visible, but simplify or reposition them when the H3 action occupies the same focal area. Never show two competing primary foreground explanations at once.

All Remotion semantic foreground components use a transparent full-frame host only as coordinate space. Their ordinary visible surfaces remain local or large inside measured foreground zones. Full-screen visible behavior belongs only to H3 or a prerecorded operation demonstration routed as `MediaFrame/recordedDemo` with `presentationScale: "detailTakeover"`. No screenshot, webpage, document, dashboard, proof item, code sample, still image, ordinary B-roll, `show`, `focus`, or `verify` event may use that scale.

### Full-Screen H3 Background

- Render H3 without card chrome, rounded corners, borders, outer margins, or picture-in-picture framing.
- Require a 16:9 H3 source clip and fill the full output canvas with centered `object-fit: cover`. Crop overflow symmetrically by default; never stretch the clip.
- Keep the H3 subject, transformation, and final state inside the crop-safe center defined in the shot contract. For a vertical final canvas, compose the generated 16:9 scene so its essential action survives the narrow center crop.
- Keep all required Remotion foreground layers above H3. Use a restrained dark gradient, localized shadow, or translucent support only where needed for readability; do not dim the whole shot unnecessarily.
- Do not duplicate the same explanatory payload in H3 and foreground. Let H3 carry the concrete action while Remotion carries exact words, labels, relationships, and emphasis.
- Use real evidence instead of H3 when a factual claim needs proof. Do not place generated fake evidence behind truthful foreground labels.
- Time the takeover and each internal visual state to exact spoken anchors. A visual consequence must not precede its spoken cause.
- Preserve the RunningHub workflow's native generation resolution. Only the Remotion compositor scales the returned clip to the source-resolution canvas.

### Typography

- Use the system font stack `"Microsoft YaHei", "Segoe UI", Arial, sans-serif` for Chinese, English, and numbers.
- Do not introduce external font files or remote font loading unless the user asks.
- Keep typography consistent across title, key sentence, enumeration, and external-material labels unless a local component has a strong semantic reason to vary weight or size.
- Treat title semantics and title styling as separate decisions. Automatic segmentation may change title wording and timing, but preserve the user's established title position, size, accent treatment, and entrance style unless the user explicitly asks for a redesign. Do not center a previously left-aligned title merely to satisfy a general safe-area rule.
- When the user provides a color reference image or explicit palette, sample/store that palette and constrain all non-title colored text to it: key-sentence highlights, `keywordPop` text, colored enumeration labels/chips, and generated external-material labels. Use deterministic assignment from text/timestamp/semantic id so renders are repeatable. If the user says the title color must not change, leave `titles.accentColor` and title-rendering colors untouched.
- A single foreground visual variant uses exactly one chromatic accent. Every card, node, connector, label, badge, indicator, and glow belonging to that variant inherits the same swatch. Do not color-code sibling cards or stages with different hues; distinguish them by shape, numbering, icons, opacity, scale, and timing. Neutral black, white, gray, and transparent glass surfaces remain allowed.
- Separate semantic hierarchy from helper typography. A foreground item may be subordinate to a hero keyword and still be primary spoken information. Primary statements, step names, state labels, tags, values, and short terms must never inherit eyebrow, metadata, English-label, ordinal, or definition sizing.
- For a 2560x1440 landscape baseline, use these mobile-readable starting bands: hero keyword/number `132-170px`; ordinary primary statement `84-100px`; structured primary item such as a step or tag `48-68px`; auxiliary eyebrow/meta/English/ordinal `20-28px`; explanatory definition `30-40px`. These are starting bands, not fixed quotas: measure the real string, preserve hierarchy, and scale proportionally with the source canvas.
- For mechanism diagrams, branching routes, and compact process graphics, treat every spoken node label as structured primary information. At the 2560x1440 baseline, keep route/step labels in the `54-68px` band whenever the string fits, use `850-950` weight, and prefer shortening wording or reflowing the geometry over shrinking a branch label below `48px`. Do not build a small diagram and enlarge it with CSS scale; lay it out at its final rendered size. Avoid low-opacity type, soft whole-component scaling, and blur-heavy glass directly behind primary node labels because they make otherwise adequate text look fuzzy on a phone.
- If text must shrink to fit, shorten the foreground wording before pushing primary content into the auxiliary band. Reject a lone final character on a wrapped line, clipped text, or an isolated one-character second line.
- Judge both the hero tier and the lower primary tier at phone-viewing size. A design fails when the hero word looks strong but the surrounding primary information reads like a footnote.

### Alignment, Surface Size, And Progressive Layout

- Establish a scene grid before placing components. Derive named alignment tokens from the established Section title edge, canvas safe edges, caption band, and any deliberate opposite-side margin. For the legacy 2560x1440 title treatment, the left master edge is `x=108`; scale it proportionally when the canvas changes.
- Align the visible edge of every same-lane surface to the selected token. A large transparent host or placement zone may span more space, but centering a smaller card inside it must not shift the card away from the shared edge.
- Keep related cards on one shared text baseline and stable gap. When two peer cards require visual equality, derive their shared height from the larger measured payload; otherwise let each surface follow its own content.
- Size a card from measured text, actual lines, icons, and tight padding. Do not reserve the final multi-item height before those items are visible, and do not use a large decorative parent panel around a few short rows.
- In progressive sequences, an unspoken item does not render and does not occupy layout space. The current spoken item carries the strongest primary size, contrast, and accent; completed items remain readable but subordinate; ordinals, English labels, and state metadata alone use the auxiliary tier.
- Treat the component group title, current item, completed item, and metadata as separate typography tiers. For a 2560x1440 baseline, a useful starting hierarchy is group title `54-68px`, current structured item `52-68px`, completed retained item `44-56px`, and metadata `20-28px`, adjusted after measuring the real strings.
- For problem/solution, comparison, and other peer states, keep geometry orderly but content-sized: shared visible edges, equal peer widths when their roles are equal, compact height for short payloads, and no obvious empty lower half. State handoff may lower the old state's contrast only after the narration begins the transition.

### Studio-Editable Key Sentence Styling

- Keep key sentence styling data-driven so Remotion Studio's right-side props panel can edit it without code changes.
- Expose line-level and word-level controls as nested props, not opaque strings or JSON blobs hidden inside one field.
- Line-level controls belong on the sentence item; word-level controls belong inside `highlights`.
- Provide named style presets as the baseline for sentence items, then let line/highlight overrides win. Good preset names include `bare`, `focus`, `card`, `status`, and `emphasis`.
- Keep preset baselines consistent so editing stays predictable:
  - `bare`: `fontSize` 64, `fontWeight` 700, `lineHeight` 1.08, `iconSize` 28
  - `focus`: `fontSize` 90, `fontWeight` 820, `lineHeight` 1.04, `iconSize` 32
  - `card`: `fontSize` 68, `fontWeight` 720, `lineHeight` 1.12, `iconSize` 30
  - `status`: `fontSize` 72, `fontWeight` 820, `lineHeight` 1.06, `iconSize` 32
  - `emphasis`: `fontSize` 82, `fontWeight` 860, `lineHeight` 1.04, `iconSize` 32
- Each key sentence item should support line-level overrides:

```ts
{
  text: "用 Vibe Coding 两天手搓出同款",
  showAtMs: 11266,
  hideAtMs: 16200,
  style: {
    fontSize: 44,
    fontFamily: "Microsoft YaHei",
    fontWeight: 700,
    color: "#F8FAFC",
    lineHeight: 1.18
  },
  icon: {
    name: "code",
    size: 28,
    color: "#7DD3FC",
    strokeWidth: 2
  },
  highlights: [
    {
      text: "Vibe Coding",
      color: "#7DD3FC",
      fontSize: 48,
      fontWeight: 800
    },
    {
      text: "两天",
      color: "#FDE68A",
      fontSize: 50,
      fontWeight: 800
    }
  ]
}
```

- Do not hardcode key sentence `fontSize`, `fontFamily`, `fontWeight`, `color`, `lineHeight`, `icon.size`, or `icon.color` only in CSS or renderer constants.
- Use renderer defaults only as fallback when a line omits a field; explicit per-line values win.
- Use `stylePreset` to avoid hand-tuning every line from zero. A preset should supply the base font size, weight, color, and spacing; line/highlight overrides should only adjust the exceptions.
- Use `highlights` for word-level styling. Each highlight can override `color`, `fontSize`, and `fontWeight` for exactly the matched text span.
- Render highlighted text by splitting the sentence into normal spans and highlighted spans. Do not color the entire sentence when only one keyword is highlighted.
- Prefer `text` matching for Studio editing simplicity. If the same text appears multiple times and only one occurrence should change, allow `start` and `end` character indexes as a more precise override.
- Keep highlight defaults inherited from the parent line style unless a specific highlight overrides them.
- If a highlight changes `fontSize`, `fontWeight`, or `lineHeight`, remeasure the line and the card before layout so the enlarged span fits cleanly.
- Never clip, overlap, or vertically misalign a span just because it is larger than the base text.
- Ignore or warn on highlight entries that do not match the sentence text; do not silently create duplicate text.
- Do not allow overlapping highlight ranges. If ranges overlap, choose the more specific range or ask the user before guessing.
- Keep the props schema human-editable in Studio: prefer plain numbers, strings, and arrays over opaque encoded strings.

### Remotion Studio Default Props Safety

- Treat editable right-side props as a hard deliverable. There are two separate failure modes: the Inspector can be empty, or saving defaults can fail. A segment is incomplete in either case.
- Read the installed `remotion` version. Automatic Inspector control inference from `defaultProps` is available only from `4.0.516`; projects on older versions require an explicit Zod schema attached to `<Composition schema={...}>`. For the deeply nested foreground-event data in this skill, prefer the explicit schema even on newer versions so the intended editable surface stays stable.
- Put the schema in a dedicated project file such as `src/schema.ts`, cover every editable global and nested field, and derive the video prop type from `z.infer<typeof videoSchema>`. At minimum expose source/render mode, caption and title layout, SFX enable/master gain, stack spacing, plus each event's text/items, timestamps, renderer component, variant, placement, palette/accent, style/highlights, and asset path/type/fit.
- Keep `schema={videoSchema}` in every generated Root template. Any script that rewrites `src/Root.tsx` must emit the schema import and Composition prop, otherwise the next semantic-plan regeneration silently empties the Inspector again.
- For the main project entry, the default `src/index.ts` may use `src/Root.tsx`. For any additional segment folder or alternate entrypoint, use Remotion's custom-root convention exactly: name the entry file `<segment-name>-entry.tsx`, and place the Composition in the adjacent PascalCase root file `<SegmentName>Root.tsx`. Example: `segment-one-entry.tsx` imports `./SegmentOneRoot`; the root file is `segment-one/src/SegmentOneRoot.tsx`.
- Do not use `index.ts`, `index.tsx`, or arbitrary entry filenames for extra segment folders if the user will edit props in Studio. Studio's save-default-props logic only infers adjacent custom roots from `*-entry` names; otherwise it may inspect the outer `src/Root.tsx` and fail to find the composition id.
- Keep the Composition `id` as a JSX string literal, for example `id="Segment0703Part01Composite"`. Do not compute it from constants, template strings, variables, or arrays.
- Keep `defaultProps` directly on the `<Composition>` as an inline static object literal. Do not use imported default props, local constants, functions, spreads, object merges, JSON reads, dynamic maps, or `calculateMetadata` output for the editable default data.
- Keep all values inside `defaultProps` statically extractable: strings, numbers, booleans, nulls, arrays, and object literals. Avoid unnecessary `as const` assertions inside the object. If TypeScript complains about union literals, fix the prop/schema typing or use a schema-compatible plain string rather than making the saved object non-obvious to Studio.
- If a segment has no relationship payload or real-object task, make the schema support optional/empty values instead of fabricating invalid computed default props.
- Validate the two contracts independently: use `computeCanUpdateDefaultProps` when available for saveability, then actually launch Studio, open the right sidebar, and confirm known global controls and at least one nested `events.*` field are rendered. `canUpdate: true` does not prove that the Inspector contains controls.
### Source Video Background Mode

- Source video background is optional and sits below all foreground layers. It is not a real-object task and should not affect Section title or the three semantic layers.
- For one-segment work, the composition represents only that segment: `durationMs = segmentEndMs - segmentStartMs`.
- Use the original video from the Remotion project as the background source. Do not cut it into per-segment files unless the user asks.
- Seek or offset the background video to `segmentStartMs` so composition time `0` shows the original video at the segment's start timestamp.
- Convert absolute subtitle and visual trigger timestamps into segment-local times before rendering foreground layers: `localMs = absoluteMs - segmentStartMs`.
- Keep two render modes when source video is present: `transparent` omits the background and preserves alpha; `composite` includes the source-video background for preview or direct export.
- For composite export, preserve the source video's audio unless the user asks for silent output.

### SFX Layer

- SFX is optional and should be added only when requested or already established by the project. It is a timing-feedback layer, not a music or rhythm layer.
- Trigger short SFX only on meaningful foreground entry moments: title change, memory-beat entry, relationship build, or real-object entry.
- Do not add SFX to every micro-animation, keyword highlight, hover-like flourish, or exit motion.
- Keep SFX subtle under speech but audibly present on an ordinary phone speaker. Store conservative per-cue values, commonly `0.08` to `0.12`, and expose a composition-level `sfxMasterGain`, commonly `1.4` to `2.2`, so the effective entry level can be calibrated without rewriting every cue. Clamp the effective value to `1`.
- Audition the composite at normal listening volume. A cue that disappears completely under speech is a failed mix just as a cue that masks consonants is; adjust `sfxMasterGain` first, then tune exceptional cues individually.
- If several visual entries happen within about `300-500ms`, merge them into one cue or keep only the strongest semantic cue. Avoid machine-gun clicking.
- Prevent long mechanical cues from colliding with the next semantic beat. Prefer semantic cue reduction first; when the full sound must resolve inside a shorter interval, allow a restrained per-cue `playbackRate` up to about `1.5` rather than hard-cutting its completion accent.
- Choose sound type by visual feel: bundled `soft-pop` for compact text/card/item entry, bundled `soft-whoosh` for larger material movement, bundled `mechanical-build` for structured diagrams visibly assembling/routing/splitting, and bundled `mechanical-lock` for installation, completion, confirmation, or a final locked state. Do not use a mechanical cue merely because the design looks technological; its visible motion must express a mechanism or state change.
- Use the real bundled assets documented in `references/sfx-library.md`. The installer copies them to `<project>/public/sfx`; do not depend on an earlier video's `sfx` folder and do not replace them with imaginary placeholder paths.
- In source-video composite export, preserve the source video's original audio and mix SFX quietly under it.
- Treat inserted-video original sound and added SFX as independent layers. Probe each supplied B-roll, H3, screen recording, or animation clip for audio. Preserve useful action, ambience, and generated animation sound by default; mute only conflicting speech, irrelevant/noisy sound, or sound the user explicitly rejects.
- If one media cue is rendered twice visually, such as a blurred full-canvas backing copy plus a sharp foreground copy, keep every visual copy muted and render exactly one separate audio track. Apply the same `sourceStartMs`, playback rate, and playable duration to that track; stop it before any silent end hold or frozen result frame. Never unmute multiple visual copies.
- Mix preserved animation sound audibly below the current narration. A cue-level `audioVolume` or equivalent may normalize unusually loud clips, but a low mix is not permission to erase the track. Optional mechanical/pop/whoosh SFX stays additive and must not replace the source clip audio.
- In transparent foreground export, include SFX only when the user wants an audio-bearing overlay; otherwise keep the transparent export visual-only.

### Title Layer

- `SectionTitle` has exactly two approved classic variants, separate from the 24 semantic slots. **New cuts default to `referenceV2` (V2 中英标题)**; `standard` (经典标题) remains explicitly selectable. Preserve a user's saved choice. Shared `SectionTitleContract.ts` owns variant IDs, default, and legacy-data normalization; the editor consumes it directly.
- For `referenceV2`, use a short uppercase English `payload.setup` above Chinese `payload.headline`, the actual section ordinal/total in `payload.sectionIndex` (for example `02 / 09`), and a fine divider. At 2560x1440: x=108, y=100, width=660; English 17px, Chinese 38px (V2 reference 34px enlarged by about 12%), a 36x4 lead bar, and 1px divider. Default accent is cyan #38F2E6; scale proportionally with resolution. Store optional Chinese sizing in `payload.chineseFontSize`, normally 38. Synthesize English from the same section meaning; do not omit it from newly directed titles.
- Variant selection is exclusively `variantId: "referenceV2" | "standard"`, not a second hidden style flag. Migrate old `payload.referenceHeader` into flat `setup`, `sectionIndex`, and `chineseFontSize` once. Changing variants preserves these fields, headline, timeline, and color; explicit `standard` must not switch back to V2 on reload.
- Keep the title small and unobtrusive so the recorded person remains visible.
- Prefer Chinese title plus a smaller English line.
- Use the automatically synthesized central-thesis title for the section. Do not directly promote a companion-script heading or spoken sentence into the title unless the user explicitly locks that wording.
- Treat the title as timestamp-driven foreground state, not one static label for the whole segment.
- If a semantic section contains one title, show it from `segmentStartMs` through `segmentEndMs`.
- If the section contains multiple distinct title ideas, create title entries with `showAtMs` aligned to the first spoken anchor of each title idea.
- Never keep displaying the first title after the spoken content has moved to a new main-title idea. Fade or replace the previous title at the next title entry's `showAtMs`.
- Keep the final main title visible until `segmentEndMs` unless the semantic plan explicitly gives an earlier exit.
- If the local data model only supports a single title field, extend it to support a title timeline, for example `titles: [{ text, english, showAtMs, hideAtMs, accentColor }]`, instead of collapsing multiple titles into the first one.
- The smaller English title line may use varied accent colors across segments. Choose from a diverse readable palette, but store the chosen color in segment data so that each segment keeps a fixed English-title color across previews, renders, and reruns.
- Do not randomize title colors at render time. Use deterministic selection based on segment id, semantic accent, or manual data choice.
- Do not show timecodes or editing metadata in the final overlay.
- Do not force the title into a card. Bare title text is usually better.
- Only for explicitly selected `standard`, retain the legacy upper-left treatment: x=108, y=82, an 82x6 accent bar, Chinese 46px/900 and optional smaller `setup` at 22px/700 below. This is a compatibility choice, not the new-cut default. Both variants default to the upper-left master alignment; user drag and uniform scaling override that default through versioned visible-content placement.

### Visual And Spatial Director

- Read `visual-space-director.md` before assigning visual modes or positions. Treat its renderer contract, occupancy map, candidate placement pass, cross-layer conflict resolver, and advisory audit as required parts of planning.
- After the Foreground Scene's zero-or-one information relationship is fixed, choose its component and named variant only from `semantic-component-library.md` and `assets/semantic-component-contract.json`; do not let relationship routing suppress the real-object or memory layer. Choose variants by semantic fit and measured space, not by random rotation. Improve the shared semantic pack when a required visual form is missing instead of cloning one-off components into the current video. The legacy 29+5 renderer pack has been archived and is not available.
- Preserve semantic freedom: the audit may warn about one-sided concentration or repeated forms, but it must not force a quota, alternate sides mechanically, or remove useful events merely to improve a statistic.
- Assign screen sides by information role after frame analysis. For a centered presenter with two usable lateral fields, prefer concrete screenshots/proof/material in one lane and short key words or cumulative teaching cues in the opposite lane. A common landscape solution is right-side material plus left-side key information. Structured diagrams remain free to use the lane that fits their geometry. Do not treat a dark monitor or an old component default as permission to place nearly everything on the right.
- Require every mode to map to a materially distinct component and motion grammar. If the current renderer cannot express the selected mode, extend it or record an explicit `rendererFallback`; never collapse multiple named modes into one generic text/card component without disclosure.

### Mechanism Concreteness Gate

- Apply this gate only when the Foreground Scene's selected information relationship requires the viewer to see how something works. Detect an explicit input/object plus one or more operational state changes such as analyze, plan, split, route, assign, filter, combine, or transform.
- Do not use a keyword, focus line, or short summary as the primary treatment for such a mechanism. Those forms name the idea but do not let the viewer see it happen.
- Choose the lightest deterministic structural renderer that preserves the relationship: `ProcessMiniature` for an object changing through a compact workflow, `StepRail` for a pure ordered sequence, and `RouteFlow` for transfer or branching. Extend a reusable named variant when the existing silhouettes cannot show the concrete action.
- Keep one visible carrier object through the whole explanation whenever possible. For example, a spoken “whole script is planned, split into semantic segments, then each segment is assigned a visual route” should visibly begin as one document, reorganize, split into segment cards, then branch those cards to the named destinations. Do not replace this with four unrelated labels.
- Reserve separate measured lanes for the carrier/input, operational verbs, and resulting objects. Stage labels such as “分析、规划、拆分” must sit in their own process lane or node rail; never lay them over the source document, screenshot, or output cards. Connector lines may cross the gaps between lanes but text and icons may not invade a neighboring carrier's bounds.
- Build branch diagrams from explicit geometry instead of an auto-flow layout. Equal-status branch cards use identical width and height, equal center-to-center spacing, and connector endpoints at each card's exact vertical center. For a three-way branch, align the source node with the middle branch and keep the top and bottom branches equidistant from that centerline. Place a result badge outside the branch geometry so it does not shift or distort the tree when it appears.
- Dark process and route nodes use transparent black-glass surfaces rather than opaque black cards: a low-alpha dark gradient, restrained backdrop blur, thin accent stroke, subtle inset highlight, and light shadow. The source frame must remain visible through the node while the text retains strong local contrast.
- Map every visible state to its spoken anchor: the planning state begins when “plan” is spoken, the split begins when “split” is spoken, duration labels appear when the duration is spoken, and branches appear only as their destinations are named. A result must not appear before the operation that produces it.
- Concise text remains useful as a stage label, result label, or reinforcing memory cue. It may retain normal readable emphasis beside the mechanism; remove it only when it becomes an accidental same-treatment duplicate or creates a physical readability collision.

### Memory Layer Rendering

- This layer renders the timestamped `memoryBeats` already selected by `remotion-semantic-director.md`; it does not invent a second semantic analysis from unrelated script notes or generated summary bullets.
- A beat uses one approved memory type: keyword/number, claim/insight, question, risk/warning, definition, status/result, verdict, or quotation.
- Treat short high-impact terms (typically 2-4 characters, or a single number/term/acronym) as independent keyword events, not only as in-sentence highlights. A keyword event gets its own showAtMs aligned to the subtitle timestamp where the term is spoken, its own entry/exit animation, and a display size noticeably larger than typical in-sentence highlights so it can stand alone on screen.
- A long A-roll stretch is a review signal, not an automatic requirement to manufacture a keyword. Surface a memory beat only when the spoken content contains something that genuinely benefits from retention or emphasis.
- Independent keyword events count toward the same rolling three-line cap as key sentences and are stacked in the same queue.
- Use lightweight duplication handling:
  - Prevent only accidental double-rendering inside one memory treatment, such as the renderer drawing the same keyword twice in the same row.
  - Do not compare every word across real-object, relationship, and memory layers. A keyword or short phrase may reinforce related material in another layer when it remains supporting and enters at its own Spoken Beat.
  - Remove or restyle an item only when two visible elements contradict each other, occupy the same space, or demand equal primary attention at the same moment without a deliberate handoff.
- Density rules:
  - Review long empty stretches, but preserve the speaker when none of the three semantic layers adds value.
  - Numbers, percentages, prices, sizes, units, and repeated short terms are candidates rather than compulsory events.
  - Actively use grounded explanations, concrete details, reasons, and continuity cues that give the scene worthwhile reading, even when the core structure already works. Reject filler, not useful context merely because it is dispensable. The rolling three-line cap governs the memory-text queue, not the item count of the whole three-layer scene; it is never a density target.
- Do not convert every subtitle line into foreground text. Choose only moments that help pacing, attention, or comprehension.
- Every selected middle item must trace back to spoken subtitle text and align to the subtitle timestamp where that information is said.
- Do not add an unrelated permanent explanation strip or a fourth semantic layer. Scene-bound context selected under `remotion-semantic-director.md` section 3.4 belongs in the existing layers at readable foreground scale. A compact card may retain one small exterior auxiliary line; that local card rule is not a scene-wide explanation limit.
- Maximum visible middle-layer content is three lines. This is a rolling accumulation cap, not a one-line replacement rule: the first key sentence should remain visible when the second and third key sentences appear, unless an explicit `hideAtMs`, a semantic replacement, or a real layout collision says otherwise.
- Collision safety does not mean serializing every foreground event. Real-object, relationship, and memory treatments may coexist at their intended visual strength when measured bounds and reading order stay clear. Do not automatically dim or shrink one valid layer to make another dominant.
- If a fourth key sentence enters, fade or remove the oldest visible line/group so the newest line can appear while the screen still carries up to three current lines.
- Do not assign short default lifetimes that make each key sentence disappear before the next related sentence appears. For one segment's related sentence sequence, default to cumulative visibility until the three-line cap is reached.
- Lay out visible key sentences as one stacked queue. Each row/card must reserve its real rendered height plus a consistent vertical gap before the next row; never place cards by fixed y-values that assume every row has the same height.
- Expose the key-sentence stack's vertical row gap as a layout prop, for example `layout.keyStackGap` or `layout.keySentenceGap`, so Remotion Studio can adjust middle-layer line/card spacing without code edits. Do not hardcode the stack gap only in the renderer.
- When the oldest line exits, compact the queue: remaining rows move up, and the incoming row enters below the current last row. Do not leave holes, and do not let entering cards overlap existing cards.
- If the scene has no relationship graphic, the memory layer may carry more visual weight. Use stronger hierarchy only when the selected memory beat warrants it.
- Choose presentation per sentence:
  - Important line: slightly larger.
  - Normal line: standard size.
  - Status/result line: when an initial state leads to a later result, keep the initial compact card visible and reveal the result as a second equal card beside it at the exact result Spoken Beat. The newer result may take stronger emphasis, but it must not replace the earlier state. A single-state result may still use a slim status row, check mark, status color, or completion symbol.
  - Long/multiline information: use a readable bare line or an approved semantically suitable treatment. Reserve small exterior auxiliary copy for genuinely auxiliary metadata, not every contextual explanation.
  - Short information: should be bare text by default, with accent color only on semantic keywords, numbers, symbols, or short emphasis spans.
- Cards are compact semantic anchors, not containers for medium/long sentences. The visible card owns only one label and one 2-5-unit primary phrase.
- Count one Chinese character as one visual unit and one contiguous Latin product name, acronym, or grounded number as one visual unit. Prefer 2-4 units; five is the hard default maximum.
- Put at most one useful auxiliary phrase or sentence outside each compact card in small type. It must not affect card width or height. Substantive scene context gets its own suitable treatment instead of being squeezed into that auxiliary line.
- If the primary cannot be compressed faithfully, use bare text, quotation, definition, or the appropriate relationship renderer instead of shrinking or wrapping the sentence inside a card.
- Key-sentence cards must not be solid filled blocks. Use a lightweight dark-glass treatment when a black/dark support surface is needed: low-opacity black or dark-slate background, preferably a subtle translucent gradient, `backdrop-filter` blur/saturate where supported, thin light stroke, tight padding, subtle inset highlight, and soft shadow/glow only when needed. Avoid opaque black rectangles or high-alpha dark fills that noticeably dim or flatten the source video behind the text.
- Key-sentence cards must be content-sized. Do not use fixed height, fixed `min-height`, shared preset height, or oversized vertical padding that creates blank space below the text.
- Card height comes from one label, one single-line primary phrase, and tight top/bottom padding. Auxiliary copy never makes the card taller.
- Avoid sweep/shine effects unless the user asks; keep motion direct and readable.
- Only use a leading icon when it is a real semantic icon or clean line symbol that clarifies the sentence. Do not fake icons with colored text badges, subtitle blocks, filled labels, or arbitrary numbers.
- If no suitable semantic icon exists, omit the icon and rely on text hierarchy plus keyword highlights.
- For bare text key lines with no card/container, keep the sentence primarily white or near-white. Use accent color only on semantic keywords, numbers, symbols, or short emphasis spans.
- Before rendering individual lines, choose a middle-layer presentation mode. Do not default to one large container that waits for up to three small cards.

#### Middle-Layer Presentation Modes

Choose one or mix lightly based on the segment's narrative role:

- **`bareStack`**: Short direct statements. Use bare text and keyword highlights. Add a real semantic line icon only when it makes the sentence clearer; do not use colored text badges as decorative icons.
- **`focusLine`**: One sentence is the core idea. Use one larger line or phrase, with optional small meta text. Do not wrap it in a heavy card by default.
- **`lightCardStack`**: Use individual lightweight cards as compact semantic anchors. Each card contains a label plus a 2-5-unit primary phrase; optional small auxiliary copy sits outside its surface.
- **`statusLine`**: Result, completion, confirmation, delivery, or pass/fail. Use a slim status row, check mark, or compact status card.
- **`splitEmphasis`**: Concept, requirement, or key object. Use small meta text plus a larger main phrase, often without a card.
- **keywordPop** (primary form for short high-impact terms): Independent keyword event for 2-4 character terms, single numbers, acronyms, or short tags that anchor a point. Renders as one large bare-text line with a strong accent color, no card, no fake icon. Counts toward the rolling three-line cap like any other key sentence. Default size noticeably larger than in-sentence highlights, e.g. ontSize 72-96, ontWeight 800, tight lineHeight 1.0-1.05, optional small semantic icon only when the term is generic. The keyword is the entire line; do not add a secondary sentence.
- **loatingKeywords**: Atmosphere words or short category tags that are not the segment's main point. Use only as supporting flavor, not as the primary way to surface foreground-worthy terms.
- **`groupedFeature`**: A true large grouped card for one to three tightly related memory beats. Use only when the group itself is the main visual and there is no stronger relationship graphic or real-object task competing for attention.
- **`problemSignal`**: Pain point, risk, warning, blocker, or negative condition. Use restrained alert styling, a sharp line, or compact warning marker.
- **`contrastSwitch`**: Turn, reversal, before/after, "but actually" moments. Use replacement, crossing, split contrast, or two-state transition.
- **`termDefinition`**: A named concept plus short explanation. Use term/title hierarchy, not a generic stacked card.
- **`quoteLine`**: Customer wording, demand phrase, direct message, or original quote. Use a quote bar or speech-like line; do not confuse it with external chat material unless the corrected spoken semantics call for a chat/message visual reference.
- **`verdictStamp`**: Judgment, conclusion, certification, final decision, or strong signal. Use a stamp/check/signal treatment sparingly.

#### Middle-Layer Fallback

- If the semantic role is unclear, use `bareStack` or `focusLine`, not `groupedFeature`.
- Select for explanatory and reading value as well as emphasis. Skip a subtitle moment when it adds neither, rather than forcing a card or line.
- If there are one to three key statements, do not automatically group them. Group only when they form one coherent feature/result block.
- If a real-object task is the main visual, keep memory-layer presentation lighter: `bareStack`, `focusLine`, `splitEmphasis`, or `statusLine`.
- When the relationship graphic carries the main proof, memory text can provide a grounded setup, detail, explanation, quotation, or conclusion. Preserve a clear reading order without restricting it to setup/conclusion alone.
- Do not let the renderer's existing column layout force every segment into the same "large parent card + three child cards" structure. If the current code cannot express the chosen mode, extend the data and renderer instead of downgrading the design to the old template.

#### Presentation Palette

Choose a middle key sentence style by semantics, length, and importance. Do not apply one style to every line in a segment.

- **Bare key line**: Use for short, direct statements. No card. The main sentence should be white or near-white, with only selected keywords, numbers, symbols, or emphasis spans colored. A small semantic line icon may sit beside the line, but a colored dot/text badge is not a substitute for an icon.
- **Bilingual emphasis**: Use for core concepts. Small English/Chinese meta text above or near the main Chinese phrase; main phrase is larger.
- **Light background card**: Use when a short semantic anchor needs separation from a busy talking-head background. Keep only the label and 2-5-unit primary phrase inside the translucent surface. Put optional small auxiliary wording outside. Avoid solid fill, fixed height, fixed `min-height`, multiline primary copy, and large bottom whitespace.
- **Compact status card**: Use for results, completion, confirmation, or delivery. It may use `✓`, green/status color, or a slim status strip.
- **Icon-led line**: Use when a real semantic icon or clean symbol can replace words: check mark for completion, arrow for transition, warning mark for risk, code/tool icon for technical action, chart/coin icon for metrics. Do not use `#01`, `AI`, `2W`, `CASE`, or other text labels as fake icons; treat them as optional small metadata only when they carry real meaning.
- **Priority line**: Use when one sentence is clearly the segment's most important information. Make it slightly larger than other middle-layer lines, but do not compete with the external material frame or block the person.
- **Grouped feature card**: Use selectively when no relationship graphic is needed and the first one to three memory beats form one coherent idea. Put those statements inside one larger card with a layout that is visually distinct from single-line cards: richer spacing, stronger title/value hierarchy, subtle internal dividers or columns, and a different accent treatment. Do not use it automatically; skip it when the segment is better served by bare text, individual cards, or a real-object presentation.

Suggested semantic variants:

- `case`: project/case opening; often bare or lightly carded. Use a case/project semantic icon only if it clarifies the line; do not use `CASE` or `#01` as decorative icon substitutes.
- `requirement`: core requirement/target; often bilingual emphasis or light card.
- `result`: completion/result; often status card or symbol-led line.
- `insight`: market judgment or realization; can use a slightly stronger card or emphasis line.
- `audience`: who should care; usually compact and readable, not oversized.
- `method`: action/process; can use ordered or step-like styling.
- `warning`: risk/pain point; can use alert color, but stay restrained.

For future data models, prefer fields like `variant`, `priority`, `container`, `style`, `icon`, `metaLabel`, and `highlights` instead of hardcoding one visual style for every key sentence. Use `style` for per-line typography and color controls. Use `icon` only for semantic icons or clean symbols; use `metaLabel` for text labels such as `CASE`, `AI`, or `#01` so they are not rendered as fake icons. For bare text, `highlights` should identify the exact keyword spans to color, resize, or embolden instead of styling the whole sentence.

### Scenes Without A Relationship Graphic

- Do not add filler merely because the scene has no relationship graphic. Rebalance only around valid memory and real-object layers.
- If there are one to three key statements and they belong together semantically, a grouped feature card is allowed. It should feel like a different component from the existing one-line cards, not merely a wider version of them.
- If there are more than three key statements, never show them all at once. Group only the first coherent set of up to three lines if appropriate, then transition to later statements using semantic styles such as bare key lines, bilingual emphasis, compact status cards, symbol-led lines, or individual lightweight cards.
- Keep substantive context at normal readable foreground size; it is not automatically small helper text. Reserve larger hero emphasis for the actual focal statement and small type for auxiliary metadata.
- Keep the decision semantic: concept summary, audience, problem, method, result, and warning lines can each use different treatments within the same segment.

### Relationship Item Rendering

- This is not a separate semantic layer. Use it only to render the items and Spoken Beats of the scene's one selected information relationship.
- Condense explicit collection, comparison, transformation, sequence, chronology, cause/effect, hierarchy, flow, problem/solution, condition, feedback, or matrix items into short faithful labels. Do not infer a second relationship from item count or layout.
- Prevent accidental repeated items inside the relationship itself. A term may also appear in a memory cue when the two treatments have useful distinct reading roles; lexical overlap alone is not a reason to delete it.
- Enumeration items are short and punchy. Treat each item as a self-contained 2-5-unit term or phrase (numbers, named items, key entities). One contiguous Latin product name, acronym, or grounded number counts as one visual unit. If a spoken phrase is long or rambling, extract the load-bearing noun/term/figure and rewrite the item as a short entry, not a verbatim sentence.
- Relationship-item typography is large enough to be readable at a glance. Per-item font size should sit in the 44-72 range depending on count, weight 700-800, and the value/title uses the largest size. The relationship payload should not look like a quiet footnote.
- Data enumerations do not need icons. Render the value as the visual anchor: large, clear, and colorful.
- Non-data enumerations, when explicitly present, render as icon plus adjacent text together; never show a lonely icon.
- Keep meaningful vertical separation from the middle key sentence layer. The two layers should not feel like one text block.
- Choose the visual mode from the already selected relationship, item count, and whether the relationship is the main visible payload. Item count must not override the relationship decision.
- Each enumeration item carries a leading semantic icon chosen by the item's content, not by ordinal position. The icon library must be real semantic line icons (Lucide-style) mapped from item keywords: numbers, money, time, speed, growth, check, cross, warning, star, user, chat, doc, code, gear, bolt, fire, target, heart, lightbulb, rocket, shield, etc. Pick the closest semantic match per item; if no clean match exists, use a generic term-specific icon (e.g. a tag icon for category names) or omit the icon and let typography carry the item. Never use a colored number badge, ordinal, or text label as an icon substitute.
- Prefer the least heavy mode that still fits the meaning. Do not over-cardize short enumerations.
- When enumeration tags, chips, or compact evidence items need dark backgrounds, use the same dark-glass treatment as key-sentence cards. Do not render dark pills or chips as solid black/gray blocks; preserve source-video visibility with translucent fill, blur/saturate, thin stroke, and light inset/shadow.

#### Relationship Shape Selection

Use the following guidance only after the one relationship has been selected:

1. **Data type**: numbers, ratios, amounts, durations, growth, percentages.
   - Good modes: large value block, comparison block, metric strip.
   - Best when the number itself carries the meaning.
2. **Comparison type**: A/B, before/after, pros/cons, better/worse, change.
   - Good modes: left-right compare, split columns, delta block.
3. **Step type**: step 1/2/3, process, stage, sequence.
   - Good modes: step rail, timeline, ordered nodes.
4. **Tag type**: people, groups, attributes, keywords, categories.
   - Good modes: tag group, badge cluster, chip row.
5. **Result type**: completion, confirmation, outcome, delivery, verdict.
   - Good modes: status row, result card, compact checked item.
6. **Evidence type**: supporting facts, checks, references, notes.
   - Good modes: light evidence panel, compact list, footnote-style block.
7. **Ranking type**: first/second/third, priority, order, top items.
   - Good modes: numbered list, ranking column, priority stack.

#### Enumeration Count Selection

- **1 item**: strengthen it directly; do not inflate it into a heavy card.
- **2 items**: prefer comparison or side-by-side treatment.
- **3 items**: prefer three-column or three-node treatment.
- **4 or more items**: prefer grid, list, or light table; avoid making every item a heavy card.

#### Enumeration Priority Selection

- Main enumeration: slightly larger, clearer, and more separated.
- Supporting enumeration: lighter and more compact.
- Key sentences and enumerations may both retain readable visual weight when they express useful information.
- Related wording may reinforce across the two treatments without forcing either one into helper typography.
- Enumeration and external material may share a reading moment. Coordinate their separate entrances and placement at matching Spoken Beats without a primary/supporting handoff.

Generic example:

- If a key sentence already says the product or task, do not repeat that same product or task as an enumeration card.
- If the corrected spoken section explicitly lists execution factors such as `team size`, `cost`, and `delivery time`, render only those factors as the selected collection relationship's items.

### Real-Object Layer Rendering

- Render only real-object tasks selected by `remotion-semantic-director.md`. Every task has one purpose: show, focus, demonstrate, or verify. Website/app/tool, document, chat/message, metric/report, person/brand/account, code/config, map/location, and screen recording remain material tags rather than semantic scene names.
- Create a material cue only when the grounded spoken content and discovered/provided asset support it.
- Align each real-object task's `showAtMs` to the subtitle timestamp where the referenced material is spoken. If no strong spoken cue exists, do not force a real-object task.
- Real-object rendering is a presentation system, not one fixed right-side frame. Choose `objectPurpose`, `viewingTask`, `presentationScale`, `materialKind`, `presentationMode`, `placement`, `motion`, `assetType`, `src`, `fit`, `glowColor`, and replacement metadata in scene data instead of hardcoding one renderer path.
- The renderer root may span the composition as a transparent coordinate host. Ordinary screenshots, callouts, proof decks, local scrims, and support surfaces stay inside the selected measured local/large foreground zone. Only `MediaFrame/recordedDemo` may visibly occupy the complete canvas as `detailTakeover`; it must not inherit an unrelated RemotionUI page background.
- `focus` dims only the local screenshot panel; it never knocks back the complete talking-head frame. `verify` may use a local proof deck for overview, but any exact proof item that the viewer must inspect must expand or hand off to `MediaFrame/show` at `large` scale with semantic crop, zoom, focus, or callout. Never create an unreadable miniature gallery or a full-screen proof/gallery page.
- Always avoid collision with the Section title, memory beats, and relationship graphic. Placement has one purpose: preserve the reading order of all active semantic layers.
- Use a right-side safe zone when key sentences or enumeration cards occupy the left/middle area. When those text layers are sparse or absent, the material may become the main visual in a safe center-left or lower-middle area, using gentler fade/scale motion instead of a mandatory right-side slide.
- Keep a clear margin between external material and text layers. If the material must be large, reduce or fade text first; do not overlap important text.
- External material may visibly contain labels that also appear in an enumeration; do not spend a separate analysis pass removing them. Keep the material and enumeration at different visual weights, and intervene only when repeated labels create obvious clutter or compete as equal focal points.
- For generated external-material panels that use dark surfaces, such as `identityCard`, `processMiniature`, `dataPanel`, `messageBurst`, dark app/code shells, right-side info cards, and their internal nodes/chips, avoid solid black frames. Use a consistent transparent black-glass surface: translucent dark gradient or low-alpha fill, `backdrop-filter` blur/saturate where supported, thin light stroke, subtle inset highlight, and restrained shadow. Apply the treatment to nested dark nodes as well so a panel does not mix glass parent surfaces with solid black child blocks.
- Keep semantic light surfaces light: browser windows, document pages, paper/report cards, and real asset frames may remain white or light if that better communicates the material. Do not force glass-black onto light semantic surfaces just for consistency.

#### Viewing Task And Material Scale Gate

- External material is information, not decoration. Decide what the viewer must do with it before choosing placement:
  - `recognize`: identify the object, brand, page, or clip without reading fine detail;
  - `read`: read UI text, metrics, clauses, code, labels, comments, or document content;
  - `follow`: track a sequence of clicks, selections, typing, dragging, configuration, or product use;
  - `verify`: inspect the exact evidence, value, state, or result supporting the narration.
- Use `local` only for `recognize` when the important subject remains obvious at phone size. Use `large` for screenshots, webpages, documents, dashboards, evidence, code, still images, ordinary B-roll, and other real items whose content must be read or verified. On landscape canvases, a detail-bearing `large` surface normally needs roughly `55-84%` of canvas width; on portrait canvases it normally needs roughly `84-94%`. These are review bands, not substitutes for inspection.
- Use `detailTakeover` only for a prerecorded product/process operation demonstration with continuous narrated interactions, routed as `MediaFrame/recordedDemo`. It always uses full-screen takeover. A clip used only for recognition or atmosphere is `MediaFrame/show`, not a local exception to `recordedDemo`.
- A recorded-demo takeover may intentionally hide or de-emphasize the presenter. Preserve Section title and captions above it when readable, and allow at most two lightweight timed callouts that point to different interaction details. Yield other primary diagrams or memory cards during the takeover.
- Preserve the source aspect. Use `contain` for interfaces and recordings unless an inspected crop is proven safe. When aspect ratios differ, maximize the sharp source inside the full canvas and use a neutral or softly blurred backing; never stretch the interface or crop away controls. If a backing copy of a video is used, keep it muted and render source audio exactly once.
- For screenshots, dashboards, documents, code, and evidence, prefer a semantic crop or timed zoom over shrinking the complete source. The viewer must see the region being discussed, not merely recognize a tiny whole-page silhouette.
- Validate at a realistic phone preview width around `390px`. If non-demo material remains unreadable, enlarge the measured `large` zone or use semantic crop, zoom, focus, or callout; never promote it to `detailTakeover`. High encoded resolution does not rescue a small on-screen presentation.

#### Asset Slots And Replaceability

- Support both image and video assets. Images should render with Remotion `Img`; videos should render with `OffthreadVideo` or `Video` depending on project needs.
- If the real image/video asset is already provided, wire it through data with an explicit `src`.
- If the segment needs a real image/video but the user has not provided it yet, create a replaceable placeholder path and visible placeholder state. Use predictable paths such as:
  - `assets/replace/segment-01-contract-cover.png`
  - `assets/replace/segment-03-chat-screenshot.png`
  - `assets/replace/segment-05-demo-video.mp4`
- Include enough metadata for replacement: `assetType`, `src`, `replaceable: true`, `placeholderLabel`, `expectedContent`, and `fit`.
- Do not bake a generated placeholder into the final data as if it were the real asset. The placeholder should make the missing asset obvious in preview and easy to replace later.
- If the material is not a real external asset but a generated visual explanation, use `assetType: "generated"` and store the content as structured data rather than a fake file path.

#### Semantic Presentation Modes

Choose the mode from the material label and surrounding segment meaning:

- **`flushAsset`**: Real screenshot, photo, or video. The asset fills the frame directly with thin border, rounded clipping, and outer glow/shadow. Do not add title bars or inner padding unless the source itself needs simulated context.
- **`documentPage`**: Agreement, contract, policy, report, invoice, certificate, proposal, or cover page. Use a document/page shape, paper shadow, optional folded corner, page stack, stamp, signature line, or highlighted clause. Motion should feel like a page appearing, being filed, or being spotlighted.
- **`browserWindow`**: Website, landing page, online article, dashboard in browser, search result, or web app. Use browser chrome only when it helps the viewer read the asset as web content.
- **`appWindow`**: Software UI, mobile app, admin panel, product screen, plugin UI, or tool interface. Use a device/window frame that matches the product context.
- **`messageBurst`**: DM, private message, chat screenshot, comments, user feedback, notifications, or inbound leads. Use multiple message bubbles/cards with varied widths, slight offsets, small rotations, staggered timing, and size variation to create a busy "many messages" feeling. Keep text short and anonymized unless the user provides exact copy.
- **`dataPanel`**: Metrics, market data, table, comparison, KPI, budget, timeline number, or report finding. Use metric cards, compact tables, mini charts, bars, deltas, or highlighted values. Let numbers anchor the design.
- **`identityCard`**: Person, brand, company, organization, logo, account, profile, or credential. Use logo/avatar plus concise label and role/context. Avoid oversized decorative brand cards.
- **`codePanel`**: Code snippet, terminal output, config, command, API, or script. Use a compact code/terminal panel with syntax-like hierarchy, not a generic screenshot box.
- **`mapOrRoute`**: Location, address, region, route, logistics, store, or coverage area. Use a small map panel, route line, pins, or region highlight.
- **`processMiniature`**: Workflow, steps, pipeline, approval process, or transformation. Use small connected nodes, timeline fragments, or stacked step cards.

These modes are starting points. Combine or simplify them when the segment needs it, but keep the visual metaphor tied to the material's meaning.

#### Fallback Selection

Use this order when corrected spoken content implies external material but the best mode is not obvious:

1. Identify the spoken reference, timestamp, and likely material type from the current section's corrected word-timed lines. Do not include external material from weak or ambiguous evidence.
2. Inspect the implied or provided material itself first:
   - real screenshot / photo / video -> `flushAsset`
   - page / cover / clause / report / document-like surface -> `documentPage`
   - website / browser / page UI -> `browserWindow`
   - app / tool / admin / mobile UI -> `appWindow`
3. If the material itself is still ambiguous, inspect the semantic role in the segment:
   - private message / comment / notification / inbound lead -> `messageBurst`
   - metric / report / comparison / KPI / budget -> `dataPanel`
   - person / brand / company / logo / account -> `identityCard`
   - code / terminal / config / API / script -> `codePanel`
   - location / route / area -> `mapOrRoute`
   - process / workflow / approval / steps -> `processMiniature`
4. If it is still unclear, choose the most conservative option that minimizes semantic loss:
   - prefer `flushAsset` with a replaceable placeholder if a real image/video is expected;
   - otherwise prefer `documentPage` for page-like references;
   - avoid forcing a dramatic or highly specific mode when the evidence is weak.
5. If the segment's wording suggests a stronger emotional or volume cue, only then raise intensity with a mode variant such as `messageBurst` or `dataPanel`. Do not let fallback override the need to stay readable and non-duplicative.

Fallback is a readability rule, not a creative excuse. When uncertain, be boring before being wrong.

#### Motion Rules

- Pick motion by semantic feel:
  - `flushAsset`: quick fade/scale or short slide, then one subtle emphasis push.
  - `documentPage`: page rise, stamp pop, clause highlight, or soft spotlight.
  - `browserWindow` / `appWindow`: window expand, tab reveal, cursor/selection highlight, or panel slide.
  - `messageBurst`: staggered bubbles popping in from nearby offsets; not one monolithic panel.
  - `dataPanel`: count-up, bar growth, row highlight, or metric card snap.
  - `identityCard`: clean fade/scale with logo lockup, no excessive motion.
  - `codePanel`: line reveal or cursor-style highlight.
- Default duration is about 6-7 seconds, adjusted to the spoken timing.
- Do not leave external material on screen for an entire long segment unless explicitly requested.
- Leave no placeholder frame after exit.
- Do not randomize colors, offsets, or glow at render time. Deterministically choose them from segment id/semantic kind or store them in data.
- Do not reuse the same glow color as the middle key sentence cards, grouped feature cards, or enumeration cards. External material glow is a separate visual role and should stay visually distinct while still fitting the segment palette.

#### Data Model Guidance

Prefer fields like:

```ts
{
  kind: "externalMaterial",
  materialKind: "chat" | "document" | "web" | "app" | "data" | "identity" | "code" | "map" | "process" | "asset",
  presentationMode: "messageBurst" | "documentPage" | "browserWindow" | "appWindow" | "dataPanel" | "identityCard" | "codePanel" | "mapOrRoute" | "processMiniature" | "flushAsset",
  viewingTask: "recognize" | "read" | "follow" | "verify",
  presentationScale: "local" | "large" | "detailTakeover",
  readabilityReason: "Viewer must follow the actual installation controls",
  placement: "rightSafe" | "mainSafe",
  motion: "staggerPop" | "fadeScale" | "pageReveal" | "windowExpand" | "dataBuild" | "lineReveal",
  assetType: "image" | "video" | "generated",
  src: "assets/replace/segment-01-chat-screenshot.png",
  replaceable: true,
  placeholderLabel: "私信聊天截图",
  expectedContent: "多个用户私信/咨询截图，后期替换真实图片",
  fit: "cover" | "contain",
  glowColor: "#4CC9F0",
  glowRole: "externalMaterial",
  showAtMs: 1200,
  hideAtMs: 7600
}
```

Use the fields that fit the local codebase; keep the semantic decision in data so later segments can reuse the renderer.

## Internal Entrance Layering — Reviewed Classic Treatments

- For `ConceptComparisonCards`, `ResultLock`, `DefinitionReveal`, and `QuoteFrame`, keep the approved final geometry, typography, colors, payload order, and Spoken-Beat anchors. Animate within each item with perceptible phases: the surface finishes its entrance by 0.32 seconds, the label begins at 0.42 seconds, primary copy at 0.72 seconds, and optional exterior auxiliary copy at 1.12 seconds. A label/card with no following primary may use the 0.42-second copy phase. Parent clip/opacity animation must not conceal these independent stages. These offsets are local entrance details, never permission to show the next spoken item early.
- Longer copy reveals in reading-order phrase-sized runs with smooth opacity ramps lasting about 0.35 seconds and about 0.22 seconds between runs; short labels fade as one unit. Preserve every character, highlight, line break, and natural line wrapping in normal inline flow. Do not animate by slicing the string, change card measurements, or wipe all lines simultaneously with one horizontal mask.
- Reserve a readable hold before an explicit exit; bound the reveal to the available interval. Do not extend the semantic event merely to finish a decorative entrance.
- This change explicitly excludes `FormFillSequence`: the user approved the existing step-card motion. Do not roll the helper out to other families without review.

## Timing Rules

- Section boundaries come from the automatically generated semantic timeline. In one-section compositions, use `segmentStartMs` and `segmentEndMs` to define composition duration and source-video offset.
- Parallel or enumerated information must reveal at the spoken anchor for each individual item. Store an item-level `showAtMs` for every named item (for example, item one when item one is spoken, item two when item two is spoken); do not display the whole list at the parent event's entry. A short mechanical stagger is only a fallback when the narration introduces the items genuinely together or no finer timestamp can be recovered.
- When a supplied B-roll, H3, screen recording, or other source clip is longer than its assigned on-screen interval, do not default to playing from source time zero. Inspect the source clip and identify the state that completes the spoken idea. Choose `sourceStartMs`, a restrained playback-rate change, and when useful a short end hold so that the required result state appears before the cue exits and remains readable. Trim low-information setup first; preserve causal action when the narration depends on it. For very short montage windows, a reliable order is tail-select the meaningful action, play through the result, then freeze the last stable result frame for roughly `200-350ms`. Record the chosen source range and result-state reason in the cue data.
- When that trimmed media cue has useful original audio, trim and retime its one audio track with the same source range. Do not let audio continue through a frozen end hold, restart from source time zero, or drift away from the visible action.
- Treat all non-background foreground events as one global timing ledger. Different placement names, renderer roles, or z-index values do not make simultaneous events safe.
- Default to zero unapproved physical collisions, not zero concurrency. Related middle lines may overlap in time when they share the same measured queue. A cross-placement or cross-layer composition gives every peer the same `compositionGroup`, uses explicit `allowConcurrent`, lists cross-placement peers reciprocally in `collisionCheckedWith`, and passes stable-frame rectangle/readability verification. Do not require `compositionRole` or a fixed maximum number of concurrent events.
- When one foreground statement replaces another, enforce `outgoing.hideAtMs <= incoming.showAtMs`. Let the title and caption persist as reserved layers, but do not let an obsolete middle statement linger into the next spoken clause.
- In transparent export, foreground layer timing may be stored as absolute timestamps or precomputed local timestamps, but the renderer must display them at segment-local time.
- In source-video composite export, the background frame at local time `t` must match original video time `segmentStartMs + t`.
- SFX cue timing follows the visual entry timing. In one-segment compositions, convert absolute cue times with `localMs = absoluteMs - segmentStartMs`.
- For every trimmed source-video cue, verify the rendered entry, action, and final stable frame rather than checking only the cue's first frame. Reject a cue when its semantic result is still outside the rendered interval or visible only during the final fade.
- When foreground information sits over a screen recording, webpage, slide, or other real material, place the contrast scrim above that material and below all foreground text/cards. Choose the scrim direction from the foreground placement, then inspect the final composite frame; a scrim hidden beneath the material does not count, and transparent-overlay-only inspection cannot prove readability.
- Align `showAtMs` to the subtitle timestamp where the concept is spoken.
- Title entries also need `showAtMs`; use the next title's `showAtMs` as the previous title's implicit end. If there is no next title, the title stays visible through `segmentEndMs`.
- Use `hideAtMs` for external material and any key sentence group that would exceed the three-line cap.
- For key sentence lines, if explicit `hideAtMs` is missing, keep each related line visible until the rolling three-line cap forces it out, then enforce the cap in the renderer or data preparation.

## Validation Checklist

- Remotion composition and rendered output width/height match the primary input video's exact encoded resolution unless the user explicitly requested another delivery format.
- Every H3 source clip is 16:9, uses the workflow-native encoded resolution, fills the final canvas by centered cover without stretching, and retains its essential action after crop.
- Required foreground titles, key information, structured graphics, and captions remain visible above H3 with clear attention hierarchy and no physical collision.
- The global occupancy audit reports no unapproved physical collision. Any approved composition records one shared group id, reciprocal peer ids, and inspected stable frames proving that visible rectangles remain non-intersecting and readable; it does not enforce a primary/supporting hierarchy.
- Long semantic sections do not default to isolated one-at-a-time foreground callouts. Related rows accumulate or form a deliberate primary-plus-support composition when useful; density remains semantic and never becomes a decorative quota.
- Transparent export remains transparent and does not include the source video.
- Composite export includes the correct source-video range for the segment.
- At local time `t`, the composite background matches original video time `segmentStartMs + t`.
- SFX cues line up with the exact foreground entry frames they support.
- SFX remains clearly audible while speech stays dominant, and dense cue clusters are merged or reduced. The composition exposes one master SFX gain so global loudness can be corrected without editing each cue.
- Every inserted video has been audio-probed. Useful animation audio is present exactly once, follows the visual trim, ends before a frozen hold, remains audible under narration, and is not replaced by added SFX. Clips muted for conflicting speech or noise record that decision in cue data.
- Transparent visual-only exports do not accidentally include SFX; audio-bearing exports include SFX only when intended.
- Main title accurately summarizes the corrected section's central thesis, is not merely copied from a script or spoken sentence, and introduces no unspoken claim.
- A single main title remains visible through the whole segment.
- Main title changes at the correct timestamps when a segment contains more than one title idea.
- The final main title remains visible until the segment ends.
- If a user-provided reference palette is active, non-title colored text uses only colors sampled from that palette, while explicitly protected title colors remain unchanged.
- Middle key sentence content is derived from corrected spoken lines inside the section, not copied from unrelated script notes or generated summaries.
- Each middle key sentence, keyword, number, tag, or icon trigger has a clear spoken source and matching subtitle timestamp.
- Middle key sentence layer never exceeds three visible lines.
- Hero keywords and lower-tier primary information are reviewed separately at phone-viewing size. Primary statements, steps, tags, states, and values do not fall into helper-text sizing; auxiliary meta/English/ordinal/definition text remains subordinate.
- No primary foreground string clips, exceeds its safe zone, ends with a lone one-character wrap, or creates an isolated one-character second line.
- Long foreground-free stretches are reviewed for missed semantic value, but they remain valid when the real-object, information-relationship, and memory layers all have no grounded payload. No filler keyword is inserted merely to satisfy a duration quota.
- No renderer accidentally draws the same memory item twice inside one treatment. Cross-layer reinforcement is allowed; review only contradiction, physical overlap, or simultaneous equal-primary competition.
- Related middle key sentences accumulate up to three visible lines before the oldest line exits; they do not replace each other one by one.
- Middle key sentence rows/cards never overlap; stacked rows use actual row height plus a stable gap, and the queue compacts when older lines exit.
- Middle key sentence stack spacing is editable from Studio layout props; changing the layout gap updates the vertical distance between visible middle-layer rows/cards.
- Every card surface contains only one compact label and one 2-5-unit primary phrase. Optional auxiliary wording is small, exterior, and excluded from card measurement.
- Key sentence cards are content-sized with tight padding; no fixed height/min-height or obvious empty space below the text.
- Key sentence line-level style fields are editable in Studio props: font size, font family, font weight, color, line height, icon size, and icon color.
- Key sentence renderer respects explicit per-line style/icon values and uses defaults only for missing fields.
- Key sentence renderer accepts a preset key such as `stylePreset` and merges it with line/highlight overrides.
- Key sentence word-level `highlights` are editable in Studio props and can independently control color, font size, and font weight for selected spans.
- Highlight rendering splits text into spans without duplicating, dropping, or reordering characters.
- Studio should expose the nested props directly so a user can tweak line style, icon size, and highlight spans without editing raw code.
- Any span that becomes larger than the base line must force a relayout of that line and any stacked card above/below it.
- No unrelated permanent explanation strip or fourth semantic layer appears. Useful scene-bound context remains allowed within the existing layers and is checked for both readability and missed reading value.
- Enumeration items match explicit items in the corrected spoken transcript or a companion-script passage aligned to that recording.
- Every sequentially spoken enumeration item has its own subtitle-derived `showAtMs`, and rendered QA confirms that later items are absent before their spoken anchor.
- Relationship graphics are visually separated from memory beats.
- Relationship presentation matches the one selected relationship, its item count, and its role instead of defaulting to one template.
- Dark memory cards, relationship tags/chips, structured process/route nodes, real-object panels, and nested dark nodes use transparent black-glass surfaces rather than solid black/opaque dark boxes; the source video remains visibly present behind them while text stays readable.
- Real image/video material uses flush framing by default: asset fills the frame, outer border wraps it, and no unwanted inner gap appears.
- Every information-bearing real object records `viewingTask`, `presentationScale`, and a readability reason. Non-demo material must pass a roughly 390px-wide phone preview at local/large scale using crop, zoom, focus, or callout as needed; it is never promoted to `detailTakeover`.
- Prerecorded product or process operation demonstrations use a full-screen `MediaFrame/recordedDemo` detail takeover. Every narrated interaction and final state is readable; the demo is not a small side window preserved merely to keep the presenter visible.
- No non-demo real-object event uses `presentationScale: "detailTakeover"`; the audit rejects it even when its viewing task is `read` or `verify`.
- Missing real image/video material has an explicit replaceable `src`, placeholder label, and expected-content note.
- Real-object tasks are derived from corrected spoken semantics, not unrelated script notes or generated summaries.
- Each real-object task has a clear spoken source and matching subtitle timestamp.
- No real-object task is added when the subtitle evidence is weak or ambiguous.
- A real-object task performs an actual showing, focusing, demonstrating, or verifying job. Shared concrete labels with the relationship layer are allowed; reject roleless repetition, not shared wording.
- Material glow color is fixed in data and does not change between renders.
- External material glow color is not identical to the glow/accent color used by middle key sentence, grouped feature, or enumeration containers in the same segment.
- Real-object presentation mode, placement, and motion match its purpose and material tag instead of defaulting to one frame style.
- A source-frame occupancy map exists and records subject/hand, title, caption, H3 focal, and usable whitespace zones for the relevant section or shot.
- Every non-fullscreen foreground event records a concrete renderer component, motion grammar, selected placement, fallback placements, and a short placement reason.
- Every semantic foreground component has a transparent full-frame host, no opaque whole-composition surface, and measured local visible bounds. RemotionUI page backgrounds and global dimming are absent from the installed semantic component pack.
- No screen side is used as an implicit default. Strong side concentration or a long same-side streak has a visible compositional reason or is repaired after contact-sheet review.
- Repeated visual-family/component streaks are reviewed. Different mode names are confirmed to produce materially different rendered hierarchy or motion, not aliases of one white-text or glass-card template.
- Missing external assets retain the silhouette of their intended semantic presentation (`browserWindow`, `dataPanel`, `documentPage`, etc.) while remaining unmistakably marked as replaceable; do not turn all placeholders into the same generic dashed panel.
- Fallback selection chooses the least surprising semantic mode and preserves its real-object job. Reinforcing wording may recur across layers when their reading roles remain clear.
- External material exits after its intended duration.
- Studio Inspector visibility and default-props saving are both explicitly verified for every composition with editable props. The right sidebar shows known global controls and at least one nested foreground event field. For custom segment folders, the launch command uses the `*-entry.tsx` file, the adjacent `<Name>Root.tsx` contains the matching string-literal composition id and inline static `defaultProps`, and `computeCanUpdateDefaultProps` (when available) returns `canUpdate: true`. Do not hand off a command that points at an old `index.ts` entrypoint.
- `npm run typecheck` passes.
- At least one still frame is generated for each major visual state.
- For foreground placed on real operation footage, at least one final-composite still is checked at each materially different background brightness; the primary text remains distinguishable from the underlying interface colors.



### Portrait sizing and editable section titles

- Use the shared `getSectionTitleLayout` for classic title rendering and visible bounds. Portrait title type scales from canvas width (`width / 900`); landscape keeps its authored scale. The title remains at the master left edge by default, with a compact content-height box. Never reuse a landscape placeholder rectangle or ignore the title transform.
- `preset/leftMiddle` is the initial title placement, not a lock. Manual version-2 visible-content placements override it and must survive save/reopen and export. Legacy title boxes were ignored by rendering; migrate those once to the responsive default, not an arbitrary old drag rectangle.
- Review portrait foreground at phone width: section titles around 4–5% of canvas width, readable card text around 3–5%, and brief emphasis around 6–10% are starting review bands, not mandatory fills. Fit to free space while retaining readable text. A multi-step explanation needs enough vertical room; do not compress its fully-expanded stack into a one-row strip. Never stretch axes independently. Preserve user-adjusted placements when improving defaults.
