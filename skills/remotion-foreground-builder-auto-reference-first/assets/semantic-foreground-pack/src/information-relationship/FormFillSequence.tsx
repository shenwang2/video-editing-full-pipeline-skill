import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {CODE_THEMES} from "../lib/code-syntax";
import {
  ForegroundPlacement,
  getAlignedX,
  getForegroundZone,
  type Rect,
} from "../lib/layout";
import {EASING} from "../lib/motion-tokens";
import {EDITABLE_ROOM_LIGHT_PALETTE} from "../lib/room-light-palette";
import {SemanticIcon, type SemanticIconName} from "../lib/semantic-icons";

const FONT_FAMILY = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';

export type SpokenSequenceStep = {
  label: string;
  detail?: string;
  /** Compact semantic metadata shown under the active step label. */
  meta?: string;
  /** Finite semantic glyph used by the deployment-rail action motif. */
  icon?: SemanticIconName;
  /** Local frame where the narration begins this step. */
  showAtInFrames: number;
  /** Local frame where the step locks. Defaults to the next step's anchor. */
  completeAtInFrames?: number;
};

export type FormFillSequenceProps = {
  steps: SpokenSequenceStep[];
  visualVariant?: "spokenSteps" | "stepRail" | "compactExplanationStack";
  title?: string;
  titleEmphasis?: string;
  eyebrow?: string;
  resultLabel?: string;
  placement?: ForegroundPlacement;
  zoneOverride?: Rect;
  layoutMode?: "panel" | "progressiveStack";
  attentionMode?: "standard" | "guided";
  accentColor?: string;
  validColor?: string;
  theme?: "dark" | "light";
  exitAtInFrames?: number;
  exitInFrames?: number;
};

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

export type StepRailLayout = {
  unit: number;
  x: number;
  y: number;
  width: number;
  height: number;
  headerHeight: number;
  rowPitch: number;
  rowHeight: number;
  footerHeight: number;
  rows: Rect[];
};

export type CompactExplanationStackLayout = {
  unit: number;
  x: number;
  y: number;
  width: number;
  height: number;
  headerHeight: number;
  rowPitch: number;
  rowHeight: number;
  footerHeight: number;
  rows: Rect[];
};

/**
 * Stable, fully-expanded geometry for the V2-derived state-evolution rail.
 * The renderer and edit-desk selection box intentionally share this resolver.
 */
export const getStepRailLayout = ({
  width,
  height,
  placement,
  stepCount,
  hasTitle,
  hasResult,
  zoneOverride,
}: {
  width: number;
  height: number;
  placement: ForegroundPlacement;
  stepCount: number;
  hasTitle: boolean;
  hasResult: boolean;
  zoneOverride?: Rect;
}): StepRailLayout => {
  const zone = zoneOverride ?? getForegroundZone({width, height, placement});
  const count = Math.max(1, Math.min(5, stepCount));
  const baseWidth = 700;
  const baseHeaderHeight = hasTitle ? 132 : 66;
  const baseRowPitch = 118;
  const baseRowHeight = 90;
  const baseFooterHeight = hasResult ? 70 : 48;
  const baseHeight = baseHeaderHeight + (count - 1) * baseRowPitch + baseRowHeight + baseFooterHeight;
  const unit = Math.max(0.66, Math.min(zone.width / baseWidth, zone.height / baseHeight, 1.48));
  const railWidth = Math.min(zone.width, baseWidth * unit);
  const railHeight = baseHeight * unit;
  const x = getAlignedX({zone, itemWidth: railWidth, placement});
  const y = zone.y + Math.max(0, (zone.height - railHeight) / 2);
  const headerHeight = baseHeaderHeight * unit;
  const rowPitch = baseRowPitch * unit;
  const rowHeight = baseRowHeight * unit;
  const footerHeight = baseFooterHeight * unit;
  return {
    unit,
    x,
    y,
    width: railWidth,
    height: railHeight,
    headerHeight,
    rowPitch,
    rowHeight,
    footerHeight,
    rows: Array.from({length: count}, (_, index) => ({
      x,
      y: y + headerHeight + index * rowPitch,
      width: railWidth,
      height: rowHeight,
    })),
  };
};

/**
 * Stable fully-expanded geometry for the V3-derived compact explanation stack.
 * Rows still represent ordinary sequence steps; this variant only changes how
 * they are progressively listed and handed off on screen.
 */
