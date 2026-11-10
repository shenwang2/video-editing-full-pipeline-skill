import React from "react";
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {CODE_THEMES} from "../lib/code-syntax";
import {estimateWrappedLineCount} from "../lib/content-sizing";
import {ForegroundPlacement, getAlignedX, getForegroundZone} from "../lib/layout";
import {EASING} from "../lib/motion-tokens";
import {EDITABLE_ROOM_LIGHT_PALETTE} from "../lib/room-light-palette";
import {SemanticIconName} from "../lib/semantic-icons";
import {IconClassificationHierarchy, IconClassificationCategory, IconClassificationSummary} from "./IconClassificationHierarchy";

const FONT = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
export type HierarchyChild = {label?: string; title: string; detail?: string; showAtInFrames: number; accentColor?: string};
export type HierarchyTreeProps = {
  rootTitle?: string;
  rootLabel?: string;
  rootShowAtInFrames?: number;
  children?: HierarchyChild[];
  visualVariant?: "balancedTree" | "radialHub" | "iconClassification";
  categoryItems?: IconClassificationCategory[];
  summary?: IconClassificationSummary;
  /** Compatibility field for projects created by the approved reference trial. */
  libraryLabel?: string;
  placement?: ForegroundPlacement;
  accentColor?: string;
  theme?: "dark" | "light";
  exitAtInFrames?: number;
  exitInFrames?: number;
};

