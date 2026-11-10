import React from "react";
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {ForegroundPlacement, getAlignedX, getForegroundZone} from "../lib/layout";
import {EDITABLE_ROOM_LIGHT_PALETTE} from "../lib/room-light-palette";

const FONT = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

export type ImpactTokenProps = {
  mode: "keyword" | "number";
  text?: string;
  value?: number;
  countFrom?: number;
  unit?: string;
  eyebrow?: string;
  caption?: string;
  placement?: ForegroundPlacement;
  accentColor?: string;
  secondaryAccentColor?: string;
  visualVariant?: "keywordImpact" | "numberLanding" | "focusBeacon";
  showAtInFrames?: number;
  exitAtInFrames?: number;
  exitInFrames?: number;
};

export const ImpactToken: React.FC<ImpactTokenProps> = ({
  mode,
  text = "自动化",
  value = 30,
  countFrom = 0,
  unit = "秒",
  eyebrow = mode === "keyword" ? "核心词" : "一个可验证的时间点",
  caption = mode === "number" ? "从文案到画面落点" : undefined,
  placement = mode === "keyword" ? "leftMiddle" : "rightMiddle",
  accentColor = "#D8FF3F",
  secondaryAccentColor = "#FFB44A",
  visualVariant = mode === "keyword" ? "keywordImpact" : "numberLanding",
  showAtInFrames = 0,
  exitAtInFrames,
  exitInFrames = 12,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const zone = getForegroundZone({width, height, placement});
  const baseWidth = mode === "keyword" ? 690 : 650;
  const baseHeight = mode === "keyword" ? 300 : 410;
  const u = Math.max(0.52, Math.min(zone.width / baseWidth, zone.height / baseHeight, 1.55));
  const panelWidth = baseWidth * u;
  const panelHeight = baseHeight * u;
  const x = getAlignedX({zone, itemWidth: panelWidth, placement});
  const y = zone.y + (zone.height - panelHeight) / 2;
  const enter = interpolate(frame, [showAtInFrames, showAtInFrames + 14], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const exit = exitAtInFrames === undefined ? 0 : interpolate(frame, [exitAtInFrames, exitAtInFrames + exitInFrames], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.7, 0, 0.84, 0),
  });
  const unifiedAccent = accentColor;

  if (visualVariant === "focusBeacon") {
    const beacon = EDITABLE_ROOM_LIGHT_PALETTE.粉红;
    const progress = interpolate(frame, [showAtInFrames + 8, showAtInFrames + 42], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
    const shownValue = Math.round(countFrom + (value - countFrom) * progress);
    const primary = mode === "keyword" ? text : `${shownValue}${unit}`;
    const primarySize = Math.min(142 * u, (panelWidth * 0.90) / Math.max(primary.length * 0.92, 2.5));
    const rail = interpolate(frame, [showAtInFrames + 6, showAtInFrames + 34], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
    const scan = interpolate(frame, [showAtInFrames + 20, showAtInFrames + 58], [-12, 108], {...clamp, easing: Easing.bezier(0.22, 1, 0.36, 1)});
    const beaconColorFocus = interpolate(frame, [showAtInFrames + 20, showAtInFrames + 34], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
    const beaconPulse = interpolate(frame, [showAtInFrames + 20, showAtInFrames + 30, showAtInFrames + 44], [0, 1, 0], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
    const note = mode === "keyword" ? caption : caption ?? eyebrow;
    return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
      <div style={{position: "absolute", left: x, top: y, width: panelWidth, height: panelHeight, opacity: enter * (1 - exit), scale: 0.92 + enter * 0.08, transformOrigin: "left center"}}>
        <div style={{position: "absolute", left: 0, top: 30 * u, width: 9 * u, height: 198 * u * rail, borderRadius: 99, background: beacon.hex, boxShadow: `0 0 ${26 * u}px rgba(${beacon.rgb},0.70)`}} />
        <div style={{position: "absolute", left: 34 * u, top: 0, padding: `${8 * u}px ${16 * u}px`, borderRadius: 999, border: `1px solid rgba(${beacon.rgb},0.52)`, background: `rgba(${beacon.rgb},0.10)`, color: beacon.hex, fontSize: 19 * u, fontWeight: 900, letterSpacing: 4 * u, boxShadow: `0 0 ${24 * u}px rgba(${beacon.rgb},0.16)`}}>{eyebrow}</div>
        <div style={{position: "absolute", left: 34 * u, top: 58 * u, fontSize: primarySize, lineHeight: 1.08, fontWeight: 950, letterSpacing: Math.min(12 * u, primarySize * 0.08), color: "#FFFDF6", whiteSpace: "nowrap", scale: 1 + beaconPulse * 0.045, transformOrigin: "left center", textShadow: `0 ${18 * u}px ${52 * u}px rgba(0,0,0,0.42)`}}><span>{primary}</span><span aria-hidden="true" style={{position: "absolute", inset: 0, color: beacon.hex, opacity: beaconColorFocus, textShadow: `0 0 ${12 * u + beaconPulse * 26 * u}px rgba(${beacon.rgb},0.78)`}}>{primary}</span></div>
        <div style={{position: "absolute", left: 30 * u, top: 44 * u, width: Math.min(panelWidth - 48 * u, 560 * u), height: 170 * u, overflow: "hidden"}}><div style={{position: "absolute", top: -50 * u, left: `${scan}%`, width: 64 * u, height: 270 * u, rotate: "13deg", background: `linear-gradient(90deg, transparent, rgba(${beacon.rgb},0.24), transparent)`, filter: `blur(${2 * u}px)`}} /></div>
        {note ? <div style={{position: "absolute", left: 38 * u, top: 230 * u, fontSize: 26 * u, fontWeight: 700, letterSpacing: 3 * u, color: "rgba(255,255,255,0.58)"}}>{note}</div> : null}
      </div>
    </AbsoluteFill>;
  }

  if (mode === "keyword") {
    const accentFill = interpolate(frame, [showAtInFrames + 14, showAtInFrames + 38], [100, 0], {
      ...clamp,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    const impactPulse = interpolate(frame, [showAtInFrames + 14, showAtInFrames + 28, showAtInFrames + 44], [0, 1, 0], {
      ...clamp,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    const estimatedSize = Math.min(146 * u, (panelWidth * 0.94) / Math.max(text.length * 0.9, 2.3));
    return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
      <div style={{position: "absolute", left: x, top: y, width: panelWidth, height: panelHeight, opacity: enter * (1 - exit), translate: `${(1 - enter) * -34 * u}px ${exit * 18 * u}px`}}>
        <div style={{display: "flex", alignItems: "center", gap: 12 * u, marginBottom: 20 * u}}>
          <div style={{width: 10 * u, height: 10 * u, borderRadius: 999, backgroundColor: accentColor, boxShadow: `0 0 ${20 * u}px ${accentColor}88`}} />
          <div style={{fontSize: 24 * u, fontWeight: 760, letterSpacing: 5 * u, color: "rgba(255,253,246,0.64)"}}>{eyebrow}</div>
        </div>
        <div style={{position: "relative", width: panelWidth, height: estimatedSize * 1.35}}>
          <div style={{position: "absolute", inset: 0, fontSize: estimatedSize, lineHeight: 1.18, fontWeight: 950, letterSpacing: Math.min(10 * u, estimatedSize * 0.07), color: "transparent", WebkitTextStroke: `${3 * u}px rgba(255,253,246,0.58)`, scale: spring({frame: frame - showAtInFrames - 3, fps, config: {damping: 16, mass: 0.72, stiffness: 165}}), transformOrigin: "left center", whiteSpace: "nowrap"}}>{text}</div>
          <div style={{position: "absolute", inset: 0, fontSize: estimatedSize, lineHeight: 1.18, fontWeight: 950, letterSpacing: Math.min(10 * u, estimatedSize * 0.07), color: unifiedAccent, clipPath: `inset(0 ${accentFill}% 0 0)`, scale: 1 + impactPulse * 0.045, transformOrigin: "left center", textShadow: `0 0 ${12 * u + impactPulse * 28 * u}px ${unifiedAccent}B8, 0 ${18 * u}px ${54 * u}px rgba(0,0,0,0.34)`, whiteSpace: "nowrap"}}>{text}</div>
        </div>
      </div>
    </AbsoluteFill>;
  }

  const numberProgress = interpolate(frame, [showAtInFrames + 8, showAtInFrames + 44], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const shownValue = Math.round(countFrom + (value - countFrom) * numberProgress);
  const circumference = 414.69;
  const ringProgress = interpolate(frame, [showAtInFrames + 5, showAtInFrames + 48], [0, 0.78], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const unitIn = interpolate(frame, [showAtInFrames + 40, showAtInFrames + 53], [0, 1], clamp);
  const captionIn = interpolate(frame, [showAtInFrames + 50, showAtInFrames + 64], [0, 1], clamp);

  return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
    <div style={{position: "absolute", left: x, top: y, width: 610 * u, height: 390 * u, borderRadius: 34 * u, background: "linear-gradient(145deg, rgba(37,33,27,0.84), rgba(20,18,15,0.68))", outline: `1px solid ${unifiedAccent}55`, boxShadow: `0 ${34 * u}px ${90 * u}px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.07)`, opacity: enter * (1 - exit), translate: `${(1 - enter) * 34 * u}px ${exit * 18 * u}px`}}>
      <svg width={210 * u} height={210 * u} viewBox="0 0 160 160" style={{position: "absolute", left: 40 * u, top: 54 * u}}>
        <circle cx="80" cy="80" r="66" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle cx="80" cy="80" r="66" fill="none" stroke={unifiedAccent} strokeLinecap="round" strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - ringProgress)} transform="rotate(-90 80 80)" />
        <circle cx="80" cy="80" r="48" fill={`${unifiedAccent}10`} />
      </svg>
      <div style={{position: "absolute", left: 286 * u, top: 60 * u}}>
        <div style={{fontSize: 25 * u, fontWeight: 760, letterSpacing: 4 * u, color: "rgba(255,253,246,0.58)"}}>{eyebrow}</div>
        <div style={{display: "flex", alignItems: "baseline", gap: 12 * u, marginTop: 14 * u}}>
          <div style={{fontSize: 150 * u, lineHeight: 1, fontWeight: 950, color: "#FFFDF6", fontVariantNumeric: "tabular-nums", scale: spring({frame: frame - showAtInFrames - 6, fps, config: {damping: 17, mass: 0.65, stiffness: 170}}), transformOrigin: "left bottom", textShadow: `0 ${18 * u}px ${48 * u}px rgba(0,0,0,0.3)`}}>{shownValue}</div>
          <div style={{fontSize: 52 * u, fontWeight: 900, color: unifiedAccent, opacity: unitIn, translate: `0px ${(1 - unitIn) * 18 * u}px`}}>{unit}</div>
        </div>
      </div>
      {caption ? <div style={{position: "absolute", left: 44 * u, right: 44 * u, bottom: 44 * u, display: "flex", alignItems: "center", gap: 16 * u, opacity: captionIn}}><div style={{width: 44 * u, height: 5 * u, borderRadius: 99, backgroundColor: unifiedAccent}} /><div style={{fontSize: 34 * u, fontWeight: 820, letterSpacing: u}}>{caption}</div></div> : null}
    </div>
  </AbsoluteFill>;
};
