import {ProgressiveCopy, surfaceEntrance} from "../lib/ProgressiveCopy";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {estimateWrappedLineCount} from "../lib/content-sizing";
import {ForegroundPlacement, getAlignedX, getForegroundZone} from "../lib/layout";
import {EASING} from "../lib/motion-tokens";
import {EDITABLE_ROOM_LIGHT_PALETTE} from "../lib/room-light-palette";

const FONT_FAMILY = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';

export type ConceptComparisonItem = {
  text: string;
  showAtInFrames?: number;
  emphasis?: boolean;
};

export type ConceptComparisonSide = {
  label: string;
  title: string;
  subtitle?: string;
  badge?: string;
  accentColor?: string;
  showAtInFrames?: number;
  items?: ConceptComparisonItem[];
};

export type ConceptComparisonCardsProps = {
  sides: [ConceptComparisonSide, ConceptComparisonSide];
  visualVariant?: "dualPeerCards" | "neonMirrorCompare" | "branchOutcomeRows";
  title?: string;
  eyebrow?: string;
  placement?: ForegroundPlacement;
  delayInFrames?: number;
  sideGapInFrames?: number;
  itemGapInFrames?: number;
  revealInFrames?: number;
  exitAtInFrames?: number;
  exitInFrames?: number;
};

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const ease = (value: number) => 1 - (1 - Math.max(0, Math.min(1, value))) ** 3;
const alpha = (hex: string, opacity: number) => /^#[\da-f]{6}$/i.test(hex)
  ? `${hex}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`
  : hex;
const textUnits = (value: string) => Array.from(value).reduce(
  (sum, character) => sum + (/^[\u0000-\u007f]$/.test(character) ? .54 : 1),
  0,
);

export type BranchOutcomeNode = {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  showAtInFrames: number;
  color: string;
};

export type BranchOutcomeRow = {
  condition: BranchOutcomeNode;
  outcome: BranchOutcomeNode;
  frame: {x: number; y: number; width: number; height: number};
  color: string;
};

export type BranchOutcomeRowsLayout = {
  unit: number;
  rows: [BranchOutcomeRow, BranchOutcomeRow];
  bounds: {x: number; y: number; width: number; height: number};
};

/** Final-state geometry shared by the renderer and the editor's visible box. */
export const getBranchOutcomeRowsLayout = ({
  width,
  height,
  placement,
  sides,
}: {
  width: number;
  height: number;
  placement: ForegroundPlacement;
  sides: [ConceptComparisonSide, ConceptComparisonSide];
}): BranchOutcomeRowsLayout => {
  const unit = Math.min(width / 2560, height / 1440);
  const baseZone = getForegroundZone({width, height, placement: "leftMiddle"});
  const targetZone = getForegroundZone({width, height, placement});
  const offsetX = targetZone.x + targetZone.width / 2 - baseZone.x - baseZone.width / 2;
  const offsetY = targetZone.y + targetZone.height / 2 - baseZone.y - baseZone.height / 2;
  const rows = sides.map((side, index) => {
    const outcomeItem = side.items?.[0];
    const conditionText = side.title;
    const outcomeText = outcomeItem?.text ?? "";
    const color = side.accentColor ?? (index === 0 ? "#4DB6FF" : "#F6BE62");
    const conditionWidth = Math.max(250, 100 + textUnits(conditionText) * 38) * unit;
    const outcomeWidth = Math.max(178, textUnits(outcomeText) * 37 + 8) * unit;
    const condition: BranchOutcomeNode = {
      x: 228 * unit + offsetX,
      y: (976 + index * 126) * unit + offsetY,
      width: conditionWidth,
      height: 74 * unit,
      text: conditionText,
      showAtInFrames: side.showAtInFrames ?? index * 18,
      color,
    };
    const outcome: BranchOutcomeNode = {
      x: (654 + Math.max(0, conditionWidth / unit - 250)) * unit + offsetX,
      y: condition.y,
      width: outcomeWidth,
      height: 74 * unit,
      text: outcomeText,
      showAtInFrames: Math.max(side.showAtInFrames ?? 0, outcomeItem?.showAtInFrames ?? side.showAtInFrames ?? 0),
      color,
    };
    return {
      condition,
      outcome,
      color,
      frame: {
        x: condition.x - 20 * unit,
        y: condition.y - 20 * unit,
        width: outcome.x + outcome.width - condition.x + 40 * unit,
        height: condition.height + 40 * unit,
      },
    };
  }) as [BranchOutcomeRow, BranchOutcomeRow];
  const boxes = rows.map((row) => row.frame);
  const padding = 6 * unit;
  const left = Math.min(...boxes.map((box) => box.x)) - padding;
  const top = Math.min(...boxes.map((box) => box.y)) - padding;
  const right = Math.max(...boxes.map((box) => box.x + box.width)) + padding;
  const bottom = Math.max(...boxes.map((box) => box.y + box.height)) + padding;
  return {unit, rows, bounds: {x: left, y: top, width: right - left, height: bottom - top}};
};