export const getCompactExplanationStackLayout = ({
  width,
  height,
  placement,
  stepCount,
  hasHeader,
  hasResult,
  zoneOverride,
}: {
  width: number;
  height: number;
  placement: ForegroundPlacement;
  stepCount: number;
  hasHeader: boolean;
  hasResult: boolean;
  zoneOverride?: Rect;
}): CompactExplanationStackLayout => {
  const zone = zoneOverride ?? getForegroundZone({width, height, placement});
  const count = Math.max(1, Math.min(5, stepCount));
  const baseWidth = 598;
  const baseHeaderHeight = hasHeader ? 104 : 0;
  const baseRowPitch = 126;
  const baseRowHeight = 108;
  const baseFooterHeight = hasResult ? 62 : 8;
  const baseHeight = baseHeaderHeight + (count - 1) * baseRowPitch + baseRowHeight + baseFooterHeight;
  const unit = Math.max(0.7, Math.min(zone.width / baseWidth, zone.height / baseHeight, 1.52));
  const stackWidth = Math.min(zone.width, baseWidth * unit);
  const stackHeight = baseHeight * unit;
  const x = getAlignedX({zone, itemWidth: stackWidth, placement});
  const y = zone.y + Math.max(0, (zone.height - stackHeight) / 2);
  const headerHeight = baseHeaderHeight * unit;
  const rowPitch = baseRowPitch * unit;
  const rowHeight = baseRowHeight * unit;
  const footerHeight = baseFooterHeight * unit;
  return {
    unit,
    x,
    y,
    width: stackWidth,
    height: stackHeight,
    headerHeight,
    rowPitch,
    rowHeight,
    footerHeight,
    rows: Array.from({length: count}, (_, index) => ({
      x,
      y: y + headerHeight + index * rowPitch,
      width: stackWidth,
      height: rowHeight,
    })),
  };
};

