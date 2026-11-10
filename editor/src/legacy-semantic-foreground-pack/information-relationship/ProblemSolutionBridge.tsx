import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {CODE_THEMES} from "../lib/code-syntax";
import {estimateWrappedLineCount} from "../lib/content-sizing";
import {ForegroundPlacement, getAlignedX, getForegroundZone} from "../lib/layout";
import {EASING} from "../lib/motion-tokens";
import {EDITABLE_ROOM_LIGHT_PALETTE} from "../lib/room-light-palette";

const FONT = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

export type ProblemSolutionItem = {label: string; showAtInFrames: number};
export type ProblemSolutionSide = {eyebrow?: string; title: string; detail?: string; items?: ProblemSolutionItem[]};
export type ProblemSolutionBridgeProps = {
  problem: ProblemSolutionSide;
  solution: ProblemSolutionSide;
  actionLabel: string;
  visualVariant?: "actionBridge" | "transformChamber";
  problemShowAtInFrames?: number;
  actionShowAtInFrames: number;
  solutionShowAtInFrames: number;
  placement?: ForegroundPlacement;
  layoutMode?: "standard" | "subjectSplit";
  attentionMode?: "standard" | "handoff";
  subjectZone?: [number, number, number, number];
  titleZone?: [number, number, number, number];
  masterLeftX?: number;
  problemColor?: string;
  actionColor?: string;
  solutionColor?: string;
  theme?: "dark" | "light";
  exitAtInFrames?: number;
  exitInFrames?: number;
};

