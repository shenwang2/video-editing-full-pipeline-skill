import json
from pathlib import Path
import runpy
import tempfile
import unittest
from unittest.mock import patch


INSTALLER = runpy.run_path(str(Path(__file__).resolve().parents[1] / "install-edit-project.py"))


class H3HandoffTests(unittest.TestCase):
    def test_failed_preflight_creates_no_project_directory(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            manifest = root / "edit-project.json"
            manifest.write_text('{"project":{"id":"audit-test"}}', encoding="utf-8")
            editor = root / "editor"
            editor.mkdir()
            # Isolate the invocation and ensure it gates installation, not merely a later validation.
            def fail(*args, **kwargs):
                raise ValueError("review is missing")
            main = INSTALLER["main"]
            with patch.dict(main.__globals__, {"validate_h3_review": fail}), patch(
                    "sys.argv", ["install-edit-project.py", str(manifest), "--editor-root", str(editor)]):
                with self.assertRaises(ValueError):
                    main()
            self.assertEqual(list(editor.iterdir()), [])

    def test_uses_authoritative_audit_and_passes_scope(self):
        validate = INSTALLER["validate_h3_review"]
        config_path = Path(__file__).resolve().parents[2] / "config/edit-desk.local.json"
        # Staged tests use the actual configured director only after installation;
        # callers can supply the staged director to exercise this test in isolation.
        import os
        director = os.environ.get("H3_TEST_DIRECTOR_ROOT")
        if not director:
            director = json.loads(config_path.read_text(encoding="utf-8-sig"))["sharedDirectorRoot"]
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            analysis = root / "analysis"
            analysis.mkdir()
            payloads = {
                "semantic-timeline.json": {"scenes": [
                    {"id": "a", "startMs": 0, "endMs": 1000},
                    {"id": "b", "startMs": 1000, "endMs": 2000}]},
                "foreground-plan.json": {"events": []},
                "h3-candidates.json": {"selected": []},
                "h3-opportunity-review.json": {"opportunities": [{
                    "sceneId": "a", "startMs": 0, "endMs": 1000,
                    "anchorText": "谢谢观看", "visualOpportunity": None, "benefit": None,
                    "decision": "not-selected", "reason": "保留这句收尾的真人表情", "candidateIds": []}]}}
            for name, payload in payloads.items():
                (analysis / name).write_text(json.dumps(payload), encoding="utf-8")
            config = {"sharedDirectorRoot": director}
            with self.assertRaises(ValueError):
                validate(root, config)
            self.assertTrue(validate(root, config, ["a"])["valid"])


if __name__ == "__main__":
    unittest.main()
