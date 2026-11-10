# Semantic Component Library



This is the active component-selection record for new cuts. Read it only after `remotion-semantic-director.md` has produced stable Section, Foreground Scene, Spoken Beat, and three-layer payloads.



## Curation Rule



- Select components from the new semantic system without comparing them to the legacy 29+5 renderer library.

- Add a component to this library immediately after the user approves its rendered style.

- A confirmed semantic slot routes only through `assets/semantic-component-contract.json`.

- A semantic slot that has not been curated remains `pending`; do not silently route it to the legacy library.

- Keep the legacy renderer pack only for reproducing an already approved historical cut.

- One component may serve more than one semantic purpose when each purpose has a distinct playback, layout, or choreography contract. Do not create duplicate React components merely to keep a one-to-one count.



## Foreground Adaptation Gate



- A Remotion composition may use a transparent full-frame host as coordinate space, but that host is not a visible component and must not paint, dim, blur, or frame the whole source video.

- Every ordinary approved semantic component keeps its visible pixels inside one measured local or large foreground zone. Only a prerecorded operation demonstration routed as `MediaFrame/recordedDemo` may use `detailTakeover`; `read` and `verify` tasks on other material do not authorize full-screen display.

- RemotionUI `Scene` previews are references for motion grammar, hierarchy, styling, and local geometry only. Remove their page background, full-canvas dimming, hero-page layout, and other takeover behavior before adding them to this Skill.

- `CalloutSpotlight` may dim only its own local screenshot panel. `BRollStack/proofDeck` stays local; `BRollStack/evidenceTrack` may use one measured large horizontal proof region with transparent surroundings, but neither variant may take over the full canvas. `MediaFrame/show` uses a measured local/large media surface and cannot use `detailTakeover`; `MediaFrame/recordedDemo` is the sole real-object takeover mode.

- Full-screen visible takeovers belong only to H3 or `MediaFrame/recordedDemo`. They are never an implicit readability fallback for screenshots, webpages, documents, dashboards, evidence, code, ordinary B-roll, or proof decks.



## Card Copy Contract



- A card is not a subtitle container. Its visible surface contains exactly two copy roles: one compact label and one primary phrase.

- The primary phrase is a semantic compression of the spoken idea, not a copied sentence. Use 2-5 visual units and prefer 2-4. Count each Chinese character as one unit and one contiguous Latin product name, acronym, or grounded number as one unit.

- A card may have one useful small auxiliary phrase or sentence outside its boundary. It is not a third card tier and must not enlarge the card. This local copy limit does not restrict substantive scene context to one small line; route that context separately under `remotion-semantic-director.md` section 3.4.

- Never reduce the primary font size, create a multiline headline, or widen the card merely to preserve an overlong primary string. Re-compress the phrase or choose a non-card renderer.

- `ConceptComparisonCards`, `CauseEffectChain`, `ProblemSolutionBridge`, `WarningBoundary`, and `ResultLock` implement this contract directly. Their existing `subtitle`, `detail`, and `lead` props are exterior auxiliary copy, not card-body copy.



## Confirmed Real-Object Components



### Show — `MediaFrame/show`



Use for one real image or ordinary video that must be seen. Record whether the viewer must merely recognize it or actually read/verify its contents. Default information-bearing screenshots, webpages, dashboards, documents, code, and UI captures to `presentationScale="large"`; if a roughly 390px-wide phone preview cannot reveal the referenced detail, use a semantic crop, zoom, focus, or callout inside the large surface. `MediaFrame/show` never uses `detailTakeover`. A small side thumbnail is valid only for recognition. The approved `show` variant preserves the shutter opening, restrained rim light, optional eyebrow/title/caption, and stable hold. The approved `cleanGlow` variant keeps the same semantic and scale contract but uses one simple lift, thin outline, soft local back-glow, compact in-frame label, and exterior title/caption line; it must not add browser chrome, stacked cards, scan effects, or decorative controls. The source is local at `assets/semantic-foreground-pack/src/real-object/MediaFrame.tsx`.