export const ProblemSolutionBridge: React.FC<ProblemSolutionBridgeProps> = ({
  problem,
  solution,
  actionLabel,
  visualVariant = "actionBridge",
  problemShowAtInFrames = 0,
  actionShowAtInFrames,
  solutionShowAtInFrames,
  placement = "centerSafe",
  layoutMode = "standard",
  attentionMode = "standard",
  subjectZone = [0.36, 0.18, 0.64, 0.94],
  titleZone = [0.04, 0.05, 0.34, 0.16],
  masterLeftX,
  problemColor = "#E8756F",
  actionColor = "#E8B86D",
  solutionColor = "#65C99B",
  theme = "dark",
  exitAtInFrames,
  exitInFrames = 14,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const zone = getForegroundZone({width, height, placement});
  const palette = CODE_THEMES[theme];
  const baseWidth = 980;
  const baseCardWidth = 350;
  const titleSize = 54;
  const itemRows = Math.ceil(Math.max(problem.items?.length ?? 0, solution.items?.length ?? 0) / 2);
  const titleLines = Math.max(
    estimateWrappedLineCount({text: problem.title, fontSize: titleSize, availableWidth: baseCardWidth - 48}),
    estimateWrappedLineCount({text: solution.title, fontSize: titleSize, availableWidth: baseCardWidth - 48}),
  );
  const hasDetail = Boolean(problem.detail || solution.detail);
  const cardHeightBase = 24 + 22 + 12 + titleLines * titleSize * 1.07 + 24;
  const auxiliaryHeightBase = (hasDetail ? 12 + 30 : 0) + (itemRows ? 14 + itemRows * 52 + Math.max(0, itemRows - 1) * 9 : 0);
  const baseHeight = 20 + cardHeightBase + auxiliaryHeightBase + 20;
  const u = Math.max(0.64, Math.min(zone.width / baseWidth, zone.height / baseHeight, 1.55));
  const panelWidth = baseWidth * u;
  const panelHeight = baseHeight * u;
  const x = getAlignedX({zone, itemWidth: panelWidth, placement});
  const y = zone.y + (zone.height - panelHeight) / 2;
  const cardWidth = baseCardWidth * u;
  const cardHeight = cardHeightBase * u;
  const connectorY = 20 * u + cardHeight / 2;
  const problemIn = spring({frame: frame - problemShowAtInFrames, fps, config: {damping: 18, stiffness: 150, mass: 0.8}});
  const actionIn = interpolate(frame, [actionShowAtInFrames, actionShowAtInFrames + 18], [0, 1], {...clamp, easing: EASING.enter});
  const solutionIn = spring({frame: frame - solutionShowAtInFrames, fps, config: {damping: 18, stiffness: 145, mass: 0.82}});
  const exit = exitAtInFrames === undefined ? 0 : interpolate(frame, [exitAtInFrames, exitAtInFrames + exitInFrames], [0, 1], {...clamp, easing: EASING.exit});

  if (visualVariant === "transformChamber") {
    const problemAccent = EDITABLE_ROOM_LIGHT_PALETTE.深紫;
    const actionAccent = problemAccent;
    const solutionAccent = problemAccent;
    const chamberCardWidth = 290 * u;
    const chamberCardHeight = 180 * u;
    const chamberY = 42 * u;
    const actionSize = 180 * u;
    const actionX = 400 * u;
    const solutionX = 690 * u;
    const travel = interpolate(frame, [actionShowAtInFrames, solutionShowAtInFrames], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
    const firstLeg = interpolate(travel, [0, 0.5], [0, 1], clamp);
    const secondLeg = interpolate(travel, [0.5, 1], [0, 1], clamp);
    const carrierX = interpolate(travel, [0, 0.5, 1], [chamberCardWidth, actionX + actionSize / 2, solutionX], clamp);
    const carrierY = chamberY + chamberCardHeight / 2 - Math.sin(travel * Math.PI) * 30 * u;
    const carrierAccent = travel < 0.5 ? problemAccent : solutionAccent;
    const carrierOut = interpolate(frame, [solutionShowAtInFrames - 2, solutionShowAtInFrames + 10], [1, 0], clamp);
    const actionPulse = 0.5 + Math.sin(frame * 0.16) * 0.5;
    const glass = theme === "dark" ? "linear-gradient(145deg, rgba(18,20,29,0.82), rgba(7,8,13,0.62))" : "rgba(255,255,255,0.90)";
    const renderState = (side: ProblemSolutionSide, left: number, accent: {hex: string; rgb: string}, progress: number, fallback: string) => <div data-content-sized-surface="problem-solution-transform-state" data-card-copy-structure="label-primary" style={{position: "absolute", left, top: chamberY, width: chamberCardWidth, height: chamberCardHeight, boxSizing: "border-box", padding: `${24 * u}px ${26 * u}px`, borderRadius: 27 * u, background: glass, backdropFilter: "blur(10px) saturate(1.06)", border: `${2 * u}px solid rgba(${accent.rgb},0.76)`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.13), 0 ${19 * u}px ${40 * u}px rgba(0,0,0,0.34), 0 0 ${34 * u}px rgba(${accent.rgb},0.18)`, opacity: Math.min(1, progress), translate: `${(1 - Math.min(1, progress)) * (left === 0 ? -17 : 17) * u}px 0`, scale: 0.94 + Math.min(1, progress) * 0.06}}>
      <div data-card-label="true" style={{display: "flex", alignItems: "center", gap: 9 * u, color: accent.hex, fontSize: 16 * u, fontWeight: 900, letterSpacing: "0.1em"}}><span style={{width: 10 * u, height: 10 * u, borderRadius: 99, background: accent.hex, boxShadow: `0 0 ${13 * u}px rgba(${accent.rgb},0.78)`}} />{side.eyebrow ?? fallback}</div>
      <div data-primary-text="true" style={{marginTop: 18 * u, color: palette.fg, fontSize: 39 * u, lineHeight: 1.02, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{side.title}</div>
      {side.detail ? <div data-auxiliary-text="true" style={{marginTop: 17 * u, color: palette.dim, fontSize: 19 * u, lineHeight: 1.15, fontWeight: 650, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{side.detail}</div> : null}
    </div>;

    return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
      <div style={{position: "absolute", left: x, top: y, width: panelWidth, height: panelHeight, opacity: 1 - exit, translate: `0 ${exit * 24 * u}px`}}>
        <svg width={panelWidth} height={panelHeight} style={{position: "absolute", inset: 0, overflow: "visible"}}>
          <path d={`M${chamberCardWidth} ${chamberY + chamberCardHeight / 2} H${actionX}`} fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth={4 * u} strokeLinecap="round" strokeDasharray={`${8 * u} ${14 * u}`} />
          <path d={`M${actionX + actionSize} ${chamberY + chamberCardHeight / 2} H${solutionX}`} fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth={4 * u} strokeLinecap="round" strokeDasharray={`${8 * u} ${14 * u}`} />
          <path d={`M${chamberCardWidth} ${chamberY + chamberCardHeight / 2} H${actionX}`} fill="none" stroke={actionAccent.hex} strokeWidth={3 * u} strokeLinecap="round" strokeDasharray={`${8 * u} ${14 * u}`} opacity={firstLeg * 0.72} />
          <path d={`M${actionX + actionSize} ${chamberY + chamberCardHeight / 2} H${solutionX}`} fill="none" stroke={solutionAccent.hex} strokeWidth={3 * u} strokeLinecap="round" strokeDasharray={`${8 * u} ${14 * u}`} opacity={secondLeg * 0.72} />
        </svg>
        {renderState(problem, 0, problemAccent, problemIn, "问题状态")}
        <div style={{position: "absolute", left: actionX, top: chamberY, width: actionSize, height: actionSize, borderRadius: "50%", display: "grid", placeItems: "center", background: `radial-gradient(circle, rgba(${actionAccent.rgb},0.20), rgba(8,9,14,0.80) 64%)`, border: `${2 * u}px solid rgba(${actionAccent.rgb},0.84)`, boxShadow: `inset 0 0 ${34 * u}px rgba(${actionAccent.rgb},0.16), 0 0 ${(27 + actionPulse * 15) * u}px rgba(${actionAccent.rgb},0.25)`, opacity: actionIn, scale: 0.88 + actionIn * 0.12}}><div style={{position: "absolute", inset: 15 * u, borderRadius: "50%", border: `${2 * u}px dashed rgba(${actionAccent.rgb},0.55)`, rotate: `${frame * 0.55}deg`}} /><div style={{textAlign: "center", zIndex: 2}}><div data-card-label="true" style={{color: actionAccent.hex, fontSize: 14 * u, fontWeight: 900, letterSpacing: "0.1em"}}>解决动作</div><div data-primary-text="true" style={{marginTop: 9 * u, color: palette.fg, fontSize: 29 * u, lineHeight: 1, fontWeight: 950, maxWidth: 145 * u, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{actionLabel}</div></div></div>
        {renderState(solution, solutionX, solutionAccent, solutionIn, "解决状态")}
        <div style={{position: "absolute", left: carrierX - 28 * u, top: carrierY - 28 * u, width: 56 * u, height: 56 * u, borderRadius: 17 * u, display: "grid", placeItems: "center", color: "#050608", background: carrierAccent.hex, fontSize: 23 * u, fontWeight: 950, boxShadow: `0 ${13 * u}px ${26 * u}px rgba(0,0,0,0.44), 0 0 ${23 * u}px rgba(${carrierAccent.rgb},0.56)`, zIndex: 6, opacity: carrierOut, scale: 0.92 + carrierOut * 0.08}}>→</div>
      </div>
    </AbsoluteFill>;
  }

  const renderSide = (side: ProblemSolutionSide, left: number, color: string, progress: number, fallbackEyebrow: string) => (
    <div style={{position: "absolute", left, top: 20 * u, width: cardWidth, opacity: Math.min(1, progress), scale: 0.92 + progress * 0.08}}>
      <div data-content-sized-surface="problem-solution-state" data-card-copy-structure="label-primary" style={{width: cardWidth, height: cardHeight, boxSizing: "border-box", padding: `${24 * u}px`, borderRadius: 20 * u, background: theme === "dark" ? "linear-gradient(145deg, rgba(16,20,30,0.76), rgba(7,9,15,0.54))" : "rgba(255,255,255,0.92)", backdropFilter: "blur(9px) saturate(1.05)", border: `1px solid ${color}66`, boxShadow: `inset 0 1px 0 ${palette.highlight}, 0 ${15 * u}px ${34 * u}px ${palette.shadow}`}}>
        <div data-card-label="true" style={{color, fontSize: 22 * u, fontWeight: 850, letterSpacing: "0.08em"}}>{side.eyebrow ?? fallbackEyebrow}</div>
        <div data-primary-text="true" style={{marginTop: 12 * u, color: palette.fg, fontSize: titleSize * u, lineHeight: 1.07, fontWeight: 920, overflowWrap: "anywhere"}}>{side.title}</div>
      </div>
      {side.detail ? <div data-auxiliary-text="true" style={{marginTop: 12 * u, color: palette.dim, fontSize: 26 * u, lineHeight: 1.2, fontWeight: 620, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{side.detail}</div> : null}
      {(side.items?.length ?? 0) > 0 ? <div style={{marginTop: 14 * u, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 * u}}>
        {(side.items ?? []).slice(0, 4).map((item) => {
          const p = interpolate(frame, [item.showAtInFrames, item.showAtInFrames + 10], [0, 1], {...clamp, easing: EASING.enter});
          return <div key={item.label} style={{minHeight: 52 * u, borderRadius: 12 * u, display: "flex", alignItems: "center", gap: 8 * u, padding: `0 ${11 * u}px`, background: `${color}0C`, border: `1px solid ${color}3D`, color: palette.fg, fontSize: 27 * u, lineHeight: 1.08, fontWeight: 760, opacity: p, translate: `0px ${(1 - p) * 8 * u}px`}}><span style={{width: 17 * u, height: 17 * u, borderRadius: 5 * u, display: "grid", placeItems: "center", flex: "0 0 auto", background: color, color: theme === "dark" ? "#11131A" : "#FFFFFF", fontSize: 11 * u, fontWeight: 950}}>{color === problemColor ? "!" : "✓"}</span>{item.label}</div>;
        })}
      </div> : null}
    </div>
  );

  if (layoutMode === "subjectSplit") {
    const su = Math.min(width / 2560, height / 1440);
    const safeX = masterLeftX ?? width * (108 / 2560);
    const subjectLeft = subjectZone[0] * width;
    const subjectRight = subjectZone[2] * width;
    const subjectTop = subjectZone[1] * height;
    const sideGap = width * 0.025;
    const splitCardWidth = Math.max(
      480 * su,
      Math.min(
        560 * su,
        subjectLeft - sideGap - safeX,
        width - safeX - subjectRight - sideGap,
      ),
    );
    const splitTitleLines = Math.max(
      estimateWrappedLineCount({text: problem.title, fontSize: 68, availableWidth: Math.max(1, splitCardWidth / su - 54)}),
      estimateWrappedLineCount({text: solution.title, fontSize: 68, availableWidth: Math.max(1, splitCardWidth / su - 54)}),
    );
    const splitCardHeight = (25 + 23 + 13 + splitTitleLines * 68 * 1.02 + 25) * su;
    const splitCardY = height * 0.35;
    const leftCardX = safeX;
    const rightCardX = width - safeX - splitCardWidth;
    const routeY = Math.max(titleZone[3] * height + 14 * su, subjectTop - 20 * su);
    const cardJoinY = splitCardY + splitCardHeight * 0.46;
    const solutionProgress = Math.max(0, Math.min(1, solutionIn));
    const problemWeight = attentionMode === "handoff"
      ? Math.max(0.56, 1 - actionIn * 0.22 - solutionProgress * 0.22)
      : 1;
    const solutionWeight = attentionMode === "handoff" ? 0.82 + solutionProgress * 0.18 : 1;
    const actionWeight = attentionMode === "handoff" && solutionProgress > 0.02 ? 0.74 : 1;

    const renderSplitCard = (
      side: ProblemSolutionSide,
      left: number,
      color: string,
      progress: number,
      weight: number,
      fallbackEyebrow: string,
    ) => (
      <div style={{
        position: "absolute",
        left,
        top: splitCardY,
        width: splitCardWidth,
        opacity: Math.min(1, progress) * weight * (1 - exit),
        scale: 0.94 + Math.min(1, progress) * 0.06 + Math.max(0, weight - 0.8) * 0.035,
        translate: `0px ${(1 - Math.min(1, progress)) * 15 * su}px`,
      }}>
        <div data-content-sized-surface="problem-solution-state" data-card-copy-structure="label-primary" style={{height: splitCardHeight, boxSizing: "border-box", padding: `${25 * su}px ${27 * su}px`, borderRadius: 21 * su, background: theme === "dark" ? "linear-gradient(145deg, rgba(16,20,30,0.72), rgba(7,9,15,0.48))" : "rgba(255,255,255,0.92)", backdropFilter: "blur(12px) saturate(1.08)", border: `1px solid ${color}${weight > 0.86 ? "A8" : "5C"}`, boxShadow: weight > 0.86 ? `inset 0 1px 0 ${palette.highlight}, 0 0 ${34 * su}px ${color}22, 0 ${18 * su}px ${40 * su}px ${palette.shadow}` : `inset 0 1px 0 ${palette.highlight}, 0 ${14 * su}px ${32 * su}px ${palette.shadow}`}}>
          <div data-card-label="true" style={{display: "flex", alignItems: "center", gap: 11 * su, color, fontSize: 23 * su, lineHeight: 1, fontWeight: 880, letterSpacing: "0.1em"}}>
            <span style={{width: 34 * su, height: 4 * su, borderRadius: 99 * su, background: color, boxShadow: `0 0 ${14 * su}px ${color}55`}} />
            {side.eyebrow ?? fallbackEyebrow}
          </div>
          <div data-primary-text="true" style={{marginTop: 13 * su, color: palette.fg, fontSize: 68 * su, lineHeight: 1.02, fontWeight: 930, letterSpacing: "-0.035em", textShadow: "0 4px 14px rgba(0,0,0,0.34)"}}>{side.title}</div>
        </div>
        {side.detail ? <div data-auxiliary-text="true" style={{marginTop: 12 * su, color: palette.dim, fontSize: 27 * su, lineHeight: 1.2, fontWeight: 620, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{side.detail}</div> : null}
        {(side.items?.length ?? 0) > 0 ? <div style={{marginTop: 14 * su, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 * su}}>
          {(side.items ?? []).slice(0, 4).map((item) => {
            const p = interpolate(frame, [item.showAtInFrames, item.showAtInFrames + 10], [0, 1], {...clamp, easing: EASING.enter});
            return <div key={item.label} style={{minHeight: 52 * su, borderRadius: 12 * su, display: "flex", alignItems: "center", gap: 9 * su, padding: `0 ${12 * su}px`, background: `${color}0C`, border: `1px solid ${color}3D`, color: palette.fg, fontSize: 28 * su, fontWeight: 760, opacity: p}}>{item.label}</div>;
          })}
        </div> : null}
      </div>
    );

    const routeStartX = leftCardX + splitCardWidth;
    const routeEndX = rightCardX;
    const actionLabelWidth = 234 * su;
    const actionLabelHeight = 64 * su;

    return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
      <svg width={width} height={height} style={{position: "absolute", inset: 0, opacity: (1 - exit) * actionWeight}}>
        <path d={`M${routeStartX} ${cardJoinY} V${routeY} H${routeEndX} V${cardJoinY}`} fill="none" stroke={actionColor} strokeWidth={5 * su} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - actionIn} />
        <path d={`M${routeEndX - 18 * su} ${routeY - 13 * su} L${routeEndX + 6 * su} ${routeY} L${routeEndX - 18 * su} ${routeY + 13 * su}`} fill="none" stroke={actionColor} strokeWidth={5 * su} strokeLinecap="round" strokeLinejoin="round" opacity={actionIn} />
      </svg>
      <div style={{position: "absolute", left: width / 2 - actionLabelWidth / 2, top: routeY - actionLabelHeight - 15 * su, width: actionLabelWidth, height: actionLabelHeight, borderRadius: 17 * su, display: "grid", placeItems: "center", background: `linear-gradient(145deg, ${actionColor}2A, rgba(7,9,15,0.52))`, backdropFilter: "blur(10px)", border: `1px solid ${actionColor}78`, color: actionColor, fontSize: 34 * su, fontWeight: 920, opacity: actionIn * actionWeight * (1 - exit), translate: `0px ${(1 - actionIn) * 12 * su}px`}}>{actionLabel}</div>
      {renderSplitCard(problem, leftCardX, problemColor, problemIn, problemWeight, "问题")}
      {renderSplitCard(solution, rightCardX, solutionColor, solutionIn, solutionWeight, "解决")}
    </AbsoluteFill>;
  }

  return <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT}}>
    <div style={{position: "absolute", left: x, top: y, width: panelWidth, height: panelHeight, opacity: 1 - exit, translate: `0px ${exit * 24 * u}px`}}>
      {renderSide(problem, 0, problemColor, problemIn, "问题")}
      <svg width={panelWidth} height={panelHeight} style={{position: "absolute", inset: 0}}><path d={`M${380 * u} ${connectorY} H${600 * u}`} stroke={actionColor} strokeWidth={5 * u} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - actionIn} /><path d={`M${578 * u} ${connectorY - 15 * u} L${604 * u} ${connectorY} L${578 * u} ${connectorY + 15 * u}`} fill="none" stroke={actionColor} strokeWidth={5 * u} strokeLinecap="round" strokeLinejoin="round" opacity={actionIn} /></svg>
      <div style={{position: "absolute", left: 400 * u, top: connectorY - 78 * u, width: 180 * u, minHeight: 56 * u, padding: `${10 * u}px ${12 * u}px`, boxSizing: "border-box", borderRadius: 16 * u, display: "grid", placeItems: "center", textAlign: "center", background: `${actionColor}1F`, border: `1px solid ${actionColor}66`, color: actionColor, fontSize: 28 * u, lineHeight: 1.05, fontWeight: 900, opacity: actionIn, translate: `0px ${(1 - actionIn) * 12 * u}px`}}>{actionLabel}</div>
      {renderSide(solution, 630 * u, solutionColor, solutionIn, "解决")}
    </div>
  </AbsoluteFill>;
};
