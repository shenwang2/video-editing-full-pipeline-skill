# Visual And Spatial Director

Use this reference only after `remotion-semantic-director.md` has produced stable Sections, Foreground Scenes, Spoken Beats, and three-layer payloads. It prevents two common failures: several active semantic layers collapsing into one generic visual, and most foreground information accumulating on one side of the frame.

## Contents

1. Separate semantic and spatial decisions
2. Renderer contracts
3. Visual-family routing
4. Source-frame occupancy analysis
5. Placement selection
6. Timeline balance and conflict resolution
7. External-material placeholders
8. Data contract and validation

## 1. Separate Semantic And Spatial Decisions

Perform three passes:

1. **Layer visual pass**: choose renderer candidates separately for the active real-object, information-relationship, and memory layers.
2. **Scene composition pass**: combine those treatments according to `independent`, `simultaneous`, `progressive`, or `handoff` without deleting a valid layer.
3. **Spatial pass**: inspect the actual frames, mark protected and usable regions, then select placement and fallbacks for the whole composition.

These are downstream design decisions, not a second context-enrichment analysis. The same scene-level semantic decision already selected core structure and useful context under `remotion-semantic-director.md` section 3.4. Give that context normal readable foreground treatment. Try reflow, usable zones, beat-aligned stagger, and readable holds before deleting useful content or shrinking it into a footnote; never reveal a later outcome early.

Never choose `right` merely because the existing component is coded on the right. Never change a correct semantic form only to create novelty.

## 2. Renderer Contracts

Every foreground event in a new cut must record and validate against `assets/semantic-component-contract.json`. Component selection happens after the three-layer scene contract is stable. The legacy `foreground-renderer-contract.json` has been archived; it never supplies candidates or fallbacks. Each event records:

- source semantic layer and its object purpose, single relationship, or memory type;
- `rendererComponent`: actual Remotion component name;
- `variant`: named composition variant implemented by that component;
- `motionGrammar`: visible entrance/state-change/exit behavior;
- `placement`, `fallbackPlacements`, and `placementReason`.

Two mode names or variants count as different only when their playback, composition, hierarchy, geometry, or state change is visibly different. Color, underline length, icon substitution, or a renamed prop alone does not create a new form. Use `references/semantic-component-library.md` as the active catalog and the bundled `assets/semantic-foreground-pack/src` implementation rather than creating per-video aliases.

Treat a transparent full-frame React host as coordinate space only. Ordinary visible renderer surfaces must be localized, content-sized, and bounded by measured placement. Reject imported page backgrounds or global dimming unless the plan explicitly routes a separate takeover. The two approved takeover owners are H3 and a prerecorded operation demonstration rendered as `MediaFrame/recordedDemo`. Reading or verifying a screenshot, webpage, document, dashboard, proof item, or code sample does not authorize a full-screen takeover. RemotionUI previews supply visual and motion vocabulary; they do not decide takeover ownership.

The new catalog is deliberately incomplete while the user reviews component styles. Route only approved semantic slots. Leave an uncurated slot pending rather than consulting the legacy 29+5 library. After choosing an approved component, choose its named variant from the exact semantic purpose first, then the measured source-frame geometry and simultaneous layer competition.

If the approved component is missing from the bundled pack, treat that as an implementation error. Do not substitute an old component. One component may serve several purposes only when each route has an explicit distinct mode contract in the new registry.

## 3. Visual-Family Routing

Use only these currently approved routes:

