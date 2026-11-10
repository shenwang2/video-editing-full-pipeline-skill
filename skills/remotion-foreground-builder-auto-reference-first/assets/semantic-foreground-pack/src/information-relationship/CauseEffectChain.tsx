import React from "react";
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {CODE_THEMES} from "../lib/code-syntax";
import {ForegroundPlacement, getAlignedX, getForegroundZone} from "../lib/layout";
import {EASING} from "../lib/motion-tokens";
import {EDITABLE_ROOM_LIGHT_PALETTE} from "../lib/room-light-palette";

const FONT = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

export type CauseEffectNode = {label: string; title: string; detail?: string; showAtInFrames: number; accentColor?: string};
export type CauseEffectChainProps = {
  cause: CauseEffectNode;
  mechanism?: CauseEffectNode;
  effect: CauseEffectNode;
  visualVariant?: "causalHandoff" | "energyChain";
  placement?: ForegroundPlacement;
  accentColor?: string;
  theme?: "dark" | "light";
  exitAtInFrames?: number;
  exitInFrames?: number;
};

export const CauseEffectChain: React.FC<CauseEffectChainProps> = ({cause, mechanism, effect, visualVariant = "causalHandoff", placement = "centerSafe", accentColor = "#E8B86D", theme = "dark", exitAtInFrames, exitInFrames = 14}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const zone = getForegroundZone({width, height, placement});
  const palette = CODE_THEMES[theme];
  const nodes = mechanism ? [cause, mechanism, effect] : [cause, effect];
  const baseWidth = nodes.length === 3 ? 980 : 700;
  const baseCardWidth = 300;
  const titleSize = 42;
  const detailSize = 22;
  const u = Math.max(0.68, Math.min(zone.width / baseWidth, zone.height / 320, 1.55));
  const panelWidth = baseWidth * u;
  const x = getAlignedX({zone, itemWidth: panelWidth, placement});
  const y = zone.y + zone.height / 2;
  const cardWidth = baseCardWidth * u;
  const cardGap = (panelWidth - cardWidth * nodes.length) / Math.max(1, nodes.length - 1);
  const exit = exitAtInFrames === undefined ? 0 : interpolate(frame, [exitAtInFrames, exitAtInFrames + exitInFrames], [0, 1], {...clamp, easing: EASING.exit});

  if (visualVariant === "energyChain") {
    const colors = Array.from({length: 3}, () => EDITABLE_ROOM_LIGHT_PALETTE.深紫);
    const energyBaseWidth = nodes.length === 3 ? 960 : 720;
    const energyBaseHeight = 330;
    const eu = Math.max(0.66, Math.min(zone.width / energyBaseWidth, zone.height / energyBaseHeight, 1.48));
    const energyWidth = energyBaseWidth * eu;
    const energyHeight = energyBaseHeight * eu;
    const energyX = getAlignedX({zone, itemWidth: energyWidth, placement});
    const energyY = zone.y + Math.max(0, (zone.height - energyHeight) / 2);
    const nodeSize = (nodes.length === 3 ? 184 : 200) * eu;
    const nodeXs = nodes.map((_, index) => nodeSize / 2 + index * ((energyWidth - nodeSize) / Math.max(1, nodes.length - 1)));
    const nodeTop = 38 * eu;
    const nodeCenterY = nodeTop + nodeSize / 2;

    return (
      <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
        <div style={{position: "absolute", left: energyX, top: energyY, width: energyWidth, height: energyHeight, opacity: 1 - exit, translate: `0 ${exit * 22 * eu}px`}}>
          <svg width={energyWidth} height={energyHeight} viewBox={`0 0 ${energyWidth} ${energyHeight}`} style={{position: "absolute", inset: 0, overflow: "visible"}}>
            {nodes.slice(0, -1).map((node, index) => {
              const next = nodes[index + 1];
              const startX = nodeXs[index] + nodeSize / 2 - 9 * eu;
              const endX = nodeXs[index + 1] - nodeSize / 2 + 9 * eu;
              const bend = index % 2 === 0 ? -58 * eu : 58 * eu;
              const progress = interpolate(frame, [node.showAtInFrames + 8, next.showAtInFrames + 7], [0, 1], {...clamp, easing: EASING.editorial});
              const color = colors[Math.min(index + 1, colors.length - 1)];
              const path = `M ${startX} ${nodeCenterY} C ${startX + (endX - startX) * 0.35} ${nodeCenterY + bend}, ${startX + (endX - startX) * 0.65} ${nodeCenterY + bend}, ${endX} ${nodeCenterY}`;
              return <React.Fragment key={`energy-${index}`}><path d={path} fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth={5 * eu} strokeLinecap="round" /><path d={path} fill="none" stroke={color.hex} strokeWidth={6 * eu} strokeLinecap="round" pathLength={1} strokeDasharray={`${progress} 1`} style={{filter: `drop-shadow(0 0 ${9 * eu}px rgba(${color.rgb},0.70))`}} /></React.Fragment>;
            })}
          </svg>
          {nodes.slice(0, -1).map((node, index) => {
            const next = nodes[index + 1];
            const progress = interpolate(frame, [node.showAtInFrames + 8, next.showAtInFrames + 7], [0, 1], {...clamp, easing: EASING.editorial});
            const color = colors[Math.min(index + 1, colors.length - 1)];
            const label = index === 0 ? "触发" : "导致";
            const midX = (nodeXs[index] + nodeXs[index + 1]) / 2;
            const labelY = nodeCenterY + (index % 2 === 0 ? -76 : 54) * eu;
            return <div key={`label-${index}`} style={{position: "absolute", left: midX - 30 * eu, top: labelY, width: 60 * eu, padding: `${7 * eu}px 0`, borderRadius: 999, border: `${1 * eu}px solid rgba(${color.rgb},0.56)`, color: color.hex, background: "rgba(5,6,8,0.72)", fontSize: 14 * eu, lineHeight: 1, fontWeight: 860, textAlign: "center", opacity: progress}}>{label}</div>;
          })}
          {nodes.map((node, index) => {
            const color = colors[Math.min(index, colors.length - 1)];
            const enter = Math.min(1, spring({frame: frame - node.showAtInFrames, fps, config: {damping: 16, stiffness: 160, mass: 0.75}}));
            const nextAt = nodes[index + 1]?.showAtInFrames ?? (exitAtInFrames ?? node.showAtInFrames + 40);
            const activeIn = interpolate(frame, [node.showAtInFrames - 2, node.showAtInFrames + 8], [0, 1], {...clamp, easing: EASING.enter});
            const activeOut = interpolate(frame, [nextAt - 8, nextAt + 4], [0, 1], {...clamp, easing: EASING.exit});
            const active = activeIn * (1 - activeOut);
            const isMechanism = nodes.length === 3 && index === 1;
            const clipPath = isMechanism ? "polygon(14% 0,86% 0,100% 26%,100% 74%,86% 100%,14% 100%,0 74%,0 26%)" : undefined;
            return (
              <React.Fragment key={`${node.label}-${index}`}>
                <div data-content-sized-surface="cause-effect-energy-node" data-card-copy-structure="label-primary" style={{position: "absolute", left: nodeXs[index] - nodeSize / 2, top: nodeTop, width: nodeSize, height: nodeSize, display: "grid", placeItems: "center", borderRadius: isMechanism ? 26 * eu : "50%", clipPath, background: `rgba(${color.rgb},0.07)`, border: isMechanism ? undefined : `${3 * eu}px solid ${color.hex}`, boxShadow: `0 0 ${(28 + active * 32) * eu}px rgba(${color.rgb},${0.17 + active * 0.25}), inset 0 0 ${30 * eu}px rgba(${color.rgb},0.13)`, opacity: enter * (0.78 + active * 0.22), scale: 0.76 + enter * 0.24 + active * 0.05, boxSizing: "border-box"}}>
                  {isMechanism ? <div style={{position: "absolute", inset: 7 * eu, clipPath, background: theme === "dark" ? "rgba(5,6,8,0.92)" : "rgba(255,255,255,0.90)"}} /> : null}
                  <div style={{position: "relative", zIndex: 2, width: nodeSize - 28 * eu, textAlign: "center"}}>
                    <div data-card-label="true" style={{color: color.hex, fontSize: 15 * eu, fontWeight: 880, letterSpacing: "0.09em"}}>{node.label}</div>
                    <div data-primary-text="true" style={{marginTop: 12 * eu, color: palette.fg, fontSize: 30 * eu, lineHeight: 1, fontWeight: 930, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{node.title}</div>
                  </div>
                  <div style={{position: "absolute", inset: isMechanism ? 24 * eu : 20 * eu, borderRadius: isMechanism ? 20 * eu : "50%", border: `${1 * eu}px solid rgba(${color.rgb},0.42)`, opacity: 0.45 + active * 0.55}} />
                </div>
                {node.detail ? <div data-auxiliary-text="true" style={{position: "absolute", left: nodeXs[index] - nodeSize * 0.68, top: nodeTop + nodeSize + 22 * eu, width: nodeSize * 1.36, color: palette.dim, fontSize: 15 * eu, lineHeight: 1, fontWeight: 670, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", opacity: enter}}>{node.detail}</div> : null}
              </React.Fragment>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
      <div style={{position: "absolute", left: x, top: y, width: panelWidth, display: "flex", alignItems: "stretch", gap: cardGap, opacity: 1 - exit, transform: `translateY(calc(-50% + ${exit * 24 * u}px))`}}>
        {nodes.slice(0, -1).map((node, index) => {
          const next = nodes[index + 1];
          const progress = interpolate(frame, [node.showAtInFrames + 8, next.showAtInFrames], [0, 1], {...clamp, easing: EASING.editorial});
          return <div key={`connector-${index}`} style={{position: "absolute", left: index * (cardWidth + cardGap) + cardWidth, top: "50%", width: cardGap, height: 5 * u, borderRadius: 99, background: next.accentColor ?? accentColor, scale: `${progress} 1`, transformOrigin: "left center"}} />;
        })}
        {nodes.map((node, index) => {
          const p = spring({frame: frame - node.showAtInFrames, fps, config: {damping: 18, stiffness: 150, mass: 0.8}});
          const color = node.accentColor ?? (index === nodes.length - 1 ? "#7FD1A0" : accentColor);
          return <div key={`${node.label}-${index}`} style={{position: "relative", zIndex: 1, width: cardWidth, display: "flex"}}>
            <div data-content-sized-surface="cause-effect-node" data-card-copy-structure="label-primary" style={{width: "100%", boxSizing: "border-box", padding: `${21 * u}px`, borderRadius: 18 * u, background: theme === "dark" ? "linear-gradient(145deg, rgba(16,20,30,0.76), rgba(7,9,15,0.55))" : "rgba(255,255,255,0.92)", backdropFilter: "blur(9px) saturate(1.05)", border: `1px solid ${palette.border}`, boxShadow: `inset ${5 * u}px 0 0 ${color}, inset 0 1px 0 ${palette.highlight}, 0 ${13 * u}px ${30 * u}px ${palette.shadow}`, opacity: Math.min(1, p), scale: 0.9 + p * 0.1, translate: `0px ${(1 - p) * 18 * u}px`}}>
              <div data-card-label="true" style={{display: "flex", alignItems: "center", gap: 9 * u, color, fontSize: 20 * u, fontWeight: 850, letterSpacing: "0.08em"}}><span style={{width: 10 * u, height: 10 * u, borderRadius: "50%", background: color, boxShadow: `0 0 ${14 * u}px ${color}90`}} />{node.label}</div>
              <div data-primary-text="true" style={{marginTop: 14 * u, color: palette.fg, fontSize: titleSize * u, lineHeight: 1.08, fontWeight: 920, overflowWrap: "normal", wordBreak: "normal"}}>{node.title}</div>
            </div>
            {node.detail ? <div data-auxiliary-text="true" style={{position: "absolute", left: 5 * u, top: `calc(100% + ${10 * u}px)`, width: cardWidth - 10 * u, color: palette.dim, fontSize: detailSize * u, lineHeight: 1.25, fontWeight: 620, opacity: Math.min(1, p), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{node.detail}</div> : null}
          </div>;
        })}
      </div>
    </AbsoluteFill>
  );
};
