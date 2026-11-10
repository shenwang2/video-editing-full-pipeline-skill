import React from "react";
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {ForegroundPlacement, getAlignedX, getForegroundZone} from "../lib/layout";
import {EDITABLE_ROOM_LIGHT_PALETTE} from "../lib/room-light-palette";

const FONT = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

export type VerdictStampProps = {
  verdict: string;
  placement: ForegroundPlacement;
  visualVariant?: "judgmentSeal" | "decisionLock";
  setup?: string;
  eyebrow?: string;
  stampText?: string;
  accentColor?: string;
  secondaryAccentColor?: string;
  showAtInFrames?: number;
  verdictAtInFrames?: number;
  stampAtInFrames?: number;
  exitAtInFrames?: number;
  exitInFrames?: number;
};

export const VerdictStamp: React.FC<VerdictStampProps> = ({
  verdict,
  placement,
  visualVariant = "judgmentSeal",
  setup,
  eyebrow = "核心结论",
  stampText = "结论",
  accentColor = "#FFB44A",
  secondaryAccentColor = "#D8FF3F",
  showAtInFrames = 0,
  verdictAtInFrames = showAtInFrames + 16,
  stampAtInFrames = verdictAtInFrames + 20,
  exitAtInFrames,
  exitInFrames = 12,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const zone = getForegroundZone({width, height, placement});
  const u = Math.max(0.52, Math.min(zone.width / 700, zone.height / 410, 1.55));
  const panelWidth = 700 * u;
  const panelHeight = 410 * u;
  const x = getAlignedX({zone, itemWidth: panelWidth, placement});
  const y = zone.y + (zone.height - panelHeight) / 2;
  const setupIn = interpolate(frame, [showAtInFrames, showAtInFrames + 15], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const verdictIn = interpolate(frame, [verdictAtInFrames, verdictAtInFrames + 18], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const stampIn = spring({frame: frame - stampAtInFrames, fps, config: {damping: 13, mass: 0.7, stiffness: 175}});
  const exit = exitAtInFrames === undefined ? 0 : interpolate(frame, [exitAtInFrames, exitAtInFrames + exitInFrames], [0, 1], {...clamp, easing: Easing.bezier(0.7, 0, 0.84, 0)});
  const verdictSize = Math.min(90 * u, (panelWidth * 0.72) / Math.max(verdict.length * 0.88, 3.2));

  if (visualVariant === "decisionLock") {
    const accent = EDITABLE_ROOM_LIGHT_PALETTE.深紫.hex;
    const rgb = EDITABLE_ROOM_LIGHT_PALETTE.深紫.rgb;
    const lockU = Math.max(0.48, Math.min(zone.width / 900, zone.height / 340, 1.55));
    const groupWidth = 900 * lockU;
    const groupHeight = 340 * lockU;
    const groupX = getAlignedX({zone, itemWidth: groupWidth, placement});
    const groupY = zone.y + (zone.height - groupHeight) / 2;
    const lockSetupIn = interpolate(frame, [showAtInFrames, showAtInFrames + 17], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
    const cardIn = spring({frame: frame - verdictAtInFrames, fps, config: {damping: 17, stiffness: 155, mass: 0.72}});
    const rail = interpolate(frame, [verdictAtInFrames + 15, verdictAtInFrames + 40], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
    const lockIn = spring({frame: frame - stampAtInFrames, fps, config: {damping: 13, stiffness: 185, mass: 0.58}});
    const lockGlow = interpolate(frame, [stampAtInFrames + 12, stampAtInFrames + 24, stampAtInFrames + 38], [0.25, 0.7, 0.28], clamp);
    const lockVerdictSize = Math.min(68 * lockU, (620 * lockU) / Math.max(verdict.length * 0.88, 4));
    return <AbsoluteFill data-foreground-overlay-root="true" data-single-accent-variant="deep-purple" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
      <div style={{position: "absolute", left: groupX, top: groupY, width: groupWidth, height: groupHeight, opacity: 1 - exit}}>
        {setup ? <div data-auxiliary-text="true" style={{position: "absolute", left: 38 * lockU, top: 0, display: "flex", alignItems: "center", gap: 14 * lockU, opacity: lockSetupIn, translate: `${(1 - lockSetupIn) * -18 * lockU}px 0px`}}><div style={{width: 52 * lockU, height: 4 * lockU, borderRadius: 99, background: accent, boxShadow: `0 0 ${18 * lockU}px rgba(${rgb},0.54)`}} /><div style={{fontSize: 22 * lockU, fontWeight: 720, letterSpacing: 3 * lockU, color: "rgba(255,255,255,0.58)"}}>{setup}</div></div> : null}
        <div style={{position: "absolute", left: 0, top: 58 * lockU, width: 690 * lockU, height: 230 * lockU, borderRadius: 30 * lockU, overflow: "hidden", background: `linear-gradient(145deg, rgba(${rgb},0.13), rgba(7,8,12,0.72))`, border: `1px solid rgba(${rgb},0.60)`, boxShadow: `0 ${24 * lockU}px ${58 * lockU}px rgba(0,0,0,0.38), 0 0 ${42 * lockU}px rgba(${rgb},0.17), inset 0 1px 0 rgba(255,255,255,0.10)`, opacity: cardIn, scale: 0.94 + cardIn * 0.06}}>
          <div style={{position: "absolute", left: 38 * lockU, top: 34 * lockU, color: accent, fontSize: 17 * lockU, fontWeight: 900, letterSpacing: 5 * lockU}}>{eyebrow}</div>
          <div data-primary-text="true" style={{position: "absolute", left: 38 * lockU, top: 89 * lockU, fontSize: lockVerdictSize, lineHeight: 1, fontWeight: 950, letterSpacing: 2 * lockU, color: "#FFFDF8", whiteSpace: "nowrap"}}>{verdict}</div>
          <div style={{position: "absolute", left: 38 * lockU, bottom: 36 * lockU, width: 430 * lockU * rail, height: 6 * lockU, borderRadius: 99, background: accent, boxShadow: `0 0 ${20 * lockU}px rgba(${rgb},0.62)`}} />
          <div aria-hidden="true" style={{position: "absolute", right: -38 * lockU, top: -55 * lockU, width: 210 * lockU, height: 210 * lockU, borderRadius: "50%", border: `1px solid rgba(${rgb},0.22)`, boxShadow: `0 0 ${70 * lockU}px rgba(${rgb},0.12)`}} />
        </div>
        <div style={{position: "absolute", right: 0, top: 94 * lockU, width: 172 * lockU, height: 158 * lockU, borderRadius: 25 * lockU, display: "grid", placeItems: "center", background: `linear-gradient(145deg, rgba(${rgb},0.20), rgba(8,9,13,0.78))`, border: `${2 * lockU}px solid ${accent}`, boxShadow: `0 ${20 * lockU}px ${48 * lockU}px rgba(0,0,0,0.34), 0 0 ${(28 + lockGlow * 36) * lockU}px rgba(${rgb},${lockGlow})`, opacity: lockIn, translate: `${(1 - lockIn) * 42 * lockU}px 0px`, scale: 0.86 + lockIn * 0.14}}>
          <div style={{textAlign: "center"}}><svg width={54 * lockU} height={54 * lockU} viewBox="0 0 58 58"><path d="M14 30 L24 40 L45 17" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - lockIn} /></svg><div style={{marginTop: 8 * lockU, color: accent, fontSize: 24 * lockU, fontWeight: 950, letterSpacing: 4 * lockU}}>{stampText}</div></div>
        </div>
        <div aria-hidden="true" style={{position: "absolute", left: 690 * lockU, top: 168 * lockU, width: 38 * lockU, height: 7 * lockU, borderRadius: 99, background: accent, opacity: lockIn, scale: `${lockIn} 1`, transformOrigin: "left center"}} />
      </div>
    </AbsoluteFill>;
  }

  return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
    <div style={{position: "absolute", left: x, top: y, width: panelWidth, height: panelHeight, opacity: 1 - exit}}>
      <div style={{fontSize: 25 * u, fontWeight: 850, letterSpacing: 7 * u, color: accentColor, opacity: setupIn}}>{eyebrow}</div>
      {setup ? <div style={{marginTop: 24 * u, maxWidth: 510 * u, fontSize: 62 * u, lineHeight: 1.18, fontWeight: 790, color: "rgba(255,253,246,0.67)", opacity: setupIn, translate: `${(1 - setupIn) * -24 * u}px 0px`}}>{setup}</div> : null}
      <div style={{position: "relative", marginTop: setup ? 4 * u : 42 * u, width: 510 * u, fontSize: verdictSize, lineHeight: 1.18, fontWeight: 950, letterSpacing: u, color: "#FFFDF6", opacity: verdictIn, translate: `0px ${(1 - verdictIn) * 26 * u}px`, whiteSpace: "pre-line"}}>{verdict}</div>
      <div style={{position: "absolute", left: 0, top: (setup ? 260 : 218) * u, width: 430 * u * verdictIn, height: 8 * u, borderRadius: 99, background: `linear-gradient(90deg, ${secondaryAccentColor}, ${accentColor})`}} />
      <div style={{position: "absolute", right: 2 * u, top: 186 * u, width: 176 * u, height: 176 * u, borderRadius: 999, display: "grid", placeItems: "center", border: `${7 * u}px double ${accentColor}E6`, backgroundColor: `${accentColor}12`, color: accentColor, rotate: `${-8 + (1 - stampIn) * -15}deg`, scale: stampIn, opacity: stampIn, boxShadow: `0 ${18 * u}px ${46 * u}px rgba(0,0,0,0.24)`}}>
        <div style={{width: 130 * u, height: 130 * u, borderRadius: 999, display: "grid", placeItems: "center", border: `${2 * u}px dashed ${accentColor}A8`, fontSize: 34 * u, lineHeight: 1.15, textAlign: "center", fontWeight: 950, letterSpacing: 4 * u, whiteSpace: "pre-line"}}>{stampText}</div>
      </div>
    </div>
  </AbsoluteFill>;
};