| Semantic layer | Purpose | Approved component mode |
|---|---|---|
| real object | show | `MediaFrame/show` |
| real object | focus | `CalloutSpotlight/aimedCallout` |
| real object | demonstrate | `MediaFrame/recordedDemo` |
| real object | verify | `BRollStack/proofDeck`; one proof item falls back to `MediaFrame/show` |
| information relationship | collection | `LogoWall/peerTileWall` |
| information relationship | comparison with explicit same-unit numbers | `ComparisonBars/numberDelta` |
| information relationship | conceptual comparison without grounded same-unit numbers | `ConceptComparisonCards/dualPeerCards` |
| information relationship | transformation | `KanbanMove/stateTransfer` |
| information relationship | sequence | `FormFillSequence/spokenSteps` |
| memory | short keyword | `ImpactToken/keywordImpact` |
| memory | grounded number with unit | `ImpactToken/numberLanding` |
| memory | claim or insight | `InsightFocus/claimLanding` |
| memory | unresolved question | `QuestionTension/openQuestion` |
| memory | risk or warning | `WarningBoundary/blockedRisk` |
| memory | explicit term and meaning | `DefinitionReveal/termMeaning` |
| memory | status resolving into an explicit result | `ResultLock/statusToResult` |
| memory | final judgment or conclusion | `VerdictStamp/judgmentSeal` |
| memory | original wording or grounded attribution | `QuoteFrame/attributedQuote` |

All 24 current semantic slots are curated. A non-numeric comparison uses the approved two-card style and must never be sent to `ComparisonBars`. Do not rebuild the old routing table here as a temporary shortcut. Future component additions require a genuinely new semantic purpose, not a stylistic duplicate of an existing route.

## 4. Source-Frame Occupancy Analysis

Before placement, extract representative composite frames:

- at least the first stable frame of each semantic section;
- each event entry frame;
- the midpoint of longer events;
- each H3 start/result state;
- extra samples whenever the speaker or camera moves materially.

For every relevant interval record normalized rectangles or polygons for:

- `subjectZone`: head, torso, and important body silhouette;
- `gestureZone`: active hands or objects being demonstrated;
- `captionZone`: supplied or generated subtitle band;
- `titleZone`: established title footprint;
- `platformUiZone`: areas likely to be covered by publishing UI when relevant;
- `h3FocalZone`: essential H3 action or result;
- `whitespaceZones`: usable low-detail areas with sufficient contrast.

Visual inspection is acceptable. Use automated face/person detection when available, but verify it against extracted frames. Recompute per section when the subject moves; do not assume one box covers the whole video.

## 5. Placement Selection

Use relative candidate zones rather than one hard-coded right column:

- `leftMiddle`, `rightMiddle`;
- `leftLowerSafe`, `rightLowerSafe` above captions;
- `upperCenterSafe` for a short word/number only when it does not cover the face or title;
- `fullWidthUpper` for a genuine wide comparison or process;
- `splitLeftRight` for two-sided comparison;
- `centerTakeover` when the person is intentionally de-emphasized;
- `detailTakeover` only for a prerecorded product/process operation demonstration routed as `MediaFrame/recordedDemo`.

For each event:

1. Record the viewing task for real material: `recognize`, `read`, `follow`, or `verify`. Reject a local zone before protecting the presenter when that zone would make the referenced material unreadable. For non-demo material, solve readability with a measured `large` zone plus crop, zoom, focus, or callout—not full-screen takeover.
2. Reject candidates that intersect captions, the established title, the face, important hand gestures, or an H3 focal action, except that a `MediaFrame/recordedDemo` operation demonstration may intentionally replace the presenter while title and captions remain reserved above it.
3. Reject candidates too small for the measured text/component bounds plus safe margins. For external material, measure the actual UI, value, control, clause, code, or target region rather than only the outer frame.
4. Prefer a whitespace zone with readable contrast and a natural relation to the speaker's gaze/gesture.
5. Consider recent placements. If several preceding events used one side, inspect the opposite safe side first; use it only when it remains compositionally sound.
6. Resolve simultaneous layers as one composition. Preserve each valid layer's intended readable scale and contrast; coordinate them with separate measured zones and Spoken-Beat timing instead of dimming or shrinking one layer to establish priority.
7. Store the chosen zone, fallbacks, and a one-sentence reason.

The selected zone constrains the component's visible bounds, not merely its alignment point. A component must not accept a local placement and then render a full-screen background behind it. Local dimming, blur, glow, or glass support must be clipped to the component or its asset panel.

Build a master alignment grid for every section. Derive visible-edge tokens from the established title edge, canvas safe edges, caption band, and deliberate opposite margin. Components sharing one lane use the same visible left or right edge; do not center smaller surfaces inside a wider placement zone and call them aligned. At the legacy 2560x1440 baseline, the established upper-left title supplies `x=108` as the left master edge.

