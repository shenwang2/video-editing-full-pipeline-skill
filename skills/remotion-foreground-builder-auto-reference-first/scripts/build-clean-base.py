#!/usr/bin/env python3
"""Render an original-resolution clean base plate from audited cut decisions.

The script is deliberately not a semantic cut detector. Cut decisions come from
``propose-clean-cuts.py finalize`` (word-level ASR + acoustic candidates + the
model's review); this tool validates those decisions, renders their complement,
and writes the authoritative raw-to-clean cut map.

Join quality
* Every cut is shrunk onto the source frame grid (start rounded up, end rounded
  down), so each kept range is a whole number of frames and its audio has the
  same exact length as its video. Shrinking only ever keeps a little more
  material, never cuts into retained speech.
* Audio joins use a short equal-length crossfade centred on the video cut
  (default 20 ms). Each kept range borrows half the crossfade from the removed
  pause on either inner side, so total audio length still equals the summed
  kept ranges and stays locked to the picture. ``--audio-join fade`` restores
  the previous per-segment fade in/out.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import tempfile
from dataclasses import dataclass
from fractions import Fraction
from pathlib import Path
from typing import Any, Iterable


@dataclass(frozen=True)
class FrameRange:
    start: int  # first included frame
    end: int  # first excluded frame

    @property
    def frames(self) -> int:
        return self.end - self.start


def run(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, check=True, text=True, encoding="utf-8", errors="replace", capture_output=True)


def probe(path: Path, ffprobe: str) -> dict[str, Any]:
    result = run([
        ffprobe,
        "-v", "error",
        "-show_streams",
        "-show_format",
        "-of", "json",
        str(path),
    ])
    data = json.loads(result.stdout)
    video_streams = [stream for stream in data.get("streams", []) if stream.get("codec_type") == "video"]
    if not video_streams:
        raise ValueError(f"No video stream found: {path}")
    video = video_streams[0]
    audio_streams = [stream for stream in data.get("streams", []) if stream.get("codec_type") == "audio"]
    duration_text = data.get("format", {}).get("duration") or video.get("duration")
    if duration_text is None:
        raise ValueError(f"Duration unavailable: {path}")
    fps_text = video.get("avg_frame_rate") or video.get("r_frame_rate") or "0/1"
    if fps_text in {"0/0", "0/1"}:
        fps_text = video.get("r_frame_rate") or "30/1"
    r_rate = video.get("r_frame_rate") or fps_text
    fps = float(Fraction(fps_text))
    audio = audio_streams[0] if audio_streams else {}
    return {
        "width": int(video["width"]),
        "height": int(video["height"]),
        "fps": fps,
        "fpsRational": fps_text,
        "variableFrameRate": bool(r_rate and fps_text and Fraction(r_rate) != Fraction(fps_text)),
        "durationMs": int(round(float(duration_text) * 1000)),
        "hasAudio": bool(audio_streams),
        "audioSampleRate": int(audio.get("sample_rate", 0) or 0),
        "videoStreamDurationMs": int(round(float(video["duration"]) * 1000)) if video.get("duration") else None,
        "audioStreamDurationMs": int(round(float(audio["duration"]) * 1000)) if audio.get("duration") else None,
    }


def load_decisions(path: Path, duration_ms: int) -> tuple[dict[str, Any], list[tuple[int, int]]]:
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    raw_cuts = data.get("cuts")
    if not isinstance(raw_cuts, list):
        raise ValueError("Decision JSON must contain a cuts array")
    cuts: list[tuple[int, int]] = []
    for index, item in enumerate(raw_cuts):
        if not isinstance(item, dict):
            raise ValueError(f"cuts[{index}] must be an object")
        start_ms = int(item["startMs"])
        end_ms = int(item["endMs"])
        if start_ms < 0 or end_ms <= start_ms or end_ms > duration_ms:
            raise ValueError(f"Invalid cut interval at cuts[{index}]: {start_ms}-{end_ms} ms")
        cuts.append((start_ms, end_ms))
    cuts.sort()
    merged: list[tuple[int, int]] = []
    for start, end in cuts:
        if merged and start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))
    return data, merged


def snap_cuts(cuts_ms: Iterable[tuple[int, int]], fps: Fraction) -> tuple[list[FrameRange], list[dict[str, int]]]:
    """Shrink each cut onto whole frames: start rounds up, end rounds down."""
    snapped: list[FrameRange] = []
    dropped: list[dict[str, int]] = []
    for start_ms, end_ms in cuts_ms:
        start_frame = math.ceil(Fraction(start_ms, 1000) * fps)
        end_frame = math.floor(Fraction(end_ms, 1000) * fps)
        if end_frame > start_frame:
            snapped.append(FrameRange(start_frame, end_frame))
        else:
            dropped.append({"startMs": start_ms, "endMs": end_ms})
    return snapped, dropped


def complement(cuts: Iterable[FrameRange], total_frames: int) -> list[FrameRange]:
    keep: list[FrameRange] = []
    cursor = 0
    for cut in cuts:
        if cut.start > cursor:
            keep.append(FrameRange(cursor, cut.start))
        cursor = max(cursor, cut.end)
    if cursor < total_frames:
        keep.append(FrameRange(cursor, total_frames))
    return [interval for interval in keep if interval.frames > 0]


def frame_ms(frame: int, fps: Fraction) -> int:
    return int(round(Fraction(frame) / fps * 1000))


def build_map(source: Path, source_meta: dict[str, Any], fps: Fraction, cuts: list[FrameRange], keeps: list[FrameRange],
              dropped: list[dict[str, int]], decisions: dict[str, Any]) -> dict[str, Any]:
    output_frames = 0
    kept_ranges = []
    for keep in keeps:
        kept_ranges.append({
            "sourceStartMs": frame_ms(keep.start, fps),
            "sourceEndMs": frame_ms(keep.end, fps),
            "outputStartMs": frame_ms(output_frames, fps),
            "outputEndMs": frame_ms(output_frames + keep.frames, fps),
            "sourceStartFrame": keep.start,
            "sourceEndFrame": keep.end,
            "outputStartFrame": output_frames,
        })
        output_frames += keep.frames
    return {
        "schemaVersion": 2,
        "source": str(source.resolve()),
        "sourceMetadata": source_meta,
        "frameRate": str(fps),
        "decisionSource": decisions.get("source", str(source)),
        "cuts": [{"sourceStartMs": frame_ms(item.start, fps), "sourceEndMs": frame_ms(item.end, fps),
                  "sourceStartFrame": item.start, "sourceEndFrame": item.end} for item in cuts],
        "droppedSubFrameCuts": dropped,
        "keptRanges": kept_ranges,
        "expectedOutputDurationMs": frame_ms(output_frames, fps),
        "expectedOutputFrames": output_frames,
    }


def seconds(value: Fraction) -> str:
    return f"{float(value):.9f}"


def render(source: Path, output: Path, keeps: list[FrameRange], source_meta: dict[str, Any], fps: Fraction,
           ffmpeg: str, crf: int, preset: str, audio_join: str, join_ms: float) -> None:
    if not keeps:
        raise ValueError("All source content would be removed; refusing to render")
    filters: list[str] = []
    has_audio = source_meta["hasAudio"]
    half_frame = Fraction(1, 2) / fps
    duration_s = Fraction(source_meta["durationMs"], 1000)
    crossfade = has_audio and audio_join == "crossfade" and len(keeps) > 1 and join_ms > 0
    sample_rate = source_meta.get("audioSampleRate") or 48000
    xfade_samples = max(2, int(round(join_ms / 1000 * sample_rate))) if crossfade else 0
    xfade_s = Fraction(xfade_samples, sample_rate) if crossfade else Fraction(0)
    video_labels: list[str] = []
    audio_labels: list[str] = []
    for index, keep in enumerate(keeps):
        start = Fraction(keep.start) / fps
        end = Fraction(keep.end) / fps
        # Half-frame offsets select exactly frames start..end-1 regardless of timestamp rounding.
        v_start = max(Fraction(0), start - half_frame)
        v_end = end - half_frame
        filters.append(f"[0:v:0]trim=start={seconds(v_start)}:end={seconds(v_end)},setpts=PTS-STARTPTS[v{index}]")
        video_labels.append(f"[v{index}]")
        if not has_audio:
            continue
        if crossfade:
            lead = xfade_s / 2 if index > 0 else Fraction(0)
            tail = xfade_s - xfade_s / 2 if index < len(keeps) - 1 else Fraction(0)
            a_start = max(Fraction(0), start - lead)
            a_end = min(duration_s, end + tail)
            filters.append(f"[0:a:0]atrim=start={seconds(a_start)}:end={seconds(a_end)},asetpts=PTS-STARTPTS[a{index}]")
        else:
            seg_s = float(end - start)
            fade_s = min(0.008, max(0.0, seg_s / 8))
            audio_filter = f"[0:a:0]atrim=start={seconds(start)}:end={seconds(end)},asetpts=PTS-STARTPTS"
            if fade_s > 0:
                audio_filter += f",afade=t=in:st=0:d={fade_s:.6f},afade=t=out:st={max(0.0, seg_s - fade_s):.6f}:d={fade_s:.6f}"
            filters.append(audio_filter + f"[a{index}]")
        audio_labels.append(f"[a{index}]")

    filters.append("".join(video_labels) + f"concat=n={len(keeps)}:v=1:a=0[vout]")
    if has_audio:
        if crossfade:
            current = audio_labels[0]
            for index, label in enumerate(audio_labels[1:], 1):
                target = "[aout]" if index == len(audio_labels) - 1 else f"[x{index}]"
                filters.append(f"{current}{label}acrossfade=ns={xfade_samples}:c1=tri:c2=tri{target}")
                current = target
        else:
            filters.append("".join(audio_labels) + f"concat=n={len(keeps)}:v=0:a=1[aout]")

    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", suffix=".ffscript", encoding="utf-8", delete=False) as handle:
        handle.write(";\n".join(filters))
        filter_path = Path(handle.name)
    try:
        command = [
            ffmpeg, "-hide_banner", "-y", "-i", str(source),
            "-filter_complex_script", str(filter_path),
            "-map", "[vout]",
        ]
        if has_audio:
            command.extend(["-map", "[aout]"])
        command.extend([
            "-fps_mode", "cfr", "-r", source_meta["fpsRational"],
            "-c:v", "libx264", "-preset", preset, "-crf", str(crf),
            "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        ])
        if has_audio:
            command.extend(["-c:a", "aac", "-b:a", "256k", "-ar", str(sample_rate)])
        command.append(str(output))
        try:
            run(command)
        except subprocess.CalledProcessError as error:
            if "fps_mode" not in (error.stderr or ""):
                raise RuntimeError(f"ffmpeg failed:\n{(error.stderr or '')[-3000:]}") from error
            # ffmpeg < 5.1 has no -fps_mode; -vsync cfr is the older spelling.
            index = command.index("-fps_mode")
            command[index:index + 2] = ["-vsync", "cfr"]
            run(command)
    finally:
        filter_path.unlink(missing_ok=True)


TIMESTAMP = re.compile(r"^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$")


def parse_timestamp(value: str) -> int:
    match = TIMESTAMP.match(value.strip())
    if not match:
        raise ValueError(f"Invalid SRT timestamp: {value}")
    hours, minutes, seconds_value, millis = map(int, match.groups())
    return ((hours * 60 + minutes) * 60 + seconds_value) * 1000 + millis


def format_timestamp(value_ms: int) -> str:
    value_ms = max(0, value_ms)
    hours, remainder = divmod(value_ms, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    seconds_value, millis = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds_value:02d},{millis:03d}"


def map_point(source_ms: int, kept_ranges: list[dict[str, int]], prefer_end: bool = False) -> int | None:
    for item in kept_ranges:
        if item["sourceStartMs"] <= source_ms < item["sourceEndMs"]:
            return item["outputStartMs"] + source_ms - item["sourceStartMs"]
        if prefer_end and source_ms == item["sourceEndMs"]:
            return item["outputEndMs"]
    return None


def remap_srt(source_srt: Path, destination: Path, kept_ranges: list[dict[str, int]]) -> None:
    normalized = source_srt.read_text(encoding="utf-8-sig").replace("\r\n", "\n").strip()
    blocks = re.split(r"\n{2,}", normalized) if normalized else []
    output_blocks: list[str] = []
    cue_index = 1
    for block in blocks:
        lines = block.splitlines()
        timeline_index = next((i for i, line in enumerate(lines) if "-->" in line), None)
        if timeline_index is None:
            continue
        left, right = [part.strip() for part in lines[timeline_index].split("-->", 1)]
        start_ms, end_ms = parse_timestamp(left), parse_timestamp(right)
        intersections = []
        for item in kept_ranges:
            start = max(start_ms, item["sourceStartMs"])
            end = min(end_ms, item["sourceEndMs"])
            if end > start:
                mapped_start = map_point(start, kept_ranges)
                mapped_end = map_point(end, kept_ranges, prefer_end=True)
                if mapped_start is not None and mapped_end is not None:
                    intersections.append((mapped_start, mapped_end))
        if not intersections:
            continue
        mapped_start = intersections[0][0]
        mapped_end = intersections[-1][1]
        text_lines = lines[timeline_index + 1:]
        output_blocks.append("\n".join([
            str(cue_index),
            f"{format_timestamp(mapped_start)} --> {format_timestamp(mapped_end)}",
            *text_lines,
        ]))
        cue_index += 1
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text("\n\n".join(output_blocks) + ("\n" if output_blocks else ""), encoding="utf-8-sig")


def validate_output(source_meta: dict[str, Any], output_meta: dict[str, Any], expected_duration_ms: int) -> None:
    if (source_meta["width"], source_meta["height"]) != (output_meta["width"], output_meta["height"]):
        raise ValueError(
            "Clean base resolution changed: "
            f"{source_meta['width']}x{source_meta['height']} -> {output_meta['width']}x{output_meta['height']}"
        )
    if source_meta["hasAudio"] and not output_meta["hasAudio"]:
        raise ValueError("Clean base lost the source audio stream")
    frame = 1000 / source_meta["fps"] if source_meta["fps"] > 0 else 50
    if math.fabs(output_meta["durationMs"] - expected_duration_ms) > frame + 8:
        raise ValueError(
            f"Clean duration mismatch: expected {expected_duration_ms} ms, probed {output_meta['durationMs']} ms"
        )
    video_ms, audio_ms = output_meta.get("videoStreamDurationMs"), output_meta.get("audioStreamDurationMs")
    # AAC adds roughly one 1024-sample priming frame; allow that plus one video frame.
    if video_ms is not None and audio_ms is not None and math.fabs(video_ms - audio_ms) > frame + 30:
        raise ValueError(f"Audio/video stream length mismatch after cutting: video {video_ms} ms, audio {audio_ms} ms")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument("--decisions", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--cut-map", type=Path, required=True)
    parser.add_argument("--subtitle", type=Path)
    parser.add_argument("--remapped-subtitle", type=Path)
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--ffprobe", default="ffprobe")
    parser.add_argument("--crf", type=int, default=17)
    parser.add_argument("--preset", default="medium")
    parser.add_argument("--audio-join", choices=["crossfade", "fade"], default="crossfade")
    parser.add_argument("--join-ms", type=float, default=20.0, help="Audio crossfade length at each join")
    parser.add_argument("--plan-only", action="store_true")
    args = parser.parse_args()

    if bool(args.subtitle) != bool(args.remapped_subtitle):
        parser.error("--subtitle and --remapped-subtitle must be supplied together")
    if not args.video.is_file():
        parser.error(f"Video not found: {args.video}")
    if not args.decisions.is_file():
        parser.error(f"Decision JSON not found: {args.decisions}")

    source_meta = probe(args.video, args.ffprobe)
    fps = Fraction(source_meta["fpsRational"])
    total_frames = int(math.floor(Fraction(source_meta["durationMs"], 1000) * fps + Fraction(1, 2)))
    decisions, cuts_ms = load_decisions(args.decisions, source_meta["durationMs"])
    cuts, dropped = snap_cuts(cuts_ms, fps)
    keeps = complement(cuts, total_frames)
    cut_map = build_map(args.video, source_meta, fps, cuts, keeps, dropped, decisions)
    cut_map["audioJoin"] = {"mode": args.audio_join, "joinMs": args.join_ms}
    args.cut_map.parent.mkdir(parents=True, exist_ok=True)
    args.cut_map.write_text(json.dumps(cut_map, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if args.subtitle and args.remapped_subtitle:
        remap_srt(args.subtitle, args.remapped_subtitle, cut_map["keptRanges"])

    if args.plan_only:
        print(json.dumps(cut_map, ensure_ascii=False, indent=2))
        return

    render(args.video, args.output, keeps, source_meta, fps, args.ffmpeg, args.crf, args.preset, args.audio_join, args.join_ms)
    output_meta = probe(args.output, args.ffprobe)
    validate_output(source_meta, output_meta, cut_map["expectedOutputDurationMs"])
    cut_map["output"] = str(args.output.resolve())
    cut_map["outputMetadata"] = output_meta
    args.cut_map.write_text(json.dumps(cut_map, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "output": str(args.output.resolve()),
        "cutMap": str(args.cut_map.resolve()),
        "sourceResolution": f"{source_meta['width']}x{source_meta['height']}",
        "outputResolution": f"{output_meta['width']}x{output_meta['height']}",
        "sourceDurationMs": source_meta["durationMs"],
        "outputDurationMs": output_meta["durationMs"],
        "removedMs": source_meta["durationMs"] - output_meta["durationMs"],
        "cuts": len(cuts),
        "droppedSubFrameCuts": len(dropped),
        "variableFrameRateSource": source_meta["variableFrameRate"],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
