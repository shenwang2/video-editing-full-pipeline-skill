import {inferSemanticIcon} from "./ProgressiveStateBoard";
import type {AtomicSceneAtom, AtomicSceneGraph, SemanticIconName} from "../types";

export type FlowVisualVariant = "semanticRelay" | "dispatchReturn" | "stageTransfer" | "processingPods";

export type CarrierStage = {
  id?: string;
  label: string;
  detail?: string;
  meta?: string;
  icon?: SemanticIconName;
  showAtInFrames: number;
  completeAtInFrames?: number;
  custodyState?: string;
};

export type CarrierStageRouteSpec = {
  carrierLabel: string;
  carrierIcon?: SemanticIconName;
  stages: CarrierStage[];
  mode?: "generic" | "transaction";
  visualVariant?: FlowVisualVariant;
  topology?: "compact-linear" | "dispatch-return" | "zigzag-track" | "linear-track" | "auto";
  accentColor?: string;
  returnColor?: string;
  taskLabel?: string;
  resultLabel?: string;
  completionLabel?: string;
  dispatchAtInFrames?: number;
  returnAtInFrames?: number;
  resultAtInFrames?: number;
  travelInFrames?: number;
};

const transactionWords = /(订单|资产|资金|付款|冻结|托管|交付|验收|结算|退款|争议|责任|order|asset|fund|escrow|delivery|accept|settle|refund|dispute|custody)/i;

export const hasTransactionLifecycleEvidence = (spec: Pick<CarrierStageRouteSpec, "carrierLabel" | "stages">) =>
  spec.stages.length >= 3 && transactionWords.test([spec.carrierLabel, ...spec.stages.flatMap((stage) => [stage.label, stage.detail ?? "", stage.custodyState ?? ""])].join(" "));

const resolveFlowVariant = (spec: CarrierStageRouteSpec): "semanticRelay" | "dispatchReturn" => {
  if (spec.mode === "transaction" || hasTransactionLifecycleEvidence(spec)) return "semanticRelay";
  if (spec.visualVariant === "dispatchReturn" || spec.topology === "dispatch-return") return "dispatchReturn";
  return "semanticRelay";
};

const stageTimeline = (stage: CarrierStage, nextAt: number | undefined, travelInFrames: number) => ({
  revealAtInFrames: stage.showAtInFrames,
  activeAtInFrames: stage.showAtInFrames,
  completeAtInFrames: stage.completeAtInFrames ?? nextAt ?? stage.showAtInFrames + travelInFrames,
});

