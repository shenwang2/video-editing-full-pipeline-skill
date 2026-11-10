# Reference-first automatic director

Read this file whenever the upgraded Skill plans or generates H3 footage. It is the active integration contract. The preserved upstream references under `references/upstream-reference-first/` are supporting knowledge; any upstream instruction that asks for a manual approval gate is superseded here by the user's one-command requirement.

Read `h3-duration-director.md` after the candidate and motion pattern are known, then read `h3-five-mode-prompt-compiler.md` before creating a shot contract or prompt. The first decides the generation duration before any endpoint frame or phase is written. The second enforces schema-v3 five-mode input responsibilities, motion-pattern compilation, Ref2VA beat mapping, and post-generation motion-adherence checks.

## Outcome

Starting from one primary talking-head video, automatically:

1. establish the real spoken timeline;
2. let the established Remotion director finish titles, middle information, structured knowledge, external-material presentation, placement, SFX, and captions;
3. preserve that complete foreground plan as the whole-video source of truth;
4. run a separate additive pass that selects only the units that genuinely benefit from H3 B-roll;
5. count narration-aligned strong visible events and decide a directly fitting 3-15 second H3 generation duration;
6. retrieve traceable P/C/M reference mechanisms for those H3 units;
7. select direct library inputs or generate clean 16:9 endpoint frames as the chosen workflow requires;
8. compile and submit the correct existing RunningHub workflow with the audited duration;
9. use retiming only for bounded final alignment against exact narration anchors;
10. render the H3 layer full-screen below the preserved Remotion foreground;
11. continue through validation and final rendering without asking for intermediate confirmation.

Persist the planning and audit artifacts so the automatic decision remains inspectable. Do not present them as prerequisites for the user.

## 1. Preserve the established Remotion director

After `analysis/semantic-timeline.json` is stable, complete `analysis/foreground-plan.json` through the existing automatic Remotion director. That plan owns the whole-video visual treatment:

- titles and section continuity;
- key words, short statements, numbers, and emphasis;
- lists, comparisons, processes, routes, diagrams, and other structured knowledge;
- screenshots, recordings, documents, webpages, dashboards, code, messages, proof, and other external-material presentations;
- placement, collision handling, mobile readability, SFX, and captions.

Do not import the upstream project's A/E/R/M/G responsibility map, evidence hierarchy, visual master plan, editorial-routing table, or general motion-production queue. They are not part of this Skill. In particular, real screenshots and recordings remain Remotion external-material events; they are not reassigned to a separate director.

Reference-first is a downstream H3 B-roll enhancer. It may add a generated background explanation to a semantic unit, but it may not delete, demote, or reroute foreground or external-material events. Preserve `analysis/foreground-plan.json` as the source of truth. When H3 and an existing event are exactly redundant, narrow H3's illustrative role first; simplify only the duplicated detail after inspecting the complete composition.

No approval pause: save the foreground plan and H3 artifacts internally and continue. Stop only when a missing real asset, factual uncertainty, cost authorization, or unavailable workflow would materially change the result.

## 2. Build an additive H3 B-roll shortlist

Read [h3-opportunity-review.md](h3-opportunity-review.md) for the required picture-then-comparison pass, compact JSON field contract, and executable coverage/consistency audit. It applies equally when the shortlist is empty; never batch-generate creative rejections from relationship tags. Its audit is structural, not a substitute for scene-specific judgment.

After the foreground plan is complete, review every Foreground Scene in the requested scope for a useful H3 opportunity, not just passages that explicitly mention abstraction or animation. Ask: would a concrete scene, interaction, spatial reveal, contrast, or action help viewers understand, feel, or remember this spoken point? Start from the narration, then inspect the retained foreground for composition compatibility. A complete foreground explanation is context, not an automatic veto.

Save this compact pass as `analysis/h3-opportunity-review.json`: one entry per scene with `sceneId`, exact `startMs`/`endMs`, corrected `anchorText`, `visualOpportunity` (or null), `benefit` (or null), `decision` (`selected`, `not-selected`, or `blocked`), one specific `reason`, and `candidateIds` (empty unless selected). For plausible opportunities also record `foregroundCoexistence`; identify illustrative metaphors explicitly. Do not invent a candidate for an ordinary greeting merely to populate the record. Keep creative suitability separate from missing inputs, budget, or unavailable workflows: an operationally blocked opportunity is not semantically unsuitable.

