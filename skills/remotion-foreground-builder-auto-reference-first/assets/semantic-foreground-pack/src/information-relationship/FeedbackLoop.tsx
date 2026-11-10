import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {CODE_THEMES} from "../lib/code-syntax";
import {ForegroundPlacement, getAlignedX, getForegroundZone} from "../lib/layout";
import {EASING} from "../lib/motion-tokens";
import {EDITABLE_ROOM_LIGHT_PALETTE} from "../lib/room-light-palette";

const FONT = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
export type FeedbackLoopStage = {label: string; showAtInFrames: number; accentColor?: string};
export type FeedbackLoopProps = {stages: FeedbackLoopStage[]; centerLabel: string; loopStartInFrames?: number; loopEndInFrames?: number; placement?: ForegroundPlacement; accentColor?: string; theme?: "dark" | "light"; direction?: "cw" | "ccw"; visualVariant?: "closedCycle" | "returnLoopBand"; exitAtInFrames?: number; exitInFrames?: number};

export const FeedbackLoop: React.FC<FeedbackLoopProps> = ({stages, centerLabel, loopStartInFrames, loopEndInFrames, placement = "centerSafe", accentColor = "#65C99B", theme = "dark", direction = "cw", visualVariant = "closedCycle", exitAtInFrames, exitInFrames = 14}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const zone = getForegroundZone({width, height, placement});
  const palette = CODE_THEMES[theme];
  const visible = stages.slice(0, 5);
  const baseWidth = 820;
  const baseHeight = 430;
  const u = Math.max(0.62, Math.min(zone.width / baseWidth, zone.height / baseHeight, 1.5));
  const panelWidth = baseWidth * u;
  const panelHeight = baseHeight * u;
  const x = getAlignedX({zone, itemWidth: panelWidth, placement});
  const y = zone.y + (zone.height - panelHeight) / 2;
  const centerX = panelWidth / 2;
  const centerY = panelHeight / 2;
  const radiusX = 270 * u;
  const radiusY = 145 * u;
  const startAt = loopStartInFrames ?? visible[0]?.showAtInFrames ?? 0;
  const endAt = loopEndInFrames ?? (visible.at(-1)?.showAtInFrames ?? startAt + 60) + 24;
  const loopIn = interpolate(frame, [startAt, endAt], [0, 1], {...clamp, easing: EASING.editorial});
  const signedProgress = direction === "cw" ? loopIn : -loopIn;
  const angle = -Math.PI / 2 + signedProgress * Math.PI * 2;
  const runnerX = centerX + Math.cos(angle) * radiusX;
  const runnerY = centerY + Math.sin(angle) * radiusY;
  const centerIn = spring({frame: frame - Math.min(endAt, startAt + 36), fps, config: {damping: 18, stiffness: 145, mass: 0.82}});
  const exit = exitAtInFrames === undefined ? 0 : interpolate(frame, [exitAtInFrames, exitAtInFrames + exitInFrames], [0, 1], {...clamp, easing: EASING.exit});

  if (visualVariant === "returnLoopBand") {
    const accent = EDITABLE_ROOM_LIGHT_PALETTE.荧光绿;
    const color = accent.hex;
    const rgb = accent.rgb;
    const cardWidth = 170 * u;
    const cardHeight = 78 * u;
    const lapFlash = interpolate(frame, [Math.max(startAt, endAt - 12), endAt], [0, 1], clamp);
    return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
      <div style={{position: "absolute", left: x, top: y, width: panelWidth, height: panelHeight, opacity: 1 - exit, translate: `0px ${exit * 24 * u}px`}}>
        <svg width={panelWidth} height={panelHeight} style={{position: "absolute", inset: 0}}>
          <ellipse cx={centerX} cy={centerY} rx={radiusX} ry={radiusY} fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth={4 * u} strokeDasharray={`${8 * u} ${14 * u}`} />
          <ellipse cx={centerX} cy={centerY} rx={radiusX} ry={radiusY} fill="none" stroke={color} strokeWidth={3.5 * u} pathLength={1} strokeDasharray="0.018 0.028" strokeDashoffset={1 - loopIn} strokeLinecap="round" opacity={0.72} style={{filter: `drop-shadow(0 0 ${7 * u}px rgba(${rgb},0.42))`}} />
        </svg>
        {visible.map((stage, index) => {
          const phase = direction === "cw" ? Math.PI + (index / visible.length) * Math.PI * 2 : Math.PI - (index / visible.length) * Math.PI * 2;
          const nx = centerX + Math.cos(phase) * radiusX;
          const ny = centerY + Math.sin(phase) * radiusY;
          const p = spring({frame: frame - stage.showAtInFrames, fps, config: {damping: 17, stiffness: 155, mass: 0.76}});
          return <div key={`${stage.label}-${index}`} style={{position: "absolute", left: nx - cardWidth / 2, top: ny - cardHeight / 2, width: cardWidth, height: cardHeight, borderRadius: 22 * u, display: "grid", gridTemplateColumns: `${42 * u}px 1fr`, alignItems: "center", gap: 11 * u, padding: `0 ${15 * u}px`, boxSizing: "border-box", background: theme === "dark" ? "linear-gradient(145deg, rgba(18,20,29,0.84), rgba(7,8,13,0.62))" : "rgba(255,255,255,0.82)", border: `2px solid rgba(${rgb},${0.4 + p * 0.38})`, boxShadow: `inset 0 1px 0 ${palette.highlight}, 0 ${15 * u}px ${32 * u}px ${palette.shadow}, 0 0 ${28 * u}px rgba(${rgb},0.17)`, color: palette.fg, opacity: p, scale: 0.94 + p * 0.06, zIndex: 3}}><div style={{width: 40 * u, height: 40 * u, borderRadius: 13 * u, display: "grid", placeItems: "center", color: "#050608", background: color, fontSize: 15 * u, fontWeight: 950}}>{String(index + 1).padStart(2, "0")}</div><div style={{fontSize: 25 * u, fontWeight: 930}}>{stage.label}</div></div>;
        })}
        <div style={{position: "absolute", left: centerX - 136 * u, top: centerY - 59 * u, width: 272 * u, height: 118 * u, borderRadius: 28 * u, display: "grid", placeItems: "center", textAlign: "center", background: theme === "dark" ? "linear-gradient(145deg, rgba(18,20,29,0.84), rgba(7,8,13,0.62))" : "rgba(255,255,255,0.82)", border: `2px solid rgba(${rgb},${0.48 + lapFlash * 0.36})`, boxShadow: `inset 0 1px 0 ${palette.highlight}, 0 ${20 * u}px ${42 * u}px ${palette.shadow}, 0 0 ${48 * u}px rgba(${rgb},0.22)`, color: palette.fg, opacity: centerIn, scale: 0.92 + centerIn * 0.08 + lapFlash * 0.025, zIndex: 3}}><div><div style={{color, fontSize: 14 * u, fontWeight: 900, letterSpacing: 3 * u}}>闭环目标</div><div style={{marginTop: 12 * u, fontSize: 32 * u, lineHeight: 1, fontWeight: 950}}>{centerLabel}</div></div></div>
        <div style={{position: "absolute", left: runnerX - 17 * u, top: runnerY - 17 * u, width: 34 * u, height: 34 * u, borderRadius: 11 * u, background: color, boxShadow: `0 0 0 ${8 * u}px rgba(${rgb},0.10), 0 0 ${27 * u}px rgba(${rgb},0.72)`, rotate: `${frame * 2.4}deg`, opacity: loopIn, zIndex: 2}} />
      </div>
    </AbsoluteFill>;
  }

  return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
    <div style={{position: "absolute", left: x, top: y, width: panelWidth, height: panelHeight, opacity: 1 - exit, translate: `0px ${exit * 24 * u}px`}}>
      <svg width={panelWidth} height={panelHeight} style={{position: "absolute", inset: 0}}><ellipse cx={centerX} cy={centerY} rx={radiusX} ry={radiusY} fill="none" stroke={palette.border} strokeWidth={6 * u} /><ellipse cx={centerX} cy={centerY} rx={radiusX} ry={radiusY} fill="none" stroke={accentColor} strokeWidth={6 * u} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - loopIn} strokeLinecap="round" /><circle cx={runnerX} cy={runnerY} r={9 * u} fill={theme === "dark" ? "#EFFFF6" : accentColor} opacity={loopIn} /></svg>
      {visible.map((stage, index) => {
        const phase = direction === "cw" ? -Math.PI / 2 + (index / visible.length) * Math.PI * 2 : -Math.PI / 2 - (index / visible.length) * Math.PI * 2;
        const nx = centerX + Math.cos(phase) * radiusX;
        const ny = centerY + Math.sin(phase) * radiusY;
        const p = spring({frame: frame - stage.showAtInFrames, fps, config: {damping: 18, stiffness: 155, mass: 0.78}});
        const color = stage.accentColor ?? accentColor;
        return <div key={`${stage.label}-${index}`} style={{position: "absolute", left: nx - 78 * u, top: ny - 43 * u, width: 156 * u, height: 86 * u, borderRadius: 19 * u, display: "grid", placeItems: "center", background: theme === "dark" ? "rgba(15,19,27,0.90)" : "rgba(255,255,255,0.92)", border: `2px solid ${color}`, boxShadow: `inset 0 1px 0 ${palette.highlight}, 0 ${12 * u}px ${26 * u}px ${palette.shadow}, 0 0 ${18 * u}px ${color}28`, color: palette.fg, fontSize: 24 * u, fontWeight: 900, opacity: p, scale: 0.9 + p * 0.1}}><span style={{position: "absolute", left: 12 * u, top: 10 * u, color, fontSize: 13 * u, fontWeight: 900}}>{String(index + 1).padStart(2, "0")}</span>{stage.label}</div>;
      })}
      <div style={{position: "absolute", left: centerX - 128 * u, top: centerY - 62 * u, width: 256 * u, height: 124 * u, borderRadius: 20 * u, display: "grid", placeItems: "center", textAlign: "center", background: theme === "dark" ? "linear-gradient(145deg, rgba(16,22,28,0.92), rgba(7,12,15,0.78))" : "rgba(255,255,255,0.92)", border: `1px solid ${accentColor}66`, boxShadow: `inset 0 1px 0 ${palette.highlight}, 0 ${15 * u}px ${32 * u}px ${palette.shadow}`, color: palette.fg, fontSize: 30 * u, fontWeight: 900, opacity: centerIn, scale: 0.92 + centerIn * 0.08}}>{centerLabel}</div>
    </div>
  </AbsoluteFill>;
};
