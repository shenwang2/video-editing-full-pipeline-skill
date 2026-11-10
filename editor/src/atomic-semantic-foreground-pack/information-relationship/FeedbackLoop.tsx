import React from "react";
import {useCurrentFrame} from "remotion";
import type {ForegroundPlacement} from "../lib/layout";
import {FeedbackVisual} from "../atomic/ApprovedSemanticVisuals";

export type FeedbackLoopStage = {label: string; showAtInFrames: number; detail?: string; accentColor?: string};
export type FeedbackLoopProps = {
  stages: FeedbackLoopStage[]; centerLabel: string; loopStartInFrames?: number; loopEndInFrames?: number;
  placement?: ForegroundPlacement; accentColor?: string; theme?: "dark" | "light"; direction?: "cw" | "ccw";
  visualVariant?: "calibrationLedger" | "returnBand" | "closedCycle" | "returnLoopBand";
  feedbackItems?: string[]; ruleUpdates?: string[]; initialValue?: string | number; finalValue?: string | number; metricLabel?: string;
  showAtInFrames?: number; exitAtInFrames?: number; exitInFrames?: number;
};
export const FeedbackLoop: React.FC<FeedbackLoopProps> = ({stages, centerLabel, placement="centerSafe", accentColor="#35D8FF", visualVariant="calibrationLedger", feedbackItems, ruleUpdates, initialValue, finalValue, metricLabel, showAtInFrames, loopStartInFrames, exitAtInFrames, exitInFrames}) => {
  const frame = useCurrentFrame(); const start = showAtInFrames ?? loopStartInFrames ?? 0;
  const canonical = visualVariant === "returnLoopBand" || visualVariant === "returnBand" ? "returnBand" : "calibrationLedger";
  if (frame < start) return null;
  return <FeedbackVisual variant={canonical} stages={stages} centerLabel={centerLabel} feedbackItems={feedbackItems} ruleUpdates={ruleUpdates} initialValue={initialValue} finalValue={finalValue} metricLabel={metricLabel} accentColor={accentColor} placement={placement} showAtInFrames={start} exitAtInFrames={exitAtInFrames} exitInFrames={exitInFrames}/>;
};