Then write `analysis/h3-candidates.json` with its existing `selected` list containing accepted opportunities only. This preserves downstream compatibility and is not a replacement master plan. Do not build shot contracts, search references, or generate frames for rejected scenes. Zero, one, or several selected shots are all valid; verify the requested scope was reviewed, not that a numerical quota was met.

For each candidate record:

- exact spoken start/end time and anchor text;
- the spoken idea and proposed visual purpose, including non-mechanistic opportunities;
- observable setup, meaningful action/interaction/reveal, and a readable closing state;
- the concrete comprehension, emotional, or memory benefit of H3 alongside the current Remotion/external-material treatment;
- foreground event IDs that remain active above the shot;
- why the shot does not replace real evidence or an already sufficient external material.
- one selected motion pattern, every meaningful visible `strongEvent` with its absolute `narrationAtMs`, and `continuousProcess` only when the meaning requires one uninterrupted multi-stage process.

## 3. Judge visual value, then design a feasible shot

Treat these as alternative creative opportunities, not cumulative requirements or a closed taxonomy:

- mechanisms, transformations, assembly, cause/effect, and processes;
- a concrete scenario or clearly illustrative metaphor for an abstract claim;
- role interaction, division of labor, cooperation, or contrasting behavior;
- spatial hierarchy, scale, containment, distance, or a meaningful viewpoint reveal;
- before/after contrast or a fragmented-versus-coherent visual comparison;
- a narration-grounded human reaction, tension, relief, or consequence;
- a concept embodied in a memorable object or action that helps recall the point.

Select when a specific visual treatment provides a material benefit to understanding, feeling, or recall and fits the spoken interval and complete composition. H3 does not have to be indispensable, carry a new fact, or explain something Remotion cannot explain. Naming a relationship in Remotion and showing it concretely in H3 can reinforce the same idea without being wasteful duplication. An adjective such as "cinematic" or "more engaging" alone is not a benefit; name what viewers can perceive or remember better.

Keep truth and production boundaries: do not fabricate evidence, actual product behavior, customer outcomes, exact UI, metrics, or quotations. Use real material for proof and deterministic foreground for exact labels/data. A hypothetical or metaphorical scene must be legible as illustration and must not imply an unspoken factual claim. Preserve the presenter where personal credibility, expression, or a pause carries more value. Reject generic decoration, unrelated storylines, and visuals whose real contribution is already fully supplied by existing footage. Fix a feasible layout/timing conflict before rejecting a useful opportunity; do not erase valid foreground to make room.

Only after establishing visual value, solve duration, mode, motion, and phases. A single coherent reveal or interaction is sufficient; do not demand a physical transformation, fabricate causality, or invent three separate events to qualify. Simplify or split an overcomplicated shot around meaning. Do not select extra clips for coverage, novelty, or a target count, and do not reject strong candidates merely because one H3 shot has already been chosen.

For a selected unit, record:

- exact `sourceAnchor.startMs`, `sourceAnchor.endMs`, and `sourceAnchor.text`;
- `knowledgePoint` and `viewerInference`;
- `startState`, `causalAction`, and `resultState`;
- one T01–T21 grammar and one M01–M10 motion pattern when applicable;
- foreground event IDs that remain above the clip;
- why H3 is more useful than A-roll plus foreground alone.

Keep schema-v3 field names compatible: `startState`/`startStateEn` describe the setup; `causalAction`/`causalActionEn` describe the meaningful action, interaction, or reveal (causal only when the narration is causal); `resultState`/`resultStateEn` describe the final visible relationship or readable state, not necessarily a transformed object. A camera reveal can expose an existing spatial relationship without changing the world. The compiler's three/four phases are temporal packaging, not three/four causal events; see `h3-five-mode-prompt-compiler.md`. Use `NEW` when a reveal, role interaction, or other relationship does not match M01-M10.

Use `references/h3-visual-routing.md` for T01–T21. Use `references/upstream-reference-first/motion-pattern-library.md` for M01–M10. Read only the composition, color-source, material, attention, and motion-mechanism guidance from `references/upstream-reference-first/visual-dna.md`; ignore its A/E/R/M/G, master-plan, editorial-routing, and production-queue concepts.

## 4. Decide generation duration before visual production

Run `scripts/plan-h3-duration.py` against each selected candidate and save `analysis/h3-duration-plans/<shot-id>.json`. The planner uses the exact spoken span, strong-event count, continuous-process need, and selected M pattern. One state change/impact normally uses 3-5 seconds; 2-4 strong events use 6-9 seconds; a true 5-6-event continuous process uses 10-15 seconds. Eight seconds is a useful center for some short packages, not a default. Tighten an overbroad source anchor or split anything longer than 15 seconds/more than six strong events. Continue only on `decisionStatus: ready`.

