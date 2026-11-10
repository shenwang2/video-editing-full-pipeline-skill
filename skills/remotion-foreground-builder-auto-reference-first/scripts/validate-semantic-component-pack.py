#!/usr/bin/env python3
"""Validate the curated semantic component registry and bundled source."""

from __future__ import annotations

import json
import re
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    contract = json.loads((root / "assets" / "semantic-component-contract.json").read_text(encoding="utf-8-sig"))
    source = root / "assets" / "semantic-foreground-pack" / "src"
    errors: list[str] = []

    expected = {
        "show": ("MediaFrame", "show"),
        "focus": ("CalloutSpotlight", "aimedCallout"),
        "demonstrate": ("MediaFrame", "recordedDemo"),
        "verify": ("BRollStack", "proofDeck"),
    }
    routes = contract.get("realObject", {})
    for purpose, (component, variant) in expected.items():
        route = routes.get(purpose)
        if not route:
            errors.append(f"Missing real-object route: {purpose}")
            continue
        if route.get("component") != component or route.get("variant") != variant:
            errors.append(f"Unexpected route for {purpose}: {route}")

    relationship_routes = contract.get("informationRelationship", {})
    expected_relationships = {
        "collection": ("LogoWall", "peerTileWall"),
        "transformation": ("KanbanMove", "stateTransfer"),
        "sequence": ("FormFillSequence", "spokenSteps"),
        "chronology": ("ChronologyTrack", "datedMilestones"),
        "causeEffect": ("CauseEffectChain", "causalHandoff"),
        "hierarchy": ("HierarchyTree", "balancedTree"),
        "flow": ("FlowCarrier", "stageTransfer"),
        "problemSolution": ("ProblemSolutionBridge", "actionBridge"),
        "conditionBoundary": ("ConditionGate", "validationGate"),
        "feedbackLoop": ("FeedbackLoop", "closedCycle"),
        "matrix2x2": ("QuadrantMatrix", "fourQuadrants"),
    }
    for relationship, (component, variant) in expected_relationships.items():
        route = relationship_routes.get(relationship)
        if not route:
            errors.append(f"Missing information-relationship route: {relationship}")
            continue
        if route.get("component") != component or route.get("variant") != variant:
            errors.append(f"Unexpected route for {relationship}: {route}")

    comparison = relationship_routes.get("comparison", {})
    numeric_comparison = comparison.get("numeric", {})
    if (
        numeric_comparison.get("component") != "ComparisonBars"
        or numeric_comparison.get("variant") != "numberDelta"
    ):
        errors.append(f"Unexpected numeric comparison route: {numeric_comparison}")
    conceptual_comparison = comparison.get("conceptual", {})
    if (
        conceptual_comparison.get("component") != "ConceptComparisonCards"
        or conceptual_comparison.get("variant") != "dualPeerCards"
    ):
        errors.append(f"Unexpected conceptual comparison route: {conceptual_comparison}")
    if conceptual_comparison.get("forbiddenFallback") != "ComparisonBars":
        errors.append("Conceptual comparison must explicitly forbid ComparisonBars fallback")

    memory_routes = contract.get("memory", {})
    keyword_route = memory_routes.get("keywordNumber", {}).get("keyword", {})
    number_route = memory_routes.get("keywordNumber", {}).get("number", {})
    expected_memory = {
        "claimInsight": ("InsightFocus", "claimLanding"),
        "question": ("QuestionTension", "openQuestion"),
        "riskWarning": ("WarningBoundary", "blockedRisk"),
        "definition": ("DefinitionReveal", "termMeaning"),
        "statusResult": ("ResultLock", "statusToResult"),
        "verdict": ("VerdictStamp", "judgmentSeal"),
        "quote": ("QuoteFrame", "attributedQuote"),
    }
    if keyword_route.get("component") != "ImpactToken" or keyword_route.get("variant") != "keywordImpact":
        errors.append(f"Unexpected memory keyword route: {keyword_route}")
    if number_route.get("component") != "ImpactToken" or number_route.get("variant") != "numberLanding":
        errors.append(f"Unexpected memory number route: {number_route}")
    for memory_type, (component, variant) in expected_memory.items():
        route = memory_routes.get(memory_type, {})
        if route.get("component") != component or route.get("variant") != variant:
            errors.append(f"Unexpected memory route for {memory_type}: {route}")

    policy = contract.get("routingPolicy", {})
    if policy.get("visibleSurfacePolicy") != "measured-local-or-large-for-non-demo-with-recorded-demo-detail-takeover":
        errors.append("Visible-surface policy must keep non-demo material local/large and reserve detail takeover for recordedDemo")
    if policy.get("fullScreenVisibleSurfaceAllowed") is not True:
        errors.append("The registry must allow only the explicitly owned takeover modes")
    if policy.get("fullScreenTakeoverOwner") != "H3-or-MediaFrame-recordedDemo-only":
        errors.append("Full-screen takeover ownership must be limited to H3 or MediaFrame/recordedDemo")
    if policy.get("contentSizingPolicy") != "text-support-and-peer-state-surfaces-derive-width-height-from-rendered-payload":
        errors.append("The registry must require content-derived sizing for text-support and peer-state surfaces")
    if policy.get("primaryTypographyPolicy") != "spoken-primary-information-remains-phone-readable-and-never-collapses-into-helper-type":
        errors.append("The registry must protect spoken primary information from helper-tier typography")
    if policy.get("cardCopyStructurePolicy") != "label-and-two-to-five-unit-primary-inside-with-optional-small-auxiliary-outside":
        errors.append("The registry must keep cards to label plus short primary copy")
    if policy.get("cardPrimaryMaxVisualUnits") != 5:
        errors.append("Card primary copy must use a five-visual-unit hard maximum")
    if policy.get("cardAuxiliaryPlacementPolicy") != "outside-visible-card-surface-only":
        errors.append("Card auxiliary copy must render outside the visible card surface")
    if policy.get("variantColorPolicy") != "one-approved-chromatic-accent-per-visual-variant-with-neutral-surfaces-only":
        errors.append("The registry must enforce one approved chromatic accent per visual variant")
    invariants = set(contract.get("globalForegroundInvariants", []))
    required_invariants = {
        "the-full-frame-host-is-transparent-coordinate-space-only",
        "ordinary-visible-pixels-stay-inside-a-measured-local-or-large-foreground-zone",
        "only-h3-or-MediaFrame-recordedDemo-may-fill-the-canvas",
        "information-bearing-real-material-must-pass-phone-readability-review",
        "text-support-surfaces-derive-size-from-visible-content-with-tight-padding",
        "spoken-primary-information-never-uses-helper-tier-typography",
        "card-surfaces-contain-only-one-label-and-one-two-to-five-unit-primary-phrase",
        "optional-card-auxiliary-copy-renders-outside-the-visible-card-surface-in-small-type",
        "overlong-card-primary-copy-is-rewritten-or-rerouted-never-shrunk-or-wrapped",
        "one-visual-variant-uses-exactly-one-approved-chromatic-accent-with-neutral-surfaces-only",
        "remotionui-full-scene-backgrounds-and-page-layouts-must-be-removed-during-adaptation",
    }
    missing_invariants = sorted(required_invariants - invariants)
    if missing_invariants:
        errors.append(f"Missing global foreground invariants: {missing_invariants}")

    required_files = [
        source / "index.ts",
        source / "lib" / "room-light-palette.ts",
        source / "real-object" / "MediaFrame.tsx",
        source / "real-object" / "CalloutSpotlight.tsx",
        source / "real-object" / "BRollStack.tsx",
        source / "information-relationship" / "LogoWall.tsx",
        source / "information-relationship" / "ComparisonBars.tsx",
        source / "information-relationship" / "ConceptComparisonCards.tsx",
        source / "information-relationship" / "KanbanMove.tsx",
        source / "information-relationship" / "FormFillSequence.tsx",
        source / "information-relationship" / "ChronologyTrack.tsx",
        source / "information-relationship" / "CauseEffectChain.tsx",
        source / "information-relationship" / "HierarchyTree.tsx",
        source / "information-relationship" / "FlowCarrier.tsx",
        source / "information-relationship" / "ProblemSolutionBridge.tsx",
        source / "information-relationship" / "ConditionGate.tsx",
        source / "information-relationship" / "FeedbackLoop.tsx",
        source / "information-relationship" / "QuadrantMatrix.tsx",
        source / "memory" / "ImpactToken.tsx",
        source / "memory" / "InsightFocus.tsx",
        source / "memory" / "QuestionTension.tsx",
        source / "memory" / "WarningBoundary.tsx",
        source / "memory" / "DefinitionReveal.tsx",
        source / "memory" / "ResultLock.tsx",
        source / "memory" / "VerdictStamp.tsx",
        source / "memory" / "QuoteFrame.tsx",
        source / "lib" / "code-syntax.tsx",
        source / "lib" / "content-sizing.ts",
        source / "lib" / "layout.ts",
        source / "lib" / "media-utils.ts",
        source / "lib" / "motion-tokens.ts",
        source / "lib" / "timing.ts",
    ]
    for path in required_files:
        if not path.exists():
            errors.append(f"Missing bundled file: {path.relative_to(root)}")

    media_frame = (source / "real-object" / "MediaFrame.tsx").read_text(encoding="utf-8")
    for token in ('"recordedDemo"', "sourceWidth", "sourceHeight", "surfaceMode", "playbackRate", "presentationScale", '"detailTakeover"'):
        if token not in media_frame:
            errors.append(f"MediaFrame recorded-demo contract is missing: {token}")

    media_contract = contract.get("components", {}).get("MediaFrame", {}).get("renderingContract", {})
    scales_by_variant = media_contract.get("presentationScalesByVariant", {})
    if scales_by_variant.get("show") != ["local", "large"]:
        errors.append("MediaFrame/show must be restricted to local or large presentation scales")
    if scales_by_variant.get("cleanGlow") != ["local", "large"]:
        errors.append("MediaFrame/cleanGlow must be restricted to local or large presentation scales")
    if scales_by_variant.get("recordedDemo") != ["detailTakeover"]:
        errors.append("MediaFrame/recordedDemo must be restricted to detailTakeover")

    media_variants = contract.get("components", {}).get("MediaFrame", {}).get("variants", {})
    if media_variants.get("cleanGlow", {}).get("mode") != "show":
        errors.append("MediaFrame/cleanGlow must remain compatible only with ordinary show events")
    for token in ('visualVariant?: "standard" | "cleanGlow"', 'visualVariant === "cleanGlow"'):
        if token not in media_frame:
            errors.append(f"MediaFrame clean-glow variant is missing: {token}")

    callout_contract = contract.get("components", {}).get("CalloutSpotlight", {})
    if callout_contract.get("variants", {}).get("cornerFocus", {}).get("mode") != "focus":
        errors.append("CalloutSpotlight/cornerFocus must remain compatible only with focus events")
    callout_source = (source / "real-object" / "CalloutSpotlight.tsx").read_text(encoding="utf-8")
    for token in ('visualVariant?: "connectorCard" | "cornerFocus"', 'visualVariant === "cornerFocus"'):
        if token not in callout_source:
            errors.append(f"CalloutSpotlight corner-focus variant is missing: {token}")

    broll_contract = contract.get("components", {}).get("BRollStack", {})
    if broll_contract.get("variants", {}).get("evidenceTrack", {}).get("mode") != "verify":
        errors.append("BRollStack/evidenceTrack must remain compatible only with verify events")
    broll_source = (source / "real-object" / "BRollStack.tsx").read_text(encoding="utf-8")
    for token in ('visualVariant?: "proofDeck" | "evidenceTrack"', 'visualVariant === "evidenceTrack"', "showAtInFrames"):
        if token not in broll_source:
            errors.append(f"BRollStack evidence-track variant is missing: {token}")

    form_fill = (source / "information-relationship" / "FormFillSequence.tsx").read_text(encoding="utf-8")
    for token in ('"progressiveStack"', "zoneOverride", "attentionMode"):
        if token not in form_fill:
            errors.append(f"FormFillSequence progressive-layout contract is missing: {token}")

    problem_solution = (source / "information-relationship" / "ProblemSolutionBridge.tsx").read_text(encoding="utf-8")
    for token in ('"subjectSplit"', "masterLeftX", "attentionMode"):
        if token not in problem_solution:
            errors.append(f"ProblemSolutionBridge aligned-layout contract is missing: {token}")

    component_sources = {
        name: (source / "real-object" / f"{name}.tsx").read_text(encoding="utf-8")
        for name in ("MediaFrame", "CalloutSpotlight", "BRollStack")
    }
    component_sources.update({
        name: (source / "information-relationship" / f"{name}.tsx").read_text(encoding="utf-8")
        for name in (
            "LogoWall",
            "ComparisonBars",
            "ConceptComparisonCards",
            "KanbanMove",
            "FormFillSequence",
            "ChronologyTrack",
            "CauseEffectChain",
            "HierarchyTree",
            "FlowCarrier",
            "ProblemSolutionBridge",
            "ConditionGate",
            "FeedbackLoop",
            "QuadrantMatrix",
        )
    })
    component_sources.update({
        name: (source / "memory" / f"{name}.tsx").read_text(encoding="utf-8")
        for name in (
            "ImpactToken",
            "InsightFocus",
            "QuestionTension",
            "WarningBoundary",
            "DefinitionReveal",
            "ResultLock",
            "VerdictStamp",
            "QuoteFrame",
        )
    })
    for name, text in component_sources.items():
        for token in (
            'data-foreground-overlay-root="true"',
            'position: "absolute"',
            "inset: 0",
            'background: "transparent"',
            "getForegroundZone",
            "ForegroundPlacement",
        ):
            if token not in text:
                errors.append(f"{name} is missing local-overlay marker: {token}")
        if 'surfaceMode?: "transparent" | "opaque"' in text:
            errors.append(f"{name} still exposes a full-page opaque surface mode")

    statement_contract = contract.get('components', {}).get('InsightFocus', {}).get('variants', {}).get('statementFocus', {})
    if statement_contract.get('motionGrammar') != 'quietLeadThenFocusedWordsSettle':
        errors.append('InsightFocus/statementFocus is missing its motion contract')
    for relative in ('memory/StatementFocus.tsx', 'lib/statement-focus-layout.ts'):
        if not (source / relative).exists():
            errors.append(f'Missing statementFocus shared source: {relative}')
    if 'statementFocus' not in component_sources['InsightFocus']:
        errors.append('InsightFocus must dispatch its registered statementFocus variant')

    content_sized_components = {
        "ConceptComparisonCards": "equal-peer-widths-with-card-height-derived-from-label-and-primary-only",
        "CauseEffectChain": "node-card-height-derived-from-label-and-primary-only",
        "HierarchyTree": "equal-child-card-height-derived-from-label-and-primary-only",
        "ProblemSolutionBridge": "equal-peer-widths-with-card-height-derived-from-label-and-primary-only",
        "WarningBoundary": "width-and-height-derived-from-label-and-primary-warning-only",
        "ResultLock": "two-equal-content-sized-peer-cards-derived-from-the-larger-label-and-primary-payload",
    }
    component_contracts = contract.get("components", {})
    for name, sizing_policy in content_sized_components.items():
        rendering_contract = component_contracts.get(name, {}).get("renderingContract", {})
        if rendering_contract.get("surfaceSizing") != sizing_policy:
            errors.append(f"{name} is missing its content-sizing contract")
        source_text = component_sources[name]
        if 'data-content-sized-surface=' not in source_text:
            errors.append(f"{name} does not mark its content-sized visible surface")
        if 'data-primary-text=' not in source_text:
            errors.append(f"{name} does not mark its spoken primary typography")
        if 'data-card-copy-structure="label-primary"' not in source_text:
            errors.append(f"{name} does not enforce label-plus-primary card structure")
        if 'data-card-label="true"' not in source_text:
            errors.append(f"{name} does not mark its card label")
        if 'data-auxiliary-text="true"' not in source_text:
            errors.append(f"{name} does not render optional auxiliary copy outside the card")
        if rendering_contract.get("copyStructure") != "label-and-primary-inside-optional-small-auxiliary-outside":
            errors.append(f"{name} is missing its card-copy structure contract")
        if not rendering_contract.get("primaryTextPaths"):
            errors.append(f"{name} must declare primary-text data paths for plan auditing")
        if not rendering_contract.get("auxiliaryTextPaths"):
            errors.append(f"{name} must declare auxiliary-text data paths for plan auditing")

    forbidden_scene_fragments = {
        "CalloutSpotlight": [
            "background: backgroundColor ?? palette.page",
            "Math.max(width, height)}px rgba(4,5,9",
        ],
        "BRollStack": [
            "background: backgroundColor ?? palette.page",
            "radial-gradient(ellipse 60% 55%",
        ],
    }
    for name, fragments in forbidden_scene_fragments.items():
        text = component_sources[name]
        for fragment in fragments:
            if fragment in text:
                errors.append(f"{name} still contains RemotionUI full-scene behavior: {fragment}")

    relationship_timing_tokens = {
        "LogoWall": ("showAtInFrames", "spokenTileArrivalThenDiagonalWarm", "magneticPeerAssembly"),
        "ComparisonBars": ("showAtInFrames", "same-unit", "beforeTravelAfterDelta"),
        "ConceptComparisonCards": ("showAtInFrames", "peerCardRevealThenAttributeBuild", "mirroredHeadersThenPairedAttributes"),
        "KanbanMove": ("moveAtInFrames", "carrierArcStateTransfer"),
        "FormFillSequence": ("showAtInFrames", "completeAtInFrames"),
        "ChronologyTrack": ("showAtInFrames", "spokenMilestoneThenTrackAdvance"),
        "CauseEffectChain": ("showAtInFrames", "causeMechanismEffectHandoff"),
        "HierarchyTree": ("showAtInFrames", "rootBranchThenSpokenChildren"),
        "FlowCarrier": ("showAtInFrames", "carrierTravelsThenStageLocks"),
        "ProblemSolutionBridge": ("showAtInFrames", "problemActionSolutionHandoff"),
        "ConditionGate": ("showAtInFrames", "criteriaValidateThenGateResolve"),
        "FeedbackLoop": ("showAtInFrames", "stageCycleReturnsToOrigin"),
        "QuadrantMatrix": ("showAtInFrames", "axesQuadrantsThenItemPlacement"),
    }
    contract_text = json.dumps(contract, ensure_ascii=False)
    expected_palette = {
        "粉红": "#FF5CCB",
        "浅紫": "#C55BFF",
        "青蓝": "#24E5EE",
        "荧光绿": "#D8FF3F",
        "亮红": "#FF4D55",
        "深紫": "#8D42FF",
        "电光蓝": "#3D5BFF",
    }
    if contract.get("approvedRoomLightPalette") != expected_palette:
        errors.append("approvedRoomLightPalette must contain exactly 粉红、浅紫、青蓝、荧光绿、亮红、深紫、电光蓝")
    approved_names = set(expected_palette)
    for component_name, component_contract in contract.get("components", {}).items():
        for variant_name, variant_contract in component_contract.get("variants", {}).items():
            if variant_contract.get("colorMode") != "single-accent":
                continue
            palette = variant_contract.get("palette", [])
            if len(palette) != 1 or palette[0] not in approved_names:
                errors.append(f"{component_name}/{variant_name} must declare exactly one approved accent swatch")
    for name, tokens in relationship_timing_tokens.items():
        text = component_sources[name]
        for token in tokens:
            if token not in text and token not in contract_text:
                errors.append(f"{name} is missing relationship timing/routing contract: {token}")

    logo_variants = contract.get("components", {}).get("LogoWall", {}).get("variants", {})
    magnetic = logo_variants.get("magneticCluster", {})
    if magnetic.get("mode") != "collection":
        errors.append("LogoWall/magneticCluster must remain compatible with collection semantics")
    logo_source = component_sources["LogoWall"]
    for required in ('SemanticIcon', 'SEMANTIC_ICON_NAMES', 'data-semantic-icon={icon}'):
        if required not in logo_source:
            errors.append(f'LogoWall must render the shared semantic SVG vocabulary: {required}')
    if re.search(r'item\.name\s*(?:\.\s*(?:slice|substring|substr|charAt)\s*\(|\[\s*0\s*\])', logo_source):
        errors.append('LogoWall must never derive an icon from the first character of its label')
    for token in ('visualVariant?: "peerTileWall" | "magneticCluster"', 'visualVariant === "magneticCluster"', "backdropFilter"):
        if token not in logo_source:
            errors.append(f"LogoWall/magneticCluster is missing implementation token: {token}")

    comparison_variants = contract.get("components", {}).get("ComparisonBars", {}).get("variants", {})
    shift_rail = comparison_variants.get("metricShiftRail", {})
    if shift_rail.get("mode") != "comparison":
        errors.append("ComparisonBars/metricShiftRail must remain compatible with numeric comparison semantics")
    comparison_source = component_sources["ComparisonBars"]
    for token in ('visualVariant?: "numberDelta" | "metricShiftRail"', 'visualVariant === "metricShiftRail"', "backdropFilter"):
        if token not in comparison_source:
            errors.append(f"ComparisonBars/metricShiftRail is missing implementation token: {token}")

    concept_variants = contract.get("components", {}).get("ConceptComparisonCards", {}).get("variants", {})
    neon_mirror = concept_variants.get("neonMirrorCompare", {})
    if neon_mirror.get("mode") != "comparison":
        errors.append("ConceptComparisonCards/neonMirrorCompare must remain compatible with conceptual comparison semantics")
    concept_source = component_sources["ConceptComparisonCards"]
    for token in ('visualVariant?: "dualPeerCards" | "neonMirrorCompare"', 'visualVariant === "neonMirrorCompare"', "ROOM_LIGHT_PALETTE.青蓝"):
        if token not in concept_source:
            errors.append(f"ConceptComparisonCards/neonMirrorCompare is missing implementation token: {token}")
    for forbidden in ("ROOM_LIGHT_PALETTE.粉红", "ROOM_LIGHT_PALETTE.深紫", "linear-gradient(#29E6EF", "linear-gradient(145deg, #9D4DFF", "#36E8EF", "#FF62D4", "#A64CFF", "#C9FBFF", "#FFD3F4"):
        if forbidden in concept_source:
            errors.append("ConceptComparisonCards/neonMirrorCompare must use one cyan accent only")

    feedback_variants = contract.get("components", {}).get("FeedbackLoop", {}).get("variants", {})
    if feedback_variants.get("returnLoopBand", {}).get("colorMode") != "single-accent":
        errors.append("FeedbackLoop/returnLoopBand must use the single-accent color contract")
    feedback_source = component_sources["FeedbackLoop"]
    for token in ('visualVariant?: "closedCycle" | "returnLoopBand"', 'visualVariant === "returnLoopBand"', "ROOM_LIGHT_PALETTE.荧光绿"):
        if token not in feedback_source:
            errors.append(f"FeedbackLoop/returnLoopBand is missing implementation token: {token}")

    quadrant_variants = contract.get("components", {}).get("QuadrantMatrix", {}).get("variants", {})
    if quadrant_variants.get("magneticDecisionBoard", {}).get("colorMode") != "single-accent":
        errors.append("QuadrantMatrix/magneticDecisionBoard must use the single-accent color contract")
    quadrant_source = component_sources["QuadrantMatrix"]
    for token in ('visualVariant?: "fourQuadrants" | "magneticDecisionBoard"', 'visualVariant === "magneticDecisionBoard"', "ROOM_LIGHT_PALETTE.电光蓝"):
        if token not in quadrant_source:
            errors.append(f"QuadrantMatrix/magneticDecisionBoard is missing implementation token: {token}")

    impact_variants = contract.get("components", {}).get("ImpactToken", {}).get("variants", {})
    if impact_variants.get("keywordImpact", {}).get("motionGrammar") != "outlineToAccentImpact":
        errors.append("ImpactToken/keywordImpact must use the outline-to-accent motion contract")
    if impact_variants.get("focusBeacon", {}).get("motionGrammar") != "beaconRailColorLock":
        errors.append("ImpactToken/focusBeacon must use the beacon color-lock motion contract")
    if impact_variants.get("focusBeacon", {}).get("mode") != "keyword":
        errors.append("ImpactToken/focusBeacon must remain compatible only with keyword semantics")
    impact_source = component_sources["ImpactToken"]
    for token in ('visualVariant?: "keywordImpact" | "numberLanding" | "focusBeacon"', 'visualVariant === "focusBeacon"', "ROOM_LIGHT_PALETTE.粉红"):
        if token not in impact_source:
            errors.append(f"ImpactToken/focusBeacon is missing implementation token: {token}")
    for token in ("accentFill", "impactPulse", "beaconColorFocus", "beaconPulse"):
        if token not in impact_source:
            errors.append(f"ImpactToken keyword variants are missing color-focus implementation token: {token}")
    if "const underline" in impact_source:
        errors.append("ImpactToken keyword variants must not restore the old underline animation")

    insight_variants = contract.get("components", {}).get("InsightFocus", {}).get("variants", {})
    if insight_variants.get("claimLanding", {}).get("motionGrammar") != "setupThenHeadlineColorShift":
        errors.append("InsightFocus/claimLanding must use the keyword color-shift motion contract")
    if insight_variants.get("spotlightThesis", {}).get("colorMode") != "single-accent":
        errors.append("InsightFocus/spotlightThesis must use the single-accent color contract")
    insight_source = component_sources["InsightFocus"]
    for token in ('visualVariant?: "claimLanding" | "spotlightThesis"', 'visualVariant === "spotlightThesis"', "ROOM_LIGHT_PALETTE.电光蓝"):
        if token not in insight_source:
            errors.append(f"InsightFocus/spotlightThesis is missing implementation token: {token}")
    for token in ("keywordFocus", "keywordPulse", "color: accentColor"):
        if token not in insight_source:
            errors.append(f"InsightFocus/claimLanding is missing color-focus implementation token: {token}")
    if "const underline" in insight_source:
        errors.append("InsightFocus/claimLanding must not restore the old underline animation")

    question_variants = contract.get("components", {}).get("QuestionTension", {}).get("variants", {})
    if question_variants.get("suspenseGap", {}).get("colorMode") != "single-accent":
        errors.append("QuestionTension/suspenseGap must use the single-accent color contract")
    question_source = component_sources["QuestionTension"]
    for token in ('visualVariant?: "openQuestion" | "suspenseGap"', 'visualVariant === "suspenseGap"', "ROOM_LIGHT_PALETTE.浅紫"):
        if token not in question_source:
            errors.append(f"QuestionTension/suspenseGap is missing implementation token: {token}")

    warning_variants = contract.get("components", {}).get("WarningBoundary", {}).get("variants", {})
    if warning_variants.get("riskLock", {}).get("colorMode") != "single-accent":
        errors.append("WarningBoundary/riskLock must use the single-accent color contract")
    warning_source = component_sources["WarningBoundary"]
    for token in ('visualVariant?: "blockedRisk" | "riskLock"', 'visualVariant === "riskLock"', "ROOM_LIGHT_PALETTE.亮红"):
        if token not in warning_source:
            errors.append(f"WarningBoundary/riskLock is missing implementation token: {token}")

    definition_variants = contract.get("components", {}).get("DefinitionReveal", {}).get("variants", {})
    if definition_variants.get("termDecoder", {}).get("colorMode") != "single-accent":
        errors.append("DefinitionReveal/termDecoder must use the single-accent color contract")
    definition_source = component_sources["DefinitionReveal"]
    for token in ('visualVariant?: "termMeaning" | "termDecoder"', 'visualVariant === "termDecoder"', "ROOM_LIGHT_PALETTE.青蓝"):
        if token not in definition_source:
            errors.append(f"DefinitionReveal/termDecoder is missing implementation token: {token}")

    result_variants = contract.get("components", {}).get("ResultLock", {}).get("variants", {})
    if result_variants.get("dualStateDock", {}).get("colorMode") != "single-accent":
        errors.append("ResultLock/dualStateDock must use the single-accent color contract")
    result_source = component_sources["ResultLock"]
    for token in ('visualVariant?: "statusToResult" | "dualStateDock"', 'visualVariant === "dualStateDock"', "ROOM_LIGHT_PALETTE.荧光绿"):
        if token not in result_source:
            errors.append(f"ResultLock/dualStateDock is missing implementation token: {token}")

    verdict_variants = contract.get("components", {}).get("VerdictStamp", {}).get("variants", {})
    if verdict_variants.get("decisionLock", {}).get("colorMode") != "single-accent":
        errors.append("VerdictStamp/decisionLock must use the single-accent color contract")
    verdict_source = component_sources["VerdictStamp"]
    for token in ('visualVariant?: "judgmentSeal" | "decisionLock"', 'visualVariant === "decisionLock"', "ROOM_LIGHT_PALETTE.深紫"):
        if token not in verdict_source:
            errors.append(f"VerdictStamp/decisionLock is missing implementation token: {token}")

    quote_variants = contract.get("components", {}).get("QuoteFrame", {}).get("variants", {})
    if quote_variants.get("excerptCard", {}).get("colorMode") != "single-accent":
        errors.append("QuoteFrame/excerptCard must use the single-accent color contract")
    quote_source = component_sources["QuoteFrame"]
    for token in ('visualVariant?: "attributedQuote" | "excerptCard"', 'visualVariant === "excerptCard"', "ROOM_LIGHT_PALETTE.粉红"):
        if token not in quote_source:
            errors.append(f"QuoteFrame/excerptCard is missing implementation token: {token}")

    memory_timing_tokens = {
        "DefinitionReveal": ("definitionAtInFrames", "bracketTermThenMeaning"),
        "ResultLock": ("resultAtInFrames", "statusProgressThenResultLock"),
        "VerdictStamp": ("verdictAtInFrames", "stampAtInFrames", "setupVerdictThenSeal"),
        "QuoteFrame": ("attributionAtInFrames", "quoteRailThenAttribution"),
    }
    for name, tokens in memory_timing_tokens.items():
        text = component_sources[name]
        for token in tokens:
            if token not in text and token not in contract_text:
                errors.append(f"{name} is missing memory timing/routing contract: {token}")

    for path in source.rglob("*.ts*"):
        text = path.read_text(encoding="utf-8")
        if 'from "@/remotion/' in text:
            errors.append(f"Non-portable project alias remains in {path.relative_to(root)}")

    preview_root = root / "assets" / "semantic-foreground-pack" / "previews"
    for preview_name in (
        "ChronologyTrack.mp4",
        "CauseEffectChain.mp4",
        "HierarchyTree.mp4",
        "FlowCarrier.mp4",
        "ProblemSolutionBridge.mp4",
        "ConditionGate.mp4",
        "FeedbackLoop.mp4",
        "QuadrantMatrix.mp4",
        "MemoryCoreSet.mp4",
        "MemoryFinalSet.mp4",
    ):
        if not (preview_root / preview_name).exists():
            errors.append(f"Missing approved source preview: {preview_name}")

    ownership = contract.get('library', {}).get('sourceOwnership', {})
    if ownership.get('authoritativeSkill') != 'remotion-foreground-builder-auto-reference-first' or ownership.get('editorMayOverrideComponentSource') is not False:
        errors.append('Classic component authority must remain upstream with no editor source override')
    promoted = {'HierarchyTree': ['iconClassification'], 'ConceptComparisonCards': ['branchOutcomeRows'],
                'FormFillSequence': ['stepRail', 'compactExplanationStack']}
    for name, variants in promoted.items():
        component = contract.get('components', {}).get(name, {})
        implementation = component_sources[name]
        for variant in variants:
            metadata = component.get('variants', {}).get(variant, {})
            for field in ('useWhen', 'doNotUseWhen', 'payload', 'invariants'):
                if not metadata.get(field):
                    errors.append(f'{name}/{variant} lacks shared {field}')
            if metadata.get('motionGrammar') not in component.get('motionGrammars', []):
                errors.append(f'{name}/{variant} has unregistered motion grammar')
            if variant not in implementation:
                errors.append(f'{name}/{variant} is not implemented in the authoritative pack')
            reference = metadata.get('reviewedReference', '')
            if reference.startswith('assets/') and not (root / reference).is_file():
                errors.append(f'Missing reviewed variant reference: {reference}')
    icons_path = source / 'lib/semantic-icons.tsx'
    if not icons_path.is_file():
        errors.append('Missing authoritative semantic SVG vocabulary')
    else:
        icons_source = icons_path.read_text(encoding='utf-8')
        vocabulary = icons_source.split('export const SEMANTIC_ICON_NAMES:', 1)[-1].split('] as const;', 1)[0]
        source_icons = set(re.findall(r'"([A-Za-z]+)"', vocabulary))
        icons_contract = contract.get('iconLibrary', {})
        declared_icons = set(icons_contract.get('approvedReferenceIcons', [])) | set(icons_contract.get('copiedFromAtomicVocabulary', []))
        if source_icons != declared_icons or len(source_icons) != 32:
            errors.append('Authoritative icon contract differs from the typed SVG vocabulary')
    if not (root / 'scripts/classic_component_payloads.py').is_file():
        errors.append('Missing shared component payload validator')

    result = {
        "status": "pass" if not errors else "fail",
        "semanticSlotCount": contract.get("library", {}).get("semanticSlotCount"),
        "componentCount": len(contract.get("coreComponents", [])),
        "legacyRouting": contract.get("library", {}).get("legacyRouting"),
        "errors": errors,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
