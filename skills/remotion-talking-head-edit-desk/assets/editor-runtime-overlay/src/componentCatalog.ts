import atomicContract from './atomic-component-contract.json';
import legacyContract from './legacy-component-contract.json';
import {SECTION_TITLE_DEFAULT_VARIANT, SECTION_TITLE_VARIANTS} from './legacy-semantic-foreground-pack/SectionTitleContract';
import type {ComponentStyleMode, ForegroundEvent} from './types';
import {createEmptyGraphicScene} from './graphicSceneModel';
import {atomicVariantDescriptors, createDefaultAtomicPayload, getAtomicVariantsCompatibleWith} from './atomicSceneModel';

type SemanticLayer = ForegroundEvent['semanticLayer'];

export const roomLightColorOptions = [
  {name: '粉红', hex: '#FF5CCB', rgb: '255,92,203'},
  {name: '浅紫', hex: '#C55BFF', rgb: '197,91,255'},
  {name: '青蓝', hex: '#24E5EE', rgb: '36,229,238'},
  {name: '荧光绿', hex: '#D8FF3F', rgb: '216,255,63'},
  {name: '亮红', hex: '#FF4D55', rgb: '255,77,85'},
  {name: '深紫', hex: '#8D42FF', rgb: '141,66,255'},
  {name: '电光蓝', hex: '#3D5BFF', rgb: '61,91,255'},
] as const;

export const originalSkillColorOptions = [
  {name: '暖科技·主', source: 'warmTech.accent', hex: '#F6C344', rgb: '246,195,68'},
  {name: '暖科技·辅', source: 'warmTech.secondary', hex: '#31C7B5', rgb: '49,199,181'},
  {name: '暖科技·警', source: 'warmTech.danger', hex: '#FF6B57', rgb: '255,107,87'},
  {name: '琥珀·主', source: 'editorialAmber.accent', hex: '#FFB22C', rgb: '255,178,44'},
  {name: '琥珀·辅', source: 'editorialAmber.secondary', hex: '#D95F3D', rgb: '217,95,61'},
  {name: '琥珀·警', source: 'editorialAmber.danger', hex: '#E2493D', rgb: '226,73,61'},
  {name: '玉墨·主', source: 'jadeInk.accent', hex: '#74D6B1', rgb: '116,214,177'},
  {name: '玉墨·辅', source: 'jadeInk.secondary', hex: '#F2C14E', rgb: '242,193,78'},
  {name: '玉墨·警', source: 'jadeInk.danger', hex: '#FF7866', rgb: '255,120,102'},
  {name: '珊瑚夜·主', source: 'coralNight.accent', hex: '#FF846D', rgb: '255,132,109'},
  {name: '珊瑚夜·辅', source: 'coralNight.secondary', hex: '#5AC8C8', rgb: '90,200,200'},
  {name: '珊瑚夜·警', source: 'coralNight.danger', hex: '#FF4F61', rgb: '255,79,97'},
] as const;

export const componentAccentColorOptions = [
  ...roomLightColorOptions,
  ...originalSkillColorOptions,
] as const;

const layerByComponent: Record<string, SemanticLayer> = {
  MediaFrame: 'realObject',
  CalloutSpotlight: 'realObject',
  BRollStack: 'realObject',
  LogoWall: 'informationRelationship',
  ComparisonBars: 'informationRelationship',
  ConceptComparisonCards: 'informationRelationship',
  KanbanMove: 'informationRelationship',
  FormFillSequence: 'informationRelationship',
  ChronologyTrack: 'informationRelationship',
  CauseEffectChain: 'informationRelationship',
  HierarchyTree: 'informationRelationship',
  FlowCarrier: 'informationRelationship',
  ProblemSolutionBridge: 'informationRelationship',
  ConditionGate: 'informationRelationship',
  FeedbackLoop: 'informationRelationship',
  QuadrantMatrix: 'informationRelationship',
  ImpactToken: 'memory',
  InsightFocus: 'memory',
  QuestionTension: 'memory',
  WarningBoundary: 'memory',
  DefinitionReveal: 'memory',
  ResultLock: 'memory',
  VerdictStamp: 'memory',
  QuoteFrame: 'memory',
};

