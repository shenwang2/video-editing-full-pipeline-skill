# MiniMax H3 Full-Screen Layer

Use H3 as a full-screen semantic background takeover beneath the complete Remotion foreground system.

## Selection

Choose H3 for one concrete transformation that makes an abstract spoken idea easier to understand: mechanism, cause/effect, process, state change, scenario, spatial relation, or emotional consequence. Use real evidence for claims of fact and Remotion for exact text, numbers, interfaces, lists, and diagrams. One H3 shot teaches one core idea.

This upgraded branch is reference-first. After the H3 gate passes, follow `reference-first-integration.md`: retrieve P/C/M mechanisms, select direct library inputs or create clean 16:9 endpoint assets as required by the chosen mode, audit a v2 shot contract, then submit one of the five installed workflows. Bundled creator/starter media may be uploaded directly when it fits the shot; there is no commercial-intent or rights-declaration gate.

Apply this decision tree to every automatically detected semantic unit:

1. Ask what the viewer must understand, verify, remember, or feel at this exact moment.
2. If the claim requires proof from a real interface, dashboard, comment, recording, document, result, or metric, route to real external material and do not generate H3.
3. If exact words, numbers, labels, order, comparison, taxonomy, or diagram geometry carry the meaning, route the payload to deterministic Remotion foreground. H3 may support only when a separate concrete background action adds understanding.
4. If the speaker's expression, gesture, personal position, credibility, or pause is the strongest picture, keep the talking head and do not generate H3.
5. If an invisible idea can become one faithful observable starting state, one causal action, and one stable result, select H3.
6. Reject H3 when the unit needs several unrelated actions, exact generated text, invented evidence, or a visual metaphor that could misstate the explanation. Split the unit or keep it in Remotion instead.
7. Record why H3 teaches more than the speaker plus foreground. Do not select it for decoration, coverage quotas, fixed intervals, or template rotation.

Use the existing T01-T21 library as semantic grammar. Strong H3 candidates commonly include T02 concept hero, T05 relation flow, T06 visible consequence, T09 spatial hierarchy, T12 system diorama, T13 two-role interaction, T14 visual before/after, T17 assembly, T18 spatial network, and T21 mechanism. Exact-text grammars such as kinetic statements, number impact, chapter sequences, keyword strips, taxonomies, and technical timelines usually remain deterministic Remotion unless H3 supplies a separate physical background explanation.

## Generation mode

- Use `I2VA` as the reference-first default when an original approved first frame locks style, identity, and opening composition while the result may develop freely.
- Use `L2VA` when only the exact final state matters and the preceding motion may develop freely.
- Use `FL2VA` when both the starting and final states must be controlled.
- Use `Ref2VA` only when visual and motion references materially improve control. The installed workflow requires two complementary non-endpoint reference images plus one reference video; the video's picture and embedded audio are both used. Direct bundled-library inputs are allowed. It does not accept a free-form list of references.
- Use `T2VA` when no useful frame can or should be locked.

Generate or select endpoint images in 16:9. Place the essential subject and action near the horizontal center, with enough surrounding context to tolerate a centered vertical crop. Avoid critical objects, readable text, or causal events near the left and right edges. Ref2VA reference images are non-endpoint inputs and may retain their source image format and dimensions.

## Workflow-native resolution contract

The final video and H3 generation use independent resolutions.

- Final Remotion output: exact input-video width and height.
- H3 source: workflow JSON's own resolution selector and megapixel setting.
- H3 aspect: the workflow JSON's existing `16:9 (Widescreen)` value.

Never copy source-video width, height, megapixels, or delivery resolution into RunningHub. Never pass `--aspect-ratio` during normal submission. Keep node 16 untouched. A larger final video does not authorize a larger H3 request. Scale the downloaded H3 clip only inside Remotion.

Run a dry test before the first paid request for each workflow:

```powershell
python scripts/runninghub-i2v.py --config config/runninghub-t2v.local.json --prompt "test" --output out/test.mp4 --dry-run
```

Require `aspectRatio` to be `null` in dry-run output; this means the runner sends no override and preserves workflow-native settings. Independently inspect node 16 in the workflow JSON and require `16:9 (Widescreen)`.

Before the dry test, require `scripts/audit-reference-first-contract.py` to report `valid: true` and compile the prompt with `scripts/build-reference-first-h3-prompt.py`.

## Prompt composition

Follow `h3-official-prompt-protocol.md`. Use one continuous shot, one primary state change, three or four causal phases, one restrained camera movement followed by a settle, and a stable result hold. Put exact foreground words in Remotion, not H3. State the crop-safety requirement explicitly in `cropSafetyEn`.

## Semantic retiming

Treat the returned clip as source motion. Map narration into setup, action, and result beats. Trim, slow modestly, freeze a meaningful frame, and resume playback as needed. Never show the generated consequence before the corresponding spoken clause. Hold the final state through the spoken conclusion when useful.

## Full-screen composition

Place the source video at the bottom. During the H3 interval, place the H3 clip above it with full-canvas absolute positioning, width and height 100%, centered `object-fit: cover`, no border, no radius, no shadow frame, and no outer gap. Keep the required Remotion title, middle information, structured foreground, and captions above it.

Use an adaptive readability treatment only where needed: localized dark gradient, soft text shadow, or small translucent support. Do not remove foreground information merely because H3 is present. If H3 and a foreground graphic repeat the same idea, keep H3 for the concrete action and simplify the foreground to exact labels or the decisive relationship.

## Acceptance

- workflow node 16 remains unchanged;
- generated clip is 16:9 at workflow-native resolution;
- full-screen cover has no letterbox, frame, or stretching;
- central action survives crop at the final source resolution;
- H3 state changes follow exact spoken anchors;
- foreground information remains readable and semantically complementary;
- generated speech, music, fake UI, fake metrics, and text artifacts are absent or rejected;
- interrupted paid jobs resume from their recorded task ID instead of being resubmitted.
