#!/usr/bin/env python3
"""Deterministic clean-cut candidates for the 要 branch of the clean-base prepass.

The script does the mechanical part of cutting so the model only has to judge
the genuinely ambiguous spans:

  propose   word-level transcript + audio energy -> candidates + review sheet
  decide    record the model's cut/keep judgements (no hand-editing JSON)
  finalize  candidates -> analysis/clean-edit-decisions.json for build-clean-base.py

Candidate types
  dead-air          long pause; auto-cut when the removed span is acoustically silent
  breath-gap        long pause containing only a short, quiet sound (breath/mouth noise)
  unlabeled-sound   pause containing sound that ASR did not transcribe (filler? missed word?)
  filler-word       嗯/呃/额/唔 … (and standalone 啊/哦 between pauses)
  duplicate-phrase  the same word sequence spoken twice in a row; the earlier take is cut
  abandoned-retake  a short fragment, a pause, then a restart sharing its opening

Only confirmed silent dead-air (and leading/trailing silence) is decided
automatically. Everything else is ``review`` with a suggestion. ``finalize``
refuses to run while any ``review`` item remains, so nothing ambiguous is cut
silently. Cuts never partially intersect a retained word.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import sys
from array import array
from pathlib import Path
from typing import Any

WINDOW_MS = 20
SAMPLE_RATE = 16000
SENTENCE_END = tuple("。！？!?.…")
CLAUSE_END = tuple("，、；：,;:")
PUNCT = "，。！？、；：,.!?;:\"'“”‘’（）()《》【】[]…—- "
HARD_FILLERS = {"嗯", "呃", "额", "唔", "嗯嗯", "呃呃", "额额", "嗯哼", "呃嗯"}
SOFT_FILLERS = {"啊", "哦", "噢", "诶", "欸"}
EMPHATIC_OK = {"非常", "特别", "真的", "很", "太", "超级", "好", "对", "是", "快", "多", "一定", "千万"}
TYPE_PRIORITY = {"abandoned-retake": 0, "duplicate-phrase": 1, "filler-word": 2, "unlabeled-sound": 3, "breath-gap": 4, "dead-air": 5}


# ---------------------------------------------------------------- helpers

def norm(text: str) -> str:
    return "".join(ch for ch in text if ch not in PUNCT).strip()


def fmt(ms: int | float) -> str:
    ms = int(round(ms))
    minutes, rest = divmod(ms, 60000)
    return f"{minutes:02d}:{rest / 1000:06.3f}"


def run(command: list[str]) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(command, check=True, capture_output=True)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


# ---------------------------------------------------------------- audio energy

class Energy:
    """20 ms RMS envelope (dBFS) with an adaptive silence threshold."""

    def __init__(self, db: list[float], threshold_db: float, floor_db: float, speech_db: float):
        self.db = db
        self.threshold_db = threshold_db
        self.floor_db = floor_db
        self.speech_db = speech_db

    @classmethod
    def from_media(cls, media: Path, ffmpeg: str, fixed_threshold_db: float | None) -> "Energy":
        raw = run([ffmpeg, "-hide_banner", "-v", "error", "-i", str(media), "-vn", "-map", "0:a:0",
                   "-ac", "1", "-ar", str(SAMPLE_RATE), "-f", "s16le", "-"]).stdout
        samples = array("h")
        samples.frombytes(raw[: len(raw) // 2 * 2])
        if sys.byteorder == "big":
            samples.byteswap()
        return cls.from_samples(samples, fixed_threshold_db)

    @classmethod
    def from_samples(cls, samples: array, fixed_threshold_db: float | None = None) -> "Energy":
        size = SAMPLE_RATE * WINDOW_MS // 1000
        db: list[float] = []
        try:
            import audioop  # type: ignore  # fast C path; removed in Python 3.13

            data = samples.tobytes()  # native byte order, as audioop expects
            rms_values = [audioop.rms(data[offset: offset + size * 2], 2) for offset in range(0, len(data), size * 2)]
        except ImportError:
            rms_values = []
            for offset in range(0, len(samples), size):
                chunk = samples[offset: offset + size]
                rms_values.append(math.sqrt(sum(value * value for value in chunk) / len(chunk)) if chunk else 0.0)
        for value in rms_values:
            rms = value / 32768.0
            db.append(20 * math.log10(rms) if rms > 1e-7 else -140.0)
        ordered = sorted(db) or [-140.0]
        floor = ordered[int(len(ordered) * 0.10)]
        speech = ordered[min(len(ordered) - 1, int(len(ordered) * 0.90))]
        if fixed_threshold_db is not None:
            threshold = fixed_threshold_db
        else:
            threshold = floor + max(6.0, 0.30 * (speech - floor))
        return cls(db, threshold, floor, speech)

    def windows(self, start_ms: int, end_ms: int) -> list[float]:
        first = max(0, int(start_ms // WINDOW_MS))
        last = min(len(self.db), int(math.ceil(end_ms / WINDOW_MS)))
        return self.db[first:last]

    def silent_ratio(self, start_ms: int, end_ms: int) -> float:
        values = self.windows(start_ms, end_ms)
        if not values:
            return 1.0
        return sum(1 for value in values if value < self.threshold_db) / len(values)

    def voiced_ms(self, start_ms: int, end_ms: int) -> int:
        return sum(WINDOW_MS for value in self.windows(start_ms, end_ms) if value >= self.threshold_db)

    def peak_db(self, start_ms: int, end_ms: int) -> float:
        values = self.windows(start_ms, end_ms)
        return max(values) if values else -140.0

    def last_voiced_end(self, start_ms: int, end_ms: int) -> int | None:
        first = max(0, int(start_ms // WINDOW_MS))
        last = min(len(self.db), int(math.ceil(end_ms / WINDOW_MS)))
        for index in range(last - 1, first - 1, -1):
            if self.db[index] >= self.threshold_db:
                return (index + 1) * WINDOW_MS
        return None

    def first_voiced_start(self, start_ms: int, end_ms: int) -> int | None:
        first = max(0, int(start_ms // WINDOW_MS))
        last = min(len(self.db), int(math.ceil(end_ms / WINDOW_MS)))
        for index in range(first, last):
            if self.db[index] >= self.threshold_db:
                return index * WINDOW_MS
        return None


# ---------------------------------------------------------------- word edges

def refine_edges(words: list[dict[str, Any]], energy: Energy, min_trim_ms: int, pad_ms: int) -> list[list[int]]:
    """Trim ASR word edges that extend into acoustic silence.

    Whisper often stretches a word's end across the following pause, hiding
    dead air. Only a silent run of at least ``min_trim_ms`` is trimmed, and
    ``pad_ms`` is kept beyond the last voiced window so soft endings survive.
    """
    edges: list[list[int]] = []
    for word in words:
        start, end = int(word["startMs"]), int(word["endMs"])
        voiced_end = energy.last_voiced_end(start, end)
        voiced_start = energy.first_voiced_start(start, end)
        new_end, new_start = end, start
        if voiced_end is not None and end - voiced_end >= min_trim_ms:
            new_end = min(end, voiced_end + pad_ms)
        if voiced_start is not None and voiced_start - start >= min_trim_ms:
            new_start = max(start, voiced_start - pad_ms)
        if new_end <= new_start:
            new_start, new_end = start, end
        edges.append([new_start, new_end])
    return edges


# ---------------------------------------------------------------- proposer

class Proposer:
    def __init__(self, words: list[dict[str, Any]], edges: list[list[int]], energy: Energy, duration_ms: int, args: argparse.Namespace):
        self.words = words
        self.edges = edges
        self.energy = energy
        self.duration_ms = duration_ms
        self.args = args
        self.texts = [norm(str(w["text"])) for w in words]
        self.candidates: list[dict[str, Any]] = []

    # -- geometry
    def start(self, i: int) -> int:
        return self.edges[i][0]

    def end(self, i: int) -> int:
        return self.edges[i][1]

    def gap_after(self, i: int) -> int:
        return self.start(i + 1) - self.end(i) if i + 1 < len(self.words) else self.duration_ms - self.end(i)

    def keep_total(self, i: int) -> int:
        text = str(self.words[i]["text"]).strip()
        if text.endswith(SENTENCE_END):
            return self.args.keep_sentence_ms
        if text.endswith(CLAUSE_END):
            return self.args.keep_clause_ms
        return self.args.keep_word_ms

    def rooms(self, i: int) -> tuple[int, int]:
        total = self.keep_total(i)
        left = max(self.args.min_room_ms, int(round(total * 0.55)))
        right = max(self.args.min_room_ms, total - left)
        return left, right

    def span_cut(self, first: int, last: int) -> tuple[int, int, bool]:
        """Cut covering words first..last plus the surrounding pause, leaving room.

        Returns (start, end, tight) where ``tight`` means at least one side had
        no pause to leave room in, so the cut sits exactly on a word boundary.
        """
        tight = False
        if first == 0:
            start = max(0, self.start(first) - self.args.min_room_ms)
        else:
            left_room, _ = self.rooms(first - 1)
            gap = self.start(first) - self.end(first - 1)
            if gap >= left_room + self.args.min_room_ms:
                start = self.end(first - 1) + left_room
            else:
                start = self.end(first - 1) + gap // 2 if gap > 0 else self.start(first)
                tight = True
        if last == len(self.words) - 1:
            end = min(self.duration_ms, self.end(last) + self.args.min_room_ms)
        else:
            _, right_room = self.rooms(last)
            gap = self.start(last + 1) - self.end(last)
            if gap >= right_room + self.args.min_room_ms:
                end = self.start(last + 1) - right_room
            else:
                end = self.start(last + 1) - gap // 2 if gap > 0 else self.start(last + 1)
                tight = True
        return start, end, tight

    def context(self, first: int, last: int, radius: int = 8) -> dict[str, str]:
        before = "".join(str(w["text"]) for w in self.words[max(0, first - radius): first])
        removed = "".join(str(w["text"]) for w in self.words[first: last + 1]) if first <= last else ""
        after = "".join(str(w["text"]) for w in self.words[last + 1: last + 1 + radius])
        return {"before": before, "removed": removed, "after": after}

    def add(self, **candidate: Any) -> None:
        candidate["startMs"] = int(candidate["startMs"])
        candidate["endMs"] = int(candidate["endMs"])
        if candidate["endMs"] - candidate["startMs"] < self.args.min_cut_ms:
            return
        self.candidates.append(candidate)

    # -- detectors
    def detect_edges_of_file(self) -> None:
        if not self.words:
            return
        lead_end = self.start(0) - self.args.min_room_ms * 2
        if lead_end > 0:
            ratio = self.energy.silent_ratio(0, lead_end)
            self.add(type="dead-air", decision="cut" if ratio >= 0.9 else "review", suggestion="cut",
                     startMs=0, endMs=lead_end, wordRange=None, silentRatio=round(ratio, 3), confidence=0.97 if ratio >= 0.9 else 0.6,
                     note="开头静音", context=self.context(0, -1))
        last = len(self.words) - 1
        tail_start = self.end(last) + self.args.min_room_ms * 2
        if tail_start < self.duration_ms:
            ratio = self.energy.silent_ratio(tail_start, self.duration_ms)
            self.add(type="dead-air", decision="cut" if ratio >= 0.9 else "review", suggestion="cut",
                     startMs=tail_start, endMs=self.duration_ms, wordRange=None, silentRatio=round(ratio, 3), confidence=0.97 if ratio >= 0.9 else 0.6,
                     note="结尾静音", context=self.context(last + 1, last))

    def detect_gaps(self) -> None:
        for i in range(len(self.words) - 1):
            gap = self.gap_after(i)
            if gap < self.args.min_gap_ms:
                continue
            left_room, right_room = self.rooms(i)
            start = self.end(i) + left_room
            end = self.start(i + 1) - right_room
            if end - start < self.args.min_cut_ms:
                continue
            ratio = self.energy.silent_ratio(start, end)
            voiced = self.energy.voiced_ms(start, end)
            peak = self.energy.peak_db(start, end)
            base = dict(startMs=start, endMs=end, wordRange=[i, i + 1], silentRatio=round(ratio, 3), gapMs=gap,
                        context=self.context(i + 1, i))
            if ratio >= 0.9:
                self.add(type="dead-air", decision="cut", suggestion="cut", confidence=0.95,
                         note=f"停顿 {gap / 1000:.2f}s，保留约 {left_room + right_room}ms 呼吸感", **base)
            elif voiced <= self.args.breath_max_ms and peak < self.energy.speech_db - self.args.breath_below_speech_db:
                self.add(type="breath-gap", decision="review", suggestion="cut", confidence=0.75,
                         note=f"停顿 {gap / 1000:.2f}s，内含约 {voiced}ms 轻声（像呼吸/嘴音）", **base)
            else:
                self.add(type="unlabeled-sound", decision="review", suggestion="keep", confidence=0.4,
                         note=f"停顿 {gap / 1000:.2f}s 内有约 {voiced}ms 未识别的声音：可能是口头禅、气声或漏识别的词，请试听", **base)

    def detect_fillers(self) -> None:
        for i, text in enumerate(self.texts):
            hard = text in HARD_FILLERS
            soft = text in SOFT_FILLERS
            if not (hard or soft):
                continue
            before_gap = self.start(i) - self.end(i - 1) if i > 0 else self.start(i)
            after_gap = self.gap_after(i)
            if soft and (before_gap < self.args.soft_filler_gap_ms or after_gap < self.args.soft_filler_gap_ms):
                continue
            start, end, tight = self.span_cut(i, i)
            self.add(type="filler-word", decision="review", suggestion="cut" if hard else "keep",
                     startMs=start, endMs=end, wordRange=[i, i], tight=tight, confidence=0.8 if hard else 0.45,
                     note=f"口头禅「{text}」" + ("" if hard else "（语气词，可能有表达作用）"), context=self.context(i, i))

    def detect_duplicates(self) -> None:
        used: set[int] = set()
        count = len(self.words)
        for n in range(self.args.max_repeat_tokens, 0, -1):
            for i in range(0, count - 2 * n + 1):
                first = list(range(i, i + n))
                second = list(range(i + n, i + 2 * n))
                if any(index in used for index in first + second):
                    continue
                left = "".join(self.texts[j] for j in first)
                right = "".join(self.texts[j] for j in second)
                if not left or left != right:
                    continue
                if left in HARD_FILLERS:
                    continue
                between = self.start(second[0]) - self.end(first[-1])
                if between > self.args.max_repeat_gap_ms:
                    continue
                emphatic = left in EMPHATIC_OK and between < 150
                # Character-level ASR (Paraformer) splits 谢谢/看看/慢慢 into two tokens.
                reduplication = len(left) == 1 and between < 120
                keep_it = emphatic or reduplication
                start, end, tight = self.span_cut(first[0], first[-1])
                # The earlier take is removed; never cut into the retained second take.
                end = min(end, self.start(second[0]))
                reason_text = "（像强调，建议保留）" if emphatic else ("（可能是叠词，建议保留）" if reduplication else "，剪掉前一遍")
                self.add(type="duplicate-phrase", decision="review", suggestion="keep" if keep_it else "cut",
                         startMs=start, endMs=end, wordRange=[first[0], first[-1]], tight=tight,
                         confidence=0.4 if keep_it else 0.8,
                         note=f"「{left}」连说两次" + reason_text,
                         context=self.context(first[0], first[-1]))
                used.update(first + second)

    def detect_restarts(self) -> None:
        boundaries = [i for i in range(len(self.words) - 1) if self.gap_after(i) >= self.args.restart_pause_ms]
        for j in boundaries:
            if str(self.words[j]["text"]).strip().endswith(SENTENCE_END):
                continue
            # Fragment = words since the previous pause/sentence end, up to j.
            k = j
            while k > 0 and self.gap_after(k - 1) < self.args.restart_pause_ms and not str(self.words[k - 1]["text"]).strip().endswith(SENTENCE_END):
                k -= 1
            fragment = "".join(self.texts[k: j + 1])
            if not fragment or j - k + 1 > self.args.max_fragment_tokens or len(fragment) > self.args.max_fragment_chars:
                continue
            after = "".join(self.texts[j + 1: j + 1 + 12])
            prefix = 0
            for a, b in zip(fragment, after):
                if a != b:
                    break
                prefix += 1
            if prefix < self.args.min_restart_prefix:
                continue
            if fragment == after[: len(fragment)] and len(after) <= len(fragment):
                continue  # identical and nothing more: duplicate detector's job
            start, end, tight = self.span_cut(k, j)
            exact = fragment == after[: len(fragment)]
            self.add(type="abandoned-retake", decision="review", suggestion="cut",
                     startMs=start, endMs=end, wordRange=[k, j], tight=tight, confidence=0.75 if exact else 0.6,
                     note=("说了一半后重说" if exact else "说了一半、改口重说") + f"：「{fragment}」→「{after[:len(fragment) + 6]}…」",
                     context=self.context(k, j))

    # -- assembly
    def resolve(self) -> list[dict[str, Any]]:
        pause_types = {"dead-air", "breath-gap", "unlabeled-sound"}
        span = lambda c: c["endMs"] - c["startMs"]  # noqa: E731
        # Semantic candidates first so they can absorb the pauses they span.
        ordered = sorted(self.candidates, key=lambda c: (c["type"] in pause_types, TYPE_PRIORITY[c["type"]], c["startMs"]))
        def words_of(candidate: dict[str, Any]) -> set[int]:
            word_range = candidate.get("wordRange")
            if not word_range or candidate["type"] in pause_types:
                return set()
            return set(range(word_range[0], word_range[1] + 1))

        kept: list[dict[str, Any]] = []
        for candidate in ordered:
            clashes = [other for other in kept if candidate["startMs"] < other["endMs"] and other["startMs"] < candidate["endMs"]]
            if candidate["type"] in pause_types:
                if clashes:
                    # The semantic cut already spans this pause. Remember it so a
                    # later "keep" on that semantic candidate restores the pause cut.
                    clashes[0].setdefault("absorbs", []).append(candidate)
                else:
                    kept.append(candidate)
                continue
            same_words = [other for other in clashes if words_of(other) & words_of(candidate)]
            if not same_words:
                kept.append(candidate)  # different disfluencies may overlap; finalize merges cuts
                continue
            # Two detectors describing the same disfluency: keep the wider description.
            if all(span(candidate) > span(other) for other in same_words):
                for other in same_words:
                    kept.remove(other)
                    candidate.setdefault("absorbs", []).extend(other.get("absorbs", []))
                kept.append(candidate)
        kept.sort(key=lambda c: (c["startMs"], c["endMs"]))
        for index, candidate in enumerate(kept, 1):
            candidate["id"] = f"C{index:03d}"
            candidate["removedMs"] = candidate["endMs"] - candidate["startMs"]
            for sub_index, absorbed in enumerate(candidate.get("absorbs", []), 1):
                absorbed["id"] = f"{candidate['id']}.{sub_index}"
                absorbed["removedMs"] = absorbed["endMs"] - absorbed["startMs"]
                absorbed["parent"] = candidate["id"]
                absorbed.pop("absorbs", None)
        return kept

    def run(self) -> list[dict[str, Any]]:
        self.detect_edges_of_file()
        self.detect_gaps()
        self.detect_fillers()
        self.detect_duplicates()
        self.detect_restarts()
        return self.resolve()


# ---------------------------------------------------------------- review sheet

def review_sheet(words: list[dict[str, Any]], candidates: list[dict[str, Any]]) -> str:
    lines = [
        "# 剪气口审阅单",
        "",
        "⟦…⟧ 是候选剪切点。「自动剪」已确认是静音；「待定」需要你判断。",
        "审阅后用 decide 命令记录判断，例如：",
        "  python -X utf8 scripts/propose-clean-cuts.py decide analysis/clean-cut-candidates.json --cut C004,C009 --keep C012",
        "也可以对“自动剪”改判 --keep，或用 --add-cut 12340-13020:mistake-correction:说明 补充模型发现的口误。",
        "",
    ]
    by_end: dict[int, list[dict[str, Any]]] = {}
    for candidate in candidates:
        anchor = candidate["wordRange"][0] - 1 if candidate.get("wordRange") else (-1 if candidate["startMs"] == 0 else len(words) - 1)
        if candidate["type"] in {"dead-air", "breath-gap", "unlabeled-sound"} and candidate.get("wordRange"):
            anchor = candidate["wordRange"][0]
        by_end.setdefault(anchor, []).append(candidate)

    def tag(candidate: dict[str, Any]) -> str:
        state = {"cut": "自动剪", "keep": "已定·保留", "review": "待定"}[candidate["decision"]]
        if candidate["decision"] == "cut" and candidate.get("decidedBy"):
            state = "已定·剪"
        suggestion = "" if candidate["decision"] != "review" else f"·建议{('剪' if candidate['suggestion'] == 'cut' else '保留')}"
        removed = candidate.get("context", {}).get("removed") or ""
        removed_text = f"·删「{removed}」" if removed and candidate["type"] not in {"dead-air", "breath-gap", "unlabeled-sound"} else ""
        absorbed = candidate.get("absorbs") or []
        fallback = f"；若判保留，会改为只处理其中的停顿（{', '.join(a['id'] for a in absorbed)}）" if absorbed and candidate["decision"] != "keep" else ""
        return f" ⟦{candidate['id']} {state}{suggestion}·{candidate['type']}·{candidate['removedMs']}ms{removed_text}｜{candidate['note']}{fallback}⟧ "

    current = ""
    line_start = words[0]["startMs"] if words else 0
    for item in by_end.get(-1, []):
        lines.append(f"[{fmt(0)}]{tag(item)}")
    for i, word in enumerate(words):
        if not current:
            line_start = word["startMs"]
        current += str(word["text"])
        for item in by_end.get(i, []):
            current += tag(item)
        if str(word["text"]).strip().endswith(SENTENCE_END) or len(current) > 90 or i == len(words) - 1:
            lines.append(f"[{fmt(line_start)}] {current.strip()}")
            current = ""
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------- commands

def cmd_propose(args: argparse.Namespace) -> int:
    transcript = load_json(args.words)
    words = transcript["words"] if isinstance(transcript, dict) else transcript
    if not words:
        raise SystemExit("Transcript has no words")
    energy = Energy.from_media(args.media, args.ffmpeg, args.silence_db)
    duration_ms = int(transcript.get("durationMs") or len(energy.db) * WINDOW_MS) if isinstance(transcript, dict) else len(energy.db) * WINDOW_MS
    edges = refine_edges(words, energy, args.edge_trim_min_ms, args.edge_pad_ms) if args.refine_edges else [[int(w["startMs"]), int(w["endMs"])] for w in words]
    candidates = Proposer(words, edges, energy, duration_ms, args).run()
    auto = [c for c in candidates if c["decision"] == "cut"]
    review = [c for c in candidates if c["decision"] == "review"]
    document = {
        "schemaVersion": 1,
        "kind": "clean-cut-candidates",
        "media": str(args.media.resolve()),
        "wordsFile": str(args.words.resolve()),
        "durationMs": duration_ms,
        "audio": {"floorDb": round(energy.floor_db, 1), "speechDb": round(energy.speech_db, 1), "thresholdDb": round(energy.threshold_db, 1)},
        "params": {key: value for key, value in vars(args).items() if key not in {"func", "words", "media", "output", "sheet", "ffmpeg"}},
        "summary": {
            "candidates": len(candidates),
            "autoCut": len(auto),
            "needsReview": len(review),
            "autoCutMs": sum(c["removedMs"] for c in auto),
            "reviewSuggestCutMs": sum(c["removedMs"] for c in review if c["suggestion"] == "cut"),
        },
        "wordEdges": edges,
        "candidates": candidates,
        "manualCuts": [],
    }
    write_json(args.output, document)
    sheet = args.sheet or args.output.with_name("clean-cut-review.md")
    sheet.write_text(review_sheet(words, candidates), encoding="utf-8")
    print(json.dumps({"output": str(args.output.resolve()), "reviewSheet": str(sheet.resolve()), **document["summary"], "audio": document["audio"]}, ensure_ascii=False, indent=2))
    return 0


def split_ids(value: str | None) -> list[str]:
    return [item.strip().upper() for item in (value or "").split(",") if item.strip()]


def set_decision(document: dict[str, Any], candidate: dict[str, Any], decision: str, decided_by: str, changes: list[str]) -> None:
    """Apply a decision; keeping a semantic candidate restores the pause cuts it had absorbed."""
    candidate["decision"] = decision
    candidate["decidedBy"] = decided_by
    changes.append(f"{candidate['id']}->{decision}({decided_by})")
    restored_ids = {item["id"] for item in document["candidates"] if item.get("parent") == candidate["id"]}
    if decision == "keep":
        for absorbed in candidate.get("absorbs", []):
            if absorbed["id"] not in restored_ids:
                document["candidates"].append(json.loads(json.dumps(absorbed)))
                changes.append(f"{absorbed['id']} restored ({absorbed['type']}, {absorbed['decision']})")
    elif restored_ids:
        document["candidates"] = [item for item in document["candidates"] if item["id"] not in restored_ids]
        changes.append(f"removed restored {sorted(restored_ids)}")
    document["candidates"].sort(key=lambda item: (item["startMs"], item["endMs"]))


def cmd_decide(args: argparse.Namespace) -> int:
    document = load_json(args.candidates)
    changes: list[str] = []
    for decision, ids in (("cut", split_ids(args.cut)), ("keep", split_ids(args.keep))):
        for candidate_id in ids:
            match = next((c for c in document["candidates"] if c["id"] == candidate_id), None)
            if match is None:
                raise SystemExit(f"Unknown candidate id: {candidate_id}")
            set_decision(document, match, decision, "review", changes)
    if args.accept_suggestions:
        while True:
            pending = next((c for c in document["candidates"] if c["decision"] == "review"), None)
            if pending is None:
                break
            set_decision(document, pending, pending["suggestion"], "suggestion", changes)
    pattern = re.compile(r"^(\d+)-(\d+):([a-z-]+)(?::(.*))?$")
    for spec in args.add_cut or []:
        match = pattern.match(spec.strip())
        if not match:
            raise SystemExit(f"--add-cut must look like START-END:reason[:evidence], got {spec!r}")
        start, end, reason, evidence = int(match[1]), int(match[2]), match[3], match[4] or ""
        if end <= start:
            raise SystemExit(f"Invalid manual cut {spec!r}")
        manual_id = f"M{len(document['manualCuts']) + 1:03d}"
        document["manualCuts"].append({"id": manual_id, "startMs": start, "endMs": end, "reason": reason, "evidence": evidence, "decision": "cut"})
        changes.append(f"{manual_id} added {start}-{end} {reason}")
    write_json(args.candidates, document)
    remaining = sum(1 for c in document["candidates"] if c["decision"] == "review")
    print(json.dumps({"changes": changes, "stillReview": remaining}, ensure_ascii=False, indent=2))
    return 0


REASON_MAP = {
    "dead-air": "dead-air",
    "breath-gap": "breath-gap",
    "unlabeled-sound": "dead-air",
    "filler-word": "filler-word",
    "duplicate-phrase": "duplicate-phrase",
    "abandoned-retake": "abandoned-retake",
}


def cmd_finalize(args: argparse.Namespace) -> int:
    document = load_json(args.candidates)
    pending = [c["id"] for c in document["candidates"] if c["decision"] == "review"]
    if pending:
        raise SystemExit(f"Still waiting for review decisions: {', '.join(pending)}")
    transcript = load_json(Path(document["wordsFile"])) if not args.words else load_json(args.words)
    words = transcript["words"] if isinstance(transcript, dict) else transcript
    edges = document.get("wordEdges") or [[int(w["startMs"]), int(w["endMs"])] for w in words]
    duration_ms = int(document["durationMs"])

    raw_cuts = []
    for candidate in document["candidates"]:
        if candidate["decision"] == "cut":
            raw_cuts.append({
                "id": candidate["id"],
                "startMs": candidate["startMs"],
                "endMs": candidate["endMs"],
                "reason": REASON_MAP[candidate["type"]],
                "confidence": candidate.get("confidence"),
                "evidence": candidate.get("note", ""),
                "decidedBy": candidate.get("decidedBy", "auto"),
            })
    for manual in document.get("manualCuts", []):
        raw_cuts.append({**manual, "confidence": None, "decidedBy": "manual"})

    errors = []
    for cut in raw_cuts:
        if cut["startMs"] < 0 or cut["endMs"] > duration_ms or cut["endMs"] <= cut["startMs"]:
            errors.append(f"{cut['id']}: interval {cut['startMs']}-{cut['endMs']} outside 0-{duration_ms}")
        for index, (start, end) in enumerate(edges):
            inside = cut["startMs"] <= start and end <= cut["endMs"]
            disjoint = end <= cut["startMs"] or cut["endMs"] <= start
            if not inside and not disjoint:
                errors.append(f"{cut['id']}: partially cuts word #{index}「{words[index]['text']}」({start}-{end})")
    if errors:
        raise SystemExit("Refusing to finalize:\n  " + "\n  ".join(errors))

    raw_cuts.sort(key=lambda c: (c["startMs"], c["endMs"]))
    merged: list[dict[str, Any]] = []
    for cut in raw_cuts:
        if merged and cut["startMs"] <= merged[-1]["endMs"]:
            last = merged[-1]
            last["endMs"] = max(last["endMs"], cut["endMs"])
            last["id"] += "+" + cut["id"]
            last["evidence"] = "; ".join(filter(None, [last.get("evidence"), cut.get("evidence")]))
        else:
            merged.append(dict(cut))

    params = document.get("params", {})
    for cut in merged:
        left_words = [(index, end) for index, (start, end) in enumerate(edges) if end <= cut["startMs"]]
        right = [start for start, end in edges if start >= cut["endMs"]]
        cut["leftWordEndMs"] = max(end for _, end in left_words) if left_words else None
        cut["rightWordStartMs"] = min(right) if right else None
        # Merged cuts can eat the breathing room a sentence/clause boundary needs.
        if left_words and right:
            left_index = max(left_words, key=lambda item: item[1])[0]
            text = str(words[left_index]["text"]).strip()
            target = params.get("keep_sentence_ms", 280) if text.endswith(SENTENCE_END) else (
                params.get("keep_clause_ms", 210) if text.endswith(CLAUSE_END) else params.get("keep_word_ms", 160))
            remaining = (cut["startMs"] - cut["leftWordEndMs"]) + (cut["rightWordStartMs"] - cut["endMs"])
            shortfall = target - remaining
            if shortfall > 0:
                removed = [(start, end) for start, end in edges if cut["startMs"] <= start and end <= cut["endMs"]]
                # Return only silence inside the removed span; a removed word must never reappear.
                head_room = (min(start for start, _ in removed) - cut["startMs"]) if removed else cut["endMs"] - cut["startMs"]
                tail_room = (cut["endMs"] - max(end for _, end in removed)) if removed else 0
                budget = max(0, cut["endMs"] - cut["startMs"] - params.get("min_cut_ms", 100))
                from_head = min(shortfall, max(0, head_room - 20), budget)
                from_tail = min(shortfall - from_head, max(0, tail_room - 20), budget - from_head)
                cut["startMs"] += from_head
                cut["endMs"] -= from_tail
                if from_head or from_tail:
                    cut["roomRestoredMs"] = from_head + from_tail
        cut["removedWords"] = "".join(str(words[i]["text"]) for i, (s, e) in enumerate(edges) if cut["startMs"] <= s and e <= cut["endMs"])

    removed = sum(c["endMs"] - c["startMs"] for c in merged)
    decisions = {
        "schemaVersion": 1,
        "source": document["media"],
        "generatedBy": "propose-clean-cuts.py finalize",
        "candidatesFile": str(args.candidates.resolve()),
        "summary": {"cuts": len(merged), "removedMs": removed, "removedPercent": round(100 * removed / max(1, duration_ms), 2)},
        "cuts": merged,
    }
    write_json(args.output, decisions)
    print(json.dumps({"output": str(args.output.resolve()), **decisions["summary"]}, ensure_ascii=False, indent=2))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    propose = sub.add_parser("propose", help="Generate candidates and a review sheet")
    propose.add_argument("--words", type=Path, required=True, help="analysis/transcript.raw.words.json")
    propose.add_argument("--media", type=Path, required=True, help="Raw source video (audio is analysed)")
    propose.add_argument("--output", type=Path, required=True, help="analysis/clean-cut-candidates.json")
    propose.add_argument("--sheet", type=Path, help="Review sheet path (default: clean-cut-review.md beside output)")
    propose.add_argument("--ffmpeg", default="ffmpeg")
    propose.add_argument("--silence-db", type=float, help="Fixed silence threshold in dBFS; default adapts to the recording")
    propose.add_argument("--min-gap-ms", type=int, default=320, help="Pauses shorter than this are never candidates")
    propose.add_argument("--min-cut-ms", type=int, default=100, help="Smallest span worth cutting")
    propose.add_argument("--keep-sentence-ms", type=int, default=280, help="Pause kept after a sentence end")
    propose.add_argument("--keep-clause-ms", type=int, default=210, help="Pause kept after a comma/clause")
    propose.add_argument("--keep-word-ms", type=int, default=160, help="Pause kept inside a clause")
    propose.add_argument("--min-room-ms", type=int, default=70, help="Minimum room kept next to any retained word")
    propose.add_argument("--breath-max-ms", type=int, default=400)
    propose.add_argument("--breath-below-speech-db", type=float, default=12.0)
    propose.add_argument("--soft-filler-gap-ms", type=int, default=200)
    propose.add_argument("--max-repeat-tokens", type=int, default=6)
    propose.add_argument("--max-repeat-gap-ms", type=int, default=1500)
    propose.add_argument("--restart-pause-ms", type=int, default=250)
    propose.add_argument("--max-fragment-tokens", type=int, default=10)
    propose.add_argument("--max-fragment-chars", type=int, default=16)
    propose.add_argument("--min-restart-prefix", type=int, default=2)
    propose.add_argument("--no-refine-edges", dest="refine_edges", action="store_false", help="Trust ASR word edges as-is")
    propose.add_argument("--edge-trim-min-ms", type=int, default=200)
    propose.add_argument("--edge-pad-ms", type=int, default=60)
    propose.set_defaults(func=cmd_propose, refine_edges=True)

    decide = sub.add_parser("decide", help="Record review decisions")
    decide.add_argument("candidates", type=Path)
    decide.add_argument("--cut", help="Comma-separated candidate ids to cut")
    decide.add_argument("--keep", help="Comma-separated candidate ids to keep")
    decide.add_argument("--accept-suggestions", action="store_true", help="Resolve every remaining review item with its suggestion")
    decide.add_argument("--add-cut", action="append", help="START-END:reason[:evidence] for a cut the detectors missed (e.g. mistake-correction)")
    decide.set_defaults(func=cmd_decide)

    finalize = sub.add_parser("finalize", help="Write clean-edit-decisions.json")
    finalize.add_argument("candidates", type=Path)
    finalize.add_argument("--output", type=Path, required=True, help="analysis/clean-edit-decisions.json")
    finalize.add_argument("--words", type=Path, help="Override the transcript recorded in the candidates file")
    finalize.set_defaults(func=cmd_finalize)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
