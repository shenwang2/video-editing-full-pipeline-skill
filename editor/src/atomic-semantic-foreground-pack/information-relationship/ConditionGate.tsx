import React from "react";
import {AtomicSceneRenderer} from "../atomic/AtomicSceneRenderer";
import {buildConditionBoundary} from "../atomic/structures/ConditionBoundary";
import type {ForegroundPlacement} from "../lib/layout";

export type ConditionCriterion = {label: string; passed: boolean; showAtInFrames: number};
export type ConditionGateProps = {inputLabel: string; conditions: ConditionCriterion[]; passLabel: string; blockedLabel?: string; resultShowAtInFrames: number; visualVariant?: "validationLedger" | "keyRing" | "validationGate" | "keyGate"; placement?: ForegroundPlacement; accentColor?: string; passColor?: string; failColor?: string; theme?: "dark" | "light"; exitAtInFrames?: number; exitInFrames?: number};

export const ConditionGate: React.FC<ConditionGateProps> = ({inputLabel, conditions, passLabel, blockedLabel, resultShowAtInFrames, visualVariant = "validationLedger", placement = "centerSafe", exitAtInFrames, exitInFrames}) => {
  const resolvedVariant = visualVariant === "keyGate" ? "keyRing" : visualVariant === "validationGate" ? "validationLedger" : visualVariant;
  const graph = buildConditionBoundary({inputLabel, conditions, passLabel, blockedLabel, resultShowAtInFrames, visualVariant: resolvedVariant});
  return <AtomicSceneRenderer graph={graph} placement={placement} exitAtInFrames={exitAtInFrames} exitInFrames={exitInFrames}/>;
};
