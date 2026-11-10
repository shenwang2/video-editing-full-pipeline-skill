import {
  buildCarrierStageRoute,
  buildCauseEffectRelationship,
  buildChronologyTimeline,
  buildConditionBoundary,
  buildHierarchyGrouping,
  buildPeerCollection,
  buildProblemSolutionResolution,
  buildProgressiveStateBoard,
  buildStateTransfer,
  buildThresholdGauge,
  buildVerdictPath,
} from './atomic-semantic-foreground-pack';
import type {AtomicSceneGraph} from './atomic-semantic-foreground-pack';
import type {ForegroundEvent} from './types';

export type AtomicVariantDescriptor = {
  id: string;
  label: string;
  mode: string;
  structureId: string;
  topology: string;
};

export const atomicVariantDescriptors: AtomicVariantDescriptor[] = [
  {id: 'editorialRail', label: '步骤 · 编辑轨道', mode: 'sequence', structureId: 'progressive_state_board', topology: 'editorial-rail'},
  {id: 'cumulativeSignals', label: '步骤 · 累积信号', mode: 'sequence', structureId: 'progressive_state_board', topology: 'cumulative-stack'},
  {id: 'peerScan', label: '集合 · 同级扫描', mode: 'collection', structureId: 'peer_collection_grid', topology: 'stable-peer-grid'},
  {id: 'assembleWhole', label: '集合 · 聚合成整体', mode: 'collection', structureId: 'assembled_peer_set', topology: 'inward-assembly'},
  {id: 'verdictPath', label: '比较 · 判定路径', mode: 'comparison-verdict', structureId: 'comparison_verdict_path', topology: 'two-option-verdict-path'},
  {id: 'thresholdGauge', label: '比较 · 阈值仪表', mode: 'comparison-threshold', structureId: 'comparison_threshold_gauge', topology: 'single-metric-threshold-crossing'},
  {id: 'stateTransfer', label: '转化 · 状态迁移', mode: 'transformation', structureId: 'state_transfer', topology: 'board-transfer'},
  {id: 'statePortal', label: '转化 · 状态跃迁', mode: 'transformation', structureId: 'state_transfer', topology: 'portal-transfer'},
  {id: 'datedMilestones', label: '时间 · 历史脊线', mode: 'chronology', structureId: 'chronology_track', topology: 'history-spine'},
  {id: 'pulseTrack', label: '时间 · 到达轨道', mode: 'chronology', structureId: 'chronology_track', topology: 'arrival-track'},
  {id: 'statusStack', label: '因果 · 状态链', mode: 'cause-effect', structureId: 'cause_effect_chain', topology: 'vertical-status-chain'},
  {id: 'outcomeGauge', label: '因果 · 结果仪表', mode: 'cause-effect', structureId: 'cause_effect_chain', topology: 'ledger-outcome-gauge'},
  {id: 'nestedList', label: '层级 · 嵌套列表', mode: 'hierarchy', structureId: 'hierarchy_grouping', topology: 'contained-nested-list'},
  {id: 'tierCards', label: '层级 · 分层卡片', mode: 'hierarchy', structureId: 'hierarchy_grouping', topology: 'tiered-peer-groups'},
  {id: 'semanticRelay', label: '流程 · 语义接力', mode: 'flow-relay', structureId: 'carrier_stage_route', topology: 'compact-linear'},
  {id: 'dispatchReturn', label: '流程 · 派发返回', mode: 'flow-return', structureId: 'dispatch_return_flow', topology: 'dispatch-return'},
  {id: 'transactionLifecycle', label: '流程 · 交易生命周期', mode: 'flow-transaction', structureId: 'transaction_lifecycle', topology: 'compact-linear'},
  {id: 'interventionRail', label: '问题解决 · 介入轨道', mode: 'problem-solution', structureId: 'problem_solution_resolution', topology: 'intervention-rail'},
  {id: 'resolutionStack', label: '问题解决 · 解决堆栈', mode: 'problem-solution', structureId: 'problem_solution_resolution', topology: 'resolution-stack'},
  {id: 'validationLedger', label: '条件 · 校验账本', mode: 'condition', structureId: 'condition_boundary_gate', topology: 'validation-ledger'},
  {id: 'keyRing', label: '条件 · 钥匙环', mode: 'condition', structureId: 'condition_boundary_gate', topology: 'key-ring'},
];

const descriptorByVariant = new Map(atomicVariantDescriptors.map((item) => [item.id, item]));

export const isAtomicSceneEvent = (event: ForegroundEvent) =>
  event.componentId === 'AtomicSceneRenderer' || event.renderingMode === 'atomic-scene';

export const getAtomicVariantDescriptor = (variantId: string) => descriptorByVariant.get(variantId);

