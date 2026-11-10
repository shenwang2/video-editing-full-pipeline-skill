# H3 dynamic duration director

Read this file after an H3 candidate and its motion pattern are selected, but before endpoint-frame generation, phase writing, prompt compilation, or RunningHub submission. Generation duration is a semantic directing decision. Five seconds is not a default shot length.

## Required outcome

Every accepted H3 candidate must produce `analysis/h3-duration-plans/<shot-id>.json`. The selected integer duration must then be copied unchanged into:

1. `shot-contract.durationSeconds`;
2. `shot-contract.durationPlan.selectedDurationSeconds`;
3. the final phase's `to` value;
4. the compiled prompt bundle's `durationSeconds`;
5. the RunningHub duration node.

`scripts/runninghub-i2v.py` reads the duration from the audited prompt bundle. Do not rely on a workflow config's legacy default, and do not manually pass a different value.

## Candidate inputs

Before planning duration, enrich each selected item in `analysis/h3-candidates.json` with:

- exact `startMs` and `endMs` for the clause that the H3 shot actually explains, not an entire loose Section;
- one `motionPattern` (`M01`-`M10` or `NEW`);
- `strongEvents`: the meaningful visible changes that must occur, excluding the passive opening pose and the final still hold;
- `continuousProcess: true` only when the meaning genuinely requires an uninterrupted multi-stage process.

Each strong event records a short label and its absolute `narrationAtMs`. A reveal that makes a previously hidden spatial relationship readable, a role interaction, or a meaningful reaction can count without a physical transformation. Camera motion alone, particles, decorative transitions, and the result hold do not count. Count the information revealed, not each camera movement or each prompt phase.

Run:

```powershell
python -X utf8 scripts/plan-h3-duration.py --candidate analysis/h3-candidates.json --shot-id <shot-id> --output analysis/h3-duration-plans/<shot-id>.json
```

If the result is `refine-anchor`, tighten the candidate to the actual clause supporting the action, interaction, or reveal and rerun. If it is `split-shot`, divide the candidate at a semantic completion boundary and plan each shot separately. Do not submit until every shot returns `ready`.

## Duration classes

Use content complexity first and narration fit second:

| Class | Semantic shape | Normal range |
|---|---|---|
| `single-impact` | one state switch, one reveal, one match transition, or one claim impact | 3-5 seconds |
| `short-sequence` | 2-4 strong visible events, a compact comparison, assembly, or step reveal | 6-9 seconds |
| `continuous-process` | 5-6 strong events, a continuous operation, complete generation process, or multi-stage causal progression | 10-15 seconds |

The upstream eight-second rhythm is only a useful center for a 2-4-event short sequence. It is not a replacement fixed duration.

Motion-pattern tendencies are additional evidence, not overrides:

- `M01`: 6-10 seconds;
- `M02`: 4-5 seconds;
- `M03`: 7-9 seconds;
- `M04`: 3-5 seconds;
- `M05`: 3-4 seconds;
- `M06`: 7-9 seconds;
- `M07`: 4-6 seconds;
- `M08`: 3-4 seconds;
- `M09`: 5-7 seconds;
- `M10`: 3-5 seconds;
- `NEW`: use the selected duration class and explain the new mechanism.

The planner combines strong-event count, motion-pattern tendency, and exact narration span, then chooses one integer duration supported by the workflow. A shot longer than 15 seconds or containing more than six strong visible events must be split instead of compressed into one generation.

## Phase writing

Only after duration is ready, write three or four contiguous phases that cover it exactly:

- `establish` makes the starting relationship readable quickly;
- optional `trigger` begins the meaningful action or reveal;
- `transform` carries every strong event in narration order, including interaction or revelation of an unchanged relationship;
- `result-hold` keeps the final relationship or state readable for at least 0.6 seconds.

These existing role names are temporal contract fields, not a requirement to invent causality or three/four strong events. One spatial reveal can use establish/reveal/hold with the compatible roles `establish`/`transform`/`result-hold`.

Write the selected duration explicitly in the prompt. Do not reuse a 0.00-5.00 phase skeleton and stretch it after generation.

## Direct timeline fit

The H3 candidate interval and generated duration should already be close enough for normal-speed placement. The contract audit requires the difference to stay within the larger of one second or 15% of the narration span.

The default retime policy is:

- place the returned clip at 1.0x first;
- trim only unusable model lead-in or tail frames;
- allow playback-rate correction of at most 10%;
- allow at most 0.8 seconds of deliberate stable-result hold;
- never loop or reverse generated motion;
- regenerate or revise the candidate when a larger correction is required.

Retime remains useful for model drift and final-frame readability, but it must not compensate for a generic five-second generation.

## Output verification

Probe the returned file before building the retime plan. Record requested and actual duration. A difference above two source frames plus 0.15 seconds is a generation/workflow failure unless the workflow documents deterministic padding. Do not silently repair a materially wrong output duration with Remotion speed changes.
