import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {CODE_THEMES} from "../lib/code-syntax";
import {ForegroundPlacement, getAlignedX, getForegroundZone} from "../lib/layout";
import {EASING} from "../lib/motion-tokens";
import {EDITABLE_ROOM_LIGHT_PALETTE} from "../lib/room-light-palette";

const FONT = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
export type ConditionCriterion = {label: string; passed: boolean; showAtInFrames: number};
export type ConditionGateProps = {inputLabel: string; conditions: ConditionCriterion[]; passLabel: string; blockedLabel?: string; resultShowAtInFrames: number; visualVariant?: "validationGate" | "keyGate"; placement?: ForegroundPlacement; accentColor?: string; passColor?: string; failColor?: string; theme?: "dark" | "light"; exitAtInFrames?: number; exitInFrames?: number};

export const ConditionGate: React.FC<ConditionGateProps> = ({inputLabel, conditions, passLabel, blockedLabel = "条件未满足，保持原状态", resultShowAtInFrames, visualVariant = "validationGate", placement = "centerSafe", accentColor = "#70A5EB", passColor = "#65C99B", failColor = "#E8756F", theme = "dark", exitAtInFrames, exitInFrames = 14}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const zone = getForegroundZone({width, height, placement});
  const palette = CODE_THEMES[theme];
  const visible = conditions.slice(0, 3);
  const allPassed = visible.length > 0 && visible.every((item) => item.passed);
  const baseWidth = 940;
  const baseHeight = 360;
  const u = Math.max(0.64, Math.min(zone.width / baseWidth, zone.height / baseHeight, 1.55));
  const panelWidth = baseWidth * u;
  const panelHeight = baseHeight * u;
  const x = getAlignedX({zone, itemWidth: panelWidth, placement});
  const y = zone.y + (zone.height - panelHeight) / 2;
  const inputIn = spring({frame, fps, config: {damping: 18, stiffness: 150, mass: 0.8}});
  const resultIn = spring({frame: frame - resultShowAtInFrames, fps, config: {damping: 18, stiffness: 150, mass: 0.8}});
  const gateOpen = allPassed ? interpolate(frame, [resultShowAtInFrames - 12, resultShowAtInFrames + 8], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)}) : 0;
  const carrierX = allPassed ? interpolate(frame, [resultShowAtInFrames - 8, resultShowAtInFrames + 20], [205 * u, 735 * u], {...clamp, easing: Easing.inOut(Easing.cubic)}) : 205 * u;
  const exit = exitAtInFrames === undefined ? 0 : interpolate(frame, [exitAtInFrames, exitAtInFrames + exitInFrames], [0, 1], {...clamp, easing: EASING.exit});

  if (visualVariant === "keyGate") {
    const inputAccent = EDITABLE_ROOM_LIGHT_PALETTE.青蓝;
    const conditionColors = Array.from({length: 3}, () => inputAccent);
    const gateAccent = inputAccent;
    const resultAccent = inputAccent;
    const keyBaseWidth = 1000;
    const keyBaseHeight = 350;
    const ku = Math.max(0.62, Math.min(zone.width / keyBaseWidth, zone.height / keyBaseHeight, 1.5));
    const keyWidth = keyBaseWidth * ku;
    const keyHeight = keyBaseHeight * ku;
    const keyX = getAlignedX({zone, itemWidth: keyWidth, placement});
    const keyY = zone.y + (zone.height - keyHeight) / 2;
    const resultProgress = Math.min(1, resultIn);
    const keyGateOpen = allPassed ? interpolate(frame, [resultShowAtInFrames - 10, resultShowAtInFrames + 10], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)}) : 0;
    const pulse = 0.5 + Math.sin(frame * 0.18) * 0.5;
    const machineX = 300 * ku;
    const machineY = 24 * ku;
    const machineWidth = 440 * ku;
    const machineHeight = 292 * ku;
    const resultX = 800 * ku;
    const glass = theme === "dark" ? "linear-gradient(145deg, rgba(15,17,25,0.82), rgba(7,8,13,0.64))" : "rgba(255,255,255,0.90)";

    return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
      <div style={{position: "absolute", left: keyX, top: keyY, width: keyWidth, height: keyHeight, opacity: 1 - exit, translate: `0 ${exit * 24 * ku}px`}}>
        <svg width={keyWidth} height={keyHeight} style={{position: "absolute", inset: 0, overflow: "visible"}}><path d={`M${200 * ku} ${170 * ku} H${machineX}`} fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth={4 * ku} strokeLinecap="round" strokeDasharray={`${8 * ku} ${14 * ku}`} /><path d={`M${machineX + machineWidth} ${170 * ku} H${resultX}`} fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth={4 * ku} strokeLinecap="round" strokeDasharray={`${8 * ku} ${14 * ku}`} /><path d={`M${machineX + machineWidth} ${170 * ku} H${resultX}`} fill="none" stroke={resultAccent.hex} strokeWidth={3 * ku} strokeLinecap="round" strokeDasharray={`${8 * ku} ${14 * ku}`} opacity={resultProgress * 0.76} /></svg>
        <div data-content-sized-surface="condition-key-input" data-card-copy-structure="label-primary" style={{position: "absolute", left: 0, top: 106 * ku, width: 200 * ku, height: 128 * ku, boxSizing: "border-box", padding: `${23 * ku}px`, borderRadius: 25 * ku, background: glass, backdropFilter: "blur(10px)", border: `${2 * ku}px solid rgba(${inputAccent.rgb},0.72)`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 ${17 * ku}px ${38 * ku}px rgba(0,0,0,0.34), 0 0 ${29 * ku}px rgba(${inputAccent.rgb},0.17)`, opacity: inputIn, translate: `${(1 - inputIn) * -17 * ku}px 0`}}><div data-card-label="true" style={{color: inputAccent.hex, fontSize: 14 * ku, fontWeight: 900, letterSpacing: "0.1em"}}>待验证对象</div><div data-primary-text="true" style={{marginTop: 16 * ku, color: palette.fg, fontSize: 32 * ku, lineHeight: 1, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{inputLabel}</div></div>
        <div style={{position: "absolute", left: machineX, top: machineY, width: machineWidth, height: machineHeight, borderRadius: 36 * ku, background: glass, backdropFilter: "blur(11px)", border: `${2 * ku}px solid rgba(${gateAccent.rgb},0.50)`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.13), inset 0 0 ${50 * ku}px rgba(${gateAccent.rgb},0.08), 0 ${21 * ku}px ${46 * ku}px rgba(0,0,0,0.36)`}}>
          <div style={{position: "absolute", left: 28 * ku, top: 22 * ku, color: gateAccent.hex, fontSize: 14 * ku, fontWeight: 900, letterSpacing: "0.1em"}}>条件验签</div>
          <div style={{position: "absolute", left: 27 * ku, top: 59 * ku, width: 228 * ku, display: "grid", gap: 11 * ku}}>{visible.map((criterion, index) => {const p = spring({frame: frame - criterion.showAtInFrames, fps, config: {damping: 17, stiffness: 160, mass: 0.76}}); const base = conditionColors[index]; const verified = interpolate(frame, [criterion.showAtInFrames + 8, criterion.showAtInFrames + 18], [0, 1], clamp); return <div key={criterion.label} style={{height: 55 * ku, padding: `0 ${15 * ku}px`, boxSizing: "border-box", borderRadius: 16 * ku, display: "flex", alignItems: "center", justifyContent: "space-between", background: `rgba(${base.rgb},0.08)`, border: `${1.5 * ku}px solid rgba(${base.rgb},${0.42 + verified * 0.42})`, boxShadow: `0 0 ${verified * 19 * ku}px rgba(${base.rgb},0.18)`, opacity: p, translate: `${(1 - p) * -24 * ku}px 0`}}><span style={{color: palette.fg, fontSize: 20 * ku, fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{criterion.label}</span><span style={{width: 28 * ku, height: 28 * ku, borderRadius: 9 * ku, display: "grid", placeItems: "center", background: base.hex, color: "#050608", fontSize: 16 * ku, fontWeight: 950}}>{criterion.passed ? "✓" : "×"}</span></div>;})}</div>
          <div style={{position: "absolute", left: 292 * ku, top: 56 * ku, width: 120 * ku, height: 184 * ku}}><div style={{position: "absolute", left: -keyGateOpen * 30 * ku, top: 0, width: 58 * ku, height: 184 * ku, borderRadius: `${24 * ku}px ${7 * ku}px ${7 * ku}px ${24 * ku}px`, background: `rgba(${gateAccent.rgb},0.10)`, border: `${2 * ku}px solid rgba(${gateAccent.rgb},0.78)`, boxShadow: `inset 0 0 ${25 * ku}px rgba(${gateAccent.rgb},0.16), 0 0 ${(15 + pulse * 11) * ku}px rgba(${gateAccent.rgb},0.18)`}} /><div style={{position: "absolute", right: -keyGateOpen * 30 * ku, top: 0, width: 58 * ku, height: 184 * ku, borderRadius: `${7 * ku}px ${24 * ku}px ${24 * ku}px ${7 * ku}px`, background: `rgba(${gateAccent.rgb},0.10)`, border: `${2 * ku}px solid rgba(${gateAccent.rgb},0.78)`}} /><div style={{position: "absolute", left: 41 * ku, top: 69 * ku, width: 38 * ku, height: 46 * ku, borderRadius: 13 * ku, display: "grid", placeItems: "center", background: resultAccent.hex, color: "#050608", fontSize: 20 * ku, fontWeight: 950, opacity: interpolate(keyGateOpen, [0, 0.65], [1, 0], clamp)}}>{allPassed ? "✓" : "×"}</div></div>
        </div>
        <div data-content-sized-surface="condition-key-result" data-card-copy-structure="label-primary" style={{position: "absolute", left: resultX, top: 106 * ku, width: 200 * ku, height: 128 * ku, boxSizing: "border-box", padding: `${23 * ku}px`, borderRadius: 25 * ku, background: glass, border: `${2 * ku}px solid rgba(${resultAccent.rgb},0.78)`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 ${17 * ku}px ${38 * ku}px rgba(0,0,0,0.34), 0 0 ${35 * ku}px rgba(${resultAccent.rgb},0.21)`, opacity: resultProgress, translate: `${(1 - resultProgress) * 17 * ku}px 0`, scale: 0.94 + resultProgress * 0.06}}><div data-card-label="true" style={{color: resultAccent.hex, fontSize: 14 * ku, fontWeight: 900, letterSpacing: "0.1em"}}>{allPassed ? "全部通过" : "条件拦截"}</div><div data-primary-text="true" style={{marginTop: 16 * ku, color: palette.fg, fontSize: 31 * ku, lineHeight: 1, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{allPassed ? passLabel : blockedLabel}</div></div>
      </div>
    </AbsoluteFill>;
  }

  return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
    <div style={{position: "absolute", left: x, top: y, width: panelWidth, height: panelHeight, opacity: 1 - exit, translate: `0px ${exit * 24 * u}px`}}>
      <div style={{position: "absolute", left: 0, top: 146 * u, width: 230 * u, height: 124 * u, boxSizing: "border-box", padding: `${22 * u}px`, borderRadius: 18 * u, background: theme === "dark" ? "rgba(13,17,25,0.88)" : "rgba(255,255,255,0.92)", border: `1px solid ${accentColor}66`, boxShadow: `inset 0 1px 0 ${palette.highlight}, 0 ${12 * u}px ${28 * u}px ${palette.shadow}`, opacity: inputIn, scale: 0.92 + inputIn * 0.08}}><div style={{color: accentColor, fontSize: 16 * u, fontWeight: 850}}>待判断对象</div><div style={{marginTop: 12 * u, color: palette.fg, fontSize: 29 * u, lineHeight: 1.05, fontWeight: 900}}>{inputLabel}</div></div>
      <svg width={panelWidth} height={panelHeight} style={{position: "absolute", inset: 0}}><path d={`M${230 * u} ${208 * u} H${710 * u}`} stroke={palette.border} strokeWidth={5 * u} strokeLinecap="round" strokeDasharray={`${11 * u} ${12 * u}`} /></svg>
      <div style={{position: "absolute", left: 330 * u, top: 0, width: 280 * u, display: "grid", gap: 8 * u}}>{visible.map((criterion) => {const p = spring({frame: frame - criterion.showAtInFrames, fps, config: {damping: 18, stiffness: 155, mass: 0.78}}); const color = criterion.passed ? passColor : failColor; return <div key={criterion.label} style={{height: 58 * u, borderRadius: 14 * u, padding: `0 ${14 * u}px`, display: "flex", alignItems: "center", justifyContent: "space-between", background: theme === "dark" ? "rgba(16,20,30,0.90)" : "rgba(255,255,255,0.94)", border: `1px solid ${color}55`, color: palette.fg, fontSize: 17 * u, fontWeight: 820, opacity: p, translate: `0px ${(1 - p) * 9 * u}px`}}><span>{criterion.label}</span><span style={{width: 28 * u, height: 28 * u, borderRadius: 9 * u, display: "grid", placeItems: "center", background: color, color: "#11131A", fontSize: 18 * u, fontWeight: 950}}>{criterion.passed ? "✓" : "×"}</span></div>;})}</div>
      <div style={{position: "absolute", left: 370 * u, top: 156 * u, width: 200 * u, height: 128 * u}}><div style={{position: "absolute", left: 0 - gateOpen * 44 * u, top: 0, width: 98 * u, height: 128 * u, borderRadius: `${18 * u}px ${5 * u}px ${5 * u}px ${18 * u}px`, background: "rgba(18,24,35,0.94)", border: `2px solid ${accentColor}`, translate: `${-gateOpen * 13 * u}px 0px`}} /><div style={{position: "absolute", left: 102 * u + gateOpen * 44 * u, top: 0, width: 98 * u, height: 128 * u, borderRadius: `${5 * u}px ${18 * u}px ${18 * u}px ${5 * u}px`, background: "rgba(18,24,35,0.94)", border: `2px solid ${accentColor}`, translate: `${gateOpen * 13 * u}px 0px`}} /><div style={{position: "absolute", left: 0, top: 142 * u, width: 200 * u, textAlign: "center", color: accentColor, fontSize: 17 * u, fontWeight: 850}}>条件边界</div></div>
      <div style={{position: "absolute", left: carrierX - 34 * u, top: 174 * u, width: 68 * u, height: 68 * u, borderRadius: 20 * u, display: "grid", placeItems: "center", background: `linear-gradient(135deg, #E8B86D, #F3D49C)`, color: "#24180A", fontSize: 16 * u, fontWeight: 950, boxShadow: `0 ${10 * u}px ${22 * u}px rgba(0,0,0,0.32)`, opacity: inputIn}}>对象</div>
      {allPassed ? <div style={{position: "absolute", left: 710 * u, top: 146 * u, width: 230 * u, height: 124 * u, boxSizing: "border-box", padding: `${22 * u}px`, borderRadius: 18 * u, background: theme === "dark" ? "rgba(13,17,25,0.88)" : "rgba(255,255,255,0.92)", border: `1px solid ${passColor}66`, boxShadow: `inset 0 1px 0 ${palette.highlight}, 0 ${12 * u}px ${28 * u}px ${palette.shadow}`, opacity: resultIn, scale: 0.92 + resultIn * 0.08}}><div style={{color: passColor, fontSize: 16 * u, fontWeight: 850}}>条件成立</div><div style={{marginTop: 12 * u, color: palette.fg, fontSize: 29 * u, lineHeight: 1.05, fontWeight: 900}}>{passLabel}</div></div> : <div style={{position: "absolute", left: 650 * u, top: 176 * u, width: 290 * u, color: failColor, fontSize: 18 * u, fontWeight: 800, opacity: resultIn}}>{blockedLabel}</div>}
    </div>
  </AbsoluteFill>;
};
