import {ProgressiveCopy, surfaceEntrance} from "../lib/ProgressiveCopy";
import React from "react";
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {ForegroundPlacement, getAlignedX, getForegroundZone} from "../lib/layout";
import {EDITABLE_ROOM_LIGHT_PALETTE} from "../lib/room-light-palette";

const FONT = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

export type DefinitionRevealProps = {
  term: string;
  definition: string;
  placement: ForegroundPlacement;
  visualVariant?: "termMeaning" | "termDecoder";
  eyebrow?: string;
  accentColor?: string;
  secondaryAccentColor?: string;
  showAtInFrames?: number;
  definitionAtInFrames?: number;
  exitAtInFrames?: number;
  exitInFrames?: number;
};

export const DefinitionReveal: React.FC<DefinitionRevealProps> = ({
  term,
  definition,
  placement,
  visualVariant = "termMeaning",
  eyebrow = "一个概念",
  accentColor = "#D8FF3F",
  secondaryAccentColor = "#FFB44A",
  showAtInFrames = 0,
  definitionAtInFrames = showAtInFrames + 22,
  exitAtInFrames,
  exitInFrames = 12,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const zone = getForegroundZone({width, height, placement});
  const u = Math.max(0.52, Math.min(zone.width / 690, zone.height / 430, 1.55));
  const panelWidth = 690 * u;
  const panelHeight = 430 * u;
  const x = getAlignedX({zone, itemWidth: panelWidth, placement});
  const y = zone.y + (zone.height - panelHeight) / 2;
  const bracket = interpolate(frame, [showAtInFrames, showAtInFrames + 18], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const termIn = interpolate(frame, [showAtInFrames + 8, showAtInFrames + 24], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const meaningIn = interpolate(frame, [definitionAtInFrames, definitionAtInFrames + 18], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const exit = exitAtInFrames === undefined ? 0 : interpolate(
    frame,
    [exitAtInFrames, exitAtInFrames + exitInFrames],
    [0, 1],
    {...clamp, easing: Easing.bezier(0.7, 0, 0.84, 0)},
  );
  const termSize = Math.min(106 * u, (panelWidth * 0.83) / Math.max(term.length * 0.92, 2.5));
  const termCopyStart = showAtInFrames + (visualVariant === "termDecoder" ? 8 : 0);

  if (visualVariant === "termDecoder") {
    const accent = EDITABLE_ROOM_LIGHT_PALETTE.青蓝.hex;
    const rgb = EDITABLE_ROOM_LIGHT_PALETTE.青蓝.rgb;
    const decoderWidth = Math.min(zone.width, 1000 * u);
    const decoderHeight = 330 * u;
    const decoderX = getAlignedX({zone, itemWidth: decoderWidth, placement});
    const decoderY = zone.y + (zone.height - decoderHeight) / 2;
    const termCardWidth = decoderWidth * 0.33;
    const meaningCardWidth = decoderWidth * 0.50;
    const gap = decoderWidth * 0.14;
    const decoderTermIn = surfaceEntrance(frame, showAtInFrames + 8, fps);
    const link = interpolate(frame, [showAtInFrames + 26, Math.max(showAtInFrames + 27, definitionAtInFrames + 2)], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
    const decoderMeaningIn = surfaceEntrance(frame, definitionAtInFrames, fps);
    const scan = interpolate(frame, [definitionAtInFrames + 10, definitionAtInFrames + 48], [-10, 110], clamp);
    const glass = `linear-gradient(145deg, rgba(${rgb},0.11), rgba(7,9,12,0.66))`;
    return <AbsoluteFill data-foreground-overlay-root="true" data-single-accent-variant="cyan" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
      <div style={{position: "absolute", left: decoderX, top: decoderY, width: decoderWidth, height: decoderHeight, opacity: 1 - exit}}>
        <div data-content-sized-surface="definition-term" style={{position: "absolute", left: 0, top: 38 * u, width: termCardWidth, height: 166 * u, display: "grid", placeItems: "center", borderRadius: 30 * u, background: glass, border: `2px solid rgba(${rgb},0.58)`, boxShadow: `0 ${20 * u}px ${48 * u}px rgba(0,0,0,0.34), 0 0 ${34 * u}px rgba(${rgb},0.16), inset 0 1px 0 rgba(255,255,255,0.10)`, opacity: decoderTermIn, scale: 0.90 + decoderTermIn * 0.10}}>
          <div style={{textAlign: "center"}}><div data-card-label="true" style={{color: accent, fontSize: 16 * u, fontWeight: 900, letterSpacing: 4 * u}}><ProgressiveCopy text={eyebrow} startAt={termCopyStart} delaySeconds={0.42} beforeFrame={exitAtInFrames}/></div><div data-primary-text="true" style={{marginTop: 15 * u, fontSize: Math.min(46 * u, (termCardWidth * 0.78) / Math.max(term.length * 0.9, 2.8)), lineHeight: 1, fontWeight: 950, color: "#FFFDF8", whiteSpace: "nowrap"}}><ProgressiveCopy text={term} startAt={termCopyStart} delaySeconds={0.72} beforeFrame={exitAtInFrames}/></div></div>
        </div>
        <div aria-hidden="true" style={{position: "absolute", left: termCardWidth + 22 * u, top: 95 * u, width: gap - 28 * u, height: 50 * u, opacity: link}}>
          <div style={{position: "absolute", left: 0, top: 23 * u, width: `${84 * link}%`, height: 3 * u, borderRadius: 99, background: accent, boxShadow: `0 0 ${14 * u}px rgba(${rgb},0.62)`}} />
          <div style={{position: "absolute", right: 0, top: 15 * u, width: 18 * u, height: 18 * u, borderTop: `${3 * u}px solid ${accent}`, borderRight: `${3 * u}px solid ${accent}`, rotate: "45deg"}} />
        </div>
        <div data-content-sized-surface="definition-meaning" style={{position: "absolute", left: termCardWidth + gap, top: 0, width: meaningCardWidth, height: 240 * u, padding: `${36 * u}px ${42 * u}px`, boxSizing: "border-box", borderRadius: 30 * u, overflow: "hidden", background: glass, border: `1px solid rgba(${rgb},0.46)`, boxShadow: `0 ${22 * u}px ${52 * u}px rgba(0,0,0,0.34), 0 0 ${32 * u}px rgba(${rgb},0.12), inset 0 1px 0 rgba(255,255,255,0.09)`, opacity: decoderMeaningIn, translate: `${(1 - decoderMeaningIn) * 32 * u}px 0px`}}>
          <div data-card-label="true" style={{color: accent, fontSize: 16 * u, fontWeight: 900, letterSpacing: 4 * u}}><ProgressiveCopy text={"含义"} startAt={definitionAtInFrames} delaySeconds={0.42} beforeFrame={exitAtInFrames}/></div>
          <div data-primary-text="true" style={{marginTop: 22 * u, fontSize: 39 * u, lineHeight: 1.36, fontWeight: 820, color: "#FFFDF8", whiteSpace: "pre-line"}}><ProgressiveCopy text={definition} startAt={definitionAtInFrames} delaySeconds={0.72} beforeFrame={exitAtInFrames}/></div>
          <div aria-hidden="true" style={{position: "absolute", top: -30 * u, left: `${scan}%`, width: 55 * u, height: 310 * u, rotate: "11deg", background: `linear-gradient(90deg, transparent, rgba(${rgb},0.20), transparent)`}} />
        </div>
      </div>
    </AbsoluteFill>;
  }

  return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
    <div style={{position: "absolute", left: x, top: y, width: panelWidth, height: panelHeight, opacity: 1 - exit}}>
      <div style={{position: "absolute", left: 0, top: 38 * u, width: 22 * u, height: 250 * u}}>
        <div style={{position: "absolute", left: 0, top: 0, width: 22 * u * bracket, height: 6 * u, borderRadius: 99, backgroundColor: accentColor}} />
        <div style={{position: "absolute", left: 0, top: 0, width: 6 * u, height: 250 * u * bracket, borderRadius: 99, background: `linear-gradient(180deg, ${accentColor}, ${secondaryAccentColor})`}} />
        <div style={{position: "absolute", left: 0, bottom: 0, width: 22 * u * bracket, height: 6 * u, borderRadius: 99, backgroundColor: secondaryAccentColor}} />
      </div>
      <div style={{position: "absolute", left: 56 * u, top: 0, opacity: termIn, translate: `${(1 - termIn) * -26 * u}px 0px`}}>
        <div style={{fontSize: 24 * u, fontWeight: 820, letterSpacing: 6 * u, color: accentColor}}><ProgressiveCopy text={eyebrow} startAt={termCopyStart} delaySeconds={0.42} beforeFrame={exitAtInFrames}/></div>
        <div style={{marginTop: 15 * u, fontSize: termSize, lineHeight: 1.05, fontWeight: 950, letterSpacing: 3 * u, color: "#FFFDF6", textShadow: `0 ${20 * u}px ${58 * u}px rgba(0,0,0,0.32)`, whiteSpace: "nowrap"}}><ProgressiveCopy text={term} startAt={termCopyStart} delaySeconds={0.72} beforeFrame={exitAtInFrames}/></div>
      </div>
      <div style={{position: "absolute", left: 58 * u, top: 190 * u, width: 560 * u, opacity: meaningIn, translate: `0px ${(1 - meaningIn) * 24 * u}px`}}>
        <div style={{width: 82 * u, height: 5 * u, borderRadius: 99, background: `linear-gradient(90deg, ${secondaryAccentColor}, ${secondaryAccentColor}22)`}} />
        <div style={{marginTop: 23 * u, fontSize: 43 * u, lineHeight: 1.35, fontWeight: 760, color: "rgba(255,253,246,0.84)", whiteSpace: "pre-line"}}><ProgressiveCopy text={definition} startAt={definitionAtInFrames} delaySeconds={0.72} beforeFrame={exitAtInFrames}/></div>
      </div>
    </div>
  </AbsoluteFill>;
};