const CheckGlyph: React.FC<{size: number; color: string; progress: number}> = ({
  size,
  color,
  progress,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M5 12.4l4.6 4.6L19 6.6"
      stroke={color}
      strokeWidth={2.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={22}
      strokeDashoffset={22 * (1 - progress)}
    />
  </svg>
);

/**
 * RemotionUI Form Fill Sequence adapted into a generic spoken step panel.
 * The visual grammar stays: focus arrives, the current payload resolves, the
 * row validates, and only then does attention move to the next Spoken Beat.
 */
export const FormFillSequence: React.FC<FormFillSequenceProps> = ({
  steps,
  visualVariant = "spokenSteps",
  title,
  titleEmphasis,
  eyebrow,
  resultLabel,
  placement = "centerSafe",
  zoneOverride,
  layoutMode = "progressiveStack",
  attentionMode = "guided",
  accentColor = "#E8B86D",
  validColor = "#7FD1A0",
  theme = "dark",
  exitAtInFrames,
  exitInFrames = 14,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const palette = CODE_THEMES[theme];
  const zone = zoneOverride ?? getForegroundZone({width, height, placement});
  const visibleSteps = steps.slice(0, 5);
  const baseHeight = 76 + visibleSteps.length * 82 + (resultLabel ? 62 : 0);
  const u = Math.max(
    0.74,
    Math.min(zone.width / 560, zone.height / Math.max(baseHeight, 1), 1.5),
  );
  const panelWidth = Math.min(zone.width, 560 * u);
  const panelHeight = baseHeight * u;
  const x = getAlignedX({zone, itemWidth: panelWidth, placement});
  const y = zone.y + (zone.height - panelHeight) / 2;
  const panelIn = spring({
    frame,
    fps,
    config: {damping: 18, stiffness: 135, mass: 0.86},
  });
  const exit =
    exitAtInFrames === undefined
      ? 0
      : interpolate(
          frame,
          [exitAtInFrames, exitAtInFrames + exitInFrames],
          [0, 1],
          {easing: EASING.exit, ...clamp},
        );
  const lastComplete = visibleSteps.reduce((latest, step, index) => {
    const next = visibleSteps[index + 1]?.showAtInFrames;
    return Math.max(latest, step.completeAtInFrames ?? next ?? step.showAtInFrames + 18);
  }, 0);
  const resultIn = interpolate(frame, [lastComplete, lastComplete + 12], [0, 1], {
    easing: EASING.enter,
    ...clamp,
  });

  if (visualVariant === "compactExplanationStack") {
    const stackSteps = visibleSteps.slice(0, 5);
    if (stackSteps.length === 0) return null;
    const layout = getCompactExplanationStackLayout({
      width,
      height,
      placement,
      stepCount: stackSteps.length,
      hasHeader: Boolean(title || eyebrow),
      hasResult: Boolean(resultLabel),
      zoneOverride,
    });
    const cu = layout.unit;
    const activeIndex = stackSteps.reduce(
      (latest, step, index) => frame >= step.showAtInFrames ? index : latest,
      -1,
    );
    const emphasisIndex = title && titleEmphasis ? title.indexOf(titleEmphasis) : -1;
    const titleBefore = emphasisIndex >= 0 ? title?.slice(0, emphasisIndex) : title;
    const titleAfter = emphasisIndex >= 0
      ? title?.slice(emphasisIndex + (titleEmphasis?.length ?? 0))
      : "";

    return (
      <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT_FAMILY}}>
        <div style={{position: "absolute", left: layout.x, top: layout.y, width: layout.width, height: layout.height, opacity: Math.min(1, panelIn) * (1 - exit), translate: `0 ${(1 - panelIn) * 18 * cu + exit * 22 * cu}px`}}>
          {title || eyebrow ? (
            <div style={{position: "absolute", left: 0, top: 0, width: layout.width, height: layout.headerHeight, boxSizing: "border-box", paddingTop: 4 * cu}}>
              <div style={{display: "flex", alignItems: "center", gap: 11 * cu, color: accentColor, fontSize: 13 * cu, lineHeight: 1, fontWeight: 850, letterSpacing: `${3 * cu}px`}}>
                <span data-editable-accent-background="true" style={{width: 34 * cu, height: 4 * cu, flex: "0 0 auto", background: accentColor, boxShadow: `0 0 ${14 * cu}px ${accentColor}88`}} />
                <span>{eyebrow || "STEP STACK"}</span>
              </div>
              {title ? (
                <div style={{marginTop: 14 * cu, color: palette.fg, fontSize: 34 * cu, lineHeight: 1.05, fontWeight: 900, letterSpacing: "-0.025em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>
                  {titleBefore}
                  {emphasisIndex >= 0 ? <span style={{color: accentColor}}>{titleEmphasis}</span> : null}
                  {titleAfter}
                </div>
              ) : null}
            </div>
          ) : null}

          {stackSteps.map((step, index) => {
            if (frame < step.showAtInFrames) return null;
            const entered = Math.min(1, spring({
              frame: frame - step.showAtInFrames,
              fps,
              config: {damping: 19, stiffness: 165, mass: 0.78},
            }));
            const isActive = index === activeIndex;
            const rowTop = layout.headerHeight + index * layout.rowPitch;
            const rowAccent = `var(--editable-card-color, ${accentColor})`;
            const meta = step.meta ?? step.detail ?? `STEP ${String(index + 1).padStart(2, "0")}`;
            // A presentation acknowledgement after this row enters, not a
            // rewrite of its semantic completion or the next spoken anchor.
            const checkStart = step.showAtInFrames + Math.round(fps * 0.2);
            const checkProgress = interpolate(
              frame,
              [checkStart, checkStart + Math.max(1, Math.round(fps * 0.32))],
              [0, 1],
              {easing: EASING.editorial, ...clamp},
            );
            return (
              <div
                key={`${step.label}-${index}`}
                data-content-sized-surface="sequence-step"
                data-card-copy-structure="primary"
                data-editable-base-accent={accentColor}
                data-editable-preserve-transparent="true"
                style={{
                  position: "absolute",
                  left: 0,
                  top: rowTop,
                  width: layout.width,
                  height: layout.rowHeight,
                  boxSizing: "border-box",
                  borderRadius: 9 * cu,
                  background: isActive ? "rgba(6,12,20,.72)" : "rgba(6,12,20,.37)",
                  border: `${1 * cu}px solid ${isActive ? rowAccent : "rgba(255,255,255,.08)"}`,
                  boxShadow: isActive ? "0 10px 25px rgba(0,0,0,.20)" : "none",
                  opacity: entered * (isActive ? 1 : 0.34),
                  translate: `0 ${(1 - entered) * 17 * cu}px`,
                  overflow: "hidden",
                  zIndex: isActive ? 3 : 2,
                }}
              >
                <div data-editable-accent-background="true" style={{position: "absolute", left: 17 * cu, top: 19 * cu, width: 7 * cu, height: 7 * cu, borderRadius: 99, background: rowAccent, boxShadow: isActive ? `0 0 ${10 * cu}px ${rowAccent}` : "none"}} />
                <div data-card-label="true" style={{position: "absolute", left: 39 * cu, top: 14 * cu, right: 108 * cu, color: isActive ? rowAccent : "rgba(255,255,255,.46)", fontSize: 11 * cu, lineHeight: 1, fontWeight: 800, letterSpacing: `${2.1 * cu}px`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{meta}</div>
                <div data-primary-text="true" style={{position: "absolute", left: 39 * cu, top: 42 * cu, right: 108 * cu, color: isActive ? palette.fg : "rgba(255,255,255,.78)", fontSize: (isActive ? 34 : 31) * cu, lineHeight: 1.05, fontWeight: 910, letterSpacing: "-0.025em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{step.label}</div>
                <div
                  aria-hidden="true"
                  data-step-check="true"
                  data-check-style="small-circle"
                  data-step-check-progress={checkProgress}
                  data-editable-accent-stroke="true"
                  style={{
                    position: "absolute",
                    right: 32 * cu,
                    top: (layout.rowHeight - 48 * cu) / 2,
                    width: 48 * cu,
                    height: 48 * cu,
                    display: "grid",
                    placeItems: "center",
                    opacity: interpolate(frame, [checkStart - 3, checkStart + 2], [0, 1], clamp),
                  }}
                >
                  <svg width={48 * cu} height={48 * cu} viewBox="0 0 48 48" fill="none">
                    <circle cx={24} cy={24} r={18.5} stroke={rowAccent} strokeWidth={1.3} />
                    <path
                      d="M15 24L21 30L33 18"
                      pathLength={1}
                      stroke={rowAccent}
                      strokeWidth={1.7}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={1}
                      strokeDashoffset={1 - checkProgress}
                    />
                  </svg>
                </div>
              </div>
            );
          })}

          {resultLabel ? (
            <div style={{position: "absolute", left: 0, bottom: 2 * cu, display: "flex", alignItems: "center", gap: 8 * cu, color: accentColor, fontSize: 15 * cu, lineHeight: 1, fontWeight: 900, opacity: resultIn, translate: `0 ${(1 - resultIn) * 8 * cu}px`}}>
              <CheckGlyph size={20 * cu} color={accentColor} progress={resultIn} />
              {resultLabel}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    );
  }

  if (visualVariant === "stepRail") {
    const railSteps = visibleSteps.slice(0, 5);
    if (railSteps.length === 0) return null;
    const singleAccent = EDITABLE_ROOM_LIGHT_PALETTE.青蓝;
    const layout = getStepRailLayout({
      width,
      height,
      placement,
      stepCount: railSteps.length,
      hasTitle: Boolean(title),
      hasResult: Boolean(resultLabel),
      zoneOverride,
    });
    const ru = layout.unit;
    const activeIndex = railSteps.reduce(
      (latest, step, index) => frame >= step.showAtInFrames ? index : latest,
      0,
    );
    const current = railSteps[activeIndex];
    const currentIn = Math.min(1, spring({
      frame: frame - current.showAtInFrames,
      fps,
      config: {damping: 18, stiffness: 160, mass: 0.8},
    }));
    const firstDotY = layout.headerHeight + layout.rowHeight / 2;
    const currentDotY = firstDotY + activeIndex * layout.rowPitch;
    const lastDotY = firstDotY + (railSteps.length - 1) * layout.rowPitch;
    const emphasisIndex = title && titleEmphasis ? title.indexOf(titleEmphasis) : -1;
    const titleBefore = emphasisIndex >= 0 ? title?.slice(0, emphasisIndex) : title;
    const titleAfter = emphasisIndex >= 0
      ? title?.slice(emphasisIndex + (titleEmphasis?.length ?? 0))
      : "";

    return (
      <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT_FAMILY}}>
        <div style={{position: "absolute", left: layout.x, top: layout.y, width: layout.width, height: layout.height, opacity: Math.min(1, panelIn) * (1 - exit), translate: `0 ${(1 - panelIn) * 18 * ru + exit * 22 * ru}px`}}>
          <div style={{height: layout.headerHeight, boxSizing: "border-box", padding: `${4 * ru}px ${14 * ru}px 0 ${2 * ru}px`}}>
            <div style={{display: "flex", alignItems: "center", gap: 12 * ru, color: singleAccent.hex, fontSize: 14 * ru, lineHeight: 1, fontWeight: 850, letterSpacing: `${3.4 * ru}px`}}>
              <span data-editable-accent-background="true" style={{width: 34 * ru, height: 4 * ru, flex: "0 0 auto", background: singleAccent.hex, boxShadow: `0 0 ${15 * ru}px rgba(${singleAccent.rgb},0.62)`}} />
              <span style={{whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{eyebrow || "PROGRESS ROUTE"}</span>
              <span style={{marginLeft: "auto", color: palette.dim, letterSpacing: `${2 * ru}px`}}>{String(activeIndex + 1).padStart(2, "0")} / {String(railSteps.length).padStart(2, "0")}</span>
            </div>
            {title ? <div style={{marginTop: 14 * ru, color: palette.fg, fontSize: 34 * ru, lineHeight: 1.08, fontWeight: 900, letterSpacing: "-0.025em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>
              {titleBefore}
              {emphasisIndex >= 0 ? <span style={{color: singleAccent.hex}}>{titleEmphasis}</span> : null}
              {titleAfter}
            </div> : null}
            <div style={{marginTop: title ? 15 * ru : 13 * ru, height: 1 * ru, background: `linear-gradient(90deg, rgba(${singleAccent.rgb},0.66), rgba(255,255,255,0.15) 58%, transparent)`}} />
          </div>

          <svg data-editable-native-connector="true" width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} style={{position: "absolute", inset: 0, overflow: "visible"}}>
            <path d={`M ${24 * ru} ${firstDotY} V ${lastDotY}`} stroke="rgba(255,255,255,0.10)" strokeWidth={2 * ru} strokeDasharray={`${2 * ru} ${11 * ru}`} />
            <path d={`M ${24 * ru} ${firstDotY} V ${currentDotY}`} stroke={singleAccent.hex} strokeWidth={3 * ru} strokeLinecap="round" style={{filter: `drop-shadow(0 0 ${9 * ru}px rgba(${singleAccent.rgb},0.58))`}} />
            <path d={`M ${2 * ru} ${layout.headerHeight - 13 * ru} H ${12 * ru} M ${2 * ru} ${layout.headerHeight - 13 * ru} V ${lastDotY + 48 * ru} M ${2 * ru} ${lastDotY + 48 * ru} H ${12 * ru}`} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={1 * ru} />
          </svg>

          {railSteps.map((step, index) => {
            const entered = Math.min(1, spring({frame: frame - step.showAtInFrames, fps, config: {damping: 18, stiffness: 155, mass: 0.76}}));
            const state = index < activeIndex ? "done" : index === activeIndex ? "active" : "future";
            const stateOpacity = state === "active" ? Math.max(0.12, entered) : state === "done" ? 0.38 : 0.12;
            const rowTop = layout.headerHeight + index * layout.rowPitch;
            const icon = step.icon ?? (index === railSteps.length - 1 ? "check" : "workflow");
            const meta = step.meta ?? step.detail ?? `STEP ${String(index + 1).padStart(2, "0")}`;
            const rowAccent = `var(--editable-card-color, ${singleAccent.hex})`;
            return (
              <div key={`${step.label}-${index}`} data-content-sized-surface="sequence-step" data-card-copy-structure="primary" data-editable-preserve-transparent="true" style={{position: "absolute", left: 0, top: rowTop, width: layout.width, height: layout.rowHeight, boxSizing: "border-box", opacity: stateOpacity, translate: `${state === "active" ? (1 - currentIn) * 18 * ru : 0}px 0`, zIndex: state === "active" ? 3 : 2}}>
                {state === "active" ? <div data-editable-accent-border="true" style={{position: "absolute", left: 49 * ru, top: 2 * ru, width: (layout.width / ru - 64) * ru * currentIn, height: 86 * ru, background: `linear-gradient(90deg, rgba(${singleAccent.rgb},0.13), rgba(${singleAccent.rgb},0.025) 72%, transparent)`, borderTop: `${1 * ru}px solid ${rowAccent}`, borderBottom: `${1 * ru}px solid rgba(${singleAccent.rgb},0.15)`}} /> : null}
                <div data-editable-accent-border="true" style={{position: "absolute", left: 9 * ru, top: 30 * ru, width: 30 * ru, height: 30 * ru, borderRadius: "50%", display: "grid", placeItems: "center", color: state === "done" ? "#050608" : rowAccent, background: state === "done" ? rowAccent : state === "active" ? `rgba(${singleAccent.rgb},0.16)` : "rgba(6,15,25,0.56)", border: `${2 * ru}px solid ${state === "future" ? "rgba(255,255,255,0.28)" : rowAccent}`, boxShadow: state === "active" ? `0 0 0 ${7 * ru}px rgba(${singleAccent.rgb},0.08), 0 0 ${18 * ru}px rgba(${singleAccent.rgb},0.55)` : "none", zIndex: 3}}>
                  {state === "done" ? <CheckGlyph size={21 * ru} color="#050608" progress={1} /> : <span style={{fontSize: 13 * ru, fontWeight: 900}}>{state === "active" ? String(index + 1).padStart(2, "0") : ""}</span>}
                </div>
                <div style={{position: "absolute", left: 74 * ru, top: 10 * ru, right: 190 * ru, minWidth: 0}}>
                  <div data-primary-text="true" style={{color: state === "active" ? palette.fg : "rgba(255,255,255,0.78)", fontSize: (state === "active" ? 37 : 29) * ru, lineHeight: 1.08, fontWeight: 900, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{step.label}</div>
                  <div data-card-label="true" style={{marginTop: 10 * ru, color: state === "active" ? rowAccent : palette.dim, fontSize: 12 * ru, lineHeight: 1, fontWeight: 800, letterSpacing: `${2.4 * ru}px`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{String(index + 1).padStart(2, "0")} · {meta}</div>
                </div>
                {state === "active" ? <div style={{position: "absolute", right: 12 * ru, top: 9 * ru, width: 160 * ru, height: 72 * ru, display: "flex", alignItems: "center", gap: 14 * ru, padding: `0 ${16 * ru}px`, boxSizing: "border-box", border: `${1 * ru}px solid rgba(${singleAccent.rgb},0.34)`, background: "rgba(5,13,22,0.50)", opacity: currentIn, translate: `${(1 - currentIn) * 20 * ru}px 0`, filter: "drop-shadow(0 10px 24px rgba(0,0,0,0.28))"}}>
                  <span data-editable-accent-stroke="true"><SemanticIcon name={icon} color={rowAccent} size={36 * ru} strokeWidth={2.2} progress={currentIn} /></span>
                  <span style={{minWidth: 0}}>
                    <span style={{display: "block", color: palette.fg, fontSize: 13 * ru, lineHeight: 1, fontWeight: 850, letterSpacing: `${1.7 * ru}px`}}>ACTIVE</span>
                    <span data-card-label="true" style={{display: "block", marginTop: 8 * ru, color: rowAccent, fontSize: 10 * ru, lineHeight: 1, fontWeight: 760, letterSpacing: `${1.4 * ru}px`, whiteSpace: "nowrap"}}>STEP IN MOTION</span>
                  </span>
                </div> : null}
              </div>
            );
          })}

          <div style={{position: "absolute", left: 4 * ru, bottom: 10 * ru, color: palette.dim, fontSize: 11 * ru, lineHeight: 1, fontWeight: 760, letterSpacing: `${2.1 * ru}px`}}>PROGRESSIVE STATE · HISTORY RETAINED</div>
          {resultLabel ? <div style={{position: "absolute", right: 4 * ru, bottom: 0, display: "flex", alignItems: "center", gap: 8 * ru, padding: `${8 * ru}px ${13 * ru}px`, borderRadius: 999, border: `${1 * ru}px solid rgba(${singleAccent.rgb},0.70)`, color: singleAccent.hex, fontSize: 14 * ru, fontWeight: 900, boxShadow: `0 0 ${22 * ru}px rgba(${singleAccent.rgb},0.15)`, opacity: resultIn, translate: `0 ${(1 - resultIn) * 9 * ru}px`}}><CheckGlyph size={20 * ru} color={singleAccent.hex} progress={resultIn} />{resultLabel}</div> : null}
        </div>
      </AbsoluteFill>
    );
  }

  if (layoutMode === "progressiveStack") {
    const su = Math.min(width / 2560, height / 1440);
    const stackWidth = Math.min(zone.width, 630 * su);
    const visibleNow = visibleSteps.filter((step) => frame >= step.showAtInFrames);
    const emphasisIndex = title && titleEmphasis ? title.indexOf(titleEmphasis) : -1;
    const titleBefore = emphasisIndex >= 0 ? title?.slice(0, emphasisIndex) : title;
    const titleAfter = emphasisIndex >= 0
      ? title?.slice(emphasisIndex + (titleEmphasis?.length ?? 0))
      : "";

    return (
      <AbsoluteFill
        data-foreground-overlay-root="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "transparent",
          pointerEvents: "none",
          fontFamily: FONT_FAMILY,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: zone.x,
            top: zone.y,
            width: stackWidth,
            boxSizing: "border-box",
            opacity: Math.min(1, panelIn) * (1 - exit),
            translate: `0px ${(1 - panelIn) * 22 * su + exit * 24 * su}px`,
          }}
        >
          {title ? (
            <div style={{marginBottom: 24 * su}}>
              <div
                style={{
                  width: 54 * su,
                  height: 5 * su,
                  borderRadius: 99 * su,
                  marginBottom: 14 * su,
                  background: `linear-gradient(90deg, ${accentColor}, ${accentColor}20)`,
                  boxShadow: `0 0 ${18 * su}px ${accentColor}42`,
                }}
              />
              <div
                style={{
                  color: palette.fg,
                  fontSize: 60 * su,
                  lineHeight: 1.02,
                  fontWeight: 920,
                  letterSpacing: "-0.035em",
                  textShadow: "0 4px 16px rgba(0,0,0,0.55)",
                  whiteSpace: "nowrap",
                }}
              >
                {titleBefore}
                {emphasisIndex >= 0 ? (
                  <span style={{color: accentColor, fontSize: 68 * su, fontWeight: 950}}>
                    {titleEmphasis}
                  </span>
                ) : null}
                {titleAfter}
              </div>
            </div>
          ) : null}

          <div style={{display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14 * su}}>
            {visibleNow.map((step) => {
              const sourceIndex = visibleSteps.indexOf(step);
              const nextAt = visibleSteps[sourceIndex + 1]?.showAtInFrames;
              const completeAt = step.completeAtInFrames ?? nextAt ?? step.showAtInFrames + 18;
              const enter = spring({
                frame: frame - step.showAtInFrames,
                fps,
                config: {damping: 19, stiffness: 165, mass: 0.76},
              });
              const check = interpolate(frame, [completeAt, completeAt + 9], [0, 1], {
                easing: EASING.enter,
                ...clamp,
              });
              const focusIn = interpolate(
                frame,
                [step.showAtInFrames - 2, step.showAtInFrames + 7],
                [0, 1],
                {easing: EASING.enter, ...clamp},
              );
              const focusOut = interpolate(
                frame,
                [completeAt, completeAt + 8],
                [0, 1],
                {easing: EASING.exit, ...clamp},
              );
              const focus = focusIn * (1 - focusOut);
              const isCompleted = frame >= completeAt;
              const rowWeight = attentionMode === "guided" && isCompleted ? 0.72 : 1;
              const detailChars = step.detail?.length ?? 0;
              const detailProgress = interpolate(
                frame,
                [step.showAtInFrames + 2, Math.max(step.showAtInFrames + 8, completeAt - 2)],
                [0, 1],
                {easing: EASING.editorial, ...clamp},
              );
              const detail = step.detail?.slice(0, Math.round(detailProgress * detailChars));

              return (
                <div
                  key={`${step.label}-${sourceIndex}`}
                  style={{
                    width: "fit-content",
                    maxWidth: "100%",
                    minWidth: 372 * su,
                    boxSizing: "border-box",
                    display: "grid",
                    gridTemplateColumns: `${5 * su}px auto ${32 * su}px`,
                    alignItems: "center",
                    columnGap: 15 * su,
                    padding: `${13 * su}px ${17 * su}px ${14 * su}px ${13 * su}px`,
                    borderRadius: 17 * su,
                    background: focus > 0.06
                      ? "linear-gradient(135deg, rgba(12,15,24,0.66), rgba(28,25,29,0.48))"
                      : "linear-gradient(135deg, rgba(12,15,24,0.42), rgba(24,27,37,0.27))",
                    backdropFilter: "blur(11px) saturate(1.08)",
                    border: `1px solid ${
                      focus > 0.06
                        ? `${accentColor}B8`
                        : isCompleted
                          ? `${validColor}55`
                          : palette.border
                    }`,
                    boxShadow: focus > 0.06
                      ? `inset 0 1px 0 ${palette.highlight}, 0 0 ${28 * su}px ${accentColor}20, 0 ${14 * su}px ${30 * su}px rgba(0,0,0,0.22)`
                      : `inset 0 1px 0 ${palette.highlight}, 0 ${10 * su}px ${22 * su}px rgba(0,0,0,0.17)`,
                    opacity: Math.min(1, enter) * rowWeight,
                    translate: `${(1 - enter) * -12 * su}px ${(1 - enter) * 8 * su}px`,
                    scale: 1 + focus * 0.018,
                    transformOrigin: "left center",
                  }}
                >
                  <div
                    style={{
                      width: 5 * su,
                      height: (52 + focus * 10) * su,
                      borderRadius: 99 * su,
                      background: isCompleted ? validColor : accentColor,
                      boxShadow: focus > 0.08 ? `0 0 ${18 * su}px ${accentColor}66` : "none",
                    }}
                  />
                  <div style={{minWidth: 0, paddingRight: 8 * su}}>
                    <div style={{color: isCompleted ? validColor : accentColor, fontSize: 19 * su, lineHeight: 1, fontWeight: 850, letterSpacing: "0.1em", marginBottom: 8 * su}}>
                      STEP {String(sourceIndex + 1).padStart(2, "0")}
                    </div>
                    <div style={{color: palette.fg, fontSize: (46 + focus * 8) * su, lineHeight: 1.02, fontWeight: 910, letterSpacing: "-0.025em", whiteSpace: "nowrap"}}>
                      {step.label}
                    </div>
                    {detail ? (
                      <div style={{marginTop: 7 * su, color: palette.dim, fontSize: 28 * su, lineHeight: 1.12, fontWeight: 650, whiteSpace: "nowrap"}}>
                        {detail}
                      </div>
                    ) : null}
                  </div>
                  <div style={{display: "grid", placeItems: "center", opacity: Math.max(0.12, check)}}>
                    {isCompleted ? (
                      <CheckGlyph size={29 * su} color={validColor} progress={check} />
                    ) : (
                      <div style={{width: 13 * su, height: 13 * su, borderRadius: 99 * su, background: accentColor, boxShadow: `0 0 ${15 * su}px ${accentColor}88`}} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {resultLabel && resultIn > 0 ? (
            <div
              style={{
                marginTop: 16 * su,
                width: "fit-content",
                display: "flex",
                alignItems: "center",
                gap: 11 * su,
                padding: `${12 * su}px ${18 * su}px`,
                borderRadius: 15 * su,
                background: `linear-gradient(135deg, ${validColor}E8, ${validColor}B8)`,
                color: "#10141A",
                fontSize: 32 * su,
                lineHeight: 1,
                fontWeight: 930,
                opacity: resultIn,
                scale: 0.96 + resultIn * 0.04,
                transformOrigin: "left center",
              }}
            >
              <CheckGlyph size={25 * su} color="#10141A" progress={resultIn} />
              {resultLabel}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      data-foreground-overlay-root="true"
      style={{
        position: "absolute",
        inset: 0,
        background: "transparent",
        pointerEvents: "none",
        fontFamily: FONT_FAMILY,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: panelWidth,
          height: panelHeight,
          boxSizing: "border-box",
          padding: `${20 * u}px ${22 * u}px`,
          borderRadius: 20 * u,
          background:
            theme === "dark"
              ? "linear-gradient(150deg, rgba(6,8,14,0.55), rgba(15,19,29,0.34))"
              : "linear-gradient(150deg, rgba(255,255,255,0.91), rgba(244,244,242,0.76))",
          backdropFilter: "blur(12px) saturate(1.08)",
          border: `1px solid ${palette.border}`,
          boxShadow: `inset 0 1px 0 ${palette.highlight}, 0 ${18 * u}px ${42 * u}px ${palette.shadow}`,
          opacity: Math.min(1, panelIn) * (1 - exit),
          transform: `translateY(${(1 - panelIn) * 24 * u + exit * 28 * u}px)`,
          overflow: "hidden",
        }}
      >
        {title ? (
          <div
            style={{
              color: palette.fg,
              fontSize: 38 * u,
              lineHeight: 1.05,
              fontWeight: 850,
              letterSpacing: "-0.025em",
              marginBottom: 15 * u,
            }}
          >
            {title}
          </div>
        ) : null}

        <div style={{display: "flex", flexDirection: "column", gap: 10 * u}}>
          {visibleSteps.map((step, index) => {
            const nextAt = visibleSteps[index + 1]?.showAtInFrames;
            const completeAt =
              step.completeAtInFrames ?? nextAt ?? step.showAtInFrames + 18;
            const enter = spring({
              frame: frame - step.showAtInFrames,
              fps,
              config: {damping: 19, stiffness: 160, mass: 0.78},
            });
            const check = interpolate(frame, [completeAt, completeAt + 9], [0, 1], {
              easing: EASING.enter,
              ...clamp,
            });
            const focusIn = interpolate(
              frame,
              [step.showAtInFrames - 2, step.showAtInFrames + 7],
              [0, 1],
              {easing: EASING.enter, ...clamp},
            );
            const focusOut = interpolate(frame, [completeAt, completeAt + 7], [0, 1], {
              easing: EASING.exit,
              ...clamp,
            });
            const focus = focusIn * (1 - focusOut);
            const detailChars = step.detail?.length ?? 0;
            const detailProgress = interpolate(
              frame,
              [step.showAtInFrames + 2, Math.max(step.showAtInFrames + 8, completeAt - 2)],
              [0, 1],
              {easing: EASING.editorial, ...clamp},
            );
            const detail = step.detail?.slice(0, Math.round(detailProgress * detailChars));

            return (
              <div
                key={`${step.label}-${index}`}
                style={{
                  height: 70 * u,
                  boxSizing: "border-box",
                  borderRadius: 13 * u,
                  padding: `0 ${13 * u}px`,
                  display: "grid",
                  gridTemplateColumns: `${34 * u}px minmax(0, 1fr) ${28 * u}px`,
                  alignItems: "center",
                  gap: 11 * u,
                  background: palette.band,
                  border: `1px solid ${
                    focus > 0.08
                      ? accentColor
                      : check > 0.55
                        ? `${validColor}80`
                        : palette.border
                  }`,
                  boxShadow:
                    focus > 0.04
                      ? `0 0 0 ${3 * u * focus}px ${accentColor}36, inset 0 1px 0 ${palette.highlight}`
                      : `inset 0 1px 0 ${palette.highlight}`,
                  opacity: Math.min(1, enter),
                  transform: `translateY(${(1 - enter) * 11 * u}px)`,
                }}
              >
                <div
                  style={{
                    width: 30 * u,
                    height: 30 * u,
                    borderRadius: 10 * u,
                    display: "grid",
                    placeItems: "center",
                    background:
                      check > 0.55 ? `${validColor}24` : `${accentColor}20`,
                    color: check > 0.55 ? validColor : accentColor,
                    fontSize: 17 * u,
                    fontWeight: 900,
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div style={{minWidth: 0}}>
                  <div
                    style={{
                      color: palette.fg,
                      fontSize: 32 * u,
                      lineHeight: 1.02,
                      fontWeight: 850,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {step.label}
                  </div>
                  {step.detail ? (
                    <div
                      style={{
                        marginTop: 6 * u,
                        color: palette.dim,
                        fontSize: 18 * u,
                        lineHeight: 1,
                        fontWeight: 650,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {detail}
                    </div>
                  ) : null}
                </div>
                <div style={{display: "grid", placeItems: "center", opacity: check}}>
                  <CheckGlyph size={24 * u} color={validColor} progress={check} />
                </div>
              </div>
            );
          })}
        </div>

        {resultLabel ? (
          <div
            style={{
              marginTop: 14 * u,
              height: 46 * u,
              borderRadius: 12 * u,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9 * u,
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}C8)`,
              color: "#11131A",
              fontSize: 20 * u,
              lineHeight: 1,
              fontWeight: 900,
              opacity: resultIn,
              transform: `scale(${0.96 + resultIn * 0.04})`,
            }}
          >
            <CheckGlyph size={21 * u} color="#11131A" progress={resultIn} />
            {resultLabel}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
