import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {CODE_THEMES} from "../lib/code-syntax";
import {ForegroundPlacement, getAlignedX, getForegroundZone} from "../lib/layout";
import {EASING} from "../lib/motion-tokens";
import {EDITABLE_ROOM_LIGHT_PALETTE} from "../lib/room-light-palette";

const FONT = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
export type QuadrantDatum = {label: string; x: number; y: number; showAtInFrames: number; accentColor?: string};
export type QuadrantLabel = {title: string; detail?: string; accentColor?: string; showAtInFrames?: number};
export type QuadrantMatrixProps = {xAxisLabel: string; yAxisLabel: string; quadrants: [QuadrantLabel, QuadrantLabel, QuadrantLabel, QuadrantLabel]; items: QuadrantDatum[]; placement?: ForegroundPlacement; accentColor?: string; theme?: "dark" | "light"; visualVariant?: "fourQuadrants" | "magneticDecisionBoard"; gridShowAtInFrames?: number; exitAtInFrames?: number; exitInFrames?: number};

export const QuadrantMatrix: React.FC<QuadrantMatrixProps> = ({xAxisLabel, yAxisLabel, quadrants, items, placement = "centerSafe", accentColor = "#E8B86D", theme = "dark", visualVariant = "fourQuadrants", gridShowAtInFrames = 0, exitAtInFrames, exitInFrames = 14}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const zone = getForegroundZone({width, height, placement});
  const palette = CODE_THEMES[theme];
  const baseWidth = 800;
  const baseHeight = 470;
  const u = Math.max(0.60, Math.min(zone.width / baseWidth, zone.height / baseHeight, 1.48));
  const panelWidth = baseWidth * u;
  const panelHeight = baseHeight * u;
  const matrixX = 86 * u;
  const matrixY = 18 * u;
  const matrixWidth = 690 * u;
  const matrixHeight = 390 * u;
  const x = getAlignedX({zone, itemWidth: panelWidth, placement});
  const y = zone.y + (zone.height - panelHeight) / 2;
  const gridIn = interpolate(frame, [gridShowAtInFrames, gridShowAtInFrames + 20], [0, 1], {...clamp, easing: EASING.enter});
  const exit = exitAtInFrames === undefined ? 0 : interpolate(frame, [exitAtInFrames, exitAtInFrames + exitInFrames], [0, 1], {...clamp, easing: EASING.exit});
  const cellPositions = [[0, 0], [1, 0], [0, 1], [1, 1]] as const;

  if (visualVariant === "magneticDecisionBoard") {
    const accent = EDITABLE_ROOM_LIGHT_PALETTE.电光蓝;
    const color = accent.hex;
    const rgb = accent.rgb;
    return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
      <div style={{position: "absolute", left: x, top: y, width: panelWidth, height: panelHeight, opacity: 1 - exit, translate: `0px ${exit * 24 * u}px`}}>
        <div style={{position: "absolute", left: -105 * u, top: 195 * u, width: 390 * u, textAlign: "center", color, fontSize: 17 * u, fontWeight: 850, rotate: "-90deg", letterSpacing: "0.10em", opacity: gridIn}}>{yAxisLabel}</div>
        <div style={{position: "absolute", left: matrixX, top: 428 * u, width: matrixWidth, textAlign: "center", color, fontSize: 17 * u, fontWeight: 850, letterSpacing: "0.10em", opacity: gridIn}}>{xAxisLabel}</div>
        {quadrants.map((quadrant, index) => {
          const [column, row] = cellPositions[index];
          const showAt = quadrant.showAtInFrames ?? gridShowAtInFrames + 18 + index * 7;
          const p = spring({frame: frame - showAt, fps, config: {damping: 18, stiffness: 150, mass: 0.78}});
          return <div key={`${quadrant.title}-${index}`} style={{position: "absolute", left: matrixX + column * matrixWidth / 2 + 6 * u, top: matrixY + row * matrixHeight / 2 + 6 * u, width: matrixWidth / 2 - 12 * u, height: matrixHeight / 2 - 12 * u, boxSizing: "border-box", padding: `${22 * u}px ${24 * u}px`, borderRadius: 25 * u, background: theme === "dark" ? `linear-gradient(145deg, rgba(18,20,29,0.84), rgba(${rgb},0.07))` : `rgba(${rgb},0.07)`, border: `2px solid rgba(${rgb},0.48)`, boxShadow: `inset 0 1px 0 ${palette.highlight}, 0 ${17 * u}px ${38 * u}px ${palette.shadow}, 0 0 ${27 * u}px rgba(${rgb},0.12)`, opacity: p, translate: `0 ${(1 - p) * 16 * u}px`, scale: 0.95 + p * 0.05}}><div style={{color, fontSize: 14 * u, fontWeight: 900, letterSpacing: 2 * u}}>决策分区</div><div style={{marginTop: 13 * u, color: palette.fg, fontSize: 31 * u, lineHeight: 1, fontWeight: 950}}>{quadrant.title}</div>{quadrant.detail ? <div style={{marginTop: 14 * u, color: palette.dim, fontSize: 16 * u, fontWeight: 650}}>{quadrant.detail}</div> : null}</div>;
        })}
        <div style={{position: "absolute", left: matrixX + matrixWidth / 2 - 3 * u, top: matrixY - 10 * u, width: 6 * u, height: matrixHeight + 20 * u, borderRadius: 99, background: `repeating-linear-gradient(180deg, rgba(255,255,255,0.16) 0 ${7 * u}px, transparent ${7 * u}px ${17 * u}px)`, opacity: gridIn}} />
        <div style={{position: "absolute", left: matrixX - 10 * u, top: matrixY + matrixHeight / 2 - 3 * u, width: matrixWidth + 20 * u, height: 6 * u, borderRadius: 99, background: `repeating-linear-gradient(90deg, rgba(255,255,255,0.16) 0 ${7 * u}px, transparent ${7 * u}px ${17 * u}px)`, opacity: gridIn}} />
        {items.slice(0, 8).map((item, index) => {
          const p = spring({frame: frame - item.showAtInFrames, fps, config: {damping: 16, stiffness: 170, mass: 0.75}});
          const px = matrixX + Math.min(1, Math.max(0, item.x)) * matrixWidth;
          const py = matrixY + (1 - Math.min(1, Math.max(0, item.y))) * matrixHeight;
          return <div key={`${item.label}-${index}`} style={{position: "absolute", left: px - 47 * u, top: py - 23 * u, width: 94 * u, height: 46 * u, borderRadius: 16 * u, display: "grid", placeItems: "center", color: "#050608", background: color, fontSize: 17 * u, fontWeight: 950, boxShadow: `0 0 0 ${8 * p * u}px rgba(${rgb},0.10), 0 0 ${25 * u}px rgba(${rgb},0.58)`, opacity: p, scale: 0.78 + p * 0.22}}>{item.label}</div>;
        })}
      </div>
    </AbsoluteFill>;
  }

  return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
    <div style={{position: "absolute", left: x, top: y, width: panelWidth, height: panelHeight, opacity: 1 - exit, translate: `0px ${exit * 24 * u}px`}}>
      <div style={{position: "absolute", left: -105 * u, top: 195 * u, width: 390 * u, textAlign: "center", color: palette.dim, fontSize: 17 * u, fontWeight: 850, rotate: "-90deg", letterSpacing: "0.10em", opacity: gridIn}}>{yAxisLabel}</div>
      <div style={{position: "absolute", left: matrixX, top: 428 * u, width: matrixWidth, textAlign: "center", color: palette.dim, fontSize: 17 * u, fontWeight: 850, letterSpacing: "0.10em", opacity: gridIn}}>{xAxisLabel}</div>
      <div style={{position: "absolute", left: matrixX + matrixWidth / 2 - u, top: matrixY, width: 2 * u, height: matrixHeight, background: palette.border, scale: `1 ${gridIn}`, transformOrigin: "center"}} />
      <div style={{position: "absolute", left: matrixX, top: matrixY + matrixHeight / 2 - u, width: matrixWidth, height: 2 * u, background: palette.border, scale: `${gridIn} 1`, transformOrigin: "left"}} />
      {quadrants.map((quadrant, index) => {
        const [column, row] = cellPositions[index];
        const showAt = quadrant.showAtInFrames ?? gridShowAtInFrames + 18 + index * 7;
        const p = spring({frame: frame - showAt, fps, config: {damping: 18, stiffness: 155, mass: 0.78}});
        const color = quadrant.accentColor ?? accentColor;
        return <div key={`${quadrant.title}-${index}`} style={{position: "absolute", left: matrixX + column * matrixWidth / 2 + 10 * u, top: matrixY + row * matrixHeight / 2 + 10 * u, width: matrixWidth / 2 - 20 * u, height: matrixHeight / 2 - 20 * u, boxSizing: "border-box", padding: `${20 * u}px ${22 * u}px`, borderRadius: 18 * u, background: `${color}10`, border: `1px solid ${color}42`, boxShadow: `inset 0 1px 0 ${palette.highlight}`, opacity: p, scale: 0.94 + p * 0.06}}><div style={{color: palette.fg, fontSize: 27 * u, lineHeight: 1.05, fontWeight: 900}}>{quadrant.title}</div>{quadrant.detail ? <div style={{marginTop: 10 * u, color, fontSize: 17 * u, lineHeight: 1.2, fontWeight: 800}}>{quadrant.detail}</div> : null}</div>;
      })}
      {items.slice(0, 8).map((item, index) => {
        const p = spring({frame: frame - item.showAtInFrames, fps, config: {damping: 15, stiffness: 175, mass: 0.74}});
        const color = item.accentColor ?? accentColor;
        const px = matrixX + Math.min(1, Math.max(0, item.x)) * matrixWidth;
        const py = matrixY + (1 - Math.min(1, Math.max(0, item.y))) * matrixHeight;
        return <div key={`${item.label}-${index}`} style={{position: "absolute", left: px - 37 * u, top: py - 37 * u, width: 74 * u, height: 74 * u, borderRadius: "50%", display: "grid", placeItems: "center", textAlign: "center", background: color, border: `${4 * u}px solid ${theme === "dark" ? "rgba(8,11,15,0.82)" : "#FFFFFF"}`, boxShadow: `0 0 0 ${9 * p * u}px ${color}20, 0 0 ${24 * u}px ${color}66`, color: theme === "dark" ? "#11131A" : "#FFFFFF", fontSize: 15 * u, lineHeight: 1.05, fontWeight: 950, boxSizing: "border-box", opacity: p, scale: 0.74 + p * 0.26}}>{item.label}</div>;
      })}
    </div>
  </AbsoluteFill>;
};
