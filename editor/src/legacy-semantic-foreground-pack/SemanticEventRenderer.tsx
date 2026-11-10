import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {getMasterAlignmentTokens} from './lib/layout';
import {getSectionTitleLayout} from './lib/section-title-layout';
import {normalizeSectionTitleData} from './SectionTitleContract';
import {BRollStack as BRollStackComponent} from "./real-object/BRollStack";
import {CalloutSpotlight as CalloutSpotlightComponent} from "./real-object/CalloutSpotlight";
import {CauseEffectChain as CauseEffectChainComponent} from "./information-relationship/CauseEffectChain";
import {ChronologyTrack as ChronologyTrackComponent} from "./information-relationship/ChronologyTrack";
import {ComparisonBars as ComparisonBarsComponent} from "./information-relationship/ComparisonBars";
import {ConceptComparisonCards as ConceptComparisonCardsComponent} from "./information-relationship/ConceptComparisonCards";
import {ConditionGate as ConditionGateComponent} from "./information-relationship/ConditionGate";
import {DefinitionReveal as DefinitionRevealComponent} from "./memory/DefinitionReveal";
import {FeedbackLoop as FeedbackLoopComponent} from "./information-relationship/FeedbackLoop";
import {FlowCarrier as FlowCarrierComponent} from "./information-relationship/FlowCarrier";
import {FormFillSequence as FormFillSequenceComponent} from "./information-relationship/FormFillSequence";
import {HierarchyTree as HierarchyTreeComponent} from "./information-relationship/HierarchyTree";
import {ImpactToken as ImpactTokenComponent} from "./memory/ImpactToken";
import {InsightFocus as InsightFocusComponent} from "./memory/InsightFocus";
import {KanbanMove as KanbanMoveComponent} from "./information-relationship/KanbanMove";
import {LogoWall as LogoWallComponent} from "./information-relationship/LogoWall";
import {MediaFrame as MediaFrameComponent} from "./real-object/MediaFrame";
import {ProblemSolutionBridge as ProblemSolutionBridgeComponent} from "./information-relationship/ProblemSolutionBridge";
import {QuadrantMatrix as QuadrantMatrixComponent} from "./information-relationship/QuadrantMatrix";
import {QuestionTension as QuestionTensionComponent} from "./memory/QuestionTension";
import {QuoteFrame as QuoteFrameComponent} from "./memory/QuoteFrame";
import {ResultLock as ResultLockComponent} from "./memory/ResultLock";
import {VerdictStamp as VerdictStampComponent} from "./memory/VerdictStamp";
import {WarningBoundary as WarningBoundaryComponent} from "./memory/WarningBoundary";

/** Portable project-data adapter; all classic render defaults remain upstream. */
export type SemanticForegroundEvent = {
  componentId: string; variantId: string; semanticLayer?: string; anchorText?: string;
  placement: {preset: string}; payload: Record<string, any>;
  style?: {accentColor?: string}; assetIds?: string[];
};
type ForegroundEvent = SemanticForegroundEvent;
export type SemanticEventAsset = {
  id: string; path: string; status: string; label?: string; width?: number; height?: number;
};
type EditAsset = SemanticEventAsset;

type PackPlacement = 'leftMiddle' | 'rightMiddle' | 'leftLowerSafe' | 'rightLowerSafe' | 'upperCenterSafe' | 'centerSafe';

const supportedPlacement = (value: string): PackPlacement => {
  const known = new Set(['leftMiddle', 'rightMiddle', 'leftLowerSafe', 'rightLowerSafe', 'upperCenterSafe', 'centerSafe']);
  if (known.has(value)) return value as PackPlacement;
  const aliases: Record<string, PackPlacement> = {
    'top-left': 'leftMiddle',
    'top-center': 'upperCenterSafe',
    'top-right': 'rightMiddle',
    'middle-left': 'leftMiddle',
    'middle-center': 'centerSafe',
    'middle-right': 'rightMiddle',
    'bottom-left': 'leftLowerSafe',
    'bottom-center': 'centerSafe',
    'bottom-right': 'rightLowerSafe',
    'full-frame': 'centerSafe',
    fullscreen: 'centerSafe',
    centerTakeover: 'centerSafe',
    fullWidthUpper: 'upperCenterSafe',
    splitLeftRight: 'centerSafe',
  };
  return aliases[value] || 'centerSafe';
};

