import React from "react";
import {AtomicSceneRenderer} from "../atomic/AtomicSceneRenderer";
import {buildProblemSolutionResolution} from "../atomic/structures/ProblemSolutionResolution";
import type {SemanticIconName} from "../atomic/types";
import type {ForegroundPlacement} from "../lib/layout";

export type ProblemSolutionItem = {label: string; showAtInFrames: number; icon?: SemanticIconName};
export type ProblemSolutionSide = {eyebrow?: string; title: string; detail?: string; items?: ProblemSolutionItem[]};
export type ProblemSolutionBridgeProps = {problem: ProblemSolutionSide; solution: ProblemSolutionSide; actionLabel: string; visualVariant?: "interventionRail" | "resolutionStack" | "actionBridge" | "transformChamber"; problemShowAtInFrames?: number; actionShowAtInFrames: number; solutionShowAtInFrames: number; placement?: ForegroundPlacement; layoutMode?: "standard" | "subjectSplit"; attentionMode?: "standard" | "handoff"; subjectZone?: [number, number, number, number]; titleZone?: [number, number, number, number]; masterLeftX?: number; problemColor?: string; actionColor?: string; solutionColor?: string; theme?: "dark" | "light"; exitAtInFrames?: number; exitInFrames?: number};

/** Compatibility adapter. New work compiles problemSolution to problem_solution_resolution. */
export const ProblemSolutionBridge: React.FC<ProblemSolutionBridgeProps> = ({problem, solution, actionLabel, visualVariant = "interventionRail", problemShowAtInFrames = 0, actionShowAtInFrames, solutionShowAtInFrames, placement = "centerSafe", exitAtInFrames, exitInFrames}) => {
  const resolvedVariant = visualVariant === "resolutionStack" || visualVariant === "transformChamber" ? "resolutionStack" : "interventionRail";
  const graph = buildProblemSolutionResolution({problem: {label: problem.eyebrow ?? "问题状态", title: problem.title, showAtInFrames: problemShowAtInFrames, items: problem.items}, solution: {label: solution.eyebrow ?? "解决状态", title: solution.title, showAtInFrames: solutionShowAtInFrames, items: solution.items}, actionLabel, actionShowAtInFrames, visualVariant: resolvedVariant});
  return <AtomicSceneRenderer graph={graph} placement={placement} exitAtInFrames={exitAtInFrames} exitInFrames={exitInFrames}/>;
};