export const HierarchyTree: React.FC<HierarchyTreeProps> = ({rootTitle = "一个整体", rootLabel = "整体", rootShowAtInFrames = 0, children = [], visualVariant = "balancedTree", categoryItems = [], summary, libraryLabel, placement = "centerSafe", accentColor = "#E8B86D", theme = "dark", exitAtInFrames, exitInFrames = 14}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  if (visualVariant === "iconClassification") {
    const legacySummary = children[0];
    const parsedCount = legacySummary?.title.match(/\d+/)?.[0];
    return <IconClassificationHierarchy
      categoryItems={categoryItems}
      summary={summary ?? {
        label: libraryLabel ?? legacySummary?.detail ?? legacySummary?.title ?? "分类库",
        count: parsedCount ? Number(parsedCount) : undefined,
        icon: "sceneLibrary" as SemanticIconName,
        showAtInFrames: legacySummary?.showAtInFrames ?? rootShowAtInFrames + Math.max(18, Math.round(fps * .6)),
      }}
      placement={placement}
      accentColor={accentColor}
      exitAtInFrames={exitAtInFrames}
      exitInFrames={exitInFrames}
    />;
  }
  const zone = getForegroundZone({width, height, placement});
  const palette = CODE_THEMES[theme];
  const visible = children.slice(0, 4);
  const baseWidth = 920;
  const childTitleLines = Math.max(1, ...visible.map((child) => estimateWrappedLineCount({text: child.title, fontSize: 27, availableWidth: 182})));
  const childCardHeightBase = 18 + 16 + 8 + childTitleLines * 27 * 1.05 + 18;
  const hasChildDetail = visible.some((child) => Boolean(child.detail));
  const baseHeight = 216 + childCardHeightBase + (hasChildDetail ? 38 : 0);
  const u = Math.max(0.65, Math.min(zone.width / baseWidth, zone.height / baseHeight, 1.55));
  const panelWidth = baseWidth * u;
  const panelHeight = baseHeight * u;
  const x = getAlignedX({zone, itemWidth: panelWidth, placement});
  const y = zone.y + (zone.height - panelHeight) / 2;
  const rootWidth = 300 * u;
  const rootHeight = 112 * u;
  const rootX = (panelWidth - rootWidth) / 2;
  const branchY = 180 * u;
  const childWidth = Math.min(210 * u, (panelWidth - 24 * u * Math.max(0, visible.length - 1)) / Math.max(1, visible.length));
  const childGap = visible.length > 1 ? (panelWidth - childWidth * visible.length) / (visible.length - 1) : 0;
  const centers = visible.map((_, index) => index * (childWidth + childGap) + childWidth / 2);
  const rootIn = spring({frame: frame - rootShowAtInFrames, fps, config: {damping: 18, stiffness: 150, mass: 0.8}});
  const firstChildAt = visible.length > 0
    ? Math.min(...visible.map((child) => child.showAtInFrames))
    : rootShowAtInFrames + 18;
  // A child may be spoken on the same beat as the root. Keep the interpolation
  // range increasing instead of producing an invalid [root + 6, childAt] pair.
  const trunkStart = Math.min(rootShowAtInFrames + 6, firstChildAt);
  const trunkEnd = Math.max(trunkStart + 1, firstChildAt);
  const trunkIn = interpolate(frame, [trunkStart, trunkEnd], [0, 1], {...clamp, easing: EASING.editorial});
  const dropsIn = interpolate(frame, [firstChildAt - 3, firstChildAt + 10], [0, 1], {...clamp, easing: EASING.editorial});
  const exit = exitAtInFrames === undefined ? 0 : interpolate(frame, [exitAtInFrames, exitAtInFrames + exitInFrames], [0, 1], {...clamp, easing: EASING.exit});
  const leftCenter = centers[0] ?? panelWidth / 2;
  const rightCenter = centers.at(-1) ?? panelWidth / 2;

  if (visualVariant === "radialHub") {
    const rootColor = EDITABLE_ROOM_LIGHT_PALETTE.深紫;
    const childColors = Array.from({length: 4}, () => rootColor);
    const radialBaseWidth = 920;
    const radialBaseHeight = 440;
    const ru = Math.max(0.62, Math.min(zone.width / radialBaseWidth, zone.height / radialBaseHeight, 1.46));
    const radialWidth = radialBaseWidth * ru;
    const radialHeight = radialBaseHeight * ru;
    const radialX = getAlignedX({zone, itemWidth: radialWidth, placement});
    const radialY = zone.y + Math.max(0, (zone.height - radialHeight) / 2);
    const rootSize = 180 * ru;
    const cardWidth = 220 * ru;
    const cardHeight = 86 * ru;
    const rootCenterX = radialWidth / 2;
    const rootCenterY = radialHeight / 2;
    const radialChildren = visible.slice(0, 4);
    const layouts = radialChildren.length >= 4
      ? [{x: 0, y: 18}, {x: radialWidth - cardWidth, y: 18}, {x: 0, y: radialHeight - cardHeight - 40 * ru}, {x: radialWidth - cardWidth, y: radialHeight - cardHeight - 40 * ru}]
      : radialChildren.length === 3
        ? [{x: 0, y: 30 * ru}, {x: radialWidth - cardWidth, y: 30 * ru}, {x: (radialWidth - cardWidth) / 2, y: radialHeight - cardHeight - 30 * ru}]
        : radialChildren.length === 2
          ? [{x: 0, y: (radialHeight - cardHeight) / 2}, {x: radialWidth - cardWidth, y: (radialHeight - cardHeight) / 2}]
          : [{x: (radialWidth - cardWidth) / 2, y: radialHeight - cardHeight - 24 * ru}];

    return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
      <div style={{position: "absolute", left: radialX, top: radialY, width: radialWidth, height: radialHeight, opacity: 1 - exit, translate: `0 ${exit * 22 * ru}px`}}>
        <svg width={radialWidth} height={radialHeight} viewBox={`0 0 ${radialWidth} ${radialHeight}`} style={{position: "absolute", inset: 0, overflow: "visible"}}>
          {radialChildren.map((child, index) => {
            const layout = layouts[index];
            const childCenterX = layout.x + cardWidth / 2;
            const childCenterY = layout.y + cardHeight / 2;
            const bendX = childCenterX < rootCenterX ? rootCenterX - 135 * ru : rootCenterX + 135 * ru;
            const progress = interpolate(frame, [child.showAtInFrames - 12, child.showAtInFrames + 6], [0, 1], {...clamp, easing: EASING.editorial});
            const color = childColors[index];
            const path = `M ${rootCenterX} ${rootCenterY} C ${bendX} ${rootCenterY}, ${bendX} ${childCenterY}, ${childCenterX} ${childCenterY}`;
            return <React.Fragment key={`radial-branch-${index}`}><path d={path} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={3 * ru} strokeLinecap="round" strokeDasharray={`${7 * ru} ${13 * ru}`} /><path d={path} fill="none" stroke={color.hex} strokeWidth={3.5 * ru} strokeLinecap="round" strokeDasharray={`${7 * ru} ${13 * ru}`} opacity={progress * 0.76} style={{filter: `drop-shadow(0 0 ${6 * ru}px rgba(${color.rgb},0.46))`}} /></React.Fragment>;
          })}
        </svg>
        <div data-content-sized-surface="hierarchy-radial-root" data-card-copy-structure="label-primary" style={{position: "absolute", left: rootCenterX - rootSize / 2, top: rootCenterY - rootSize / 2, width: rootSize, height: rootSize, borderRadius: "50%", display: "grid", placeItems: "center", background: `rgba(${rootColor.rgb},0.08)`, border: `${3 * ru}px solid ${rootColor.hex}`, boxShadow: `0 0 ${44 * ru}px rgba(${rootColor.rgb},0.29), inset 0 0 ${34 * ru}px rgba(${rootColor.rgb},0.17)`, opacity: Math.min(1, rootIn), scale: 0.76 + Math.min(1, rootIn) * 0.24, boxSizing: "border-box", zIndex: 2}}>
          <div style={{position: "absolute", inset: 22 * ru, borderRadius: "50%", border: `${1 * ru}px solid rgba(${rootColor.rgb},0.52)`}} />
          <div style={{position: "relative", textAlign: "center", width: rootSize - 24 * ru}}><div data-card-label="true" style={{color: rootColor.hex, fontSize: 14 * ru, fontWeight: 880, letterSpacing: "0.1em"}}>{rootLabel}</div><div data-primary-text="true" style={{marginTop: 12 * ru, color: palette.fg, fontSize: 30 * ru, lineHeight: 1, fontWeight: 930, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{rootTitle}</div></div>
        </div>
        {radialChildren.map((child, index) => {
          const layout = layouts[index];
          const color = childColors[index];
          const enter = Math.min(1, spring({frame: frame - child.showAtInFrames, fps, config: {damping: 17, stiffness: 155, mass: 0.76}}));
          const active = interpolate(frame, [child.showAtInFrames - 2, child.showAtInFrames + 10, child.showAtInFrames + 28], [0, 1, 0.32], {...clamp, easing: EASING.enter});
          return <React.Fragment key={`${child.title}-${index}`}><div data-content-sized-surface="hierarchy-radial-child" data-card-copy-structure="label-primary" style={{position: "absolute", left: layout.x, top: layout.y, width: cardWidth, height: cardHeight, boxSizing: "border-box", display: "grid", gridTemplateColumns: `${52 * ru}px minmax(0,1fr)`, alignItems: "center", gap: 10 * ru, padding: `0 ${18 * ru}px`, borderRadius: 20 * ru, background: `linear-gradient(145deg, rgba(16,18,25,0.88), rgba(${color.rgb},${0.05 + active * 0.08}))`, backdropFilter: `blur(${11 * ru}px) saturate(1.08)`, border: `${2 * ru}px solid rgba(${color.rgb},${0.38 + active * 0.5})`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 ${15 * ru}px ${34 * ru}px rgba(0,0,0,0.29), 0 0 ${(16 + active * 22) * ru}px rgba(${color.rgb},${0.09 + active * 0.21})`, opacity: enter, translate: `${layout.x < rootCenterX ? (1 - enter) * -20 * ru : (1 - enter) * 20 * ru}px 0`, scale: 0.94 + enter * 0.06 + active * 0.024, zIndex: 2}}><div style={{width: 42 * ru, height: 42 * ru, borderRadius: 14 * ru, display: "grid", placeItems: "center", background: color.hex, color: "#050608", fontSize: 18 * ru, fontWeight: 950}}>{String(index + 1).padStart(2, "0")}</div><div style={{minWidth: 0}}><div data-card-label="true" style={{color: color.hex, fontSize: 13 * ru, fontWeight: 880, letterSpacing: "0.08em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{child.label ?? "分支"}</div><div data-primary-text="true" style={{marginTop: 7 * ru, color: palette.fg, fontSize: 27 * ru, lineHeight: 1, fontWeight: 930, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{child.title}</div></div></div>{child.detail ? <div data-auxiliary-text="true" style={{position: "absolute", left: layout.x + 10 * ru, top: layout.y + cardHeight + 8 * ru, width: cardWidth - 20 * ru, color: palette.dim, fontSize: 14 * ru, lineHeight: 1, fontWeight: 660, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center", opacity: enter}}>{child.detail}</div> : null}</React.Fragment>;
        })}
      </div>
    </AbsoluteFill>;
  }

  return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
    <div style={{position: "absolute", left: x, top: y, width: panelWidth, height: panelHeight, opacity: 1 - exit, translate: `0px ${exit * 24 * u}px`}}>
      <svg width={panelWidth} height={panelHeight} style={{position: "absolute", inset: 0}}>
        <path d={`M${panelWidth / 2} ${rootHeight} V${branchY}`} fill="none" stroke={accentColor} strokeWidth={4 * u} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - trunkIn} />
        <path d={`M${leftCenter} ${branchY} H${rightCenter}`} fill="none" stroke={accentColor} strokeWidth={4 * u} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - dropsIn} />
        {centers.map((center) => <path key={center} d={`M${center} ${branchY} V${216 * u}`} fill="none" stroke={accentColor} strokeWidth={4 * u} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - dropsIn} />)}
      </svg>
      <div data-content-sized-surface="hierarchy-root" data-card-copy-structure="label-primary" style={{position: "absolute", left: rootX, top: 0, width: rootWidth, height: rootHeight, boxSizing: "border-box", padding: `${18 * u}px`, textAlign: "center", borderRadius: 18 * u, background: theme === "dark" ? "linear-gradient(145deg, rgba(16,20,30,0.92), rgba(7,9,15,0.78))" : "rgba(255,255,255,0.92)", border: `1px solid ${palette.border}`, boxShadow: `inset 0 1px 0 ${palette.highlight}, 0 ${12 * u}px ${28 * u}px ${palette.shadow}`, opacity: Math.min(1, rootIn), scale: 0.9 + rootIn * 0.1}}>
        <div data-card-label="true" style={{color: accentColor, fontSize: 16 * u, fontWeight: 850, letterSpacing: "0.08em"}}>{rootLabel}</div>
        <div data-primary-text="true" style={{marginTop: 7 * u, color: palette.fg, fontSize: 30 * u, lineHeight: 1.05, fontWeight: 900}}>{rootTitle}</div>
      </div>
      {visible.map((child, index) => {
        const p = spring({frame: frame - child.showAtInFrames, fps, config: {damping: 18, stiffness: 155, mass: 0.78}});
        const color = child.accentColor ?? accentColor;
        return <div key={`${child.title}-${index}`} style={{position: "absolute", left: index * (childWidth + childGap), top: 216 * u, width: childWidth, textAlign: "center", opacity: Math.min(1, p), scale: 0.9 + p * 0.1, translate: `0px ${(1 - p) * -15 * u}px`}}>
          <div data-content-sized-surface="hierarchy-child" data-card-copy-structure="label-primary" style={{height: childCardHeightBase * u, boxSizing: "border-box", padding: `${18 * u}px ${14 * u}px`, borderRadius: 16 * u, background: theme === "dark" ? "linear-gradient(145deg, rgba(16,20,30,0.88), rgba(7,9,15,0.72))" : "rgba(255,255,255,0.9)", border: `1px solid ${palette.border}`, boxShadow: `inset 0 ${4 * u}px 0 ${color}, 0 ${10 * u}px ${24 * u}px ${palette.shadow}`}}>
            <div data-card-label="true" style={{color, fontSize: 16 * u, lineHeight: 1, fontWeight: 820, letterSpacing: "0.06em"}}>{child.label ?? "方向"}</div>
            <div data-primary-text="true" style={{marginTop: 8 * u, color: palette.fg, fontSize: 27 * u, lineHeight: 1.05, fontWeight: 900}}>{child.title}</div>
          </div>
          {child.detail ? <div data-auxiliary-text="true" style={{marginTop: 9 * u, color: palette.dim, fontSize: 16 * u, lineHeight: 1.2, fontWeight: 620, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{child.detail}</div> : null}
        </div>;
      })}
    </div>
  </AbsoluteFill>;
};