const BranchStateGlyph: React.FC<{
  kind: "check" | "plus";
  color: string;
  size: number;
  progress: number;
}> = ({kind, color, size, progress}) => {
  const draw = ease(progress);
  return <svg width={size} height={size} viewBox="0 0 68 68" style={{display: "block", overflow: "visible"}}>
    <circle cx="34" cy="34" r="27" fill={alpha(color, .09)} stroke={alpha(color, .72)} strokeWidth="3.8" opacity={draw}/>
    <circle cx="34" cy="34" r="31" fill="none" stroke={alpha(color, .18)} strokeWidth="2" strokeDasharray="4 7" opacity={draw}/>
    {kind === "check" ? <path d="M20 35.5 L29.2 44 L48.5 23.5" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - draw}/>
      : <><path d="M20 34 H48" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - draw}/><path d="M34 20 V48" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - draw}/></>}
  </svg>;
};

/**
 * Two equal local cards for a non-numeric A/B comparison. The motion and
 * surface grammar are adapted from RemotionUI Pricing Card, with all pricing,
 * CTA, winner, and full-page semantics removed.
 */
export const ConceptComparisonCards: React.FC<ConceptComparisonCardsProps> = ({
  sides,
  visualVariant = "dualPeerCards",
  title,
  eyebrow = "COMPARE",
  placement = "centerSafe",
  delayInFrames = 4,
  sideGapInFrames = 10,
  itemGapInFrames = 7,
  revealInFrames = 18,
  exitAtInFrames,
  exitInFrames = 14,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const zone = getForegroundZone({width, height, placement});
  const maxItems = Math.max(...sides.map((side) => Math.min(side.items?.length ?? 0, 5)));
  const baseCardWidth = 450;
  const titleSize = 54;
  const subtitleSize = 32;
  const maxTitleLines = Math.max(...sides.map((side) => estimateWrappedLineCount({text: side.title, fontSize: titleSize, availableWidth: baseCardWidth - 48})));
  const maxSubtitleLines = Math.max(...sides.map((side) => side.subtitle ? estimateWrappedLineCount({text: side.subtitle, fontSize: subtitleSize, availableWidth: baseCardWidth - 48}) : 0));
  const cardHeightBase = 24 + 22 + 9 + maxTitleLines * titleSize * 1.08 + 24;
  const auxiliaryHeightBase = (maxSubtitleLines ? 12 + maxSubtitleLines * 25 * 1.22 : 0) + (maxItems ? 14 + 12 + maxItems * 30 * 1.18 + Math.max(0, maxItems - 1) * 10 : 0);
  const baseHeight = (title ? 96 : 12) + cardHeightBase + auxiliaryHeightBase;
  const u = Math.max(
    0.76,
    Math.min(zone.width / 920, zone.height / Math.max(baseHeight, 1), 1.48),
  );
  const panelWidth = Math.min(zone.width, 920 * u);
  const panelHeight = baseHeight * u;
  const gap = 20 * u;
  const cardWidth = (panelWidth - gap) / 2;
  const exit =
    exitAtInFrames === undefined
      ? 0
      : interpolate(
          frame,
          [exitAtInFrames, exitAtInFrames + exitInFrames],
          [0, 1],
          {easing: EASING.exit, ...clamp},
        );

  if (visualVariant === "branchOutcomeRows") {
    const branchSides = sides.map((side, index) => ({
      ...side,
      showAtInFrames: side.showAtInFrames ?? delayInFrames + index * sideGapInFrames,
      items: (side.items ?? []).slice(0, 1).map((item) => ({
        ...item,
        showAtInFrames: item.showAtInFrames ?? (side.showAtInFrames ?? delayInFrames + index * sideGapInFrames) + revealInFrames,
      })),
    })) as [ConceptComparisonSide, ConceptComparisonSide];
    const layout = getBranchOutcomeRowsLayout({width, height, placement, sides: branchSides});
    const {unit: branchUnit, rows} = layout;

    return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT_FAMILY, opacity: 1 - exit, translate: `0 ${exit * 18 * branchUnit}px`}}>
      <svg data-connector-grammar="branchOutcomeRows" width={width} height={height} style={{position: "absolute", inset: 0, overflow: "visible", zIndex: 1}}>
        {rows.map((row, index) => {
          const conditionIn = ease(interpolate(frame, [row.condition.showAtInFrames, row.condition.showAtInFrames + Math.max(8, Math.round(fps * .3))], [0, 1], clamp));
          const connectorIn = ease(interpolate(frame, [row.outcome.showAtInFrames, row.outcome.showAtInFrames + Math.max(7, Math.round(fps * .24))], [0, 1], clamp));
          const collapsedRight = row.condition.x + row.condition.width + 20 * branchUnit;
          const targetRight = row.frame.x + row.frame.width;
          const currentRight = collapsedRight + (targetRight - collapsedRight) * connectorIn;
          const startX = row.condition.x + row.condition.width + 34 * branchUnit;
          const endX = row.outcome.x - 30 * branchUnit;
          const centerY = row.condition.y + row.condition.height / 2;
          return <g key={`branch-row-${index + 1}`} opacity={conditionIn}>
            <rect x={row.frame.x} y={row.frame.y} width={Math.max(0, currentRight - row.frame.x)} height={row.frame.height} rx={11 * branchUnit} fill="rgba(1,7,14,.45)" stroke={alpha(row.color, .58)} strokeWidth={1.3 * branchUnit}/>
            <path d={`M ${row.frame.x + 13 * branchUnit} ${row.frame.y + 2 * branchUnit} H ${Math.max(row.frame.x + 13 * branchUnit, currentRight - 13 * branchUnit)}`} stroke="rgba(214,236,255,.08)" strokeWidth={1}/>
            <g opacity={connectorIn} stroke={row.color} fill={row.color}>
              <path d={`M ${startX} ${centerY} L ${endX} ${centerY}`} fill="none" strokeWidth={1.6 * branchUnit} strokeDasharray={`${9 * branchUnit} ${13 * branchUnit}`} strokeDashoffset={(1 - connectorIn) * 22 * branchUnit} strokeLinecap="round"/>
              <circle cx={startX} cy={centerY} r={8.5 * branchUnit}/><circle cx={endX} cy={centerY} r={8.5 * branchUnit}/>
              <circle cx={startX} cy={centerY} r={11 * branchUnit} opacity=".13"/><circle cx={endX} cy={centerY} r={11 * branchUnit} opacity=".13"/>
            </g>
          </g>;
        })}
      </svg>
      {rows.flatMap((row, index) => {
        const conditionIn = surfaceEntrance(frame, row.condition.showAtInFrames, fps);
        const glyphIn = ease(interpolate(frame, [row.condition.showAtInFrames + Math.round(fps * .42), row.condition.showAtInFrames + Math.round(fps * .7)], [0, 1], clamp));
        const outcomeStart = row.outcome.showAtInFrames + Math.max(2, Math.round(fps * .1));
        const outcomeIn = surfaceEntrance(frame, outcomeStart, fps);
        return [
          <div key={`branch-condition-${index + 1}`} data-content-sized-surface="branch-condition" data-card-copy-structure="primary" data-editable-preserve-transparent="true" style={{position: "absolute", left: row.condition.x, top: row.condition.y, width: row.condition.width, height: row.condition.height, display: "flex", alignItems: "center", gap: 26 * branchUnit, color: "#F1F4F6", opacity: conditionIn, translate: `${(1 - conditionIn) * -10 * branchUnit}px 0`, boxSizing: "border-box", zIndex: 2}}>
            <span data-card-label="true" style={{width: 68 * branchUnit, height: 68 * branchUnit, flex: "0 0 auto", color: row.color}}><BranchStateGlyph kind={index === 0 ? "check" : "plus"} color={row.color} size={68 * branchUnit} progress={glyphIn}/></span>
            <span data-primary-text="true" style={{fontSize: 38 * branchUnit, fontWeight: 800, whiteSpace: "nowrap", textShadow: "0 2px 6px rgba(0,0,0,.6)"}}><ProgressiveCopy text={row.condition.text} startAt={row.condition.showAtInFrames} delaySeconds={0.72} beforeFrame={exitAtInFrames}/></span>
          </div>,
          <div key={`branch-outcome-${index + 1}`} data-content-sized-surface="branch-result" data-card-copy-structure="primary" data-editable-preserve-transparent="true" style={{position: "absolute", left: row.outcome.x, top: row.outcome.y, width: row.outcome.width, height: row.outcome.height, display: "flex", alignItems: "center", color: row.color, opacity: outcomeIn, translate: `${(1 - outcomeIn) * 11 * branchUnit}px 0`, boxSizing: "border-box", zIndex: 2}}>
            <span data-card-label="true" data-primary-text="true" style={{fontSize: 37 * branchUnit, fontWeight: 800, whiteSpace: "nowrap", textShadow: "0 2px 6px rgba(0,0,0,.6)"}}><ProgressiveCopy text={row.outcome.text} startAt={outcomeStart} delaySeconds={0.42} beforeFrame={exitAtInFrames}/></span>
          </div>,
        ];
      })}
    </AbsoluteFill>;
  }

  if (visualVariant === "neonMirrorCompare") {
    const cyanBlue = EDITABLE_ROOM_LIGHT_PALETTE.青蓝;
    const pink = cyanBlue;
    const deepPurple = cyanBlue;
    const leftSide = sides[0];
    const rightSide = sides[1];
    const leftItems = (leftSide.items ?? []).slice(0, 5);
    const rightItems = (rightSide.items ?? []).slice(0, 5);
    const pairCount = Math.max(leftItems.length, rightItems.length);
    const hasAuxiliary = Boolean(leftSide.subtitle || leftSide.badge || rightSide.subtitle || rightSide.badge);
    const mirrorBaseHeight = (title ? 84 : 0) + 108 + (hasAuxiliary ? 36 : 0) + pairCount * 78 + Math.max(0, pairCount - 1) * 14;
    const mirrorUnit = Math.max(0.68, Math.min(zone.width / 940, zone.height / Math.max(mirrorBaseHeight, 1), 1.46));
    const mirrorWidth = Math.min(zone.width, 940 * mirrorUnit);
    const mirrorHeight = mirrorBaseHeight * mirrorUnit;
    const centerGap = 54 * mirrorUnit;
    const sideWidth = (mirrorWidth - centerGap) / 2;
    const globalTitleHeight = title ? 84 * mirrorUnit : 0;
    const headerHeight = 108 * mirrorUnit;
    const auxiliaryHeight = hasAuxiliary ? 36 * mirrorUnit : 0;
    const rowHeight = 78 * mirrorUnit;
    const rowGap = 14 * mirrorUnit;
    const leftStart = leftSide.showAtInFrames ?? delayInFrames;
    const rightStart = rightSide.showAtInFrames ?? delayInFrames + sideGapInFrames;
    const leftIn = surfaceEntrance(frame, leftStart, fps);
    const rightIn = surfaceEntrance(frame, rightStart, fps);
    const spineStart = Math.min(leftStart, rightStart) + 8;
    const spineIn = interpolate(frame, [spineStart, spineStart + Math.max(18, fps * 0.6)], [0, 1], {easing: EASING.editorial, ...clamp});
    const contentTop = zone.y + Math.max((zone.height - mirrorHeight) / 2, 0);
    const rowsTop = globalTitleHeight + headerHeight + auxiliaryHeight + 16 * mirrorUnit;

    return (
      <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT_FAMILY}}>
        <div style={{position: "absolute", left: getAlignedX({zone, itemWidth: mirrorWidth, placement}), top: contentTop, width: mirrorWidth, height: mirrorHeight, opacity: 1 - exit, translate: `0 ${exit * 18 * mirrorUnit}px`}}>
          {title ? (
            <div style={{height: globalTitleHeight}}>
              <div style={{color: pink.hex, fontSize: Math.max(15 * mirrorUnit, 11), fontWeight: 820, letterSpacing: "0.12em", textShadow: `0 0 16px rgba(${pink.rgb},0.52)`}}><ProgressiveCopy text={eyebrow} startAt={delayInFrames} delaySeconds={0.05} beforeFrame={exitAtInFrames}/></div>
              <div style={{marginTop: 7 * mirrorUnit, color: "#FFFFFF", fontSize: Math.max(39 * mirrorUnit, 25), lineHeight: 1, fontWeight: 900, letterSpacing: "-0.04em"}}><ProgressiveCopy text={title} startAt={delayInFrames} delaySeconds={0.16} beforeFrame={exitAtInFrames}/></div>
            </div>
          ) : null}

          <div style={{position: "absolute", left: 0, top: globalTitleHeight, width: sideWidth, height: headerHeight, boxSizing: "border-box", padding: `${21 * mirrorUnit}px ${27 * mirrorUnit}px`, borderRadius: 27 * mirrorUnit, background: `linear-gradient(145deg, rgba(0,0,0,0.76), rgba(${cyanBlue.rgb},0.14))`, backdropFilter: `blur(${18 * mirrorUnit}px) saturate(1.18)`, border: `1px solid rgba(${cyanBlue.rgb},0.56)`, boxShadow: `inset 0 1px rgba(255,255,255,0.10), 0 ${18 * mirrorUnit}px ${38 * mirrorUnit}px rgba(0,0,0,0.28), 0 0 ${30 * mirrorUnit}px rgba(${cyanBlue.rgb},0.18)`, opacity: leftIn, translate: `${(1 - leftIn) * -44 * mirrorUnit}px 0`}}>
            <div style={{color: cyanBlue.hex, fontSize: Math.max(14 * mirrorUnit, 10), fontWeight: 820, letterSpacing: "0.1em", textShadow: `0 0 12px rgba(${cyanBlue.rgb},0.50)`}}><ProgressiveCopy text={leftSide.label} startAt={leftStart} delaySeconds={0.42} beforeFrame={exitAtInFrames}/></div>
            <div style={{marginTop: 7 * mirrorUnit, color: "#FFFFFF", fontSize: Math.max(37 * mirrorUnit, 24), lineHeight: 1, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}><ProgressiveCopy text={leftSide.title} startAt={leftStart} delaySeconds={0.72} beforeFrame={exitAtInFrames}/></div>
          </div>
          <div style={{position: "absolute", right: 0, top: globalTitleHeight, width: sideWidth, height: headerHeight, boxSizing: "border-box", padding: `${21 * mirrorUnit}px ${27 * mirrorUnit}px`, borderRadius: 27 * mirrorUnit, background: `linear-gradient(145deg, rgba(0,0,0,0.76), rgba(${pink.rgb},0.14))`, backdropFilter: `blur(${18 * mirrorUnit}px) saturate(1.18)`, border: `1px solid rgba(${pink.rgb},0.58)`, boxShadow: `inset 0 1px rgba(255,255,255,0.10), 0 ${18 * mirrorUnit}px ${38 * mirrorUnit}px rgba(0,0,0,0.28), 0 0 ${30 * mirrorUnit}px rgba(${pink.rgb},0.18)`, opacity: rightIn, translate: `${(1 - rightIn) * 44 * mirrorUnit}px 0`}}>
            <div style={{color: pink.hex, fontSize: Math.max(14 * mirrorUnit, 10), fontWeight: 820, letterSpacing: "0.1em", textShadow: `0 0 12px rgba(${pink.rgb},0.52)`}}><ProgressiveCopy text={rightSide.label} startAt={rightStart} delaySeconds={0.42} beforeFrame={exitAtInFrames}/></div>
            <div style={{marginTop: 7 * mirrorUnit, color: "#FFFFFF", fontSize: Math.max(37 * mirrorUnit, 24), lineHeight: 1, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}><ProgressiveCopy text={rightSide.title} startAt={rightStart} delaySeconds={0.72} beforeFrame={exitAtInFrames}/></div>
          </div>

          {hasAuxiliary ? (
            <div data-auxiliary-text="true" style={{position: "absolute", left: 0, right: 0, top: globalTitleHeight + headerHeight + 6 * mirrorUnit, height: auxiliaryHeight, display: "grid", gridTemplateColumns: `${sideWidth}px ${centerGap}px ${sideWidth}px`, alignItems: "center", fontSize: Math.max(16 * mirrorUnit, 11), fontWeight: 700}}>
              <div style={{color: "rgba(255,255,255,0.66)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}><ProgressiveCopy text={[leftSide.badge, leftSide.subtitle].filter(Boolean).join(" · ")} startAt={leftStart} delaySeconds={1.12} beforeFrame={exitAtInFrames}/></div>
              <div />
              <div style={{color: "rgba(255,255,255,0.68)", textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}><ProgressiveCopy text={[rightSide.badge, rightSide.subtitle].filter(Boolean).join(" · ")} startAt={rightStart} delaySeconds={1.12} beforeFrame={exitAtInFrames}/></div>
            </div>
          ) : null}

          <div style={{position: "absolute", left: mirrorWidth / 2 - mirrorUnit, top: globalTitleHeight + 26 * mirrorUnit, width: 2 * mirrorUnit, height: mirrorHeight - globalTitleHeight - 38 * mirrorUnit, background: deepPurple.hex, boxShadow: `0 0 ${20 * mirrorUnit}px rgba(${deepPurple.rgb},0.58)`, opacity: spineIn, scale: `1 ${spineIn}`, transformOrigin: "top center"}} />
          <div style={{position: "absolute", left: mirrorWidth / 2 - 29 * mirrorUnit, top: globalTitleHeight + 16 * mirrorUnit, width: 58 * mirrorUnit, height: 58 * mirrorUnit, display: "grid", placeItems: "center", borderRadius: "50%", color: "#FFFFFF", background: deepPurple.hex, border: `${5 * mirrorUnit}px solid rgba(10,10,16,0.78)`, boxSizing: "border-box", boxShadow: `0 0 ${28 * mirrorUnit}px rgba(${deepPurple.rgb},0.55)`, fontSize: Math.max(16 * mirrorUnit, 11), fontWeight: 950, opacity: spineIn, scale: 0.75 + spineIn * 0.25}}>VS</div>

          {Array.from({length: pairCount}).map((_, index) => {
            const leftItem = leftItems[index];
            const rightItem = rightItems[index];
            const leftItemStart = leftItem?.showAtInFrames ?? leftStart + revealInFrames + index * itemGapInFrames;
            const rightItemStart = rightItem?.showAtInFrames ?? rightStart + revealInFrames + index * itemGapInFrames;
            const leftItemIn = leftItem ? interpolate(frame, [leftItemStart, leftItemStart + Math.max(1, Math.round(fps * .32))], [0, 1], {easing: EASING.enter, ...clamp}) : 0;
            const rightItemIn = rightItem ? interpolate(frame, [rightItemStart, rightItemStart + Math.max(1, Math.round(fps * .32))], [0, 1], {easing: EASING.enter, ...clamp}) : 0;
            const nodeIn = Math.max(leftItemIn, rightItemIn);
            const top = rowsTop + index * (rowHeight + rowGap);
            return (
              <div key={`mirror-pair-${index}`} style={{position: "absolute", left: 0, right: 0, top, height: rowHeight, display: "grid", gridTemplateColumns: `${sideWidth}px ${centerGap}px ${sideWidth}px`, alignItems: "center"}}>
                <div style={{height: rowHeight, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: `0 ${26 * mirrorUnit}px`, boxSizing: "border-box", borderRadius: 21 * mirrorUnit, color: "#FFFFFF", background: `linear-gradient(90deg, rgba(0,0,0,0.54), rgba(${cyanBlue.rgb},0.16))`, backdropFilter: `blur(${15 * mirrorUnit}px)`, border: `1px solid rgba(${cyanBlue.rgb},0.34)`, boxShadow: `inset 0 1px rgba(255,255,255,0.07), 0 0 ${22 * mirrorUnit}px rgba(${cyanBlue.rgb},0.08)`, fontSize: Math.max(27 * mirrorUnit, 18), fontWeight: leftItem?.emphasis ? 900 : 800, opacity: leftItemIn, translate: `${(1 - leftItemIn) * -34 * mirrorUnit}px 0`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}><ProgressiveCopy text={leftItem?.text} startAt={leftItemStart} delaySeconds={0.42} beforeFrame={exitAtInFrames}/></div>
                <div style={{justifySelf: "center", width: 15 * mirrorUnit, height: 15 * mirrorUnit, borderRadius: "50%", background: deepPurple.hex, border: `${4 * mirrorUnit}px solid rgba(0,0,0,0.82)`, boxSizing: "border-box", boxShadow: `0 0 ${(12 + nodeIn * 17) * mirrorUnit}px rgba(${deepPurple.rgb},${0.3 + nodeIn * 0.34})`, opacity: nodeIn, scale: 0.75 + nodeIn * 0.25}} />
                <div style={{height: rowHeight, display: "flex", alignItems: "center", padding: `0 ${26 * mirrorUnit}px`, boxSizing: "border-box", borderRadius: 21 * mirrorUnit, color: "#FFFFFF", background: `linear-gradient(90deg, rgba(${pink.rgb},0.16), rgba(0,0,0,0.54))`, backdropFilter: `blur(${15 * mirrorUnit}px)`, border: `1px solid rgba(${pink.rgb},0.35)`, boxShadow: `inset 0 1px rgba(255,255,255,0.07), 0 0 ${22 * mirrorUnit}px rgba(${pink.rgb},0.08)`, fontSize: Math.max(27 * mirrorUnit, 18), fontWeight: rightItem?.emphasis ? 900 : 830, opacity: rightItemIn, translate: `${(1 - rightItemIn) * 34 * mirrorUnit}px 0`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}><ProgressiveCopy text={rightItem?.text} startAt={rightItemStart} delaySeconds={0.42} beforeFrame={exitAtInFrames}/></div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      data-foreground-overlay-root="true"
      style={{
        position: "absolute",
        inset: 0,
        background: "transparent",
        pointerEvents: "none",
        fontFamily: FONT_FAMILY,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: getAlignedX({zone, itemWidth: panelWidth, placement}),
          top: zone.y + (zone.height - panelHeight) / 2,
          width: panelWidth,
          opacity: 1 - exit,
          transform: `translateY(${exit * 18 * u}px)`,
        }}
      >
        {title ? (
          <div style={{marginBottom: 18 * u}}>
            <div
              style={{
                color: "#E8B86D",
                fontSize: 16 * u,
                fontWeight: 850,
                letterSpacing: "0.12em",
              }}
            >
              <ProgressiveCopy text={eyebrow} startAt={delayInFrames} delaySeconds={0.05} beforeFrame={exitAtInFrames}/>
            </div>
            <div
              style={{
                marginTop: 5 * u,
                color: "#F8FAFC",
                fontSize: 38 * u,
                fontWeight: 900,
                lineHeight: 1.05,
              }}
            >
              <ProgressiveCopy text={title} startAt={delayInFrames} delaySeconds={0.16} beforeFrame={exitAtInFrames}/>
            </div>
          </div>
        ) : null}

        <div style={{display: "flex", gap}}>
          {sides.map((side, sideIndex) => {
            const accent = side.accentColor ?? (sideIndex === 0 ? "#70A5EB" : "#E8B86D");
            const sideStart = side.showAtInFrames ?? delayInFrames + sideIndex * sideGapInFrames;
            const sideProgress = interpolate(
              frame,
              [sideStart, sideStart + Math.max(1, Math.round(fps * .32))],
              [0, 1],
              {easing: EASING.editorial, ...clamp},
            );
            const lift = spring({
              frame: frame - sideStart,
              fps,
              config: {damping: 18, stiffness: 132, mass: 0.82},
            });
            const visibleItems = (side.items ?? []).slice(0, 5);

            return (
              <div
                key={`${side.label}-${sideIndex}`}
                style={{
                  width: cardWidth,
                  position: "relative",
                  opacity: sideProgress,
                  transform: `translateY(${(1 - lift) * 20 * u}px)`,
                }}
              >
                <div data-content-sized-surface="concept-comparison-peer" data-card-copy-structure="label-primary" style={{height: cardHeightBase * u, padding: 24 * u, boxSizing: "border-box", borderRadius: 24 * u, position: "relative", overflow: "hidden", background: "rgba(15,17,24,0.70)", border: `1px solid ${accent}66`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 ${20 * u}px ${50 * u}px rgba(0,0,0,0.24)`, clipPath: `inset(0 0 ${(1 - sideProgress) * 100}% 0 round ${24 * u}px)`}}>
                  <div style={{position: "absolute", inset: 0, background: `radial-gradient(115% 76% at 8% 0%, ${accent}28, transparent 64%)`}} />
                  <div style={{position: "relative"}}>
                    <div data-card-label="true" style={{display: "flex", alignItems: "center", gap: 9 * u}}>
                      <span
                        style={{
                          color: "rgba(248,250,252,0.72)",
                        fontSize: 18 * u,
                        fontWeight: 820,
                        letterSpacing: "0.04em",
                      }}
                      >
                        <ProgressiveCopy text={side.label} startAt={sideStart} delaySeconds={0.42} beforeFrame={exitAtInFrames}/>
                      </span>
                    </div>
                    <div data-primary-text="true" style={{marginTop: 9 * u, color: "#F8FAFC", fontSize: titleSize * u, fontWeight: 920, lineHeight: 1.08, overflowWrap: "anywhere"}}><ProgressiveCopy text={side.title} startAt={sideStart} delaySeconds={0.72} beforeFrame={exitAtInFrames}/></div>
                  </div>
                </div>
                {(side.subtitle || side.badge) ? <div data-auxiliary-text="true" style={{marginTop: 12 * u, display: "flex", alignItems: "baseline", gap: 9 * u, color: "rgba(226,232,240,0.68)", fontSize: 25 * u, fontWeight: 620, lineHeight: 1.22, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>
                  {side.badge ? <span style={{flex: "0 0 auto", color: accent, fontSize: 17 * u, fontWeight: 780}}><ProgressiveCopy text={side.badge} startAt={sideStart} delaySeconds={1.12} beforeFrame={exitAtInFrames}/></span> : null}
                  {side.subtitle ? <span style={{minWidth: 0, overflow: "hidden", textOverflow: "ellipsis"}}><ProgressiveCopy text={side.subtitle} startAt={sideStart} delaySeconds={1.12} beforeFrame={exitAtInFrames}/></span> : null}
                </div> : null}
                {visibleItems.length > 0 ? (
                    <div
                      style={{
                        marginTop: 14 * u,
                        paddingTop: 12 * u,
                        borderTop: "1px solid rgba(255,255,255,0.12)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 9 * u,
                      }}
                    >
                      {visibleItems.map((item, itemIndex) => {
                        const itemStart =
                          item.showAtInFrames ??
                          sideStart + revealInFrames + itemIndex * itemGapInFrames;
                        const itemIn = interpolate(
                          frame,
                          [itemStart, itemStart + 12],
                          [0, 1],
                          {easing: EASING.enter, ...clamp},
                        );
                        return (
                          <div
                            key={`${item.text}-${itemIndex}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 9 * u,
                              opacity: itemIn,
                              transform: `translateX(${(1 - itemIn) * -10 * u}px)`,
                            }}
                          >
                            <span
                              style={{
                                width: 15 * u,
                                height: 15 * u,
                                borderRadius: 999,
                                flex: "0 0 auto",
                                background: item.emphasis ? accent : `${accent}35`,
                                border: `2px solid ${accent}`,
                                boxShadow: item.emphasis ? `0 0 ${14 * u}px ${accent}55` : undefined,
                              }}
                            />
                            <span
                              style={{
                                color: item.emphasis ? "#FFFFFF" : "rgba(248,250,252,0.84)",
                                fontSize: 30 * u,
                                fontWeight: item.emphasis ? 840 : 700,
                                lineHeight: 1.18,
                              }}
                            >
                              <ProgressiveCopy text={item.text} startAt={itemStart} delaySeconds={0.42} beforeFrame={exitAtInFrames}/>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
