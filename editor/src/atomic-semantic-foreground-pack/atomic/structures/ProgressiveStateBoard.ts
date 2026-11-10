import type {AtomicActionCue, AtomicPhaseOpacity, AtomicSceneAtom, AtomicSceneGraph, SemanticIconName} from "../types";

export type ProgressiveStateStep = {
  id?: string;
  label: string;
  detail?: string;
  meta?: string;
  cueLabel?: string;
  icon?: SemanticIconName;
  showAtInFrames: number;
  completeAtInFrames?: number;
};

export type ProgressiveStateBoardSpec = {
  steps: ProgressiveStateStep[];
  resultLabel?: string;
  topology?: "editorial-rail" | "cumulative-stack" | "vertical-stack" | "stepped-rail" | "auto";
  visualVariant?: "editorialRail" | "cumulativeSignals";
  visualStyle?: "reference-v3-editorial" | "reference-cumulative-signals";
  showLockedFuture?: boolean;
  accentColor?: string;
  completeColor?: string;
};

const semanticRules: Array<[RegExp, SemanticIconName]> = [
  [/(搜索|查找|search|find)/i, "search"], [/(找到|定位|locate|target|滑动|scroll)/i, "locate"],
  [/(复制|拷贝|copy)/i, "copy"], [/(交给|发送|提交|send|submit|handoff)/i, "send"],
  [/(代码|命令|code|command|codex)/i, "code"], [/(文件|文档|file|document)/i, "file"],
  [/(数据库|数据|database|data)/i, "database"], [/(配置|设置|configure|setting)/i, "settings"],
  [/(消息|回复|message|reply)/i, "message"], [/(验证|完成|安装|检查|verify|check|install)/i, "check"],
  [/(流程|工作流|flow|workflow)/i, "workflow"],
];

const metaByIcon: Partial<Record<SemanticIconName, string>> = {
  search: "SEARCH", locate: "LOCATE", copy: "COPY", send: "HANDOFF", code: "COMMAND",
  file: "FILE", database: "DATA", settings: "CONFIG", message: "MESSAGE", check: "READY", workflow: "WORKFLOW",
};

export const inferSemanticIcon = (text: string): SemanticIconName => semanticRules.find(([pattern]) => pattern.test(text))?.[1] ?? "arrow";
const cueFor = (icon: SemanticIconName, result = false): AtomicActionCue["cue"] => {
  if (result || icon === "check") return "complete";
  if (icon === "search") return "search";
  if (icon === "locate") return "locate";
  if (icon === "copy" || icon === "code") return "copy";
  if (icon === "send" || icon === "message") return "send";
  return "generic";
};

/**
 * The semantic structure remains generic; the default presentation is the
 * user-approved blind-test V3 editorial rail. Every visible row is still
 * emitted as small node/text/icon/action-cue atoms.
 */
