import React from "react";
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {SemanticIcon} from "../SemanticIcon";
import type {AtomicSceneGraph, HierarchyPresentation as HierarchyPresentationSpec, HierarchyPresentationChild, HierarchyPresentationLeaf, SemanticIconName} from "../types";

const WHITE = "#F4F8FF";
const CYAN = "#28E1E8";
const ACCENTS = ["#5E8DFF", "#F2B960", "#FF6572", "#28E1E8"];
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

export type HierarchyGroupingSpec = {
  rootLabel?: string;
  rootTitle: string;
  rootShowAtInFrames?: number;
  children: HierarchyPresentationChild[];
  visualVariant?: "nestedList" | "tierCards";
  accentColor?: string;
};

const cleanLeaf = (leaf: HierarchyPresentationLeaf): HierarchyPresentationLeaf => ({...leaf, title: leaf.title.trim()});
const cleanChild = (child: HierarchyPresentationChild): HierarchyPresentationChild => ({...child, label: child.label.trim(), title: child.title.trim(), leaves: (child.leaves ?? []).map(cleanLeaf)});

export const buildHierarchyGrouping = (input: HierarchyGroupingSpec): AtomicSceneGraph => {
  const rootTitle = input.rootTitle.trim();
  const rootLabel = (input.rootLabel ?? "根节点").trim();
  const children = input.children.map(cleanChild);
  if (!rootTitle || !rootLabel) throw new Error("hierarchy_grouping requires a grounded root label and title");
  if (children.length < 2 || children.length > 4) throw new Error("hierarchy_grouping requires 2..4 explicit peer children");
  let previousChildAt = -1;
  children.forEach((child, childIndex) => {
    if (!child.label || !child.title || !Number.isFinite(child.showAtInFrames)) throw new Error(`hierarchy_grouping child ${childIndex + 1} requires label, title, and Spoken-Beat frame`);
    if (child.showAtInFrames <= previousChildAt) throw new Error("hierarchy_grouping peer-child Spoken Beats must be strictly increasing");
    previousChildAt = child.showAtInFrames;
    if ((child.leaves?.length ?? 0) > 2) throw new Error("hierarchy_grouping supports at most two contained leaves per peer child");
    let previousLeafAt = child.showAtInFrames - 1;
    (child.leaves ?? []).forEach((leaf, leafIndex) => {
      if (!leaf.title || !Number.isFinite(leaf.showAtInFrames)) throw new Error(`hierarchy_grouping child ${childIndex + 1} leaf ${leafIndex + 1} requires title and Spoken-Beat frame`);
      if (leaf.showAtInFrames < child.showAtInFrames || leaf.showAtInFrames <= previousLeafAt) throw new Error("hierarchy_grouping leaves must follow their parent in Spoken-Beat order");
      previousLeafAt = leaf.showAtInFrames;
    });
  });
  const visualVariant = input.visualVariant ?? "nestedList";
  return {
    schemaVersion: "1.0",
    structureId: "hierarchy_grouping",
    topology: visualVariant === "tierCards" ? "tiered-peer-groups" : "contained-nested-list",
    coordinateSpace: "normalized-zone",
    atoms: [],
    presentation: {kind: "hierarchy-grouping", visualVariant, rootLabel, rootTitle, rootShowAtInFrames: input.rootShowAtInFrames ?? 0, children, accentColor: input.accentColor ?? CYAN},
    metadata: {
      semanticLayer: "informationRelationship",
      semanticPurpose: "hierarchy",
      sourceComponent: "HierarchyTree",
      visualStyle: visualVariant === "tierCards" ? "atomic-hierarchy-tier-cards" : "atomic-hierarchy-nested-list",
      lockedLayoutAspect: 16 / 9,
      compositionRules: [
        "hierarchy uses containment proximity scale and indentation instead of connector lines",
        "render zero connectors, branches, trunks, radial routes, runners, or decorative node-link paths",
        "peer children keep equal emphasis and reveal only on their Spoken Beats",
        "leaves stay visually contained inside their explicit parent child",
        "preserve the approved 2560x1440 internal geometry through uniform fitting",
      ],
    },
  };
};