The selected integer becomes the single timing authority for endpoint interpretation, phase boundaries, prompt wording, prompt-bundle metadata, and the RunningHub duration node. Do not create frames or write phases first and then force them into five seconds.

## 5. Retrieve P/C/M reference mechanisms

Build search queries from the relationship and mechanism, not from vague style adjectives. Good query shapes include:

- `输入 组装 结果`
- `因果 传播 路径`
- `章节 描边 落版`
- `空间 层级 中心主体`
- `状态切换 固定构图`

From the Skill directory run:

```powershell
python -X utf8 scripts/reference_library.py search --query "<relationship mechanism>"
python -X utf8 scripts/reference_library.py show --asset-id <ID>
python -X utf8 scripts/reference_library.py preview --asset-id <ID> --frames 12
```

Inspect the actual image or video contact sheet for the strongest candidates. Bind no more than three roles:

- `P`: palette/material behavior—where color and surface response come from;
- `C`: composition/type/spatial hierarchy—how attention and negative space are organized;
- `M`: motion/camera mechanism—how the meaningful action, interaction, or reveal unfolds.

One asset may supply multiple roles when that is genuinely the best match. For every role state `borrow` and `doNotCopy`. Do not bind a reference merely because its colors look attractive. Do not copy its brand, logo, wording, complete layout, character identity, or frame-by-frame choreography.

Reference priority is semantic and operational, not a separate rights or editorial hierarchy:

1. user-supplied material that directly matches the current explanation;
2. configured personal reference library;
3. creator library for reviewed mechanism discovery only if separately supplied and appropriately licensed; the public package does not include it;
4. bundled starter library for portable deterministic mechanisms.

If the first search is weak, reformulate the relation/mechanism query once. Do not browse a large creative menu indefinitely. No library match alone is not a reason to discard a strong opportunity: use a simple current-shot visual solution and an explicit `NEW` motion law when appropriate. If the shot remains unsolved, record that production limitation separately from its semantic value.

## 6. Library media use

Treat all configured libraries as eligible technical input sources:

- `starter`: deterministic upstream examples;
- `creator`: reviewed visual and motion examples;
- `personal`: locally configured reference media;
- `user-supplied`: media found in or explicitly supplied for the current project.

Any of these may be used as mechanism metadata or uploaded directly to RunningHub when it is the best semantic fit. Do not ask for commercial intent, do not require `rightsBasis`, and do not block by library origin or license category. Preserve `assetId`, selected P/C/M role, `borrow`, and `doNotCopy` as an audit trail and prompt-control contract only. They describe which visual mechanism is useful and which unrelated identity, wording, brand, layout, or choreography H3 should avoid copying.

## 7. Select direct references or generate endpoint frames

Reference-first means the current shot is visually solved before paid video generation. Depending on the mode, that means compiling a complete text-only visual solution for T2VA, generating controlled endpoint frames for I2VA/L2VA/FL2VA, or generating one current-shot-specific 2048×1152 primary reference for Ref2VA before adding complementary library references.

Choose one coherent style branch for a connected sequence. Style comes after semantic relationship. Suitable branches include editorial paper collage, cut-paper explainer, white diorama, tactile tabletop, restrained low-poly illustration, cinematic macro mechanism, or another grounded branch supported by the current subject. Do not rotate styles per shot for novelty.

When an endpoint-controlled mode is selected, create a clean 16:9 frame prompt from:

1. current unit's subjects and actual information relationship, including an explicitly illustrative scenario when appropriate;
2. the selected P/C mechanism descriptions;
3. the desired start or end state;
4. the video's established style branch;
5. central crop safety;
6. explicit no-copy constraints.

Use the image-generation capability to create the frame. Do not bake titles, captions, long copy, logos, watermarks, fake UI, or fake metrics into it. Exact information stays in Remotion above the H3 clip.

Validate and normalize every generated endpoint frame:

```powershell
python -X utf8 scripts/ensure_2k.py "<generated.png>" --output "<shot>-first-2K.png" --force
```