### Focus — `CalloutSpotlight/aimedCallout`



Use only when the spoken meaning names an exact target region in a real screenshot or capture. Require target coordinates measured against `sourceWidth` and `sourceHeight`. Preserve the sequence inside one local screenshot panel: dim only the panel around the target, close onto the target, ping once, draw the connector, then reveal the local callout. Never dim the entire composition.



The approved `cornerFocus` variant keeps the same exact target contract but uses a simpler presentation: a softly glowing local material frame, dimming only inside that frame, four accent corners locking onto the target, one compact target label, and an optional exterior subtitle. It must not add a connector, magnifier, stacked panel, global dimming, or decorative scan effect.



### Demonstrate — `MediaFrame/recordedDemo`



Use for a prerecorded operation video supplied or discovered beside the talking-head source.



- Probe the recording before planning and store its encoded width and height.

- Pass `sourceWidth` and `sourceHeight`; the component derives the aspect when `aspect` is absent.

- Keep `fit="contain"`; do not crop, stretch, or force 16:9/9:16.

- Record `viewingTask="follow"`. A product-use, configuration, installation, editing, or process recording is an operation demonstration only when the viewer is meant to follow continuous real interactions. It always uses `presentationScale="detailTakeover"` and becomes the full-screen primary visual. A recognition-only clip or short montage is not `recordedDemo`; route it to `MediaFrame/show` at local/large scale.

- Landscape and portrait recordings keep their native shape. In a detail takeover, maximize the sharp recording with `contain`; use a neutral or softly blurred backing for unmatched aspect ratios rather than shrinking, stretching, or cropping away controls.

- Disable the slow push so UI text stays stable.

- Allow timed crop/zoom/cursor callouts when they make the narrated click, field, selection, or result easier to follow. Keep at most two lightweight foreground callouts above the takeover and reveal them at their Spoken Beats.

- Do not add a tutorial hook, code panel, CTA, or invented step shell.

- Preserve useful source audio by default at a narration-safe starting gain. Muting is an explicit semantic/audio decision, not the component default.



### Verify — `BRollStack/proofDeck` or `BRollStack/evidenceTrack`



Use when two or more real screenshots, result captures, process clips, or customer moments jointly support the spoken claim. Each proof item must trace to the narration and appear in spoken order. Use the local transparent proof deck only as an overview whose active proof remains readable. If the narration asks the viewer to inspect exact text, values, controls, or state inside one proof, hand that item to `MediaFrame/show` at `large` scale with a semantic crop, zoom, focus, or callout. Proof and verification material never use `detailTakeover`. Never compress evidence into miniature cards merely to retain the deck silhouette, and never copy the RemotionUI full-page background. For one proof item, use `MediaFrame/show`; do not inflate one screenshot into a fake stack.



Choose `proofDeck` when one proof should visibly occupy the front and the remaining evidence only needs to be implied by a compact physical stack. Choose the approved `evidenceTrack` variant when the existence of several materials must remain visually obvious: one large readable proof occupies the center, adjacent materials remain partially visible at the left and right, and the whole rail travels when the next spoken proof becomes active. Preserve each supplied `showAtInFrames` anchor; when anchors are absent, distribute advances using the component's restrained hold timing. In a centered or upper-centered placement, `evidenceTrack` may use a large horizontal region: the readable center item is approximately 68% of the track width while the complete visible rail may occupy about 88% of the composition width, but it remains a transparent foreground region rather than a full-screen takeover.



Keep the visual deck videos muted and route any useful source audio exactly once at the parent timeline, so several layered visual copies cannot multiply the sound.



## Confirmed Information-Relationship Components



