import React from "react";
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import type {AtomicSceneGraph, ChronologyPresentation as ChronologyPresentationSpec, ChronologyPresentationItem} from "../types";

const CYAN = "#27E6ED";
const BLUE = "#5D8CFF";
const AMBER = "#F0BC6B";
const WHITE = "#F5F8FF";
const DIM = "#788597";
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

export type ChronologyTimelineItem = ChronologyPresentationItem;
export type ChronologyTimelineSpec = {
  items: ChronologyTimelineItem[];
  visualVariant?: "datedMilestones" | "pulseTrack";
};

export const buildChronologyTimeline = (input: ChronologyTimelineSpec): AtomicSceneGraph => {
  const items = input.items.map((item) => ({...item, time: item.time.trim(), title: item.title.trim(), detail: item.detail?.trim()}));
  if (items.length < 2 || items.length > 4) throw new Error("chronology_track requires 2..4 explicit time milestones");
  items.forEach((item, index) => {
    if (!item.time || !item.title) throw new Error(`chronology_track milestone ${index + 1} requires a grounded time and title`);
    if (index > 0 && item.showAtInFrames <= items[index - 1].showAtInFrames) throw new Error("chronology_track Spoken Beats must be strictly increasing");
  });
  const visualVariant = input.visualVariant ?? "datedMilestones";
  return {
    schemaVersion: "1.0",
    structureId: "chronology_track",
    topology: visualVariant === "pulseTrack" ? "arrival-track" : "history-spine",
    coordinateSpace: "normalized-zone",
    atoms: [],
    presentation: {kind: "chronology-track", visualVariant, items},
    metadata: {
      semanticLayer: "informationRelationship",
      semanticPurpose: "chronology",
      sourceComponent: "ChronologyTrack",
      visualStyle: visualVariant === "pulseTrack" ? "atomic-chronology-arrival-track" : "atomic-chronology-history-spine",
      lockedLayoutAspect: 16 / 9,
      compositionRules: [
        "each-time-label-is-explicit-and-grounded",
        "future-event-copy-remains-hidden-until-its-spoken-beat",
        "past-events-collapse-into-dim-retained-traces",
        "the-time-axis-advances-only-when-a-milestone-is-spoken",
        "undated-ordered-actions-route-to-sequence",
      ],
    },
  };
};

