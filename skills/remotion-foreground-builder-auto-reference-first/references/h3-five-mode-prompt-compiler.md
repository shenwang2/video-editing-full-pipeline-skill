# H3 five-mode prompt compiler

Read `h3-duration-director.md` first, then read this file before creating any H3 shot contract or prompt. It is the active prompt-compilation specification for T2VA, I2VA, L2VA, FL2VA, and Ref2VA. It preserves the useful prompt-production logic from the upstream reference-first project while keeping this Skill's Remotion director, automatic one-command workflow, and installed RunningHub mappings.

## Purpose

A mode name is not a complete prompt. Every H3 prompt must be compiled from:

1. the exact spoken knowledge point and viewer inference;
2. the true information relationship;
3. one matching M01-M10 motion pattern or an explicitly defined new mechanism;
4. a current-shot-specific visual solution when the mode accepts images;
5. traceable P/C/M reference mechanisms;
6. a ready semantic duration plan selected before frame/prompt generation;
7. three or four object-action-outcome phases covering that duration exactly;
8. the chosen workflow's exact input responsibilities;
9. a stable result and narration-aligned final hold.

Use `assets/reference-first-h3-shot-template.json` schema version 3 and compile it with `scripts/build-reference-first-h3-prompt.py`. Schema-v2 contracts are legacy artifacts and must be regenerated before a new job.

Selection is governed by `reference-first-integration.md`, not by the historical wording of contract keys. Keep `causalActionEn` as a compatible field for the central meaningful action, role interaction, or reveal; do not fabricate causality. `resultStateEn` may describe an existing relationship made visible. A scene, concept embodiment, or spatial reveal need not transform its objects. Use a matching pattern or `NEW` and retain the same timing, evidence, input, and audit requirements.

## 1. Lock the information relationship before choosing motion

Use `motionPatternContract.relationshipType` to prevent a visually attractive but semantically reversed motion:

| Pattern | Required relationshipType | Meaning |
|---|---|---|
| M01 | `continuous-journey` | one continuous software or spatial journey |
| M02 | `same-layout-state-change` | the same composition changes state |
| M03 | `many-to-one` | several inputs assemble into one result |
| M04 | `one-to-many` | one input creates several ordered outputs |
| M05 | `structured-reveal` | a structured title or three-part frame is built |
| M06 | `region-to-result` | selected regions drive one edited result |
| M07 | `cumulative-evidence` | evidence accumulates without replacing earlier evidence |
| M08 | `rank-change` | one item moves through a real ordering |
| M09 | `collection-traversal` | a collection travels or changes groups |
| M10 | `single-claim-impact` | one central claim is constructed and locked |
| NEW | current relationship | no existing pattern fits; define a new mechanism |

Do not select M03 for one source splitting into multiple outputs. Do not select M04 for multiple inputs becoming one result. When no pattern direction matches, use `NEW` rather than reversing a known pattern.

The motion pattern is executable prompt content, not metadata. Complete all fields:

- `relationshipStatement`
- `selectionRationale`
- `primaryLawEn`
- `triggerEn`
- `attentionPathEn`
- `resultProofEn`

The compiler inserts them into the final H3 prompt.

## 2. Solve the current shot before choosing workflow inputs

For modes that accept images, create a clean current-shot-specific 2048x1152 PNG from the actual spoken subject and relationship. It must not be a generic library image. It may represent an exact endpoint or a non-endpoint content/layout/style reference according to the mode.

The current-shot image establishes the actual objects, object count, spatial relationship, material hierarchy, camera, and crop safety. Library assets supplement this solution; they do not replace it.

### T2VA

Use when no image should control the model. The prompt must:

- synthesize only the named subjects and grounded information relationship/action or reveal;
- prohibit an additional storyline or second motion law;
- fully describe composition, material, phases, camera, and result in text;
- keep reference-library mechanisms as prompt knowledge only, not workflow inputs.

### I2VA

Picture 1 is the exact first frame at 0.00 seconds. The prompt must:

- state the exact opening state;
- list identity, object-count, palette, material, and camera locks;
- state which objects may depart from the frame and how;
- let the result emerge through the selected motion law.

### L2VA

Picture 1 is the exact last frame at the selected duration. The prompt must:

- reverse-plan a plausible earlier state;
- forbid early reveal, duplication, or a close approximation of the result;
- specify the arrival path and final convergence;
- hold the exact result during the final phase.

### FL2VA

Picture 1 is the exact first frame and Picture 2 is the exact last frame. The prompt must:

- maintain one-to-one subject identity and object correspondence;
- define one continuous `endpointTransitionEn`;
- prohibit crossfade, dissolve, subject replacement, uncontrolled morphing, or early last-frame reveal;
- land exactly on Picture 2 and hold.

