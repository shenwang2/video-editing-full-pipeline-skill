import React from 'react';

/** A freeform object, not a semantic category or a replacement for comparisons. */
export type MetricBarSpec = {
  label: string;
  fromValue: number;
  toValue: number;
  valueMode: 'exact' | 'atLeast';
  startMs: number;
  completeMs: number;
  format?: 'integer' | 'compact';
  unit?: string;
  icon?: 'like' | 'none';
  /** Intermediate animated values are an illustration, not sampled observations. */
  progression: 'illustrative';
};

export const validateMetricBar = (value: unknown): string[] => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['metricBar requires metric data'];
  const v = value as Record<string, unknown>, errors: string[] = [];
  if (typeof v.label !== 'string' || !v.label.trim()) errors.push('metric label required');
  if (![v.fromValue,v.toValue].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0) || Number(v.toValue) <= Number(v.fromValue)) errors.push('metric values must increase and be non-negative');
  if (![v.startMs,v.completeMs].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0) || Number(v.completeMs) <= Number(v.startMs)) errors.push('metric completion must follow start');
  if (!['exact','atLeast'].includes(String(v.valueMode))) errors.push('metric valueMode must preserve exact/lower-bound meaning');
  if (v.progression !== 'illustrative') errors.push('metric progression must be illustrative');
  if (v.format !== undefined && !['integer','compact'].includes(String(v.format))) errors.push('unsupported metric format');
  if (v.unit !== undefined && typeof v.unit !== 'string') errors.push('metric unit must be text');
  if (v.icon !== undefined && !['like','none'].includes(String(v.icon))) errors.push('unsupported metric icon');
  return errors;
};

export const resolveMetricBar = (spec: MetricBarSpec, atMs: number) => {
  const p = Math.max(0, Math.min(1, (atMs-spec.startMs)/(spec.completeMs-spec.startMs)));
  const progress = p*p*(3-2*p);
  const value = p === 1 ? spec.toValue : Math.floor(spec.fromValue+(spec.toValue-spec.fromValue)*progress);
  const complete = p === 1;
  const number = spec.format === 'compact' && value >= 10000
    ? `${Number((value/10000).toFixed(1))}万`
    : Math.floor(value).toLocaleString('en-US');
  const text = number + (complete && spec.valueMode === 'atLeast' ? '+' : '') + (spec.unit || '');
  const after = atMs-spec.completeMs;
  const pulse = after >= 0 && after < 360 ? Math.sin(after/360*Math.PI) : 0;
  return {progress,value,text,complete,pulse};
};

/** Stable 720×180 envelope keeps drag/resize bounds independent of animation. */
export const MetricBar: React.FC<{spec:MetricBarSpec;atMs:number;color:string;fontFamily:string}> = ({spec,atMs,color,fontFamily}) => {
  const state = resolveMetricBar(spec,atMs), fill = 680*state.progress;
  const id = React.useId().replace(/[^a-zA-Z0-9]/g,'');
  return <svg data-context-metric-bar="true" data-metric-value={state.value} data-metric-progress={state.progress} width="100%" height="100%" viewBox="0 0 720 180" preserveAspectRatio="none" style={{overflow:'hidden',fontFamily}}>
    <defs>
      <linearGradient id={`${id}fill`}><stop stopColor={color} stopOpacity=".38"/><stop offset="1" stopColor={color}/></linearGradient>
      <filter id={`${id}shadow`} x="-20%" y="-50%" width="140%" height="220%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#02080E" floodOpacity=".95"/></filter>
    </defs>
    <g filter={`url(#${id}shadow)`}>
      {spec.icon==='like' ? <g transform="translate(20 27) scale(1.4)" fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><path d="M7 21H3V10h4m0 11h10a2 2 0 0 0 2-1.6l2-9A2 2 0 0 0 19 8h-6l1-4a2 2 0 0 0-3-2L7 10v11Z"/></g> : null}
      <text x={spec.icon==='like'?66:20} y="59" fill="#E3EDF0" fontSize="40" fontWeight="650">{spec.label}</text>
      <text data-context-metric-counter="true" x="695" y="88" textAnchor="end" fill={state.complete?color:'#F4FAFC'} fontSize="96" fontWeight="850" style={{fontVariantNumeric:'tabular-nums'}}>{state.text}</text>
    </g>
    <rect x="20" y="120" width="680" height="23" rx="11.5" fill="#0C1A28" fillOpacity=".7" stroke="#BBD8E3" strokeOpacity=".18" strokeWidth="1.5"/>
    {fill>0 ? <rect data-context-metric-fill="true" x="20" y="120" width={fill} height="23" rx="11.5" fill={`url(#${id}fill)`}/> : null}
    {state.progress>0 ? <circle cx={Math.max(26,Math.min(694,20+fill))} cy="131.5" r={5+state.pulse*2.5} fill="#EAFFFF" opacity={.66+state.pulse*.34}/> : null}
    {state.pulse>0 ? <rect x="16" y="116" width="688" height="31" rx="15.5" fill="none" stroke={color} strokeWidth="1.5" opacity={state.pulse*.65}/> : null}
  </svg>;
};