export const getAtomicVariantsCompatibleWith = (currentVariantId: string) => {
  const current = descriptorByVariant.get(currentVariantId);
  return current
    ? atomicVariantDescriptors.filter((item) => item.mode === current.mode)
    : atomicVariantDescriptors;
};

export const applyAtomicVariant = (event: ForegroundEvent, variantId: string): ForegroundEvent => {
  if (!isAtomicSceneEvent(event)) return {...event, variantId, elementOverrides: {}};
  const descriptor = descriptorByVariant.get(variantId);
  if (!descriptor) return event;
  return {
    ...event,
    componentId: 'AtomicSceneRenderer',
    rendererComponent: 'AtomicSceneRenderer',
    renderingMode: 'atomic-scene',
    variantId,
    structureId: descriptor.structureId,
    topology: descriptor.topology,
    payload: {...event.payload, visualVariant: variantId === 'transactionLifecycle' ? 'semanticRelay' : variantId},
    elementOverrides: {},
  };
};

const inferredVariantForStructure = (structureId: string) =>
  atomicVariantDescriptors.find((item) => item.structureId === structureId)?.id;

export const buildAtomicSceneGraph = (event: ForegroundEvent): AtomicSceneGraph => {
  const declaredStructure = event.structureId || '';
  const variant = descriptorByVariant.has(event.variantId)
    ? event.variantId
    : typeof event.payload.visualVariant === 'string'
      ? event.payload.visualVariant
      : inferredVariantForStructure(declaredStructure);
  const descriptor = variant ? descriptorByVariant.get(variant) : undefined;
  const structureId = declaredStructure || descriptor?.structureId || '';
  const specVariant = variant === 'transactionLifecycle' ? 'semanticRelay' : variant;
  const spec = specVariant ? {...event.payload, visualVariant: specVariant} : {...event.payload};

  switch (structureId) {
    case 'progressive_state_board':
      return buildProgressiveStateBoard(spec as any);
    case 'peer_collection_grid':
    case 'assembled_peer_set':
      return buildPeerCollection(spec as any);
    case 'comparison_verdict_path':
      return buildVerdictPath(spec as any);
    case 'comparison_threshold_gauge':
      return buildThresholdGauge(spec as any);
    case 'state_transfer':
      return buildStateTransfer(spec as any);
    case 'chronology_track':
      return buildChronologyTimeline(spec as any);
    case 'cause_effect_chain':
      return buildCauseEffectRelationship(spec as any);
    case 'hierarchy_grouping':
      return buildHierarchyGrouping(spec as any);
    case 'carrier_stage_route':
      return buildCarrierStageRoute({...spec, mode: 'generic', visualVariant: 'semanticRelay'} as any);
    case 'transaction_lifecycle':
      return buildCarrierStageRoute({...spec, mode: 'transaction', visualVariant: 'semanticRelay'} as any);
    case 'dispatch_return_flow':
      return buildCarrierStageRoute({...spec, visualVariant: 'dispatchReturn'} as any);
    case 'problem_solution_resolution':
      return buildProblemSolutionResolution(spec as any);
    case 'condition_boundary_gate':
      return buildConditionBoundary(spec as any);
    default:
      throw new Error(`Unsupported atomic structure: ${structureId || '<missing>'}`);
  }
};

export const getAtomicConnectorComponentId = (event: ForegroundEvent): string | undefined => {
  if (!isAtomicSceneEvent(event)) return undefined;
  const structureId = getAtomicVariantDescriptor(event.variantId)?.structureId || event.structureId;
  if (structureId === 'state_transfer') return 'KanbanMove';
  if (structureId === 'cause_effect_chain') return 'CauseEffectChain';
  if (structureId === 'carrier_stage_route' || structureId === 'dispatch_return_flow' || structureId === 'transaction_lifecycle') return 'FlowCarrier';
  if (structureId === 'problem_solution_resolution') return 'ProblemSolutionBridge';
  if (structureId === 'condition_boundary_gate' && event.variantId === 'validationLedger') return 'ConditionGate';
  return undefined;
};

export const createDefaultAtomicPayload = (): Record<string, unknown> => ({
  visualVariant: 'editorialRail',
  visualStyle: 'reference-v3-editorial',
  showLockedFuture: true,
  steps: [
    {id: 'step-1', label: '第一步', icon: 'search', showAtInFrames: 0, completeAtInFrames: 24},
    {id: 'step-2', label: '第二步', icon: 'copy', showAtInFrames: 30, completeAtInFrames: 54},
    {id: 'step-3', label: '第三步', icon: 'check', showAtInFrames: 60, completeAtInFrames: 84},
  ],
});
