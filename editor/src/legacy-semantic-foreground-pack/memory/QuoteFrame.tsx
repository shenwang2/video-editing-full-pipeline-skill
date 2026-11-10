import {ProgressiveCopy, surfaceEntrance} from "../lib/ProgressiveCopy";
import React from "react";
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {ForegroundPlacement, getAlignedX, getForegroundZone} from "../lib/layout";
import {EDITABLE_ROOM_LIGHT_PALETTE} from "../lib/room-light-palette";

const FONT = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

export type QuoteFrameProps = {
  quote: string;
  placement: ForegroundPlacement;
  visualVariant?: "attributedQuote" | "excerptCard";
  attribution?: string;
  highlight?: string;
  accentColor?: string;
  secondaryAccentColor?: string;
  showAtInFrames?: number;
  attributionAtInFrames?: number;
  exitAtInFrames?: number;
  exitInFrames?: number;
};


export const QuoteFrame: React.FC<QuoteFrameProps> = ({
  quote,
  placement,
  visualVariant = "attributedQuote",
  attribution,
  highlight,
  accentColor = "#D8FF3F",
  secondaryAccentColor = "#FFB44A",
  showAtInFrames = 0,
  attributionAtInFrames = showAtInFrames + 42,
  exitAtInFrames,
  exitInFrames = 12,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const zone = getForegroundZone({width, height, placement});
  const u = Math.max(0.52, Math.min(zone.width / 690, zone.height / 470, 1.55));
  const panelWidth = 690 * u;
  const panelHeight = 470 * u;
  const x = getAlignedX({zone, itemWidth: panelWidth, placement});
  const y = zone.y + (zone.height - panelHeight) / 2;
  const rail = interpolate(frame, [showAtInFrames, showAtInFrames + 16], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const words = interpolate(frame, [showAtInFrames + 13, showAtInFrames + 38], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const sourceIn = interpolate(frame, [attributionAtInFrames, attributionAtInFrames + 15], [0, 1], clamp);
  const exit = exitAtInFrames === undefined ? 0 : interpolate(frame, [exitAtInFrames, exitAtInFrames + exitInFrames], [0, 1], {...clamp, easing: Easing.bezier(0.7, 0, 0.84, 0)});
  const quoteSize = Math.min(55 * u, (panelWidth * 0.82) / Math.max(Math.min(quote.length, 16) * 0.7, 7));

  if (visualVariant === "excerptCard") {
    const accent = EDITABLE_ROOM_LIGHT_PALETTE.粉红.hex;
    const rgb = EDITABLE_ROOM_LIGHT_PALETTE.粉红.rgb;
    const excerptU = Math.max(0.48, Math.min(zone.width / 860, zone.height / 390, 1.55));
    const groupWidth = 860 * excerptU;
    const groupHeight = 390 * excerptU;
    const groupX = getAlignedX({zone, itemWidth: groupWidth, placement});
    const groupY = zone.y + (zone.height - groupHeight) / 2;
    const cardIn = surfaceEntrance(frame, showAtInFrames + 7, fps);
    const quoteMarkIn = spring({frame: frame - showAtInFrames - 20, fps, config: {damping: 13, stiffness: 170, mass: 0.65}});
    const sourceIn = spring({frame: frame - attributionAtInFrames, fps, config: {damping: 16, stiffness: 170, mass: 0.65}});
    const scan = interpolate(frame, [showAtInFrames + 30, showAtInFrames + 76], [-8, 108], clamp);
    const excerptSize = Math.max(31 * excerptU, Math.min(46 * excerptU, (650 * excerptU) / Math.max(Math.min(quote.length, 18) * 0.72, 8)));
    return <AbsoluteFill data-foreground-overlay-root="true" data-single-accent-variant="pink" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
      <div style={{position: "absolute", left: groupX, top: groupY, width: groupWidth, height: groupHeight, opacity: 1 - exit}}>
        <div style={{position: "absolute", left: 0, top: 28 * excerptU, width: 820 * excerptU, height: 282 * excerptU, borderRadius: 32 * excerptU, overflow: "hidden", background: `linear-gradient(145deg, rgba(${rgb},0.12), rgba(8,9,13,0.74))`, border: `1px solid rgba(${rgb},0.52)`, boxShadow: `0 ${26 * excerptU}px ${62 * excerptU}px rgba(0,0,0,0.38), 0 0 ${38 * excerptU}px rgba(${rgb},0.14), inset 0 1px 0 rgba(255,255,255,0.10)`, opacity: cardIn, translate: `0px ${(1 - cardIn) * 28 * excerptU}px`}}>
          <div style={{position: "absolute", left: 0, top: 0, bottom: 0, width: 9 * excerptU, background: accent, boxShadow: `0 0 ${24 * excerptU}px rgba(${rgb},0.65)`}} />
          <div aria-hidden="true" style={{position: "absolute", left: 42 * excerptU, top: 26 * excerptU, fontFamily: "Georgia, serif", fontSize: 112 * excerptU, lineHeight: 1, color: accent, opacity: quoteMarkIn, scale: 0.8 + quoteMarkIn * 0.2}}>“</div>
          <div style={{position: "absolute", left: 120 * excerptU, top: 70 * excerptU, width: 650 * excerptU}}>
            <div data-primary-text="true" style={{fontSize: excerptSize, lineHeight: 1.52, fontWeight: 800, letterSpacing: 2 * excerptU, color: "#FFFDF8", whiteSpace: "pre-line"}}><ProgressiveCopy text={`“${quote}”`} startAt={showAtInFrames + 7} delaySeconds={0.72} beforeFrame={exitAtInFrames} highlight={highlight} highlightColor={accent}/></div>
          </div>
          <div aria-hidden="true" style={{position: "absolute", left: `${scan}%`, top: -40 * excerptU, width: 48 * excerptU, height: 360 * excerptU, rotate: "10deg", background: `linear-gradient(90deg, transparent, rgba(${rgb},0.17), transparent)`}} />
          <div aria-hidden="true" style={{position: "absolute", right: 30 * excerptU, top: 26 * excerptU, width: 70 * excerptU, height: 4 * excerptU, borderRadius: 99, background: accent, opacity: quoteMarkIn}} />
        </div>
        {attribution ? <div style={{position: "absolute", right: 0, top: 286 * excerptU, padding: `${13 * excerptU}px ${23 * excerptU}px`, borderRadius: 999, display: "flex", alignItems: "center", gap: 12 * excerptU, background: `rgba(${rgb},0.13)`, border: `1px solid rgba(${rgb},0.48)`, boxShadow: `0 ${14 * excerptU}px ${34 * excerptU}px rgba(0,0,0,0.30), 0 0 ${24 * excerptU}px rgba(${rgb},0.14)`, opacity: sourceIn, translate: `${(1 - sourceIn) * 30 * excerptU}px 0px`}}><div style={{width: 8 * excerptU, height: 8 * excerptU, borderRadius: "50%", background: accent, boxShadow: `0 0 ${13 * excerptU}px rgba(${rgb},0.72)`}} /><div style={{fontSize: 20 * excerptU, fontWeight: 820, letterSpacing: 3 * excerptU, color: accent}}><ProgressiveCopy text={attribution} startAt={attributionAtInFrames} delaySeconds={0.42} beforeFrame={exitAtInFrames}/></div></div> : null}
      </div>
    </AbsoluteFill>;
  }

  return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
    <div style={{position: "absolute", left: x, top: y, width: panelWidth, height: panelHeight, opacity: 1 - exit}}>
      <div style={{position: "absolute", left: 0, top: 78 * u, width: 8 * u, height: 300 * u * rail, borderRadius: 99, background: `linear-gradient(180deg, ${accentColor}, ${secondaryAccentColor})`}} />
      <div style={{position: "absolute", left: 34 * u, top: -16 * u, fontFamily: "Georgia, serif", fontSize: 220 * u, lineHeight: 1, color: `${accentColor}29`, opacity: rail, scale: 0.82 + rail * 0.18}}>“</div>
      <div style={{position: "absolute", left: 66 * u, top: 104 * u, width: 584 * u, opacity: words, translate: `${(1 - words) * 26 * u}px 0px`}}>
        <div style={{fontSize: quoteSize, lineHeight: 1.42, fontWeight: 790, letterSpacing: 2 * u, color: "#FFFDF6", whiteSpace: "pre-line"}}><ProgressiveCopy text={`“${quote}”`} startAt={showAtInFrames} delaySeconds={0.72} beforeFrame={exitAtInFrames} highlight={highlight} highlightColor={accentColor}/></div>
      </div>
      {attribution ? <div style={{position: "absolute", left: 66 * u, bottom: 40 * u, display: "flex", alignItems: "center", gap: 16 * u, opacity: sourceIn}}>
        <div style={{width: 58 * u, height: 4 * u, borderRadius: 99, backgroundColor: secondaryAccentColor}} />
        <div style={{fontSize: 25 * u, fontWeight: 760, letterSpacing: 3 * u, color: "rgba(255,253,246,0.58)"}}><ProgressiveCopy text={attribution} startAt={attributionAtInFrames} delaySeconds={0.42} beforeFrame={exitAtInFrames}/></div>
      </div> : null}
    </div>
  </AbsoluteFill>;
};
