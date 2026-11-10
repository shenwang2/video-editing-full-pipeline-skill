import React from "react";
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {SemanticIcon} from "../SemanticIcon";
import type {AtomicSceneGraph, ConditionBoundaryPresentation as Presentation, ConditionCriterionPresentation} from "../types";

const WHITE = "#F4F8FF";
const MUTED = "#8795A7";
const CYAN = "#28E1E8";
const LIME = "#D8FF3F";
const RED = "#FF5964";
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const ease = (frame: number, from: number, to: number) => interpolate(frame, [from, to], [0, 1], {...clamp, easing: Easing.bezier(.16, 1, .3, 1)});
const enter = (frame: number, beat: number, fps: number) => Math.min(1, spring({frame: frame - beat, fps, config: {damping: 18, stiffness: 165, mass: .72}}));

export type ConditionBoundarySpec = {inputLabel: string; conditions: ConditionCriterionPresentation[]; passLabel: string; blockedLabel?: string; resultShowAtInFrames: number; visualVariant?: "validationLedger" | "keyRing"};

export const buildConditionBoundary = (input: ConditionBoundarySpec): AtomicSceneGraph => {
  const conditions = input.conditions.slice(0, 3).map((item) => ({...item, label: item.label.trim()}));
  if (conditions.length < 1) throw new Error("ConditionBoundary requires 1..3 grounded conditions");
  return {
    schemaVersion: "1.0",
    structureId: "condition_boundary_gate",
    topology: input.visualVariant === "keyRing" ? "key-ring" : "validation-ledger",
    coordinateSpace: "normalized-zone",
    atoms: [],
    presentation: {kind: "condition-boundary", visualVariant: input.visualVariant ?? "validationLedger", inputLabel: input.inputLabel.trim(), conditions, passLabel: input.passLabel.trim(), blockedLabel: (input.blockedLabel ?? "条件未满足，保持原状态").trim(), resultShowAtInFrames: input.resultShowAtInFrames},
    metadata: {semanticLayer: "informationRelationship", semanticPurpose: "conditionBoundary", sourceComponent: "ConditionGate", visualStyle: `atomic-condition-${input.visualVariant ?? "validationLedger"}`, lockedLayoutAspect: 16 / 9, compositionRules: ["preserve object then criteria then gated-result information direction", "reveal every criterion only on its grounded Spoken Beat", "open the boundary only when every criterion passes", "validation-ledger uses exactly two short connector segments bounded to empty gaps", "key-ring uses zero connector lines and three independent key arrivals", "preserve the approved 2560x1440 internal geometry through uniform fitting"]},
  };
};

const IconCell: React.FC<{name: "file" | "check" | "lock"; color: string; size?: number; progress?: number}> = ({name, color, size = 62, progress = 1}) => <div style={{width: size, height: size, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: size * .28, background: `${color}0E`, border: `1px solid ${color}60`, opacity: progress, transform: `scale(${.9 + progress * .1})`}}><SemanticIcon name={name} color={color} size={size * .58} progress={progress}/></div>;