The approved room-light color library contains exactly seven named chromatic colors: 粉红 `#FF5CCB`, 浅紫 `#C55BFF`, 青蓝 `#24E5EE`, 荧光绿 `#D8FF3F`, 亮红 `#FF4D55`, 深紫 `#8D42FF`, and 电光蓝 `#3D5BFF`. Every visual variant chooses exactly one of these seven as its single accent. All cards, labels, nodes, connectors, indicators, and glow within that variant use the same swatch; express hierarchy, status, contrast, and sequence through geometry, iconography, opacity, typography, and motion instead of additional hues. Different variants may choose different swatches. Never invent an eighth name such as “粉紫”, and never blend two approved hues into a new chromatic color. Alpha changes of the same swatch are allowed. Black, white, and transparent neutral surfaces are not additional palette colors.



### Collection — `LogoWall/peerTileWall` or `LogoWall/magneticCluster`



Use when several named peers, features, categories, or members must be understood as one set. Choose `peerTileWall` when the audience should scan a stable, regular grid. Choose `magneticCluster` when the narration emphasizes that several equal peers assemble into one toolkit, system, group, or complete set: the peer capsules spring outward from one center, settle into a staggered but orderly cluster, and then gain one shared group outline. Both variants preserve every supplied Spoken Beat and never imply rank, sequence, or causality.



Replace logo-specific copy with concise semantic labels and optional one-word metadata. For each new peer item, set `icon` to a content-matched name from `lib/semantic-icons.tsx`, or explicitly use `icon: "none"` when no useful match exists. Both variants render real SVG icons in the card; never derive an icon from `name[0]`, `slice(0, 1)`, a Chinese character, or a text badge. Legacy items without `icon` retain their label with no icon surface; `glyph` is deprecated and is not rendered. For example, a document uses `file`, an overlay uses `layers`, and video material uses `play`. Verify each visible card after serialization; a library existing in the Skill is not proof that the item uses it. The full-frame host must stay transparent and the heading plus collection remain inside one measured local zone. In `magneticCluster`, every capsule must use genuinely translucent glass—visible background transmission, restrained blur/saturation, a thin edge and soft glow—and must never become a solid black card or add a full-screen dark panel.



### Comparison — numeric and conceptual routes curated



#### Numeric — `ComparisonBars/numberDelta` or `ComparisonBars/metricShiftRail`



Use only when both sides contain explicit, directly comparable values in the same unit. Choose `numberDelta` when relative magnitude should be read from one shared proportional scale: grow the baseline and changed value, then reveal the delta after the second bar settles. Choose `metricShiftRail` when the narration stresses the transition from an old value to a new value: reveal the old value, let a luminous carrier travel across the local row, land the new value, then reveal the stated or computed delta. Its rows use translucent glass rather than opaque dark cards. Every row keeps its own Spoken Beat. Never invent a number, normalize incompatible units, or use either variant merely because the narration contains the words “more”, “less”, “better”, or “worse”.



#### Conceptual — `ConceptComparisonCards/dualPeerCards` or `ConceptComparisonCards/neonMirrorCompare`



A comparison without directly comparable numbers uses equal peer concepts, not fake bars or a full-screen split scene. Choose `dualPeerCards` when each concept is best understood as one compact independent summary. Choose `neonMirrorCompare` when both sides provide attributes on matching dimensions: reveal the cyan and pink peer headers independently, extend one solid deep-purple central axis, then reveal each left/right attribute at its own Spoken Beat. The three approved swatches stay visually separate and never blend into a new hue. The variant never adds a black or opaque scene background; the review canvas is not part of the component.



Each header contains only its label and 2-5-unit primary phrase. Optional subtitles remain smaller supporting copy outside the header surface. The two sides keep equal visual status and highlight only differences actually stated in the narration. Do not route this scene to `ComparisonBars`, `SplitScreen`, `ComparisonTable`, or the legacy library.



### Transformation — `KanbanMove/stateTransfer`



Use when one visible carrier, task, object, or idea changes from an old state into a new state. Preserve the approved RemotionUI movement grammar: the carrier lifts out of its original state, arcs across the gap, activates the destination, and settles there. Prefer two states; use a third only when the narration explicitly names an intermediate state. Align the move to the exact transformation Spoken Beat and keep the result absent until the spoken change begins.



### Sequence — `FormFillSequence/spokenSteps`



