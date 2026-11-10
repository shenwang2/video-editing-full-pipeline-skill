# Automatic Semantic Director

Use this workflow to convert a source video and optional companion text into the timestamped semantic inputs required by the foreground visual system. Never require user-authored segmentation markdown.

## 1. Discover inputs

1. Treat the explicitly named video as the primary source. If the user names a folder, choose the only plausible primary video; ask only when multiple full-length videos remain genuinely ambiguous.
2. Inspect the video's folder for companion files. Prefer an exact matching basename, then a clearly related filename, then the only plausible text/subtitle file.
3. Accept timed subtitles such as `.srt`, `.vtt`, `.ass`, or timestamped JSON; untimed scripts such as `.txt`, `.md`, `.docx`; and supporting images, screen recordings, documents, or clips.
4. Record video duration, exact encoded width and height, display rotation, aspect ratio, frame rate, audio streams, and file paths before analysis. Use the input video's exact width and height as the Remotion composition resolution. Do not substitute a default HD, 1080p, 16:9, or 9:16 canvas unless the user explicitly requests it.
5. Do not interpret editing notes, export logs, or unrelated markdown as narration merely because they are in the same folder.

## 2. Establish the spoken timeline

1. Run `python -X utf8 scripts/transcribe-words.py --input <working-base> --output <word-transcript>.json` for word-level timestamps. It wraps the installed runtime (faster-whisper `large-v3` by default, FunASR Paraformer via `--backend funasr`) and always writes the same schema. Use `--list-backends` to see what the current Python can import, and pass companion-script product names through `--initial-prompt`. Do not improvise a different ASR tool, and do not make a manually prepared transcript a prerequisite.
2. If accurate timed subtitles already match the audio, reuse their phrase timing and recover finer word timing from ASR where visual entrances require it.
3. Keep the ASR output as evidence. Store each word or stable token with `startMs`, `endMs`, confidence when available, and its source.
4. Complete `clean-base-prepass.md` before this stage. The clean base plate—not the raw recording—is the timing authority for every semantic, foreground, H3, SFX, subtitle, and material cue. After the clean prepass is locked, do not make additional hidden timing changes downstream; revise the clean edit decisions and rebuild the clean base instead.

## 3. Reconcile an optional script

Use an untimed script as a correction source, not as a timeline.

1. Normalize punctuation, whitespace, full-width forms, obvious filler variants, and Chinese number forms for matching while preserving the display text separately.
2. Align script clauses to ASR clauses by lexical overlap, order, and neighboring context. Allow recorded omissions, additions, repetitions, paraphrases, and reordered clauses.
3. Correct names, product terms, English acronyms, and numbers only where the audio/context supports the correction.
4. Preserve speech that appears in the recording but not in the script. Do not insert script sentences that were never spoken.
5. When alignment is uncertain, keep the ASR wording and flag `needsReview: true` internally; continue automatically unless the uncertainty changes a factual claim or exact on-screen number.

Write `analysis/transcript.clean.words.json` with clean-base recognition, corrected display text, word timing, and script-match provenance. Write `analysis/transcript.words.json` only as a compatibility alias to this clean-timeline artifact. Keep raw recognition separately in `analysis/transcript.raw.words.json`.

## 4. Build the three-level semantic timeline

Read `remotion-semantic-director.md`. Partition the corrected spoken timeline into Section -> Foreground Scene -> Spoken Beat, by meaning rather than fixed duration.

Create a new Section only when the central question, central thesis, or sustained rhetorical job changes. Give each Section exactly one `sectionRole`: `hook`, `context`, `problem`, `proposition`, `explanation`, `method`, `illustration`, `proof`, `qualification`, `conclusion`, or `cta`. Do not turn mechanism, process, comparison, or material type into Section roles. Merge short transitions and one-line supporting moves into the surrounding Section when they have no independent thesis.

For every Section record its `id`, `startMs`, `endMs`, exact spoken text, `centralThesis`, one `sectionRole`, synthesized title, grounded entities, uncertainty, and factual-risk flags. After boundaries are stable, synthesize the title from the complete central thesis; do not copy a script heading or isolated sentence and do not add an unspoken promise.

Inside each Section, create Foreground Scenes when the real object changes, the single information relationship changes, the current memory payload cannot coexist with the next payload, or the composition can no longer carry the new meaning. For each scene independently extract:

- optional `realObject` with one purpose (`show`, `focus`, `demonstrate`, or `verify`), material kind, asset status, and grounded reference;
- optional `relationship` with exactly one type from the approved high-frequency or on-demand relationship list;
- zero or more timestamped `memoryBeats`, including useful contextual reading selected alongside the complete scene expression under `remotion-semantic-director.md` section 3.4;
- one `compositionMode`: `independent`, `simultaneous`, `progressive`, or `handoff`;
- exact Spoken Beats for every object, item, node, state, and emphasis.

Do not write `viewerNeed`. Do not write a whole-scene component-seeking `semanticIntent`. When two independent relationships are both indispensable, split the content into two Foreground Scenes. When a subordinate order or state change merely explains the chosen relationship, keep it as Spoken Beats inside that scene.

Write the result to `analysis/semantic-timeline.json`. The same scene analysis actively captures worthwhile explanations, characteristics, uses, reasons, and concrete details; do not wait for a second enrichment pass or require a defect in the core structure. Keep their source anchors and referents with the ordinary selected beats. This is an internal generated artifact, not a user input or approval gate.

## 5. Route the three layers into the existing visual grammar

Read `layer-rules.md` and `visual-space-director.md`. Keep semantic analysis independent from component selection until all three layer payloads and Spoken Beats are stable.