const ease = (frame: number, from: number, to: number) => interpolate(frame, [from, to], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
const activeIndexAt = (frame: number, items: ChronologyPresentationItem[]) => {
  let result = -1;
  items.forEach((item, index) => { if (frame >= item.showAtInFrames) result = index; });
  return result;
};
const railProgressAt = (frame: number, items: ChronologyPresentationItem[], activeIndex: number) => {
  if (activeIndex <= 0) return 0;
  const beat = items[activeIndex].showAtInFrames;
  return interpolate(frame, [beat - 12, beat], [(activeIndex - 1) / (items.length - 1), activeIndex / (items.length - 1)], {...clamp, easing: Easing.inOut(Easing.cubic)});
};

const HistorySpine: React.FC<{spec: ChronologyPresentationSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const activeIndex = activeIndexAt(frame, spec.items);
  const railProgress = railProgressAt(frame, spec.items, activeIndex);
  const top = 300, gap = 230, railX = 635, lastY = top + gap * (spec.items.length - 1);
  return <>
    <div style={{position: "absolute", left: 320, top: 190, color: CYAN, fontSize: 20, fontWeight: 850, letterSpacing: 5}}>CHRONOLOGY · 时间脊柱</div>
    <div data-atomic-kind="connector" style={{position: "absolute", left: railX, top, width: 3, height: lastY - top, borderRadius: 99, background: "rgba(255,255,255,.10)"}} />
    <div data-atomic-kind="connector" style={{position: "absolute", left: railX - 1, top, width: 5, height: (lastY - top) * railProgress, borderRadius: 99, background: `linear-gradient(${BLUE}, ${CYAN})`, boxShadow: "0 0 18px rgba(39,230,237,.36)"}} />
    {spec.items.map((item, index) => {
      const enter = Math.min(1, spring({frame: frame - item.showAtInFrames, fps, config: {damping: 17, stiffness: 150, mass: 0.78}}));
      const nextBeat = spec.items[index + 1]?.showAtInFrames ?? 999999;
      const retire = ease(frame, nextBeat - 2, nextBeat + 10);
      const current = activeIndex === index;
      const past = activeIndex > index;
      const future = frame < item.showAtInFrames;
      const y = top + gap * index;
      const pulse = current ? 0.5 + Math.sin(frame * 0.18) * 0.5 : 0;
      return <React.Fragment key={`${item.time}-${index}`}>
        <div data-atomic-kind="node" data-atomic-role={current ? "current" : past ? "history" : "future"} style={{position: "absolute", left: railX - 15, top: y - 15, width: 33, height: 33, boxSizing: "border-box", borderRadius: 999, border: `3px solid ${current ? CYAN : past ? "#596779" : "rgba(255,255,255,.09)"}`, background: current ? "#071216" : "#080B11", boxShadow: current ? `0 0 ${24 + pulse * 14}px rgba(39,230,237,${0.35 + pulse * 0.25})` : "none", opacity: future ? .28 : 1, scale: current ? 1.08 + pulse * .05 : .8, zIndex: 4}}>{current ? <div style={{position: "absolute", inset: 8, borderRadius: 99, background: CYAN}} /> : null}</div>
        <div style={{position: "absolute", left: 390, top: y - 29, width: 190, textAlign: "right", opacity: past ? retire : 0}}><div style={{color: "#8D9AAD", fontSize: 24, lineHeight: 1, fontWeight: 850}}>{item.time}</div><div style={{marginTop: 11, color: "#657184", fontSize: 17, lineHeight: 1, fontWeight: 650}}>{item.title}</div></div>
        <div data-atomic-kind="content" data-content-sized-surface="chronology-current-event" style={{position: "absolute", left: 735, top: y - 88, width: 1180, boxSizing: "border-box", padding: "29px 38px 30px", borderRadius: 25, background: "linear-gradient(145deg, rgba(19,27,38,.78), rgba(7,11,18,.62))", backdropFilter: "blur(12px) saturate(1.08)", border: "1px solid rgba(39,230,237,.42)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.12), 0 24px 52px rgba(0,0,0,.28), 0 0 30px rgba(39,230,237,.09)", opacity: enter * (1 - retire), translate: `${(1 - enter) * 34}px 0`, scale: .96 + enter * .04, transformOrigin: "left center"}}>
          <div style={{display: "flex", alignItems: "center", gap: 22}}><div style={{color: CYAN, fontSize: 47, lineHeight: 1, fontWeight: 930}}>{item.time}</div><span style={{width: 1, height: 46, background: "rgba(255,255,255,.16)"}} /><div data-primary-text="true" style={{color: WHITE, fontSize: 42, lineHeight: 1, fontWeight: 900}}>{item.title}</div></div>
          {item.detail ? <div data-auxiliary-text="true" style={{marginTop: 20, color: "#9CA9BB", fontSize: 23, lineHeight: 1.25, fontWeight: 620}}>{item.detail}</div> : null}
          <div style={{position: "absolute", right: 32, top: 31, display: "flex", alignItems: "center", gap: 10, color: CYAN, fontSize: 15, fontWeight: 820, letterSpacing: 2}}><span style={{width: 8, height: 8, borderRadius: 99, background: CYAN, boxShadow: `0 0 12px ${CYAN}`}} /> CURRENT</div>
        </div>
      </React.Fragment>;
    })}
  </>;
};

const ArrivalTrack: React.FC<{spec: ChronologyPresentationSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const activeIndex = activeIndexAt(frame, spec.items);
  const railProgress = railProgressAt(frame, spec.items, activeIndex);
  const railLeft = 420, railWidth = 1720, railY = 930, nodeGap = railWidth / (spec.items.length - 1);
  const pulseX = railLeft + railWidth * railProgress;
  return <>
    <div style={{position: "absolute", left: 320, top: 190, color: AMBER, fontSize: 20, fontWeight: 850, letterSpacing: 5}}>CHRONOLOGY · 抵达轨道</div>
    {spec.items.map((item, index) => {
      const enter = Math.min(1, spring({frame: frame - item.showAtInFrames, fps, config: {damping: 16, stiffness: 155, mass: .76}}));
      const nextBeat = spec.items[index + 1]?.showAtInFrames ?? 999999;
      const leave = ease(frame, nextBeat - 7, nextBeat + 6);
      return <div key={`card-${item.time}`} data-atomic-kind="content" data-content-sized-surface="chronology-focus-event" style={{position: "absolute", left: 650, top: 330, width: 1260, height: 330, boxSizing: "border-box", padding: "50px 62px", borderRadius: 34, background: "linear-gradient(145deg, rgba(25,28,35,.80), rgba(9,11,16,.62))", backdropFilter: "blur(14px) saturate(1.08)", border: "1px solid rgba(240,188,107,.40)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.13), 0 30px 65px rgba(0,0,0,.34), 0 0 42px rgba(240,188,107,.08)", opacity: enter * (1 - leave), translate: `0 ${(1 - enter) * 28 - leave * 18}px`, scale: .965 + enter * .035 - leave * .02}}>
        <div style={{display: "flex", alignItems: "flex-start", height: "100%"}}><div style={{width: 285, flex: "0 0 auto"}}><div style={{color: AMBER, fontSize: 21, fontWeight: 850, letterSpacing: 4}}>ARRIVED</div><div style={{marginTop: 21, color: WHITE, fontSize: 76, lineHeight: .9, fontWeight: 950}}>{item.time}</div></div><div style={{width: 1, height: 185, marginTop: 4, background: "linear-gradient(transparent,rgba(255,255,255,.20),transparent)"}} /><div style={{paddingLeft: 55, paddingTop: 7}}><div data-primary-text="true" style={{color: WHITE, fontSize: 50, lineHeight: 1, fontWeight: 920}}>{item.title}</div>{item.detail ? <div data-auxiliary-text="true" style={{marginTop: 29, color: "#9BA8B9", fontSize: 25, lineHeight: 1.3, fontWeight: 620}}>{item.detail}</div> : null}</div></div>
        <div style={{position: "absolute", left: 62, right: 62, bottom: 30, height: 2, background: "rgba(255,255,255,.06)"}}><div style={{width: `${((index + 1) / spec.items.length) * 100}%`, height: "100%", background: AMBER, boxShadow: "0 0 14px rgba(240,188,107,.42)"}} /></div>
      </div>;
    })}
    <div data-atomic-kind="connector" style={{position: "absolute", left: railLeft, top: railY, width: railWidth, height: 4, borderRadius: 99, background: "rgba(255,255,255,.11)"}} />
    <div data-atomic-kind="connector" style={{position: "absolute", left: railLeft, top: railY, width: railWidth * railProgress, height: 4, borderRadius: 99, background: `linear-gradient(90deg, ${BLUE}, ${AMBER})`, boxShadow: "0 0 18px rgba(240,188,107,.28)"}} />
    {spec.items.map((item, index) => {
      const arrived = Math.min(1, spring({frame: frame - item.showAtInFrames, fps, config: {damping: 17, stiffness: 165, mass: .72}}));
      const current = activeIndex === index, past = activeIndex > index, future = frame < item.showAtInFrames;
      const x = railLeft + nodeGap * index;
      const pulse = current ? .5 + Math.sin(frame * .2) * .5 : 0;
      return <React.Fragment key={`node-${item.time}-${index}`}><div data-atomic-kind="node" data-atomic-role={current ? "current" : past ? "history" : "future"} style={{position: "absolute", left: x - 17, top: railY - 15, width: 35, height: 35, boxSizing: "border-box", borderRadius: 999, background: current ? AMBER : "#090C12", border: `3px solid ${current ? AMBER : past ? "#667386" : "rgba(255,255,255,.08)"}`, boxShadow: current ? `0 0 ${24 + pulse * 18}px rgba(240,188,107,${.38 + pulse * .27})` : "none", opacity: future ? .22 : arrived, scale: current ? 1.1 + pulse * .05 : .78 + arrived * .12, zIndex: 4}} /><div style={{position: "absolute", left: x - 125, top: railY + 44, width: 250, textAlign: "center", opacity: future ? 0 : arrived * (current ? 1 : .68)}}><div style={{color: current ? AMBER : "#8793A4", fontSize: current ? 27 : 22, lineHeight: 1, fontWeight: 900}}>{item.time}</div><div style={{marginTop: 12, color: current ? "#C9D1DC" : "#677385", fontSize: 16, lineHeight: 1, fontWeight: 640}}>{item.title}</div></div></React.Fragment>;
    })}
    <div data-atomic-kind="action-cue" style={{position: "absolute", left: pulseX - 9, top: railY - 7, width: 19, height: 19, borderRadius: 99, background: WHITE, boxShadow: "0 0 26px rgba(255,255,255,.86)", opacity: activeIndex > 0 && activeIndex < spec.items.length - 1 ? .95 : 0, zIndex: 6}} />
  </>;
};

export const ChronologyPresentation: React.FC<{presentation: ChronologyPresentationSpec; width: number; height: number}> = ({presentation, width, height}) => {
  const scale = Math.min(width / 2560, height / 1440);
  return <div style={{position: "absolute", left: (width - 2560 * scale) / 2, top: (height - 1440 * scale) / 2, width: 2560, height: 1440, scale, transformOrigin: "top left"}}><div style={{position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle at 50% 54%, ${presentation.visualVariant === "pulseTrack" ? "rgba(240,188,107,.07)" : "rgba(39,230,237,.07)"}, transparent 40%)`}} />{presentation.visualVariant === "pulseTrack" ? <ArrivalTrack spec={presentation} /> : <HistorySpine spec={presentation} />}</div>;
};
