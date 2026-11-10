import React from "react";
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import type {AtomicSceneGraph, StateTransferPresentation as StateTransferPresentationSpec} from "../types";

const CYAN = "#24E5EE";
const BLUE = "#5D8CFF";
const WHITE = "#F5F8FF";
const DIM = "#7B8799";
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

export type StateTransferSpec = {
  sourceLabel: string;
  targetLabel: string;
  carrierLabel: string;
  sourceEyebrow?: string;
  targetEyebrow?: string;
  beforeMeta?: string;
  afterMeta?: string;
  visualVariant?: "stateTransfer" | "statePortal";
  structureAtInFrames?: number;
  carrierAtInFrames?: number;
  routeAtInFrames?: number;
  departAtInFrames: number;
  arriveAtInFrames: number;
  lockAtInFrames?: number;
};

export const buildStateTransfer = (input: StateTransferSpec): AtomicSceneGraph => {
  const sourceLabel = input.sourceLabel.trim();
  const targetLabel = input.targetLabel.trim();
  const carrierLabel = input.carrierLabel.trim();
  if (!sourceLabel || !targetLabel || !carrierLabel) throw new Error("stateTransfer requires grounded sourceLabel, targetLabel, and carrierLabel");
  if (!(input.departAtInFrames < input.arriveAtInFrames)) throw new Error("stateTransfer departAtInFrames must precede arriveAtInFrames");
  const lockAtInFrames = input.lockAtInFrames ?? input.arriveAtInFrames + 12;
  if (lockAtInFrames < input.arriveAtInFrames) throw new Error("stateTransfer lockAtInFrames must not precede arrival");
  const visualVariant = input.visualVariant ?? "stateTransfer";
  return {
    schemaVersion: "1.0",
    structureId: "state_transfer",
    topology: visualVariant === "statePortal" ? "portal-transfer" : "board-transfer",
    coordinateSpace: "normalized-zone",
    atoms: [],
    presentation: {
      kind: "transformation-state-transfer",
      visualVariant,
      sourceEyebrow: input.sourceEyebrow?.trim() || "原状态",
      sourceLabel,
      targetEyebrow: input.targetEyebrow?.trim() || "新状态",
      targetLabel,
      carrierLabel,
      beforeMeta: input.beforeMeta?.trim() || "等待迁移",
      afterMeta: input.afterMeta?.trim() || "进入新状态",
      structureAtInFrames: input.structureAtInFrames ?? 10,
      carrierAtInFrames: input.carrierAtInFrames ?? 25,
      routeAtInFrames: input.routeAtInFrames ?? Math.max(0, input.departAtInFrames - 11),
      departAtInFrames: input.departAtInFrames,
      arriveAtInFrames: input.arriveAtInFrames,
      lockAtInFrames,
    },
    metadata: {
      semanticLayer: "informationRelationship",
      semanticPurpose: "transformation",
      sourceComponent: "KanbanMove",
      visualStyle: visualVariant === "statePortal" ? "atomic-state-portal" : "atomic-state-board",
      lockedLayoutAspect: 16 / 9,
      compositionRules: [
        "one-carrier-preserves-identity-through-the-change",
        "source-release-precedes-target-lock",
        "result-state-does-not-lock-before-arrival",
        "stateTransfer-and-statePortal-share-one-semantic-timeline",
      ],
    },
  };
};

const p = (frame: number, from: number, to: number) => interpolate(frame, [from, to], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});

const CornerTicks: React.FC<{color: string; opacity: number}> = ({color, opacity}) => <>
  <span style={{position: "absolute", left: -1, top: -1, width: 28, height: 28, borderLeft: `3px solid ${color}`, borderTop: `3px solid ${color}`, opacity}} />
  <span style={{position: "absolute", right: -1, bottom: -1, width: 28, height: 28, borderRight: `3px solid ${color}`, borderBottom: `3px solid ${color}`, opacity}} />
</>;

