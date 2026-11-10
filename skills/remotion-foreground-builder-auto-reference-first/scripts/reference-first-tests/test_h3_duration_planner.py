from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parents[1]


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


planner = load_module("plan_h3_duration", SCRIPT_DIR / "plan-h3-duration.py")


def candidate(span_seconds: float, count: int, pattern: str, continuous: bool = False) -> dict:
    end_ms = int(round(span_seconds * 1000))
    return {
        "id": "shot-test",
        "startMs": 0,
        "endMs": end_ms,
        "motionPattern": pattern,
        "continuousProcess": continuous,
        "strongEvents": [
            {"label": f"event-{index + 1}", "narrationAtMs": int((index + 1) * end_ms / (count + 1))}
            for index in range(count)
        ],
    }


class H3DurationPlannerTest(unittest.TestCase):
    def test_single_impact_uses_four_seconds(self):
        result = planner.plan_duration(candidate(4.0, 1, "M10"))
        self.assertEqual(result["decisionStatus"], "ready")
        self.assertEqual(result["durationClass"], "single-impact")
        self.assertEqual(result["selectedDurationSeconds"], 4)

    def test_three_event_assembly_uses_seven_seconds(self):
        result = planner.plan_duration(candidate(7.0, 3, "M03"))
        self.assertEqual(result["decisionStatus"], "ready")
        self.assertEqual(result["durationClass"], "short-sequence")
        self.assertEqual(result["selectedDurationSeconds"], 7)

    def test_continuous_process_uses_twelve_seconds(self):
        result = planner.plan_duration(candidate(12.0, 5, "M01", continuous=True))
        self.assertEqual(result["decisionStatus"], "ready")
        self.assertEqual(result["durationClass"], "continuous-process")
        self.assertEqual(result["selectedDurationSeconds"], 12)

    def test_long_candidate_requires_split(self):
        result = planner.plan_duration(candidate(22.0, 7, "NEW", continuous=True))
        self.assertEqual(result["decisionStatus"], "split-shot")
        self.assertIsNone(result["selectedDurationSeconds"])

    def test_sparse_long_anchor_requires_refinement(self):
        result = planner.plan_duration(candidate(8.0, 1, "M10"))
        self.assertEqual(result["decisionStatus"], "refine-anchor")
        self.assertEqual(result["selectedDurationSeconds"], 5)


if __name__ == "__main__":
    unittest.main()
