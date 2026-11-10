import type {ForegroundPlacement} from "../lib/layout";

export type NormalizedRect = {x: number; y: number; width: number; height: number};
export type NormalizedPoint = {x: number; y: number};
export type AtomicStateTimeline = {revealAtInFrames: number; activeAtInFrames?: number; completeAtInFrames?: number};
export type AtomicPhaseOpacity = {future: number; active: number; complete: number};

type AtomicBase = {id: string; zIndex?: number; revealAtInFrames: number; hideAtInFrames?: number};
export type AtomicNode = AtomicBase & {
  kind: "node";
  bounds: NormalizedRect;
  enterFrom?: NormalizedPoint;
  timeline: AtomicStateTimeline;
  accentColor?: string;
  completeColor?: string;
  appearance?: "glass-card" | "editorial-active-band" | "signal-row" | "collection-tile" | "collection-capsule" | "collection-boundary";
  phaseOpacity?: AtomicPhaseOpacity;
};
export type AtomicText = AtomicBase & {
  kind: "text";
  bounds: NormalizedRect;
  enterFrom?: NormalizedPoint;
  text: string;
  role: "label" | "detail" | "result";
  color?: string;
  timeline?: AtomicStateTimeline;
  appearance?: "default" | "editorial-label" | "editorial-meta" | "signal-label" | "signal-meta" | "flow-title" | "flow-meta" | "flow-direction" | "flow-status" | "collection-label" | "collection-meta" | "collection-group";
  phaseOpacity?: AtomicPhaseOpacity;
};

export type SemanticIconName =
  | "search" | "locate" | "copy" | "send" | "code" | "workflow" | "check"
  | "clock" | "file" | "database" | "user" | "users" | "link" | "chart"
  | "money" | "lock" | "spark" | "settings" | "message" | "play" | "shield"
  | "branch" | "layers" | "gauge" | "star" | "question" | "quote" | "arrow";

export type AtomicIcon = AtomicBase & {
  kind: "icon";
  bounds: NormalizedRect;
  enterFrom?: NormalizedPoint;
  icon: SemanticIconName;
  timeline: AtomicStateTimeline;
  color?: string;
  completeColor?: string;
  appearance?: "default" | "editorial-circle" | "signal-square" | "flow-port-icon" | "collection-badge";
  phaseOpacity?: AtomicPhaseOpacity;
  replaceWithCheckWhenComplete?: boolean;
};
export type AtomicConnector = AtomicBase & {kind: "connector"; from: NormalizedPoint; to: NormalizedPoint; color?: string; appearance?: "curve" | "straight-rail"; showArrow?: boolean};
export type AtomicCarrier = AtomicBase & {
  kind: "carrier";
  start: NormalizedPoint;
  size: {width: number; height: number};
  label: string;
  icon?: SemanticIconName;
  color?: string;
  appearance?: "solid" | "flow-chip";
  segments: Array<{
    to: NormalizedPoint;
    departAtInFrames: number;
    arriveAtInFrames: number;
  }>;
};
export type AtomicProgress = AtomicBase & {kind: "progress"; bounds: NormalizedRect; completeAtInFrames: number; color?: string};
export type AtomicStatus = AtomicBase & {kind: "status"; bounds: NormalizedRect; status: "complete" | "result"; color?: string};
export type AtomicActionCue = AtomicBase & {
  kind: "action-cue";
  bounds: NormalizedRect;
  cue: "search" | "locate" | "copy" | "send" | "complete" | "generic";
  label?: string;
  timeline: AtomicStateTimeline;
  color?: string;
};

export type VerdictPathMilestone = {
  label: string;
  showAtInFrames: number;
};

export type VerdictPathPresentation = {
  kind: "comparison-verdict-path";
  titleLabel: string;
  headline: string;
  mutedHeadline: string;
  criterionEyebrow: string;
  criterion: string;
  losingLabel: string;
  losingDetail: string;
  winningLabel: string;
  winningDetail: string;
  milestones: VerdictPathMilestone[];
  verdict: string;
  routeAtInFrames: number;
  winnerAtInFrames: number;
  rejectAtInFrames: number;
  pathCompleteAtInFrames: number;
  verdictAtInFrames: number;
};

export type ThresholdGaugeThreshold = {
  value: number;
  label: string;
  showAtInFrames: number;
};

export type ThresholdGaugeVerdict = {
  minValue: number;
  label: string;
};

export type ThresholdGaugePresentation = {
  kind: "comparison-threshold-gauge";
  titleLabel: string;
  headline: string;
  mutedHeadline: string;
  metricLabel: string;
  unit: string;
  startValue: number;
  endValue: number;
  domainMin: number;
  domainMax: number;
  thresholds: ThresholdGaugeThreshold[];
  verdicts: ThresholdGaugeVerdict[];
  gaugeAtInFrames: number;
  valueStartAtInFrames: number;
  valueEndAtInFrames: number;
};

