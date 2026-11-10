import React from "react";
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {ForegroundPlacement, getForegroundZone} from "../lib/layout";
import {SemanticIcon, SemanticIconName} from "../lib/semantic-icons";

const FONT = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const ease = (value: number) => 1 - (1 - Math.max(0, Math.min(1, value))) ** 3;
const alpha = (hex: string, opacity: number) => /^#[\da-f]{6}$/i.test(hex)
  ? `${hex}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`
  : hex;
const textUnits = (value: string) => Array.from(value).reduce(
  (sum, character) => sum + (/^[\u0000-\u007f]$/.test(character) ? .54 : 1),
  0,
);

export type IconClassificationCategory = {
  label: string;
  icon?: SemanticIconName;
  showAtInFrames: number;
  accentColor?: string;
};

export type IconClassificationSummary = {
  label: string;
  count?: number;
  icon?: SemanticIconName;
  showAtInFrames: number;
};

export type IconClassificationLayout = {
  unit: number;
  categories: Array<IconClassificationCategory & {x: number; y: number; width: number; height: number}>;
  summary: IconClassificationSummary & {x: number; y: number; width: number; height: number};
  bounds: {x: number; y: number; width: number; height: number};
};

/** Final-state geometry used by both rendering and editor visible bounds. */
export const getIconClassificationLayout = ({
  width,
  height,
  placement,
  categoryItems,
  summary,
}: {
  width: number;
  height: number;
  placement: ForegroundPlacement;
  categoryItems: IconClassificationCategory[];
  summary: IconClassificationSummary;
}): IconClassificationLayout => {
  const unit = Math.min(width / 2560, height / 1440);
  const categories = categoryItems.slice(0, 4);
  const cardWidthBase = Math.max(222, ...categories.map((item) => textUnits(item.label) * 36 + 54));
  const baseLeftZone = getForegroundZone({width, height, placement: "leftMiddle"});
  const targetZone = getForegroundZone({width, height, placement});
  const offsetX = targetZone.x + targetZone.width / 2 - baseLeftZone.x - baseLeftZone.width / 2;
  const offsetY = targetZone.y + targetZone.height / 2 - baseLeftZone.y - baseLeftZone.height / 2;
  const cardWidth = cardWidthBase * unit;
  const cardHeight = 244 * unit;
  const gap = 64 * unit;
  const startX = 172 * unit + offsetX;
  const categoryY = 314 * unit + offsetY;
  const categoryLayouts = categories.map((item, index) => ({
    ...item,
    x: startX + index * (cardWidth + gap),
    y: categoryY,
    width: cardWidth,
    height: cardHeight,
  }));
  const count = Math.max(1, categoryLayouts.length);
  const categorySpan = count * cardWidth + (count - 1) * gap;
  const categoryCenter = startX + categorySpan / 2;
  const summaryLayout = {
    ...summary,
    x: categoryCenter - 153 * unit,
    y: 638 * unit + offsetY,
    width: Math.max(376, textUnits(summary.label) * 40 + 32) * unit,
    height: 292 * unit,
  };
  const boxes = [...categoryLayouts, summaryLayout];
  const padding = 6 * unit;
  const left = Math.min(...boxes.map((box) => box.x)) - padding;
  const top = Math.min(...boxes.map((box) => box.y)) - padding;
  const right = Math.max(...boxes.map((box) => box.x + box.width)) + padding;
  const bottom = Math.max(...boxes.map((box) => box.y + box.height)) + padding;
  return {
    unit,
    categories: categoryLayouts,
    summary: summaryLayout,
    bounds: {x: left, y: top, width: right - left, height: bottom - top},
  };
};