export const buildProgressiveStateBoard = (spec: ProgressiveStateBoardSpec): AtomicSceneGraph => {
  if (spec.steps.length < 2) throw new Error("progressive_state_board requires at least two spoken steps");
  if (spec.steps.length > 6) throw new Error("progressive_state_board supports at most six steps; split the explanation");

  const accent = spec.accentColor ?? "#38F2E6";
  const complete = spec.completeColor ?? accent;
  const visualVariant = spec.visualVariant ?? (spec.visualStyle === "reference-cumulative-signals" ? "cumulativeSignals" : "editorialRail");
  const visualStyle = visualVariant === "cumulativeSignals" ? "reference-cumulative-signals" : "reference-v3-editorial";
  const topology = visualVariant === "cumulativeSignals" ? "cumulative-stack" : "editorial-rail";
  const showLockedFuture = spec.showLockedFuture ?? true;
  const phaseOpacity: AtomicPhaseOpacity = {future: showLockedFuture ? 0.075 : 0, active: 1, complete: 0.34};
  const atoms: AtomicSceneAtom[] = [];

  const lastStep = spec.steps[spec.steps.length - 1];
  const resultAt = lastStep.completeAtInFrames ?? lastStep.showAtInFrames + 24;
  const rows = [
    ...spec.steps.map((step) => ({...step, isResult: false})),
    ...(spec.resultLabel ? [{id: "result", label: spec.resultLabel, icon: "check" as SemanticIconName, meta: "READY", showAtInFrames: resultAt, completeAtInFrames: resultAt + 30, isResult: true}] : []),
  ];

  if (visualVariant === "cumulativeSignals") {
    const cumulativeAtoms: AtomicSceneAtom[] = [];
    const titleSpace = 0.025;
    const bottomPadding = 0.02;
    const usable = 1 - titleSpace - bottomPadding;
    const pitch = usable / rows.length;
    const rowHeight = Math.min(0.13, pitch * 0.72);

    rows.forEach((step, index) => {
      const id = step.id ?? `step-${index + 1}`;
      const nextAt = rows[index + 1]?.showAtInFrames;
      const completeAt = step.completeAtInFrames ?? nextAt ?? step.showAtInFrames + 24;
      const timeline = {revealAtInFrames: step.showAtInFrames, activeAtInFrames: step.showAtInFrames, completeAtInFrames: completeAt};
      const y = titleSpace + index * pitch + Math.max(0, (pitch - rowHeight) / 2);
      const icon = step.icon ?? inferSemanticIcon(`${step.label} ${step.detail ?? ""}`);
      const phaseOpacity: AtomicPhaseOpacity = {future: 0, active: 1, complete: 0.66};

      cumulativeAtoms.push({
        id: `${id}-row`, kind: "node", bounds: {x: 0.012, y, width: 0.95, height: rowHeight}, timeline,
        revealAtInFrames: step.showAtInFrames, appearance: "signal-row", phaseOpacity,
        accentColor: accent, completeColor: complete, zIndex: 1,
      });
      cumulativeAtoms.push({
        id: `${id}-icon`, kind: "icon", bounds: {x: 0.035, y: y + rowHeight * 0.23, width: 0.07, height: rowHeight * 0.54},
        icon, timeline, revealAtInFrames: step.showAtInFrames, appearance: "signal-square", phaseOpacity,
        color: accent, completeColor: complete, zIndex: 4,
      });
      cumulativeAtoms.push({
        id: `${id}-label`, kind: "text", role: step.isResult ? "result" : "label", text: step.label,
        bounds: {x: 0.132, y: y + rowHeight * 0.12, width: 0.68, height: rowHeight * 0.45},
        revealAtInFrames: step.showAtInFrames, timeline, appearance: "signal-label", phaseOpacity, zIndex: 5,
      });
      cumulativeAtoms.push({
        id: `${id}-meta`, kind: "text", role: "detail", text: `${String(index + 1).padStart(2, "0")}  ${step.meta ?? metaByIcon[icon] ?? "NEXT"}`,
        bounds: {x: 0.133, y: y + rowHeight * 0.61, width: 0.57, height: rowHeight * 0.2},
        revealAtInFrames: step.showAtInFrames, timeline, appearance: "signal-meta", phaseOpacity, color: accent, zIndex: 5,
      });
      cumulativeAtoms.push({
        id: `${id}-progress`, kind: "progress", bounds: {x: 0.81, y: y + rowHeight * 0.48, width: 0.115, height: Math.max(0.006, rowHeight * 0.035)},
        revealAtInFrames: step.showAtInFrames, completeAtInFrames: completeAt, color: accent, zIndex: 4,
      });
    });

    return {
      schemaVersion: "1.0",
      structureId: "progressive_state_board",
      topology,
      coordinateSpace: "normalized-zone",
      atoms: cumulativeAtoms,
      metadata: {
        semanticLayer: "informationRelationship",
        semanticPurpose: "sequence",
        sourceComponent: "FormFillSequence",
        visualStyle,
        compositionRules: [
          "reference cumulative signal list is the approved second sequence expression",
          "rows append only on their spoken beats and never reserve future slots",
          "completed rows remain readable while the current row keeps the strongest edge",
          "semantic icons persist instead of becoming generic completion marks",
          "each row owns a small time-grounded progress trace rather than a large action motif",
          "no enclosing panel surface",
        ],
      },
    };
  }

  const titleSpace = 0.025;
  const bottomPadding = 0.025;
  const usable = 1 - titleSpace - bottomPadding;
  const pitch = usable / rows.length;
  const rowHeight = Math.min(0.126, pitch * 0.78);

  rows.forEach((step, index) => {
    const id = step.id ?? `step-${index + 1}`;
    const nextAt = rows[index + 1]?.showAtInFrames;
    const completeAt = step.completeAtInFrames ?? nextAt ?? step.showAtInFrames + 24;
    const timeline = {revealAtInFrames: step.showAtInFrames, activeAtInFrames: step.showAtInFrames, completeAtInFrames: completeAt};
    const y = titleSpace + index * pitch + Math.max(0, (pitch - rowHeight) / 2);
    const icon = step.icon ?? inferSemanticIcon(`${step.label} ${step.detail ?? ""}`);
    const rowBounds = {x: 0.01, y, width: 0.965, height: rowHeight};
    const iconHeight = rowHeight * 0.48;
    const labelTop = y + rowHeight * 0.11;
    const metaTop = y + rowHeight * 0.61;

    atoms.push({
      id: `${id}-active-band`, kind: "node", bounds: rowBounds, timeline,
      revealAtInFrames: step.showAtInFrames, appearance: "editorial-active-band",
      phaseOpacity: {future: 0, active: 1, complete: 0}, accentColor: accent, completeColor: complete, zIndex: 1,
    });
    atoms.push({
      id: `${id}-icon`, kind: "icon", bounds: {x: 0.034, y: y + (rowHeight - iconHeight) / 2, width: 0.062, height: iconHeight},
      icon, timeline, revealAtInFrames: 0, appearance: "editorial-circle", phaseOpacity,
      replaceWithCheckWhenComplete: true, color: accent, completeColor: complete, zIndex: 4,
    });
    atoms.push({
      id: `${id}-label`, kind: "text", role: step.isResult ? "result" : "label", text: step.label,
      bounds: {x: 0.12, y: labelTop, width: 0.44, height: rowHeight * 0.42}, revealAtInFrames: 0,
      timeline, appearance: "editorial-label", phaseOpacity, zIndex: 5,
    });
    atoms.push({
      id: `${id}-meta`, kind: "text", role: "detail", text: `${String(index + 1).padStart(2, "0")}  ${step.meta ?? metaByIcon[icon] ?? "NEXT"}`,
      bounds: {x: 0.121, y: metaTop, width: 0.43, height: rowHeight * 0.2}, revealAtInFrames: 0,
      timeline, appearance: "editorial-meta", phaseOpacity, color: accent, zIndex: 5,
    });
    atoms.push({
      id: `${id}-cue`, kind: "action-cue", bounds: {x: 0.62, y: y + rowHeight * 0.13, width: 0.32, height: rowHeight * 0.72},
      cue: cueFor(icon, step.isResult), label: step.cueLabel ?? step.label, timeline,
      revealAtInFrames: step.showAtInFrames, color: accent, zIndex: 6,
    });
  });

  return {
    schemaVersion: "1.0",
    structureId: "progressive_state_board",
    topology,
    coordinateSpace: "normalized-zone",
    atoms,
    metadata: {
      semanticLayer: "informationRelationship",
      semanticPurpose: "sequence",
      sourceComponent: "FormFillSequence",
      visualStyle,
      compositionRules: [
        "blind-test V3 editorial rail is the approved default presentation",
        "one active row expands into a dark editorial band",
        "prior states persist and dim",
        "future rows may appear only as low-opacity locked previews",
        "the active action cue is semantic and disappears at handoff",
        "no enclosing panel surface",
      ],
    },
  };
};
