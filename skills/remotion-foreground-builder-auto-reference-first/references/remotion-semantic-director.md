# Remotion semantic director contract

Use this contract before selecting any Remotion component. It defines what the foreground director must understand; component names, variants, palettes, and placements belong to later passes.

## 1. Time hierarchy

Analyze the narration at three levels:

1. **Section**: one central thesis and one main rhetorical job. It owns the persistent section title and broad pacing.
2. **Foreground Scene**: one complete foreground expression inside a Section. It may activate any combination of the three semantic layers below.
3. **Spoken Beat**: the exact word or clause anchor for one asset, relationship node, state change, or memory emphasis.

Do not split by a fixed duration. Create a new Section when the central question, central thesis, or sustained rhetorical job changes. Create a new Foreground Scene when the real object changes, the single information relationship changes, the current memory payload can no longer coexist with the next payload, or the visual composition can no longer carry the new meaning. A short transition, parenthetical example, or one-line qualification does not create a Section by itself.

## 2. Section roles

Every Section has exactly one primary `sectionRole`:

- `hook`: gain attention and create a reason to continue;
- `context`: establish the subject, background, or premise;
- `problem`: make a conflict, cost, or unresolved difficulty visible;
- `proposition`: state the central answer, position, or claim;
- `explanation`: make a reason, mechanism, or idea understandable;
- `method`: tell the viewer what to do or how to solve something;
- `illustration`: make an abstract point concrete through an example or demonstration;
- `proof`: establish trust through real facts, data, sources, or outcomes;
- `qualification`: correct a misconception, objection, exception, or boundary;
- `conclusion`: synthesize the payoff or final judgment;
- `cta`: invite a concrete audience action.

Section role controls title synthesis, pacing, intensity, hold time, and deliberate A-roll breathing room. It does not select a renderer component. The sequence of roles is not a mandatory content template, and the same role may appear in several Sections when the central thesis changes.

## 3. Three independent semantic layers

A Foreground Scene may activate none, one, two, or all three layers. The layers are complementary, not mutually exclusive. Analyze them independently, align them independently, then compose them into one foreground scene.

### 3.1 Real-object layer: what the viewer needs to see

Choose at most one `objectPurpose` for the scene:

- `show`: establish what a real object, product, person, page, or result looks like;
- `focus`: direct attention to one exact region, field, control, or detail;
- `demonstrate`: show a real operation, behavior, or state change;
- `verify`: support a factual claim with real evidence.

Store material type separately from purpose. Useful material tags include `asset`, `web`, `app`, `document`, `message`, `data`, `identity`, `code`, `map`, and `screenRecording`. A material tag is not a semantic scene. Record whether the material is provided, discovered, or an explicit replaceable slot; never fabricate proof.

### 3.2 Information-relationship layer: what the viewer needs to understand

Choose **zero or one** `relationship` for each Foreground Scene.

High-frequency relationships:

- `collection`: peer items, features, categories, or a named set;
- `comparison`: two coexisting choices, states, standards, or sides;
- `transformation`: one state or value becomes another;
- `sequence`: ordered actions or stages where order matters;
- `chronology`: events organized by dates, periods, or historical development;
- `causeEffect`: one cause produces a consequence;
- `hierarchy`: parent-child membership, levels, or nested structure;
- `flow`: an object is transferred, routed, branched, distributed, or converged;
- `problemSolution`: a problem is paired with its remedy or resolution.

On-demand relationships:

- `conditionBoundary`: a rule, threshold, exception, applicability boundary, or if-then condition;
- `feedbackLoop`: a result visibly returns to influence an earlier state;
- `matrix2x2`: four placements are organized by two named independent axes.

When several relationships appear plausible, choose the one that best expresses the scene's central comprehension job. Treat subordinate ordering or state changes as Spoken Beats inside that relationship. If two relationships are both indispensable and independent, split the content into two Foreground Scenes instead of assigning a relationship array.

### 3.3 Memory layer: what the viewer needs to retain

Create zero or more timestamped `memoryBeats` from spoken content:

- `keywordNumber`: a load-bearing term, acronym, number, price, ratio, or duration;
- `claimInsight`: a core claim, insight, or realization;
- `question`: a meaningful question or unresolved doubt;
- `riskWarning`: a risk, blocker, warning, or action to avoid;
- `definition`: a named concept and its concise meaning;
- `statusResult`: progress, completion, confirmation, delivery, or outcome;
- `verdict`: a conclusion, recommendation, or judgment;
- `quote`: a spoken quotation or attributed original wording.

Memory beats may accumulate or hand off inside one scene. Prevent accidental duplicate rendering inside the same memory treatment, but do not perform a separate cross-layer wording audit: a keyword may reinforce a real object or relationship graphic when the visual roles and hierarchy are clear. Presentation names such as bare line, focus line, card, stamp, or keyword pop are renderer choices, not memory semantics.

### 3.4 Contextual reading within the existing layers

Default to organized, sufficiently rich expression: a complete standard structure establishes the relationship, but does not exhaust the scene's reading value. During this same Foreground Scene analysis, actively identify contextual explanations alongside the core relationship and real object. Do not finish a sparse structural cut and schedule a second model/director pass to enrich it.

