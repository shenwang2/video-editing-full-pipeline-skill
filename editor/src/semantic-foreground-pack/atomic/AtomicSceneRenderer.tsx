import React from "react";
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {fitAspectIntoRect, getForegroundZone, getMasterAlignmentTokens, getPlacementHorizontalAlignment} from "../lib/layout";
import {EASING} from "../lib/motion-tokens";
import {AtomicActionCue} from "./AtomicActionCue";
import {SemanticIcon} from "./SemanticIcon";
import {ComparisonPresentation} from "./structures/ComparisonJudgment";
import {StateTransferPresentation} from "./structures/StateTransfer";
import {ChronologyPresentation} from "./structures/ChronologyTimeline";
import {CauseEffectPresentation} from "./structures/CauseEffectRelationship";
import {HierarchyPresentation} from "./structures/HierarchyGrouping";
import {ProblemSolutionPresentation} from "./structures/ProblemSolutionResolution";
import {ConditionBoundaryPresentation} from "./structures/ConditionBoundary";
import type {AtomicPhaseOpacity, AtomicSceneAtom, AtomicSceneRendererProps, AtomicStateTimeline, NormalizedRect} from "./types";

const FONT_FAMILY = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const phaseFor = (frame: number, timeline: AtomicStateTimeline) => timeline.completeAtInFrames !== undefined && frame >= timeline.completeAtInFrames ? "complete" as const : frame >= (timeline.activeAtInFrames ?? timeline.revealAtInFrames) ? "active" as const : "future" as const;
const toPixels = (rect: NormalizedRect, width: number, height: number) => ({x: rect.x * width, y: rect.y * height, width: rect.width * width, height: rect.height * height});
const atomEnter = (frame: number, revealAt: number, fps: number) => Math.min(1, spring({frame: Math.max(0, frame - revealAt), fps, config: {damping: 19, stiffness: 150, mass: 0.78}}));
const opacityForPhase = (phase: "future" | "active" | "complete", opacity: AtomicPhaseOpacity | undefined) => opacity?.[phase] ?? 1;