const labels: Record<string, string> = {
  MediaFrame: '真实素材展示',
  CalloutSpotlight: '局部聚焦标注',
  BRollStack: '多证据轮播',
  LogoWall: '并列集合',
  ComparisonBars: '数字对比',
  ConceptComparisonCards: '概念对比',
  KanbanMove: '状态转化',
  FormFillSequence: '步骤序列',
  ChronologyTrack: '时间发展',
  CauseEffectChain: '因果关系',
  HierarchyTree: '层级结构',
  FlowCarrier: '流程传递',
  ProblemSolutionBridge: '问题解决',
  ConditionGate: '条件门槛',
  FeedbackLoop: '反馈循环',
  QuadrantMatrix: '二维矩阵',
  ImpactToken: '关键词/数字',
  InsightFocus: '核心观点',
  QuestionTension: '问题悬念',
  WarningBoundary: '风险警告',
  DefinitionReveal: '概念定义',
  ResultLock: '状态结果',
  VerdictStamp: '结论盖章',
  QuoteFrame: '引用原话',
};

const defaults: Record<string, Record<string, unknown>> = {
  MediaFrame: {title: '真实素材', caption: '替换为项目素材', fit: 'contain', presentationScale: 'large'},
  CalloutSpotlight: {title: '重点区域', subtitle: '把注意力放到这里', target: {x: 0.55, y: 0.35, width: 0.22, height: 0.18}},
  BRollStack: {title: '真实证据', kicker: 'PROOF', caption: '多张素材依次出现'},
  LogoWall: {title: '并列信息', eyebrow: 'COLLECTION', columns: 2, items: [{name: '信息一', glyph: '1', showAtMs: 0}, {name: '信息二', glyph: '2', showAtMs: 450}, {name: '信息三', glyph: '3', showAtMs: 900}]},
  ComparisonBars: {seriesLabels: ['之前', '之后'], rows: [{label: '结果', before: 35, after: 82, beforeText: '35', afterText: '82', showAtMs: 0}]},
  ConceptComparisonCards: {title: '两种方式', eyebrow: 'COMPARE', sides: [{label: '方式A', title: '原来的做法', items: [{text: '特点一', showAtMs: 0}]}, {label: '方式B', title: '新的做法', items: [{text: '特点二', showAtMs: 550}]}]},
  KanbanMove: {states: ['原状态', '新状态'], cards: [{title: '核心对象', from: 0, to: 1, showAtMs: 0, moveAtMs: 900}]},
  FormFillSequence: {title: '执行步骤', titleEmphasis: '步骤', eyebrow: 'PROGRESS ROUTE', layoutMode: 'progressiveStack', steps: [{label: '第一步', detail: '先处理输入', meta: 'INPUT / PREPARE', icon: 'workflow', showAtMs: 0, completeAtMs: 500}, {label: '第二步', detail: '再生成结果', meta: 'OUTPUT / READY', icon: 'check', showAtMs: 650, completeAtMs: 1200}]},
  ChronologyTrack: {items: [{time: '现在', title: '开始', showAtMs: 0}, {time: '随后', title: '发展', showAtMs: 600}, {time: '最终', title: '结果', showAtMs: 1200}]},
  CauseEffectChain: {cause: {label: '原因', title: '输入变化', showAtMs: 0}, mechanism: {label: '机制', title: '中间作用', showAtMs: 550}, effect: {label: '结果', title: '输出改变', showAtMs: 1100}},
  HierarchyTree: {rootTitle: '一个整体', rootLabel: 'ROOT', rootShowAtMs: 0, children: [{title: '部分一', showAtMs: 450}, {title: '部分二', showAtMs: 750}, {title: '部分三', showAtMs: 1050}]},
  FlowCarrier: {carrierLabel: '信息', stages: [{label: '输入', showAtMs: 0}, {label: '处理', showAtMs: 650}, {label: '输出', showAtMs: 1300}]},
  ProblemSolutionBridge: {problem: {eyebrow: '问题', title: '当前困难'}, solution: {eyebrow: '解决', title: '目标状态'}, actionLabel: '采取行动', actionShowAtMs: 650, solutionShowAtMs: 1250},
  ConditionGate: {inputLabel: '输入', conditions: [{label: '条件一', passed: true, showAtMs: 0}, {label: '条件二', passed: true, showAtMs: 500}], passLabel: '允许通过', resultShowAtMs: 1050},
  FeedbackLoop: {centerLabel: '持续优化', direction: 'cw', stages: [{label: '执行', showAtMs: 0}, {label: '反馈', showAtMs: 500}, {label: '调整', showAtMs: 1000}, {label: '再执行', showAtMs: 1500}]},
  QuadrantMatrix: {xAxisLabel: '维度一', yAxisLabel: '维度二', quadrants: [{title: '区域一'}, {title: '区域二'}, {title: '区域三'}, {title: '区域四'}], items: [{label: '对象', x: 0.7, y: 0.65, showAtMs: 900}]},
  ImpactToken: {text: '重点', value: 100, unit: '%', eyebrow: 'KEY POINT'},
  InsightFocus: {setup: '真正重要的是', headline: '核心观点', highlight: '核心', payoff: '让观众记住这一句'},
  QuestionTension: {setup: '但问题来了', question: '为什么会这样？', highlight: '为什么'},
  WarningBoundary: {eyebrow: '注意', lead: '这里不能忽略', warning: '核心风险'},
  DefinitionReveal: {term: '新概念', definition: '这句话解释它真正代表什么', definitionAtMs: 550},
  ResultLock: {statusLabel: '当前状态', pendingText: '正在处理', resultText: '结果确认', resultAtMs: 900},
  VerdictStamp: {setup: '所以最终结论是', verdict: '值得去做', stampText: '确定', verdictAtMs: 450, stampAtMs: 850},
  QuoteFrame: {quote: '保留一段值得记住的原话', attribution: '口播原文', attributionAtMs: 800},
};

