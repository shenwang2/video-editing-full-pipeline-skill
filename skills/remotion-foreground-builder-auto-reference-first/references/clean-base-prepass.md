# Clean Base Prepass

Run this decision phase before semantic segmentation, Remotion directing, H3 directing, subtitle styling, SFX placement, or material timing. It selects either a cleaned original-resolution base plate or the unchanged raw source as the single downstream working base and timeline.

## 0. Ask first

Before cut detection, ASR used solely for cutting, or clean-base rendering, ask:

`是否先处理原视频（剪气口、明显口误、重复内容）？请选择：要 / 不要。`

- Do not infer a choice or start expensive preprocessing while waiting.
- If the current request already explicitly says `要` or `不要`, accept it without asking again.
- If an edit-desk caller has already collected and passed the choice, do not ask a second time.
- Write `analysis/preprocessing-choice.json` with the selected mode, source fingerprint, `workingBase`, and `workingTimeline` identity.
- `要` continues through Sections 1-6 below.
- `不要` skips Sections 2-5: do not cut, transcode, remux, or render a replacement. The raw source is the `workingBase`, raw milliseconds are the `workingTimeline`, and no cut map is created or applied. Use a reliable same-folder timing file when available; otherwise run ASR for semantic timing only. Validate source readability, geometry, duration, audio, and identity timing before directing.

## 1. Contract

Inputs:

- one explicitly selected raw talking-head video;
- optional script or subtitle used only to recognize wording and retakes;
- raw word-level ASR with `startMs` and `endMs`;
- acoustic silence/breath candidates from the raw audio.

Required outputs when the answer is `要`:

- `analysis/transcript.raw.words.json` (from `transcribe-words.py`);
- `analysis/clean-cut-candidates.json` and `analysis/clean-cut-review.md` (from `propose-clean-cuts.py`);
- `analysis/clean-edit-decisions.json` (from `propose-clean-cuts.py finalize`);
- `analysis/cut-map.json`;
- `media/clean-base.mp4`;
- `analysis/transcript.clean.words.json` after a clean-base ASR pass.

Never overwrite the raw source. After `要`, `media/clean-base.mp4` becomes the working background and clean timestamps become the working timeline. After `不要`, the raw source and raw timestamps remain those authorities.

## 2. Decide cuts from sound plus meaning