Use for ordered actions or stages whose order matters. Preserve the approved RemotionUI focus-and-validation grammar while removing the form-specific meaning: the current step receives focus, its concise payload resolves, it validates, and attention hands off to the next step. Default to the content-sized `progressiveStack` layout: later steps remain absent and occupy no space before their Spoken Beats, current content has the strongest type/contrast, and completed steps stay readable but subordinate. Align every visible row to the scene's shared master edge instead of centering a large parent panel inside the placement zone. Use a final result label only when the narration actually states the completed result.



### Chronology — `ChronologyTrack/datedMilestones`



Use when dates, periods, eras, or historical development are the relationship itself. Reveal each milestone at its Spoken Beat and advance one continuous time axis through it. Keep time labels faithful to the narration. Do not use this component for ordinary steps that merely happen in an order but have no time semantics.



### Cause and effect — `CauseEffectChain/causalHandoff`



Use when one stated cause produces one stated effect. Every node card contains only its relationship label and 2-5-unit primary phrase; optional explanation sits below the node, outside its glass surface. Insert the middle mechanism only when the narration states it or the corrected transcript supports it without inference. Reveal the chain in the true information direction—cause, optional mechanism, effect—and never expose the consequence before its Spoken Beat.



### Hierarchy — `HierarchyTree/balancedTree`



Use for parent-child membership, nested structure, levels, or one whole made of named parts. Keep one centered root, one shared trunk, one horizontal branch, and equal-size peer child cards spaced symmetrically. Root and child cards contain only a compact label and 2-5-unit primary phrase; optional child explanation sits below its card in small type. Each child still appears at its own Spoken Beat. Do not route a flat peer collection to a hierarchy merely to create a tree.



### Flow — `FlowCarrier/stageTransfer`



Use when one named object, signal, task, payload, or request moves through several locations or processing stages. Keep one visible carrier through the complete route and align every arrival with the corresponding Spoken Beat. Do not use it for static ordered instructions; those remain `FormFillSequence/spokenSteps`.



### Problem and solution — `ProblemSolutionBridge/actionBridge`



Use when the narration first establishes a problem and then names a concrete remedy, intervention, or solution state. Keep two equal local states connected by one explicit action bridge. Each state card contains only a label and 2-5-unit primary phrase. Optional explanation and spoken items sit outside the glass surface as smaller supporting copy. Peer cards share aligned outer edges and equal widths, but their height comes from measured label-plus-primary content rather than a fixed empty box. The problem arrives first, the action appears on its exact Spoken Beat, and the solution state arrives only when spoken; reduce the old state's contrast only after the handoff begins. Problem tags and solution benefits may accumulate individually, but every item must come from the corrected transcript; never infer a success result merely because a solution was proposed.



### Condition and boundary — `ConditionGate/validationGate`



Use when a permission, result, or next state depends on one or more explicit conditions. Reveal and validate each condition at its own Spoken Beat. Keep the gate closed when any rendered condition fails; open it and allow the object through only after all conditions pass. A failed branch remains a stable blocked state instead of briefly showing the success result. Do not use this component for a simple step sequence with no conditional dependency.



### Feedback loop — `FeedbackLoop/closedCycle`



Use only when the result or feedback from one round genuinely returns to change the next round. Place the spoken stages on one directional closed path, reveal each stage at its own Spoken Beat, and let the traveller complete the return to the origin. The centre label names the repeated objective or state. Do not turn a one-way process, static ecosystem, or list of recurring tasks into a feedback loop.



The optional `returnLoopBand` variant uses one fluorescent-green accent, transparent glass peer-stage cards, a subtle dashed closed path, and one returning carrier. Choose it when the repeated handoff should be more visually explicit; it preserves the same semantic and Spoken Beat contract as `closedCycle`.



### Two-dimensional matrix — `QuadrantMatrix/fourQuadrants`



Use when two independent dimensions jointly determine the relative position or category of one or more named objects. Both axes and all quadrant meanings must be supported by the narration or corrected companion script. Reveal the axes, then the four zones, then place each object at its Spoken Beat. Coordinates are semantic relative positions on the two spoken dimensions, not invented measurements. Do not use the matrix for a single comparison that has only one dimension.