const encodeAssetPath = (baseUrl: string, asset: EditAsset) =>
  `${baseUrl}${asset.path.split('/').map(encodeURIComponent).join('/')}`;

const GenericEvent: React.FC<{event: ForegroundEvent}> = ({event}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, width, height} = useVideoConfig();
  const enter = interpolate(frame, [0, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const payload = event.payload as Record<string, unknown>;
  const label = String(payload.headline || payload.text || event.componentId);
  const accentColor = typeof event.style?.accentColor === 'string' ? event.style.accentColor : '#ffb84a';
  const alignment = getMasterAlignmentTokens({width, height});
  const left = event.placement.preset.startsWith('right') ? width * 0.58 : alignment.sectionTitleLeft;
  const top = event.placement.preset.includes('Lower') ? height * 0.57 : height * 0.28;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left, top, maxWidth: width * 0.34, padding: `${height * 0.018}px ${width * 0.018}px`, borderRadius: width * 0.012, color: '#fffaf0', background: 'rgba(9, 12, 18, 0.72)', border: `1px solid ${accentColor}85`, boxShadow: '0 18px 50px rgba(0,0,0,.34)', fontFamily: 'Microsoft YaHei, Segoe UI, sans-serif', fontSize: Math.max(30, width * 0.032), fontWeight: 900, opacity: enter, translate: `0 ${(1 - enter) * 20}px`}}>
        {label}
        <div style={{marginTop: 10, fontSize: Math.max(16, width * 0.012), color: accentColor}}>{event.componentId} · {event.variantId} · {durationInFrames}帧</div>
      </div>
    </AbsoluteFill>
  );
};

