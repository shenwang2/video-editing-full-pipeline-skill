# H3 opportunity review

Read this before selecting or rejecting H3, including a zero-shot outcome. This is an additive creative review, not a second whole-video director. Keep the complete semantic timeline and foreground plan authoritative.

## Consider a picture before deciding

For each requested scene, read its corrected spoken beats, not just its relationship tag or title. Imagine a concrete scene that could make this particular point easier to understand, feel, or remember. A spatial reveal, role interaction, contrast, reaction, or clearly illustrative metaphor is as eligible as a mechanism. Do not manufacture an idea for a greeting or routine instruction with no useful visual opportunity.

For a plausible idea, describe what is seen, what changes or is revealed, and what the viewer gains. Then compare that picture with the actual retained foreground and real footage. “Remotion already explains it” is not a rejection by itself: naming a relationship and showing it can complement each other. “More cinematic” is not a benefit by itself either. The reason must explain this scene's additional value or the concrete redundancy, truth risk, presenter value, or timing/readability tradeoff.

Examples of the distinction, not a required shot menu:

- For narrowing a search, a clearly illustrative field of material sorting into a relevant route may make selection visible while Remotion carries the exact keyword. Do not fabricate the product's actual search interface or results.
- For an actual click sequence, the supplied recording may already show the action and outcome more faithfully than an invented scene. Cite that sequence, not a blanket rejection of all process scenes.
- For a personal closing appeal, keeping the presenter's expression may serve the spoken point better. No replacement illustration is required.

Record creative value before production feasibility. An idea worth making but blocked by missing assets, authorization, budget, or workflow belongs in `blocked`, not `not-selected`. Do not generate it until the blocker is resolved. Never infer paid-generation authorization from an audit or a selected decision.

Do not derive decisions with a relationship-tag switch, pre-fill every decision with `not-selected`, or paste the same stock reason over unrelated narration. Code may serialize independently made decisions; it must not substitute for the creative comparison. If the whole pass selects nothing, briefly revisit the strongest plausible rejected ideas (if any) and check that they were rejected on their actual value, not because foreground was already complete. Keeping zero is valid. No quota, mandatory metaphor, reference search, or generation is required for rejected scenes.

## Compact record and audit

Keep `analysis/h3-opportunity-review.json` as an object containing `opportunities`, one entry per requested semantic scene:

- `sceneId`, `startMs`, `endMs`: ID and exact full-scene bounds from `semantic-timeline.json`.
- `anchorText`: corrected spoken wording relevant to the decision, not a scene-title paraphrase.
- `visualOpportunity`: concrete picture description, or explicit `null` when none is useful.
- `benefit`: specific comprehension/emotional/memory gain, or `null` with no opportunity.
- `foregroundCoexistence`: when an opportunity exists, describe what exact foreground/real material remains and how the shot fits; identify a metaphor as illustrative. This is a string, not a permission to delete foreground.
- `decision`: `selected`, `not-selected`, or `blocked`.
- `reason`: the scene-specific comparison. A rejected plausible picture can retain its opportunity and benefit.
- `candidateIds`: unique accepted IDs, empty unless selected.
- `blocker`: non-empty explanation only when blocked (otherwise omit or null).

Always write `analysis/h3-candidates.json`, including `{"selected": []}` for zero shots. Each selected candidate retains the downstream duration/prompt fields and additionally has `id`, `sceneId`, and `sourceAnchor: {"startMs": ..., "endMs": ..., "anchorText": "..."}`. Its narrower spoken interval must fit within its reviewed scene. Every candidate must be referenced by that scene's selected decision; do not place blocked ideas in `selected`.

Run from the authoritative director before reference/frame generation and again before a newly prepared project is rendered or handed off:

```powershell
python -X utf8 scripts/audit-h3-opportunities.py <work-project>/analysis --output <work-project>/analysis/h3-opportunity-audit.json
```

The default expected scope is **all scenes in the semantic timeline**. Only for an explicitly user-requested subset, pass repeated `--scope-scene <id>` arguments for that subset; do not shrink the audit scope to match a deficient review. The audit also requires the completed `foreground-plan.json` to be present. Re-run after semantic timing or scope changes; an old report is not a pass for changed data.

Errors block H3 production and new project handoff until repaired. Warnings about repeated reasons prompt a real reread, not cosmetic rewording. A structurally valid blocked entry is allowed in an honest placeholder handoff, but disclose its unresolved blocker and never claim H3 production is complete. An all-zero suitable rejection pass succeeds.

This audit validates coverage, required records, timing, and decision/candidate consistency. It cannot certify the quality of an idea, transcript accuracy, or actual foreground retention. The agent must still perform the narrated comparison and inspect the retained plan; `valid: true` is not proof of good creative judgment.