Look through the whole scene's spoken content, including adjacent wording that still explains the same object. Useful context may identify the topic, describe a characteristic, clarify a use, supply a reason or condition, preserve original wording, expand a concrete detail, answer a concern, or land a conclusion. These are examples of reading functions, not mandatory categories or a checklist to fill. Faithful compression and paraphrase are allowed; quotation retains original wording. Preserve qualifiers, conditional promises, and source uncertainty, and never invent facts, unnamed categories, metrics, evidence, or capabilities.

Actively select content that improves understanding, reading layers, continuity, feeling, or recall. A supplement need not be indispensable, correct a misunderstanding, or fill a semantic gap. Do not reject it merely because the diagram is already complete, the sentence is not a dramatic punchline, or related words also appear in another layer. Exclude unsupported or off-topic additions, accidental duplicates within one treatment, mechanical subtitle copying with no reading function, and content that cannot be made readable in its grounded interval. Neither minimalism nor filling all whitespace is the objective; there is no per-scene addition count, coverage quota, or requirement to add something to every scene.

Context is a function of selected content, not a fourth permanent layer, a new component type, or an automatic small-text tier. Keep zero or one information relationship per scene. Context can be an existing node's appropriate attribute or an independently timed memory beat under the existing types; do not mislabel an unrelated collection as memory or invent a second relationship to hold extra text. When two independent relationships truly require explanation, use the existing scene-boundary rule. Scenes without a relationship can still organize worthwhile contextual memory and real-object content.

Plan core expression and its context together, while keeping this semantic stage component-agnostic. Then choose the approved complete structural treatment before choosing complementary renderers for the selected context; do not disassemble a suitable complete diagram into scattered labels. Rendering and placement follow the existing component, typography, and spatial contracts. Context can use normal foreground-sized text, an excerpt, keyword, or conclusion treatment rather than a mandatory footer. Real material and H3 keep their established roles and safety boundaries.

For selected contextual content, retain its source wording/span, the scene/object/beat it explains, and its own show/hold/hide timing in the existing plan. A short `contextExplanation` planning note may record a target, role, and reading value when that makes the connection clearer; it is optional metadata, not a new required runtime schema. Do not require `semanticGap`, a necessity score, a rejection log for every candidate, or another analysis file. Compile the chosen content into ordinary supported event payloads.

Already spoken context may carry forward while its referent remains current; future explanations, outcomes, and list items keep their own spoken reveals. Related content can accumulate with its structure instead of replacing it sentence by sentence. Clear or hand off content when its meaning expires, the topic changes, or a measured reading conflict requires it. Resolve layout and timing before deleting useful content or shrinking it to helper type.

During the existing scene review, check both excess and omission: does the composition remain truthful and readable, and has it reduced a content-rich passage to bare standard nodes while leaving useful explanation unused? Repair omissions inside that same scene plan. This is not a new scoring or model pass.

Examples of the decision, not templates:

- If a narration sends a small JSON file through generation, receipt, and recognition, retain the complete file route and also consider its stated small-file characteristic, editable position/size/style details, and final conclusion at their own beats. The route's completeness is not a veto on that reading content.
- If a narration explains that one director was divided into roles, a complete tree and an original-wording excerpt can coexist. Do not fabricate names for internal roles that were not supplied.
- If the passage only supplies category totals, keep those totals faithful. Richer expression is not permission to invent category names or turn a future threshold promise into an achieved result.

## 4. Layer composition

Choose one `compositionMode` for the Foreground Scene:

- `independent`: one active layer carries the scene;
- `simultaneous`: complementary layers remain visible together;
- `progressive`: layers and beats accumulate as their narration anchors arrive;
- `handoff`: attention passes from one layer to another while earlier context becomes quieter or exits.

Do not turn layer composition into winner-takes-all routing. A real screenshot, a relationship overlay, and a short memory emphasis may coexist, including when their wording partially reinforces the same spoken idea. Do not assign `attentionLead`, `focusHandoffs`, or primary/supporting ranks. Let each valid layer keep the visual strength appropriate to its own content, and coordinate the composition through placement, Spoken-Beat entrances, internal progression, and exits. Do not create a scoring table or a separate semantic-deduplication pass. Remove content only for contradiction, accidental same-treatment duplication, or a physical readability collision.

If none of the three layers adds understanding, verification, or memory value, set the scene to foreground-free and preserve the speaker.

## 5. Planning contract

The semantic timeline must be component-agnostic. A practical shape is:

```json
{
  "sectionRole": "proof",
  "centralThesis": "真实后台数据说明变化",
  "sectionTitle": "后台数据真的变了",
  "foregroundScenes": [
    {
      "startMs": 12000,
      "endMs": 17800,
      "realObject": {
        "purpose": "verify",
        "materialKind": "data",
        "assetStatus": "provided"
      },
      "relationship": {
        "type": "transformation",
        "from": "300",
        "to": "3000"
      },
      "memoryBeats": [
        {"type": "keywordNumber", "text": "完播率", "showAtMs": 16320}
      ],
      "compositionMode": "progressive",
      "spokenBeats": []
    }
  ]
}
```

Do not write `viewerNeed`; the three layers already encode what the viewer needs to see, understand, and remember. Do not write one whole-scene `semanticIntent` whose only purpose is to choose a component. Component selection happens after this contract is stable, separately for each active layer and then for the composed scene.

## 6. H3 boundary

This contract governs Remotion foreground planning. The H3 director remains an independent additive pass after the Remotion semantic plan is stable. H3 may add concrete background action but must not erase valid real-object, relationship, or memory-layer foreground information.