Compile that grid into data instead of leaving it as prose. Store normalized plan-level tokens `sectionTitleLeft`, `sectionTitleRight`, and `centerAxis`. Every non-fullscreen foreground event must declare `alignmentToken` and `visibleEdge`; left-lane events normally use `sectionTitleLeft/left`, right-lane events use `sectionTitleRight/right`, and centered events use `centerAxis/center`. The renderer must align the component's actual visible surface to the token after its content size is known. Aligning only the transparent host, placement zone, or drag box is invalid. A later fast recompile must preserve or regenerate these fields rather than reducing the decision back to `leftMiddle`/`rightMiddle` alone.

External material must remain readable without making every asset a takeover. A `recognize` cue may remain local if the object is obvious. A `read` or `verify` cue uses the largest measured `large` surface that fits, then a semantic crop, zoom, focus, or callout to expose the exact detail; it never becomes `detailTakeover`. A prerecorded product/process operation demonstration uses full-screen `MediaFrame/recordedDemo` because following its continuous interactions is the scene's purpose. Validate the final composite around 390px phone width and revise the crop/zoom/placement when non-demo material is still too small.

When the presenter is centered and both lateral fields are usable, assign lanes by visual responsibility before optimizing individual boxes:

- put real screenshots, supplied clips, product interfaces, proof, and other concrete material in the side that best preserves their readable shape, commonly the right monitor/evidence field;
- put short key words, numbers, action verbs, and cumulative teaching cues in the opposite information lane, commonly the left wall below the title;
- allow a structured diagram to use either lane according to its measured width and reading direction;
- keep a stable lane long enough for viewers to learn the composition, then change it only for a semantic or spatial reason.

This is role-aware balance, not mechanical alternation. Do not route every event to a dark side merely because it is convenient, and do not force a supplied asset into the opposite side merely to improve counts.

Balance is a tiebreaker, not a quota. A sequence may remain on one side when the subject, gesture, real asset, or H3 focal region genuinely requires it.

## 6. Timeline Balance And Conflict Resolution

Maintain a timeline occupancy ledger containing active layer, component bounds, z-index, placement, and semantic priority.

- Build the ledger across the whole composition, not independently inside each placement queue. A component in `rightMiddle` can still collide with a wide `upperCenterSafe`, `centerTakeover`, external-material, title, or caption element.
- Real-object, relationship, and memory layers may remain simultaneously visible without assigning a primary/supporting rank. Preserve readable strength for each layer and rely on measured non-overlapping zones, entry order, and internal Spoken-Beat progression.
- An active `detailTakeover` occupies the canvas. Do not run H3 or another canvas-filling diagram behind or above it. Preserve title, captions, and timed foreground information only where it does not obscure the demonstrated operation.
- Stack only related middle lines in the same queue; measure actual row heights.
- Do not assume queue collision handling solves cross-layer collisions. Check middle text against enumeration, external material, title, captions, and H3 focal content.
- Related middle events should accumulate inside the same measured placement queue up to the rolling three-row cap. Do not shorten every row at the next entry merely to make the audit easy.
- Overlap in time between different placements is allowed when it becomes an explicit composition. Give every peer the same `compositionGroup`; set `allowConcurrent: true`; list every cross-placement peer reciprocally in `collisionCheckedWith`; then inspect stable frames and confirm the measured rectangles plus safety gap do not intersect. Do not assign `compositionRole`.
- Before rendering, run a pairwise physical-collision pass over every non-background foreground event. Serialize, move, or trim only unverified collisions. Do not erase a useful word, cumulative list item, or other non-colliding layer merely because another layer is active.
- For replacement sequences, make the outgoing `hideAtMs` no later than the incoming `showAtMs`. Do not let an earlier clause linger underneath the next clause merely to create density.
- Avoid long same-side or same-component streaks without a visible reason.
- Treat a long pattern in which every middle item replaces the previous item as a density warning. Repair it by preserving related rows, building a small cumulative sequence, or adding a measured counter-lane support when the semantics justify it; never by adding decorative filler.
- In that same review, inspect missed reading value as well as crowding: a structurally correct scene may still omit a useful spoken explanation, reason, detail, or continuity cue. Recover worthwhile grounded context without adding quotas, a separate scoring stage, or another model pass.
- Use a contact sheet spanning all semantic sections to judge the whole video, not isolated stills.
- Treat audit thresholds as warnings for review. Do not automatically delete events, force 50/50 left/right use, or replace a semantically correct component merely to improve a score.