const Carrier: React.FC<{spec: StateTransferPresentationSpec; left: number; top: number; width: number; scale: number; rotate: number; opacity: number; changed: number; lift: number}> = ({spec, left, top, width, scale, rotate, opacity, changed, lift}) => <div data-atomic-kind="carrier" style={{position: "absolute", left, top, width, height: 142, boxSizing: "border-box", padding: "0 30px", display: "flex", alignItems: "center", gap: 24, borderRadius: 22, background: "linear-gradient(145deg, rgba(24,29,41,.98), rgba(8,11,18,.96))", border: `2px solid ${changed > 0.5 ? CYAN : BLUE}`, boxShadow: `0 ${18 + lift * 28}px ${34 + lift * 30}px rgba(0,0,0,.48), 0 0 ${18 + changed * 18}px ${changed > 0.5 ? "rgba(36,229,238,.28)" : "rgba(93,140,255,.22)"}, inset 0 1px 0 rgba(255,255,255,.14)`, opacity, scale, rotate: `${rotate}deg`, zIndex: 8}}>
  <div style={{width: 68, height: 68, flex: "0 0 auto", borderRadius: 18, display: "grid", placeItems: "center", color: "#061014", background: changed > 0.5 ? CYAN : BLUE, fontSize: 28, fontWeight: 950, boxShadow: `0 0 22px ${changed > 0.5 ? "rgba(36,229,238,.28)" : "rgba(93,140,255,.24)"}`}}>01</div>
  <div style={{minWidth: 0}}><div data-primary-text="true" style={{color: WHITE, fontSize: 35, lineHeight: 1, fontWeight: 880, whiteSpace: "nowrap"}}>{spec.carrierLabel}</div><div style={{position: "relative", marginTop: 13, height: 21, color: DIM, fontSize: 18, lineHeight: 1, fontWeight: 650}}><span style={{position: "absolute", left: 0, opacity: 1 - changed}}>{spec.beforeMeta}</span><span style={{position: "absolute", left: 0, color: CYAN, opacity: changed}}>{spec.afterMeta}</span></div></div>
  <div style={{marginLeft: "auto", width: 18, height: 18, borderRadius: 999, border: `3px solid ${changed > 0.5 ? CYAN : BLUE}`, boxShadow: `0 0 14px ${changed > 0.5 ? CYAN : BLUE}`}} />
</div>;