type ContractComponent = {
  defaultVariant?: string | null;
  variants?: Record<string, {label?: string; mode?: string}>;
};
type ComponentCatalogItem = {
  id: string;
  label: string;
  semanticLayer: SemanticLayer;
  defaultVariant: string;
  variants: Array<{id: string; label: string; mode?: string}>;
};

const buildApprovedComponentCatalog = (contract: unknown): ComponentCatalogItem[] => {
  const components = (contract as {components: Record<string, ContractComponent>}).components;
  return Object.entries(components).filter(([id, item]) => id !== 'AtomicSceneRenderer' && item.defaultVariant && item.variants).map(([id, item]) => ({
  id,
  label: labels[id] || id,
  semanticLayer: layerByComponent[id] || 'memory',
  defaultVariant: item.defaultVariant as string,
  variants: Object.entries(item.variants as Record<string, {label?: string; mode?: string}>).map(([variantId, variant]) => ({
    id: variantId,
    label: variant.label || variantId,
    mode: variant.mode,
  })),
  }));
};

const approvedAtomicComponentCatalog = buildApprovedComponentCatalog(atomicContract);
const approvedLegacyComponentCatalog = buildApprovedComponentCatalog(legacyContract);

// Classic title choices are owned upstream, outside the 24 semantic slots.
export const sectionTitleComponent: ComponentCatalogItem = {
  id: 'SectionTitle',
  label: '章节标题',
  semanticLayer: 'title',
  defaultVariant: SECTION_TITLE_DEFAULT_VARIANT,
  variants: SECTION_TITLE_VARIANTS,
};
const atomicSectionTitleComponent: ComponentCatalogItem = {
  ...sectionTitleComponent, defaultVariant: 'standard',
  variants: [{id: 'standard', label: '统一左上标题', mode: undefined}],
};

export const atomicSceneComponent = {
  id: 'AtomicSceneRenderer',
  label: '原子场景 · 可编辑结构',
  semanticLayer: 'informationRelationship' as SemanticLayer,
  defaultVariant: 'editorialRail',
  variants: atomicVariantDescriptors.map(({id, label, mode}) => ({id, label, mode})),
};

export const referenceGrammarComponent = {
  id: 'ReferenceGrammarScene',
  label: '实验 · 参考语法场景',
  semanticLayer: 'informationRelationship' as SemanticLayer,
  defaultVariant: 'installStateBoard',
  variants: [
    {id: 'installStateBoard', label: '状态演进 · 部署轨道', mode: undefined},
    {id: 'apiWarningLock', label: '强调 · API 配置锁', mode: undefined},
    {id: 'runningHubEditorial', label: '收束 · 工作流说明', mode: undefined},
  ],
};

