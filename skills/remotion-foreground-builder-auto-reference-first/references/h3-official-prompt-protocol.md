# MiniMax H3 Official Prompt Protocol

Follow MiniMax H3's official generation-mode structure, then apply the foreground director's semantic and full-screen crop constraints.

Read `h3-duration-director.md` and then `h3-five-mode-prompt-compiler.md`. They define the mandatory pre-generation duration decision and schema-v3 mode envelopes and supersede the older abbreviated prompt examples below whenever they differ.

## Choose the generation mode

- `T2VA`: use text only when no identity, first-frame composition, or exact endpoint must be locked.
- `I2VA`: supply one approved first frame to lock identity, style, or opening composition while allowing the ending to develop freely.
- `L2VA`: supply one approved last frame when the destination must be exact but the approach may develop freely.
- `FL2VA`: supply approved first and last frames when a causal transformation must land on a controlled final state.
- `Ref2VA`: use the installed reference workflow only when visual and motion examples add useful control. It requires one current-shot-specific 2048×1152 primary image, one complementary non-endpoint reference image, and one authoritative motion-reference video; the video's picture and embedded audio are both passed through the workflow.

The installed execution paths cover `T2VA`, `I2VA`, `L2VA`, `FL2VA`, and `Ref2VA`. `Ref2VA` is a fixed three-input path—two images plus one video—not an arbitrary multi-reference interface.

In this reference-first branch, use `I2VA` by default after generating a clean first frame. Use `L2VA` when only the result must be locked, `FL2VA` when both endpoints must be locked, `Ref2VA` when complementary visual-and-motion reference control is genuinely necessary, and `T2VA` only when a frame would not improve control. Read `reference-first-integration.md` before building the shot.

## Reference mechanism contract

Before writing motion language, retrieve and inspect candidates from the bundled or personal library, then bind at most P palette/material, C composition/spatial hierarchy, and M motion/camera. The contract must state both the borrowed mechanism and what cannot be copied. File names alone are not a reference description.

The bundled creator/starter library may supply Ref2VA Picture 2 and the motion video as well as mechanism metadata. Picture 1 must solve the current shot itself. Do not ask for commercial intent or `rightsBasis`, and do not block upload by library origin. `doNotCopy` remains a semantic boundary for irrelevant identity, brand, wording, storyline, and soundtrack—not a permission check. For the selected M video it must not prohibit the chosen motion, timing, camera, choreography, or rhythm. Exact titles, captions, data, and UI remain Remotion foreground.

## Required formats

Every mode uses a distinct input-responsibility preamble compiled by `build-reference-first-h3-prompt.py`, followed by these fields:

```text
integrated_multimodal_description: [Shot 1] ...
overall_soundscape: ...
non_diegetic_music: ...
```

The preamble must identify one of five contracts: text-only synthesis, exact first frame, exact last frame, exact endpoint pair, or reference-video mapping. It must not reuse the I2VA wording for another mode.

```text
How the reference pictures align with the timeline: Picture 1 is the first frame at 0.00 seconds; Picture 2 is the last frame at the audited selected duration.

integrated_multimodal_description: [Shot 1] ...
overall_soundscape: ...
non_diegetic_music: ...
```

For `L2VA`, state that Picture 1 is the exact last frame at the selected duration and that the result must not be revealed early. For `Ref2VA`, state the exact role of every fixed input and compile the reference video's selected source range plus beat-to-current-phase mapping before the same three fields.

```text
Reference-video input contract: Picture 1 is the current-shot-specific content/layout/style reference. Picture 2 supplies one non-duplicative visual mechanism. Reference Video 1 is authoritative for the selected motion law, attention order, camera/depth behavior, and settling rhythm. Map its inspected beats to the current-shot phases while replacing only its content identity.

integrated_multimodal_description: [Shot 1] ...
overall_soundscape: ...
non_diegetic_music: ...
```

Write the descriptive body in clear English. Preserve intentionally visible Chinese text exactly in double quotes, but route critical text and data to Remotion.

## Motion choreography

- Anchor the observable initial composition and subject identities.
- Describe three or four ordered phases with explicit time windows.
- Use concrete subjects, verbs, paths, interactions, state changes, and stop positions.
- Use one continuous shot, one primary action, and one restrained camera move followed by a settle.
- Give the result a stable hold.
- Avoid loops, reversals, object multiplication, camera spins, decorative motion, and early final-state reveal.

## Full-screen 16:9 composition

Generate through the workflow's native `16:9 (Widescreen)` resolution selector. Keep the essential subject, causal action, and final state inside the center crop-safe region so the shot remains understandable when Remotion uses centered cover on a narrower output canvas. Put only expendable environment detail near the left and right edges.

Default to one core idea, four to seven meaningful elements introduced over time, and no more than two supporting groups at once. Do not bake foreground titles, captions, long Chinese copy, UI labels, logos, or watermarks into H3.

## Sound

Use `overall_soundscape` for quiet diegetic or tactile sounds synchronized with visible events. Use `non_diegetic_music: N/A` while narration is primary. Reject generated speech, music, or noisy ambience.

## Build and submit

Plan duration from the selected candidate first, create a schema-v3 contract from `assets/reference-first-h3-shot-template.json`, audit it, then compile it:

```powershell
python -X utf8 scripts/audit-reference-first-contract.py --contract "<shot-contract.json>" --output "<shot-audit.json>"
python -X utf8 scripts/build-reference-first-h3-prompt.py --contract "<shot-contract.json>" --output "<h3-prompts.json>"
```

Submit `T2VA`:

```powershell
python scripts/runninghub-i2v.py --config config/runninghub-t2v.local.json --prompt-bundle "<h3-prompts.json>" --output "<raw.mp4>" --job-record "<job.json>"
```

Submit `I2VA`:

```powershell
python scripts/runninghub-i2v.py --config config/runninghub-i2va.local.json --image "<first.png>" --prompt-bundle "<h3-prompts.json>" --output "<raw.mp4>" --job-record "<job.json>"
```

Submit `FL2VA`:

```powershell
python scripts/runninghub-i2v.py --config config/runninghub.local.json --image "<first.png>" --last-image "<last.png>" --prompt-bundle "<h3-prompts.json>" --output "<raw.mp4>" --job-record "<job.json>"
```

Submit `L2VA`:

```powershell
python scripts/runninghub-i2v.py --config config/runninghub-l2va.local.json --last-image "<last.png>" --prompt-bundle "<h3-prompts.json>" --output "<raw.mp4>" --job-record "<job.json>"
```

Submit `Ref2VA`:

```powershell
python scripts/runninghub-i2v.py --config config/runninghub-ref2va.local.json --reference-image "<reference-1.png>" --reference-image-2 "<reference-2.png>" --reference-video "<motion-reference.mp4>" --prompt-bundle "<h3-prompts.json>" --output "<raw.mp4>" --job-record "<job.json>"
```

The audited prompt bundle supplies the selected duration to the workflow duration node; a conflicting `--duration` is rejected. Do not pass `--aspect-ratio`, width, height, megapixels, or the final composition resolution. The workflow JSON already defines the safe native resolution. Resume an interrupted paid task with `--task-id`; never resubmit it merely because the local process stopped.
