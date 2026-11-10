import React from "react";
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {SemanticIcon} from "../SemanticIcon";
import type {AtomicSceneGraph, CauseEffectPresentation as CauseEffectPresentationSpec, CauseEffectPresentationNode} from "../types";

const CYAN = "#26E2E8";
const AMBER = "#F2B960";
const RED = "#FF5966";
const WHITE = "#F4F8FF";
const MUTED = "#8290A1";
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

export type CauseEffectRelationshipSpec = {
  cause: CauseEffectPresentationNode;
  mechanisms?: CauseEffectPresentationNode[];
  effect: CauseEffectPresentationNode;
  timeRange?: string;
  visualVariant?: "statusStack" | "outcomeGauge";
};

export const buildCauseEffectRelationship = (input: CauseEffectRelationshipSpec): AtomicSceneGraph => {
  const clean = (node: CauseEffectPresentationNode): CauseEffectPresentationNode => ({...node, label: node.label.trim(), title: node.title.trim(), detail: node.detail?.trim()});
  const cause = clean(input.cause);
  const mechanisms = (input.mechanisms ?? []).map(clean);
  const effect = clean(input.effect);
  if (!cause.label || !cause.title || !effect.label || !effect.title) throw new Error("cause_effect_chain requires grounded cause and effect labels/titles");
  if (mechanisms.length > 2) throw new Error("cause_effect_chain supports at most two explicitly spoken mechanisms");
  const nodes = [cause, ...mechanisms, effect];
  nodes.forEach((node, index) => {
    if (!node.label || !node.title) throw new Error(`cause_effect_chain node ${index + 1} requires a grounded label and title`);
    if (index > 0 && node.showAtInFrames <= nodes[index - 1].showAtInFrames) throw new Error("cause_effect_chain Spoken Beats must follow cause, mechanisms, then effect");
  });
  const visualVariant = input.visualVariant ?? "statusStack";
  return {
    schemaVersion: "1.0",
    structureId: "cause_effect_chain",
    topology: visualVariant === "outcomeGauge" ? "ledger-outcome-gauge" : "vertical-status-chain",
    coordinateSpace: "normalized-zone",
    atoms: [],
    presentation: {kind: "cause-effect-chain", visualVariant, cause, mechanisms, effect, timeRange: input.timeRange?.trim()},
    metadata: {semanticLayer: "informationRelationship", semanticPurpose: "causeEffect", sourceComponent: "CauseEffectChain", visualStyle: visualVariant === "outcomeGauge" ? "atomic-cause-outcome-gauge" : "atomic-causal-status-stack", lockedLayoutAspect: 16 / 9, compositionRules: ["reveal-only-in-cause-mechanism-effect-information-direction", "never-show-the-effect-before-its-spoken-beat", "mechanisms-must-be-explicitly-spoken-or-transcript-grounded", "status-stack-rows-use-content-derived-width-and-no-thick-leading-card-border", "outcome-gauge-reserves-the-gauge-for-the-final-grounded-result"]},
  };
};

const ease = (frame: number, from: number, to: number) => interpolate(frame, [from, to], [0, 1], {...clamp, easing: Easing.bezier(.16, 1, .3, 1)});
const enterAt = (frame: number, beat: number, fps: number) => Math.min(1, spring({frame: frame - beat, fps, config: {damping: 18, stiffness: 165, mass: .72}}));
const visualLength = (text: string) => Array.from(text).reduce((sum, char) => sum + (/^[\u0000-\u00ff]$/.test(char) ? .56 : 1), 0);
const rowWidth = (node: CauseEffectPresentationNode, result: boolean, bad: boolean) => Math.min(result ? 690 : 560, Math.max(result ? 390 : 310, Math.max(visualLength(node.label) * 14, visualLength(node.title) * (result ? 34 : 29), visualLength(node.detail ?? "") * 17) + 112 + (bad ? 38 : 0)));

