import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  ForegroundPlacement,
  getAlignedX,
  getForegroundZone,
} from "../lib/layout";
import {EASING} from "../lib/motion-tokens";

const FONT_FAMILY = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';

export type ComparisonRowDatum = {
  label: string;
  before: number;
  after: number;
  beforeText?: string;
  afterText?: string;
  delta?: string;
  showAtInFrames?: number;
};

export type ComparisonBarsProps = {
  rows: ComparisonRowDatum[];
  visualVariant?: "numberDelta" | "metricShiftRail";
  seriesLabels?: [string, string];
  placement?: ForegroundPlacement;
  beforeColor?: string;
  afterColor?: string;
  downColor?: string;
  delayInFrames?: number;
  staggerInFrames?: number;
  pairOffsetInFrames?: number;
  growthInFrames?: number;
  exitAtInFrames?: number;
  exitInFrames?: number;
};

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const compact = (value: number) =>
  Math.abs(value) >= 10000
    ? `${(value / 10000).toFixed(value % 10000 === 0 ? 0 : 1)}万`
    : String(value);

/**
 * RemotionUI Comparison Bars adapted as the numeric-only comparison variant.
 * It is never used for a purely conceptual A/B comparison.
 */
export const ComparisonBars: React.FC<ComparisonBarsProps> = ({
  rows,
  visualVariant = "numberDelta",
  seriesLabels,
  placement = "centerSafe",
  beforeColor = "rgba(250,250,250,0.24)",
  afterColor = "#E8B86D",
  downColor = "#F472B6",
  delayInFrames = 4,
  staggerInFrames = 8,
  pairOffsetInFrames = 5,
  growthInFrames = 22,
  exitAtInFrames,
  exitInFrames = 14,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const zone = getForegroundZone({width, height, placement});
  const visibleRows = rows.slice(0, 5);
  const baseHeight = (seriesLabels ? 42 : 0) + visibleRows.length * 88;
  const u = Math.max(
    0.74,
    Math.min(zone.width / 620, zone.height / Math.max(baseHeight, 1), 1.55),
  );
  const panelWidth = Math.min(zone.width, 620 * u);
  const panelHeight = baseHeight * u;
  const labelWidth = 150 * u;
  const barArea = panelWidth - labelWidth - 58 * u;
  // Keep values readable on a phone even when one side is numerically tiny.
  // The remaining width still carries the real ratio; this is a visual floor,
  // not fabricated data.
  const readableBarFloor = Math.min(barArea, 116 * u);
  const peak =
    visibleRows.reduce(
      (highest, row) => Math.max(highest, Math.abs(row.before), Math.abs(row.after)),
      0,
    ) || 1;
  const exit =
    exitAtInFrames === undefined
      ? 0
      : interpolate(
          frame,
          [exitAtInFrames, exitAtInFrames + exitInFrames],
          [0, 1],
          {easing: EASING.exit, ...clamp},
        );

  if (visualVariant === "metricShiftRail") {
    const railRows = rows.slice(0, 4);
    const railBaseHeight = railRows.length * 112 + Math.max(0, railRows.length - 1) * 16;
    const railUnit = Math.max(
      0.7,
      Math.min(zone.width / 900, zone.height / Math.max(railBaseHeight, 1), 1.5),
    );
    const railWidth = Math.min(zone.width, 900 * railUnit);
    const railHeight = railBaseHeight * railUnit;
    const labelWidth = 166 * railUnit;
    const beforeWidth = 112 * railUnit;
    const afterWidth = 148 * railUnit;
    const deltaWidth = 86 * railUnit;

    return (
      <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT_FAMILY}}>
        <div style={{position: "absolute", left: getAlignedX({zone, itemWidth: railWidth, placement}), top: zone.y + (zone.height - railHeight) / 2, width: railWidth, display: "flex", flexDirection: "column", gap: 16 * railUnit, opacity: 1 - exit, translate: `0 ${exit * 18 * railUnit}px`}}>
          {railRows.map((row, index) => {
            const start = row.showAtInFrames ?? delayInFrames + index * staggerInFrames;
            const enter = Math.min(1, spring({frame: frame - start, fps, config: {damping: 18, stiffness: 155, mass: 0.78}}));
            const travel = interpolate(frame, [start + 8, start + Math.max(26, growthInFrames + 8)], [0, 1], {easing: EASING.editorial, ...clamp});
            const afterIn = Math.min(1, spring({frame: frame - start - pairOffsetInFrames - 14, fps, config: {damping: 16, stiffness: 180, mass: 0.66}}));
            const deltaIn = interpolate(frame, [start + growthInFrames + 7, start + growthInFrames + 18], [0, 1], {easing: EASING.enter, ...clamp});
            const change = row.before === 0 ? null : ((row.after - row.before) / Math.abs(row.before)) * 100;
            const delta = row.delta ?? (change === null ? "" : `${change >= 0 ? "+" : "−"}${Math.abs(Math.round(change))}%`);
            const deltaColor = afterColor;

            return (
              <div key={`${row.label}-${index}`} style={{height: 112 * railUnit, boxSizing: "border-box", display: "grid", gridTemplateColumns: `${labelWidth}px ${beforeWidth}px minmax(${130 * railUnit}px, 1fr) ${afterWidth}px ${deltaWidth}px`, alignItems: "center", padding: `0 ${22 * railUnit}px`, borderRadius: 25 * railUnit, background: "linear-gradient(135deg, rgba(10,14,21,0.43), rgba(29,35,46,0.18))", backdropFilter: `blur(${18 * railUnit}px) saturate(1.18)`, border: "1px solid rgba(255,255,255,0.15)", boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10), 0 ${16 * railUnit}px ${36 * railUnit}px rgba(0,0,0,0.20)`, opacity: enter, translate: `${(1 - enter) * (index % 2 === 0 ? -34 : 34) * railUnit}px 0`, scale: 0.965 + enter * 0.035}}>
                <div style={{minWidth: 0}}>
                  <div style={{color: "rgba(255,255,255,0.42)", fontSize: Math.max(12 * railUnit, 9), fontWeight: 760, letterSpacing: "0.12em"}}>指标 {String(index + 1).padStart(2, "0")}</div>
                  <div style={{marginTop: 7 * railUnit, color: "#F8FAFC", fontSize: Math.max(26 * railUnit, 18), fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{row.label}</div>
                </div>
                <div style={{color: "rgba(248,250,252,0.52)", fontSize: Math.max(31 * railUnit, 21), fontWeight: 850, whiteSpace: "nowrap"}}>{row.beforeText ?? compact(row.before)}</div>
                <div style={{position: "relative", height: 40 * railUnit, margin: `0 ${13 * railUnit}px`}}>
                  <div style={{position: "absolute", left: 0, right: 0, top: 19 * railUnit, height: 2 * railUnit, background: "rgba(255,255,255,0.12)", borderRadius: 99}} />
                  <div style={{position: "absolute", left: 0, top: 18 * railUnit, width: `${travel * 100}%`, height: 4 * railUnit, borderRadius: 99, background: `linear-gradient(90deg, ${afterColor}52, ${afterColor})`, boxShadow: `0 0 ${18 * railUnit}px ${afterColor}66`}} />
                  <div style={{position: "absolute", left: `calc(${travel * 100}% - ${9 * railUnit}px)`, top: 11 * railUnit, width: 18 * railUnit, height: 18 * railUnit, borderRadius: "50%", background: afterColor, border: `${4 * railUnit}px solid rgba(18,21,28,0.62)`, boxSizing: "border-box", boxShadow: `0 0 ${18 * railUnit}px ${afterColor}A8`, scale: 0.78 + travel * 0.22}} />
                </div>
                <div style={{height: 74 * railUnit, display: "grid", placeItems: "center", borderRadius: 20 * railUnit, background: `linear-gradient(145deg, ${afterColor}4D, ${afterColor}18)`, border: `1px solid ${afterColor}8F`, boxShadow: `inset 0 1px rgba(255,255,255,0.14), 0 0 ${22 * railUnit}px ${afterColor}24`, color: "#FFF1CF", fontSize: Math.max(40 * railUnit, 26), lineHeight: 1, fontWeight: 920, opacity: afterIn, scale: 0.78 + afterIn * 0.22, whiteSpace: "nowrap"}}>{row.afterText ?? compact(row.after)}</div>
                <div style={{justifySelf: "end", color: deltaColor, background: `${deltaColor}18`, border: `1px solid ${deltaColor}48`, borderRadius: 999, padding: `${9 * railUnit}px ${11 * railUnit}px`, fontSize: Math.max(18 * railUnit, 13), fontWeight: 900, opacity: deltaIn, translate: `0 ${(1 - deltaIn) * 8 * railUnit}px`, whiteSpace: "nowrap"}}>{delta}</div>
              </div>
            );
          })}
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
          left: getAlignedX({zone, itemWidth: panelWidth, placement}),
          top: zone.y + (zone.height - panelHeight) / 2,
          width: panelWidth,
          opacity: 1 - exit,
          transform: `translateY(${exit * 18 * u}px)`,
        }}
      >
        {seriesLabels ? (
          <div
            style={{
              height: 34 * u,
              marginLeft: labelWidth,
              display: "flex",
              alignItems: "center",
              gap: 24 * u,
              color: "rgba(248,250,252,0.72)",
              fontSize: 17 * u,
              fontWeight: 760,
            }}
          >
            {[beforeColor, afterColor].map((color, index) => (
              <span key={index} style={{display: "flex", alignItems: "center", gap: 8 * u}}>
                <span
                  style={{
                    width: 12 * u,
                    height: 12 * u,
                    borderRadius: 4 * u,
                    background: color,
                  }}
                />
                {seriesLabels[index]}
              </span>
            ))}
          </div>
        ) : null}

        <div style={{display: "flex", flexDirection: "column", gap: 14 * u}}>
          {visibleRows.map((row, index) => {
            const start = row.showAtInFrames ?? delayInFrames + index * staggerInFrames;
            const beforeProgress = interpolate(
              frame,
              [start, start + growthInFrames],
              [0, 1],
              {easing: EASING.enter, ...clamp},
            );
            const afterProgress = interpolate(
              frame,
              [start + pairOffsetInFrames, start + pairOffsetInFrames + growthInFrames],
              [0, 1],
              {easing: EASING.enter, ...clamp},
            );
            const change =
              row.before === 0 ? null : ((row.after - row.before) / Math.abs(row.before)) * 100;
            const delta =
              row.delta ??
              (change === null
                ? ""
                : `${change >= 0 ? "+" : "−"}${Math.abs(Math.round(change))}%`);
            const deltaColor = change !== null && change < 0 ? downColor : afterColor;
            const beforeWidth =
              (readableBarFloor +
                (Math.abs(row.before) / peak) * (barArea - readableBarFloor)) *
              beforeProgress;
            const afterWidth =
              (readableBarFloor +
                (Math.abs(row.after) / peak) * (barArea - readableBarFloor)) *
              afterProgress;

            return (
              <div
                key={`${row.label}-${index}`}
                style={{
                  height: 74 * u,
                  display: "grid",
                  gridTemplateColumns: `${labelWidth}px 1fr ${54 * u}px`,
                  alignItems: "center",
                  gap: 0,
                }}
              >
                <div
                  style={{
                    paddingRight: 14 * u,
                    color: "#F8FAFC",
                    fontSize: 30 * u,
                    lineHeight: 1.04,
                    fontWeight: 820,
                    textAlign: "right",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {row.label}
                </div>
                <div style={{display: "grid", gap: 8 * u}}>
                  <div
                    style={{
                      width: Math.max(2, beforeWidth),
                      height: 25 * u,
                      borderRadius: 8 * u,
                      background: beforeColor,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        right: 8 * u,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "rgba(248,250,252,0.78)",
                        fontSize: 18 * u,
                        fontWeight: 800,
                        opacity: beforeProgress,
                      }}
                    >
                      {row.beforeText ?? compact(row.before)}
                    </span>
                  </div>
                  <div
                    style={{
                      width: Math.max(2, afterWidth),
                      height: 30 * u,
                      borderRadius: 9 * u,
                      background: `linear-gradient(90deg, ${afterColor}D8, ${afterColor})`,
                      position: "relative",
                      overflow: "hidden",
                      boxShadow: `0 0 ${18 * u}px ${afterColor}2E`,
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        right: 9 * u,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#11131A",
                        fontSize: 20 * u,
                        fontWeight: 900,
                        opacity: Math.max(0, (afterProgress - 0.55) / 0.45),
                      }}
                    >
                      {row.afterText ?? compact(row.after)}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    paddingLeft: 9 * u,
                    color: deltaColor,
                    fontSize: 22 * u,
                    fontWeight: 900,
                    opacity: Math.max(0, (afterProgress - 0.8) / 0.2),
                    whiteSpace: "nowrap",
                  }}
                >
                  {delta}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