The optional `magneticDecisionBoard` variant uses one electric-blue accent, transparent glass quadrant cards, subtle dashed axes, and labeled objects that magnetically settle into their spoken zones. Use it when object placement is the visual payoff rather than the grid alone.



## Confirmed Memory Components



### Keyword or number — `ImpactToken/keywordImpact` and `ImpactToken/numberLanding`



Use `keywordImpact` for one short load-bearing term, acronym, or 2–4 character phrase. Its outline appears first, then the glyphs fill directly into the component accent color with one restrained scale/glow impact and remain colored; do not add an underline. Use `numberLanding` for one grounded number and its real unit: the value counts in, the unit arrives after the value starts, and an optional concise caption may resolve the point. These two modes are mutually exclusive for the same spoken payload and never duplicate an in-sentence highlight.



The optional keyword-only `focusBeacon` variant uses one pink accent, a luminous vertical rail, an oversized primary word that changes from white to the accent color, and a brief same-color scan. The horizontal underline is omitted so the color lock remains the focal event. Use it when the short term is the sole memory nail of the beat; keep supporting copy outside the primary word area.



### Core claim or insight — `InsightFocus/claimLanding`



Use when a setup clause leads to one core claim, realization, or change in viewpoint. The setup stays quieter and the load-bearing headline lands at primary size. At most one short grounded highlight span changes from the headline color to the component accent color at its landing beat, with one restrained scale/glow pulse; the accented glyphs then remain colored for immediate recognition. Do not draw an underline beneath this in-sentence highlight. An optional payoff line may follow only when it is spoken.



The optional `spotlightThesis` variant keeps the setup quiet and reveals the compact conclusion inside one electric-blue translucent focus frame. It is for a stronger thesis landing, not for long explanatory sentences or multi-point lists.



The optional `statementFocus` (重点落字) variant uses content-sized typography without a vertical rail, card, or category badge. A grounded prefix remains as a quieter lead above a large focus phrase; the words settle individually and a short local underline resolves only beneath the supplied `highlight`. This is an explicit alternative to claimLanding's no-underline grammar, not a global change to that variant. `highlight` must be a verbatim substring of `headline`; remaining suffix wording keeps its reading order. Optional setup/payoff must remain grounded and should be omitted when the lead already carries that information. Both renderer and editor bounds use `lib/statement-focus-layout.ts`.



Keep semantic selection separate from style. Use InsightFocus for a claim, recommendation, benefit, or insight that should be remembered as a statement. A short status keyword, invitation cue, or topic preview generally uses the existing ImpactToken keyword route. Do not send every one-line payload to claimLanding, and do not replace semantically correct fixed components with freeform context merely to make the sequence look different. Existing claimLanding and spotlightThesis source behavior and default routing remain unchanged; select statementFocus explicitly for this compact lead-to-focus treatment.



### Question — `QuestionTension/openQuestion`



Use for a meaningful unresolved question. A restrained arc and large punctuation mark create tension while the actual question remains the primary readable element. Do not invent answer choices, survey controls, or a result before the narration answers the question.



The optional `suspenseGap` variant draws an intentionally open bracket around the question and holds one pulsing shallow-purple question mark at the gap. Use it when the unresolved state itself is the retention beat. Supporting setup remains outside the question frame.



### Risk or warning — `WarningBoundary/blockedRisk`



Use for one concrete risk, blocker, or action to avoid. The warning card contains only the warning label and one 2-5-unit primary warning phrase. An optional explanatory sentence uses small text below the boundary, outside the card. A local translucent warning boundary closes around the primary phrase, then a separate prohibition symbol locks beside it. Never draw a diagonal, strike-through, or decorative line across readable warning words.



The optional `riskLock` variant uses one bright-red accent, a top lock rail, an octagonal warning icon, and a separate prohibition seal. Choose it for explicit blockers or non-negotiable risks. The card still contains only the label and short primary warning; explanatory copy stays outside.