const XMark: React.FC<{progress: number}> = ({progress}) => <div style={{position: "relative", width: 25, height: 25, opacity: progress}}><span style={{position: "absolute", left: 11, top: 1, width: 3, height: 23, borderRadius: 9, background: RED, rotate: "45deg", boxShadow: `0 0 10px ${RED}`}} /><span style={{position: "absolute", left: 11, top: 1, width: 3, height: 23, borderRadius: 9, background: RED, rotate: "-45deg", boxShadow: `0 0 10px ${RED}`}} /></div>;

const StatusRow: React.FC<{node: CauseEffectPresentationNode; top: number; color: string; progress: number; bad?: boolean; result?: boolean}> = ({node, top, color, progress, bad = false, result = false}) => {
  const width = rowWidth(node, result, bad);
  return <div data-atomic-kind={result ? "result" : "state-row"} data-content-sized-surface="cause-effect-status-row" style={{position: "absolute", left: 878, top, width, boxSizing: "border-box", padding: result ? "22px 27px 23px 21px" : "18px 23px 18px 19px", display: "flex", alignItems: "center", gap: 18, borderRadius: result ? 22 : 18, background: result ? "linear-gradient(100deg,rgba(50,13,20,.76),rgba(14,12,18,.62))" : "linear-gradient(105deg,rgba(18,26,36,.78),rgba(8,12,18,.60))", backdropFilter: "blur(13px) saturate(1.1)", border: `1px solid ${color}${result ? "72" : "48"}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.09),0 14px 30px rgba(0,0,0,.23),0 0 20px ${color}0D`, opacity: progress, transform: `translateX(${(1 - progress) * 32}px) scale(${.97 + progress * .03})`, transformOrigin: "left center"}}>
    <div style={{width: result ? 62 : 54, height: result ? 62 : 54, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: 15, background: `${color}0D`, border: `1px solid ${color}62`}}><SemanticIcon name={node.icon ?? (result ? "chart" : bad ? "gauge" : "spark")} size={result ? 36 : 32} color={color} progress={progress} /></div>
    <div style={{minWidth: 0, flex: "0 1 auto"}}><div style={{color, fontSize: 14, lineHeight: 1, fontWeight: 850, letterSpacing: 3, whiteSpace: "nowrap"}}>{node.label}</div><div data-primary-text="true" style={{marginTop: 10, color: WHITE, fontSize: result ? 34 : 29, lineHeight: 1.08, fontWeight: 900, whiteSpace: "nowrap"}}>{node.title}</div>{node.detail ? <div data-auxiliary-text="true" style={{marginTop: 9, color: MUTED, fontSize: 17, lineHeight: 1.15, fontWeight: 630, whiteSpace: "nowrap"}}>{node.detail}</div> : null}</div>{bad ? <XMark progress={progress} /> : null}
  </div>;
};

const StatusStack: React.FC<{spec: CauseEffectPresentationSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const nodes = [spec.cause, ...spec.mechanisms, spec.effect];
  const heights = nodes.map((_, index) => index === nodes.length - 1 ? 126 : 94);
  const gap = 18;
  const totalHeight = heights.reduce((a, b) => a + b, 0) + gap * (nodes.length - 1);
  const top = (1440 - totalHeight) / 2;
  const tops: number[] = [];
  heights.reduce((cursor, height) => { tops.push(cursor); return cursor + height + gap; }, top);
  const centers = tops.map((y, index) => y + heights[index] / 2);
  return <>{centers.slice(0, -1).map((center, index) => {
    const nextCenter = centers[index + 1];
    const progress = ease(frame, nodes[index].showAtInFrames + 8, nodes[index + 1].showAtInFrames);
    return <React.Fragment key={`rail-${index}`}><div style={{position: "absolute", left: 790, top: center, width: 3, height: nextCenter - center, background: "rgba(255,255,255,.11)"}} /><div data-atomic-kind="connector" style={{position: "absolute", left: 789, top: center, width: 5, height: (nextCenter - center) * progress, borderRadius: 99, background: `linear-gradient(${index === 0 ? CYAN : AMBER},${index === nodes.length - 2 ? RED : AMBER})`, boxShadow: "0 0 16px rgba(38,226,232,.24)"}} /></React.Fragment>;
  })}{nodes.map((node, index) => {
    const p = enterAt(frame, node.showAtInFrames, fps);
    const result = index === nodes.length - 1;
    const mechanism = index > 0 && !result;
    const color = result ? RED : mechanism ? AMBER : CYAN;
    return <React.Fragment key={`${node.label}-${index}`}><div style={{position: "absolute", left: 772, top: centers[index] - 18, width: 38, height: 38, boxSizing: "border-box", borderRadius: 99, background: "#091017", border: `2px solid ${color}`, boxShadow: `0 0 ${14 + p * 14}px ${color}44`, opacity: p, scale: .82 + p * .18, zIndex: 5}}><div style={{position: "absolute", inset: 11, borderRadius: 99, background: color, opacity: .85}} /></div><StatusRow node={node} top={tops[index]} color={color} progress={p} bad={mechanism} result={result} /></React.Fragment>;
  })}</>;
};

