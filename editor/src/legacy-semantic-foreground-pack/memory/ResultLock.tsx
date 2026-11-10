import {ProgressiveCopy, surfaceEntrance} from "../lib/ProgressiveCopy";
import React from "react";
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {getContentCardWidth, getForegroundTypographyScale} from "../lib/content-sizing";
import {ForegroundPlacement, getAlignedX, getForegroundZone} from "../lib/layout";
import {EDITABLE_ROOM_LIGHT_PALETTE} from "../lib/room-light-palette";

const FONT = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

export type ResultLockProps = {
  pendingText: string;
  resultText: string;
  resultAtInFrames: number;
  placement: ForegroundPlacement;
  visualVariant?: "statusToResult" | "dualStateDock";
  statusLabel?: string;
  resultLabel?: string;
  pendingDetail?: string;
  resultDetail?: string;
  numericProgress?: number;
  accentColor?: string;
  showAtInFrames?: number;
  exitAtInFrames?: number;
  exitInFrames?: number;
};

export const ResultLock: React.FC<ResultLockProps> = ({
  pendingText,
  resultText,
  resultAtInFrames,
  placement,
  visualVariant = "statusToResult",
  statusLabel = "当前状态",
  resultLabel = "结果状态",
  pendingDetail,
  resultDetail,
  numericProgress,
  accentColor = "#71F0A7",
  showAtInFrames = 0,
  exitAtInFrames,
  exitInFrames = 12,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const zone = getForegroundZone({width, height, placement});
  const u = getForegroundTypographyScale({width, height});
  const statusSize = 22 * u;
  const primarySize = 64 * u;
  const auxiliarySize = 26 * u;
  const horizontalPadding = 32 * u;
  const cardGap = 34 * u;
  const maximumCardWidth = Math.max(1, (zone.width - cardGap) / 2);
  const cardWidth = getContentCardWidth({
    rows: [
      {text: statusLabel, fontSize: statusSize, letterSpacing: 4 * u},
      {text: pendingText, fontSize: primarySize},
      {text: resultLabel, fontSize: statusSize, letterSpacing: 4 * u},
      {text: resultText, fontSize: primarySize},
    ],
    horizontalPadding,
    minWidth: Math.min(330 * u, maximumCardWidth),
    maxWidth: maximumCardWidth,
  });
  const cardHeight = 194 * u;
  const hasAuxiliary = Boolean(pendingDetail || resultDetail || numericProgress !== undefined);
  const auxiliaryHeight = hasAuxiliary ? 42 * u : 0;
  const groupWidth = cardWidth * 2 + cardGap;
  const groupHeight = cardHeight + (hasAuxiliary ? 14 * u + auxiliaryHeight : 0);
  const x = getAlignedX({zone, itemWidth: groupWidth, placement});
  const y = zone.y + (zone.height - groupHeight) / 2;
  const pendingIn = surfaceEntrance(frame, showAtInFrames, fps);
  const resultIn = surfaceEntrance(frame, resultAtInFrames, fps);
  const progressEnd = Math.max(showAtInFrames + 16, resultAtInFrames);
  const progress = interpolate(frame, [showAtInFrames + 8, progressEnd], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const pendingEmphasis = interpolate(frame, [resultAtInFrames, resultAtInFrames + 13], [1, 0.7], clamp);
  const done = interpolate(frame, [resultAtInFrames + Math.round(fps * 1.0), resultAtInFrames + Math.round(fps * 1.3)], [0, 1], clamp);
  const exit = exitAtInFrames === undefined
    ? 0
    : interpolate(frame, [exitAtInFrames, exitAtInFrames + exitInFrames], [0, 1], {
      ...clamp,
      easing: Easing.bezier(0.7, 0, 0.84, 0),
    });
  const groundedPercent = numericProgress === undefined
    ? null
    : Math.round(Math.min(Math.max(numericProgress, 0), 1) * 100);
  const cardBackground = "linear-gradient(145deg, rgba(24,31,27,0.76), rgba(18,20,17,0.50))";
  const cardShadow = `0 ${28 * u}px ${68 * u}px rgba(0,0,0,0.29), inset 0 1px 0 rgba(255,255,255,0.07)`;

  if (visualVariant === "dualStateDock") {
    const accent = EDITABLE_ROOM_LIGHT_PALETTE.荧光绿.hex;
    const rgb = EDITABLE_ROOM_LIGHT_PALETTE.荧光绿.rgb;
    const dockCardHeight = 190 * u;
    const dockCardWidth = cardWidth;
    const dockGroupHeight = dockCardHeight + (hasAuxiliary ? 56 * u : 0);
    const dockY = zone.y + (zone.height - dockGroupHeight) / 2;
    const dockGlass = `linear-gradient(145deg, rgba(${rgb},0.09), rgba(8,10,12,0.70))`;
    const lockIn = spring({frame: frame - resultAtInFrames - Math.round(fps * 1.0), fps, config: {damping: 14, stiffness: 190, mass: 0.58}});
    return <AbsoluteFill data-foreground-overlay-root="true" data-single-accent-variant="fluorescent-green" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
      <div style={{position: "absolute", left: x, top: dockY, width: groupWidth, height: dockGroupHeight, opacity: 1 - exit}}>
        {[{left: 0, label: statusLabel, text: pendingText, progress: true, opacity: pendingIn, shift: (1 - pendingIn) * -28 * u}, {left: dockCardWidth + cardGap, label: resultLabel, text: resultText, progress: false, opacity: resultIn, shift: (1 - resultIn) * 42 * u}].map((item, index) => <div key={item.label} data-content-sized-surface={index === 0 ? "status-result-pending" : "status-result-final"} data-card-copy-structure="label-primary" style={{position: "absolute", left: item.left, top: 0, width: dockCardWidth, height: dockCardHeight, padding: `${31 * u}px ${34 * u}px`, boxSizing: "border-box", borderRadius: 28 * u, background: dockGlass, border: `1px solid rgba(${rgb},${index === 0 ? 0.44 : 0.62})`, boxShadow: `0 ${20 * u}px ${48 * u}px rgba(0,0,0,0.34), 0 0 ${(index === 0 ? 30 : 48) * u}px rgba(${rgb},0.16), inset 0 1px 0 rgba(255,255,255,0.09)`, opacity: item.opacity, translate: `${item.shift}px 0px`}}>
          <div data-card-label="true" style={{color: accent, fontSize: 16 * u, fontWeight: 900, letterSpacing: 4 * u}}><ProgressiveCopy text={item.label} startAt={index === 0 ? showAtInFrames : resultAtInFrames} delaySeconds={0.42} beforeFrame={exitAtInFrames}/></div>
          <div data-primary-text="true" style={{marginTop: 18 * u, paddingRight: index === 1 ? 54 * u : 0, fontSize: 52 * u, lineHeight: 1, fontWeight: 950, color: "#FFFDF8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}><ProgressiveCopy text={item.text} startAt={index === 0 ? showAtInFrames : resultAtInFrames} delaySeconds={0.72} beforeFrame={exitAtInFrames}/></div>
          {item.progress ? <div style={{position: "absolute", left: 34 * u, right: 34 * u, bottom: 27 * u, height: 7 * u, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden"}}><div style={{width: `${progress * 100}%`, height: "100%", borderRadius: 99, background: accent, boxShadow: `0 0 ${18 * u}px rgba(${rgb},0.60)`}} /></div> : <div style={{position: "absolute", right: 24 * u, bottom: 22 * u, width: 52 * u, height: 52 * u, borderRadius: "50%", display: "grid", placeItems: "center", background: `rgba(${rgb},0.10)`, border: `${2 * u}px solid ${accent}`, opacity: lockIn, scale: lockIn}}><svg width={31 * u} height={31 * u} viewBox="0 0 32 32"><path d="M6 17 L13 24 L27 8" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg></div>}
        </div>)}
        <div aria-hidden="true" style={{position: "absolute", left: dockCardWidth + 7 * u, top: dockCardHeight / 2 - 2 * u, width: cardGap - 14 * u, height: 4 * u, borderRadius: 99, background: accent, opacity: resultIn, scale: `${resultIn} 1`, transformOrigin: "left center"}}><div style={{position: "absolute", right: 0, top: -6 * u, width: 14 * u, height: 14 * u, borderTop: `${3 * u}px solid ${accent}`, borderRight: `${3 * u}px solid ${accent}`, rotate: "45deg"}} /></div>
        {pendingDetail ? <div data-auxiliary-text="true" style={{position: "absolute", left: 0, top: dockCardHeight + 14 * u, width: dockCardWidth, fontSize: auxiliarySize, color: "rgba(255,255,255,0.60)", opacity: pendingIn}}><ProgressiveCopy text={pendingDetail} startAt={showAtInFrames} delaySeconds={1.12} beforeFrame={exitAtInFrames}/></div> : null}
        {resultDetail ? <div data-auxiliary-text="true" style={{position: "absolute", left: dockCardWidth + cardGap, top: dockCardHeight + 14 * u, width: dockCardWidth, fontSize: auxiliarySize, color: "rgba(255,255,255,0.66)", opacity: resultIn}}><ProgressiveCopy text={resultDetail} startAt={resultAtInFrames} delaySeconds={1.12} beforeFrame={exitAtInFrames}/></div> : null}
      </div>
    </AbsoluteFill>;
  }

  return (
    <AbsoluteFill
      data-foreground-overlay-root="true"
      style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}
    >
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: groupWidth,
          height: groupHeight,
          opacity: 1 - exit,
          translate: `0px ${exit * 18 * u}px`,
        }}
      >
        <div
          data-content-sized-surface="status-result-pending"
          data-card-copy-structure="label-primary"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: cardWidth,
            height: cardHeight,
            boxSizing: "border-box",
            padding: `${28 * u}px ${horizontalPadding}px`,
            borderRadius: 24 * u,
            background: cardBackground,
            backdropFilter: "blur(10px) saturate(1.05)",
            outline: "1px solid rgba(255,255,255,0.13)",
            boxShadow: cardShadow,
            opacity: pendingIn * pendingEmphasis,
            translate: `${(1 - pendingIn) * 30 * u}px 0px`,
          }}
        >
          <div data-card-label="true" style={{fontSize: statusSize, fontWeight: 820, letterSpacing: 4 * u, color: "rgba(255,253,246,0.58)"}}><ProgressiveCopy text={statusLabel} startAt={showAtInFrames} delaySeconds={0.42} beforeFrame={exitAtInFrames}/></div>
          <div data-primary-text="true" style={{marginTop: 10 * u, fontSize: primarySize, lineHeight: 1.06, fontWeight: 930, color: "#FFFDF6", overflowWrap: "anywhere"}}><ProgressiveCopy text={pendingText} startAt={showAtInFrames} delaySeconds={0.72} beforeFrame={exitAtInFrames}/></div>
          <div style={{position: "absolute", left: horizontalPadding, right: horizontalPadding, bottom: 25 * u, height: 10 * u, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden"}}>
            <div style={{width: `${progress * 100}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, #D8FF3F, ${accentColor})`, boxShadow: `0 0 ${22 * u}px ${accentColor}47`}} />
          </div>
        </div>

        <div
          aria-hidden="true"
          style={{position: "absolute", left: cardWidth + 7 * u, top: cardHeight / 2 - 2 * u, width: cardGap - 14 * u, height: 4 * u, borderRadius: 999, backgroundColor: accentColor, opacity: resultIn * 0.86, scale: `${resultIn} 1`, transformOrigin: "left center"}}
        >
          <div style={{position: "absolute", right: -1 * u, top: -7 * u, width: 14 * u, height: 14 * u, borderTop: `${4 * u}px solid ${accentColor}`, borderRight: `${4 * u}px solid ${accentColor}`, rotate: "45deg"}} />
        </div>

        <div
          data-content-sized-surface="status-result-final"
          data-card-copy-structure="label-primary"
          style={{
            position: "absolute",
            left: cardWidth + cardGap,
            top: 0,
            width: cardWidth,
            height: cardHeight,
            boxSizing: "border-box",
            padding: `${28 * u}px ${horizontalPadding}px`,
            borderRadius: 24 * u,
            background: cardBackground,
            backdropFilter: "blur(10px) saturate(1.05)",
            outline: `1px solid ${accentColor}66`,
            boxShadow: `${cardShadow}, 0 0 ${30 * u}px ${accentColor}24`,
            opacity: resultIn,
            translate: `${(1 - resultIn) * 34 * u}px 0px`,
          }}
        >
          <div data-card-label="true" style={{fontSize: statusSize, fontWeight: 820, letterSpacing: 4 * u, color: `${accentColor}C7`}}><ProgressiveCopy text={resultLabel} startAt={resultAtInFrames} delaySeconds={0.42} beforeFrame={exitAtInFrames}/></div>
          <div data-primary-text="true" style={{marginTop: 10 * u, paddingRight: 68 * u, fontSize: primarySize, lineHeight: 1.06, fontWeight: 930, color: accentColor, overflowWrap: "anywhere"}}><ProgressiveCopy text={resultText} startAt={resultAtInFrames} delaySeconds={0.72} beforeFrame={exitAtInFrames}/></div>
          <div style={{position: "absolute", right: 27 * u, top: cardHeight / 2 - 31 * u, width: 62 * u, height: 62 * u, borderRadius: 999, display: "grid", placeItems: "center", backgroundColor: `${accentColor}17`, outline: `2px solid ${accentColor}85`, scale: spring({frame: frame - resultAtInFrames - Math.round(fps * 1.0), fps, config: {damping: 15, mass: 0.65, stiffness: 165}}), opacity: done}}>
            <svg width={38 * u} height={38 * u} viewBox="0 0 58 58"><path d="M14 30 L24 40 L45 17" fill="none" stroke={accentColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - done} /></svg>
          </div>
        </div>

        {(pendingDetail || groundedPercent !== null) ? (
          <div data-auxiliary-text="true" style={{position: "absolute", left: 0, top: cardHeight + 14 * u, width: cardWidth, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 * u, color: "rgba(255,253,246,0.68)", fontSize: auxiliarySize, lineHeight: 1.25, fontWeight: 620, opacity: pendingIn * pendingEmphasis}}>
            <div style={{minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}><ProgressiveCopy text={pendingDetail} startAt={showAtInFrames} delaySeconds={1.12} beforeFrame={exitAtInFrames}/></div>
            {groundedPercent !== null ? <div style={{flex: "0 0 auto", fontSize: 31 * u, fontWeight: 880, color: accentColor, fontVariantNumeric: "tabular-nums"}}>{groundedPercent}%</div> : null}
          </div>
        ) : null}

        {resultDetail ? (
          <div data-auxiliary-text="true" style={{position: "absolute", left: cardWidth + cardGap, top: cardHeight + 14 * u, width: cardWidth, color: "rgba(255,253,246,0.72)", fontSize: auxiliarySize, lineHeight: 1.25, fontWeight: 620, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", opacity: resultIn}}><ProgressiveCopy text={resultDetail} startAt={resultAtInFrames} delaySeconds={1.12} beforeFrame={exitAtInFrames}/></div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
