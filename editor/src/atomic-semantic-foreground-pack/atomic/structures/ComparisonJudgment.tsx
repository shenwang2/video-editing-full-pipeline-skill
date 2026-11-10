import React from "react";
import {interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import type {
  AtomicSceneGraph,
  AtomicComparisonPresentation,
  ThresholdGaugeThreshold,
  ThresholdGaugeVerdict,
  VerdictPathMilestone,
} from "../types";

const FONT = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const CYAN = "#24E5EE";
const RED = "#FF5C72";
const GOLD = "#FFC857";
const LOGICAL_WIDTH = 2560;
const LOGICAL_HEIGHT = 1440;

const ease = (frame: number, from: number, to: number) => interpolate(frame, [from, to], [0, 1], clamp);
const enter = (frame: number, at: number, fps: number) => spring({frame: Math.max(0, frame - at), fps, config: {damping: 18, stiffness: 145, mass: 0.82}});

export type VerdictPathOption = {
  label: string;
  detail: string;
  outcome: "rejected" | "winner";
  showAtInFrames: number;
};

export type VerdictPathSpec = {
  titleLabel?: string;
  headline: string;
  mutedHeadline: string;
  criterionEyebrow?: string;
  criterion: string;
  options: [VerdictPathOption, VerdictPathOption];
  milestones: VerdictPathMilestone[];
  verdict: string;
  routeAtInFrames?: number;
  pathCompleteAtInFrames?: number;
  verdictAtInFrames: number;
};

export type ThresholdGaugeSpec = {
  titleLabel?: string;
  headline: string;
  mutedHeadline: string;
  metricLabel: string;
  unit: string;
  startValue: number;
  endValue: number;
  domainMin?: number;
  domainMax?: number;
  thresholds: ThresholdGaugeThreshold[];
  verdicts: ThresholdGaugeVerdict[];
  gaugeAtInFrames?: number;
  valueStartAtInFrames?: number;
  valueEndAtInFrames: number;
};

const assertText = (value: string, field: string) => {
  if (!value || !value.trim()) throw new Error(`${field} must be grounded non-empty text`);
};

export const buildVerdictPath = (spec: VerdictPathSpec): AtomicSceneGraph => {
  assertText(spec.headline, "headline");
  assertText(spec.mutedHeadline, "mutedHeadline");
  assertText(spec.criterion, "criterion");
  assertText(spec.verdict, "verdict");
  if (spec.options.length !== 2) throw new Error("verdictPath requires exactly two explicit options");
  const losing = spec.options.filter((item) => item.outcome === "rejected");
  const winning = spec.options.filter((item) => item.outcome === "winner");
  if (losing.length !== 1 || winning.length !== 1) throw new Error("verdictPath requires exactly one rejected option and one winner");
  for (const [index, option] of spec.options.entries()) {
    assertText(option.label, `options[${index}].label`);
    assertText(option.detail, `options[${index}].detail`);
    if (!Number.isFinite(option.showAtInFrames) || option.showAtInFrames < 0) throw new Error(`options[${index}].showAtInFrames must be a non-negative frame`);
  }
  if (spec.milestones.length < 1 || spec.milestones.length > 4) throw new Error("verdictPath requires 1..4 grounded winner milestones");
  let prior = -1;
  for (const [index, milestone] of spec.milestones.entries()) {
    assertText(milestone.label, `milestones[${index}].label`);
    if (!Number.isFinite(milestone.showAtInFrames) || milestone.showAtInFrames <= prior) throw new Error("verdictPath milestone frames must be finite and strictly increasing");
    prior = milestone.showAtInFrames;
  }
  if (!Number.isFinite(spec.verdictAtInFrames) || spec.verdictAtInFrames < prior) throw new Error("verdictAtInFrames must not precede the final winner milestone");

  const routeAt = spec.routeAtInFrames ?? Math.min(...spec.options.map((item) => item.showAtInFrames));
  const presentation: AtomicComparisonPresentation = {
    kind: "comparison-verdict-path",
    titleLabel: spec.titleLabel ?? "COMPARISON · 判断路线",
    headline: spec.headline,
    mutedHeadline: spec.mutedHeadline,
    criterionEyebrow: spec.criterionEyebrow ?? "判断标准",
    criterion: spec.criterion,
    losingLabel: losing[0].label,
    losingDetail: losing[0].detail,
    winningLabel: winning[0].label,
    winningDetail: winning[0].detail,
    milestones: spec.milestones,
    verdict: spec.verdict,
    routeAtInFrames: routeAt,
    winnerAtInFrames: winning[0].showAtInFrames,
    rejectAtInFrames: losing[0].showAtInFrames,
    pathCompleteAtInFrames: spec.pathCompleteAtInFrames ?? spec.verdictAtInFrames + 7,
    verdictAtInFrames: spec.verdictAtInFrames,
  };
  return {
    schemaVersion: "1.0",
    structureId: "comparison_verdict_path",
    topology: "criterion-fork-judgment-route",
    coordinateSpace: "normalized-zone",
    atoms: [],
    presentation,
    metadata: {
      semanticLayer: "informationRelationship",
      semanticPurpose: "comparison",
      sourceComponent: "ComparisonBars / ConceptComparisonCards",
      visualStyle: "reference-verdict-path",
      lockedLayoutAspect: 16 / 9,
      compositionRules: [
        "show one explicit criterion before the fork",
        "reject exactly one route and extend exactly one winning route",
        "winner milestones appear only on their grounded spoken beats",
        "the verdict lands only after the last milestone",
        "preserve the approved preview renderer and 2560:1440 internal ratio without stretching",
      ],
    },
  };
};

export const buildThresholdGauge = (spec: ThresholdGaugeSpec): AtomicSceneGraph => {
  assertText(spec.headline, "headline");
  assertText(spec.mutedHeadline, "mutedHeadline");
  assertText(spec.metricLabel, "metricLabel");
  assertText(spec.unit, "unit");
  if (![spec.startValue, spec.endValue].every(Number.isFinite)) throw new Error("thresholdGauge requires finite startValue and endValue");
  if (spec.thresholds.length < 1 || spec.thresholds.length > 4) throw new Error("thresholdGauge requires 1..4 explicit same-unit thresholds");
  const thresholds = [...spec.thresholds];
  thresholds.forEach((item, index) => {
    assertText(item.label, `thresholds[${index}].label`);
    if (!Number.isFinite(item.value)) throw new Error(`thresholds[${index}].value must be finite`);
    if (!Number.isFinite(item.showAtInFrames) || item.showAtInFrames < 0) throw new Error(`thresholds[${index}].showAtInFrames must be a non-negative frame`);
    if (index > 0 && item.value <= thresholds[index - 1].value) throw new Error("thresholdGauge thresholds must be strictly increasing");
  });
  if (spec.verdicts.length < 2 || spec.verdicts.some((item) => !Number.isFinite(item.minValue) || !item.label.trim())) throw new Error("thresholdGauge requires at least two finite grounded verdict bands");
  const domainMin = spec.domainMin ?? Math.min(spec.startValue, thresholds[0].value);
  const domainMax = spec.domainMax ?? Math.max(spec.endValue, thresholds[thresholds.length - 1].value);
  if (!(domainMax > domainMin)) throw new Error("thresholdGauge domainMax must be greater than domainMin");
  if ([spec.startValue, spec.endValue, ...thresholds.map((item) => item.value)].some((value) => value < domainMin || value > domainMax)) throw new Error("thresholdGauge values and thresholds must stay inside the explicit domain");
  const verdicts = [...spec.verdicts].sort((a, b) => a.minValue - b.minValue);
  for (let index = 1; index < verdicts.length; index += 1) {
    if (verdicts[index].minValue <= verdicts[index - 1].minValue) throw new Error("thresholdGauge verdict bands must be strictly increasing");
  }

  const presentation: AtomicComparisonPresentation = {
    kind: "comparison-threshold-gauge",
    titleLabel: spec.titleLabel ?? "COMPARISON · 越线定级",
    headline: spec.headline,
    mutedHeadline: spec.mutedHeadline,
    metricLabel: spec.metricLabel,
    unit: spec.unit,
    startValue: spec.startValue,
    endValue: spec.endValue,
    domainMin,
    domainMax,
    thresholds,
    verdicts,
    gaugeAtInFrames: spec.gaugeAtInFrames ?? 18,
    valueStartAtInFrames: spec.valueStartAtInFrames ?? 32,
    valueEndAtInFrames: spec.valueEndAtInFrames,
  };
  return {
    schemaVersion: "1.0",
    structureId: "comparison_threshold_gauge",
    topology: "single-metric-threshold-crossing",
    coordinateSpace: "normalized-zone",
    atoms: [],
    presentation,
    metadata: {
      semanticLayer: "informationRelationship",
      semanticPurpose: "comparison",
      sourceComponent: "ComparisonBars",
      visualStyle: "reference-threshold-gauge",
      lockedLayoutAspect: 16 / 9,
      compositionRules: [
        "one observed metric moves across explicit benchmarks in the same unit",
        "threshold labels and verdict bands remain grounded in the source",
        "status color changes only when the observed value crosses a threshold",
        "do not use when threshold crossing triggers an external action or gate",
        "preserve the approved preview renderer and 2560:1440 internal ratio without stretching",
      ],
    },
  };
};

const polar = (cx: number, cy: number, radius: number, angle: number) => {
  const rad = (angle - 90) * Math.PI / 180;
  return {x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad)};
};

