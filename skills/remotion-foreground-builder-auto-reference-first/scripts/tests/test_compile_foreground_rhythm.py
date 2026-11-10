from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "compile-foreground-rhythm.py"
SPEC = importlib.util.spec_from_file_location("foreground_rhythm_compiler", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def fixture() -> dict:
    return {
        "titles": [{"id": "title", "startMs": 0, "endMs": 10000}],
        "middleEvents": [
            {
                "id": "keyword",
                "startMs": 2000,
                "endMs": 2600,
                "showAtMs": 2000,
                "rendererComponent": "ImpactToken",
                "semanticPurpose": "keywordNumber",
                "placement": "leftMiddle",
                "compositionGroup": "pair",
                "allowConcurrent": True,
                "payload": {"text": "重点"},
            },
            {
                "id": "verdict",
                "startMs": 6000,
                "endMs": 7200,
                "rendererComponent": "VerdictStamp",
                "semanticPurpose": "verdict",
                "placement": "leftMiddle",
                "payload": {"verdict": "成立", "verdictAtMs": 6400},
            },
        ],
        "enumerations": [],
        "externalMaterials": [
            {
                "id": "material",
                "startMs": 2000,
                "endMs": 4000,
                "rendererComponent": "MediaFrame",
                "placement": "rightMiddle",
                "compositionGroup": "pair",
                "allowConcurrent": True,
                "payload": {},
            }
        ],
        "h3Shots": [{"id": "h3", "startMs": 3000, "endMs": 5000}],
    }


class RhythmCompilerTests(unittest.TestCase):
    def test_compiles_without_touching_h3_or_reveal_beat(self) -> None:
        source = fixture()
        compiled, report = MODULE.compile_plan(source)
        keyword = compiled["middleEvents"][0]
        verdict = compiled["middleEvents"][1]
        material = compiled["externalMaterials"][0]
        self.assertLess(keyword["startMs"], 2000)
        self.assertLessEqual(material["startMs"], keyword["startMs"])
        self.assertEqual(6000, verdict["startMs"])
        self.assertEqual(6400, verdict["payload"]["verdictAtMs"])
        self.assertEqual(source["h3Shots"], compiled["h3Shots"])
        self.assertEqual(0, report["policy"]["modelCalls"])
        self.assertFalse(report["policy"]["layerPriorityAssigned"])

    def test_extends_short_final_hold_when_lane_is_free(self) -> None:
        source = fixture()
        source["middleEvents"][0]["payload"] = {"text": "重点", "accentAtMs": 2500}
        compiled, _ = MODULE.compile_plan(source)
        self.assertEqual(3400, compiled["middleEvents"][0]["endMs"])

    def test_is_idempotent(self) -> None:
        first, _ = MODULE.compile_plan(fixture())
        second, _ = MODULE.compile_plan(first)
        self.assertEqual(first, second)

    def test_visual_lead_does_not_create_new_unverified_transition_overlap(self) -> None:
        source = fixture()
        source["middleEvents"].append(
            {
                "id": "next",
                "startMs": 7300,
                "endMs": 8000,
                "rendererComponent": "InsightFocus",
                "placement": "rightMiddle",
                "payload": {"headline": "下一段"},
            }
        )
        compiled, _ = MODULE.compile_plan(source)
        next_event = next(item for item in compiled["middleEvents"] if item["id"] == "next")
        verdict = next(item for item in compiled["middleEvents"] if item["id"] == "verdict")
        self.assertGreaterEqual(next_event["startMs"], verdict["endMs"])


if __name__ == "__main__":
    unittest.main()