const Completion: React.FC<{opacity: number; portal: boolean}> = ({opacity, portal}) => <div data-atomic-kind="status" style={{position: "absolute", left: "50%", bottom: 150, translate: "-50% 0", display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", border: "1px solid rgba(36,229,238,.55)", borderRadius: 999, background: "rgba(8,18,23,.78)", boxShadow: "0 0 28px rgba(36,229,238,.15)", color: WHITE, fontSize: 20, fontWeight: 760, opacity}}><span style={{width: 24, height: 24, display: "grid", placeItems: "center", borderRadius: 999, background: CYAN, color: "#061014", fontSize: 16, fontWeight: 950}}>✓</span>{portal ? "跃迁完成 · 新状态已锁定" : "对象已迁入新状态"}</div>;

const BoardView: React.FC<{spec: StateTransferPresentationSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const structure = spring({frame: frame - spec.structureAtInFrames, fps, config: {damping: 18, stiffness: 125, mass: 0.9}});
  const carrierIn = spring({frame: frame - spec.carrierAtInFrames, fps, config: {damping: 16, stiffness: 145, mass: 0.82}});
  const route = p(frame, spec.routeAtInFrames, spec.departAtInFrames + 22);
  const travel = interpolate(frame, [spec.departAtInFrames, spec.arriveAtInFrames], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const lift = Math.sin(travel * Math.PI);
  const changed = p(frame, spec.departAtInFrames + 24, spec.departAtInFrames + 37);
  const lock = spring({frame: frame - spec.lockAtInFrames, fps, config: {damping: 15, stiffness: 140, mass: 0.75}});
  const boardLeft = 350, boardTop = 390, columnWidth = 730, gap = 250, rightLeft = boardLeft + columnWidth + gap;
  const cardWidth = 590, startX = boardLeft + 70, endX = rightLeft + 70;
  const cardX = interpolate(travel, [0, 1], [startX, endX]);
  const cardY = interpolate(travel, [0, 0.5, 1], [630, 525, 630]);
  const targetActive = p(frame, spec.arriveAtInFrames - 20, spec.arriveAtInFrames + 6);
  const sourceDim = p(frame, spec.departAtInFrames + 30, spec.arriveAtInFrames + 6);
  const column = (left: number, side: "source" | "target") => {
    const target = side === "target", active = target ? targetActive : 1 - sourceDim * 0.72;
    const eyebrow = target ? spec.targetEyebrow : spec.sourceEyebrow, label = target ? spec.targetLabel : spec.sourceLabel;
    return <div data-atomic-kind="node" data-atomic-role={side} data-content-sized-surface="true" style={{position: "absolute", left, top: boardTop, width: columnWidth, height: 510, boxSizing: "border-box", borderRadius: 30, background: target ? `linear-gradient(145deg, rgba(10,35,41,${0.25 + active * 0.22}), rgba(7,10,16,.62))` : "linear-gradient(145deg, rgba(17,22,32,.74), rgba(7,10,16,.58))", border: `2px solid ${target ? `rgba(36,229,238,${0.22 + active * 0.55})` : `rgba(130,145,166,${0.38 - sourceDim * 0.2})`}`, boxShadow: target && active > 0.3 ? "0 0 58px rgba(36,229,238,.13), inset 0 1px 0 rgba(255,255,255,.10)" : "0 24px 55px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.08)", opacity: Math.min(1, structure) * (target ? 0.62 + active * 0.38 : 1 - sourceDim * 0.36), translate: `0 ${(1 - structure) * 28}px`}}>
      <CornerTicks color={target ? CYAN : "#6F7B8D"} opacity={target ? active : 0.28} />
      <div style={{height: 112, padding: "0 40px", display: "flex", alignItems: "center", gap: 20, borderBottom: "1px solid rgba(255,255,255,.08)"}}><span style={{width: 12, height: 12, borderRadius: 999, background: target ? CYAN : "#728096", boxShadow: target ? `0 0 18px rgba(36,229,238,${active * 0.8})` : "none"}} /><div><div style={{color: DIM, fontSize: 17, fontWeight: 760, letterSpacing: 4}}>{eyebrow}</div><div data-primary-text="true" style={{marginTop: 10, color: target ? WHITE : "#D3D9E3", fontSize: 34, lineHeight: 1, fontWeight: 870}}>{label}</div></div><div style={{marginLeft: "auto", color: target ? CYAN : "#8793A5", fontSize: 17, fontWeight: 800}}>0{target ? 2 : 1}</div></div>
      <div style={{position: "absolute", left: 69, right: 69, top: 240, height: 142, borderRadius: 22, border: `2px dashed ${target ? `rgba(36,229,238,${0.25 + targetActive * 0.35})` : "rgba(125,138,158,.20)"}`, background: target ? `rgba(36,229,238,${0.025 + targetActive * 0.05})` : "rgba(255,255,255,.018)"}} />
      <div style={{position: "absolute", left: 40, right: 40, bottom: 28, display: "flex", justifyContent: "space-between", color: target && lock > 0.4 ? CYAN : "#697688", fontSize: 16, fontWeight: 700}}><span>{target ? "目标槽位" : "当前槽位"}</span><span>{target && lock > 0.4 ? "已接收" : target ? "等待接收" : sourceDim > 0.8 ? "已迁出" : "持有中"}</span></div>
    </div>;
  };
  return <>{column(boardLeft, "source")}{column(rightLeft, "target")}<svg data-atomic-kind="connector" width="2560" height="1440" style={{position: "absolute", inset: 0, pointerEvents: "none"}}><path d="M 1015 702 C 1110 560, 1450 560, 1545 702" fill="none" stroke="rgba(255,255,255,.13)" strokeWidth="3" strokeDasharray="8 12" /><path d="M 1015 702 C 1110 560, 1450 560, 1545 702" fill="none" stroke={CYAN} strokeWidth="5" strokeLinecap="round" pathLength="1" strokeDasharray={`${route} 1`} opacity={0.25 + route * 0.65} style={{filter: "drop-shadow(0 0 8px rgba(36,229,238,.5))"}} /><path d="M 1530 688 L 1550 702 L 1528 715" fill="none" stroke={CYAN} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity={route} /></svg><Carrier spec={spec} left={cardX} top={cardY} width={cardWidth} opacity={Math.min(1, carrierIn)} scale={0.92 + carrierIn * 0.08 + lift * 0.045 + lock * 0.018} rotate={(0.5 - travel) * lift * -3} changed={changed} lift={lift} /><Completion opacity={p(frame, spec.lockAtInFrames, spec.lockAtInFrames + 13)} portal={false} /></>;
};

const PortalView: React.FC<{spec: StateTransferPresentationSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const structure = spring({frame: frame - spec.structureAtInFrames, fps, config: {damping: 18, stiffness: 125, mass: 0.9}});
  const carrierIn = spring({frame: frame - spec.carrierAtInFrames, fps, config: {damping: 16, stiffness: 145, mass: 0.82}});
  const portalOpen = spring({frame: frame - spec.routeAtInFrames, fps, config: {damping: 14, stiffness: 105, mass: 0.82}});
  const travel = interpolate(frame, [spec.departAtInFrames, spec.arriveAtInFrames], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const changed = p(frame, spec.departAtInFrames + 22, spec.departAtInFrames + 36), lift = Math.sin(travel * Math.PI);
  const lock = spring({frame: frame - spec.lockAtInFrames, fps, config: {damping: 15, stiffness: 140, mass: 0.75}});
  const pulse = interpolate(frame, [spec.departAtInFrames + 21, spec.departAtInFrames + 29, spec.departAtInFrames + 40], [0, 1, 0], clamp);
  const panelTop = 455, panelWidth = 590, panelHeight = 410, leftPanel = 330, rightPanel = 1640, cardWidth = 500;
  const cardX = interpolate(travel, [0, 1], [leftPanel + 45, rightPanel + 45]);
  const cardY = interpolate(travel, [0, 0.5, 1], [640, 535, 640]);
  const targetActive = p(frame, spec.arriveAtInFrames - 22, spec.arriveAtInFrames + 7), sourceDim = p(frame, spec.departAtInFrames + 32, spec.arriveAtInFrames + 8);
  const panel = (left: number, side: "source" | "target") => {
    const target = side === "target", active = target ? targetActive : 1 - sourceDim * 0.7;
    const eyebrow = target ? spec.targetEyebrow : spec.sourceEyebrow, label = target ? spec.targetLabel : spec.sourceLabel;
    return <div data-atomic-kind="node" data-atomic-role={side} data-content-sized-surface="true" style={{position: "absolute", left, top: panelTop, width: panelWidth, height: panelHeight, boxSizing: "border-box", padding: "42px 44px", borderRadius: 34, background: target ? `linear-gradient(145deg, rgba(36,229,238,${0.05 + active * 0.08}), rgba(6,10,16,.72))` : "linear-gradient(145deg, rgba(93,140,255,.08), rgba(6,9,15,.72))", border: `2px solid ${target ? `rgba(36,229,238,${0.32 + active * 0.5})` : `rgba(93,140,255,${0.5 - sourceDim * 0.25})`}`, boxShadow: target && active > 0.35 ? "0 0 44px rgba(36,229,238,.15), inset 0 1px 0 rgba(255,255,255,.10)" : "0 26px 55px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.09)", opacity: Math.min(1, structure) * (target ? 0.68 + active * 0.32 : 1 - sourceDim * 0.32), translate: `0 ${(1 - structure) * 28}px`}}><CornerTicks color={target ? CYAN : BLUE} opacity={target ? active : 0.46} /><div style={{color: target ? CYAN : BLUE, fontSize: 17, fontWeight: 800, letterSpacing: 5}}>{eyebrow}</div><div data-primary-text="true" style={{marginTop: 15, color: WHITE, fontSize: 39, lineHeight: 1, fontWeight: 880}}>{label}</div><div style={{position: "absolute", left: 44, right: 44, top: 185, height: 142, borderRadius: 22, border: `2px dashed ${target ? `rgba(36,229,238,${0.3 + targetActive * 0.35})` : "rgba(93,140,255,.28)"}`, background: target ? "rgba(36,229,238,.035)" : "rgba(93,140,255,.035)"}} /><div style={{position: "absolute", left: 44, right: 44, bottom: 27, color: target && lock > 0.4 ? CYAN : DIM, fontSize: 16, fontWeight: 720, display: "flex", justifyContent: "space-between"}}><span>{target ? "DESTINATION" : "ORIGIN"}</span><span>{target && lock > 0.4 ? "LOCKED" : target ? "STANDBY" : sourceDim > 0.75 ? "RELEASED" : "ACTIVE"}</span></div></div>;
  };
  return <>{panel(leftPanel, "source")}{panel(rightPanel, "target")}<svg data-atomic-kind="connector" width="2560" height="1440" style={{position: "absolute", inset: 0, pointerEvents: "none"}}><defs><linearGradient id="statePortalRoute" x1="0" y1="0" x2="1" y2="0"><stop stopColor={BLUE} /><stop offset="1" stopColor={CYAN} /></linearGradient></defs><path d="M 900 710 C 1060 560, 1500 560, 1660 710" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="3" strokeDasharray="7 13" /><path d="M 900 710 C 1060 560, 1500 560, 1660 710" fill="none" stroke="url(#statePortalRoute)" strokeWidth="5" strokeLinecap="round" pathLength="1" strokeDasharray={`${travel} 1`} opacity={0.25 + lift * 0.75} style={{filter: "drop-shadow(0 0 9px rgba(36,229,238,.52))"}} /></svg><div data-atomic-kind="action-cue" style={{position: "absolute", left: 1135, top: 490, width: 290, height: 290, display: "grid", placeItems: "center", borderRadius: 999, opacity: Math.min(1, portalOpen), scale: 0.78 + portalOpen * 0.22 + pulse * 0.08, background: "radial-gradient(circle, rgba(36,229,238,.13), rgba(8,12,19,.75) 63%, transparent 64%)", border: `3px solid rgba(36,229,238,${0.55 + pulse * 0.35})`, boxShadow: `0 0 ${42 + pulse * 35}px rgba(36,229,238,${0.18 + pulse * 0.18}), inset 0 0 38px rgba(93,140,255,.15)`, zIndex: 5}}><div style={{position: "absolute", inset: 25, borderRadius: 999, border: "2px dashed rgba(93,140,255,.62)", rotate: `${frame * 1.1}deg`}} /><div style={{position: "absolute", inset: 58, borderRadius: 999, border: "1px solid rgba(36,229,238,.52)", rotate: `${-frame * 1.6}deg`}} /><div style={{textAlign: "center", color: WHITE}}><div style={{fontSize: 18, fontWeight: 790, letterSpacing: 4, color: CYAN}}>TRANSFER</div><div style={{marginTop: 10, fontSize: 27, fontWeight: 880}}>状态跃迁</div></div></div><Carrier spec={spec} left={cardX} top={cardY} width={cardWidth} opacity={Math.min(1, carrierIn)} scale={0.92 + carrierIn * 0.08 + lift * 0.055 + pulse * 0.025 + lock * 0.018} rotate={(0.5 - travel) * lift * -3.5} changed={changed} lift={lift} /><Completion opacity={p(frame, spec.lockAtInFrames, spec.lockAtInFrames + 13)} portal /></>;
};

export const StateTransferPresentation: React.FC<{presentation: StateTransferPresentationSpec; width: number; height: number}> = ({presentation, width, height}) => {
  const scale = Math.min(width / 2560, height / 1440);
  return <div style={{position: "absolute", left: (width - 2560 * scale) / 2, top: (height - 1440 * scale) / 2, width: 2560, height: 1440, scale, transformOrigin: "top left"}}>{presentation.visualVariant === "statePortal" ? <PortalView spec={presentation} /> : <BoardView spec={presentation} />}</div>;
};