const colorForBand = (value: number, thresholds: ThresholdGaugeThreshold[]) => {
  if (value < thresholds[0].value) return RED;
  if (value >= thresholds[thresholds.length - 1].value) return GOLD;
  return CYAN;
};

const statusForValue = (value: number, verdicts: ThresholdGaugeVerdict[]) => {
  let result = verdicts[0];
  for (const verdict of verdicts) if (value >= verdict.minValue) result = verdict;
  return result;
};

const LogicalCanvas: React.FC<{width: number; height: number; ambient: string; children: React.ReactNode}> = ({width, height, ambient, children}) => {
  const scale = Math.min(width / LOGICAL_WIDTH, height / LOGICAL_HEIGHT);
  const scaledWidth = LOGICAL_WIDTH * scale;
  const scaledHeight = LOGICAL_HEIGHT * scale;
  return <div style={{position: "absolute", left: (width - scaledWidth) / 2, top: (height - scaledHeight) / 2, width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT, transformOrigin: "top left", transform: `scale(${scale})`, overflow: "visible", fontFamily: FONT, color: "#F7FAFF"}}>
    <div style={{position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle at 48% 48%, ${ambient}19 0, ${ambient}08 28%, transparent 58%)`}} />
    <div style={{position: "absolute", inset: 0, opacity: 0.16, backgroundImage: "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(circle at center, black, transparent 76%)"}} />
    {children}
  </div>;
};

const VerdictPathView: React.FC<{spec: Extract<AtomicComparisonPresentation, {kind: "comparison-verdict-path"}>; width: number; height: number}> = ({spec, width, height}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const titleIn = enter(frame, 0, fps);
  const routeIn = ease(frame, spec.routeAtInFrames, spec.routeAtInFrames + 20);
  const reject = enter(frame, spec.rejectAtInFrames, fps);
  const winnerIn = enter(frame, spec.winnerAtInFrames, fps);
  const winnerFill = ease(frame, spec.winnerAtInFrames + 29, spec.pathCompleteAtInFrames);
  const verdictIn = enter(frame, spec.verdictAtInFrames, fps);
  const cyanGlow = interpolate(frame, [spec.rejectAtInFrames, spec.verdictAtInFrames + 3], [0.18, 0.62], clamp);
  const pathA = "M 530 704 C 620 704, 630 565, 760 565 L 1535 565";
  const pathB = "M 530 704 C 620 704, 630 838, 760 838 L 2025 838";
  const startX = 1140;
  const endX = 1788;

  return <LogicalCanvas width={width} height={height} ambient={frame < spec.rejectAtInFrames + 6 ? "#64748B" : CYAN}>
    <div style={{position: "absolute", left: 410, top: 222, opacity: titleIn, transform: `translateY(${(1 - titleIn) * 24}px)`}}>
      <div style={{fontSize: 26, color: CYAN, fontWeight: 850, letterSpacing: ".18em"}}>{spec.titleLabel}</div>
      <div style={{marginTop: 22, fontSize: 76, fontWeight: 900, letterSpacing: "-.045em"}}>{spec.headline}</div>
      <div style={{fontSize: 76, fontWeight: 900, letterSpacing: "-.045em", color: "rgba(247,250,255,.40)"}}>{spec.mutedHeadline}</div>
    </div>
    <div style={{position: "absolute", left: 415, top: 600, width: 230, height: 128, opacity: routeIn, transform: `scale(${0.88 + routeIn * 0.12})`}}>
      <div style={{position: "absolute", left: 84, top: 0, fontSize: 20, color: "rgba(231,241,255,.44)", letterSpacing: ".16em", fontWeight: 800}}>{spec.criterionEyebrow}</div>
      <div style={{position: "absolute", left: 79, top: 43, fontSize: 30, fontWeight: 850}}>{spec.criterion}</div>
      <div style={{position: "absolute", left: 105, top: 94, width: 18, height: 18, borderRadius: 999, background: CYAN, boxShadow: `0 0 34px ${CYAN}`}} />
    </div>
    <svg width={LOGICAL_WIDTH} height={LOGICAL_HEIGHT} style={{position: "absolute", inset: 0, overflow: "visible"}}>
      <path d={pathA} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth={5} strokeLinecap="round" />
      <path d={pathA} fill="none" stroke="rgba(203,213,225,.40)" strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - routeIn} />
      <path d={pathB} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth={6} strokeLinecap="round" />
      <path d={pathB} fill="none" stroke={CYAN} strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - winnerFill} style={{filter: `drop-shadow(0 0 ${22 * cyanGlow}px ${CYAN})`}} />
    </svg>
    <div style={{position: "absolute", left: 750, top: 510, opacity: routeIn, transform: `translateX(${(1 - routeIn) * 30}px)`}}>
      <div style={{fontSize: 40, fontWeight: 880, color: `rgba(247,250,255,${0.92 - reject * 0.56})`}}>{spec.losingLabel}</div>
      <div style={{marginTop: 11, fontSize: 24, color: `rgba(231,241,255,${0.48 - reject * 0.26})`}}>{spec.losingDetail}</div>
    </div>
    <div style={{position: "absolute", left: 1483, top: 512, width: 104, height: 104, opacity: reject, transform: `scale(${0.7 + reject * 0.3}) rotate(${(1 - reject) * -12}deg)`}}>
      <div style={{position: "absolute", left: 47, top: 3, width: 10, height: 98, borderRadius: 10, background: RED, transform: "rotate(45deg)", boxShadow: `0 0 24px ${RED}88`}} />
      <div style={{position: "absolute", left: 47, top: 3, width: 10, height: 98, borderRadius: 10, background: RED, transform: "rotate(-45deg)", boxShadow: `0 0 24px ${RED}88`}} />
    </div>
    <div style={{position: "absolute", left: 750, top: 774, opacity: winnerIn, transform: `translateX(${(1 - winnerIn) * 30}px)`}}>
      <div style={{fontSize: 44, fontWeight: 900}}>{spec.winningLabel}</div>
      <div style={{marginTop: 12, fontSize: 24, color: CYAN, fontWeight: 800, letterSpacing: ".08em"}}>{spec.winningDetail}</div>
    </div>
    {spec.milestones.map((item, index) => {
      const p = enter(frame, item.showAtInFrames, fps);
      const x = spec.milestones.length === 3 ? [1140, 1465, 1788][index] : spec.milestones.length === 1 ? (startX + endX) / 2 : interpolate(index, [0, spec.milestones.length - 1], [startX, endX]);
      const final = index === spec.milestones.length - 1 && frame >= spec.verdictAtInFrames;
      return <div key={`${item.label}-${index}`} style={{position: "absolute", left: x, top: 811, width: 150, height: 118, opacity: p, transform: `translateY(${(1 - p) * 22}px)`}}>
        <div style={{position: "absolute", left: 62, top: 14, width: 22, height: 22, borderRadius: 999, background: final ? GOLD : CYAN, border: "5px solid #0A0E16", boxShadow: `0 0 24px ${final ? GOLD : CYAN}`}} />
        <div style={{position: "absolute", left: 0, top: 62, width: 146, textAlign: "center", fontSize: 25, fontWeight: 850, color: "rgba(247,250,255,.82)"}}>{item.label}</div>
      </div>;
    })}
    <div style={{position: "absolute", left: 1974, top: 767, opacity: verdictIn, transform: `translateX(${(1 - verdictIn) * 28}px) scale(${0.9 + verdictIn * 0.1})`}}>
      <div style={{width: 176, height: 176, borderRadius: 999, display: "grid", placeItems: "center", background: `radial-gradient(circle, ${GOLD}33, ${GOLD}0D 62%, transparent 64%)`, border: `3px solid ${GOLD}`, boxShadow: `0 0 52px ${GOLD}42`}}>
        <div style={{textAlign: "center"}}><div style={{fontSize: 22, color: GOLD, letterSpacing: ".12em", fontWeight: 850}}>VERDICT</div><div style={{fontSize: 39, fontWeight: 950, marginTop: 8}}>{spec.verdict}</div></div>
      </div>
    </div>
  </LogicalCanvas>;
};

const ThresholdGaugeView: React.FC<{spec: Extract<AtomicComparisonPresentation, {kind: "comparison-threshold-gauge"}>; width: number; height: number}> = ({spec, width, height}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const titleIn = enter(frame, 0, fps);
  const gaugeIn = enter(frame, spec.gaugeAtInFrames, fps);
  const valueProgress = ease(frame, spec.valueStartAtInFrames, spec.valueEndAtInFrames);
  const value = Math.round(interpolate(valueProgress, [0, 1], [spec.startValue, spec.endValue]));
  const status = statusForValue(value, spec.verdicts);
  const ambient = colorForBand(value, spec.thresholds);
  const cx = 935;
  const cy = 810;
  const radius = 250;
  const circumference = 2 * Math.PI * radius;
  const arcRatio = interpolate(value, [0, spec.domainMax], [0, 1], clamp);
  const railTop = 448;
  const railBottom = 1048;
  const valueToY = (amount: number) => interpolate(amount, [spec.domainMin, spec.domainMax], [railBottom, railTop], clamp);
  const markerY = valueToY(value);
  const reachedThreshold = [...spec.thresholds].reverse().find((item) => value >= item.value);
  const thresholdTag = reachedThreshold ? `>${reachedThreshold.value}${spec.unit}` : `<${spec.thresholds[0].value}${spec.unit}`;

  return <LogicalCanvas width={width} height={height} ambient={ambient}>
    <div style={{position: "absolute", left: 410, top: 215, opacity: titleIn, transform: `translateY(${(1 - titleIn) * 24}px)`}}>
      <div style={{fontSize: 26, color: ambient, fontWeight: 850, letterSpacing: ".18em"}}>{spec.titleLabel}</div>
      <div style={{marginTop: 22, fontSize: 72, fontWeight: 900, letterSpacing: "-.045em"}}>{spec.headline}</div>
      <div style={{fontSize: 72, fontWeight: 900, letterSpacing: "-.045em", color: "rgba(247,250,255,.40)"}}>{spec.mutedHeadline}</div>
    </div>
    <div style={{position: "absolute", left: cx - radius - 56, top: cy - radius - 56, width: (radius + 56) * 2, height: (radius + 56) * 2, opacity: gaugeIn, transform: `scale(${0.88 + gaugeIn * 0.12})`}}>
      <svg width={(radius + 56) * 2} height={(radius + 56) * 2} viewBox={`0 0 ${(radius + 56) * 2} ${(radius + 56) * 2}`}>
        <circle cx={radius + 56} cy={radius + 56} r={radius} fill="rgba(5,9,15,.38)" stroke="rgba(255,255,255,.08)" strokeWidth={28} />
        <circle cx={radius + 56} cy={radius + 56} r={radius} fill="none" stroke={ambient} strokeWidth={28} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - arcRatio)} transform={`rotate(-90 ${radius + 56} ${radius + 56})`} style={{filter: `drop-shadow(0 0 20px ${ambient}88)`}} />
        {spec.thresholds.map((item, index) => {
          const ratio = interpolate(item.value, [0, spec.domainMax], [0, 1], clamp);
          const point = polar(radius + 56, radius + 56, radius, ratio * 360);
          return <circle key={item.value} cx={point.x} cy={point.y} r={index === spec.thresholds.length - 1 ? 9 : 7} fill={index === spec.thresholds.length - 1 ? GOLD : CYAN} stroke="#071018" strokeWidth={4} />;
        })}
      </svg>
      <div style={{position: "absolute", inset: 0, display: "grid", placeItems: "center"}}><div style={{textAlign: "center", transform: "translateY(-3px)"}}>
        <div style={{fontSize: 116, lineHeight: .92, fontWeight: 950, color: ambient, letterSpacing: "-.06em"}}>{value}{spec.unit}</div>
        <div style={{fontSize: 23, color: "rgba(231,241,255,.56)", letterSpacing: ".14em", fontWeight: 800, marginTop: 24}}>{spec.metricLabel}</div>
      </div></div>
    </div>
    <div style={{position: "absolute", left: 1518, top: 410, width: 610, height: 690, opacity: gaugeIn}}>
      <div style={{position: "absolute", left: 48, top: railTop - 410, width: 6, height: railBottom - railTop, borderRadius: 99, background: "rgba(255,255,255,.10)"}} />
      <div style={{position: "absolute", left: 48, top: markerY - 410, width: 6, height: railBottom - markerY, borderRadius: 99, background: ambient, boxShadow: `0 0 24px ${ambient}88`}} />
      {spec.thresholds.map((item, index) => {
        const y = valueToY(item.value) - 410;
        const passed = value >= item.value;
        const thresholdColor = index === spec.thresholds.length - 1 ? GOLD : CYAN;
        const p = enter(frame, item.showAtInFrames, fps);
        return <React.Fragment key={item.value}>
          <div style={{position: "absolute", left: 29, top: y - 3, width: 44, height: 6, borderRadius: 99, background: passed ? thresholdColor : "rgba(255,255,255,.22)", boxShadow: passed ? `0 0 18px ${thresholdColor}77` : undefined, opacity: p}} />
          <div style={{position: "absolute", left: 104, top: y - 34, display: "flex", alignItems: "baseline", gap: 24, opacity: p, color: passed ? "#F7FAFF" : "rgba(231,241,255,.34)"}}>
            <div style={{fontSize: 44, fontWeight: 920, color: passed ? thresholdColor : "rgba(231,241,255,.34)", minWidth: 118}}>&gt;{item.value}{spec.unit}</div>
            <div style={{fontSize: 28, fontWeight: 800, letterSpacing: ".06em"}}>{item.label}</div>
          </div>
        </React.Fragment>;
      })}
      <div style={{position: "absolute", left: 28, top: markerY - 410 - 18, width: 46, height: 46, borderRadius: 999, background: ambient, border: "7px solid #081019", boxSizing: "border-box", boxShadow: `0 0 30px ${ambient}`}} />
      <div style={{position: "absolute", right: 565, top: markerY - 410 - 22, width: 190, padding: "14px 22px", boxSizing: "border-box", borderRadius: 14, background: `${ambient}18`, border: `1px solid ${ambient}66`, color: ambient, fontSize: 25, fontWeight: 900, letterSpacing: ".08em", whiteSpace: "nowrap", textAlign: "center", boxShadow: `0 0 28px ${ambient}18`}}>当前 {value}{spec.unit}</div>
    </div>
    <div style={{position: "absolute", left: 1690, top: 1080, width: 440, opacity: gaugeIn, transform: `translateY(${(1 - gaugeIn) * 18}px)`}}>
      <div style={{fontSize: 23, color: ambient, fontWeight: 850, letterSpacing: ".16em"}}>{thresholdTag} · VERDICT</div>
      <div style={{marginTop: 12, fontSize: 50, fontWeight: 950}}>{status.label}</div>
    </div>
  </LogicalCanvas>;
};

export const ComparisonPresentation: React.FC<{presentation: AtomicComparisonPresentation; width: number; height: number}> = ({presentation, width, height}) => presentation.kind === "comparison-verdict-path"
  ? <VerdictPathView spec={presentation} width={width} height={height} />
  : <ThresholdGaugeView spec={presentation} width={width} height={height} />;
