import React from "react";
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {ForegroundPlacement, getAlignedX, getForegroundZone} from "../lib/layout";
import {EDITABLE_ROOM_LIGHT_PALETTE} from "../lib/room-light-palette";
import {StatementFocus} from './StatementFocus';

const FONT = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

export type InsightFocusProps = {
  setup?: string;
  headline: string;
  highlight?: string;
  payoff?: string;
  placement?: ForegroundPlacement;
  accentColor?: string;
  secondaryAccentColor?: string;
  visualVariant?: "claimLanding" | "spotlightThesis" | "statementFocus";
  showAtInFrames?: number;
  exitAtInFrames?: number;
  exitInFrames?: number;
};

export const InsightFocus: React.FC<InsightFocusProps> = ({setup, headline, highlight, payoff, placement = "leftMiddle", accentColor = "#D8FF3F", secondaryAccentColor = "#FFB44A", visualVariant = "claimLanding", showAtInFrames = 0, exitAtInFrames, exitInFrames = 12}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const zone = getForegroundZone({width, height, placement});
  const u = Math.max(0.52, Math.min(zone.width / 700, zone.height / 360, 1.55));
  const panelWidth = 690 * u;
  const panelHeight = 350 * u;
  const x = getAlignedX({zone, itemWidth: panelWidth, placement});
  const y = zone.y + (zone.height - panelHeight) / 2;
  const enter = interpolate(frame, [showAtInFrames, showAtInFrames + 14], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const headlineIn = interpolate(frame, [showAtInFrames + 14, showAtInFrames + 30], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const keywordFocus = interpolate(frame, [showAtInFrames + 30, showAtInFrames + 42], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const keywordPulse = interpolate(frame, [showAtInFrames + 30, showAtInFrames + 38, showAtInFrames + 50], [0, 1, 0], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const payoffIn = interpolate(frame, [showAtInFrames + 48, showAtInFrames + 62], [0, 1], clamp);
  const exit = exitAtInFrames === undefined ? 0 : interpolate(frame, [exitAtInFrames, exitAtInFrames + exitInFrames], [0, 1], {...clamp, easing: Easing.bezier(0.7, 0, 0.84, 0)});
  if (visualVariant === 'statementFocus') return <StatementFocus setup={setup} headline={headline} highlight={highlight} payoff={payoff} placement={placement} accentColor={accentColor} showAtInFrames={showAtInFrames} exitAtInFrames={exitAtInFrames} exitInFrames={exitInFrames}/>;
  if (visualVariant === "spotlightThesis") {
    const thesis = EDITABLE_ROOM_LIGHT_PALETTE.电光蓝;
    const focus = interpolate(frame, [showAtInFrames + 30, showAtInFrames + 54], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
    const headlineSize = Math.min(86 * u, (panelWidth * 0.92) / Math.max(headline.length * 0.62, 4.8));
    return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
      <div style={{position: "absolute", left: x, top: y, width: panelWidth, minHeight: panelHeight, opacity: enter * (1 - exit), translate: `${(1 - enter) * -24 * u}px ${exit * 18 * u}px`}}>
        <div style={{display: "inline-block", padding: `${9 * u}px ${17 * u}px`, borderRadius: 12 * u, color: thesis.hex, border: `1px solid rgba(${thesis.rgb},0.48)`, background: `rgba(${thesis.rgb},0.09)`, fontSize: 18 * u, fontWeight: 900, letterSpacing: 4 * u}}>核心观点</div>
        {setup ? <div style={{marginTop: 30 * u, fontSize: 54 * u, lineHeight: 1.14, fontWeight: 900, color: "rgba(255,255,255,0.72)", opacity: headlineIn}}>{setup}</div> : null}
        <div style={{display: "inline-flex", alignItems: "center", minHeight: 112 * u, marginTop: 16 * u, padding: `0 ${26 * u}px ${3 * u}px`, borderRadius: 20 * u, border: `1px solid rgba(${thesis.rgb},${0.24 + focus * 0.48})`, background: `linear-gradient(90deg, rgba(${thesis.rgb},${0.05 + focus * 0.10}), rgba(7,8,12,0.56))`, boxShadow: `0 0 ${20 * u + focus * 42 * u}px rgba(${thesis.rgb},${0.08 + focus * 0.18}), inset 0 1px 0 rgba(255,255,255,0.09)`, clipPath: `inset(0 ${(1 - focus) * 100}% 0 0 round ${20 * u}px)`}}><span style={{fontSize: headlineSize, lineHeight: 1.08, fontWeight: 950, letterSpacing: 3 * u, color: "#FFFDF6", whiteSpace: "pre-wrap"}}>{headline}</span></div>
        {payoff ? <div style={{marginTop: 28 * u, display: "flex", alignItems: "center", gap: 14 * u, opacity: payoffIn}}><div style={{width: 42 * u, height: 4 * u, borderRadius: 99, background: thesis.hex, boxShadow: `0 0 ${15 * u}px rgba(${thesis.rgb},0.56)`}} /><div style={{fontSize: 27 * u, fontWeight: 720, letterSpacing: 3 * u, color: "rgba(255,255,255,0.62)"}}>{payoff}</div></div> : null}
      </div>
    </AbsoluteFill>;
  }
  const hit = highlight ? headline.indexOf(highlight) : -1;
  const headlineContent = hit < 0 || !highlight ? headline : <>{headline.slice(0, hit)}<span style={{position: "relative", display: "inline-block", scale: 1 + keywordPulse * 0.045, transformOrigin: "50% 72%"}}><span>{highlight}</span><span aria-hidden="true" style={{position: "absolute", inset: 0, color: accentColor, opacity: keywordFocus, textShadow: `0 0 ${10 * u + keywordPulse * 20 * u}px ${accentColor}B8`}}>{highlight}</span></span>{headline.slice(hit + highlight.length)}</>;
  return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
    <div style={{position: "absolute", left: x, top: y, width: panelWidth, minHeight: panelHeight, paddingLeft: 34 * u, boxSizing: "border-box", opacity: 1 - exit, translate: `0px ${exit * 18 * u}px`}}>
      <div style={{position: "absolute", left: 0, top: 4 * u, width: 8 * u, height: 196 * u * enter, borderRadius: 999, background: accentColor, boxShadow: `0 0 ${26 * u}px ${accentColor}2B`}} />
      {setup ? <div style={{fontSize: 48 * u, lineHeight: 1.3, fontWeight: 760, color: "rgba(255,253,246,0.64)", letterSpacing: 2 * u, opacity: enter, translate: `0px ${(1 - enter) * 24 * u}px`}}>{setup}</div> : null}
      <div style={{position: "relative", display: "inline-block", marginTop: setup ? 16 * u : 0, maxWidth: panelWidth - 34 * u, fontSize: 92 * u, lineHeight: 1.18, fontWeight: 950, letterSpacing: 3 * u, color: "#FFFDF6", opacity: headlineIn, translate: `0px ${(1 - headlineIn) * 30 * u}px`, whiteSpace: "pre-wrap"}}>{headlineContent}</div>
      {payoff ? <div style={{marginTop: 32 * u, fontSize: 28 * u, fontWeight: 700, color: accentColor, letterSpacing: 3 * u, opacity: payoffIn}}>{payoff}</div> : null}
    </div>
  </AbsoluteFill>;
};