export const AtomicSceneRenderer: React.FC<AtomicSceneRendererProps> = ({graph, placement = "leftMiddle", zoneOverride, accentColor = "#24E5EE", completeColor, exitAtInFrames, exitInFrames = 14}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const resolvedCompleteColor = completeColor ?? accentColor;
  const referenceV3 = graph.metadata.visualStyle === "reference-v3-editorial";
  const referenceSignals = graph.metadata.visualStyle === "reference-cumulative-signals";
  const referenceSequence = referenceV3 || referenceSignals;
  const referenceSideZone = {
    x: placement.startsWith("right") ? width * (1 - 0.039 - 0.235) : getMasterAlignmentTokens({width, height}).sectionTitleLeft - width * 0.235 * 0.01,
    y: height * 0.18,
    width: width * 0.235,
    height: height * 0.38,
  };
  const hostZone = zoneOverride ?? (referenceSequence && (placement.startsWith("left") || placement.startsWith("right")) ? referenceSideZone : getForegroundZone({width, height, placement}));
  const zone = graph.metadata.lockedLayoutAspect
    ? fitAspectIntoRect({rect: hostZone, aspect: graph.metadata.lockedLayoutAspect, horizontalAlign: getPlacementHorizontalAlignment(placement)})
    : hostZone;
  const exit = exitAtInFrames === undefined ? 0 : interpolate(frame, [exitAtInFrames, exitAtInFrames + exitInFrames], [0, 1], {easing: EASING.exit, ...clamp});
  const sorted = [...graph.atoms].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  if (graph.presentation) {
    return <AbsoluteFill data-foreground-overlay-root="true" data-atomic-structure={graph.structureId} data-atomic-visual-style={graph.metadata.visualStyle} style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT_FAMILY}}><div style={{position: "absolute", left: zone.x, top: zone.y, width: zone.width, height: zone.height, opacity: 1 - exit, translate: `0 ${exit * 22}px`}}>{graph.presentation.kind === "transformation-state-transfer" ? <StateTransferPresentation presentation={graph.presentation} width={zone.width} height={zone.height} /> : graph.presentation.kind === "chronology-track" ? <ChronologyPresentation presentation={graph.presentation} width={zone.width} height={zone.height} /> : graph.presentation.kind === "cause-effect-chain" ? <CauseEffectPresentation presentation={graph.presentation} width={zone.width} height={zone.height} /> : graph.presentation.kind === "hierarchy-grouping" ? <HierarchyPresentation presentation={graph.presentation} width={zone.width} height={zone.height} /> : graph.presentation.kind === "problem-solution-resolution" ? <ProblemSolutionPresentation presentation={graph.presentation} width={zone.width} height={zone.height} /> : graph.presentation.kind === "condition-boundary" ? <ConditionBoundaryPresentation presentation={graph.presentation} width={zone.width} height={zone.height} /> : <ComparisonPresentation presentation={graph.presentation} width={zone.width} height={zone.height} />}</div></AbsoluteFill>;
  }

  const renderAtom = (atom: AtomicSceneAtom) => {
    const enter = atomEnter(frame, atom.revealAtInFrames, fps);
    if (enter <= 0.001) return null;
    const remain = atom.hideAtInFrames === undefined ? 1 : interpolate(frame, [atom.hideAtInFrames - 6, atom.hideAtInFrames], [1, 0], clamp);
    const visibility = enter * remain;

    if (atom.kind === "connector") {
      const from = {x: atom.from.x * zone.width, y: atom.from.y * zone.height};
      const to = {x: atom.to.x * zone.width, y: atom.to.y * zone.height};
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      if (atom.appearance === "straight-rail") {
        const color = atom.color ?? accentColor;
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const arrowSize = Math.max(11, zone.width * 0.014);
        const back = {x: to.x - Math.cos(angle) * arrowSize, y: to.y - Math.sin(angle) * arrowSize};
        const normal = {x: -Math.sin(angle) * arrowSize * 0.58, y: Math.cos(angle) * arrowSize * 0.58};
        const arrowPoints = `${back.x + normal.x},${back.y + normal.y} ${to.x},${to.y} ${back.x - normal.x},${back.y - normal.y}`;
        return <svg key={atom.id} width={zone.width} height={zone.height} style={{position: "absolute", inset: 0, overflow: "visible", opacity: visibility}}><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="rgba(255,255,255,.10)" strokeWidth={Math.max(2, zone.width * 0.0015)} /><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth={Math.max(3, zone.width * 0.0032)} strokeLinecap="round" strokeDasharray={length * 1.2} strokeDashoffset={length * 1.2 * (1 - enter)} style={{filter: `drop-shadow(0 0 ${zone.width * 0.008}px ${color}66)`}} />{atom.showArrow ? <polyline points={arrowPoints} fill="none" stroke={color} strokeWidth={Math.max(3, zone.width * 0.003)} strokeLinecap="round" strokeLinejoin="round" opacity={enter} /> : null}</svg>;
      }
      return <svg key={atom.id} width={zone.width} height={zone.height} style={{position: "absolute", inset: 0, overflow: "visible"}}><path d={`M ${from.x} ${from.y} C ${from.x} ${from.y + (to.y - from.y) * 0.48}, ${to.x} ${from.y + (to.y - from.y) * 0.52}, ${to.x} ${to.y}`} fill="none" stroke={atom.color ?? accentColor} strokeWidth={Math.max(3, zone.width * 0.0045)} strokeLinecap="round" strokeDasharray={length * 1.25} strokeDashoffset={length * 1.25 * (1 - enter)} opacity={0.82} style={{filter: `drop-shadow(0 0 ${zone.width * 0.009}px ${atom.color ?? accentColor}88)`}} /></svg>;
    }

    if (atom.kind === "carrier") {
      let point = atom.start;
      let lift = 0;
      for (const segment of atom.segments) {
        if (frame < segment.departAtInFrames) break;
        const travel = interpolate(frame, [segment.departAtInFrames, segment.arriveAtInFrames], [0, 1], {easing: EASING.editorial, ...clamp});
        point = {x: interpolate(travel, [0, 1], [point.x, segment.to.x]), y: interpolate(travel, [0, 1], [point.y, segment.to.y])};
        lift = Math.sin(travel * Math.PI) * zone.height * 0.035;
        if (travel < 1) break;
        point = segment.to;
        lift = 0;
      }
      const carrierWidth = atom.size.width * zone.width;
      const carrierHeight = atom.size.height * zone.height;
      const color = atom.color ?? accentColor;
      if (atom.appearance === "flow-chip") {
        return <div key={atom.id} data-atomic-kind="carrier" data-atomic-appearance="flow-chip" style={{position: "absolute", left: point.x * zone.width - carrierWidth / 2, top: point.y * zone.height - carrierHeight / 2 - lift, width: carrierWidth, height: carrierHeight, display: "flex", alignItems: "center", justifyContent: "center", gap: carrierHeight * 0.15, borderRadius: carrierHeight * 0.28, background: "rgba(7,13,22,.90)", border: `1px solid ${color}A8`, color: "#FFFDF7", fontSize: Math.min(carrierHeight * 0.42, zone.width * 0.025), lineHeight: 1, fontWeight: 850, boxShadow: `0 ${carrierHeight * 0.22}px ${carrierHeight * 0.52}px rgba(0,0,0,.32), 0 0 ${carrierHeight * 0.44}px ${color}2E`, opacity: visibility, scale: 0.94 + enter * 0.06 + lift / Math.max(1, zone.height), zIndex: atom.zIndex ?? 8}}>{atom.icon ? <SemanticIcon name={atom.icon} size={carrierHeight * 0.36} color={color} progress={enter} /> : <span style={{width: carrierHeight * 0.13, height: carrierHeight * 0.13, borderRadius: 999, background: color, boxShadow: `0 0 ${carrierHeight * 0.22}px ${color}`}} />}<span style={{whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{atom.label}</span></div>;
      }
      return <div key={atom.id} data-atomic-kind="carrier" style={{position: "absolute", left: point.x * zone.width - carrierWidth / 2, top: point.y * zone.height - carrierHeight / 2 - lift, width: carrierWidth, height: carrierHeight, display: "flex", alignItems: "center", justifyContent: "center", gap: carrierHeight * 0.12, borderRadius: carrierHeight * 0.32, background: color, color: "#05070A", fontSize: Math.min(carrierHeight * 0.34, zone.width * 0.031), lineHeight: 1, fontWeight: 950, boxShadow: `0 ${carrierHeight * 0.28}px ${carrierHeight * 0.55}px rgba(0,0,0,.38), 0 0 ${carrierHeight * 0.48}px ${color}70`, opacity: enter, transform: `scale(${0.82 + enter * 0.18 + lift / Math.max(1, zone.height)})`, zIndex: atom.zIndex ?? 8}}>{atom.icon ? <SemanticIcon name={atom.icon} size={carrierHeight * 0.42} color="#05070A" progress={enter} /> : null}<span style={{whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{atom.label}</span></div>;
    }

    const px = toPixels(atom.bounds, zone.width, zone.height);
    if (atom.kind === "action-cue") {
      const phase = phaseFor(frame, atom.timeline);
      if (phase !== "active") return null;
      const activation = atomEnter(frame, atom.timeline.activeAtInFrames ?? atom.timeline.revealAtInFrames, fps);
      return <div key={atom.id} data-atomic-kind="action-cue" style={{position: "absolute", left: px.x, top: px.y, width: px.width, height: px.height, opacity: activation, translate: `${(1 - activation) * 18}px 0`, zIndex: atom.zIndex ?? 6}}><AtomicActionCue cue={atom.cue} progress={activation} color={atom.color ?? accentColor} label={atom.label} width={px.width} height={px.height} /></div>;
    }

    if (atom.kind === "node") {
      const phase = phaseFor(frame, atom.timeline);
      const active = phase === "active";
      const complete = phase === "complete";
      const color = complete ? atom.completeColor ?? resolvedCompleteColor : atom.accentColor ?? accentColor;
      const nodeLeft = atom.enterFrom ? interpolate(enter, [0, 1], [atom.enterFrom.x * zone.width, px.x], clamp) : px.x;
      const nodeTop = atom.enterFrom ? interpolate(enter, [0, 1], [atom.enterFrom.y * zone.height, px.y], clamp) : px.y;
      if (atom.appearance === "collection-boundary") {
        return <div key={atom.id} data-atomic-kind="node" data-atomic-appearance="collection-boundary" style={{position: "absolute", left: px.x, top: px.y, width: px.width, height: px.height, borderRadius: Math.max(18, px.height * 0.08), border: `1px solid ${color}62`, background: `${color}08`, boxShadow: `inset 0 0 ${Math.max(24, px.height * 0.12)}px ${color}10, 0 0 ${Math.max(20, px.height * 0.08)}px ${color}18`, opacity: visibility, scale: 0.975 + enter * 0.025, zIndex: atom.zIndex ?? 0}}><div style={{position: "absolute", left: 0, top: 0, width: Math.max(22, px.width * 0.055), height: Math.max(22, px.height * 0.12), borderLeft: `3px solid ${color}`, borderTop: `3px solid ${color}`, borderRadius: `${Math.max(12, px.height * 0.05)}px 0 0 0`}} /><div style={{position: "absolute", right: 0, bottom: 0, width: Math.max(22, px.width * 0.055), height: Math.max(22, px.height * 0.12), borderRight: `3px solid ${color}`, borderBottom: `3px solid ${color}`, borderRadius: `0 0 ${Math.max(12, px.height * 0.05)}px 0`}} /></div>;
      }
      if (atom.appearance === "collection-tile" || atom.appearance === "collection-capsule") {
        const capsule = atom.appearance === "collection-capsule";
        const phaseOpacity = opacityForPhase(phase, atom.phaseOpacity);
        return <div key={atom.id} data-atomic-kind="node" data-atomic-node-id={atom.id} data-atomic-appearance={atom.appearance} style={{position: "absolute", left: nodeLeft, top: nodeTop, width: px.width, height: px.height, borderRadius: capsule ? 999 : Math.max(14, px.height * 0.18), background: "linear-gradient(145deg, rgba(10,13,19,.56), rgba(23,27,35,.28))", backdropFilter: `blur(${Math.max(10, px.height * 0.13)}px) saturate(1.14)`, border: `1px solid ${active ? `${color}B8` : complete ? `${color}62` : "rgba(255,255,255,.15)"}`, boxShadow: active ? `inset 0 1px 0 rgba(255,255,255,.12), 0 ${Math.max(10, px.height * 0.16)}px ${Math.max(24, px.height * 0.38)}px rgba(0,0,0,.25), 0 0 ${Math.max(18, px.height * 0.28)}px ${color}27` : "inset 0 1px 0 rgba(255,255,255,.08), 0 10px 26px rgba(0,0,0,.20)", opacity: visibility * phaseOpacity, scale: 0.9 + enter * 0.1 + (active ? 0.012 : 0), zIndex: atom.zIndex ?? 1}} />;
      }
      if (atom.appearance === "editorial-active-band") {
        if (!active) return null;
        const activation = atomEnter(frame, atom.timeline.activeAtInFrames ?? atom.timeline.revealAtInFrames, fps);
        return <div key={atom.id} data-atomic-kind="node" data-atomic-appearance="editorial-active-band" style={{position: "absolute", left: px.x, top: px.y, width: px.width * activation, height: px.height, borderRadius: Math.max(6, px.height * 0.11), background: "rgba(5,11,18,.70)", border: `1px solid ${color}56`, boxShadow: "0 9px 24px rgba(0,0,0,.18)", overflow: "hidden", opacity: opacityForPhase(phase, atom.phaseOpacity), zIndex: atom.zIndex ?? 1}}><div style={{position: "absolute", inset: 0, opacity: 0.52, background: `linear-gradient(90deg, ${color}17, transparent 54%)`}} /></div>;
      }
      if (atom.appearance === "signal-row") {
        const phaseOpacity = opacityForPhase(phase, atom.phaseOpacity);
        const activation = atomEnter(frame, atom.timeline.activeAtInFrames ?? atom.timeline.revealAtInFrames, fps);
        return <div key={atom.id} data-atomic-kind="node" data-atomic-appearance="signal-row" style={{position: "absolute", left: px.x, top: px.y, width: px.width, height: px.height, borderRadius: Math.max(4, px.height * 0.09), background: active ? "rgba(5,11,18,.76)" : "rgba(5,11,18,.48)", border: `1px solid ${active ? `${color}70` : "rgba(255,255,255,.12)"}`, boxShadow: active ? `0 7px 18px rgba(0,0,0,.2), inset 3px 0 0 ${color}` : "0 5px 15px rgba(0,0,0,.12)", opacity: enter * phaseOpacity, translate: `${(1 - activation) * -12}px 0`, zIndex: atom.zIndex ?? 1}} />;
      }
      return <div key={atom.id} data-atomic-kind="node" data-atomic-node-id={atom.id} style={{position: "absolute", left: px.x, top: px.y, width: px.width, height: px.height, borderRadius: Math.max(14, px.height * 0.21), background: "linear-gradient(135deg, rgba(10,14,25,.88), rgba(12,20,34,.72))", border: `1px solid ${color}${active ? "E8" : complete ? "72" : "36"}`, boxShadow: active ? `0 0 0 ${Math.max(2, px.height * 0.025)}px ${color}24, 0 14px 34px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.14)` : "0 10px 28px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.09)", opacity: enter * (complete ? 0.72 : 1), transform: `translateY(${(1 - enter) * 20}px) scale(${0.96 + enter * 0.04 + (active ? 0.012 : 0)})`, transformOrigin: "left center"}} />;
    }

    if (atom.kind === "text") {
      const phase = atom.timeline ? phaseFor(frame, atom.timeline) : "active";
      const activation = atom.timeline ? atomEnter(frame, atom.timeline.activeAtInFrames ?? atom.timeline.revealAtInFrames, fps) : enter;
      const editorialLabel = atom.appearance === "editorial-label";
      const editorialMeta = atom.appearance === "editorial-meta";
      const signalLabel = atom.appearance === "signal-label";
      const signalMeta = atom.appearance === "signal-meta";
      const flowTitle = atom.appearance === "flow-title";
      const flowMeta = atom.appearance === "flow-meta";
      const flowDirection = atom.appearance === "flow-direction";
      const flowStatus = atom.appearance === "flow-status";
      const collectionLabel = atom.appearance === "collection-label";
      const collectionMeta = atom.appearance === "collection-meta";
      const collectionGroup = atom.appearance === "collection-group";
      const defaultFontSize = atom.role === "result" ? Math.min(px.height * 0.72, zone.width * 0.035) : atom.role === "detail" ? Math.min(px.height * 0.74, zone.width * 0.027) : Math.min(px.height * 0.8, zone.width * 0.043);
      const fontSize = collectionGroup ? Math.min(px.height * 0.9, zone.width * 0.04) : collectionLabel ? Math.min(px.height * 0.9, zone.width * 0.031) : collectionMeta ? Math.min(px.height * 0.88, zone.width * 0.016) : flowTitle ? Math.min(px.height * 0.92, zone.width * 0.046) : flowMeta || flowDirection ? Math.min(px.height * 0.9, zone.width * 0.018) : flowStatus ? Math.min(px.height * 0.84, zone.width * 0.021) : signalLabel ? Math.min(px.height * (phase === "active" ? 0.96 : 0.88), zone.width * (phase === "active" ? 0.058 : 0.052)) : signalMeta ? Math.min(px.height * 0.95, zone.width * 0.022) : editorialLabel ? Math.min(px.height * (phase === "active" ? 0.96 : 0.82), zone.width * (phase === "active" ? 0.064 : 0.054)) : editorialMeta ? Math.min(px.height * 0.96, zone.width * 0.023) : defaultFontSize;
      const phaseOpacity = opacityForPhase(phase, atom.phaseOpacity);
      const activeEnter = phase === "active" ? activation : 1;
      const centered = flowTitle || flowMeta || flowDirection || collectionGroup;
      const textLeft = atom.enterFrom ? interpolate(enter, [0, 1], [atom.enterFrom.x * zone.width, px.x], clamp) : px.x;
      const textTop = atom.enterFrom ? interpolate(enter, [0, 1], [atom.enterFrom.y * zone.height, px.y], clamp) : px.y;
      return <div key={atom.id} data-atomic-kind="text" data-atomic-appearance={atom.appearance ?? "default"} style={{position: "absolute", left: textLeft, top: textTop, width: px.width, height: px.height, display: "flex", alignItems: "center", justifyContent: centered ? "center" : "flex-start", color: atom.color ?? (editorialMeta || signalMeta || flowMeta || collectionMeta || atom.role === "detail" ? "rgba(231,241,255,.62)" : "#F7FAFF"), fontSize, lineHeight: 1, fontWeight: editorialMeta || signalMeta || flowMeta || flowDirection || flowStatus || collectionMeta ? 820 : atom.role === "label" || atom.role === "result" ? 860 : 720, letterSpacing: editorialMeta || signalMeta || flowMeta || flowDirection || collectionMeta ? ".14em" : "-.012em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: centered ? "center" : "left", opacity: visibility * phaseOpacity * activeEnter, translate: centered ? `0 ${(1 - activeEnter) * 10}px` : `${(1 - activeEnter) * 12}px 0`, zIndex: atom.zIndex ?? 4}}><span style={{overflow: "hidden", textOverflow: "ellipsis"}}>{atom.text}</span></div>;
    }

    if (atom.kind === "icon") {
      const phase = phaseFor(frame, atom.timeline);
      const active = phase === "active";
      const color = phase === "complete" ? atom.completeColor ?? resolvedCompleteColor : atom.color ?? accentColor;
      const size = Math.min(px.width, px.height);
      const iconLeft = atom.enterFrom ? interpolate(enter, [0, 1], [atom.enterFrom.x * zone.width, px.x], clamp) : px.x;
      const iconTop = atom.enterFrom ? interpolate(enter, [0, 1], [atom.enterFrom.y * zone.height, px.y], clamp) : px.y;
      if (atom.appearance === "editorial-circle") {
        const activation = atomEnter(frame, atom.timeline.activeAtInFrames ?? atom.timeline.revealAtInFrames, fps);
        const phaseOpacity = opacityForPhase(phase, atom.phaseOpacity);
        const icon = atom.replaceWithCheckWhenComplete && phase === "complete" ? "check" : atom.icon;
        return <div key={atom.id} data-atomic-kind="icon" data-atomic-appearance="editorial-circle" style={{position: "absolute", left: px.x, top: px.y, width: px.width, height: px.height, display: "grid", placeItems: "center", borderRadius: 999, background: phase === "active" ? `${color}21` : "rgba(5,11,18,.55)", border: `1px solid ${phase === "future" ? "rgba(255,255,255,.18)" : `${color}8A`}`, boxShadow: phase === "active" ? `0 0 ${size * 0.4}px ${color}3A` : "none", opacity: enter * phaseOpacity * (phase === "active" ? activation : 1), scale: phase === "active" ? 0.88 + activation * 0.12 : 1, zIndex: atom.zIndex ?? 4}}><SemanticIcon name={icon} size={size * 0.67} color={phase === "future" ? "rgba(255,255,255,.46)" : color} progress={1} /></div>;
      }
      if (atom.appearance === "signal-square") {
        const activation = atomEnter(frame, atom.timeline.activeAtInFrames ?? atom.timeline.revealAtInFrames, fps);
        const phaseOpacity = opacityForPhase(phase, atom.phaseOpacity);
        return <div key={atom.id} data-atomic-kind="icon" data-atomic-appearance="signal-square" style={{position: "absolute", left: px.x, top: px.y, width: px.width, height: px.height, display: "grid", placeItems: "center", borderRadius: Math.max(3, size * 0.18), background: active ? `${color}1E` : "rgba(5,11,18,.38)", border: `1px solid ${active ? `${color}88` : `${color}42`}`, boxShadow: active ? `0 0 ${size * 0.35}px ${color}30` : "none", opacity: enter * phaseOpacity, scale: 0.86 + activation * 0.14, zIndex: atom.zIndex ?? 4}}><SemanticIcon name={atom.icon} size={size * 0.62} color={color} progress={1} /></div>;
      }
      if (atom.appearance === "flow-port-icon") {
        const activation = atomEnter(frame, atom.timeline.activeAtInFrames ?? atom.timeline.revealAtInFrames, fps);
        const phaseOpacity = opacityForPhase(phase, atom.phaseOpacity);
        const icon = atom.replaceWithCheckWhenComplete && phase === "complete" ? "check" : atom.icon;
        return <div key={atom.id} data-atomic-kind="icon" data-atomic-appearance="flow-port-icon" style={{position: "absolute", left: px.x, top: px.y, width: px.width, height: px.height, display: "grid", placeItems: "center", borderRadius: Math.max(10, size * 0.24), background: active ? `${color}16` : "rgba(7,12,20,.56)", border: `1px solid ${active ? `${color}B8` : "rgba(255,255,255,.16)"}`, boxShadow: active ? `0 0 ${size * 0.36}px ${color}32, inset 0 0 ${size * 0.2}px ${color}12` : "none", opacity: visibility * phaseOpacity, scale: phase === "active" ? 0.92 + activation * 0.08 : 0.94, zIndex: atom.zIndex ?? 4}}><SemanticIcon name={icon} size={size * 0.56} color={phase === "future" ? "rgba(255,255,255,.40)" : color} progress={enter} /></div>;
      }
      if (atom.appearance === "collection-badge") {
        const activation = atomEnter(frame, atom.timeline.activeAtInFrames ?? atom.timeline.revealAtInFrames, fps);
        const phaseOpacity = opacityForPhase(phase, atom.phaseOpacity);
        return <div key={atom.id} data-atomic-kind="icon" data-atomic-appearance="collection-badge" style={{position: "absolute", left: iconLeft, top: iconTop, width: px.width, height: px.height, display: "grid", placeItems: "center", borderRadius: Math.max(10, size * 0.25), background: active ? `${color}24` : `${color}12`, border: `1px solid ${active ? `${color}98` : `${color}48`}`, boxShadow: active ? `0 0 ${size * 0.38}px ${color}32` : "none", opacity: visibility * phaseOpacity, scale: 0.88 + activation * 0.12, zIndex: atom.zIndex ?? 4}}><SemanticIcon name={atom.icon} size={size * 0.58} color={color} progress={enter} /></div>;
      }
      return <div key={atom.id} data-atomic-kind="icon" style={{position: "absolute", left: px.x, top: px.y, width: px.width, height: px.height, display: "grid", placeItems: "center", borderRadius: Math.max(10, size * 0.28), background: `${color}19`, boxShadow: phase === "active" ? `0 0 ${size * 0.48}px ${color}38` : undefined, opacity: enter, transform: `scale(${0.72 + enter * 0.28}) rotate(${(1 - enter) * -7}deg)`}}><SemanticIcon name={atom.icon} size={size * 0.58} color={color} progress={enter} /></div>;
    }

    if (atom.kind === "progress") {
      const fill = interpolate(frame, [atom.revealAtInFrames, atom.completeAtInFrames], [0.08, 1], clamp);
      return <div key={atom.id} data-atomic-kind="progress" style={{position: "absolute", left: px.x, top: px.y, width: px.width, height: px.height, borderRadius: 99, background: "rgba(255,255,255,.08)", overflow: "hidden", opacity: enter}}><div style={{width: `${fill * 100}%`, height: "100%", borderRadius: 99, background: atom.color ?? accentColor, boxShadow: `0 0 ${Math.max(8, px.height * 2)}px ${atom.color ?? accentColor}`}} /></div>;
    }

    const color = atom.color ?? resolvedCompleteColor;
    return <div key={atom.id} data-atomic-kind="status" style={{position: "absolute", left: px.x, top: px.y, width: px.width, height: px.height, display: "grid", placeItems: "center", borderRadius: 999, background: `${color}20`, border: `1px solid ${color}99`, boxShadow: `0 0 ${Math.max(8, px.width * 0.3)}px ${color}30`, opacity: enter, transform: `scale(${0.66 + enter * 0.34})`}}><SemanticIcon name={atom.status === "result" ? "spark" : "check"} size={Math.min(px.width, px.height) * 0.58} color={color} progress={enter} /></div>;
  };

  return <AbsoluteFill data-foreground-overlay-root="true" data-atomic-structure={graph.structureId} data-atomic-visual-style={graph.metadata.visualStyle} style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT_FAMILY}}><div style={{position: "absolute", left: zone.x, top: zone.y, width: zone.width, height: zone.height, opacity: 1 - exit, translate: `0 ${exit * 22}px`}}>{sorted.map(renderAtom)}</div></AbsoluteFill>;
};