### Definition — `DefinitionReveal/termMeaning`



Use when the narration first names a term and then explicitly explains its meaning. A local bracket establishes the term, the term lands at primary size, and the definition unfolds only at its own Spoken Beat. Do not send a general explanation here when no term is actually being defined.



The optional `termDecoder` variant uses one cyan accent and two connected translucent cards: the compact term card locks first, the connector establishes the semantic handoff, and the larger meaning card decodes only at `definitionAtInFrames`. Choose it when the audience must visibly map one named term to one concise meaning.



### Status or result — `ResultLock/statusToResult`



Use when the narration establishes an in-progress state and later states an explicit result. The initial status card appears first and remains visible. At `resultAtInFrames`, a second equal peer card enters beside it and becomes the current emphasis; never replace or remove the initial card at the handoff. Each card contains only its compact label and one 2-5-unit primary phrase. Optional details and a grounded percentage sit below their corresponding cards in smaller exterior type. A numerical percentage is hidden by default and may appear only when the source gives a grounded percentage; the component must never invent progress, success, completion, or delivery.



The optional `dualStateDock` variant uses one fluorescent-green accent. The initial state arrives as a persistent glass card with a restrained progress rail; the result card then docks beside it and locks with a check indicator. Both states remain readable as equal peers after the handoff.



### Verdict — `VerdictStamp/judgmentSeal`



Use for a clear final judgment or conclusion rather than an ordinary emphasized claim. Optional setup appears first, the verdict lands at its Spoken Beat, and a separate seal arrives afterwards beside the statement. The seal and underline never cover readable glyphs, and their wording must not strengthen the spoken conclusion beyond what was said.



The optional `decisionLock` variant uses one deep-purple accent. A compact supporting setup may appear outside the main surface, the short verdict lands inside a translucent decision card, and a separate confirmation plate locks beside it at `stampAtInFrames`. Choose it when the conclusion needs a stronger finality cue without turning into a risk warning.



### Quotation — `QuoteFrame/attributedQuote`



Use when preserving recognizable original wording or an explicitly attributed statement matters. A local quotation rail and restrained decorative mark frame the original words; attribution arrives later only when it is grounded. Never invent a speaker, source, screenshot, or chat interface.



The optional `excerptCard` variant uses one pink accent. The complete quotation is revealed inside a translucent excerpt card, one grounded highlight may share the same accent, and the attribution docks as a separate source tag at `attributionAtInFrames`. Choose it when reading the original wording is the visual task rather than merely remembering one claim.



## Composition With Other Layers



Preserve the complete suitable structural component, then render the already selected scene context through the existing approved library. Context selection is component-agnostic; visual routing follows its actual role, such as claim, keyword, quotation, or verdict. It introduces no new semantic slot or mandatory variant. Never recast ordinary explanation as a definition, achieved result, or quotation merely to obtain a visual style. Keep meaningful context at readable foreground size rather than automatically placing it in small exterior metadata.



The confirmed components now cover all 24 current semantic slots: four real-object purposes, twelve information relationships, and eight memory purposes. A real object, relationship graphic, or memory beat may coexist when each performs a different job and the composition passes the scene occupancy ledger. The director must provide a measured placement and master alignment tokens. Ordinary component rendering respects whitespace, face/hand bounds, captions, and the Section title; only a `MediaFrame/recordedDemo` operation demonstration may intentionally replace the presenter with `detailTakeover`.



## Source And License



The selected RemotionUI-derived base components come from RemotionUI 0.9.0 under the MIT license. `ChronologyTrack`, `CauseEffectChain`, `HierarchyTree`, `FlowCarrier`, `ProblemSolutionBridge`, `ConditionGate`, `FeedbackLoop`, `QuadrantMatrix`, `DefinitionReveal`, `ResultLock`, `VerdictStamp`, and `QuoteFrame` are locally authored components approved through neutral source previews. All components use relative local imports and preserve foreground transparency, measured placement, source-aspect behavior where relevant, and Spoken Beat timing. Preserve `references/remotionui-MIT-LICENSE.txt` and `THIRD_PARTY_NOTICES.md` when publishing the Skill.