const LedgerRow: React.FC<{node: CauseEffectPresentationNode; y: number; color: string; progress: number; bad?: boolean}> = ({node, y, color, progress, bad}) => <div style={{position: "absolute", left: 615, top: y, width: 590, height: 92, display: "flex", alignItems: "center", gap: 18, opacity: progress, transform: `translateX(${(1 - progress) * 26}px)`}}><div style={{width: 48, height: 48, display: "grid", placeItems: "center", borderRadius: 13, border: `1px solid ${color}64`, background: `${color}0B`}}><SemanticIcon name={node.icon ?? (bad ? "gauge" : "spark")} size={30} color={color} progress={progress} /></div><div style={{flex: 1}}><div style={{color, fontSize: 13, fontWeight: 850, letterSpacing: 2.5, lineHeight: 1}}>{node.label}</div><div data-primary-text="true" style={{marginTop: 9, color: WHITE, fontSize: 26, fontWeight: 880, lineHeight: 1}}>{node.title}</div></div>{bad ? <XMark progress={progress} /> : null}</div>;

const OutcomeGauge: React.FC<{spec: CauseEffectPresentationSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ledger = [spec.cause, ...spec.mechanisms];
  const panelTop = 470, panelLeft = 565, panelWidth = 690, rowGap = 104;
  const effectIn = enterAt(frame, spec.effect.showAtInFrames, fps);
  const previousBeat = ledger.at(-1)?.showAtInFrames ?? spec.cause.showAtInFrames;
  const transfer = ease(frame, previousBeat + 12, spec.effect.showAtInFrames + 10);
  const gauge = ease(frame, spec.effect.showAtInFrames, spec.effect.showAtInFrames + 32);
  const circumference = 2 * Math.PI * 134;
  const parts = spec.timeRange?.split(/[→—–-]/).map(part => part.trim()).filter(Boolean) ?? [];
  return <><div data-atomic-kind="mechanism-ledger" style={{position: "absolute", left: panelLeft, top: panelTop, width: panelWidth, height: 500, borderRadius: 26, background: "linear-gradient(140deg,rgba(17,25,35,.74),rgba(7,11,17,.58))", backdropFilter: "blur(13px) saturate(1.1)", border: "1px solid rgba(255,255,255,.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.09),0 22px 50px rgba(0,0,0,.25)", opacity: enterAt(frame, spec.cause.showAtInFrames, fps)}}>{[129,233,337].map(y => <div key={y} style={{position: "absolute", left: 50, right: 50, top: y, height: 1, background: "rgba(255,255,255,.08)"}} />)}</div>
    {ledger.map((node, index) => <LedgerRow key={`${node.label}-${index}`} node={node} y={panelTop + 25 + index * rowGap} color={index === 0 ? CYAN : AMBER} progress={enterAt(frame, node.showAtInFrames, fps)} bad={index > 0} />)}
    <div style={{position: "absolute", left: 615, top: 846, width: 590, opacity: enterAt(frame, previousBeat, fps)}}><div style={{display: "flex", justifyContent: "space-between", color: MUTED, fontSize: 15, fontWeight: 700}}><span>{parts[0] ?? "起点"}</span><span>影响持续累积</span><span>{parts.at(-1) ?? "结果"}</span></div><div style={{marginTop: 16, height: 5, borderRadius: 99, background: "rgba(255,255,255,.11)"}}><div style={{width: `${transfer * 100}%`, height: "100%", borderRadius: 99, background: `linear-gradient(90deg,${AMBER},${RED})`, boxShadow: "0 0 15px rgba(255,89,102,.32)"}} /></div></div>
    <svg data-atomic-kind="connector" width="2560" height="1440" style={{position: "absolute", inset: 0}}><path d="M1255 718H1435" fill="none" stroke="rgba(255,255,255,.11)" strokeWidth="4" strokeDasharray="5 13" /><path d="M1255 718H1435" pathLength="1" fill="none" stroke={RED} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${transfer} 1`} opacity={transfer} /></svg>
    <div data-atomic-kind="result-gauge" style={{position: "absolute", left: 1435, top: 500, width: 430, height: 436, borderRadius: 38, background: "radial-gradient(circle at 50% 40%,rgba(255,89,102,.10),transparent 48%),linear-gradient(145deg,rgba(29,15,21,.77),rgba(8,10,15,.61))", backdropFilter: "blur(14px) saturate(1.1)", border: `1px solid ${RED}72`, boxShadow: "inset 0 1px 0 rgba(255,255,255,.10),0 24px 52px rgba(0,0,0,.28),0 0 34px rgba(255,89,102,.10)", opacity: effectIn, transform: `translateX(${(1 - effectIn) * 32}px) scale(${.95 + effectIn * .05})`}}><div style={{position: "absolute", left: 81, top: 42, width: 268, height: 174, overflow: "hidden"}}><svg width="268" height="268"><circle cx="134" cy="134" r="134" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="13" strokeDasharray={`${circumference * .51} ${circumference}`} transform="rotate(177 134 134)" /><circle cx="134" cy="134" r="134" fill="none" stroke={RED} strokeWidth="13" strokeLinecap="round" strokeDasharray={`${circumference * .51 * gauge} ${circumference}`} transform="rotate(177 134 134)" /></svg><div style={{position: "absolute", left: 132, top: 132, width: 112, height: 4, transformOrigin: "2px 2px", rotate: `${interpolate(gauge,[0,1],[-76,63],clamp)}deg`, background: `linear-gradient(90deg,${WHITE},${RED})`, borderRadius: 99}} /><div style={{position: "absolute", left: 124, top: 124, width: 20, height: 20, borderRadius: 99, background: WHITE, boxShadow: "0 0 14px rgba(255,255,255,.75)"}} /></div><div style={{position: "absolute", left: 34, right: 34, top: 229, textAlign: "center"}}><div style={{color: RED, fontSize: 14, fontWeight: 850, letterSpacing: 3}}>{spec.effect.label}</div><div data-primary-text="true" style={{marginTop: 15, color: WHITE, fontSize: 34, lineHeight: 1.14, fontWeight: 920}}>{spec.effect.title}</div>{spec.timeRange ? <div data-auxiliary-text="true" style={{marginTop: 18, color: MUTED, fontSize: 16, fontWeight: 650}}>{spec.timeRange}</div> : null}</div></div>
  </>;
};

export const CauseEffectPresentation: React.FC<{presentation: CauseEffectPresentationSpec; width: number; height: number}> = ({presentation, width, height}) => {
  const scale = Math.min(width / 2560, height / 1440);
  return <div style={{position: "absolute", left: (width - 2560 * scale) / 2, top: (height - 1440 * scale) / 2, width: 2560, height: 1440, scale, transformOrigin: "top left"}}>{presentation.visualVariant === "outcomeGauge" ? <OutcomeGauge spec={presentation} /> : <StatusStack spec={presentation} />}</div>;
};