const ease = (frame: number, from: number, to: number) => interpolate(frame, [from, to], [0, 1], {...clamp, easing: Easing.bezier(.16, 1, .3, 1)});
const enterAt = (frame: number, beat: number, fps: number) => Math.min(1, spring({frame: frame - beat, fps, config: {damping: 18, stiffness: 168, mass: .72}}));
const childColor = (child: HierarchyPresentationChild, index: number) => child.accentColor ?? ACCENTS[index % ACCENTS.length];

const IconCell: React.FC<{icon?: SemanticIconName; color: string; size?: number; progress: number}> = ({icon = "layers", color, size = 52, progress}) => <div style={{width: size, height: size, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: Math.round(size * .27), background: `${color}0D`, border: `1px solid ${color}68`, boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)"}}><SemanticIcon name={icon} size={size * .64} color={color} progress={progress}/></div>;

const RootCard: React.FC<{spec: HierarchyPresentationSpec; progress: number; top: number}> = ({spec, progress, top}) => <div data-atomic-kind="hierarchy-root" data-content-sized-surface="hierarchy-root" data-card-copy-structure="label-primary" style={{position: "absolute", left: 1030, top, width: 500, boxSizing: "border-box", padding: "20px 25px", display: "flex", alignItems: "center", gap: 18, borderRadius: 22, background: "linear-gradient(110deg,rgba(16,35,45,.82),rgba(7,14,20,.64))", backdropFilter: "blur(14px) saturate(1.12)", border: `1px solid ${spec.accentColor}76`, boxShadow: "inset 0 1px 0 rgba(255,255,255,.10),0 20px 42px rgba(0,0,0,.25)", opacity: progress, transform: `translateY(${(1 - progress) * -24}px) scale(${.94 + progress * .06})`}}><IconCell icon="layers" color={spec.accentColor} size={62} progress={progress}/><div><div data-card-label="true" style={{color: spec.accentColor, fontSize: 13, lineHeight: 1, fontWeight: 850, letterSpacing: 3}}>{spec.rootLabel}</div><div data-primary-text="true" style={{marginTop: 10, color: WHITE, fontSize: 31, lineHeight: 1.05, fontWeight: 920, whiteSpace: "nowrap"}}>{spec.rootTitle}</div></div></div>;

const LeafChip: React.FC<{leaf: HierarchyPresentationLeaf; color: string; progress: number}> = ({leaf, color, progress}) => <div data-atomic-kind="hierarchy-contained-leaf" data-content-sized-surface="hierarchy-contained-leaf" style={{padding: "10px 14px 10px 11px", display: "flex", alignItems: "center", gap: 10, borderRadius: 13, background: "rgba(7,12,18,.38)", border: `1px solid ${color}32`, opacity: progress, transform: `translateY(${(1 - progress) * 10}px)`}}><SemanticIcon name={leaf.icon ?? "branch"} size={28} color={color} progress={progress}/><span data-primary-text="true" style={{color: WHITE, fontSize: 18, lineHeight: 1, fontWeight: 740, whiteSpace: "nowrap"}}>{leaf.title}</span></div>;

const NestedList: React.FC<{spec: HierarchyPresentationSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const rowGap = spec.children.length === 4 ? 137 : 154;
  const firstTop = spec.children.length === 4 ? 410 : 444;
  return <><RootCard spec={spec} progress={enterAt(frame, spec.rootShowAtInFrames, fps)} top={spec.children.length === 4 ? 215 : 238}/>{spec.children.map((child, index) => {
    const progress = enterAt(frame, child.showAtInFrames, fps);
    const color = childColor(child, index);
    const leaves = child.leaves ?? [];
    const rowWidth = leaves.length === 0 ? 560 : leaves.length === 1 ? 740 : 920;
    const left = (2560 - rowWidth) / 2;
    const nextAt = spec.children[index + 1]?.showAtInFrames ?? child.showAtInFrames + 46;
    const active = ease(frame, child.showAtInFrames, child.showAtInFrames + 9) * (1 - ease(frame, Math.max(child.showAtInFrames + 18, nextAt - 5), Math.max(child.showAtInFrames + 28, nextAt + 7)));
    const columns = leaves.length === 0 ? "54px 1fr" : leaves.length === 1 ? "54px 250px 1fr" : "54px 250px 1fr 1fr";
    return <div key={`${child.label}-${index}`} data-atomic-kind="hierarchy-nested-row" data-content-sized-surface="hierarchy-nested-row" data-card-copy-structure="label-primary" style={{position: "absolute", left, top: firstTop + index * rowGap, width: rowWidth, boxSizing: "border-box", padding: "17px 20px", display: "grid", gridTemplateColumns: columns, alignItems: "center", gap: 16, borderRadius: 19, background: "linear-gradient(110deg,rgba(17,25,35,.78),rgba(7,11,17,.57))", backdropFilter: "blur(13px) saturate(1.1)", border: `1px solid ${color}${active > .5 ? "76" : "42"}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.07),0 14px 30px rgba(0,0,0,.20),0 0 ${active * 20}px ${color}16`, opacity: progress, transform: `translateY(${(1 - progress) * 22}px) scale(${.97 + progress * .03})`}}><IconCell icon={child.icon} color={color} progress={progress}/><div><div data-card-label="true" style={{color, fontSize: 13, lineHeight: 1, fontWeight: 850, letterSpacing: 2.6}}>{child.label}</div><div data-primary-text="true" style={{marginTop: 10, color: WHITE, fontSize: 25, lineHeight: 1, fontWeight: 880}}>{child.title}</div></div>{leaves.map((leaf) => <LeafChip key={leaf.title} leaf={leaf} color={color} progress={enterAt(frame, leaf.showAtInFrames, fps)}/>)}</div>;
  })}</>;
};

const TierCards: React.FC<{spec: HierarchyPresentationSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const count = spec.children.length;
  const cardWidth = count === 4 ? 350 : 390;
  const gap = count === 4 ? 46 : 130;
  const totalWidth = cardWidth * count + gap * (count - 1);
  const firstLeft = (2560 - totalWidth) / 2;
  return <><RootCard spec={spec} progress={enterAt(frame, spec.rootShowAtInFrames, fps)} top={294}/>{spec.children.map((child, index) => {
    const progress = enterAt(frame, child.showAtInFrames, fps);
    const color = childColor(child, index);
    const leaves = child.leaves ?? [];
    const nextAt = spec.children[index + 1]?.showAtInFrames ?? child.showAtInFrames + 46;
    const active = ease(frame, child.showAtInFrames, child.showAtInFrames + 9) * (1 - ease(frame, Math.max(child.showAtInFrames + 18, nextAt - 5), Math.max(child.showAtInFrames + 28, nextAt + 7)));
    return <div key={`${child.label}-${index}`} data-atomic-kind="hierarchy-contained-domain" data-content-sized-surface="hierarchy-contained-domain" data-card-copy-structure="label-primary" style={{position: "absolute", left: firstLeft + index * (cardWidth + gap), top: 570, width: cardWidth, boxSizing: "border-box", padding: "21px 22px 20px", borderRadius: 22, background: "linear-gradient(135deg,rgba(18,27,38,.80),rgba(7,11,17,.58))", backdropFilter: "blur(13px) saturate(1.1)", border: `1px solid ${color}${active > .5 ? "82" : "48"}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.08),0 18px 38px rgba(0,0,0,.22),0 0 ${active * 24}px ${color}18`, opacity: progress, transform: `translateY(${(1 - progress) * 28}px) scale(${.95 + progress * .05})`}}><div style={{display: "flex", alignItems: "center", gap: 16}}><IconCell icon={child.icon} color={color} size={56} progress={progress}/><div><div data-card-label="true" style={{color, fontSize: 14, fontWeight: 850, letterSpacing: 2.6, lineHeight: 1}}>{child.label}</div><div data-primary-text="true" style={{marginTop: 10, color: WHITE, fontSize: 27, lineHeight: 1, fontWeight: 890}}>{child.title}</div></div></div>{leaves.length ? <div style={{marginTop: 20, display: "grid", gap: 11}}>{leaves.map((leaf) => <LeafChip key={leaf.title} leaf={leaf} color={color} progress={enterAt(frame, leaf.showAtInFrames, fps)}/>)}</div> : null}</div>;
  })}</>;
};

export const HierarchyPresentation: React.FC<{presentation: HierarchyPresentationSpec; width: number; height: number}> = ({presentation, width, height}) => {
  const scale = Math.min(width / 2560, height / 1440);
  return <div data-connector-count="0" style={{position: "absolute", left: (width - 2560 * scale) / 2, top: (height - 1440 * scale) / 2, width: 2560, height: 1440, scale, transformOrigin: "top left"}}>{presentation.visualVariant === "tierCards" ? <TierCards spec={presentation}/> : <NestedList spec={presentation}/>}</div>;
};
