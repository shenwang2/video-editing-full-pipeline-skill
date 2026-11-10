import React from "react";
import {AtomicSceneRenderer} from "../atomic/AtomicSceneRenderer";
import {buildCarrierStageRoute, type CarrierStage} from "../atomic/structures/CarrierStageRoute";
import type {ForegroundPlacement, Rect} from "../lib/layout";

export type FlowStage = CarrierStage;
export type FlowCarrierProps = {
  stages: FlowStage[];
  carrierLabel?: string;
  visualVariant?: "semanticRelay" | "dispatchReturn" | "stageTransfer" | "processingPods";
  placement?: ForegroundPlacement;
  zoneOverride?: Rect;
  accentColor?: string;
  theme?: "dark" | "light";
  travelInFrames?: number;
  returnColor?: string;
  taskLabel?: string;
  resultLabel?: string;
  completionLabel?: string;
  dispatchAtInFrames?: number;
  returnAtInFrames?: number;
  resultAtInFrames?: number;
  exitAtInFrames?: number;
  exitInFrames?: number;
};

/** Legacy adapter: new flow cuts bind to carrier_stage_route or transaction_lifecycle. */
export const FlowCarrier: React.FC<FlowCarrierProps> = ({
  stages,
  carrierLabel = "信息",
  visualVariant = "semanticRelay",
  placement = "centerSafe",
  zoneOverride,
  accentColor = "#3D5BFF",
  travelInFrames = 14,
  returnColor,
  taskLabel,
  resultLabel,
  completionLabel,
  dispatchAtInFrames,
  returnAtInFrames,
  resultAtInFrames,
  exitAtInFrames,
  exitInFrames,
}) => {
  const graph = buildCarrierStageRoute({
    carrierLabel,
    stages,
    visualVariant,
    accentColor,
    returnColor,
    taskLabel,
    resultLabel,
    completionLabel,
    dispatchAtInFrames,
    returnAtInFrames,
    resultAtInFrames,
    travelInFrames,
  });
  return <AtomicSceneRenderer graph={graph} placement={placement} zoneOverride={zoneOverride} accentColor={accentColor} exitAtInFrames={exitAtInFrames} exitInFrames={exitInFrames} />;
};
