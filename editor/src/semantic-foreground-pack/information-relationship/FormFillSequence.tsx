import React from "react";
import {AtomicSceneRenderer} from "../atomic/AtomicSceneRenderer";
import {buildProgressiveStateBoard, type ProgressiveStateStep} from "../atomic/structures/ProgressiveStateBoard";
import type {ForegroundPlacement, Rect} from "../lib/layout";

export type SpokenSequenceStep = ProgressiveStateStep;

/** Backward-compatible props. New cuts route `sequence` straight to the atomic structure. */
export type FormFillSequenceProps = {
  steps: SpokenSequenceStep[];
  visualVariant?: "spokenSteps" | "stepRail" | "editorialRail" | "cumulativeSignals";
  /** @deprecated Ignored. The director-owned SectionTitle track renders headings. */
  title?: string;
  /** @deprecated Ignored. The director-owned SectionTitle track renders headings. */
  titleEmphasis?: string;
  /** @deprecated Ignored. The director-owned SectionTitle track renders headings. */
  chapterLabel?: string;
  resultLabel?: string;
  placement?: ForegroundPlacement;
  zoneOverride?: Rect;
  layoutMode?: "panel" | "progressiveStack";
  attentionMode?: "standard" | "guided";
  showLockedFuture?: boolean;
  accentColor?: string;
  validColor?: string;
  theme?: "dark" | "light";
  exitAtInFrames?: number;
  exitInFrames?: number;
};

/** Legacy adapter: old FormFillSequence calls now compile into atomic parts. */
export const FormFillSequence: React.FC<FormFillSequenceProps> = ({
  steps,
  visualVariant = "spokenSteps",
  resultLabel,
  placement = "leftMiddle",
  zoneOverride,
  showLockedFuture = true,
  accentColor = "#38F2E6",
  validColor = accentColor,
  exitAtInFrames,
  exitInFrames,
}) => {
  const atomicVariant = visualVariant === "stepRail" || visualVariant === "cumulativeSignals" ? "cumulativeSignals" : "editorialRail";
  const graph = buildProgressiveStateBoard({
      steps,
    resultLabel,
    topology: atomicVariant === "cumulativeSignals" ? "cumulative-stack" : "editorial-rail",
    visualVariant: atomicVariant,
    visualStyle: atomicVariant === "cumulativeSignals" ? "reference-cumulative-signals" : "reference-v3-editorial",
    showLockedFuture: atomicVariant === "editorialRail" ? showLockedFuture : false,
    accentColor,
    completeColor: validColor,
  });

  return <AtomicSceneRenderer graph={graph} placement={placement} zoneOverride={zoneOverride} accentColor={accentColor} completeColor={validColor} exitAtInFrames={exitAtInFrames} exitInFrames={exitInFrames} />;
};
