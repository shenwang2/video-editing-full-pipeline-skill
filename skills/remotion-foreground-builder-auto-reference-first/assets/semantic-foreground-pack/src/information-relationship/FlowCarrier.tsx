import React from "react";
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {CODE_THEMES} from "../lib/code-syntax";
import {ForegroundPlacement, getAlignedX, getForegroundZone} from "../lib/layout";
import {EASING} from "../lib/motion-tokens";
import {EDITABLE_ROOM_LIGHT_PALETTE} from "../lib/room-light-palette";

const FONT = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
export type FlowStage = {label: string; showAtInFrames: number; accentColor?: string};
export type FlowCarrierProps = {stages: FlowStage[]; carrierLabel?: string; visualVariant?: "stageTransfer" | "processingPods"; placement?: ForegroundPlacement; accentColor?: string; theme?: "dark" | "light"; travelInFrames?: number; exitAtInFrames?: number; exitInFrames?: number};

export const FlowCarrier: React.FC<FlowCarrierProps> = ({stages, carrierLabel = "信息", visualVariant = "stageTransfer", placement = "centerSafe", accentColor = "#E8B86D", theme = "dark", travelInFrames = 18, exitAtInFrames, exitInFrames = 14}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const zone = getForegroundZone({width, height, placement});
  const palette = CODE_THEMES[theme];
  const visible = stages.slice(0, 4);
  const baseWidth = 960;
  const baseHeight = 350;
  const u = Math.max(0.68, Math.min(zone.width / baseWidth, zone.height / baseHeight, 1.55));
  const panelWidth = baseWidth * u;
  const panelHeight = baseHeight * u;
  const x = getAlignedX({zone, itemWidth: panelWidth, placement});
  const y = zone.y + (zone.height - panelHeight) / 2;
  const paddingX = 100 * u;
  const trackWidth = panelWidth - paddingX * 2;
  const nodeXs = visible.map((_, index) => paddingX + (trackWidth * index) / Math.max(1, visible.length - 1));
  const nodeYs = visible.map((_, index) => (index % 2 === 0 ? 122 : 228) * u);
  const firstAt = visible[0]?.showAtInFrames ?? 0;
  const carrierIn = spring({frame: frame - firstAt, fps, config: {damping: 18, stiffness: 150, mass: 0.8}});
  const exit = exitAtInFrames === undefined ? 0 : interpolate(frame, [exitAtInFrames, exitAtInFrames + exitInFrames], [0, 1], {...clamp, easing: EASING.exit});

  if (visualVariant === "processingPods") {
    const podStages = visible.slice(0, 4);
    const colors = Array.from({length: 4}, () => EDITABLE_ROOM_LIGHT_PALETTE.青蓝);
    const podBaseWidth = 920;
    const podBaseHeight = 330;
    const pu = Math.max(0.64, Math.min(zone.width / podBaseWidth, zone.height / podBaseHeight, 1.48));
    const podWidth = podBaseWidth * pu;
    const podHeight = podBaseHeight * pu;
    const podX = getAlignedX({zone, itemWidth: podWidth, placement});
    const podY = zone.y + Math.max(0, (zone.height - podHeight) / 2);
    const padding = 72 * pu;
    const routeWidth = podWidth - padding * 2;
    const podNodeXs = podStages.map((_, index) => padding + index * (routeWidth / Math.max(1, podStages.length - 1)));
    const podBodyWidth = Math.min(144 * pu, (routeWidth / Math.max(1, podStages.length - 1)) * 0.58);
    const podBodyHeight = 210 * pu;
    const routeY = 150 * pu;
    let liveCarrierX = podNodeXs[0] ?? padding;
    let liveCarrierIndex = 0;
    let carrierLift = 0;
    for (let index = 1; index < podStages.length; index++) {
      const start = podStages[index].showAtInFrames;
      if (frame < start) break;
      const segment = interpolate(frame, [start, start + travelInFrames], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
      liveCarrierX = interpolate(segment, [0, 1], [podNodeXs[index - 1], podNodeXs[index]]);
      carrierLift = Math.sin(segment * Math.PI) * 18 * pu;
      liveCarrierIndex = segment < 0.55 ? index - 1 : index;
      if (segment < 1) break;
    }
    const liveColor = colors[Math.min(liveCarrierIndex, colors.length - 1)];
    const podTrackIn = interpolate(frame, [podStages[0]?.showAtInFrames ?? 0, (podStages.at(-1)?.showAtInFrames ?? 24) + travelInFrames], [0, 1], {...clamp, easing: EASING.editorial});

    return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
      <div style={{position: "absolute", left: podX, top: podY, width: podWidth, height: podHeight, opacity: 1 - exit, translate: `0 ${exit * 22 * pu}px`}}>
        <div style={{position: "absolute", left: padding, top: routeY, width: routeWidth, height: 4 * pu, background: `repeating-linear-gradient(90deg, rgba(255,255,255,0.13) 0 ${9 * pu}px, transparent ${9 * pu}px ${20 * pu}px)`}} />
        <div style={{position: "absolute", left: padding, top: routeY, width: routeWidth * podTrackIn, height: 4 * pu, background: `repeating-linear-gradient(90deg, rgba(255,255,255,0.62) 0 ${9 * pu}px, transparent ${9 * pu}px ${20 * pu}px)`, filter: `drop-shadow(0 0 ${6 * pu}px rgba(255,255,255,0.24))`}} />
        {podStages.map((stage, index) => {
          const color = colors[index];
          const reached = interpolate(frame, [stage.showAtInFrames - 5, stage.showAtInFrames + 10], [0, 1], {...clamp, easing: EASING.enter});
          const nextAt = podStages[index + 1]?.showAtInFrames ?? (exitAtInFrames ?? stage.showAtInFrames + 40);
          const activeIn = interpolate(frame, [stage.showAtInFrames - 4, stage.showAtInFrames + 8], [0, 1], {...clamp, easing: EASING.enter});
          const activeOut = interpolate(frame, [nextAt - 8, nextAt + 3], [0, 1], {...clamp, easing: EASING.exit});
          const active = activeIn * (1 - activeOut);
          return <React.Fragment key={`${stage.label}-${index}`}><div style={{position: "absolute", left: podNodeXs[index] - podBodyWidth / 2, top: routeY - podBodyHeight / 2, width: podBodyWidth, height: podBodyHeight, borderRadius: podBodyWidth / 2, background: `rgba(${color.rgb},0.06)`, border: `${3 * pu}px solid rgba(${color.rgb},${0.34 + reached * 0.5})`, boxShadow: `0 0 ${(21 + active * 28) * pu}px rgba(${color.rgb},${0.12 + active * 0.22}), inset 0 0 ${32 * pu}px rgba(${color.rgb},0.13)`, opacity: 0.44 + reached * 0.56, scale: 0.92 + reached * 0.08 + active * 0.025, boxSizing: "border-box"}}><div style={{position: "absolute", left: 20 * pu, right: 20 * pu, top: 27 * pu, height: 6 * pu, borderRadius: 99, background: color.hex, boxShadow: `0 0 ${15 * pu}px rgba(${color.rgb},0.70)`}} /><div style={{position: "absolute", left: 18 * pu, right: 18 * pu, bottom: 27 * pu, height: 6 * pu, borderRadius: 99, background: color.hex, opacity: 0.48}} /></div><div data-content-sized-surface="flow-processing-pod-label" data-card-copy-structure="label-primary" style={{position: "absolute", left: podNodeXs[index] - 92 * pu, top: routeY + podBodyHeight / 2 + 21 * pu, width: 184 * pu, textAlign: "center", opacity: reached}}><div data-card-label="true" style={{fontSize: 14 * pu, color: color.hex, fontWeight: 880, letterSpacing: "0.1em"}}>STAGE {String(index + 1).padStart(2, "0")}</div><div data-primary-text="true" style={{marginTop: 9 * pu, color: palette.fg, fontSize: 29 * pu, lineHeight: 1, fontWeight: 930, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{stage.label}</div></div></React.Fragment>;
        })}
        <div style={{position: "absolute", left: liveCarrierX - 60 * pu, top: routeY - 34 * pu - carrierLift, width: 120 * pu, height: 68 * pu, borderRadius: 20 * pu, display: "grid", placeItems: "center", background: liveColor.hex, color: "#050608", fontSize: 22 * pu, lineHeight: 1, fontWeight: 950, boxShadow: `0 ${16 * pu}px ${31 * pu}px rgba(0,0,0,0.42), 0 0 ${26 * pu}px rgba(${liveColor.rgb},0.50)`, zIndex: 5, opacity: Math.min(1, carrierIn), scale: 0.94 + Math.min(1, carrierIn) * 0.06 + (carrierLift / Math.max(1, 18 * pu)) * 0.07}}>{carrierLabel}</div>
      </div>
    </AbsoluteFill>;
  }

  if (visible.length === 0) return null;

  // Backward-compatible contract token: carrierTravelsThenStageLocks.
  // The reviewed stageTransfer visual is now a relay route: one carrier arrives
  // at each station on its spoken beat while the previous stations stay visible.
  const relayColors = Array.from({length: 4}, () => EDITABLE_ROOM_LIGHT_PALETTE.电光蓝);
  let carrierX = nodeXs[0];
  let carrierY = nodeYs[0] - 82 * u;
  let carrierLift = 0;
  let carrierColorIndex = 0;
  for (let index = 1; index < visible.length; index++) {
    const arrivalAt = visible[index].showAtInFrames;
    const segment = interpolate(frame, [arrivalAt - travelInFrames, arrivalAt], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
    if (segment <= 0) break;
    carrierX = interpolate(segment, [0, 1], [nodeXs[index - 1], nodeXs[index]]);
    carrierY = interpolate(segment, [0, 1], [nodeYs[index - 1] - 82 * u, nodeYs[index] - 82 * u]);
    carrierLift = Math.sin(segment * Math.PI) * 22 * u;
    carrierColorIndex = segment < 0.55 ? index - 1 : index;
    if (segment < 1) break;
  }
  const carrierColor = relayColors[Math.min(carrierColorIndex, relayColors.length - 1)];
  const cardWidth = Math.min(222 * u, visible.length === 4 ? 196 * u : 222 * u);
  const cardHeight = 104 * u;

  return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
    <div style={{position: "absolute", left: x, top: y, width: panelWidth, height: panelHeight, opacity: 1 - exit, translate: `0px ${exit * 24 * u}px`}}>
      <svg width={panelWidth} height={panelHeight} viewBox={`0 0 ${panelWidth} ${panelHeight}`} style={{position: "absolute", inset: 0, overflow: "visible"}}>
        {visible.slice(1).map((stage, index) => {
          const fromIndex = index;
          const toIndex = index + 1;
          const fromX = nodeXs[fromIndex];
          const fromY = nodeYs[fromIndex];
          const toX = nodeXs[toIndex];
          const toY = nodeYs[toIndex];
          const bend = (toX - fromX) * 0.42;
          const path = `M ${fromX} ${fromY} C ${fromX + bend} ${fromY}, ${toX - bend} ${toY}, ${toX} ${toY}`;
          const arrivalAt = stage.showAtInFrames;
          const progress = interpolate(frame, [arrivalAt - travelInFrames, arrivalAt], [0, 1], {...clamp, easing: EASING.editorial});
          const color = relayColors[toIndex];
          return <React.Fragment key={`relay-${toIndex}`}>
            <path d={path} fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth={3.2 * u} strokeLinecap="round" strokeDasharray={`${8 * u} ${14 * u}`} />
            <path d={path} fill="none" pathLength={1} stroke={color.hex} strokeWidth={3 * u} strokeLinecap="round" strokeDasharray={`${8 * u} ${14 * u}`} strokeDashoffset={(1 - progress) * 22 * u} opacity={progress * 0.72} style={{filter: `drop-shadow(0 0 ${6 * u}px rgba(${color.rgb},0.42))`}} />
          </React.Fragment>;
        })}
      </svg>
      {visible.map((stage, index) => {
        const color = relayColors[index];
        const enter = Math.min(1, spring({frame: frame - (stage.showAtInFrames - 6), fps, config: {damping: 17, stiffness: 155, mass: 0.76}}));
        const nextAt = visible[index + 1]?.showAtInFrames ?? (exitAtInFrames ?? stage.showAtInFrames + 48);
        const activeIn = interpolate(frame, [stage.showAtInFrames - 5, stage.showAtInFrames + 4], [0, 1], {...clamp, easing: EASING.enter});
        const activeOut = interpolate(frame, [nextAt - 7, nextAt + 2], [0, 1], {...clamp, easing: EASING.exit});
        const active = activeIn * (1 - activeOut);
        return <div key={`${stage.label}-${index}`} data-content-sized-surface="flow-relay-stage" data-card-copy-structure="label-primary" style={{position: "absolute", left: nodeXs[index] - cardWidth / 2, top: nodeYs[index] - cardHeight / 2, width: cardWidth, height: cardHeight, boxSizing: "border-box", display: "grid", gridTemplateColumns: `${48 * u}px minmax(0,1fr)`, alignItems: "center", gap: 13 * u, padding: `0 ${18 * u}px`, borderRadius: 23 * u, background: `linear-gradient(145deg, rgba(11,13,19,0.82), rgba(${color.rgb},${0.05 + active * 0.08}))`, border: `${2 * u}px solid rgba(${color.rgb},${0.38 + active * 0.52})`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.13), 0 ${15 * u}px ${36 * u}px rgba(0,0,0,0.31), 0 0 ${(17 + active * 25) * u}px rgba(${color.rgb},${0.10 + active * 0.22})`, opacity: enter * (0.76 + active * 0.24), translate: `0 ${(1 - enter) * 18 * u}px`, scale: 0.94 + enter * 0.06 + active * 0.025}}>
          <div style={{width: 46 * u, height: 46 * u, borderRadius: 15 * u, display: "grid", placeItems: "center", color: "#050608", background: color.hex, fontSize: 18 * u, fontWeight: 950}}>{String(index + 1).padStart(2, "0")}</div>
          <div style={{minWidth: 0}}><div data-card-label="true" style={{color: color.hex, fontSize: 12 * u, lineHeight: 1, fontWeight: 880, letterSpacing: "0.1em"}}>STAGE {String(index + 1).padStart(2, "0")}</div><div data-primary-text="true" style={{marginTop: 8 * u, color: palette.fg, fontSize: 28 * u, lineHeight: 1, fontWeight: 930, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{stage.label}</div></div>
        </div>;
      })}
      <div style={{position: "absolute", left: carrierX - 55 * u, top: carrierY - carrierLift - 29 * u, width: 110 * u, height: 58 * u, borderRadius: 19 * u, display: "grid", placeItems: "center", color: "#050608", background: carrierColor.hex, fontSize: 21 * u, lineHeight: 1, fontWeight: 950, boxShadow: `0 ${15 * u}px ${30 * u}px rgba(0,0,0,0.43), 0 0 ${25 * u}px rgba(${carrierColor.rgb},0.54)`, opacity: Math.min(1, carrierIn), scale: 0.94 + Math.min(1, carrierIn) * 0.06 + carrierLift / Math.max(1, 22 * u) * 0.06, zIndex: 5}}>{carrierLabel}</div>
    </div>
  </AbsoluteFill>;
};
