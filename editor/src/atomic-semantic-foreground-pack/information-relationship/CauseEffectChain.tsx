import React from "react";
import {AtomicSceneRenderer} from "../atomic/AtomicSceneRenderer";
import {buildCauseEffectRelationship} from "../atomic/structures/CauseEffectRelationship";
import type {SemanticIconName} from "../atomic/types";
import type {ForegroundPlacement} from "../lib/layout";

export type CauseEffectNode = {
  label: string;
  title: string;
  detail?: string;
  showAtInFrames: number;
  icon?: SemanticIconName;
  accentColor?: string;
};

export type CauseEffectChainProps = {
  cause: CauseEffectNode;
  mechanism?: CauseEffectNode;
  mechanisms?: CauseEffectNode[];
  effect: CauseEffectNode;
  timeRange?: string;
  visualVariant?: "statusStack" | "outcomeGauge" | "causalHandoff" | "energyChain";
  placement?: ForegroundPlacement;
  accentColor?: string;
  theme?: "dark" | "light";
  exitAtInFrames?: number;
  exitInFrames?: number;
};

export const CauseEffectChain: React.FC<CauseEffectChainProps> = ({cause, mechanism, mechanisms, effect, timeRange, visualVariant = "statusStack", placement = "centerSafe", accentColor, exitAtInFrames, exitInFrames}) => {
  const resolvedVariant = visualVariant === "outcomeGauge" || visualVariant === "energyChain" ? "outcomeGauge" : "statusStack";
  const graph = buildCauseEffectRelationship({cause, mechanisms: mechanisms ?? (mechanism ? [mechanism] : []), effect, timeRange, visualVariant: resolvedVariant});
  return <AtomicSceneRenderer graph={graph} placement={placement} accentColor={accentColor} exitAtInFrames={exitAtInFrames} exitInFrames={exitInFrames} />;
};