export type AtomicComparisonPresentation = VerdictPathPresentation | ThresholdGaugePresentation;

export type StateTransferPresentation = {
  kind: "transformation-state-transfer";
  visualVariant: "stateTransfer" | "statePortal";
  sourceEyebrow: string;
  sourceLabel: string;
  targetEyebrow: string;
  targetLabel: string;
  carrierLabel: string;
  beforeMeta: string;
  afterMeta: string;
  structureAtInFrames: number;
  carrierAtInFrames: number;
  routeAtInFrames: number;
  departAtInFrames: number;
  arriveAtInFrames: number;
  lockAtInFrames: number;
};

export type ChronologyPresentationItem = {
  time: string;
  title: string;
  detail?: string;
  showAtInFrames: number;
};

export type ChronologyPresentation = {
  kind: "chronology-track";
  visualVariant: "datedMilestones" | "pulseTrack";
  items: ChronologyPresentationItem[];
};

export type CauseEffectPresentationNode = {
  label: string;
  title: string;
  detail?: string;
  showAtInFrames: number;
  icon?: SemanticIconName;
};

export type CauseEffectPresentation = {
  kind: "cause-effect-chain";
  visualVariant: "statusStack" | "outcomeGauge";
  cause: CauseEffectPresentationNode;
  mechanisms: CauseEffectPresentationNode[];
  effect: CauseEffectPresentationNode;
  timeRange?: string;
};

export type HierarchyPresentationLeaf = {
  title: string;
  showAtInFrames: number;
  icon?: SemanticIconName;
};

export type HierarchyPresentationChild = {
  label: string;
  title: string;
  showAtInFrames: number;
  icon?: SemanticIconName;
  accentColor?: string;
  leaves?: HierarchyPresentationLeaf[];
};

export type HierarchyPresentation = {
  kind: "hierarchy-grouping";
  visualVariant: "nestedList" | "tierCards";
  rootLabel: string;
  rootTitle: string;
  rootShowAtInFrames: number;
  accentColor: string;
  children: HierarchyPresentationChild[];
};

export type ProblemSolutionPresentationItem = {label: string; showAtInFrames: number; icon?: SemanticIconName};
export type ProblemSolutionPresentationSide = {label: string; title: string; showAtInFrames: number; items: ProblemSolutionPresentationItem[]};
export type ProblemSolutionPresentation = {
  kind: "problem-solution-resolution";
  visualVariant: "interventionRail" | "resolutionStack";
  problem: ProblemSolutionPresentationSide;
  solution: ProblemSolutionPresentationSide;
  actionLabel: string;
  actionShowAtInFrames: number;
};

export type ConditionCriterionPresentation = {
  label: string;
  passed: boolean;
  showAtInFrames: number;
};

export type ConditionBoundaryPresentation = {
  kind: "condition-boundary";
  visualVariant: "validationLedger" | "keyRing";
  inputLabel: string;
  conditions: ConditionCriterionPresentation[];
  passLabel: string;
  blockedLabel: string;
  resultShowAtInFrames: number;
};

export type AtomicRelationshipPresentation = AtomicComparisonPresentation | StateTransferPresentation | ChronologyPresentation | CauseEffectPresentation | HierarchyPresentation | ProblemSolutionPresentation | ConditionBoundaryPresentation;

export type AtomicSceneAtom = AtomicNode | AtomicText | AtomicIcon | AtomicConnector | AtomicCarrier | AtomicProgress | AtomicStatus | AtomicActionCue;
export type AtomicSceneGraph = {
  schemaVersion: "1.0";
  structureId: "progressive_state_board" | string;
  topology: string;
  coordinateSpace: "normalized-zone";
  atoms: AtomicSceneAtom[];
  /** A formally approved relationship grammar rendered by the same runtime as its reviewed preview. */
  presentation?: AtomicRelationshipPresentation;
  metadata: {
    semanticLayer: "informationRelationship" | "memory" | "realObject";
    semanticPurpose: string;
    sourceComponent?: string;
    visualStyle?: "reference-v3-editorial" | string;
    /** Preserve an approved structure's internal proportions inside any host zone. */
    lockedLayoutAspect?: number;
    compositionRules: string[];
  };
};

export type AtomicSceneRendererProps = {
  graph: AtomicSceneGraph;
  placement?: ForegroundPlacement;
  zoneOverride?: import("../lib/layout").Rect;
  accentColor?: string;
  completeColor?: string;
  exitAtInFrames?: number;
  exitInFrames?: number;
};