## Shared classic approved variants



These variants belong to this original Skill and are available for both direct rendering and editable handoff. Select the semantic component first; the following gates refine only its visual variant. Full payload, timing, icon and review metadata live in `assets/semantic-component-contract.json` under `components.<component>.variants.<variant>`.



- `HierarchyTree/iconClassification`: two to four grounded named categories converge into one explicit taxonomy, library, catalog or total. Preserve category order, staggered category anchors, and the later summary. Do not use for flat peer collections or an ordinary parent-child tree. Icons come only from the finite shared `lib/semantic-icons.tsx` vocabulary; do not invent a total.

- `ConceptComparisonCards/branchOutcomeRows`: exactly two contrasting conditions each map to exactly one short grounded outcome. Retain all four Spoken-Beat anchors and source order. Independent concept summaries use `dualPeerCards`; matched dimensions use `neonMirrorCompare`; several criteria resolving one gate use `ConditionGate`; a state followed by a result uses `ResultLock`; a causal mechanism uses `CauseEffectChain`. The approved blue/gold pair (#4DB6FF/#F6BE62) is a narrow reviewed exception to the default single-accent rule, not a new global palette. Keep the two separate straight dashed row connectors, endpoint dots, and shared measured surface geometry.

- `FormFillSequence/stepRail`: two to five source-ordered steps, including instructions, explanation points, conclusions, or guidance. Choose it when future steps help as muted route context; current step dominates and prior steps remain readable. Ground optional `meta` and a finite-library `icon`; older `detail` stays a metadata fallback. Each `steps[]` entry owns its label and event-local spoken anchor; never maintain parallel labels/beats arrays.

- `FormFillSequence/compactExplanationStack`: the same two-to-five-step semantic/payload contract, but unspoken rows stay absent; each new spoken row appears below earlier muted rows and becomes current emphasis. Each card draws a right-end check once, starting 0.2 seconds after its own entrance anchor and lasting 0.32 seconds, then retains it with that row. This is a presentation acknowledgement, not a change to completion anchors. Reserve the check's text gutter without changing row bounds or primary font size; inherit the card's isolated accent and mute the retained check with prior rows. No operational-action-type requirement. Choose `spokenSteps` for reveal/validation cards, `FlowCarrier` for one object travelling through locations, and `ChronologyTrack` for dated development.



For `compactExplanationStack`, the right-end confirmation is only a small outline circle containing a thin check. Use a simple one-time check drawing animation; no cut-corner frame, scanning line, decorative ticks, glow, or bounce. Keep the accent tied to the card's existing color controls rather than forcing a new palette.



Preserve the already reviewed geometry and motion for these variants during source consolidation; migration itself does not authorize a rhythm redesign. Future approved motion changes are made in this shared implementation and automatically reach both consumers. Editor controls only serialize user adjustments through these same exported surfaces/layout helpers.



## Spoken screenshot target focus

When narration points to a specific visible screenshot field such as a star count, price, repository name, or button, bind a source-coordinate target rectangle to that spoken beat. If the field is too small in the full screenshot, the real-object material must actually zoom or crop into it and settle by the spoken value; a separate ImpactToken or other memory component does not satisfy target visibility. Preserve the source lettering, use a non-obscuring local focus mark only when useful, and return to the overview when the narration shifts back to page context. Check target readability and camera timing in the actual placed panel. A derived silent source-camera clip is allowed inside the existing MediaFrame slot; retain the original image and provenance.


### Editable compact stack accent

`FormFillSequence/compactExplanationStack` exposes its current authored base accent on each sequence card. The editing bridge must resolve that live value before any cached DOM color, then apply an explicit per-card color override last. Component swatches and reset must update existing rows immediately, including paused previews; moving/scaling a card alone must not freeze its color. Check two consecutive component color changes, restoring the default, and a separately colored card.
