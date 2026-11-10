from __future__ import annotations

import importlib.util
import json
import unittest
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parents[1]
SKILL_ROOT = SCRIPT_DIR.parent
CONFIG_DIR = SKILL_ROOT / "config"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


runner = load_module("runninghub_i2v", SCRIPT_DIR / "runninghub-i2v.py")


class RunningHubModesTest(unittest.TestCase):
    def read_pair(self, config_name: str) -> tuple[dict, dict]:
        template = CONFIG_DIR / "templates" / (config_name + ".example")
        config = json.loads(template.read_text(encoding="utf-8-sig"))
        workflow = json.loads((CONFIG_DIR / config["workflowFile"]).read_text(encoding="utf-8-sig"))
        return config, workflow

    def test_all_five_workflow_mappings_are_valid(self):
        for name in (
            "runninghub-t2v.local.json",
            "runninghub-i2va.local.json",
            "runninghub-l2va.local.json",
            "runninghub.local.json",
            "runninghub-ref2va.local.json",
        ):
            with self.subTest(config=name):
                config, workflow = self.read_pair(name)
                runner.validate_workflow_mapping(config, workflow)

    def test_templates_ship_preset_workflow_ids_but_no_api_key(self):
        expected = {
            "runninghub-t2v.local.json": "2089923514475302914",
            "runninghub-i2va.local.json": "2089924006987255809",
            "runninghub-l2va.local.json": "2093996052545359873",
            "runninghub.local.json": "2089925021438406657",
            "runninghub-ref2va.local.json": "2094049276589592578",
        }
        for name, workflow_id in expected.items():
            with self.subTest(config=name):
                config, _ = self.read_pair(name)
                self.assertEqual(config["workflowId"], workflow_id)
                self.assertEqual(str(config.get("apiKey") or ""), "")

    def test_l2va_mapping_uses_node_14_as_last_frame_and_node_19_as_output(self):
        config, workflow = self.read_pair("runninghub-l2va.local.json")
        self.assertEqual(config["workflowId"], "2093996052545359873")
        self.assertEqual(config["nodes"]["lastImage"], {"nodeId": "14", "fieldName": "image"})
        self.assertEqual(config["nodes"]["output"]["nodeId"], "19")
        self.assertEqual(workflow["17"]["inputs"]["task_type"], "L2VA")

    def test_ref2va_payload_has_exactly_the_configured_three_media_inputs(self):
        config, workflow = self.read_pair("runninghub-ref2va.local.json")
        self.assertEqual(config["workflowId"], "2094049276589592578")
        self.assertEqual(workflow["17"]["inputs"]["task_type"], "Ref2VA")
        captured: dict = {}
        original = runner.request_json

        def fake_request(url, api_key, payload):
            captured.update(payload)
            return {"taskId": "dry-test-task"}

        runner.request_json = fake_request
        try:
            task_id, _ = runner.create_task(
                {**config, "baseUrl": "https://example.invalid", "instanceType": "default", "workflowId": "mock-workflow"},
                "test-key",
                "test prompt",
                5,
                42,
                24,
                reference_image_file_name="reference-1.png",
                reference_image_2_file_name="reference-2.png",
                reference_video_file_name="motion.mp4",
            )
        finally:
            runner.request_json = original
        self.assertEqual(task_id, "dry-test-task")
        media_entries = {
            (entry["nodeId"], entry["fieldName"]): entry["fieldValue"]
            for entry in captured["nodeInfoList"]
            if entry["nodeId"] in {"14", "19", "28"}
        }
        self.assertEqual(media_entries, {
            ("14", "image"): "reference-2.png",
            ("19", "image"): "reference-1.png",
            ("28", "file"): "motion.mp4",
        })

    def test_audited_prompt_bundle_duration_is_authoritative(self):
        self.assertEqual(runner.resolve_generation_duration(None, 7), (7, "prompt-bundle"))
        self.assertEqual(runner.resolve_generation_duration(7, 7), (7, "prompt-bundle"))

    def test_conflicting_cli_duration_is_rejected(self):
        with self.assertRaisesRegex(runner.RunningHubError, "conflicts with audited prompt bundle"):
            runner.resolve_generation_duration(5, 7)

    def test_legacy_prompt_requires_explicit_duration(self):
        with self.assertRaisesRegex(runner.RunningHubError, "Generation duration is required"):
            runner.resolve_generation_duration(None, None)


if __name__ == "__main__":
    unittest.main()