const ValidationLedger: React.FC<{presentation: Presentation}> = ({presentation}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const panel = enter(frame, Math.max(0, presentation.conditions[0].showAtInFrames - 21), fps);
  const checks = presentation.conditions.map((item) => enter(frame, item.showAtInFrames, fps));
  const finalBeat = Math.max(...presentation.conditions.map((item) => item.showAtInFrames));
  const verified = ease(frame, finalBeat + 13, presentation.resultShowAtInFrames);
  const result = enter(frame, presentation.resultShowAtInFrames, fps);
  const allPassed = presentation.conditions.every((item) => item.passed);
  const resultColor = allPassed ? LIME : RED;
  const gateOpen = allPassed ? ease(frame, presentation.resultShowAtInFrames - 12, presentation.resultShowAtInFrames + 8) : 0;
  return <div data-atomic-topology="validation-ledger" data-connector-count="2" style={{position: "absolute", inset: 0}}>
    <svg data-semantic-connector="validated-gate-result" width="2560" height="1440" style={{position: "absolute", inset: 0}}><path d="M1474 724 H1510" fill="none" stroke={CYAN} strokeWidth="4" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ease(frame, finalBeat + 3, finalBeat + 14)}/><path d="M1550 724 H1592" fill="none" stroke={resultColor} strokeWidth="4" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ease(frame, presentation.resultShowAtInFrames - 3, presentation.resultShowAtInFrames + 10)}/><path d="m1580 715 13 9-13 9" fill="none" stroke={resultColor} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity={result}/></svg>
    <div data-content-sized-surface="condition-validation-ledger" style={{position: "absolute", left: 600, top: 395, width: 874, height: 650, boxSizing: "border-box", padding: "42px 46px", borderRadius: 30, background: "linear-gradient(145deg,rgba(16,25,35,.83),rgba(7,11,17,.62))", backdropFilter: "blur(14px) saturate(1.1)", border: `1px solid ${CYAN}55`, boxShadow: "inset 0 1px 0 rgba(255,255,255,.08),0 24px 60px rgba(0,0,0,.30)", opacity: panel, transform: `translateY(${(1 - panel) * 28}px) scale(${.97 + panel * .03})`}}>
      <div style={{display: "flex", alignItems: "center", gap: 20}}><IconCell name="file" color={CYAN}/><div><div data-card-label="true" style={{fontSize: 14, lineHeight: 1, fontWeight: 880, letterSpacing: 3, color: CYAN}}>待验证对象</div><div data-primary-text="true" style={{marginTop: 12, fontSize: 39, lineHeight: 1, fontWeight: 930, color: WHITE}}>{presentation.inputLabel}</div></div><div style={{marginLeft: "auto", padding: "10px 16px", borderRadius: 999, background: `${CYAN}0D`, border: `1px solid ${CYAN}38`, color: MUTED, fontSize: 17, fontWeight: 760}}>必须全部满足</div></div>
      <div style={{marginTop: 38, display: "grid", gap: 16}}>{presentation.conditions.map((item, index) => {const color = item.passed ? CYAN : RED; return <div key={`${item.label}-${index}`} style={{height: 108, boxSizing: "border-box", padding: "0 24px", display: "flex", alignItems: "center", gap: 20, borderRadius: 20, background: "rgba(7,12,18,.43)", border: `1px solid ${color}${checks[index] > .75 ? "58" : "28"}`, boxShadow: `0 0 ${checks[index] * 24}px ${color}12`, opacity: checks[index], transform: `translateX(${(1 - checks[index]) * -24}px)`}}><div style={{width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 13, background: color, color: "#061014", fontSize: 25, fontWeight: 950}}>{item.passed ? "✓" : "×"}</div><span data-primary-text="true" style={{fontSize: 28, fontWeight: 850, color: WHITE}}>{item.label}</span><span style={{marginLeft: "auto", color, fontSize: 15, fontWeight: 880, letterSpacing: 2}}>{item.passed ? "已通过" : "未通过"}</span></div>;})}</div>
      <div style={{marginTop: 27, height: 62, boxSizing: "border-box", padding: "0 22px", borderRadius: 17, display: "flex", alignItems: "center", background: `${resultColor}0B`, border: `1px solid ${resultColor}46`, opacity: verified, transform: `scaleX(${.94 + verified * .06})`}}><span style={{color: resultColor, fontSize: 20, fontWeight: 900}}>{presentation.conditions.filter((item) => item.passed).length} / {presentation.conditions.length} 条件满足</span><span style={{marginLeft: "auto", color: WHITE, fontSize: 17, fontWeight: 760}}>{allPassed ? "允许进入下一状态" : "保持当前状态"}</span></div>
    </div>
    <div data-atomic-kind="condition-gate" style={{position: "absolute", left: 1508, top: 646, width: 44, height: 156}}><div style={{position: "absolute", left: -gateOpen * 9, top: -gateOpen * 28, width: 20, height: 76, borderRadius: "12px 5px 5px 12px", background: `${CYAN}18`, border: `2px solid ${CYAN}`}}/><div style={{position: "absolute", left: 24 + gateOpen * 9, bottom: -gateOpen * 28, width: 20, height: 76, borderRadius: "5px 12px 12px 5px", background: `${resultColor}18`, border: `2px solid ${resultColor}`}}/></div>
    <div data-content-sized-surface="condition-result" style={{position: "absolute", left: 1592, top: 586, width: 400, height: 276, boxSizing: "border-box", padding: "34px 36px", borderRadius: 28, background: "linear-gradient(145deg,rgba(20,35,31,.84),rgba(7,13,15,.64))", border: `1px solid ${resultColor}72`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.08),0 22px 52px rgba(0,0,0,.30),0 0 ${result * 34}px ${resultColor}16`, opacity: result, transform: `translateX(${(1 - result) * 24}px) scale(${.95 + result * .05})`}}><IconCell name={allPassed ? "check" : "lock"} color={resultColor}/><div data-card-label="true" style={{marginTop: 27, fontSize: 14, lineHeight: 1, fontWeight: 880, letterSpacing: 3, color: resultColor}}>{allPassed ? "条件成立" : "条件拦截"}</div><div data-primary-text="true" style={{marginTop: 14, fontSize: 38, lineHeight: 1, fontWeight: 940, color: WHITE}}>{allPassed ? presentation.passLabel : presentation.blockedLabel}</div></div>
  </div>;
};

const KeyRing: React.FC<{presentation: Presentation}> = ({presentation}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const firstBeat = presentation.conditions[0].showAtInFrames;
  const input = enter(frame, Math.max(0, firstBeat - 21), fps);
  const keys = presentation.conditions.map((item) => enter(frame, item.showAtInFrames, fps));
  const arrivals = presentation.conditions.map((item) => ease(frame, item.showAtInFrames + 8, item.showAtInFrames + 28));
  const allPassed = presentation.conditions.every((item) => item.passed);
  const resultColor = allPassed ? LIME : RED;
  const unlock = enter(frame, presentation.resultShowAtInFrames - 4, fps);
  const open = allPassed ? ease(frame, presentation.resultShowAtInFrames - 4, presentation.resultShowAtInFrames + 18) : 0;
  const result = enter(frame, presentation.resultShowAtInFrames + 14, fps);
  return <div data-atomic-topology="key-ring" data-connector-count="0" style={{position: "absolute", inset: 0}}>
    <div data-content-sized-surface="condition-input" style={{position: "absolute", left: 610, top: 266, width: 1340, height: 112, boxSizing: "border-box", padding: "0 28px", display: "flex", alignItems: "center", borderRadius: 24, background: "rgba(10,16,23,.64)", border: `1px solid ${CYAN}42`, opacity: input, transform: `translateY(${(1 - input) * -20}px)`}}><IconCell name="file" color={CYAN} size={66}/><div style={{marginLeft: 20}}><div data-card-label="true" style={{fontSize: 13, fontWeight: 880, letterSpacing: 3, color: CYAN}}>申请对象</div><div data-primary-text="true" style={{marginTop: 10, fontSize: 31, fontWeight: 920, lineHeight: 1, color: WHITE}}>{presentation.inputLabel}</div></div><div style={{marginLeft: "auto", color: MUTED, fontSize: 17, fontWeight: 760}}>{presentation.conditions.length} 把条件钥匙缺一不可</div></div>
    <div style={{position: "absolute", left: 610, top: 452, width: 670, display: "grid", gap: 28}}>{presentation.conditions.map((item, index) => {const color = item.passed ? CYAN : RED; return <div key={`${item.label}-${index}`} style={{height: 142, boxSizing: "border-box", padding: "0 26px", display: "flex", alignItems: "center", gap: 20, borderRadius: 24, background: "linear-gradient(135deg,rgba(17,27,38,.80),rgba(7,11,17,.56))", border: `1px solid ${color}${keys[index] > .75 ? "5C" : "2C"}`, opacity: keys[index], transform: `translateX(${(1 - keys[index]) * -28}px)`}}><IconCell name="lock" color={color}/><div><div style={{fontSize: 13, fontWeight: 880, letterSpacing: 2.5, color: MUTED}}>条件 {index + 1}</div><div data-primary-text="true" style={{marginTop: 12, fontSize: 28, fontWeight: 880, color: WHITE}}>{item.label}</div></div><div style={{marginLeft: "auto", width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 14, background: `${color}18`, border: `1px solid ${color}60`, color, fontSize: 25, fontWeight: 950, opacity: arrivals[index]}}>{item.passed ? "✓" : "×"}</div></div>;})}</div>
    {presentation.conditions.map((item, index) => {const y = 523 + index * 170; const travel = arrivals[index]; const color = item.passed ? CYAN : RED; return <div key={`key-${item.label}-${index}`} data-atomic-kind="condition-key" style={{position: "absolute", left: 1266 + travel * 236, top: y, width: 54, height: 42, display: "grid", placeItems: "center", borderRadius: 16, background: color, boxShadow: `0 0 ${16 + travel * 14}px ${color}38`, opacity: keys[index] * (1 - ease(frame, item.showAtInFrames + 27, item.showAtInFrames + 34))}}><svg width="32" height="32" viewBox="0 0 36 36"><circle cx="12" cy="18" r="6" fill="none" stroke="#061014" strokeWidth="2.4"/><path d="M18 18h12M25 18v4M29 18v3" fill="none" stroke="#061014" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg></div>;})}
    <div data-atomic-kind="condition-lock" style={{position: "absolute", left: 1410, top: 446, width: 540, height: 572, borderRadius: 44, background: "radial-gradient(circle at 50% 42%,rgba(40,225,232,.11),transparent 47%),linear-gradient(145deg,rgba(15,24,34,.82),rgba(7,11,17,.60))", border: `1px solid ${CYAN}50`, boxShadow: "inset 0 1px 0 rgba(255,255,255,.07),0 24px 58px rgba(0,0,0,.30)"}}>
      <div style={{position: "absolute", left: 34, top: 30, fontSize: 14, fontWeight: 880, letterSpacing: 3, color: CYAN}}>条件锁</div>
      <svg width="540" height="420" style={{position: "absolute", left: 0, top: 64}}><circle cx="270" cy="204" r="142" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="22"/><circle cx="270" cy="204" r="142" fill="none" stroke={allPassed ? CYAN : RED} strokeWidth="22" strokeLinecap="round" pathLength={presentation.conditions.length} strokeDasharray={presentation.conditions.map((_, index) => `${arrivals[index]} ${1 - arrivals[index]}`).join(" ")} transform="rotate(-90 270 204)"/></svg>
      <div style={{position: "absolute", left: 210, top: 206, width: 120, height: 120, display: "grid", placeItems: "center", borderRadius: 34, background: `${open > .4 ? LIME : resultColor}12`, border: `1px solid ${open > .4 ? LIME : resultColor}58`, transform: `scale(${.94 + unlock * .06})`}}><SemanticIcon name={open > .45 ? "check" : "lock"} color={open > .45 ? LIME : resultColor} size={66} progress={1}/></div>
      <div data-content-sized-surface="condition-result" style={{position: "absolute", left: 64, right: 64, bottom: 35, height: 94, boxSizing: "border-box", padding: "0 25px", display: "flex", alignItems: "center", borderRadius: 22, background: `${resultColor}0D`, border: `1px solid ${resultColor}4C`, opacity: result, transform: `translateY(${(1 - result) * 18}px)`}}><SemanticIcon name={allPassed ? "check" : "lock"} color={resultColor} size={38} progress={1}/><div style={{marginLeft: 17}}><div data-card-label="true" style={{fontSize: 13, fontWeight: 880, letterSpacing: 2.5, color: resultColor}}>{allPassed ? "全部解锁" : "条件拦截"}</div><div data-primary-text="true" style={{marginTop: 9, fontSize: 29, fontWeight: 930, lineHeight: 1, color: WHITE}}>{allPassed ? presentation.passLabel : presentation.blockedLabel}</div></div></div>
    </div>
  </div>;
};

export const ConditionBoundaryPresentation: React.FC<{presentation: Presentation; width: number; height: number}> = ({presentation, width, height}) => <div style={{position: "absolute", left: 0, top: 0, width: 2560, height: 1440, transformOrigin: "top left", transform: `scale(${Math.min(width / 2560, height / 1440)})`}}>{presentation.visualVariant === "keyRing" ? <KeyRing presentation={presentation}/> : <ValidationLedger presentation={presentation}/>}</div>;