The mechanical work is scripted; the model only judges ambiguous spans. Run these four steps in order (paths relative to the work project; scripts under this Skill's `scripts/`):

```powershell
# 1. Word-level ASR on the raw source (faster-whisper large-v3 by default; --backend funasr for Paraformer)
python -X utf8 scripts/transcribe-words.py --input <raw.mp4> --output analysis/transcript.raw.words.json

# 2. Candidates + review sheet (acoustic energy + word timing + text patterns)
python -X utf8 scripts/propose-clean-cuts.py propose --words analysis/transcript.raw.words.json --media <raw.mp4> --output analysis/clean-cut-candidates.json

# 3. Read analysis/clean-cut-review.md, then record judgements for the 待定 items only
python -X utf8 scripts/propose-clean-cuts.py decide analysis/clean-cut-candidates.json --cut C004,C009 --keep C012
#    optional: a mistake-and-correction the detectors missed
python -X utf8 scripts/propose-clean-cuts.py decide analysis/clean-cut-candidates.json --add-cut 12340-13020:mistake-correction:"说错价格后立刻改口"

# 4. Validated decision file (refuses while any 待定 remains or if a cut would clip a retained word)
python -X utf8 scripts/propose-clean-cuts.py finalize analysis/clean-cut-candidates.json --output analysis/clean-edit-decisions.json
```

What the proposer does, so the review can stay short:

- Builds a 20 ms energy envelope with an adaptive silence threshold and trims ASR word edges that run into silence (Whisper often stretches word ends across pauses).
- `dead-air`: a pause longer than `--min-gap-ms` (320) is shortened to a natural remaining gap — about 280 ms after a sentence end, 210 ms after a clause, 160 ms inside a clause, never less than 70 ms beside a retained word. Only acoustically confirmed silence (≥ 90 % silent windows) and leading/trailing silence are cut automatically.
- `breath-gap`: a pause containing only a short quiet sound → 待定, suggested cut.
- `unlabeled-sound`: a pause containing sound ASR did not transcribe (a filler, a missed word) → 待定, suggested keep; listen before cutting.
- `filler-word`: 嗯/呃/额/唔 → 待定, suggested cut; standalone 啊/哦 between pauses → 待定, suggested keep.
- `duplicate-phrase`: the same word sequence spoken twice in a row; the earlier take is the cut. Emphasis (非常非常) and single-character reduplication (谢谢/看看 from character-level ASR) are suggested keep.
- `abandoned-retake`: a short fragment, a pause, then a restart sharing its opening ("今天我们… 今天我们要讲").
- A semantic cut spans the pauses around it. If that semantic candidate is judged keep, `decide` automatically restores the pause candidates it had absorbed (ids like `C004.1`).
- `finalize` merges overlapping cuts and gives back silence when a merge would leave a sentence or clause boundary shorter than its natural gap.

Judgement rules for the 待定 items and for overriding any 自动剪 item:

- Preserve intentional pauses, comic or emotional timing, emphasis, uncertainty that affects meaning, sentence-boundary rhythm, and every interval whose removal is ambiguous. Do not chase a target duration or percentage reduction.
- `mistake-correction` (an obvious wrong phrase followed immediately by its intended correction) is not detected automatically; scan the review sheet for it and add it with `--add-cut`.
- `--accept-suggestions` resolves every remaining 待定 item with its suggestion; use it only after reading the sheet.

Allowed reasons in the decision file: `dead-air`, `breath-gap`, `filler-word`, `abandoned-retake`, `mistake-correction`, `duplicate-phrase`.

## 3. Decision file

`finalize` writes this file; the example shows the shape. Milliseconds are integers:

```json
{
  "schemaVersion": 1,
  "source": "raw.mp4",
  "cuts": [
    {
      "id": "cut-001",
      "startMs": 1520,
      "endMs": 1960,
      "reason": "dead-air",
      "confidence": 0.98,
      "evidence": "sentence completed before gap; next word starts a new clause",
      "leftWordEndMs": 1436,
      "rightWordStartMs": 2045
    }
  ]
}
```

Cut intervals are half-open `[startMs, endMs)`, sorted, non-overlapping, and within source duration. Merge touching or overlapping intervals before rendering. Do not include a proposed cut in this file until its linguistic decision is complete.

## 4. Render and map

Run:

```powershell
python scripts/build-clean-base.py --video <raw.mp4> --decisions analysis/clean-edit-decisions.json --output media/clean-base.mp4 --cut-map analysis/cut-map.json
```

Optionally remap an existing SRT as a fallback:

```powershell
python scripts/build-clean-base.py --video <raw.mp4> --decisions analysis/clean-edit-decisions.json --output media/clean-base.mp4 --cut-map analysis/cut-map.json --subtitle <raw.srt> --remapped-subtitle analysis/clean-base.remapped.srt
```

The renderer shrinks every cut onto the source frame grid (start rounded up, end rounded down, so it only ever keeps slightly more), takes the complement, concatenates the retained ranges, and writes `cut-map.json` (schema 2; it also records frame indices and any sub-frame cuts it dropped). Because every kept range is a whole number of frames with audio of exactly the same length, audio stays locked to picture however many cuts there are. Audio joins use a 20 ms equal-length crossfade centred on the video cut (`--join-ms`; `--audio-join fade` restores plain fades). Each kept range records:

```json
{
  "sourceStartMs": 1960,
  "sourceEndMs": 5400,
  "outputStartMs": 1520,
  "outputEndMs": 4960
}
```

For a raw timestamp inside a kept range:

`outputMs = outputStartMs + (sourceMs - sourceStartMs)`

A raw timestamp fully inside a removed range has no output timestamp. An interval spanning a cut must be intersected with kept ranges before mapping. Regenerate ASR on the rendered clean base whenever speech was removed; phrase-level subtitle remapping cannot reconstruct partial cue text reliably.

## 5. Encoding and join safety

- Preserve exact encoded width and height. Do not add a scale, crop, pad, transpose, setdar, or setsar operation that changes the visible geometry.
- Preserve source frame rate when practical. The clean duration may differ by no more than one source frame from the sum of kept ranges after normal codec rounding.
- Keep source audio and synchronize it to video. `build-clean-base.py` crossfades each join inside the removed pause and fails if the rendered audio and video streams differ by more than one frame plus codec priming; never fade through retained syllables.
- A talking-head jump cut is allowed. Do not synthesize visual transitions that obscure the fact of the cut unless the later visual director independently covers it with useful material.
- Encode with a high-quality delivery intermediate or high-quality H.264 while keeping geometry unchanged. Original resolution means exact width and height, not stream-copy identity or unchanged file size.

## 6. QA gate

Before any downstream director runs in the `要` branch:

1. Probe raw and clean files and compare encoded width and height exactly.
2. Confirm the clean file contains audio when the raw file contains audio.
3. Confirm cut and kept ranges are monotonic, non-overlapping, and duration-consistent.
4. Listen around every join and inspect nearby transcript words for clipped syllables, clicks, accidental repetition, or changed meaning.
5. Run `scripts/transcribe-words.py` on the clean base (`--output analysis/transcript.clean.words.json`) and require every downstream timestamp to fit its duration.
6. If a join is uncertain, restore more source material and rebuild. Conservative retention wins over an aggressive cut.

For the `不要` branch, require no cut decisions, no cut map, no replacement base render, and identity timing with the raw source. All later artifacts must declare and use that raw working timeline consistently.
