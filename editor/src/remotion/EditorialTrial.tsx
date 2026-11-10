import {SemanticGlyph, SceneLibrary, GlyphState} from './TrialVectorAssets';
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ForegroundEvent} from '../types';
import {getEditorialTrialLayout, type TrialNode} from '../editorialTrialLayout';

const ease = (value: number) => 1 - (1 - value) ** 3;
const palette = (hex: string, a: number) => /^#[\da-f]{6}$/i.test(hex) ? `${hex}${Math.round(a * 255).toString(16).padStart(2, '0')}` : hex;

// Shared template defaults: no image assets, font downloads, or generation calls.
// Per-event payload.templateStyle may override weight/stroke without changing geometry.
export const REFERENCE_TEMPLATE_STYLE = {
  primaryWeight: 800, eyebrowWeight: 600, numberWeight: 800,
  iconStroke: 4.2, stateStroke: 3.8,
} as const;
export const resolveReferenceTemplateStyle = (value: unknown) => {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const read = (key: keyof typeof REFERENCE_TEMPLATE_STYLE, min: number, max: number) => {
    const n = input[key];
    return typeof n === 'number' && Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : REFERENCE_TEMPLATE_STYLE[key];
  };
  return {primaryWeight: read('primaryWeight', 400, 900), eyebrowWeight: read('eyebrowWeight', 400, 900),
    numberWeight: read('numberWeight', 400, 900), iconStroke: read('iconStroke', 2, 6), stateStroke: read('stateStroke', 2, 6)};
};

