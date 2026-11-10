#!/usr/bin/env python3
"""Compile a schema-v3 reference-first H3 contract for all five RunningHub modes."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


MODES = {"T2VA", "I2VA", "L2VA", "FL2VA", "Ref2VA"}
ROUTES = {"MINIMAX_H3", "MINIMAX_H3_PACKAGING"}
PATTERN_RELATIONSHIPS = {
    "M01": "continuous-journey",
    "M02": "same-layout-state-change",
    "M03": "many-to-one",
    "M04": "one-to-many",
    "M05": "structured-reveal",
    "M06": "region-to-result",
    "M07": "cumulative-evidence",
    "M08": "rank-change",
    "M09": "collection-traversal",
    "M10": "single-claim-impact",
}
PHASE_ROLES = {
    3: ["establish", "transform", "result-hold"],
    4: ["establish", "trigger", "transform", "result-hold"],
}
CLASS_RANGES = {
    "single-impact": (3, 5),
    "short-sequence": (6, 9),
    "continuous-process": (10, 15),
}


def clean(value: Any) -> str:
    return " ".join(str(value or "").split())


def trim_terminal(value: Any) -> str:
    return clean(value).rstrip(" .;")


def valid_template(value: str) -> bool:
    return len(value) == 3 and value.startswith("T") and value[1:].isdigit() and 1 <= int(value[1:]) <= 21


def required_text(errors: list[str], data: dict[str, Any], prefix: str, fields: tuple[str, ...]) -> None:
    for field in fields:
        if not clean(data.get(field)):
            errors.append(f"{prefix}{field} is required")


def validate_motion_contract(contract: dict[str, Any], errors: list[str]) -> None:
    pattern = clean(contract.get("motionPattern"))
    if pattern != "NEW" and pattern not in PATTERN_RELATIONSHIPS:
        errors.append("motionPattern must be M01-M10 or NEW")
        return
    motion = contract.get("motionPatternContract")
    if not isinstance(motion, dict):
        errors.append("motionPatternContract must be an object")
        return
    required_text(
        errors,
        motion,
        "motionPatternContract.",
        (
            "relationshipType",
            "relationshipStatement",
            "selectionRationale",
            "primaryLawEn",
            "triggerEn",
            "attentionPathEn",
            "resultProofEn",
        ),
    )
    expected = PATTERN_RELATIONSHIPS.get(pattern)
    actual = clean(motion.get("relationshipType"))
    if expected and actual and actual != expected:
        errors.append(
            f"{pattern} requires motionPatternContract.relationshipType={expected!r}, got {actual!r}; "
            "choose a matching pattern or use NEW"
        )


def validate_duration_plan(contract: dict[str, Any], errors: list[str]) -> None:
    duration = contract.get("durationSeconds")
    plan = contract.get("durationPlan")
    if not isinstance(duration, int) or isinstance(duration, bool) or not 3 <= duration <= 15:
        errors.append("durationSeconds must be an integer between 3 and 15")
    if not isinstance(plan, dict):
        errors.append("durationPlan must be an object created before prompt compilation")
        return
    if plan.get("schemaVersion") != 1:
        errors.append("durationPlan.schemaVersion must be 1")
    if clean(plan.get("shotId")) != clean(contract.get("id")):
        errors.append("durationPlan.shotId must equal contract id")
    if clean(plan.get("decisionStatus")) != "ready":
        errors.append("durationPlan.decisionStatus must be 'ready'")
    duration_class = clean(plan.get("durationClass"))
    if duration_class not in CLASS_RANGES:
        errors.append(f"durationPlan.durationClass must be one of {sorted(CLASS_RANGES)}")
    selected = plan.get("selectedDurationSeconds")
    if not isinstance(selected, int) or isinstance(selected, bool):
        errors.append("durationPlan.selectedDurationSeconds must be an integer")
    elif selected != duration:
        errors.append("durationPlan.selectedDurationSeconds must equal durationSeconds")
    elif duration_class in CLASS_RANGES:
        low, high = CLASS_RANGES[duration_class]
        if not low <= selected <= high:
            errors.append(f"durationPlan.selectedDurationSeconds must fit {duration_class} range {low}-{high}")

    if clean(plan.get("motionPattern")) != clean(contract.get("motionPattern")):
        errors.append("durationPlan.motionPattern must equal motionPattern")
    pattern_range = plan.get("motionPatternRangeSeconds")
    if (
        not isinstance(pattern_range, list)
        or len(pattern_range) != 2
        or any(not isinstance(item, (int, float)) or isinstance(item, bool) for item in pattern_range)
        or float(pattern_range[1]) < float(pattern_range[0])
    ):
        errors.append("durationPlan.motionPatternRangeSeconds must be an ordered numeric pair")

    anchor = contract.get("sourceAnchor")
    start_ms = anchor.get("startMs") if isinstance(anchor, dict) else None
    end_ms = anchor.get("endMs") if isinstance(anchor, dict) else None
    if (
        not isinstance(start_ms, (int, float))
        or isinstance(start_ms, bool)
        or not isinstance(end_ms, (int, float))
        or isinstance(end_ms, bool)
        or float(end_ms) <= float(start_ms)
    ):
        errors.append("sourceAnchor must provide numeric startMs/endMs with endMs greater than startMs")
    else:
        expected_span = (float(end_ms) - float(start_ms)) / 1000.0
        span = plan.get("narrationSpanSeconds")
        if not isinstance(span, (int, float)) or isinstance(span, bool):
            errors.append("durationPlan.narrationSpanSeconds must be numeric")
        elif abs(float(span) - expected_span) > 0.06:
            errors.append("durationPlan.narrationSpanSeconds must match sourceAnchor")
        elif isinstance(selected, int) and not isinstance(selected, bool):
            fit_limit = max(1.0, expected_span * 0.15)
            if abs(float(selected) - expected_span) > fit_limit + 0.001:
                errors.append("duration plan exceeds direct-fit budget; refine or split the source anchor")

    events = plan.get("strongEvents")
    count = plan.get("strongEventCount")
    if not isinstance(events, list) or not events:
        errors.append("durationPlan.strongEvents must contain meaningful visible changes")
    else:
        if not isinstance(count, int) or isinstance(count, bool) or count != len(events):
            errors.append("durationPlan.strongEventCount must equal the number of strongEvents")
        for index, event in enumerate(events):
            if not isinstance(event, dict) or not clean(event.get("label")):
                errors.append(f"durationPlan.strongEvents[{index}].label is required")
                continue
            at_ms = event.get("narrationAtMs")
            if not isinstance(at_ms, (int, float)) or isinstance(at_ms, bool):
                errors.append(f"durationPlan.strongEvents[{index}].narrationAtMs must be numeric")
            elif isinstance(start_ms, (int, float)) and isinstance(end_ms, (int, float)):
                if not float(start_ms) <= float(at_ms) <= float(end_ms):
                    errors.append(f"durationPlan.strongEvents[{index}].narrationAtMs must fall inside sourceAnchor")

    if not clean(plan.get("selectionRationale")):
        errors.append("durationPlan.selectionRationale is required")
    retime = plan.get("retimePolicy")
    if not isinstance(retime, dict):
        errors.append("durationPlan.retimePolicy must be an object")
    else:
        if clean(retime.get("role")) != "fine-adjustment-only":
            errors.append("durationPlan.retimePolicy.role must be 'fine-adjustment-only'")
        rate_delta = retime.get("maxPlaybackRateDelta")
        if not isinstance(rate_delta, (int, float)) or isinstance(rate_delta, bool) or not 0 < float(rate_delta) <= 0.10:
            errors.append("durationPlan.retimePolicy.maxPlaybackRateDelta must be > 0 and <= 0.10")
        hold = retime.get("maxHoldSeconds")
        if not isinstance(hold, (int, float)) or isinstance(hold, bool) or not 0 <= float(hold) <= 0.8:
            errors.append("durationPlan.retimePolicy.maxHoldSeconds must be between 0 and 0.8")
        if retime.get("regenerateBeyondBudget") is not True:
            errors.append("durationPlan.retimePolicy.regenerateBeyondBudget must be true")


def validate_phases(contract: dict[str, Any], errors: list[str]) -> None:
    duration = contract.get("durationSeconds")
    phases = contract.get("phases")
    if not isinstance(phases, list) or len(phases) not in PHASE_ROLES:
        errors.append("phases must contain 3 or 4 ordered phases")
        return
    expected_roles = PHASE_ROLES[len(phases)]
    cursor = 0.0
    for index, phase in enumerate(phases):
        prefix = f"phases[{index}]"
        if not isinstance(phase, dict):
            errors.append(f"{prefix} must be an object")
            continue
        start, end = phase.get("from"), phase.get("to")
        if (
            not isinstance(start, (int, float))
            or not isinstance(end, (int, float))
            or isinstance(start, bool)
            or isinstance(end, bool)
        ):
            errors.append(f"{prefix} requires numeric from/to")
            continue
        if abs(float(start) - cursor) > 0.06 or float(end) <= float(start):
            errors.append(f"{prefix} must begin at {cursor:g} and have positive duration")
        cursor = float(end)
        if clean(phase.get("role")) != expected_roles[index]:
            errors.append(f"{prefix}.role must be {expected_roles[index]!r}")
        required_text(
            errors,
            phase,
            f"{prefix}.",
            ("subjectEn", "actionEn", "outcomeEn", "narrationAnchorText"),
        )
        if not isinstance(phase.get("narrationAtMs"), (int, float)) or isinstance(phase.get("narrationAtMs"), bool):
            errors.append(f"{prefix}.narrationAtMs must be numeric")
    if isinstance(duration, (int, float)) and not isinstance(duration, bool):
        if abs(cursor - float(duration)) > 0.06:
            errors.append("phases must cover durationSeconds exactly")
        final_phase = phases[-1]
        if isinstance(final_phase, dict):
            start, end = final_phase.get("from"), final_phase.get("to")
            if isinstance(start, (int, float)) and isinstance(end, (int, float)) and float(end) - float(start) < 0.6:
                errors.append("final phase must hold the stable result for at least 0.6 seconds")


def validate_ref2va(contract: dict[str, Any], errors: list[str]) -> None:
    image_1 = contract.get("referenceImage") or {}
    image_2 = contract.get("referenceImage2") or {}
    video = contract.get("referenceVideo") or {}
    current = contract.get("currentShotReference") or {}
    for label, item in (("referenceImage", image_1), ("referenceImage2", image_2), ("referenceVideo", video)):
        if not clean(item.get("path")):
            errors.append(f"Ref2VA requires {label}.path")
        required_text(errors, item, f"{label}.", ("purpose", "doNotCopy"))
    if image_1.get("currentShotReference") is not True:
        errors.append("Ref2VA referenceImage.currentShotReference must be true")
    if image_2.get("currentShotReference") is not False:
        errors.append("Ref2VA referenceImage2.currentShotReference must be false")
    if clean(image_1.get("purpose")).lower() == clean(image_2.get("purpose")).lower():
        errors.append("Ref2VA reference images must have non-duplicative purposes")
    if clean(current.get("role")) != "content-layout-style":
        errors.append("Ref2VA currentShotReference.role must be 'content-layout-style'")
    if clean(current.get("path")) != clean(image_1.get("path")):
        errors.append("Ref2VA currentShotReference.path must equal referenceImage.path")
    source_from, source_to = video.get("sourceFrom"), video.get("sourceTo")
    if not isinstance(source_from, (int, float)) or isinstance(source_from, bool):
        errors.append("referenceVideo.sourceFrom must be numeric")
        return
    if not isinstance(source_to, (int, float)) or isinstance(source_to, bool) or float(source_to) <= float(source_from):
        errors.append("referenceVideo.sourceTo must be greater than sourceFrom")
        return
    beats = video.get("motionBeats")
    phases = contract.get("phases") if isinstance(contract.get("phases"), list) else []
    if not isinstance(beats, list) or not 2 <= len(beats) <= 6:
        errors.append("referenceVideo.motionBeats must contain 2-6 ordered beats")
        return
    cursor = float(source_from)
    mapped: set[int] = set()
    for index, beat in enumerate(beats):
        prefix = f"referenceVideo.motionBeats[{index}]"
        if not isinstance(beat, dict):
            errors.append(f"{prefix} must be an object")
            continue
        start, end = beat.get("from"), beat.get("to")
        if (
            not isinstance(start, (int, float))
            or not isinstance(end, (int, float))
            or isinstance(start, bool)
            or isinstance(end, bool)
        ):
            errors.append(f"{prefix} requires numeric from/to")
            continue
        if abs(float(start) - cursor) > 0.06 or float(end) <= float(start):
            errors.append(f"{prefix} must begin at {cursor:g} and have positive duration")
        cursor = float(end)
        if not clean(beat.get("mechanismEn")):
            errors.append(f"{prefix}.mechanismEn is required")
        phase_index = beat.get("mapsToPhase")
        if not isinstance(phase_index, int) or isinstance(phase_index, bool) or not 0 <= phase_index < len(phases):
            errors.append(f"{prefix}.mapsToPhase must address an existing phase")
        else:
            mapped.add(phase_index)
    if abs(cursor - float(source_to)) > 0.06:
        errors.append("referenceVideo.motionBeats must cover sourceFrom-sourceTo exactly")
    if phases and mapped != set(range(len(phases))):
        errors.append("referenceVideo.motionBeats must map every current-shot phase")


def validate_mode_inputs(contract: dict[str, Any], errors: list[str]) -> None:
    mode = clean(contract.get("generationMode"))
    current = contract.get("currentShotReference") or {}
    first = contract.get("firstFrame") or {}
    last = contract.get("lastFrame") or {}
    if mode != "T2VA":
        required_text(errors, current, "currentShotReference.", ("path", "role", "purpose"))
    if mode == "T2VA":
        return
    if mode == "I2VA":
        required_text(errors, first, "firstFrame.", ("path", "state", "allowedMotionEn"))
        if not isinstance(first.get("continuityLocks"), list) or not first.get("continuityLocks"):
            errors.append("I2VA firstFrame.continuityLocks is required")
        if clean(current.get("role")) != "first-frame" or clean(current.get("path")) != clean(first.get("path")):
            errors.append("I2VA currentShotReference must identify the exact first frame")
    elif mode == "L2VA":
        required_text(errors, last, "lastFrame.", ("path", "state", "arrivalRulesEn"))
        if not isinstance(last.get("continuityLocks"), list) or not last.get("continuityLocks"):
            errors.append("L2VA lastFrame.continuityLocks is required")
        if clean(current.get("role")) != "last-frame" or clean(current.get("path")) != clean(last.get("path")):
            errors.append("L2VA currentShotReference must identify the exact last frame")
    elif mode == "FL2VA":
        required_text(errors, first, "firstFrame.", ("path", "state", "allowedMotionEn"))
        required_text(errors, last, "lastFrame.", ("path", "state", "arrivalRulesEn"))
        if not clean(contract.get("endpointTransitionEn")):
            errors.append("FL2VA endpointTransitionEn is required")
        if clean(current.get("role")) != "endpoint-pair-context":
            errors.append("FL2VA currentShotReference.role must be 'endpoint-pair-context'")
        if clean(current.get("path")) not in {clean(first.get("path")), clean(last.get("path"))}:
            errors.append("FL2VA currentShotReference.path must identify one of the exact endpoint frames")
    elif mode == "Ref2VA":
        validate_ref2va(contract, errors)


def validate(contract: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if contract.get("schemaVersion") != 3:
        errors.append("schemaVersion must be 3")
    if contract.get("route") not in ROUTES:
        errors.append(f"route must be one of {sorted(ROUTES)}")
    if not valid_template(clean(contract.get("templateId"))):
        errors.append("templateId must be T01-T21")
    mode = clean(contract.get("generationMode"))
    if mode not in MODES:
        errors.append(f"generationMode must be one of {sorted(MODES)}")
    validate_duration_plan(contract, errors)
    if contract.get("aspectRatio") != "16:9":
        errors.append("aspectRatio must be 16:9")
    if contract.get("placement") != "fullscreen":
        errors.append("placement must be fullscreen")
    if contract.get("workflowResolutionPolicy") != "native":
        errors.append("workflowResolutionPolicy must be native")
    required_text(
        errors,
        contract,
        "",
        (
            "id",
            "knowledgePoint",
            "viewerInference",
            "routeReason",
            "startStateEn",
            "causalActionEn",
            "resultStateEn",
            "visualStyleEn",
            "initialCompositionEn",
            "cropSafetyEn",
            "subjectContinuityEn",
            "cameraEn",
            "endStateEn",
            "overallSoundscape",
            "nonDiegeticMusic",
        ),
    )
    validate_motion_contract(contract, errors)
    references = contract.get("referenceContract")
    if not isinstance(references, list) or not 1 <= len(references) <= 3:
        errors.append("referenceContract must contain 1 to 3 references")
    else:
        role_owners: set[str] = set()
        for index, reference in enumerate(references):
            prefix = f"referenceContract[{index}]"
            if not isinstance(reference, dict):
                errors.append(f"{prefix} must be an object")
                continue
            required_text(errors, reference, f"{prefix}.", ("assetId", "library", "usage", "borrow", "doNotCopy"))
            roles = reference.get("roles")
            if not isinstance(roles, list) or not roles:
                errors.append(f"{prefix}.roles is required")
                continue
            for role in roles:
                role_text = clean(role).upper()
                if role_text not in {"P", "C", "M"}:
                    errors.append(f"{prefix}.roles contains invalid role {role!r}")
                elif role_text in role_owners:
                    errors.append(f"reference role {role_text} is assigned more than once")
                else:
                    role_owners.add(role_text)
    validate_phases(contract, errors)
    validate_mode_inputs(contract, errors)
    if contract.get("exactTextRequired") is not False:
        errors.append("exactTextRequired must be false")
    if contract.get("onScreenText") != []:
        errors.append("onScreenText must be empty; exact text belongs in Remotion")
    return errors


def build_reference_clause(contract: dict[str, Any]) -> str:
    clauses: list[str] = []
    for reference in contract.get("referenceContract", []):
        roles = "/".join(clean(role).upper() for role in reference.get("roles", []))
        borrow = trim_terminal(reference.get("borrow"))
        boundary = trim_terminal(reference.get("doNotCopy"))
        if "M" in {clean(role).upper() for role in reference.get("roles", [])}:
            clauses.append(
                f"[{roles}] use this selected motion mechanism: {borrow}; preserve that mechanism while replacing "
                f"the reference content identity; do not copy {boundary}"
            )
        else:
            clauses.append(f"[{roles}] borrow only this visual mechanism: {borrow}; do not copy {boundary}")
    return "Reference mechanism contract: " + "; ".join(clauses) + "."


def build_motion_clause(contract: dict[str, Any]) -> str:
    motion = contract["motionPatternContract"]
    return (
        f"Primary motion grammar {clean(contract['motionPattern'])}: "
        f"the information relationship is {clean(motion['relationshipStatement'])} "
        f"Selection reason: {clean(motion['selectionRationale'])} "
        f"The one governing motion law is: {clean(motion['primaryLawEn'])} "
        f"The readable trigger is: {clean(motion['triggerEn'])} "
        f"The attention path is: {clean(motion['attentionPathEn'])} "
        f"The visible proof of completion is: {clean(motion['resultProofEn'])}"
    )


def build_phase_lines(contract: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    for phase in contract["phases"]:
        lines.append(
            f"From {float(phase['from']):.2f} to {float(phase['to']):.2f} seconds "
            f"[{clean(phase['role'])}], {clean(phase['subjectEn'])} {clean(phase['actionEn'])}, "
            f"so {clean(phase['outcomeEn'])}."
        )
    return lines


def build_body(contract: dict[str, Any]) -> str:
    pieces = [
        "[Shot 1]",
        f"Core knowledge point: {clean(contract['knowledgePoint'])}",
        f"The viewer must infer: {clean(contract['viewerInference'])}",
        f"The shot must last exactly {float(contract['durationSeconds']):.2f} seconds and complete its final result hold by that endpoint.",
        build_reference_clause(contract),
        build_motion_clause(contract),
        clean(contract["visualStyleEn"]),
        clean(contract["initialCompositionEn"]),
        clean(contract["cropSafetyEn"]),
        clean(contract["subjectContinuityEn"]),
        f"Begin from this observable state: {clean(contract['startStateEn'])}",
        *build_phase_lines(contract),
        f"The central meaningful action, interaction, or reveal is: {clean(contract['causalActionEn'])}",
        f"The final readable state or relationship is: {clean(contract['resultStateEn'])}",
        clean(contract["cameraEn"]),
        clean(contract["endStateEn"]),
        "No readable text, pseudo-text, UI, captions, logos, watermarks, generated speech, or music may appear.",
    ]
    avoid = [clean(item) for item in contract.get("avoid", []) if clean(item)]
    if avoid:
        pieces.append("Avoid " + ", ".join(avoid) + ".")
    return " ".join(pieces)


def build_ref2va_mapping(contract: dict[str, Any]) -> str:
    video = contract["referenceVideo"]
    phases = contract["phases"]
    lines = [
        "Reference-to-current motion mapping:",
        f"use Reference Video 1 from {float(video['sourceFrom']):.2f} to {float(video['sourceTo']):.2f} seconds.",
    ]
    for beat in video["motionBeats"]:
        phase_index = int(beat["mapsToPhase"])
        phase = phases[phase_index]
        lines.append(
            f"Reference {float(beat['from']):.2f}-{float(beat['to']):.2f}s supplies: "
            f"{clean(beat['mechanismEn'])} Map it to current phase {phase_index + 1} "
            f"({clean(phase['role'])}) using the current-shot subjects."
        )
    return " ".join(lines)


def build_mode_preamble(contract: dict[str, Any]) -> str:
    mode = contract["generationMode"]
    duration = float(contract["durationSeconds"])
    current = contract.get("currentShotReference") or {}
    if mode == "T2VA":
        return (
            "Text-to-video input contract: no reference picture is supplied. "
            "Synthesize only the explicitly described current-shot subjects, geometry, material hierarchy, and meaningful action, interaction, or reveal. "
            "Do not invent an additional storyline, a second motion law, or an unrelated camera move."
        )
    if mode == "I2VA":
        first = contract["firstFrame"]
        return (
            "Exact-first-frame contract: Picture 1 is the exact frame at 0.00 seconds. "
            f"It represents {clean(first['state'])} Preserve {', '.join(clean(x) for x in first['continuityLocks'])}. "
            f"Permitted departure from the frame: {clean(first['allowedMotionEn'])} "
            f"Current-shot visual purpose: {clean(current['purpose'])}"
        )
    if mode == "L2VA":
        last = contract["lastFrame"]
        return (
            f"Exact-last-frame contract: Picture 1 is the exact destination at {duration:.2f} seconds. "
            f"It represents {clean(last['state'])} Do not reveal, duplicate, or closely approximate the final arrangement early. "
            f"Arrival rules: {clean(last['arrivalRulesEn'])} Preserve {', '.join(clean(x) for x in last['continuityLocks'])} "
            "and converge naturally into the exact picture during the final phase."
        )
    if mode == "FL2VA":
        first = contract["firstFrame"]
        last = contract["lastFrame"]
        return (
            f"Exact-endpoint contract: Picture 1 is the exact first frame at 0.00 seconds and Picture 2 is the exact last frame at {duration:.2f} seconds. "
            "Maintain one-to-one subject identity, object count, camera space, and material continuity between the pictures. "
            f"Opening state: {clean(first['state'])} Final state: {clean(last['state'])} "
            f"Continuous endpoint transformation: {clean(contract['endpointTransitionEn'])} "
            "Do not use a crossfade, dissolve, duplicate-subject swap, or early final-state reveal."
        )
    image_1 = contract["referenceImage"]
    image_2 = contract["referenceImage2"]
    video = contract["referenceVideo"]
    return (
        "Reference-video input contract: Picture 1 is the current-shot-specific primary reference for "
        f"{trim_terminal(image_1['purpose'])}; it is not an endpoint. "
        f"Picture 2 supplies only the complementary mechanism: {trim_terminal(image_2['purpose'])}; "
        f"do not copy {trim_terminal(image_2['doNotCopy'])}. "
        "Reference Video 1 is authoritative for the selected motion law, attention order, camera behavior, depth behavior, and settling rhythm. "
        f"Apply that motion grammar to the current-shot objects while not copying {trim_terminal(video['doNotCopy'])}. "
        "Do not neutralize the selected motion reference with a different choreography. "
        + build_ref2va_mapping(contract)
    )


def build_prompt(contract: dict[str, Any]) -> str:
    fields = (
        f"{build_mode_preamble(contract)}\n\n"
        f"integrated_multimodal_description: {build_body(contract)}\n"
        f"overall_soundscape: {clean(contract['overallSoundscape'])}\n"
        f"non_diegetic_music: {clean(contract['nonDiegeticMusic'])}"
    )
    return fields


def mode_input_contract(contract: dict[str, Any]) -> dict[str, Any]:
    mode = contract["generationMode"]
    if mode == "T2VA":
        return {"textOnly": True}
    if mode == "I2VA":
        return {"picture1": contract["firstFrame"]["path"], "role": "exact-first-frame"}
    if mode == "L2VA":
        return {"picture1": contract["lastFrame"]["path"], "role": "exact-last-frame"}
    if mode == "FL2VA":
        return {
            "picture1": contract["firstFrame"]["path"],
            "picture2": contract["lastFrame"]["path"],
            "role": "exact-first-and-last-frames",
        }
    return {
        "picture1": contract["referenceImage"]["path"],
        "picture1Role": "current-shot-content-layout-style",
        "picture2": contract["referenceImage2"]["path"],
        "picture2Role": "complementary-visual-mechanism",
        "video1": contract["referenceVideo"]["path"],
        "video1Role": "authoritative-motion-camera-timing",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--contract", required=True, type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    contract_path = args.contract.resolve()
    try:
        contract = json.loads(contract_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    errors = validate(contract)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    prompt = build_prompt(contract)
    result = {
        "schemaVersion": 3,
        "promptProtocol": f"minimax-h3-five-mode-{clean(contract['generationMode']).lower()}-reference-first-v3",
        "contractId": contract["id"],
        "generationMode": contract["generationMode"],
        "modeInputContract": mode_input_contract(contract),
        "templateId": contract["templateId"],
        "motionPattern": contract["motionPattern"],
        "motionPatternContract": contract["motionPatternContract"],
        "durationSeconds": contract["durationSeconds"],
        "durationPlan": contract["durationPlan"],
        "aspectRatio": contract["aspectRatio"],
        "placement": contract["placement"],
        "workflowResolutionPolicy": contract["workflowResolutionPolicy"],
        "sourceAnchor": contract["sourceAnchor"],
        "referenceContract": contract["referenceContract"],
        "narrationPhaseAnchors": [
            {
                "phase": index,
                "role": phase["role"],
                "rawFrom": phase["from"],
                "rawTo": phase["to"],
                "anchorText": phase["narrationAnchorText"],
                "absoluteAtMs": phase["narrationAtMs"],
            }
            for index, phase in enumerate(contract["phases"])
        ],
        "h3Prompt": prompt,
        "motionPrompt": prompt,
    }
    payload = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        output = args.output.resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(payload, encoding="utf-8")
        print(json.dumps({"written": str(output), "protocol": result["promptProtocol"]}, ensure_ascii=False))
    else:
        print(payload, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