1. Route the real-object layer from object purpose plus material kind. A real screenshot, recording, document, page, message, metric, identity, code sample, or map remains a first-class Remotion event. Reserve full-screen `detailTakeover` exclusively for purpose `demonstrate` rendered as `MediaFrame/recordedDemo`; all other real-object purposes use measured `local` or `large` placement with crop, zoom, focus, or callout when needed.
2. Route the scene's zero-or-one information relationship into a structural treatment. Choose its approved component and variant from `semantic-component-library.md`; the relationship choice must not suppress valid real-object or memory events.
3. Route each memory beat from its memory type and reading function, not only dramatic importance. Contextual explanations can use an existing short-statement, keyword, quotation, or conclusion treatment at readable foreground size. Definition, status/result, and other special routes still require their actual semantic contracts. Bare line, focus line, card, keyword pop, status row, quote line, and stamp are downstream presentation choices, not semantic types.
4. Compose active layer treatments according to the scene's `compositionMode`. A valid real object, relationship graphic, and memory emphasis may coexist freely at their intended visual strength. Do not create attention-lead, focus-handoff, or primary/supporting metadata. Coordinate them with measured zones and each layer's own Spoken-Beat timing. Do not run a separate cross-layer wording comparison or delete a layer merely because it reinforces related wording.
5. When a relationship names an input/object and says it is analyzed, planned, split, routed, assigned, assembled, or transformed, require visible state change and align every change to its Spoken Beat. A one-line memory cue may support this relationship but must not replace it.
6. Use the lightest form that makes the spoken meaning clearer. Do not convert ordinary captions into foreground content and do not invent facts, list items, proof, messages, metrics, or product capabilities.

For each selected layer treatment record the exact `anchorText`, absolute `showAtMs`, `hideAtMs`, treatment, visual units, `visualFamily`, `rendererComponent`, named `variant`, `motionGrammar`, style data, asset path or replaceable slot, and SFX cue. For a composed scene, also record its shared composition id and physical collision checks. Choose variants from information shape, reading direction, narrative energy, measured free space, and current visual rhythm; never pick randomly. Inspect representative source frames before assigning placement. For structured items, preserve absolute item-level Spoken Beats instead of equal-gap animation.

Write `analysis/foreground-plan.json`. Then pass this plan into the Remotion visual grammar and renderer described by `layer-rules.md`.

## 6. Select full-screen H3 support

After the Remotion three-layer plan is complete, independently decide whether a Foreground Scene benefits from a full-screen generated explanation. H3 supplements the established Remotion plan; it does not replace the title, real-object, information-relationship, memory, screenshot, recording, document, annotation, or caption information that remains useful.

Do not create an A/E/R/M/G responsibility map, visual master plan, evidence hierarchy, or general motion-production queue. Write only an additive `analysis/h3-candidates.json` shortlist. Each candidate must cite the exact spoken anchor, the abstract idea that needs concreteness, one observable start/action/result, the distinct explanatory value H3 adds beyond the existing foreground, and the foreground event IDs that remain active. Reject a candidate that merely substitutes for an existing external material or causes the foreground plan to become sparser. For every accepted H3 unit, run the bundled reference search, bind P/C/M mechanisms, select direct reference inputs or generate endpoint frames as required by the chosen mode, and audit a v2 contract before submission.

Choose `H3_FULLSCREEN` only when an abstract mechanism, transformation, cause/effect chain, process, scenario, or emotional consequence can be expressed as one faithful visible action. Prefer real supplied material for proof and deterministic Remotion graphics for exact text, data, lists, comparisons, taxonomies, or interfaces. Record `NONE` when the speaker and foreground information already communicate the unit clearly.

For every selected H3 unit record:

- exact spoken anchor and absolute output time;
- knowledge point and intended viewer inference;
- T01-T21 visual grammar and generation mode;
- one observable starting state, one causal action, and one stable result;
- `aspectRatio: "16:9"`, `placement: "fullscreen"`, and `workflowResolutionPolicy: "native"`;
- the central crop-safe subject/action region required when the final canvas is not 16:9;
- foreground elements that remain above the shot and the readability treatment they need.

Follow `h3-fullscreen.md` for generation, retiming, and composition.

## 7. Automatic acceptance checks

Before rendering, reject or repair a plan when:

- the Remotion composition width or height differs from the primary input video without an explicit user override;
- an H3 request passes the source or final output resolution into RunningHub, overrides node 16, requests a non-16:9 aspect, or renders the returned clip as a framed card instead of a full-screen cover layer;
- any title, visual, or internal node lacks an exact spoken-time anchor;
- text or facts cannot be traced to the recording or a matching script passage;
- active foreground treatments physically collide or make one another unreadable;
- a material slot is treated as real evidence without a real asset;
- multiple active layers contradict one another;
- the chosen treatment contradicts the semantic relationship;
- a mode has no materially distinct renderer component or motion contract;
- a new non-H3 event has no named visual variant, references an unregistered variant, or uses a motion grammar that contradicts its variant contract;
- an extension event lacks its exclusive activation evidence, names more than one extension candidate, or bypasses the core fallback under ambiguity;
- placement is inherited from a default side without representative-frame analysis or a stored reason;
- a non-H3 event uses `detailTakeover` without being a prerecorded operation demonstration routed as `MediaFrame/recordedDemo`;
- a screenshot, webpage, document, dashboard, proof item, code sample, ordinary B-roll clip, `show`, `focus`, or `verify` event is made full-screen instead of using a measured local/large presentation;
- the foreground audit reports a strong one-side or repeated-component pattern and no semantic/compositional reason is recorded;
- the generated semantic timeline has gaps, overlaps, reversed timestamps, or extends beyond the video duration.

Continue from video ingestion through plan generation without asking the user to prepare, review, or confirm intermediate Markdown.