## 7. External-Material Placeholders

When the real asset is missing, preserve the intended presentation silhouette while marking it clearly as replaceable:

- web/API page -> browser-window skeleton;
- metric/report -> data-panel skeleton with neutral bars/rows;
- document -> paper/page skeleton;
- messages/comments -> message-bubble skeleton;
- app/product UI -> app/device skeleton;
- video/photo -> flush asset aperture.

Do not render every missing asset as the same large dashed rectangle. Placeholder text must identify the required asset and path, but must not fabricate evidence or values.

## 8. Data Contract And Validation

Store source-frame analysis at plan level:

```json
{
  "visualAnalysis": {
    "sampleFrames": [{"atMs": 6000, "path": "analysis/frames/006000.png"}],
    "zones": [{"startMs": 0, "endMs": 13000, "subjectZone": [0.37, 0.18, 0.63, 0.91], "whitespaceZones": ["leftMiddle", "rightUpper"]}],
    "titleZone": [0.04, 0.05, 0.28, 0.17],
    "captionZone": [0.16, 0.77, 0.84, 0.93]
    ,"alignmentTokens": {"sectionTitleLeft": 0.0421875, "sectionTitleRight": 0.9578125, "centerAxis": 0.5}
  }
}
```

For a real object, also store `viewingTask`, `presentationScale`, and `readabilityReason`. `presentationScale: "detailTakeover"` is valid only when the event is the `demonstrate` purpose rendered as `MediaFrame/recordedDemo`; all other real-object events must use `local` or `large`.

Store the contract on each event:

```json
{
  "visualFamily": "stateChange",
  "rendererComponent": "ContrastSwitch",
  "variant": "strikeReplace",
  "motionGrammar": "oldStateStrikeThenNewStateReplace",
  "placement": "leftMiddle",
  "alignmentToken": "sectionTitleLeft",
  "visibleEdge": "left",
  "fallbackPlacements": ["rightMiddle", "fullWidthUpper"],
  "placementReason": "Left background is clear here; right hand gesture and PC remain unobstructed"
}
```

Run `scripts/audit-foreground-plan.py` with `--registry assets/semantic-component-contract.json` before rendering, then inspect rendered contact sheets. Repair missing contracts, unexplained one-side concentration, repeated-component streaks, and cross-layer conflicts. Keep advisory balance warnings non-destructive.

The data audit must reject a lateral event whose alignment token or visible edge does not match its selected lane. Rendered QA must additionally measure the visible surface: at the 2560x1440 baseline, left-lane visible edges and the title begin at `x=108`; on other resolutions they use the same shared scaled token. A plan may not pass merely because its placement preset is valid.


### Portrait sizing and editable section titles

- Use the shared `getSectionTitleLayout` for classic title rendering and visible bounds. Portrait title type scales from canvas width (`width / 900`); landscape keeps its authored scale. The title remains at the master left edge by default, with a compact content-height box. Never reuse a landscape placeholder rectangle or ignore the title transform.
- `preset/leftMiddle` is the initial title placement, not a lock. Manual version-2 visible-content placements override it and must survive save/reopen and export. Legacy title boxes were ignored by rendering; migrate those once to the responsive default, not an arbitrary old drag rectangle.
- Review portrait foreground at phone width: section titles around 4–5% of canvas width, readable card text around 3–5%, and brief emphasis around 6–10% are starting review bands, not mandatory fills. Fit to free space while retaining readable text. A multi-step explanation needs enough vertical room; do not compress its fully-expanded stack into a one-row strip. Never stretch axes independently. Preserve user-adjusted placements when improving defaults.
