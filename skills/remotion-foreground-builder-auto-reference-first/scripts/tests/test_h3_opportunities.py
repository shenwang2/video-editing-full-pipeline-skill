import copy
import json
from pathlib import Path
import runpy
import tempfile
import unittest


MODULE = runpy.run_path(str(Path(__file__).resolve().parents[1] / "audit-h3-opportunities.py"))
audit = MODULE["audit"]
audit_directory = MODULE["audit_directory"]


def fixture():
    scenes = [{"id": "s1", "startMs": 0, "endMs": 5000},
              {"id": "s2", "startMs": 5000, "endMs": 10000}]
    entries = [dict(sceneId=s["id"], startMs=s["startMs"], endMs=s["endMs"],
                    anchorText=text, visualOpportunity=None, benefit=None,
                    decision="not-selected", reason=reason, candidateIds=[])
               for s, text, reason in zip(scenes, ["看这个实际操作", "感谢你看到这里"],
               ["录屏已展示这次点击及结果，生成画面不能增加理解。", "这句收尾需要保留讲述者的表情和停顿。"])]
    return {"scenes": scenes}, {"opportunities": entries}, {"selected": []}


def select(data):
    timeline, review, candidates = data
    review["opportunities"][0].update(
        visualOpportunity="抽象材料从杂乱场域聚成一条相关路径，明确作为示意。",
        benefit="观众看到筛选使范围缩小，帮助记住关键词的作用。",
        foregroundCoexistence="保留关键词标题和标签；路径在空白中央展开。",
        decision="selected", candidateIds=["h1"], reason="标签命名条件，示意画面呈现范围变化。")
    candidates["selected"] = [{"id": "h1", "sceneId": "s1", "sourceAnchor": {
        "startMs": 500, "endMs": 4500, "anchorText": "关键词决定搜索范围"}}]
    return data


class H3OpportunityTests(unittest.TestCase):
    def test_zero_shots_is_valid(self):
        report = audit(*fixture())
        self.assertTrue(report["valid"], report)
        self.assertEqual(report["selectedCount"], 0)

    def test_selected_subspan_is_valid(self):
        self.assertTrue(audit(*select(fixture()))["valid"])

    def test_blocked_is_not_rejection_or_selected(self):
        data = select(fixture())
        data[1]["opportunities"][0].update(decision="blocked", candidateIds=[], blocker="No paid-generation authorization")
        data[2]["selected"] = []
        report = audit(*data)
        self.assertTrue(report["valid"], report)
        self.assertEqual(report["blockedSceneIds"], ["s1"])
        self.assertTrue(report["warnings"])
        data[1]["opportunities"][0]["decision"] = "not-selected"
        self.assertFalse(audit(*data)["valid"])

    def test_missing_or_duplicate_scene_fails(self):
        for duplicate in (False, True):
            data = fixture()
            entries = data[1]["opportunities"]
            entries.append(copy.deepcopy(entries[0])) if duplicate else entries.pop()
            self.assertFalse(audit(*data)["valid"])

    def test_old_blanket_rejection_shape_fails(self):
        data = fixture()
        data[1]["opportunities"] = [
            {"sceneId": s["id"], "startMs": s["startMs"], "endMs": s["endMs"],
             "anchor": "paraphrased title", "decision": "not-selected", "reason": "foreground is enough"}
            for s in data[0]["scenes"]]
        self.assertFalse(audit(*data)["valid"])

    def test_missing_required_fields_fail(self):
        for field in ("anchorText", "reason", "visualOpportunity", "benefit", "candidateIds"):
            with self.subTest(field=field):
                data = fixture()
                del data[1]["opportunities"][0][field]
                self.assertFalse(audit(*data)["valid"])

    def test_review_timing_must_match_scene(self):
        data = fixture()
        data[1]["opportunities"][0]["startMs"] = 1
        self.assertFalse(audit(*data)["valid"])

    def test_candidate_links_and_bounds(self):
        mutations = [lambda d: d[2]["selected"].clear(),
                     lambda d: d[1]["opportunities"][0].update(candidateIds=["h1", "h1"]),
                     lambda d: d[2]["selected"][0].update(sceneId="s2"),
                     lambda d: d[2]["selected"][0]["sourceAnchor"].update(endMs=5500),
                     lambda d: d[2]["selected"][0]["sourceAnchor"].update(startMs=float("nan")),
                     lambda d: d[1]["opportunities"][0].update(foregroundCoexistence=None)]
        for mutate in mutations:
            data = select(fixture())
            mutate(data)
            self.assertFalse(audit(*data)["valid"])

    def test_unreferenced_candidate_fails(self):
        data = select(fixture())
        data[1]["opportunities"][0].update(decision="not-selected", candidateIds=[])
        self.assertFalse(audit(*data)["valid"])

    def test_explicit_scope_not_review_declared_scope(self):
        data = fixture()
        data[1]["opportunities"].pop()
        data[1]["scopeSceneIds"] = ["s1"]
        self.assertFalse(audit(*data)["valid"])
        self.assertTrue(audit(*data, scope_scene_ids=["s1"])["valid"])
        self.assertFalse(audit(*data, scope_scene_ids=["unknown"])["valid"])

    def test_repeated_reasons_warn_without_quota(self):
        data = fixture()
        data[1]["opportunities"][1]["reason"] = data[1]["opportunities"][0]["reason"]
        report = audit(*data)
        self.assertTrue(report["valid"])
        self.assertTrue(report["warnings"])

    def test_missing_shortlist_or_foreground_file_fails(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            timeline, review, candidates = fixture()
            payloads = {"semantic-timeline.json": timeline, "h3-opportunity-review.json": review,
                        "h3-candidates.json": candidates, "foreground-plan.json": {"events": []}}
            for name, payload in payloads.items():
                (root / name).write_text(json.dumps(payload), encoding="utf-8")
            self.assertTrue(audit_directory(root)["valid"])
            for name in ("h3-candidates.json", "foreground-plan.json"):
                (root / name).unlink()
                self.assertFalse(audit_directory(root)["valid"])
                (root / name).write_text(json.dumps(payloads[name]), encoding="utf-8")

    def test_bad_shapes_fail_without_crash(self):
        for values in ((None, None, None), ({"scenes": [None]}, {}, {}),
                       ({"scenes": [{"id": []}]}, {"opportunities": []}, {"selected": []})):
            self.assertFalse(audit(*values)["valid"])


if __name__ == "__main__":
    unittest.main()