The endpoint source must already be 16:9; `ensure_2k.py` rejects a wrong aspect instead of stretching it. Inspect the resulting 2048×1152 frame for semantic accuracy, object count, continuity, crop safety, artifacts, and unintended text. If the image is wrong, regenerate or edit it; upscaling cannot repair content. For Ref2VA, Picture 1 is also a current-shot-specific 2048×1152 PNG; only the complementary Picture 2 may remain at a readable source dimension.

Generation-mode routing with the installed workflows:

- `I2VA` is the reference-first default: use one clean first frame when the endpoint may emerge naturally;
- `L2VA` when only the exact destination matters and the approach may emerge naturally; generate one matched last frame and prevent early result reveal in the prompt and retime plan;
- `FL2VA` when both starting and final spatial states must land exactly; generate a matched first/last pair with the same subject identity, object count, palette, camera, and geometry;
- `Ref2VA` when visual and motion examples add control that the endpoint modes cannot provide. The installed workflow has a fixed input contract: two non-endpoint reference images plus one reference video. Reference Picture 1 is node 19 (`ref_image_0`) and must be the generated current-shot-specific 2048×1152 content/layout/style solution. Reference Picture 2 is node 14 (`ref_image_1`) and supplies one non-duplicative library palette/material/composition mechanism. The reference video is node 28; its picture and embedded audio are both delivered to H3 and it is authoritative for the selected motion law, attention path, camera/depth behavior, and settling rhythm. Neither image is an exact first or last frame. This is not a variable-count multi-reference workflow;
- `T2VA` only when a visual frame would not improve control or image generation is unavailable.

Do not route to `Ref2VA` merely because a library match exists. Never submit two generic library images. Use the strongest semantically relevant library video as the M reference, trim one coherent 2-15 second segment, and map its visible motion beats to every current-shot phase. The motion video's do-not-copy boundary may reject identity, brand, wording, storyline, soundtrack, and unrelated content; it must not reject the chosen motion, camera, timing, choreography, or rhythm.

## 8. Build and audit the shot contract

Start from `assets/reference-first-h3-shot-template.json` schema version 3. Write one JSON file per H3 unit under `analysis/h3-shot-contracts/`. Regenerate old schema-v2 contracts instead of submitting them.

The contract must include:

- source timeline and narration anchors;
- route, template, motion pattern, and generation mode;
- the ready duration plan, whose `selectedDurationSeconds` equals `durationSeconds` and the final phase endpoint;
- the information relationship, pattern-selection rationale, primary motion law, readable trigger, attention path, and visible proof of completion;
- reference usage and P/C/M responsibility;
- P/C/M contract with library IDs and borrowed mechanisms;
- generated first/last frame paths as required by the mode;
- mode-specific current-shot reference role: exact first, exact last, endpoint pair, or Ref2VA content/layout/style;
- for `Ref2VA`, a current-shot Picture 1, complementary Picture 2, reference-video path, selected source range, and contiguous beat-to-phase map;
- one core idea and compatible setup/action-or-reveal/closing-state fields as defined in Section 3;
- three or four ordered H3 phases covering the generation duration, each naming its visible subject, action, and outcome;
- the absolute spoken clause anchoring every phase;
- crop, identity, camera, sound, and final-hold rules;
- Remotion foreground coexistence and duplicate-avoidance rules.

Run:

```powershell
python -X utf8 scripts/audit-reference-first-contract.py --contract "<shot.json>" --output "<shot>-audit.json"
python -X utf8 scripts/build-reference-first-h3-prompt.py --contract "<shot.json>" --output "<shot>-prompt.json"
```

Do not submit a paid job when the audit has errors.

## 9. Submit the existing workflow

The installed workflows already cover the complete current routing set:

```powershell
# T2VA
python -X utf8 scripts/runninghub-i2v.py --config config/runninghub-t2v.local.json --prompt-bundle "<prompt.json>" --output "<raw.mp4>" --job-record "<job.json>"

# I2VA
python -X utf8 scripts/runninghub-i2v.py --config config/runninghub-i2va.local.json --image "<first-2K.png>" --prompt-bundle "<prompt.json>" --output "<raw.mp4>" --job-record "<job.json>"

# FL2VA
python -X utf8 scripts/runninghub-i2v.py --config config/runninghub.local.json --image "<first-2K.png>" --last-image "<last-2K.png>" --prompt-bundle "<prompt.json>" --output "<raw.mp4>" --job-record "<job.json>"

# L2VA
python -X utf8 scripts/runninghub-i2v.py --config config/runninghub-l2va.local.json --last-image "<last-2K.png>" --prompt-bundle "<prompt.json>" --output "<raw.mp4>" --job-record "<job.json>"

# Ref2VA: exactly two non-endpoint reference images plus one video
python -X utf8 scripts/runninghub-i2v.py --config config/runninghub-ref2va.local.json --reference-image "<reference-1-2K.png>" --reference-image-2 "<reference-2-2K.png>" --reference-video "<motion-reference.mp4>" --prompt-bundle "<prompt.json>" --output "<raw.mp4>" --job-record "<job.json>"
```