export const referenceGrammarV3Component = {
  id: 'ReferenceGrammarSceneV3',
  label: '实验 · 参考语法场景 v3（收敛版）',
  semanticLayer: 'informationRelationship' as SemanticLayer,
  defaultVariant: 'installStateBoard',
  variants: [
    {id: 'installStateBoard', label: '状态演进 · 局部状态栈', mode: undefined},
    {id: 'apiWarningLock', label: '强调 · 局部 API 检查', mode: undefined},
    {id: 'runningHubEditorial', label: '收束 · 紧凑说明栈', mode: undefined},
  ],
};

export const referenceGrammarBatchV1Component = {
  id: 'ReferenceGrammarBatchV1',
  label: '实验 · 参考语法批量盲测 v1',
  semanticLayer: 'informationRelationship' as SemanticLayer,
  defaultVariant: 'operatorScene',
  variants: [
    {id: 'operatorScene', label: '算子驱动 · 通用场景', mode: undefined},
    {id: 'safeFallback', label: '严格拒绝 · 安全退化', mode: undefined},
  ],
};

const experimentalComponents = [referenceGrammarComponent, referenceGrammarV3Component, referenceGrammarBatchV1Component];

export const getComponentCatalog = (mode: ComponentStyleMode): ComponentCatalogItem[] => [
  atomicSceneComponent,
  ...(mode === 'legacy' ? approvedLegacyComponentCatalog : approvedAtomicComponentCatalog),
  ...experimentalComponents,
];

export const componentCatalog = getComponentCatalog('atomic');

// Pilot capability is discoverable only for a project already using it.
// It is deliberately not added to the approved component-contract.json.
export const graphicSceneComponent = {
  id: 'GraphicScene', label: '实验 · 自由图形场景', semanticLayer: 'informationRelationship' as SemanticLayer,
  defaultVariant: 'freeformV1', variants: [{id: 'freeformV1', label: '对象与动作编排', mode: undefined}],
};
export const getComponent = (id: string, mode: ComponentStyleMode = 'atomic') =>
  id === sectionTitleComponent.id
    ? mode === 'legacy' ? sectionTitleComponent : atomicSectionTitleComponent
    : id === graphicSceneComponent.id
      ? graphicSceneComponent
      : getComponentCatalog(mode).find((item) => item.id === id);

export const getCompatibleVariants = (id: string, currentVariantId: string, mode: ComponentStyleMode = 'atomic') => {
  if (id === 'AtomicSceneRenderer') return getAtomicVariantsCompatibleWith(currentVariantId);
  const component = getComponent(id, mode);
  if (!component) return [];
  if ((id === 'FormFillSequence' && currentVariantId === 'trialContentToShots') ||
      (id === 'InsightFocus' && currentVariantId === 'trialProcessHeading')) {
    return [{id: currentVariantId, label: '试验 · 内容到镜头的连续过程', mode: undefined}, ...component.variants];
  }
  if ((id === 'HierarchyTree' && currentVariantId === 'trialReferenceClassification') ||
      (id === 'ConceptComparisonCards' && currentVariantId === 'trialReferenceBranches') ||
      (id === 'InsightFocus' && currentVariantId === 'trialReferenceHeading')) {
    return [{id: currentVariantId, label: '试验 · 第一张参考样稿', mode: undefined}, ...component.variants];
  }
  const currentVariant = component.variants.find((variant) => variant.id === currentVariantId);
  const currentMode = currentVariant?.mode;
  const compatible = currentMode
    ? component.variants.filter((variant) => variant.mode === currentMode)
    : component.variants;
  return currentVariant
    ? compatible
    : [{id: currentVariantId, label: '当前项目变体', mode: undefined}, ...compatible];
};

export const defaultPayloadFor = (id: string): Record<string, unknown> =>
  id === 'SectionTitle'
    ? {headline: '章节标题', setup: 'SECTION', sectionIndex: '', chineseFontSize: 38}
    : id === 'GraphicScene'
    ? {graphicScene: createEmptyGraphicScene()}
    : id === 'AtomicSceneRenderer'
      ? createDefaultAtomicPayload()
    : id === 'ReferenceGrammarBatchV1'
      ? {operatorId: 'progressive_state_board', rendererVersion: 'reference-grammar-batch-v1', steps: []}
    : id === 'ReferenceGrammarSceneV3'
      ? {operatorId: 'progressive_state_board', rendererVersion: 'reference-grammar-v3'}
    : id === 'ReferenceGrammarScene'
      ? {operatorId: 'progressive_state_board', rendererVersion: 'reference-grammar-v2'}
      : structuredClone(defaults[id] || {text: labels[id] || id});