export const buildCarrierStageRoute = (spec: CarrierStageRouteSpec): AtomicSceneGraph => {
  if (spec.stages.length < 2 || spec.stages.length > 5) throw new Error("carrier stage route requires 2..5 stages");
  const mode = spec.mode ?? (hasTransactionLifecycleEvidence(spec) ? "transaction" : "generic");
  if (mode === "transaction" && !hasTransactionLifecycleEvidence(spec)) throw new Error("transaction_lifecycle requires at least three stages plus grounded asset, responsibility, custody, or settlement evidence");

  const visualVariant = resolveFlowVariant(spec);
  if (visualVariant === "dispatchReturn" && spec.stages.length !== 2) throw new Error("dispatchReturn requires exactly two endpoint stages");

  const accent = spec.accentColor ?? "#24E5EE";
  const returnColor = spec.returnColor ?? "#F4B95F";
  const travelInFrames = spec.travelInFrames ?? 16;
  const atoms: AtomicSceneAtom[] = [];

  if (visualVariant === "dispatchReturn") {
    const origin = spec.stages[0];
    const worker = spec.stages[1];
    const firstAt = origin.showAtInFrames;
    const dispatchAt = spec.dispatchAtInFrames ?? worker.showAtInFrames;
    const arriveAt = dispatchAt + travelInFrames;
    const returnAt = spec.returnAtInFrames ?? worker.completeAtInFrames ?? arriveAt + Math.max(18, travelInFrames);
    const resultAt = spec.resultAtInFrames ?? returnAt + travelInFrames;
    const endpoints = [
      {stage: origin, x: 0.12, color: accent, timeline: {revealAtInFrames: firstAt, activeAtInFrames: firstAt, completeAtInFrames: resultAt}},
      {stage: worker, x: 0.88, color: returnColor, timeline: {revealAtInFrames: firstAt + 8, activeAtInFrames: arriveAt, completeAtInFrames: returnAt}},
    ];

    endpoints.forEach(({stage, x, color, timeline}, index) => {
      const id = stage.id ?? (index === 0 ? "origin" : "worker");
      atoms.push({id: `${id}-icon`, kind: "icon", bounds: {x: x - 0.036, y: 0.405, width: 0.072, height: 0.15}, icon: stage.icon ?? (index === 0 ? "workflow" : "settings"), timeline, revealAtInFrames: timeline.revealAtInFrames, color, completeColor: color, appearance: "flow-port-icon", phaseOpacity: {future: 0.58, active: 1, complete: 0.62}, replaceWithCheckWhenComplete: true, zIndex: 4});
      atoms.push({id: `${id}-label`, kind: "text", role: "label", text: stage.label, bounds: {x: x - 0.14, y: 0.575, width: 0.28, height: 0.085}, timeline, revealAtInFrames: timeline.revealAtInFrames, appearance: "flow-title", phaseOpacity: {future: 0.58, active: 1, complete: 0.62}, zIndex: 4});
      atoms.push({id: `${id}-meta`, kind: "text", role: "detail", text: stage.meta ?? (index === 0 ? "ORCHESTRATOR" : "SPECIALIST"), bounds: {x: x - 0.14, y: 0.66, width: 0.28, height: 0.055}, timeline, revealAtInFrames: timeline.revealAtInFrames, color, appearance: "flow-meta", phaseOpacity: {future: 0.52, active: 0.92, complete: 0.58}, zIndex: 4});
    });

    atoms.push({id: "dispatch-rail", kind: "connector", from: {x: 0.22, y: 0.33}, to: {x: 0.78, y: 0.33}, revealAtInFrames: dispatchAt, color: accent, appearance: "straight-rail", showArrow: true, zIndex: 0});
    atoms.push({id: "dispatch-label", kind: "text", role: "detail", text: "DISPATCH · 派发", bounds: {x: 0.38, y: 0.235, width: 0.24, height: 0.055}, revealAtInFrames: dispatchAt, color: accent, appearance: "flow-direction", zIndex: 4});
    atoms.push({id: "task-carrier", kind: "carrier", start: {x: 0.22, y: 0.33}, size: {width: 0.115, height: 0.07}, label: spec.taskLabel ?? spec.carrierLabel, color: accent, appearance: "flow-chip", revealAtInFrames: dispatchAt, hideAtInFrames: arriveAt + 8, segments: [{to: {x: 0.78, y: 0.33}, departAtInFrames: dispatchAt, arriveAtInFrames: arriveAt}], zIndex: 8});
    atoms.push({id: "processing-label", kind: "text", role: "detail", text: "处理中", bounds: {x: 0.41, y: 0.47, width: 0.18, height: 0.055}, revealAtInFrames: arriveAt, hideAtInFrames: returnAt, color: returnColor, appearance: "flow-direction", zIndex: 4});
    atoms.push({id: "return-rail", kind: "connector", from: {x: 0.78, y: 0.74}, to: {x: 0.22, y: 0.74}, revealAtInFrames: returnAt, color: returnColor, appearance: "straight-rail", showArrow: true, zIndex: 0});
    atoms.push({id: "return-label", kind: "text", role: "detail", text: "RETURN · 回收", bounds: {x: 0.38, y: 0.79, width: 0.24, height: 0.055}, revealAtInFrames: returnAt, color: returnColor, appearance: "flow-direction", zIndex: 4});
    atoms.push({id: "result-carrier", kind: "carrier", start: {x: 0.78, y: 0.74}, size: {width: 0.115, height: 0.07}, label: spec.resultLabel ?? "结果", color: returnColor, appearance: "flow-chip", revealAtInFrames: returnAt, hideAtInFrames: resultAt + 10, segments: [{to: {x: 0.22, y: 0.74}, departAtInFrames: returnAt, arriveAtInFrames: resultAt}], zIndex: 8});
    atoms.push({id: "result-lock-label", kind: "text", role: "result", text: spec.completionLabel ?? "✓ 结果已回收", bounds: {x: 0.02, y: 0.22, width: 0.22, height: 0.065}, revealAtInFrames: resultAt, color: returnColor, appearance: "flow-status", zIndex: 5});

    return {schemaVersion: "1.0", structureId: "dispatch_return_flow", topology: "dispatch-return", coordinateSpace: "normalized-zone", atoms, metadata: {semanticLayer: "informationRelationship", semanticPurpose: "flow", sourceComponent: "FlowCarrier", visualStyle: "reference-flow-dispatch-return", compositionRules: ["dispatch and return use separate straight rails", "task and result directions remain explicit", "processing holds between arrival and return", "result lock appears only after the return arrives", "do not use for a one-way multistage route"]}};
  }

  const count = spec.stages.length;
  const xStart = count <= 3 ? 0.115 : 0.055;
  const xEnd = count <= 3 ? 0.885 : 0.945;
  const points = spec.stages.map((_, index) => ({x: xStart + (xEnd - xStart) * index / Math.max(1, count - 1), y: 0.48}));
  const iconWidth = count >= 5 ? 0.052 : 0.066;
  const iconHeight = count >= 5 ? 0.12 : 0.14;
  const labelWidth = count <= 3 ? 0.24 : Math.min(0.19, 0.78 / count);
  const carrierPoints = points.map((point) => ({x: point.x, y: 0.33}));

  spec.stages.forEach((stage, index) => {
    const id = stage.id ?? `stage-${index + 1}`;
    const nextAt = spec.stages[index + 1]?.showAtInFrames;
    const timeline = stageTimeline(stage, nextAt, travelInFrames);
    const meta = stage.meta ?? stage.custodyState ?? stage.detail ?? `${String(index + 1).padStart(2, "0")} · STAGE`;

    atoms.push({id: `${id}-icon`, kind: "icon", bounds: {x: points[index].x - iconWidth / 2, y: points[index].y - iconHeight / 2, width: iconWidth, height: iconHeight}, icon: stage.icon ?? inferSemanticIcon(`${stage.label} ${stage.detail ?? ""}`), timeline, revealAtInFrames: stage.showAtInFrames, color: accent, completeColor: accent, appearance: "flow-port-icon", phaseOpacity: {future: 0, active: 1, complete: 0.58}, replaceWithCheckWhenComplete: true, zIndex: 4});
    atoms.push({id: `${id}-label`, kind: "text", role: "label", text: stage.label, bounds: {x: points[index].x - labelWidth / 2, y: 0.585, width: labelWidth, height: 0.085}, timeline, revealAtInFrames: stage.showAtInFrames, appearance: "flow-title", phaseOpacity: {future: 0, active: 1, complete: 0.58}, zIndex: 4});
    atoms.push({id: `${id}-meta`, kind: "text", role: "detail", text: meta, bounds: {x: points[index].x - labelWidth / 2, y: 0.675, width: labelWidth, height: 0.05}, timeline, revealAtInFrames: stage.showAtInFrames, color: accent, appearance: "flow-meta", phaseOpacity: {future: 0, active: 0.95, complete: 0.58}, zIndex: 4});
    if (index < count - 1) {
      atoms.push({id: `${id}-connector`, kind: "connector", from: {x: points[index].x + iconWidth / 2 + 0.008, y: 0.48}, to: {x: points[index + 1].x - iconWidth / 2 - 0.008, y: 0.48}, revealAtInFrames: spec.stages[index + 1].showAtInFrames, color: accent, appearance: "straight-rail", showArrow: false, zIndex: 0});
    }
  });

  const firstAt = spec.stages[0].showAtInFrames;
  atoms.push({id: "carrier", kind: "carrier", start: carrierPoints[0], size: {width: Math.min(0.16, 0.085 + [...spec.carrierLabel].length * 0.014), height: 0.07}, label: spec.carrierLabel, icon: spec.carrierIcon, color: accent, appearance: "flow-chip", revealAtInFrames: firstAt, segments: spec.stages.slice(1).map((stage, index) => ({to: carrierPoints[index + 1], departAtInFrames: stage.showAtInFrames, arriveAtInFrames: stage.showAtInFrames + travelInFrames})), zIndex: 8});

  return {schemaVersion: "1.0", structureId: mode === "transaction" ? "transaction_lifecycle" : "carrier_stage_route", topology: "compact-linear", coordinateSpace: "normalized-zone", atoms, metadata: {semanticLayer: "informationRelationship", semanticPurpose: "flow", sourceComponent: "FlowCarrier", visualStyle: "reference-flow-semantic-relay", compositionRules: ["one carrier preserves identity", "destination station and label reveal at the spoken trigger", "straight compact rails connect only adjacent stages", "previous stations persist and dim", mode === "transaction" ? "custody or settlement state must be grounded" : "do not imply custody or settlement"]}};
};