export const EditorialTrial: React.FC<{event: ForegroundEvent; durationInFrames: number}> = ({event, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const layout = getEditorialTrialLayout(event, width, height);
  if (!layout) return null;
  const {nodes, rows, u, blue} = layout;
  const templateStyle = resolveReferenceTemplateStyle(event.payload.templateStyle);
  const progress = (at: number, seconds = .32) => interpolate(frame - at * fps / 1000, [0, fps * seconds], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const exit = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const library = nodes.find(n => n.kind === 'library');
  const categories = nodes.filter(n => n.kind === 'semantic');
  const drawNode = (n: TrialNode) => {
    const s = u * n.scale, p = progress(n.showAtMs), settle = ease(p);
    if (p <= 0) return null;
    return <div key={n.id} data-editable-card-id={n.id} data-editable-card-label={n.label}
      data-primary-text={n.kind !== 'library' ? 'true' : undefined}
      style={{position: 'absolute', left: n.x, top: n.y, width: n.width, height: n.height,
        opacity: p, boxSizing: 'border-box', color: '#F1F4F6'}}>
      {n.kind === 'heading' ? <>
        <div style={{display: 'flex', alignItems: 'center', gap: 13 * s, height: 28 * s, fontSize: 21 * s, letterSpacing: 2 * s, color: n.color, fontWeight: templateStyle.eyebrowWeight}}>
          <span style={{width: 4 * s, height: 24 * s, background: n.color, boxShadow: `0 0 ${9 * s}px ${palette(n.color, .25)}`}}/>{n.eyebrow}
        </div>
        <div style={{fontSize: 48 * s, lineHeight: 1.35, fontWeight: templateStyle.primaryWeight, marginTop: 16 * s, whiteSpace: 'nowrap', textShadow: `0 ${2 * s}px ${9 * s}px #0008`}}>{n.text}</div>
      </> : n.kind === 'semantic' ? <div data-content-sized-surface="true" style={{width: '100%', height: '100%', borderRadius: 17 * s,
        background: 'linear-gradient(135deg, rgba(3,9,17,.62), rgba(4,11,21,.32))', border: `${1.6 * s}px solid ${palette(n.color, .7)}`,
        boxShadow: `inset 0 ${1 * s}px ${2 * s}px #d1edff20, 0 ${7 * s}px ${20 * s}px #0002`,
        transform: `translateY(${(1 - settle) * 9 * s}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box'}}>
        <div style={{marginTop: 36 * s, height: 126 * s}}><SemanticGlyph name={n.icon} color={n.color} size={124 * s} stroke={templateStyle.iconStroke} draw={ease(progress(n.showAtMs + 35, .38))}/></div>
        <div style={{marginTop: 14 * s, fontSize: 36 * s, fontWeight: templateStyle.primaryWeight, lineHeight: 1.45, whiteSpace: 'nowrap', textShadow: '0 2px 5px #0008'}}>{n.text}</div>
      </div> : n.kind === 'library' ? <>
        <div style={{position: 'absolute', left: 0, top: 0, width: 302 * s, height: 245 * s}}>
          <SceneLibrary id={`${event.id}${n.id}`} color={n.color} progress={progress(n.showAtMs, .58)}/>
        </div>
        {n.count !== undefined && <div style={{position: 'absolute', left: 294 * s, top: 8 * s, minWidth: 70 * s, height: 66 * s,
          padding: `0 ${5 * s}px`, border: `${1.5 * s}px solid ${palette(n.color, .8)}`, borderRadius: 8 * s,
          background: 'linear-gradient(135deg, #091727b3, #050c1580)', color: n.color, fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: 44 * s, fontWeight: templateStyle.numberWeight, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
          opacity: progress(n.showAtMs + 140, .18), textShadow: `0 0 ${9 * s}px ${palette(n.color, .2)}`}}>{n.count}</div>}
        <div style={{position: 'absolute', left: 0, top: 245 * s, width: 304 * s, textAlign: 'center', fontSize: 40 * s,
          lineHeight: 1.1, letterSpacing: 1.5 * s, fontWeight: templateStyle.primaryWeight, whiteSpace: 'nowrap', textShadow: `0 ${2 * s}px ${8 * s}px #000a`}}>{n.text}</div>
      </> : n.kind === 'condition' ? <div style={{display: 'flex', alignItems: 'center', gap: 26 * s, height: '100%'}}>
        <GlyphState kind={n.icon} color={n.color} size={68 * s} stroke={templateStyle.stateStroke} progress={ease(p)}/>
        <span style={{fontSize: 38 * s, fontWeight: templateStyle.primaryWeight, whiteSpace: 'nowrap', textShadow: '0 2px 6px #0009'}}>{n.text}</span>
      </div> : <div style={{height: '100%', display: 'flex', alignItems: 'center', fontSize: 37 * s,
        fontWeight: templateStyle.primaryWeight, color: n.row === 1 ? n.color : '#F1F4F6', whiteSpace: 'nowrap', textShadow: '0 2px 6px #0009'}}>{n.text}</div>}
    </div>;
  };
  return <AbsoluteFill style={{pointerEvents: 'none', fontFamily: 'Microsoft YaHei, Segoe UI, Arial, sans-serif', opacity: exit}}>
    <svg width={width} height={height} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      {library && categories.length > 0 && (() => {
        const reveal = progress(library.showAtMs, .38);
        const targetX = library.x + 153 * u * library.scale, targetY = library.y;
        const bottomY = Math.max(...categories.map(n => n.y + n.height));
        const railY = bottomY + Math.max(18 * u, Math.min(46 * u, (targetY - bottomY) * .55));
        const xs = categories.map(n => n.x + n.width / 2);
        const minX = Math.min(...xs, targetX), maxX = Math.max(...xs, targetX);
        const routeColor = event.elementOverrides?.[library.id]?.color || blue;
        return <g opacity={reveal} fill="none" stroke={routeColor} strokeWidth={2 * u} strokeLinecap="round" strokeLinejoin="round">
          <path d={`M ${minX} ${railY} H ${maxX}`} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - reveal}/>
          {categories.map(n => <path key={n.id} d={`M ${n.x + n.width / 2} ${n.y + n.height + 5 * u} V ${railY}`}
            stroke={event.elementOverrides?.[n.id]?.color || routeColor}/>)}
          <path d={`M ${targetX} ${railY} V ${targetY - 3 * u}`} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - reveal}/>
          <circle cx={targetX} cy={railY} r={2.5 * u} fill={routeColor} stroke="none"/>
        </g>;
      })()}
      {rows.map(r => {
        const appear = progress(r.condition.showAtMs), reveal = ease(progress(r.result.showAtMs, .3));
        if (appear <= 0) return null;
        const a = r.condition, b = r.result;
        const collapsedRight = a.x + a.width + 20 * u;
        const targetRight = r.frame.x + r.frame.width;
        const frameWidth = Math.max(0, collapsedRight - r.frame.x + (targetRight - collapsedRight) * reveal);
        const yA = a.y + a.height / 2, yB = b.y + b.height / 2;
        const xA = a.x + a.width + 34 * u, xB = b.x - 30 * u;
        return <g key={a.id} opacity={appear}>
          <rect x={r.frame.x} y={r.frame.y} width={frameWidth} height={r.frame.height} rx={11 * u}
            fill="rgba(1,7,14,.45)" stroke={palette(r.color, .58)} strokeWidth={1.3 * u}/>
          <path d={`M ${r.frame.x + 13 * u} ${r.frame.y + 2 * u} H ${r.frame.x + frameWidth - 13 * u}`} stroke="#d6ecff" strokeOpacity=".08"/>
          <g opacity={reveal} stroke={r.color} fill={r.color}>
            <path d={`M ${xA} ${yA} C ${(xA + xB) / 2} ${yA}, ${(xA + xB) / 2} ${yB}, ${xB} ${yB}`}
              fill="none" strokeWidth={1.6 * u} strokeDasharray={`${3 * u} ${3 * u}`}/>
            <circle cx={xA} cy={yA} r={8.5 * u}/><circle cx={xB} cy={yB} r={8.5 * u}/>
            <circle cx={xA} cy={yA} r={11 * u} opacity=".13"/><circle cx={xB} cy={yB} r={11 * u} opacity=".13"/>
          </g>
        </g>;
      })}
    </svg>
    {nodes.map(drawNode)}
  </AbsoluteFill>;
};
