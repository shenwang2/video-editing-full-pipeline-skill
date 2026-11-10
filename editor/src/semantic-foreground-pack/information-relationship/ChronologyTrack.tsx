import React from "react";
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {CODE_THEMES} from "../lib/code-syntax";
import {ForegroundPlacement, getAlignedX, getForegroundZone} from "../lib/layout";
import {EASING} from "../lib/motion-tokens";
import {EDITABLE_ROOM_LIGHT_PALETTE} from "../lib/room-light-palette";

const FONT = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

export type ChronologyTrackItem = {
  time: string;
  title: string;
  detail?: string;
  showAtInFrames: number;
  accentColor?: string;
};

export type ChronologyTrackProps = {
  items: ChronologyTrackItem[];
  visualVariant?: "datedMilestones" | "pulseTrack";
  placement?: ForegroundPlacement;
  accentColor?: string;
  theme?: "dark" | "light";
  exitAtInFrames?: number;
  exitInFrames?: number;
};

export const ChronologyTrack: React.FC<ChronologyTrackProps> = ({
  items,
  visualVariant = "datedMilestones",
  placement = "centerSafe",
  accentColor = "#E8B86D",
  theme = "dark",
  exitAtInFrames,
  exitInFrames = 14,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const zone = getForegroundZone({width, height, placement});
  const palette = CODE_THEMES[theme];
  const visible = items.slice(0, 4);
  const baseWidth = 940;
  const baseHeight = 300;
  const u = Math.max(0.66, Math.min(zone.width / baseWidth, zone.height / baseHeight, 1.55));
  const panelWidth = baseWidth * u;
  const panelHeight = baseHeight * u;
  const x = getAlignedX({zone, itemWidth: panelWidth, placement});
  const y = zone.y + (zone.height - panelHeight) / 2;
  const firstAt = visible[0]?.showAtInFrames ?? 0;
  const lastAt = visible.at(-1)?.showAtInFrames ?? firstAt + 24;
  const lineProgress = interpolate(frame, [firstAt, lastAt + 12], [0, 1], {
    ...clamp,
    easing: EASING.editorial,
  });
  const exit = exitAtInFrames === undefined ? 0 : interpolate(
    frame,
    [exitAtInFrames, exitAtInFrames + exitInFrames],
    [0, 1],
    {...clamp, easing: EASING.exit},
  );
  const gap = visible.length > 1 ? panelWidth / visible.length : panelWidth;

  if (visualVariant === "pulseTrack") {
    const colors = Array.from({length: 4}, () => EDITABLE_ROOM_LIGHT_PALETTE.电光蓝);
    const pulseBaseHeight = 390;
    const pu = Math.max(0.64, Math.min(zone.width / baseWidth, zone.height / pulseBaseHeight, 1.48));
    const pulseWidth = baseWidth * pu;
    const pulseHeight = pulseBaseHeight * pu;
    const pulseX = getAlignedX({zone, itemWidth: pulseWidth, placement});
    const pulseY = zone.y + Math.max(0, (zone.height - pulseHeight) / 2);
    const railLeft = 66 * pu;
    const railWidth = pulseWidth - railLeft * 2;
    const railY = 195 * pu;
    const nodeGap = visible.length > 1 ? railWidth / (visible.length - 1) : 0;
    const nodeXs = visible.map((_, index) => railLeft + index * nodeGap);
    const pulseProgress = interpolate(frame, [firstAt, lastAt + 12], [0, 1], {...clamp, easing: EASING.editorial});

    return (
      <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
        <div style={{position: "absolute", left: pulseX, top: pulseY, width: pulseWidth, height: pulseHeight, opacity: 1 - exit, translate: `0 ${exit * 22 * pu}px`}}>
          <div style={{position: "absolute", left: railLeft, top: railY, width: railWidth, height: 5 * pu, borderRadius: 99, background: "rgba(255,255,255,0.14)"}} />
          <div style={{position: "absolute", left: railLeft, top: railY, width: railWidth * pulseProgress, height: 5 * pu, borderRadius: 99, background: "rgba(255,255,255,0.68)", boxShadow: `0 0 ${17 * pu}px rgba(255,255,255,0.22)`}} />
          <div style={{position: "absolute", left: railLeft + railWidth * pulseProgress - 9 * pu, top: railY - 7 * pu, width: 19 * pu, height: 19 * pu, borderRadius: "50%", background: "#FFFFFF", boxShadow: `0 0 ${21 * pu}px rgba(255,255,255,0.74)`, opacity: pulseProgress > 0 && pulseProgress < 1 ? 1 : 0}} />

          {visible.map((item, index) => {
            const color = colors[index];
            const enter = Math.min(1, spring({frame: frame - item.showAtInFrames, fps, config: {damping: 17, stiffness: 155, mass: 0.76}}));
            const nextAt = visible[index + 1]?.showAtInFrames ?? (exitAtInFrames ?? lastAt + 40);
            const activeIn = interpolate(frame, [item.showAtInFrames - 2, item.showAtInFrames + 8], [0, 1], {...clamp, easing: EASING.enter});
            const activeOut = interpolate(frame, [nextAt - 7, nextAt + 4], [0, 1], {...clamp, easing: EASING.exit});
            const active = activeIn * (1 - activeOut);
            const upper = index % 2 === 0;
            const cardWidth = Math.min(270 * pu, visible.length > 1 ? nodeGap - 22 * pu : 300 * pu);
            const cardHeight = 112 * pu;
            const cardTop = upper ? 8 * pu : railY + 48 * pu;
            const connectorTop = upper ? cardTop + cardHeight : railY + 5 * pu;
            const connectorHeight = upper ? railY - connectorTop : cardTop - connectorTop;
            return (
              <React.Fragment key={`${item.time}-${index}`}>
                <div style={{position: "absolute", left: nodeXs[index] - 2 * pu, top: connectorTop, width: 4 * pu, height: Math.max(0, connectorHeight), borderRadius: 99, background: color.hex, boxShadow: `0 0 ${13 * pu}px rgba(${color.rgb},0.58)`, opacity: enter, scale: `1 ${enter}`, transformOrigin: upper ? "bottom center" : "top center"}} />
                <div style={{position: "absolute", left: nodeXs[index] - 13 * pu, top: railY - 10 * pu, width: 27 * pu, height: 27 * pu, borderRadius: "50%", border: `${3 * pu}px solid ${color.hex}`, background: theme === "dark" ? "#050608" : "#FFFFFF", boxShadow: `0 0 ${(17 + active * 18) * pu}px rgba(${color.rgb},${0.30 + active * 0.34})`, opacity: enter, scale: 0.78 + enter * 0.22 + active * 0.1, boxSizing: "border-box", zIndex: 3}} />
                <div data-content-sized-surface="chronology-pulse-card" data-card-copy-structure="label-primary" style={{position: "absolute", left: nodeXs[index] - cardWidth / 2, top: cardTop, width: cardWidth, height: cardHeight, boxSizing: "border-box", padding: `${18 * pu}px ${21 * pu}px`, borderRadius: 22 * pu, background: `linear-gradient(145deg, rgba(16,18,25,0.88), rgba(${color.rgb},${0.05 + active * 0.08}))`, backdropFilter: `blur(${11 * pu}px) saturate(1.08)`, border: `${2 * pu}px solid rgba(${color.rgb},${0.38 + active * 0.5})`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.13), 0 ${15 * pu}px ${36 * pu}px rgba(0,0,0,0.29), 0 0 ${(17 + active * 26) * pu}px rgba(${color.rgb},${0.09 + active * 0.21})`, opacity: enter * (0.76 + active * 0.24), translate: `0 ${upper ? (1 - enter) * -16 * pu : (1 - enter) * 16 * pu}px`, scale: 1 + active * 0.024}}>
                  <div data-card-label="true" style={{color: color.hex, fontSize: 15 * pu, lineHeight: 1, fontWeight: 880, letterSpacing: "0.1em"}}>{item.time}</div>
                  <div data-primary-text="true" style={{marginTop: 13 * pu, color: palette.fg, fontSize: 31 * pu, lineHeight: 1, fontWeight: 930, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{item.title}</div>
                </div>
                {item.detail ? <div data-auxiliary-text="true" style={{position: "absolute", left: nodeXs[index] - cardWidth / 2 + 8 * pu, top: cardTop + cardHeight + 9 * pu, width: cardWidth - 16 * pu, color: palette.dim, fontSize: 15 * pu, lineHeight: 1, fontWeight: 670, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: upper ? "left" : "center", opacity: enter}}>{item.detail}</div> : null}
              </React.Fragment>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
      <div style={{position: "absolute", left: x, top: y, width: panelWidth, height: panelHeight, opacity: 1 - exit, translate: `0px ${exit * 24 * u}px`}}>
        <div style={{position: "absolute", left: gap * 0.5, top: 66 * u, width: Math.max(0, panelWidth - gap), height: 4 * u, borderRadius: 99, background: palette.border}} />
        <div style={{position: "absolute", left: gap * 0.5, top: 66 * u, width: Math.max(0, panelWidth - gap) * lineProgress, height: 4 * u, borderRadius: 99, background: accentColor, boxShadow: `0 0 ${18 * u}px ${accentColor}55`}} />
        {visible.map((item, index) => {
          const p = spring({frame: frame - item.showAtInFrames, fps, config: {damping: 18, stiffness: 155, mass: 0.78}});
          const cx = gap * (index + 0.5);
          const color = item.accentColor ?? accentColor;
          const cardWidth = Math.min(226 * u, gap - 16 * u);
          return (
            <div key={`${item.time}-${index}`} style={{position: "absolute", left: cx - cardWidth / 2, top: 0, width: cardWidth, opacity: Math.min(1, p), translate: `0px ${(1 - p) * 18 * u}px`}}>
              <div style={{height: 34 * u, display: "grid", placeItems: "center", color, fontSize: 19 * u, fontWeight: 850}}>{item.time}</div>
              <div style={{margin: `${17 * u}px auto 0`, width: 18 * u, height: 18 * u, borderRadius: "50%", background: color, border: `${4 * u}px solid ${theme === "dark" ? "#111620" : "#FFFFFF"}`, boxShadow: `0 0 ${16 * u}px ${color}80`}} />
              <div style={{marginTop: 24 * u, minHeight: 126 * u, boxSizing: "border-box", padding: `${17 * u}px ${16 * u}px`, textAlign: "center", borderRadius: 16 * u, background: theme === "dark" ? "linear-gradient(145deg, rgba(16,20,30,0.88), rgba(7,9,15,0.72))" : "rgba(255,255,255,0.9)", border: `1px solid ${palette.border}`, boxShadow: `inset 0 1px 0 ${palette.highlight}, 0 ${12 * u}px ${28 * u}px ${palette.shadow}`}}>
                <div style={{color: palette.fg, fontSize: 28 * u, lineHeight: 1.05, fontWeight: 900}}>{item.title}</div>
                {item.detail ? <div style={{marginTop: 9 * u, color: palette.dim, fontSize: 17 * u, lineHeight: 1.25, fontWeight: 650}}>{item.detail}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