The audited prompt bundle is the duration authority. The runner copies its `durationSeconds` into the configured workflow duration node and rejects a conflicting CLI value. Never pass `--aspect-ratio`, source width/height, output width/height, or megapixel overrides. Keep the workflow JSON's native `16:9 (Widescreen)` resolution. Resume a submitted task from its job record/task ID; do not pay for a duplicate submission because a local poll stopped.

## 10. Fine-align generated motion to narration

Generation duration should already fit the spoken interval. Map the returned H3 phases to the absolute narration anchors stored in the contract, using retiming only for model drift and final readability.

- The setup state may appear only when the setup clause begins.
- An action, interaction, or reveal may start only at its matching spoken anchor.
- A consequence must not appear before the result clause; a non-causal spatial reveal follows the clause that introduces that relationship without inventing a consequence.
- Hold the stable result through the spoken conclusion when useful.

Try 1.0x first. Trim only unusable model lead/tail frames, keep playback-rate correction within 10%, and keep a deliberate stable-result hold within 0.8 seconds. Never loop or reverse. If more correction is required, revise the semantic anchor/prompt or regenerate. Do not blindly start at the raw first frame if it is unusable. Store the fine mapping in `analysis/h3-retime-plans/<shot>.json`.

## 11. Compose with Remotion foreground

H3 is a borderless full-canvas layer above A-roll and below the foreground system. Use centered cover scaling; crop, never stretch. Preserve source-video resolution for the final Remotion composition.

Keep titles, captions, exact labels, and useful deterministic structures above H3. H3 makes the idea concrete or experiential; Remotion names and structures it precisely. Related meaning across these functions is valid reinforcement, not grounds for deletion. Simplify only an actually redundant visual treatment. Apply a localized dark gradient, shadow, or translucent support when readability needs it—do not remove the foreground because the background became busy.

Continue to run the existing foreground collision, placement, typography, SFX, Inspector, and renderer-pack validation. Reference-first H3 does not weaken those rules.

## 12. Completion checks

Before final rendering require:

- reference-library `status` reports four starter records and `ready_to_search: true`; zero creator records is normal in the public package;
- `analysis/foreground-plan.json` remains complete and every H3 candidate records its additive value plus retained foreground event IDs;
- `analysis/h3-opportunity-review.json` covers the requested semantic scenes with specific decisions and reasons; every selected candidate ID resolves, and operational blockers are not reported as creative rejection;
- every H3 shot uses schema v3 and has an error-free contract audit;
- every H3 shot has a ready duration plan and the same integer appears in its contract, final phase, prompt bundle, dry-run/job record, and RunningHub duration node;
- all referenced bundled IDs resolve;
- every generated frame is an actual 2048×1152 PNG and visually valid;
- prompt-bundle mode matches the selected RunningHub config;
- every prompt contains the chosen motion pattern as executable relationship, trigger, attention, and result language rather than metadata only;
- `Ref2VA` has exactly three configured inputs: a 2048×1152 current-shot Picture 1, a non-duplicative complementary Picture 2, and a readable 2-15 second M video with a complete beat-to-phase map;
- returned Ref2VA footage passes both semantic adherence and reference-motion adherence at 0%, 10%, 33%, 58%, 82%, and 100% samples;
- dry-run reports `durationSource: prompt-bundle`, `aspectRatio: null`, and workflow-native resolution;
- raw clips are 16:9 and useful audio has been assessed;
- requested versus actual H3 duration differs by no more than two source frames plus 0.15 seconds unless documented workflow padding applies;
- fine retime plans prevent early cause/result display and remain inside the 10% speed/0.8-second hold budget;
- full-screen H3 and Remotion foreground remain complementary and collision-free;
- final output matches the input video's encoded resolution.

The user's single edit command authorizes this internal pipeline for the requested video. Deliver the final rendered result and concise notes; do not stop to ask the user to approve the master plan, reference shortlist, frame, or H3 prompt unless a real blocker changes cost, workflow availability, required external assets, or meaning.