export const IconClassificationHierarchy: React.FC<{
  categoryItems: IconClassificationCategory[];
  summary: IconClassificationSummary;
  placement: ForegroundPlacement;
  accentColor: string;
  exitAtInFrames?: number;
  exitInFrames?: number;
}> = ({categoryItems, summary, placement, accentColor, exitAtInFrames, exitInFrames = 14}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const layout = getIconClassificationLayout({width, height, placement, categoryItems, summary});
  const {unit, categories, summary: summaryLayout} = layout;
  const minimumCategoryGap = Math.max(5, Math.round(fps * .2));
  let previousAt = Number.NEGATIVE_INFINITY;
  const categorySchedule = categories.map((category) => {
    const at = Math.max(category.showAtInFrames, previousAt + minimumCategoryGap);
    previousAt = at;
    return at;
  });
  const finalCategoryAt = categorySchedule.at(-1) ?? summaryLayout.showAtInFrames - minimumCategoryGap;
  const summaryAt = Math.max(summaryLayout.showAtInFrames, finalCategoryAt + Math.max(4, Math.round(fps * .16)));
  const routeStart = Math.max(finalCategoryAt + 2, summaryAt - Math.max(4, Math.round(fps * .17)));
  const routeEnd = summaryAt + Math.max(6, Math.round(fps * .22));
  const routeProgress = ease(interpolate(frame, [routeStart, routeEnd], [0, 1], clamp));
  const libraryProgress = ease(interpolate(frame, [summaryAt, summaryAt + Math.max(18, Math.round(fps * .64))], [0, 1], clamp));
  const countProgress = ease(interpolate(frame, [summaryAt + 5, summaryAt + 11], [0, 1], clamp));
  const labelProgress = ease(interpolate(frame, [summaryAt + 8, summaryAt + 15], [0, 1], clamp));
  const exit = exitAtInFrames === undefined
    ? 0
    : interpolate(frame, [exitAtInFrames, exitAtInFrames + exitInFrames], [0, 1], clamp);
  const targetX = summaryLayout.x + 153 * unit;
  const targetY = summaryLayout.y;
  const bottomY = Math.max(summaryLayout.y - 46 * unit, ...categories.map((category) => category.y + category.height));
  const railY = bottomY + Math.max(18 * unit, Math.min(46 * unit, (targetY - bottomY) * .55));
  const categoryCenters = categories.map((category) => category.x + category.width / 2);
  const minX = Math.min(...categoryCenters, targetX);
  const maxX = Math.max(...categoryCenters, targetX);

  return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, pointerEvents: "none", background: "transparent", fontFamily: FONT, opacity: 1 - exit, translate: `0 ${(exit * 22 * unit)}px`}}>
    <svg width={width} height={height} style={{position: "absolute", inset: 0, overflow: "visible"}}>
      <g fill="none" stroke={accentColor} strokeWidth={2 * unit} strokeLinecap="round" strokeLinejoin="round">
        <path d={`M ${minX} ${railY} H ${maxX}`} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - routeProgress} opacity={routeProgress}/>
        {categories.map((category, index) => {
          const drop = ease(interpolate(frame, [categorySchedule[index] + 4, summaryAt + 3], [0, 1], clamp));
          return <path key={category.label} d={`M ${category.x + category.width / 2} ${category.y + category.height + 5 * unit} V ${railY}`} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - drop} opacity={drop}/>;
        })}
        <path d={`M ${targetX} ${railY} V ${targetY - 3 * unit}`} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - routeProgress} opacity={routeProgress}/>
        <circle cx={targetX} cy={railY} r={2.5 * unit} fill={accentColor} stroke="none" opacity={routeProgress}/>
      </g>
    </svg>

    <div data-content-sized-surface="scene-library" data-card-copy-structure="primary" style={{position: "absolute", left: summaryLayout.x, top: summaryLayout.y, width: summaryLayout.width, height: summaryLayout.height, color: "#F1F4F6", opacity: Math.min(1, libraryProgress * 1.7)}}>
      <div style={{position: "absolute", left: 0, top: 0, width: 302 * unit, height: 245 * unit}}>
        <SemanticIcon name={summaryLayout.icon ?? "sceneLibrary"} color={accentColor} size={245 * unit} progress={libraryProgress} id="icon-classification-library"/>
      </div>
      {summaryLayout.count !== undefined ? <div data-card-label="true" style={{position: "absolute", left: 294 * unit, top: 8 * unit, minWidth: 70 * unit, height: 66 * unit, padding: `0 ${5 * unit}px`, border: `${1.5 * unit}px solid ${alpha(accentColor, .8)}`, borderRadius: 8 * unit, background: "linear-gradient(135deg, rgba(9,23,39,.70), rgba(5,12,21,.50))", color: accentColor, fontFamily: '"Segoe UI", Arial, sans-serif', fontSize: 44 * unit, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", opacity: countProgress, scale: .9 + countProgress * .1, textShadow: `0 0 ${9 * unit}px ${alpha(accentColor, .2)}`}}>{summaryLayout.count}</div> : null}
      <div data-primary-text="true" style={{position: "absolute", left: 0, top: 245 * unit, width: 304 * unit, textAlign: "center", fontSize: 40 * unit, lineHeight: 1.1, letterSpacing: 1.5 * unit, fontWeight: 800, whiteSpace: "nowrap", opacity: labelProgress, translate: `0 ${(1 - labelProgress) * 7 * unit}px`, textShadow: `0 ${2 * unit}px ${8 * unit}px rgba(0,0,0,.67)`}}>{summaryLayout.label}</div>
    </div>

    {categories.map((category, index) => {
      const revealAt = categorySchedule[index];
      const cardIn = Math.min(1, spring({frame: frame - revealAt, fps, config: {damping: 19, stiffness: 145, mass: .78}}));
      const iconIn = ease(interpolate(frame, [revealAt + 2, revealAt + Math.max(12, Math.round(fps * .44))], [0, 1], clamp));
      const copyIn = ease(interpolate(frame, [revealAt + 7, revealAt + Math.max(14, Math.round(fps * .48))], [0, 1], clamp));
      const color = category.accentColor ?? accentColor;
      return <div key={`${category.label}-${index}`} data-content-sized-surface="semantic-category" data-card-copy-structure="primary" style={{position: "absolute", left: category.x, top: category.y, width: category.width, height: category.height, borderRadius: 17 * unit, background: "linear-gradient(135deg, rgba(3,9,17,.62), rgba(4,11,21,.32))", border: `${1.6 * unit}px solid ${alpha(color, .7)}`, boxShadow: `inset 0 ${unit}px ${2 * unit}px rgba(209,237,255,.13), 0 ${7 * unit}px ${20 * unit}px rgba(0,0,0,.13)`, transform: `translateY(${(1 - cardIn) * 14 * unit}px) scale(${.96 + cardIn * .04})`, opacity: cardIn, display: "flex", flexDirection: "column", alignItems: "center", boxSizing: "border-box", color: "#F1F4F6"}}>
        <div style={{marginTop: 36 * unit, height: 126 * unit}}><SemanticIcon name={category.icon ?? "layers"} color={color} size={124 * unit} progress={iconIn}/></div>
        <div data-primary-text="true" style={{marginTop: 14 * unit, fontSize: 36 * unit, fontWeight: 800, lineHeight: 1.45, whiteSpace: "nowrap", opacity: copyIn, translate: `0 ${(1 - copyIn) * 7 * unit}px`, textShadow: "0 2px 5px rgba(0,0,0,.53)"}}>{category.label}</div>
      </div>;
    })}
  </AbsoluteFill>;
};
