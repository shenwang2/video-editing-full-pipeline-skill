"""Authoritative classic variant payload validation shared by both consumers."""

def validate_component_payload(event, label, contract):
    errors = []
    icons = contract.get('iconLibrary', {})
    SEMANTIC_ICON_NAMES = set(icons.get('approvedReferenceIcons', [])) | set(icons.get('copiedFromAtomicVocabulary', []))
    def add_error(errors, message):
        errors.append(message)
    if event.get('componentId') == 'LogoWall':
        payload = event.get('payload', {})
        items = payload.get('items', []) if isinstance(payload, dict) else []
        if not isinstance(items, list):
            add_error(errors, f'{label}.payload.items: must be a peer-item array')
        else:
            for index, item in enumerate(items):
                item_label = f'{label}.payload.items[{index}]'
                if not isinstance(item, dict):
                    add_error(errors, f'{item_label}: item must be an object')
                    continue
                icon = item.get('icon')
                if icon is not None and (not isinstance(icon, str) or icon not in SEMANTIC_ICON_NAMES | {'none'}):
                    add_error(errors, f'{item_label}.icon: use a bundled semantic SVG name or none; never a text initial')
                if item.get('glyph') and icon in (None, 'none'):
                    add_error(errors, f'{item_label}.glyph: text glyphs are not semantic icons; choose icon or omit glyph')
    if event.get('componentId') == 'InsightFocus' and event.get('variantId') == 'statementFocus':
        payload = event.get('payload', {})
        headline = payload.get('headline') if isinstance(payload, dict) else None
        if not isinstance(headline, str) or not headline.strip():
            add_error(errors, f'{label}: statementFocus needs a non-empty headline')
        if isinstance(payload, dict):
            highlight = payload.get('highlight')
            if highlight is not None and (not isinstance(highlight, str) or not highlight or not isinstance(headline, str) or highlight not in headline):
                add_error(errors, f'{label}: statementFocus highlight must be a non-empty verbatim headline substring')
            for key in ('setup', 'payoff'):
                if key in payload and not isinstance(payload[key], str):
                    add_error(errors, f'{label}: statementFocus {key} must be text')
    if event.get('componentId') == 'SectionTitle':
        variant = event.get('variantId')
        if variant not in {'standard', 'referenceV2'}:
            add_error(errors, f'{label}: SectionTitle variant must be referenceV2 or standard')
        if variant == 'referenceV2':
            payload = event.get('payload', {})
            if not isinstance(payload.get('setup'), str) or not payload['setup'].strip():
                add_error(errors, f'{label}: referenceV2 needs its English setup line')
            size = payload.get('chineseFontSize', 38)
            if not isinstance(size, (int, float)) or isinstance(size, bool) or not 34 <= size <= 48:
                add_error(errors, f'{label}: referenceV2 chineseFontSize must be 34-48 (default 38)')
    if event.get("componentId") == "FormFillSequence" and event.get("variantId") in {"stepRail", "compactExplanationStack"}:
        sequence_variant = event.get("variantId")
        payload = event.get("payload", {})
        steps = payload.get("steps", []) if isinstance(payload, dict) else []
        if not isinstance(steps, list) or not 2 <= len(steps) <= 5:
            add_error(errors, f"{label}: {sequence_variant} needs 2-5 source-ordered steps")
        else:
            last_anchor_by_unit: dict[str, float] = {}
            for step_index, step in enumerate(steps):
                step_label = f"{label}.payload.steps[{step_index}]"
                if not isinstance(step, dict):
                    add_error(errors, f"{step_label}: step must be an object")
                    continue
                if not isinstance(step.get("label"), str) or not step.get("label"):
                    add_error(errors, f"{step_label}: label is required")
                anchors = {
                    key: step.get(key)
                    for key in ("showAtMs", "showAtInFrames")
                    if isinstance(step.get(key), (int, float)) and not isinstance(step.get(key), bool)
                }
                if not anchors:
                    add_error(errors, f"{step_label}: showAtMs or showAtInFrames is required")
                for key, anchor in anchors.items():
                    if anchor < 0:
                        add_error(errors, f"{step_label}.{key}: must be non-negative")
                    previous = last_anchor_by_unit.get(key)
                    if previous is not None and anchor < previous:
                        add_error(errors, f"{step_label}.{key}: steps must preserve source order")
                    last_anchor_by_unit[key] = anchor
                icon = step.get("icon")
                if icon is not None and icon not in SEMANTIC_ICON_NAMES:
                    add_error(errors, f"{step_label}.icon: must come from the bundled semantic SVG library")
                for copy_key in ("meta", "detail"):
                    copy_value = step.get(copy_key)
                    if copy_value is not None and (not isinstance(copy_value, str) or not copy_value.strip()):
                        add_error(errors, f"{step_label}.{copy_key}: must be a non-empty string when present")
                for show_key, complete_key in (("showAtMs", "completeAtMs"), ("showAtInFrames", "completeAtInFrames")):
                    show_value = step.get(show_key)
                    complete_value = step.get(complete_key)
                    if complete_value is not None and (not isinstance(complete_value, (int, float)) or isinstance(complete_value, bool)):
                        add_error(errors, f"{step_label}.{complete_key}: must be numeric when present")
                    elif isinstance(show_value, (int, float)) and not isinstance(show_value, bool) and isinstance(complete_value, (int, float)) and complete_value < show_value:
                        add_error(errors, f"{step_label}.{complete_key}: cannot precede {show_key}")
    if event.get("componentId") == "HierarchyTree" and event.get("variantId") == "trialReferenceClassification":
        add_error(errors, f"{label}: trialReferenceClassification is retired; migrate to iconClassification")
    if event.get("componentId") == "HierarchyTree" and event.get("variantId") == "iconClassification":
        payload = event.get("payload", {})
        categories = payload.get("categoryItems", []) if isinstance(payload, dict) else []
        summary = payload.get("summary", {}) if isinstance(payload, dict) else {}
        if not isinstance(categories, list) or not 2 <= len(categories) <= 4:
            add_error(errors, f"{label}: iconClassification needs 2-4 categoryItems")
        else:
            for item_index, item in enumerate(categories):
                item_label = f"{label}.payload.categoryItems[{item_index}]"
                if not isinstance(item, dict) or not isinstance(item.get("label"), str) or not item.get("label"):
                    add_error(errors, f"{item_label}: label is required")
                    continue
                if item.get("icon") not in SEMANTIC_ICON_NAMES:
                    add_error(errors, f"{item_label}: icon must come from the bundled semantic SVG library")
                if not any(isinstance(item.get(key), (int, float)) for key in ("showAtMs", "showAtInFrames")):
                    add_error(errors, f"{item_label}: showAtMs or showAtInFrames is required")
        if not isinstance(summary, dict) or not isinstance(summary.get("label"), str) or not summary.get("label"):
            add_error(errors, f"{label}.payload.summary: label is required")
        else:
            if summary.get("icon") not in SEMANTIC_ICON_NAMES:
                add_error(errors, f"{label}.payload.summary: icon must come from the bundled semantic SVG library")
            if not any(isinstance(summary.get(key), (int, float)) for key in ("showAtMs", "showAtInFrames")):
                add_error(errors, f"{label}.payload.summary: showAtMs or showAtInFrames is required")
            count = summary.get("count")
            if count is not None and (not isinstance(count, int) or isinstance(count, bool) or count < 1):
                add_error(errors, f"{label}.payload.summary.count: must be a positive grounded integer when present")
    if event.get("componentId") == "ConceptComparisonCards" and event.get("variantId") == "trialReferenceBranches":
        add_error(errors, f"{label}: trialReferenceBranches is retired; migrate to branchOutcomeRows")
    if event.get("componentId") == "ConceptComparisonCards" and event.get("variantId") == "branchOutcomeRows":
        payload = event.get("payload", {})
        sides = payload.get("sides", []) if isinstance(payload, dict) else []
        if not isinstance(sides, list) or len(sides) != 2:
            add_error(errors, f"{label}: branchOutcomeRows needs exactly 2 sides")
        else:
            for side_index, side in enumerate(sides):
                side_label = f"{label}.payload.sides[{side_index}]"
                if not isinstance(side, dict):
                    add_error(errors, f"{side_label}: side must be an object")
                    continue
                if not isinstance(side.get("title"), str) or not side.get("title"):
                    add_error(errors, f"{side_label}: title is the branch condition and is required")
                condition_time = next((side.get(key) for key in ("showAtMs", "showAtInFrames") if isinstance(side.get(key), (int, float)) and not isinstance(side.get(key), bool)), None)
                if condition_time is None:
                    add_error(errors, f"{side_label}: showAtMs or showAtInFrames is required")
                items = side.get("items", [])
                if not isinstance(items, list) or len(items) != 1:
                    add_error(errors, f"{side_label}: items must contain exactly one grounded outcome")
                    continue
                outcome = items[0]
                if not isinstance(outcome, dict) or not isinstance(outcome.get("text"), str) or not outcome.get("text"):
                    add_error(errors, f"{side_label}.items[0]: text is the branch outcome and is required")
                    continue
                outcome_time = next((outcome.get(key) for key in ("showAtMs", "showAtInFrames") if isinstance(outcome.get(key), (int, float)) and not isinstance(outcome.get(key), bool)), None)
                if outcome_time is None:
                    add_error(errors, f"{side_label}.items[0]: showAtMs or showAtInFrames is required")
                condition_ms = side.get("showAtMs")
                outcome_ms = outcome.get("showAtMs")
                if isinstance(condition_ms, (int, float)) and not isinstance(condition_ms, bool) and isinstance(outcome_ms, (int, float)) and not isinstance(outcome_ms, bool) and outcome_ms < condition_ms:
                    add_error(errors, f"{side_label}.items[0]: outcome cannot appear before its condition")
                condition_frames = side.get("showAtInFrames")
                outcome_frames = outcome.get("showAtInFrames")
                if isinstance(condition_frames, (int, float)) and not isinstance(condition_frames, bool) and isinstance(outcome_frames, (int, float)) and not isinstance(outcome_frames, bool) and outcome_frames < condition_frames:
                    add_error(errors, f"{side_label}.items[0]: outcome cannot appear before its condition")
    return errors
