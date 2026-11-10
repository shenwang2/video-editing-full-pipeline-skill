import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';

const FONT = 'Microsoft YaHei, Segoe UI, Arial, sans-serif';
const WHITE = '#F7FBFF';
const MUTED = 'rgba(247,251,255,.48)';
const PANEL = 'rgba(5,11,18,.72)';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOut = (value: number) => 1 - Math.pow(1 - clamp01(value), 3);
const easeInOut = (value: number) => {
  const t = clamp01(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const reveal = (ms: number, at: number, duration = 320) => easeOut((ms - at) / duration);
const windowOpacity = (ms: number, duration: number, enter = 260, exit = 260) =>
  reveal(ms, 0, enter) * (1 - easeInOut((ms - (duration - exit)) / exit));

type LooseRecord = Record<string, unknown>;
type BatchEventLike = {
  variantId: string;
  payload: LooseRecord;
  style?: LooseRecord;
};

const recordOf = (value: unknown): LooseRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as LooseRecord : {};
const recordsOf = (value: unknown): LooseRecord[] => Array.isArray(value) ? value.map(recordOf) : [];
const textOf = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const numberOf = (value: unknown, fallback = 0) => typeof value === 'number' ? value : fallback;

const ChapterTag: React.FC<{
  label: string;
  title: string;
  color: string;
  opacity: number;
  u: number;
}> = ({label, title, color, opacity, u}) => (
  <div style={{position: 'absolute', left: 104 * u, top: 92 * u, opacity, fontFamily: FONT, filter: 'drop-shadow(0 3px 8px rgba(0,0,0,.68))'}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 10 * u}}>
      <span style={{width: 7 * u, height: 7 * u, borderRadius: 2 * u, background: color, boxShadow: `0 0 ${10 * u}px ${color}88`}} />
      <span style={{color, fontSize: 14 * u, lineHeight: 1, fontWeight: 850, letterSpacing: 3.1 * u}}>{label}</span>
    </div>
    <div style={{marginTop: 10 * u, marginLeft: 17 * u, color: 'rgba(255,255,255,.98)', fontSize: 40 * u, lineHeight: 1.04, fontWeight: 920, letterSpacing: -.7 * u, textShadow: '0 4px 12px rgba(0,0,0,.52)'}}>{title}</div>
  </div>
);

const Panel: React.FC<{
  children: React.ReactNode;
  color: string;
  opacity: number;
  u: number;
  height?: number;
}> = ({children, color, opacity, u, height = 620}) => (
  <div style={{
    position: 'absolute', left: 100 * u, top: 252 * u, width: 640 * u, height: height * u,
    opacity, transform: `translateY(${(1 - opacity) * 18 * u}px)`, borderRadius: 10 * u,
    background: PANEL, border: `1px solid ${color}44`, boxShadow: '0 14px 36px rgba(0,0,0,.24)',
    overflow: 'hidden', fontFamily: FONT,
  }}>
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at 12% 15%, ${color}16, transparent 42%)`}} />
    {children}
  </div>
);

const StatusDot: React.FC<{state: 'done' | 'active' | 'future'; color: string; u: number}> = ({state, color, u}) => (
  <div style={{
    width: 28 * u, height: 28 * u, borderRadius: 999, display: 'grid', placeItems: 'center',
    border: `1px solid ${state === 'future' ? 'rgba(255,255,255,.20)' : `${color}99`}`,
    background: state === 'active' ? `${color}20` : 'rgba(5,11,18,.48)',
    boxShadow: state === 'active' ? `0 0 ${14 * u}px ${color}44` : 'none',
    color: state === 'future' ? 'rgba(255,255,255,.34)' : color,
    fontSize: 15 * u, fontWeight: 900,
  }}>{state === 'done' ? '✓' : state === 'active' ? '•' : ''}</div>
);

const ProgressiveScene: React.FC<{payload: LooseRecord; localMs: number; durationMs: number; color: string; u: number}> = ({payload, localMs, durationMs, color, u}) => {
  const steps = recordsOf(payload.steps);
  const activeIndex = Math.max(0, steps.reduce((latest, step, index) => localMs >= numberOf(step.atMs) ? index : latest, -1));
  const panelOpacity = windowOpacity(localMs, durationMs);
  const rowHeight = Math.min(102, 510 / Math.max(1, steps.length));
  return <>
    <ChapterTag label={textOf(payload.operatorLabel, 'PROGRESSIVE STATE')} title={textOf(payload.title, '状态推进')} color={color} opacity={panelOpacity} u={u}/>
    <Panel color={color} opacity={panelOpacity} u={u}>
      <div style={{position: 'absolute', left: 28 * u, top: 24 * u, color: MUTED, fontSize: 12 * u, fontWeight: 760, letterSpacing: 2.4 * u}}>ACTIVE BEAT · {String(activeIndex + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}</div>
      {steps.map((step, index) => {
        const entered = reveal(localMs, numberOf(step.atMs), 260);
        const state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'future';
        const rowOpacity = state === 'active' ? 1 : state === 'done' ? .34 : index === activeIndex + 1 ? .12 : .055;
        return <div key={`${index}-${textOf(step.label)}`} style={{
          position: 'absolute', left: 24 * u, right: 24 * u, top: (70 + index * rowHeight) * u, height: (rowHeight - 10) * u,
          opacity: (state === 'future' ? 1 : entered) * rowOpacity,
          borderRadius: 8 * u, background: state === 'active' ? `${color}0E` : 'rgba(255,255,255,.015)',
          border: state === 'active' ? `1px solid ${color}4A` : '1px solid rgba(255,255,255,.06)',
          display: 'flex', alignItems: 'center', padding: `0 ${16 * u}px`, gap: 16 * u,
        }}>
          <StatusDot state={state} color={color} u={u}/>
          <div style={{minWidth: 0}}>
            <div style={{color: state === 'active' ? WHITE : 'rgba(255,255,255,.76)', fontSize: (state === 'active' ? 27 : 23) * u, lineHeight: 1.08, fontWeight: 880, letterSpacing: -.4 * u}}>{textOf(step.label)}</div>
            {textOf(step.detail) ? <div style={{marginTop: 6 * u, color: state === 'active' ? color : MUTED, fontSize: 12 * u, lineHeight: 1, fontWeight: 720, letterSpacing: 1.4 * u}}>{textOf(step.detail)}</div> : null}
          </div>
        </div>;
      })}
    </Panel>
  </>;
};

const Arrow: React.FC<{progress: number; color: string; reverse?: boolean; u: number}> = ({progress, color, reverse = false, u}) => (
  <svg width={226 * u} height={54 * u} viewBox="0 0 226 54" style={{overflow: 'visible'}}>
    <path d={reverse ? 'M210 27H20' : 'M16 27h190'} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="2" strokeDasharray="4 7"/>
    <path d={reverse ? 'M210 27H20' : 'M16 27h190'} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray="194" strokeDashoffset={194 * (1 - progress)}/>
    <path d={reverse ? 'm28 19-10 8 10 8' : 'm198 19 10 8-10 8'} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity={progress}/>
  </svg>
);

const Endpoint: React.FC<{item: LooseRecord; color: string; opacity: number; u: number}> = ({item, color, opacity, u}) => (
  <div style={{width: 158 * u, height: 150 * u, opacity, transform: `translateY(${(1 - opacity) * 13 * u}px)`, borderRadius: 10 * u, background: 'rgba(255,255,255,.035)', border: `1px solid ${color}50`, display: 'grid', alignContent: 'center', justifyItems: 'center', textAlign: 'center', padding: 12 * u}}>
    <div style={{width: 42 * u, height: 42 * u, borderRadius: 999, display: 'grid', placeItems: 'center', background: `${color}18`, border: `1px solid ${color}82`, color, fontSize: 18 * u, fontWeight: 900}}>{textOf(item.glyph, '●')}</div>
    <div style={{marginTop: 12 * u, color: MUTED, fontSize: 10 * u, lineHeight: 1, fontWeight: 760, letterSpacing: 1.8 * u}}>{textOf(item.label)}</div>
    <div style={{marginTop: 7 * u, color: WHITE, fontSize: 24 * u, lineHeight: 1.08, fontWeight: 900}}>{textOf(item.title)}</div>
    {textOf(item.detail) ? <div style={{marginTop: 7 * u, color: MUTED, fontSize: 10 * u, lineHeight: 1.25, fontWeight: 650}}>{textOf(item.detail)}</div> : null}
  </div>
);

const TwoPartyScene: React.FC<{payload: LooseRecord; localMs: number; durationMs: number; color: string; u: number}> = ({payload, localMs, durationMs, color, u}) => {
  const caller = recordOf(payload.caller);
  const provider = recordOf(payload.provider);
  const action = recordOf(payload.action);
  const response = recordOf(payload.response);
  const shell = windowOpacity(localMs, durationMs);
  const callerIn = reveal(localMs, numberOf(caller.atMs), 280);
  const providerIn = reveal(localMs, numberOf(provider.atMs, 700), 280);
  const actionIn = reveal(localMs, numberOf(action.atMs, 1500), 620);
  const responseIn = reveal(localMs, numberOf(response.atMs, durationMs * .62), 620);
  return <>
    <ChapterTag label={textOf(payload.operatorLabel, 'TWO-PARTY EXCHANGE')} title={textOf(payload.title, '双向交付')} color={color} opacity={shell} u={u}/>
    <Panel color={color} opacity={shell} u={u} height={500}>
      <div style={{position: 'absolute', left: 32 * u, top: 72 * u}}><Endpoint item={caller} color={color} opacity={callerIn} u={u}/></div>
      <div style={{position: 'absolute', right: 32 * u, top: 72 * u}}><Endpoint item={provider} color={color} opacity={providerIn} u={u}/></div>
      <div style={{position: 'absolute', left: 207 * u, top: 89 * u, opacity: Math.min(callerIn, providerIn)}}>
        <Arrow progress={actionIn} color={color} u={u}/>
        <div style={{position: 'absolute', left: 0, right: 0, top: -15 * u, textAlign: 'center', color: actionIn > .75 ? color : MUTED, fontSize: 12 * u, fontWeight: 780, letterSpacing: 1.1 * u}}>{textOf(action.label)}</div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 42 * u, textAlign: 'center', color: WHITE, fontSize: 18 * u, fontWeight: 850, opacity: actionIn}}>{textOf(action.text)}</div>
      </div>
      <div style={{position: 'absolute', left: 207 * u, top: 218 * u, opacity: Math.min(callerIn, providerIn)}}>
        <Arrow progress={responseIn} color="#62A8FF" reverse u={u}/>
        <div style={{position: 'absolute', left: 0, right: 0, top: -15 * u, textAlign: 'center', color: responseIn > .75 ? '#62A8FF' : MUTED, fontSize: 12 * u, fontWeight: 780, letterSpacing: 1.1 * u}}>{textOf(response.label)}</div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 42 * u, textAlign: 'center', color: WHITE, fontSize: 18 * u, fontWeight: 850, opacity: responseIn}}>{textOf(response.text)}</div>
      </div>
      <div style={{position: 'absolute', left: 32 * u, right: 32 * u, bottom: 28 * u, padding: `${12 * u}px ${16 * u}px`, borderRadius: 7 * u, background: 'rgba(255,255,255,.028)', border: '1px solid rgba(255,255,255,.07)', color: MUTED, fontSize: 12 * u, lineHeight: 1.25, fontWeight: 670}}>{textOf(payload.note)}</div>
    </Panel>
  </>;
};

const LifecycleScene: React.FC<{payload: LooseRecord; localMs: number; durationMs: number; color: string; u: number}> = ({payload, localMs, durationMs, color, u}) => {
  const stages = recordsOf(payload.stages);
  const activeIndex = Math.max(0, stages.reduce((latest, stage, index) => localMs >= numberOf(stage.atMs) ? index : latest, -1));
  const currentAt = numberOf(stages[activeIndex]?.atMs);
  const move = reveal(localMs, currentAt, 360);
  const priorIndex = Math.max(0, activeIndex - 1);
  const rowGap = Math.min(99, 470 / Math.max(1, stages.length));
  const tokenY = 84 + (priorIndex + (activeIndex - priorIndex) * move) * rowGap;
  const shell = windowOpacity(localMs, durationMs);
  return <>
    <ChapterTag label={textOf(payload.operatorLabel, 'TRANSACTION LIFECYCLE')} title={textOf(payload.title, '数据流转')} color={color} opacity={shell} u={u}/>
    <Panel color={color} opacity={shell} u={u}>
      <div style={{position: 'absolute', left: 31 * u, top: 24 * u, color: MUTED, fontSize: 12 * u, fontWeight: 760, letterSpacing: 2.2 * u}}>ASSET · {textOf(payload.assetLabel, 'DATA')}</div>
      <div style={{position: 'absolute', left: 48 * u, top: 84 * u, width: 2 * u, height: Math.max(0, (stages.length - 1) * rowGap) * u, background: 'rgba(255,255,255,.12)'}}/>
      <div style={{position: 'absolute', left: 38 * u, top: (tokenY - 10) * u, width: 22 * u, height: 22 * u, borderRadius: 999, background: color, boxShadow: `0 0 ${16 * u}px ${color}AA`, zIndex: 3}}/>
      {stages.map((stage, index) => {
        const entered = reveal(localMs, numberOf(stage.atMs), 260);
        const state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'future';
        return <div key={`${index}-${textOf(stage.label)}`} style={{position: 'absolute', left: 80 * u, right: 26 * u, top: (61 + index * rowGap) * u, height: 64 * u, opacity: state === 'future' ? .08 : state === 'done' ? .33 * entered : entered, borderRadius: 7 * u, border: state === 'active' ? `1px solid ${color}50` : '1px solid rgba(255,255,255,.06)', background: state === 'active' ? `${color}0D` : 'rgba(255,255,255,.012)', padding: `${11 * u}px ${15 * u}px`}}>
          <div style={{color: state === 'active' ? WHITE : 'rgba(255,255,255,.72)', fontSize: 22 * u, lineHeight: 1, fontWeight: 880}}>{textOf(stage.label)}</div>
          <div style={{marginTop: 7 * u, color: state === 'active' ? color : MUTED, fontSize: 10 * u, lineHeight: 1, fontWeight: 760, letterSpacing: 1.35 * u}}>CUSTODY · {textOf(stage.custodian)}</div>
        </div>;
      })}
    </Panel>
  </>;
};

const MetricScene: React.FC<{payload: LooseRecord; localMs: number; durationMs: number; color: string; u: number}> = ({payload, localMs, durationMs, color, u}) => {
  const thresholdAt = numberOf(payload.thresholdAtMs, 1000);
  const resultAt = numberOf(payload.resultAtMs, durationMs * .72);
  const shell = windowOpacity(localMs, durationMs);
  const threshold = reveal(localMs, thresholdAt, 420);
  const result = reveal(localMs, resultAt, 320);
  return <>
    <ChapterTag label={textOf(payload.operatorLabel, 'METRIC THRESHOLD')} title={textOf(payload.title, '触发门槛')} color={color} opacity={shell} u={u}/>
    <Panel color={color} opacity={shell} u={u} height={500}>
      <div style={{position: 'absolute', left: 30 * u, top: 34 * u, color: MUTED, fontSize: 12 * u, fontWeight: 760, letterSpacing: 2.2 * u}}>{textOf(payload.metricLabel, 'METRIC')}</div>
      <div style={{position: 'absolute', left: 30 * u, top: 83 * u, display: 'flex', alignItems: 'baseline', gap: 12 * u, opacity: threshold, transform: `translateY(${(1 - threshold) * 15 * u}px)`}}>
        <span style={{color: WHITE, fontSize: 106 * u, lineHeight: .9, fontWeight: 940, letterSpacing: -6 * u}}>{textOf(payload.thresholdValue)}</span>
        <span style={{color, fontSize: 28 * u, lineHeight: 1, fontWeight: 880}}>{textOf(payload.unit)}</span>
      </div>
      <div style={{position: 'absolute', left: 32 * u, right: 32 * u, top: 222 * u, height: 1 * u, background: `linear-gradient(90deg, ${color}, ${color}30)`, transformOrigin: 'left', transform: `scaleX(${threshold})`}}/>
      <div style={{position: 'absolute', left: 32 * u, top: 241 * u, color, fontSize: 15 * u, fontWeight: 850, letterSpacing: 1.5 * u, opacity: threshold}}>{textOf(payload.relation, '达到门槛')}</div>
      <div style={{position: 'absolute', left: 30 * u, right: 30 * u, bottom: 34 * u, height: 126 * u, borderRadius: 9 * u, display: 'grid', alignContent: 'center', padding: `0 ${24 * u}px`, background: `${color}0D`, border: `1px solid ${color}48`, opacity: result, transform: `translateY(${(1 - result) * 14 * u}px)`}}>
        <div style={{color: MUTED, fontSize: 11 * u, fontWeight: 760, letterSpacing: 2 * u}}>THEN</div>
        <div style={{marginTop: 10 * u, color: WHITE, fontSize: 38 * u, lineHeight: 1, fontWeight: 920, letterSpacing: -1 * u}}>{textOf(payload.result)}</div>
      </div>
    </Panel>
  </>;
};

const FallbackScene: React.FC<{payload: LooseRecord; localMs: number; durationMs: number; color: string; u: number}> = ({payload, localMs, durationMs, color, u}) => {
  const facts = recordsOf(payload.facts);
  const shell = windowOpacity(localMs, durationMs);
  return <>
    <ChapterTag label={textOf(payload.operatorLabel, 'SAFE FALLBACK')} title={textOf(payload.title, '明确事实')} color={color} opacity={shell} u={u}/>
    <Panel color={color} opacity={shell} u={u} height={Math.min(520, 190 + facts.length * 106)}>
      {facts.map((fact, index) => {
        const entered = reveal(localMs, numberOf(fact.atMs, index * 620), 280);
        return <div key={`${index}-${textOf(fact.label)}`} style={{position: 'absolute', left: 28 * u, right: 28 * u, top: (28 + index * 100) * u, height: 82 * u, borderRadius: 8 * u, background: 'rgba(255,255,255,.026)', border: '1px solid rgba(255,255,255,.075)', opacity: entered, transform: `translateY(${(1 - entered) * 12 * u}px)`, display: 'flex', alignItems: 'center', padding: `0 ${18 * u}px`, gap: 18 * u}}>
          <div style={{color, fontSize: 12 * u, fontWeight: 850, letterSpacing: 1.7 * u, minWidth: 90 * u}}>{textOf(fact.label)}</div>
          <div style={{color: WHITE, fontSize: 25 * u, lineHeight: 1.05, fontWeight: 890}}>{textOf(fact.value)}</div>
        </div>;
      })}
      <div style={{position: 'absolute', left: 28 * u, right: 28 * u, bottom: 22 * u, color: MUTED, fontSize: 11 * u, lineHeight: 1.35, fontWeight: 670, letterSpacing: .5 * u}}>只呈现明确事实 · 不补关系　{ textOf(payload.reason) }</div>
    </Panel>
  </>;
};

export const ReferenceGrammarBatchEvent: React.FC<{
  event: BatchEventLike;
  durationInFrames: number;
}> = ({event, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const localMs = frame * 1000 / fps;
  const durationMs = durationInFrames * 1000 / fps;
  const u = Math.min(width / 2560, height / 1440);
  const payload = event.payload || {};
  const operatorId = textOf(payload.operatorId);
  const selectionStatus = textOf(payload.selectionStatus, 'selected');
  const color = textOf(event.style?.accentColor, textOf(payload.accentColor, '#38F2E6'));
  const sceneOpacity = windowOpacity(localMs, durationMs);

  let scene: React.ReactNode;
  if (selectionStatus.startsWith('rejected')) {
    scene = <FallbackScene payload={payload} localMs={localMs} durationMs={durationMs} color={color} u={u}/>;
  } else if (operatorId === 'two_party_exchange') {
    scene = <TwoPartyScene payload={payload} localMs={localMs} durationMs={durationMs} color={color} u={u}/>;
  } else if (operatorId === 'transaction_lifecycle') {
    scene = <LifecycleScene payload={payload} localMs={localMs} durationMs={durationMs} color={color} u={u}/>;
  } else if (operatorId === 'metric_threshold_build') {
    scene = <MetricScene payload={payload} localMs={localMs} durationMs={durationMs} color={color} u={u}/>;
  } else {
    scene = <ProgressiveScene payload={payload} localMs={localMs} durationMs={durationMs} color={color} u={u}/>;
  }

  return <AbsoluteFill style={{pointerEvents: 'none'}}>
    <AbsoluteFill style={{opacity: sceneOpacity, background: 'linear-gradient(90deg, rgba(3,8,14,.54) 0%, rgba(3,8,14,.31) 19%, rgba(3,8,14,.07) 31%, transparent 40%)'}}/>
    {scene}
  </AbsoluteFill>;
};

