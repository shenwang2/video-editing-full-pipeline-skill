from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image


SCRIPT_DIR = Path(__file__).resolve().parents[1]
SKILL_ROOT = SCRIPT_DIR.parent


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


audit_module = load_module("audit_reference_first_contract", SCRIPT_DIR / "audit-reference-first-contract.py")
prompt_module = load_module("build_reference_first_h3_prompt", SCRIPT_DIR / "build-reference-first-h3-prompt.py")
duration_module = load_module("plan_h3_duration", SCRIPT_DIR / "plan-h3-duration.py")


class ReferenceFirstContractTest(unittest.TestCase):
    def make_contract(self, folder: Path) -> tuple[dict, Path]:
        contract = json.loads(
            (SKILL_ROOT / "assets" / "reference-first-h3-shot-template.json").read_text(encoding="utf-8")
        )
        first = folder / "first.png"
        contract["currentShotReference"]["path"] = str(first)
        contract["firstFrame"]["path"] = str(first)
        contract["sourceAnchor"] = {
            "startMs": 10000,
            "endMs": 17000,
            "text": "系统先读取多个输入，再把它们组装成一个结果。",
        }
        contract["durationPlan"]["strongEvents"] = [
            {"label": "读取第一个输入", "narrationAtMs": 12000},
            {"label": "汇集其余输入", "narrationAtMs": 14000},
            {"label": "组装结果", "narrationAtMs": 15500},
        ]
        contract["phases"][0]["narrationAtMs"] = 10000
        contract["phases"][1]["narrationAtMs"] = 13000
        contract["phases"][2]["narrationAtMs"] = 15800
        contract_path = folder / "contract.json"
        contract_path.write_text(json.dumps(contract, ensure_ascii=False), encoding="utf-8")
        return contract, contract_path

    def configure_mode(self, contract: dict, folder: Path, mode: str) -> None:
        first = folder / "first.png"
        last = folder / "last.png"
        current = folder / "current-shot-reference.png"
        contract["generationMode"] = mode
        contract["firstFrame"]["path"] = ""
        contract["lastFrame"]["path"] = ""
        contract["currentShotReference"] = {"path": "", "role": "", "purpose": ""}
        if mode == "T2VA":
            return
        if mode == "I2VA":
            contract["firstFrame"]["path"] = str(first)
            contract["currentShotReference"] = {
                "path": str(first),
                "role": "first-frame",
                "purpose": "Current-shot exact opening visual solution.",
            }
            return
        if mode == "L2VA":
            contract["lastFrame"].update(
                {
                    "path": str(last),
                    "state": "The exact completed result.",
                    "continuityLocks": ["same subjects", "same camera", "same object count"],
                    "arrivalRulesEn": "Approach the final arrangement only in the last phase and land exactly.",
                }
            )
            contract["currentShotReference"] = {
                "path": str(last),
                "role": "last-frame",
                "purpose": "Current-shot exact destination visual solution.",
            }
            return
        if mode == "FL2VA":
            contract["firstFrame"]["path"] = str(first)
            contract["lastFrame"].update(
                {
                    "path": str(last),
                    "state": "The exact completed result.",
                    "continuityLocks": ["same subjects", "same camera", "same object count"],
                    "arrivalRulesEn": "Land exactly on Picture 2 during the final phase.",
                }
            )
            contract["currentShotReference"] = {
                "path": str(last),
                "role": "endpoint-pair-context",
                "purpose": "Current-shot endpoint pair defining the complete transformation.",
            }
            contract["endpointTransitionEn"] = (
                "Transform the objects continuously from Picture 1 into Picture 2 using the selected motion law."
            )
            return
        if mode == "Ref2VA":
            contract["referenceImage"].update(
                {
                    "path": str(current),
                    "currentShotReference": True,
                    "purpose": "the current subject, content relationship, 16:9 composition, and material hierarchy",
                    "doNotCopy": "Nothing from the current shot; omit only baked-in text or UI",
                }
            )
            contract["referenceImage2"].update(
                {
                    "path": str(folder / "reference-2.jpg"),
                    "currentShotReference": False,
                    "purpose": "the complementary palette and surface response",
                    "doNotCopy": "brand, wording, character identity, exact layout, or unrelated content",
                }
            )
            contract["referenceVideo"].update(
                {
                    "path": str(folder / "motion.mp4"),
                    "purpose": "the outward focus path, camera depth behavior, return path, and final settling rhythm",
                    "doNotCopy": "subject identity, brand, wording, storyline, soundtrack, or unrelated content",
                    "sourceFrom": 0.0,
                    "sourceTo": 5.0,
                    "motionBeats": [
                        {
                            "from": 0.0,
                            "to": 0.8,
                            "mechanismEn": "Establish one centered source and the surrounding destinations.",
                            "mapsToPhase": 0,
                        },
                        {
                            "from": 0.8,
                            "to": 3.8,
                            "mechanismEn": "Move the causal objects outward through the chosen attention path.",
                            "mapsToPhase": 1,
                        },
                        {
                            "from": 3.8,
                            "to": 5.0,
                            "mechanismEn": "Return attention to the stable completed arrangement and stop.",
                            "mapsToPhase": 2,
                        },
                    ],
                }
            )
            contract["currentShotReference"] = {
                "path": str(current),
                "role": "content-layout-style",
                "purpose": "Current-shot-specific primary content, composition, and style reference.",
            }

    def test_valid_i2va_contract_compiles_motion_pattern_into_prompt(self):
        with tempfile.TemporaryDirectory() as temp:
            contract, path = self.make_contract(Path(temp))
            report = audit_module.audit(contract, path, allow_missing_frames=True)
            self.assertTrue(report["valid"], report["errors"])
            prompt = prompt_module.build_prompt(contract)
            self.assertIn("Exact-first-frame contract", prompt)
            self.assertIn("Primary motion grammar M03", prompt)
            self.assertIn(contract["motionPatternContract"]["primaryLawEn"], prompt)
            self.assertIn("[transform]", prompt)

    def test_single_spatial_reveal_uses_existing_duration_and_contract_without_transformation(self):
        with tempfile.TemporaryDirectory() as temp:
            contract, path = self.make_contract(Path(temp))
            self.configure_mode(contract, Path(temp), "T2VA")
            contract["sourceAnchor"] = {
                "startMs": 10000, "endMs": 14000,
                "text": "这两个区域处于同一个空间的不同高度。",
            }
            contract["templateId"] = "T09"
            contract["motionPattern"] = "NEW"
            contract["motionPatternContract"] = {
                "relationshipType": "spatial-reveal",
                "relationshipStatement": "Two unchanged regions occupy different heights in one space.",
                "selectionRationale": "A viewpoint reveal, not assembly or splitting, makes height legible.",
                "primaryLawEn": "Raise the camera slightly to reveal both fixed platforms at different heights.",
                "triggerEn": "Begin the viewpoint reveal when the narration introduces different heights.",
                "attentionPathEn": "Move attention from the near platform to both visible platforms.",
                "resultProofEn": "Both stationary platforms are visible together with their height difference.",
            }
            plan = duration_module.plan_duration({
                "id": contract["id"], "startMs": 10000, "endMs": 14000,
                "motionPattern": "NEW", "continuousProcess": False,
                "strongEvents": [{"label": "Both platform heights become visible", "narrationAtMs": 10800}],
            })
            self.assertEqual(plan["decisionStatus"], "ready")
            self.assertEqual(plan["strongEventCount"], 1)
            self.assertEqual(plan["durationClass"], "single-impact")
            contract["durationPlan"] = plan
            contract["durationSeconds"] = plan["selectedDurationSeconds"]
            end = float(contract["durationSeconds"])
            contract["knowledgePoint"] = "Two regions occupy different heights in the same space."
            contract["viewerInference"] = "Understand the fixed spatial relationship without a physical transformation."
            contract["routeReason"] = "The scene reveals depth while foreground labels name the regions."
            contract["startStateEn"] = "Two fixed platforms, with the farther platform partly occluded."
            contract["causalActionEn"] = "The camera reveals the pre-existing height relationship; neither platform moves or transforms."
            contract["resultStateEn"] = "Both unchanged platforms and their height difference remain readable."
            contract["initialCompositionEn"] = contract["startStateEn"]
            contract["cameraEn"] = contract["motionPatternContract"]["primaryLawEn"]
            contract["endStateEn"] = contract["resultStateEn"]
            contract["phases"] = [
                {"role": "establish", "from": 0, "to": 0.6, "subjectEn": "The two platforms", "actionEn": "remain fixed", "outcomeEn": "the near platform is readable", "narrationAnchorText": "这两个区域", "narrationAtMs": 10000},
                {"role": "transform", "from": 0.6, "to": end - 0.7, "subjectEn": "The camera", "actionEn": "rises to reveal both fixed platforms", "outcomeEn": "the existing height difference becomes readable", "narrationAnchorText": "不同高度", "narrationAtMs": 10800},
                {"role": "result-hold", "from": end - 0.7, "to": end, "subjectEn": "The camera", "actionEn": "holds the revealed view", "outcomeEn": "both unchanged regions stay visible", "narrationAnchorText": "不同高度", "narrationAtMs": 13300},
            ]
            contract["foregroundCoexistence"]["retainedEventIds"] = ["region-labels", "height-diagram"]
            report = audit_module.audit(contract, path, allow_missing_frames=True)
            self.assertTrue(report["valid"], report["errors"])
            self.assertEqual(prompt_module.validate(contract), [])
            prompt = prompt_module.build_prompt(contract)
            self.assertIn(contract["causalActionEn"], prompt)
            self.assertIn(contract["resultStateEn"], prompt)
            self.assertNotIn("The single causal action is:", prompt)
            self.assertEqual(len(contract["phases"]), 3)
            self.assertEqual(contract["foregroundCoexistence"]["retainedEventIds"], ["region-labels", "height-diagram"])

    def test_all_five_modes_have_distinct_complete_prompt_envelopes(self):
        expected = {
            "T2VA": "Text-to-video input contract",
            "I2VA": "Exact-first-frame contract",
            "L2VA": "Exact-last-frame contract",
            "FL2VA": "Exact-endpoint contract",
            "Ref2VA": "Reference-video input contract",
        }
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            for mode, marker in expected.items():
                with self.subTest(mode=mode):
                    contract, path = self.make_contract(folder)
                    self.configure_mode(contract, folder, mode)
                    report = audit_module.audit(contract, path, allow_missing_frames=True)
                    self.assertTrue(report["valid"], report["errors"])
                    self.assertEqual(prompt_module.validate(contract), [])
                    prompt = prompt_module.build_prompt(contract)
                    self.assertIn(marker, prompt)
                    self.assertIn("Primary motion grammar M03", prompt)
                    self.assertIn("integrated_multimodal_description", prompt)
                    self.assertIn("overall_soundscape", prompt)
                    self.assertIn("non_diegetic_music", prompt)

    def test_wrong_information_direction_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            contract, path = self.make_contract(Path(temp))
            contract["motionPatternContract"]["relationshipType"] = "one-to-many"
            report = audit_module.audit(contract, path, allow_missing_frames=True)
            self.assertFalse(report["valid"])
            self.assertTrue(any("M03 requires" in error for error in report["errors"]))

    def test_ref2va_requires_current_shot_primary_reference_and_phase_mapping(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            contract, path = self.make_contract(folder)
            self.configure_mode(contract, folder, "Ref2VA")
            prompt = prompt_module.build_prompt(contract)
            self.assertIn("Picture 1 is the current-shot-specific primary reference", prompt)
            self.assertIn("Reference Video 1 is authoritative", prompt)
            self.assertIn("Reference-to-current motion mapping", prompt)
            self.assertIn("Reference 0.80-3.80s supplies", prompt)
            contract["referenceImage"]["currentShotReference"] = False
            report = audit_module.audit(contract, path, allow_missing_frames=True)
            self.assertFalse(report["valid"])
            self.assertIn(
                "Ref2VA referenceImage.currentShotReference must be true",
                report["errors"],
            )

    def test_ref2va_rejects_motion_reference_negation(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            contract, path = self.make_contract(folder)
            self.configure_mode(contract, folder, "Ref2VA")
            contract["referenceVideo"]["doNotCopy"] = (
                "subject identity, wording, and exact choreography"
            )
            report = audit_module.audit(contract, path, allow_missing_frames=True)
            self.assertFalse(report["valid"])
            self.assertTrue(any("neutralizes the selected M reference" in error for error in report["errors"]))

    def test_ref2va_rejects_incomplete_reference_beat_mapping(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            contract, path = self.make_contract(folder)
            self.configure_mode(contract, folder, "Ref2VA")
            contract["referenceVideo"]["motionBeats"][-1]["mapsToPhase"] = 1
            report = audit_module.audit(contract, path, allow_missing_frames=True)
            self.assertFalse(report["valid"])
            self.assertIn(
                "referenceVideo.motionBeats must map every current-shot phase",
                report["errors"],
            )

    def test_early_result_anchor_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            contract, path = self.make_contract(Path(temp))
            contract["phases"][2]["narrationAtMs"] = 11000
            report = audit_module.audit(contract, path, allow_missing_frames=True)
            self.assertFalse(report["valid"])
            self.assertTrue(any("nondecreasing" in error for error in report["errors"]))

    def test_missing_duration_plan_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            contract, path = self.make_contract(Path(temp))
            contract.pop("durationPlan")
            report = audit_module.audit(contract, path, allow_missing_frames=True)
            self.assertFalse(report["valid"])
            self.assertIn("durationPlan must be an object created before prompt compilation", report["errors"])

    def test_fixed_duration_override_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            contract, path = self.make_contract(Path(temp))
            contract["durationSeconds"] = 5
            report = audit_module.audit(contract, path, allow_missing_frames=True)
            self.assertFalse(report["valid"])
            self.assertIn("durationPlan.selectedDurationSeconds must equal durationSeconds", report["errors"])

    def test_prompt_states_the_planned_duration(self):
        with tempfile.TemporaryDirectory() as temp:
            contract, _ = self.make_contract(Path(temp))
            prompt = prompt_module.build_prompt(contract)
            self.assertIn("exactly 7.00 seconds", prompt)

    @unittest.skipUnless((SKILL_ROOT / "assets/creator-reference-library").is_dir(), "Optional creator library is not distributed")
    def test_creator_direct_media_is_allowed_without_commercial_gate(self):
        with tempfile.TemporaryDirectory() as temp:
            contract, path = self.make_contract(Path(temp))
            contract["commercialIntent"] = True
            contract["referenceContract"] = [
                {
                    "assetId": "148cf02ecf10",
                    "library": "creator",
                    "roles": ["P", "C", "M"],
                    "usage": "direct-media",
                    "borrow": "Directional collage mechanism.",
                    "doNotCopy": "Identity, layout, colors, wording, and source content.",
                }
            ]
            report = audit_module.audit(contract, path, allow_missing_frames=True)
            self.assertTrue(report["valid"], report["errors"])
            self.assertNotIn("commercialIntent", report)

    @unittest.skipUnless((SKILL_ROOT / "assets/creator-reference-library").is_dir(), "Optional creator library is not distributed")
    def test_ref2va_accepts_2k_current_reference_plus_creator_media(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            contract, path = self.make_contract(folder)
            self.configure_mode(contract, folder, "Ref2VA")
            current = Path(contract["referenceImage"]["path"])
            Image.new("RGB", (2048, 1152), (240, 235, 220)).save(current)
            creator_media = SKILL_ROOT / "assets" / "creator-reference-library" / "media"
            contract["referenceImage2"]["path"] = str(creator_media / "images" / "fd2a864cb550.jpg")
            contract["referenceVideo"]["path"] = str(creator_media / "videos" / "3491d696a36c.mp4")
            report = audit_module.audit(contract, path, allow_missing_frames=False)
            self.assertTrue(report["valid"], report["errors"])


if __name__ == "__main__":
    unittest.main()