### Ref2VA

The installed workflow has exactly two reference images and one reference video:

- Picture 1: a current-shot-specific 2048x1152 PNG carrying the actual content relationship, subject, composition, and style hierarchy. Set `currentShotReference: true`.
- Picture 2: one complementary library or user reference for palette, material, composition, or subject treatment. Set `currentShotReference: false`.
- Video 1: the authoritative M reference for the selected motion law, attention order, camera behavior, depth behavior, and settling rhythm.

Do not submit two generic library images. Do not let Picture 2 duplicate Picture 1's job. The motion video's `doNotCopy` may exclude subject identity, brand, wording, storyline, soundtrack, and unrelated content; it must not exclude the selected motion, timing, camera, choreography, or rhythm.

## 3. Map a Ref2VA video into current-shot phases

Watching a contact sheet is not enough. Record one coherent `sourceFrom`-`sourceTo` range and a contiguous `motionBeats` list. Every beat states:

- reference-video `from` and `to`;
- the visible motion/camera/attention mechanism;
- the current-shot phase index that inherits it.

The beats must cover the selected reference range and all current phases. The compiler writes an explicit reference-to-current mapping into the prompt. This prevents a vague phrase such as “borrow the motion rhythm” from being overridden by unrelated choreography.

## 4. Carry one audited duration end to end

Use `scripts/plan-h3-duration.py` before writing phases. The candidate's exact narration span, meaningful strong-event count, continuous-process flag, and selected M pattern decide an integer 3-15 second generation duration. A generic five-second default is invalid. Copy the ready plan into the shot contract and require one identical value at `durationSeconds`, `durationPlan.selectedDurationSeconds`, the last phase `to`, the compiled prompt bundle, and the RunningHub duration node.

The contract audit rejects an overbroad anchor that cannot directly fit within the larger of one second or 15% of its spoken span. Tighten or split it before generation.

## 5. Compile object-action-outcome phases

Use exactly one of these phase sequences:

- 3 phases: `establish → transform → result-hold`
- 4 phases: `establish → trigger → transform → result-hold`

Each phase must name:

- `subjectEn`: what visible object acts;
- `actionEn`: what it does;
- `outcomeEn`: what state or understanding that action produces;
- exact raw-video time range;
- exact narration anchor.

The final phase must hold for at least 0.6 seconds. Phases are temporal packaging, not three/four mandatory causal events. For a spatial reveal, `transform` can expose an unchanged relationship through the camera; `result-hold` keeps it readable. Each progression must follow the established scene and spoken meaning; do not append unrelated effects or add a physical transformation merely to satisfy a role name.

## 6. Audit before submission

Run:

```powershell
python -X utf8 scripts/audit-reference-first-contract.py --contract "<shot-v3.json>" --output "<shot-v3-audit.json>"
python -X utf8 scripts/build-reference-first-h3-prompt.py --contract "<shot-v3.json>" --output "<shot-v3-prompt.json>"
```

Do not submit when the audit fails. The audit checks:

- motion-pattern relationship direction;
- ready dynamic-duration plan, source-span fit, and phase endpoint equality;
- mode-specific current-shot reference role;
- exact endpoint requirements;
- Ref2VA's current-shot Picture 1, complementary Picture 2, and reference video;
- Ref2VA beat-to-phase coverage;
- attempts to neutralize the selected M reference;
- 2048x1152 endpoint/current-shot image dimensions;
- narration ordering and final hold;
- foreground coexistence.

## 7. Inspect the returned clip against semantic, motion, and duration contracts

For every returned H3 clip, first probe actual duration and compare it with the request. More than two source frames plus 0.15 seconds of unexplained drift is a generation/workflow failure. Then inspect frames near 0%, 10%, 33%, 58%, 82%, and 100%.

Check two separate questions:

1. Semantic adherence: do the correct current-shot subjects show the intended action, interaction, contrast, or reveal and reach the intended readable state, without inventing a factual consequence?
2. Reference-motion adherence: does the returned clip preserve the selected M reference's attention order, movement topology, camera/depth behavior, phase boundaries, and settling rhythm?

A visually attractive semantic result is not sufficient when Ref2VA ignores the selected motion reference. Find the first divergence and change only its primary upstream cause: wrong pattern, weak current-shot image, wrong reference range, vague beat mapping, conflicting do-not-copy boundary, or conflicting choreography.

When the edit request already authorizes H3 generation, allow at most one automatic paid repair attempt for a hard semantic or reference-motion failure. Record both task IDs and the changed upstream field. Never enter an unbounded regeneration loop; if the repair still fails, keep the deterministic Remotion explanation and report the H3 miss.