export const SectionTitleEvent: React.FC<{event: ForegroundEvent}> = ({event}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, width, height, fps} = useVideoConfig();
  const titleData = normalizeSectionTitleData(event);
  const p = titleData.payload as Record<string, unknown>;
  const layout = getSectionTitleLayout({width, height, variantId: titleData.variantId, payload: {...p, headline: p.headline || event.anchorText || '本段重点'}});
  const {u} = layout;
  const enter = interpolate(frame, [0, 9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exit = interpolate(frame, [Math.max(0, durationInFrames - 10), durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const headline = String(p.headline || event.anchorText || '本段重点');
  const setup = typeof p.setup === 'string' ? p.setup : '';
  const accentColor = typeof event.style?.accentColor === 'string' ? event.style.accentColor : typeof p.accentColor === 'string' ? p.accentColor : '#FFB84A';

  // V2 is the new-project default; standard remains an explicit selectable variant.
  if (titleData.variantId === 'referenceV2') {
    const color = typeof event.style?.accentColor === 'string' ? event.style.accentColor : '#38F2E6';
    const progress = Math.min(1, Math.max(0, frame / Math.max(1, 0.33 * fps)));
    const headerOpacity = (1 - Math.pow(1 - progress, 3)) * exit;
    return (
      <AbsoluteFill style={{pointerEvents: 'none', zIndex: 100}}>
        <div data-section-title-treatment="reference-v2" style={{position: 'absolute', left: layout.bounds.x, top: layout.bounds.y, width: layout.bounds.width, height: layout.bounds.height, opacity: headerOpacity, fontFamily: 'Microsoft YaHei, Segoe UI, Arial, sans-serif', filter: `drop-shadow(0 ${3 * u}px ${9 * u}px rgba(0,0,0,.62))`}}>
          <div style={{display: 'flex', alignItems: 'center', height: 17 * u, gap: 14 * u, color, fontSize: 17 * u, lineHeight: 1, fontWeight: 800, letterSpacing: 5.2 * u}}>
            <span style={{width: 36 * u, height: 4 * u, flexShrink: 0, background: color, boxShadow: `0 0 ${16 * u}px ${color}99`}} />
            <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{setup || 'SECTION'}</span>
            <span style={{marginLeft: 'auto', whiteSpace: 'nowrap', color: 'rgba(255,255,255,.34)', letterSpacing: 2.5 * u}}>{typeof p.sectionIndex === 'string' ? p.sectionIndex : ''}</span>
          </div>
          <div style={{marginTop: 15 * u, color: '#F7FBFF', fontSize: layout.fontSize, lineHeight: 1.08, fontWeight: 880, letterSpacing: -0.8 * u}}>{layout.headlineLines.map((line, i) => <div key={i} style={{height: layout.lineHeight, whiteSpace: 'nowrap'}}>{line}</div>)}</div>
          <div style={{marginTop: 16 * u, height: u, background: `linear-gradient(90deg, ${color}99, rgba(255,255,255,.16) 58%, transparent)`}} />
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{pointerEvents: 'none', zIndex: 100}}>
      <div data-section-title-treatment="standard"
        style={{
          position: 'absolute',
          left: layout.bounds.x,
          top: layout.bounds.y,
          width: layout.bounds.width,
          height: layout.bounds.height,
          opacity: enter * exit,
          transform: `translateX(${(1 - enter) * -22 * u}px)`,
          fontFamily: 'Microsoft YaHei, Segoe UI, sans-serif',
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.42))',
        }}
      >
        <div
          style={{
            width: 82 * u,
            height: 6 * u,
            marginBottom: 15 * u,
            borderRadius: 999,
            background: accentColor,
            boxShadow: `0 0 ${14 * u}px ${accentColor}88`,
          }}
        />
        <div
          style={{
            color: '#FFFDF7',
            fontSize: 46 * u,
            lineHeight: 1.13,
            fontWeight: 900,
            letterSpacing: -1.1 * u,
            textWrap: 'balance',
          }}
        >
          {layout.headlineLines.map((line, i) => <div key={i} style={{height: layout.lineHeight, whiteSpace: 'nowrap'}}>{line}</div>)}
        </div>
        {setup ? (
          <div
            style={{
              marginTop: 8 * u,
              color: 'rgba(255,253,247,.78)',
              fontSize: 22 * u,
              lineHeight: 1.2,
              fontWeight: 700,
              letterSpacing: 0.7 * u,
            }}
          >
            {layout.setupLines.map((line, i) => <div key={i} style={{height: 26.4 * u, whiteSpace: 'nowrap'}}>{line}</div>)}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

export const SemanticEventRenderer: React.FC<{
  event: SemanticForegroundEvent; durationInFrames: number; fps: number;
  assets: SemanticEventAsset[]; assetBaseUrl: string;
}> = ({event, durationInFrames, fps, assets, assetBaseUrl}) => {
  if (event.componentId === 'SectionTitle' || event.semanticLayer === 'title') {
    return <SectionTitleEvent event={event} />;
  }
  const placement = supportedPlacement(event.placement.preset);
  const p = event.payload as any;
  const BRollStack = BRollStackComponent as React.ComponentType<any>;
  const CalloutSpotlight = CalloutSpotlightComponent as React.ComponentType<any>;
  const CauseEffectChain = CauseEffectChainComponent as React.ComponentType<any>;
  const ChronologyTrack = ChronologyTrackComponent as React.ComponentType<any>;
  const ComparisonBars = ComparisonBarsComponent as React.ComponentType<any>;
  const ConceptComparisonCards = ConceptComparisonCardsComponent as React.ComponentType<any>;
  const ConditionGate = ConditionGateComponent as React.ComponentType<any>;
  const DefinitionReveal = DefinitionRevealComponent as React.ComponentType<any>;
  const FeedbackLoop = FeedbackLoopComponent as React.ComponentType<any>;
  const FlowCarrier = FlowCarrierComponent as React.ComponentType<any>;
  const FormFillSequence = FormFillSequenceComponent as React.ComponentType<any>;
  const HierarchyTree = HierarchyTreeComponent as React.ComponentType<any>;
  const ImpactToken = ImpactTokenComponent as React.ComponentType<any>;
  const InsightFocus = InsightFocusComponent as React.ComponentType<any>;
  const KanbanMove = KanbanMoveComponent as React.ComponentType<any>;
  const LogoWall = LogoWallComponent as React.ComponentType<any>;
  const MediaFrame = MediaFrameComponent as React.ComponentType<any>;
  const ProblemSolutionBridge = ProblemSolutionBridgeComponent as React.ComponentType<any>;
  const QuadrantMatrix = QuadrantMatrixComponent as React.ComponentType<any>;
  const QuestionTension = QuestionTensionComponent as React.ComponentType<any>;
  const QuoteFrame = QuoteFrameComponent as React.ComponentType<any>;
  const ResultLock = ResultLockComponent as React.ComponentType<any>;
  const VerdictStamp = VerdictStampComponent as React.ComponentType<any>;
  const WarningBoundary = WarningBoundaryComponent as React.ComponentType<any>;
  const HierarchyTreeRenderer = HierarchyTree as React.ComponentType<any>;
  const FormFillSequenceRenderer = FormFillSequence as React.ComponentType<any>;
  const accentColor = typeof event.style?.accentColor === 'string' ? event.style.accentColor : undefined;
  const at = (milliseconds: unknown, fallback = 0) =>
    typeof milliseconds === 'number' ? Math.max(0, Math.round((milliseconds / 1000) * fps)) : fallback;
  const atEither = (milliseconds: unknown, frames: unknown, fallback = 0) =>
    typeof frames === 'number' && Number.isFinite(frames) ? Math.max(0, Math.round(frames)) : at(milliseconds, fallback);
  const optionalAt = (milliseconds: unknown, frames: unknown) =>
    typeof frames === 'number' && Number.isFinite(frames)
      ? Math.max(0, Math.round(frames))
      : typeof milliseconds === 'number'
        ? at(milliseconds)
        : undefined;
  const showAt = (item: any, fallback = 0) => atEither(item?.showAtMs, item?.showAtInFrames, fallback);
  const completeAt = (item: any, fallback = 0) => atEither(item?.completeAtMs, item?.completeAtInFrames, fallback);
  const exitAtInFrames = Math.max(1, durationInFrames - 12);
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
  const readyAssets = (event.assetIds || [])
    .map((id) => assetMap.get(id))
    .filter((asset): asset is EditAsset => Boolean(asset && asset.status === 'ready'));
  const primaryAsset = readyAssets[0];
  const src = primaryAsset ? encodeAssetPath(assetBaseUrl, primaryAsset) : '';

  switch (event.componentId) {
    case 'MediaFrame': {
      if (!src) return <GenericEvent event={event} />;
      const recordedDemo = event.variantId === 'recordedDemo' || event.variantId === 'recordedDemoCleanGlow';
      const requestedScale = p.presentationScale || (recordedDemo ? 'detailTakeover' : 'large');
      const recordedDemoTakeover = recordedDemo && requestedScale !== 'large' && requestedScale !== 'local';
      return <MediaFrame src={src} mode={recordedDemoTakeover ? 'recordedDemo' : 'show'} visualVariant={event.variantId === 'cleanGlow' || event.variantId === 'recordedDemoCleanGlow' ? 'cleanGlow' : 'standard'} title={p.title} caption={p.caption} eyebrow={p.eyebrow} accentColor={accentColor} fit={p.fit || 'contain'} aspect={p.aspect || (primaryAsset?.width && primaryAsset.height ? primaryAsset.width / primaryAsset.height : undefined)} sourceWidth={primaryAsset?.width} sourceHeight={primaryAsset?.height} placement={placement} presentationScale={recordedDemoTakeover ? 'detailTakeover' : requestedScale} surfaceMode={p.surfaceMode || 'transparent'} muted={p.muted ?? false} loop={p.loop ?? false} volume={p.volume ?? 0.35} playbackRate={p.playbackRate ?? 1} />;
    }
    case 'CalloutSpotlight': {
      const sourceWidth = primaryAsset?.width || p.sourceWidth || 1920;
      const sourceHeight = primaryAsset?.height || p.sourceHeight || 1080;
      const rawTarget = p.target || {x: 0.55, y: 0.35, width: 0.22, height: 0.18};
      const normalizedTarget = ['x', 'y', 'width', 'height'].every((key) => typeof rawTarget[key] === 'number' && rawTarget[key] >= 0 && rawTarget[key] <= 1);
      const target = normalizedTarget
        ? {x: rawTarget.x * sourceWidth, y: rawTarget.y * sourceHeight, width: rawTarget.width * sourceWidth, height: rawTarget.height * sourceHeight}
        : rawTarget;
      return <CalloutSpotlight title={p.title || '重点区域'} labelAppearance={p.labelAppearance === 'plainAccent' ? 'plainAccent' : 'card'} labelColor={p.labelColor} subtitle={p.subtitle} kicker={p.kicker} accentColor={accentColor} visualVariant={event.variantId === 'cornerFocus' ? 'cornerFocus' : 'connectorCard'} target={target} backgroundSrc={src || undefined} sourceWidth={sourceWidth} sourceHeight={sourceHeight} placement={placement} />;
    }
    case 'BRollStack':
      return <BRollStack title={p.title} kicker={p.kicker} caption={p.caption} accentColor={accentColor} placement={placement} visualVariant={event.variantId === 'evidenceTrack' ? 'evidenceTrack' : 'proofDeck'} aspect={p.aspect || (event.variantId === 'evidenceTrack' ? 16 / 9 : primaryAsset?.width && primaryAsset.height ? primaryAsset.width / primaryAsset.height : undefined)} items={readyAssets.map((asset, index) => ({src: encodeAssetPath(assetBaseUrl, asset), title: p.items?.[index]?.title || asset.label || asset.id, caption: p.items?.[index]?.caption, fit: p.items?.[index]?.fit || 'contain', showAtInFrames: typeof p.items?.[index]?.showAtMs === 'number' ? at(p.items[index].showAtMs) : undefined}))} />;
    case 'LogoWall':
      return <LogoWall title={p.title} eyebrow={p.eyebrow} accentColor={accentColor} columns={typeof p.columns === 'number' ? p.columns : undefined} visualVariant={event.variantId as any} placement={placement} items={(p.items || []).map((item: any) => ({...item, accentColor: accentColor || item.accentColor, showAtInFrames: showAt(item)}))} exitAtInFrames={exitAtInFrames} />;
    case 'ComparisonBars':
      return <ComparisonBars visualVariant={event.variantId === 'metricShiftRail' ? 'metricShiftRail' : 'numberDelta'} rows={(p.rows || []).map((item: any) => ({...item, showAtInFrames: at(item.showAtMs)}))} seriesLabels={p.seriesLabels} afterColor={accentColor} downColor={accentColor} placement={placement} exitAtInFrames={exitAtInFrames} />;
    case 'ConceptComparisonCards':
      return <ConceptComparisonCards title={p.title} eyebrow={p.eyebrow} visualVariant={event.variantId as any} placement={placement} sides={(p.sides || []).map((side: any) => ({...side, accentColor: accentColor || side.accentColor, showAtInFrames: showAt(side), items: (side.items || []).map((item: any) => ({...item, showAtInFrames: showAt(item)}))})) as any} exitAtInFrames={exitAtInFrames} />;
    case 'KanbanMove':
      return <KanbanMove accentColor={accentColor} visualVariant={event.variantId === 'statePortal' ? 'statePortal' : 'stateTransfer'} states={p.states || []} cards={(p.cards || []).map((item: any) => ({...item, accentColor: accentColor || item.accentColor, showAtInFrames: showAt(item), moveAtInFrames: atEither(item.moveAtMs, item.moveAtInFrames, 30)}))} placement={placement} exitAtInFrames={exitAtInFrames} />;
    case 'FormFillSequence':
      return <FormFillSequenceRenderer accentColor={accentColor} visualVariant={event.variantId as any} title={p.title} titleEmphasis={p.titleEmphasis} eyebrow={p.eyebrow} resultLabel={p.resultLabel} layoutMode={p.layoutMode || 'progressiveStack'} attentionMode={p.attentionMode || 'guided'} steps={(p.steps || []).map((item: any) => ({...item, accentColor: accentColor || item.accentColor, showAtInFrames: showAt(item), completeAtInFrames: item.completeAtMs !== undefined || item.completeAtInFrames !== undefined ? completeAt(item) : undefined}))} placement={placement} exitAtInFrames={exitAtInFrames} />;
    case 'ChronologyTrack':
      return <ChronologyTrack accentColor={accentColor} visualVariant={event.variantId === 'pulseTrack' ? 'pulseTrack' : 'datedMilestones'} items={(p.items || []).map((item: any) => ({...item, accentColor: accentColor || item.accentColor, showAtInFrames: showAt(item)}))} placement={placement} exitAtInFrames={exitAtInFrames} />;
    case 'CauseEffectChain':
      return <CauseEffectChain accentColor={accentColor} visualVariant={event.variantId as any} cause={{...p.cause, accentColor: accentColor || p.cause?.accentColor, showAtInFrames: showAt(p.cause)}} mechanism={p.mechanism ? {...p.mechanism, accentColor: accentColor || p.mechanism.accentColor, showAtInFrames: showAt(p.mechanism)} : undefined} mechanisms={(p.mechanisms || []).map((item: any) => ({...item, accentColor: accentColor || item.accentColor, showAtInFrames: showAt(item)}))} effect={{...p.effect, accentColor: accentColor || p.effect?.accentColor, showAtInFrames: showAt(p.effect, 30)}} timeRange={p.timeRange} placement={placement} exitAtInFrames={exitAtInFrames} />;
    case 'HierarchyTree':
      return <HierarchyTreeRenderer accentColor={accentColor} visualVariant={event.variantId as any} rootTitle={p.rootTitle || '一个整体'} rootLabel={p.rootLabel} rootShowAtInFrames={atEither(p.rootShowAtMs, p.rootShowAtInFrames)} children={(p.children || []).map((item: any) => ({...item, accentColor: accentColor || item.accentColor, showAtInFrames: showAt(item), leaves: (item.leaves || []).map((leaf: any) => ({...leaf, showAtInFrames: showAt(leaf)}))}))} categoryItems={(p.categoryItems || []).map((item: any) => ({...item, accentColor: accentColor || item.accentColor, showAtInFrames: showAt(item)}))} summary={p.summary ? {...p.summary, showAtInFrames: showAt(p.summary)} : undefined} libraryLabel={p.libraryLabel} placement={placement} exitAtInFrames={exitAtInFrames} />;
    case 'FlowCarrier':
      return <FlowCarrier accentColor={accentColor} visualVariant={event.variantId as any} carrierLabel={p.carrierLabel} stages={(p.stages || []).map((item: any) => ({...item, accentColor: accentColor || item.accentColor, showAtInFrames: showAt(item)}))} dispatchAtInFrames={optionalAt(p.dispatchAtMs, p.dispatchAtInFrames)} returnAtInFrames={optionalAt(p.returnAtMs, p.returnAtInFrames)} resultAtInFrames={optionalAt(p.resultAtMs, p.resultAtInFrames)} resultLabel={p.resultLabel} taskLabel={p.taskLabel} completionLabel={p.completionLabel} placement={placement} exitAtInFrames={exitAtInFrames} />;
    case 'ProblemSolutionBridge':
      return <ProblemSolutionBridge problem={{...p.problem, items: (p.problem?.items || []).map((item: any) => ({...item, showAtInFrames: showAt(item)}))}} solution={{...p.solution, items: (p.solution?.items || []).map((item: any) => ({...item, showAtInFrames: showAt(item)}))}} actionLabel={p.actionLabel || '采取行动'} problemColor={accentColor} actionColor={accentColor} solutionColor={accentColor} visualVariant={event.variantId as any} problemShowAtInFrames={atEither(p.problemShowAtMs, p.problem?.showAtInFrames ?? p.problemShowAtInFrames)} actionShowAtInFrames={atEither(p.actionShowAtMs, p.actionShowAtInFrames, 20)} solutionShowAtInFrames={atEither(p.solutionShowAtMs, p.solution?.showAtInFrames ?? p.solutionShowAtInFrames, 40)} placement={placement} layoutMode={p.layoutMode || 'standard'} attentionMode={p.attentionMode || 'standard'} exitAtInFrames={exitAtInFrames} />;
    case 'ConditionGate':
      return <ConditionGate inputLabel={p.inputLabel || '输入'} conditions={(p.conditions || []).map((item: any) => ({...item, showAtInFrames: showAt(item)}))} passLabel={p.passLabel || '允许通过'} blockedLabel={p.blockedLabel} accentColor={accentColor} passColor={accentColor} failColor={accentColor} resultShowAtInFrames={atEither(p.resultShowAtMs, p.resultShowAtInFrames, 35)} visualVariant={event.variantId as any} placement={placement} exitAtInFrames={exitAtInFrames} />;
    case 'FeedbackLoop':
      return <FeedbackLoop centerLabel={p.centerLabel || '持续优化'} direction={p.direction || 'cw'} accentColor={accentColor} visualVariant={event.variantId as any} stages={(p.stages || []).map((item: any) => ({...item, accentColor: accentColor || item.accentColor, showAtInFrames: showAt(item)}))} placement={placement} exitAtInFrames={exitAtInFrames} />;
    case 'QuadrantMatrix':
      return <QuadrantMatrix xAxisLabel={p.xAxisLabel || '维度一'} yAxisLabel={p.yAxisLabel || '维度二'} accentColor={accentColor} visualVariant={event.variantId as any} quadrants={(p.quadrants || [{title: '区域一'}, {title: '区域二'}, {title: '区域三'}, {title: '区域四'}]).map((item: any) => ({...item, accentColor: accentColor || item.accentColor, showAtInFrames: showAt(item)})) as any} items={(p.items || []).map((item: any) => ({...item, accentColor: accentColor || item.accentColor, showAtInFrames: showAt(item)}))} placement={placement} exitAtInFrames={exitAtInFrames} />;
    case 'ImpactToken':
      return <ImpactToken mode={p.mode === 'number' || event.variantId === 'numberLanding' ? 'number' : 'keyword'} visualVariant={event.variantId as any} text={p.text || event.anchorText || '重点'} value={typeof p.value === 'number' ? p.value : undefined} unit={p.unit} eyebrow={p.eyebrow} caption={p.caption} milestones={(p.milestones || []).map((item: any) => ({...item, showAtInFrames: showAt(item)}))} accentColor={accentColor} secondaryAccentColor={accentColor} placement={placement} exitAtInFrames={exitAtInFrames} />;
    case 'InsightFocus':
      return <InsightFocus setup={p.setup} headline={p.headline || event.anchorText || '核心观点'} highlight={p.highlight} payoff={p.payoff} premises={p.premises} contrastLeftItems={p.contrastLeftItems} contrastRightLabel={p.contrastRightLabel} accentColor={accentColor} secondaryAccentColor={accentColor} visualVariant={event.variantId as any} placement={placement} exitAtInFrames={exitAtInFrames} />;
    case 'QuestionTension':
      return <QuestionTension setup={p.setup} question={p.question || event.anchorText || '为什么会这样？'} highlight={p.highlight} rejectedAnswers={p.rejectedAnswers} progress={p.progress} metricLabel={p.metricLabel} accentColor={accentColor} secondaryAccentColor={accentColor} visualVariant={event.variantId as any} placement={placement} exitAtInFrames={exitAtInFrames} />;
    case 'WarningBoundary':
      return <WarningBoundary eyebrow={p.eyebrow} lead={p.lead} warning={p.warning || event.anchorText || '注意风险'} checks={(p.checks || []).map((item: any) => ({...item, showAtInFrames: showAt(item)}))} warningColor={accentColor} visualVariant={event.variantId as any} placement={placement} exitAtInFrames={exitAtInFrames} />;
    case 'DefinitionReveal':
      return <DefinitionReveal term={p.term || '概念'} definition={p.definition || event.anchorText || '概念解释'} eyebrow={p.eyebrow} parts={(p.parts || []).map((item: any) => ({...item, showAtInFrames: showAt(item)}))} steps={(p.steps || []).map((item: any) => ({...item, showAtInFrames: showAt(item)}))} accentColor={accentColor} secondaryAccentColor={accentColor} visualVariant={event.variantId as any} definitionAtInFrames={atEither(p.definitionAtMs, p.definitionAtInFrames, 18)} placement={placement} exitAtInFrames={exitAtInFrames} />;
    case 'ResultLock':
      return <ResultLock statusLabel={p.statusLabel} resultLabel={p.resultLabel} pendingText={p.pendingText || '正在处理'} resultText={p.resultText || '结果确认'} pendingDetail={p.pendingDetail} resultDetail={p.resultDetail} numericProgress={p.numericProgress} steps={(p.steps || []).map((item: any) => ({...item, showAtInFrames: showAt(item)}))} accentColor={accentColor} visualVariant={event.variantId as any} resultAtInFrames={atEither(p.resultAtMs, p.resultAtInFrames, 28)} placement={placement} exitAtInFrames={exitAtInFrames} />;
    case 'VerdictStamp':
      return <VerdictStamp setup={p.setup} eyebrow={p.eyebrow} verdict={p.verdict || event.anchorText || '最终结论'} stampText={p.stampText} evidence={(p.evidence || []).map((item: any) => ({...item, showAtInFrames: showAt(item)}))} ruleParts={p.ruleParts} accentColor={accentColor} secondaryAccentColor={accentColor} visualVariant={event.variantId as any} verdictAtInFrames={atEither(p.verdictAtMs, p.verdictAtInFrames, 14)} stampAtInFrames={atEither(p.stampAtMs, p.stampAtInFrames, 28)} placement={placement} exitAtInFrames={exitAtInFrames} />;
    case 'QuoteFrame':
      return <QuoteFrame quote={p.quote || event.anchorText || '值得记住的一句话'} attribution={p.attribution} highlight={p.highlight} fragments={p.fragments} sourceLabel={p.sourceLabel} accentColor={accentColor} secondaryAccentColor={accentColor} visualVariant={event.variantId as any} attributionAtInFrames={atEither(p.attributionAtMs, p.attributionAtInFrames, 24)} placement={placement} exitAtInFrames={exitAtInFrames} />;
    default:
      return <GenericEvent event={event} />;
  }
};
