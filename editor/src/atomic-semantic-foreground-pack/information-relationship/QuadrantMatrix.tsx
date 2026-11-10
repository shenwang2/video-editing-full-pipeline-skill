import React from "react";
import {useCurrentFrame} from "remotion";
import type {ForegroundPlacement} from "../lib/layout";
import {QuadrantVisual} from "../atomic/ApprovedSemanticVisuals";

export type QuadrantDatum = {label: string; x: number; y: number; showAtInFrames: number; detail?: string; accentColor?: string};
export type QuadrantLabel = {title: string; detail?: string; accentColor?: string; showAtInFrames?: number};
export type QuadrantMatrixProps = {xAxisLabel: string; yAxisLabel: string; quadrants: [QuadrantLabel,QuadrantLabel,QuadrantLabel,QuadrantLabel]; items: QuadrantDatum[]; placement?: ForegroundPlacement; accentColor?: string; theme?: "dark"|"light"; visualVariant?: "fullMatrix"|"independentRulers"|"fourQuadrants"|"magneticDecisionBoard"; gridShowAtInFrames?: number; showAtInFrames?: number; exitAtInFrames?: number; exitInFrames?: number};
export const QuadrantMatrix: React.FC<QuadrantMatrixProps> = ({xAxisLabel,yAxisLabel,quadrants,items,placement="centerSafe",accentColor="#4A79FF",visualVariant="fullMatrix",gridShowAtInFrames=0,showAtInFrames,exitAtInFrames,exitInFrames}) => {
  const frame=useCurrentFrame(); const start=showAtInFrames??gridShowAtInFrames; if(frame<start)return null;
  const canonical=visualVariant==="independentRulers"||visualVariant==="magneticDecisionBoard"?"independentRulers":"fullMatrix";
  return <QuadrantVisual variant={canonical} xAxisLabel={xAxisLabel} yAxisLabel={yAxisLabel} quadrants={quadrants} items={items} accentColor={accentColor} placement={placement} showAtInFrames={start} exitAtInFrames={exitAtInFrames} exitInFrames={exitInFrames}/>;
};
