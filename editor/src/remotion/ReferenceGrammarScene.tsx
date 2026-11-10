import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

const FONT = 'Microsoft YaHei, Segoe UI, Arial, sans-serif';
const CYAN = '#38F2E6';
const BLUE = '#62A8FF';
const RED = '#FF4F62';
const WHITE = '#F7FBFF';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOut = (value: number) => 1 - Math.pow(1 - clamp01(value), 3);
const easeInOut = (value: number) => {
  const t = clamp01(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const reveal = (ms: number, at: number, duration = 320) => easeOut((ms - at) / duration);
const windowOpacity = (ms: number, start: number, end: number, enter = 320, exit = 260) =>
  reveal(ms, start, enter) * (1 - easeInOut((ms - (end - exit)) / exit));

const Glyph: React.FC<{kind: 'search' | 'scroll' | 'copy' | 'handoff' | 'install'; color: string}> = ({kind, color}) => (
  <svg width="42" height="42" viewBox="0 0 42 42" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    {kind === 'search' ? <><circle cx="18" cy="18" r="9"/><path d="m25 25 9 9"/></> : null}
    {kind === 'scroll' ? <><path d="M13 8h16M13 16h12M13 24h16M13 32h9"/><path d="m31 25 4 4 4-4M35 20v9"/></> : null}
    {kind === 'copy' ? <><rect x="9" y="11" width="19" height="23" rx="2"/><path d="M15 7h18v23"/><path d="M14 20h9M14 25h7"/></> : null}
    {kind === 'handoff' ? <><circle cx="10" cy="21" r="5"/><circle cx="32" cy="21" r="5"/><path d="M15 21h11m-4-4 4 4-4 4"/></> : null}
    {kind === 'install' ? <><circle cx="21" cy="21" r="15"/><path d="m13.5 21 5 5 10-11"/></> : null}
  </svg>
);

const MicroHeader: React.FC<{
  eyebrow: string;
  title: string;
  index: string;
  color: string;
  opacity: number;
}> = ({eyebrow, title, index, color, opacity}) => (
  <div style={{position: 'absolute', left: 108, top: 100, width: 660, opacity, fontFamily: FONT, filter: 'drop-shadow(0 3px 9px rgba(0,0,0,.62))'}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 14, color, fontSize: 17, lineHeight: 1, fontWeight: 800, letterSpacing: 5.2}}>
      <span style={{width: 36, height: 4, background: color, boxShadow: `0 0 16px ${color}99`}} />
      {eyebrow}
      <span style={{marginLeft: 'auto', color: 'rgba(255,255,255,.34)', letterSpacing: 2.5}}>{index}</span>
    </div>
    <div style={{marginTop: 15, color: WHITE, fontSize: 34, lineHeight: 1.08, fontWeight: 880, letterSpacing: -0.8}}>{title}</div>
    <div style={{marginTop: 16, height: 1, background: `linear-gradient(90deg, ${color}99, rgba(255,255,255,.16) 58%, transparent)`}} />
  </div>
);

type Step = {
  id: string;
  title: string;
  meta: string;
  at: number;
  y: number;
  kind: 'search' | 'scroll' | 'copy' | 'handoff' | 'install';
};

const steps: Step[] = [
  {id: '01', title: '搜索 Skill', meta: 'SEARCH / GITHUB', at: 1300, y: 330, kind: 'search'},
  {id: '02', title: '向下滑动', meta: 'SCAN / README', at: 2666, y: 448, kind: 'scroll'},
  {id: '03', title: '复制安装指令', meta: 'COPY / COMMAND', at: 3700, y: 566, kind: 'copy'},
  {id: '04', title: '交给 Codex', meta: 'HANDOFF / AGENT', at: 5700, y: 684, kind: 'handoff'},
  {id: '05', title: '直接安装', meta: 'INSTALL / READY', at: 8000, y: 802, kind: 'install'},
];

const SearchMotif: React.FC<{p: number}> = ({p}) => (
  <svg width="220" height="66" viewBox="0 0 220 66">
    <rect x="1" y="1" width="218" height="64" rx="7" fill="rgba(8,17,27,.56)" stroke={`rgba(56,242,230,${0.35 + p * 0.55})`} />
    <circle cx="28" cy="31" r="9" fill="none" stroke={CYAN} strokeWidth="2"/>
    <path d="m35 38 8 8" stroke={CYAN} strokeWidth="2" strokeLinecap="round"/>
    <text x="58" y="38" fill={WHITE} fontFamily={FONT} fontSize="21" fontWeight="760" opacity={p}>skill</text>
    <path d={`M58 49h${Math.round(106 * p)}`} stroke={CYAN} strokeWidth="2" opacity=".72"/>
  </svg>
);

const ScrollMotif: React.FC<{p: number}> = ({p}) => (
  <svg width="220" height="72" viewBox="0 0 220 72">
    {[0, 1, 2].map((i) => <path key={i} d={`M8 ${14 + i * 21}h${134 - i * 18}`} stroke={i === 1 ? CYAN : 'rgba(255,255,255,.34)'} strokeWidth={i === 1 ? 4 : 2} strokeLinecap="round" opacity={0.42 + p * 0.58}/>) }
    <path d="M184 7v56" stroke="rgba(255,255,255,.2)" strokeWidth="2"/>
    <rect x="179" y={8 + 34 * p} width="10" height="20" rx="5" fill={CYAN} style={{filter: `drop-shadow(0 0 8px ${CYAN})`}}/>
    <path d="m201 50 8 8 8-8" fill="none" stroke={CYAN} strokeWidth="2"/>
  </svg>
);

const CopyMotif: React.FC<{p: number}> = ({p}) => (
  <svg width="236" height="72" viewBox="0 0 236 72">
    <path d="M9 10h218v52H9z" fill="rgba(7,14,24,.66)" stroke="rgba(255,255,255,.17)"/>
    <text x="23" y="42" fill={CYAN} fontFamily="Consolas, monospace" fontSize="17" fontWeight="700">$ skill install</text>
    <path d={`M20 55h${Math.round(190 * p)}`} stroke={CYAN} strokeWidth="3" opacity=".82"/>
    <path d={`M${24 + 182 * p} 14v43`} stroke="rgba(255,255,255,.75)" strokeWidth="2"/>
  </svg>
);

const HandoffMotif: React.FC<{p: number}> = ({p}) => {
  const x = 32 + 148 * p;
  return <svg width="226" height="72" viewBox="0 0 226 72">
    <circle cx="30" cy="36" r="21" fill="rgba(56,242,230,.07)" stroke={CYAN}/>
    <circle cx="190" cy="36" r="25" fill="rgba(98,168,255,.08)" stroke={BLUE}/>
    <path d="M53 36h109" stroke="rgba(255,255,255,.23)" strokeWidth="2" strokeDasharray="5 7"/>
    <circle cx={x} cy="36" r="5" fill={WHITE} style={{filter: `drop-shadow(0 0 9px ${CYAN})`}}/>
    <text x="21" y="41" fill={CYAN} fontFamily={FONT} fontSize="13" fontWeight="900">CMD</text>
    <text x="169" y="41" fill={WHITE} fontFamily={FONT} fontSize="13" fontWeight="900">AGENT</text>
  </svg>;
};

const InstallMotif: React.FC<{p: number}> = ({p}) => (
  <svg width="226" height="74" viewBox="0 0 226 74">
    <circle cx="37" cy="37" r="27" fill="rgba(56,242,230,.07)" stroke="rgba(56,242,230,.4)" strokeWidth="2"/>
    <circle cx="37" cy="37" r="27" fill="none" stroke={CYAN} strokeWidth="3" strokeDasharray="170" strokeDashoffset={170 * (1 - p)} transform="rotate(-90 37 37)"/>
    <path d="m24 37 8 8 18-20" fill="none" stroke={CYAN} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity={reveal(p, .58, .28)}/>
    <text x="84" y="33" fill={WHITE} fontFamily={FONT} fontSize="19" fontWeight="850" letterSpacing="2.4">READY</text>
    <text x="84" y="54" fill={CYAN} fontFamily={FONT} fontSize="12" fontWeight="700" letterSpacing="2.1">SKILL ACTIVE</text>
  </svg>
);

const ActiveMotif: React.FC<{step: Step; p: number}> = ({step, p}) => {
  if (step.kind === 'search') return <SearchMotif p={p}/>;
  if (step.kind === 'scroll') return <ScrollMotif p={p}/>;
  if (step.kind === 'copy') return <CopyMotif p={p}/>;
  if (step.kind === 'handoff') return <HandoffMotif p={p}/>;
  return <InstallMotif p={p}/>;
};

const InstallStateBoard: React.FC<{absoluteMs: number}> = ({absoluteMs}) => {
  const local = absoluteMs - 47633;
  const opacity = windowOpacity(absoluteMs, 47633, 57399, 330, 280);
  const activeIndex = steps.reduce((latest, step, index) => local >= step.at ? index : latest, 0);
  const current = steps[activeIndex];
  const enterSpring = spring({frame: Math.max(0, (local - current.at) / 1000 * 30), fps: 30, config: {damping: 18, stiffness: 160, mass: .8}});
  const railBottom = current.y;
  return <AbsoluteFill style={{opacity}}>
    <MicroHeader eyebrow="INSTALL ROUTE" title="从 GitHub 到智能体" index={`${String(activeIndex + 1).padStart(2, '0')} / 05`} color={CYAN} opacity={reveal(local, 0, 330)}/>
    <svg width="2560" height="1440" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <path d="M150 305V850" stroke="rgba(255,255,255,.095)" strokeWidth="2" strokeDasharray="2 11"/>
      <path d={`M150 305V${railBottom}`} stroke={CYAN} strokeWidth="3" strokeLinecap="round" style={{filter: `drop-shadow(0 0 9px ${CYAN}88)`}}/>
      <path d="M92 250h18M92 250v650M92 900h18" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1"/>
    </svg>
    {steps.map((step, index) => {
      const entered = reveal(local, step.at, 260);
      const state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'future';
      const stateOpacity = state === 'active' ? 1 : state === 'done' ? .38 : .12;
      const y = step.y;
      const rowEnter = index === 0 && local < step.at ? reveal(local, 200, 330) * .12 : Math.max(entered, state === 'future' ? .12 : 0);
      return <div key={step.id} style={{position: 'absolute', left: 130, top: y - 43, width: 630, height: 90, fontFamily: FONT, opacity: stateOpacity * rowEnter}}>
        {state === 'active' ? <div style={{position: 'absolute', left: 42, top: -4, width: 520 * enterSpring, height: 86, background: `linear-gradient(90deg, rgba(56,242,230,.13), rgba(56,242,230,.025) 72%, transparent)`, borderTop: '1px solid rgba(56,242,230,.42)', borderBottom: '1px solid rgba(56,242,230,.13)'}}/> : null}
        <div style={{position: 'absolute', left: 5, top: 27, width: 30, height: 30, borderRadius: 99, background: state === 'active' ? 'rgba(56,242,230,.16)' : 'rgba(6,15,25,.56)', border: `2px solid ${state === 'future' ? 'rgba(255,255,255,.28)' : CYAN}`, boxShadow: state === 'active' ? `0 0 0 7px rgba(56,242,230,.08), 0 0 18px ${CYAN}88` : 'none', display: 'grid', placeItems: 'center', color: CYAN, fontSize: 16, fontWeight: 900}}>{state === 'done' ? '✓' : ''}</div>
        <div style={{position: 'absolute', left: 68, top: 11, color: state === 'active' ? WHITE : 'rgba(255,255,255,.78)', fontSize: state === 'active' ? 37 : 29, lineHeight: 1.08, fontWeight: 900, letterSpacing: -.7}}>{step.title}</div>
        <div style={{position: 'absolute', left: 69, top: 58, color: state === 'active' ? CYAN : 'rgba(255,255,255,.52)', fontSize: 12, lineHeight: 1, fontWeight: 800, letterSpacing: 2.8}}>{step.id} · {step.meta}</div>
      </div>;
    })}
    <div style={{position: 'absolute', left: 512, top: current.y - 35, width: 240, height: 80, opacity: enterSpring, transform: `translateX(${(1 - enterSpring) * 26}px)`, filter: 'drop-shadow(0 10px 24px rgba(0,0,0,.28))'}}>
      <ActiveMotif step={current} p={clamp01(enterSpring)}/>
    </div>
    <div style={{position: 'absolute', left: 108, top: 945, color: 'rgba(255,255,255,.27)', fontFamily: FONT, fontSize: 13, fontWeight: 760, letterSpacing: 2.7}}>PROGRESSIVE STATE · PREVIOUS STEPS RETAINED</div>
  </AbsoluteFill>;
};

const WarningLock: React.FC<{absoluteMs: number}> = ({absoluteMs}) => {
  const local = absoluteMs - 57666;
  const opacity = windowOpacity(absoluteMs, 57666, 61066, 250, 240);
  const build = reveal(local, 0, 420);
  const focus = reveal(local, 1100, 360);
  const ring = Math.min(1, local / 2200);
  return <AbsoluteFill style={{opacity, fontFamily: FONT}}>
    <MicroHeader eyebrow="CONFIG CHECK" title="模型调用前的关键检查" index="ALERT / 01" color={RED} opacity={build}/>
    <svg width="2560" height="1440" style={{position: 'absolute', inset: 0}}>
      <path d="M108 292h560" stroke="rgba(255,79,98,.42)" strokeWidth="2" strokeDasharray={`${560 * build} 560`}/>
      <path d="M108 292v430M108 722h42" stroke="rgba(255,255,255,.16)" strokeWidth="1"/>
      <circle cx="266" cy="493" r="92" fill="rgba(255,79,98,.045)" stroke="rgba(255,79,98,.22)" strokeWidth="2"/>
      <circle cx="266" cy="493" r="71" fill="none" stroke={RED} strokeWidth="3" strokeDasharray="446" strokeDashoffset={446 * (1 - ring)} transform="rotate(-90 266 493)" style={{filter: `drop-shadow(0 0 10px ${RED}66)`}}/>
      <path d="M238 459h56v68h-56zM226 472h12m56 0h12M226 493h12m56 0h12M226 514h12m56 0h12" fill="none" stroke={RED} strokeWidth="2" opacity={build}/>
      <circle cx="266" cy="493" r={4 + focus * 4} fill={RED} opacity={.55 + .45 * focus} style={{filter: `drop-shadow(0 0 ${8 + focus * 14}px ${RED})`}}/>
      <path d={`M358 493h${Math.round(84 * focus)}`} stroke={RED} strokeWidth="2"/>
    </svg>
    <div style={{position: 'absolute', left: 394, top: 402, opacity: build, transform: `translateX(${(1 - build) * 28}px)`}}>
      <div style={{color: 'rgba(255,255,255,.42)', fontSize: 16, fontWeight: 800, letterSpacing: 4}}>MINIMAX H3</div>
      <div style={{marginTop: 12, color: WHITE, fontSize: 70, lineHeight: 1, fontWeight: 930, letterSpacing: -2.6}}>MODEL API</div>
      <div style={{marginTop: 22, display: 'flex', alignItems: 'center', gap: 14, color: RED, fontSize: 26, fontWeight: 860, letterSpacing: 1}}>
        <span style={{width: 10, height: 10, borderRadius: 99, background: RED, boxShadow: `0 0 15px ${RED}`}}/>
        着重检查配置
      </div>
      <div style={{marginTop: 20, width: 310, height: 1, background: 'linear-gradient(90deg, rgba(255,79,98,.82), transparent)'}}/>
    </div>
    <div style={{position: 'absolute', left: 115, top: 782, color: 'rgba(255,255,255,.32)', fontSize: 13, fontWeight: 760, letterSpacing: 3}}>ATTENTION REQUIRED · CONFIGURATION BOUNDARY</div>
  </AbsoluteFill>;
};

const RunningHubEditorial: React.FC<{absoluteMs: number}> = ({absoluteMs}) => {
  const local = absoluteMs - 61066;
  const opacity = windowOpacity(absoluteMs, 61066, 68532, 280, 330);
  const intro = reveal(local, 0, 360);
  const hub = reveal(local, 1466, 360);
  const simple = reveal(local, 2600, 420);
  const guide = reveal(local, 4466, 420);
  const current = local < 1466 ? 0 : local < 2600 ? 1 : local < 4466 ? 2 : 3;
  return <AbsoluteFill style={{opacity, fontFamily: FONT}}>
    <MicroHeader eyebrow="RUNTIME PATH" title="调用方式决定配置复杂度" index={`0${current + 1} / 04`} color={BLUE} opacity={intro}/>
    <svg width="2560" height="1440" style={{position: 'absolute', inset: 0}}>
      <path d="M108 302v550" stroke="rgba(255,255,255,.14)" strokeWidth="1"/>
      <path d="M108 302h36M108 852h36" stroke="rgba(255,255,255,.18)" strokeWidth="1"/>
      <circle cx="186" cy="454" r="64" fill="rgba(98,168,255,.055)" stroke="rgba(98,168,255,.32)" strokeWidth="2" opacity={hub}/>
      <circle cx="186" cy="454" r="42" fill="none" stroke={BLUE} strokeWidth="2" strokeDasharray="4 9" opacity={hub} transform={`rotate(${local * .02} 186 454)`}/>
      <circle cx="186" cy="454" r="8" fill={BLUE} opacity={hub} style={{filter: `drop-shadow(0 0 16px ${BLUE})`}}/>
      <path d={`M250 454h${Math.round(104 * simple)}`} stroke={BLUE} strokeWidth="2" opacity=".72"/>
      <path d={`M143 708h${Math.round(520 * guide)}`} stroke={CYAN} strokeWidth="3" style={{filter: `drop-shadow(0 0 7px ${CYAN}88)`}}/>
    </svg>
    <div style={{position: 'absolute', left: 286, top: 382, opacity: hub, transform: `translateX(${(1 - hub) * 28}px)`}}>
      <div style={{color: 'rgba(255,255,255,.38)', fontSize: 14, lineHeight: 1, fontWeight: 800, letterSpacing: 4}}>WORKFLOW PROVIDER</div>
      <div style={{marginTop: 13, color: WHITE, fontSize: 58, lineHeight: .94, fontWeight: 930, letterSpacing: -2.1}}>RUNNING<span style={{color: BLUE}}>HUB</span></div>
      <div style={{marginTop: 17, color: BLUE, fontSize: 16, fontWeight: 800, letterSpacing: 3}}>DIRECT WORKFLOW CALL</div>
    </div>
    <div style={{position: 'absolute', left: 392, top: 530, opacity: simple, transform: `translateY(${(1 - simple) * 30}px)`}}>
      <div style={{color: 'rgba(255,255,255,.28)', fontSize: 16, fontWeight: 800, letterSpacing: 4}}>CONFIGURATION</div>
      <div style={{marginTop: 9, color: WHITE, fontSize: 62, lineHeight: 1, fontWeight: 930, letterSpacing: -2.2}}>配置<span style={{color: CYAN}}>更简单</span></div>
      <div style={{marginTop: 14, width: 280, height: 5, background: `linear-gradient(90deg, ${CYAN}, rgba(56,242,230,.08))`, transformOrigin: 'left center', transform: `scaleX(${simple})`, boxShadow: `0 0 12px ${CYAN}66`}}/>
    </div>
    <div style={{position: 'absolute', left: 143, top: 727, opacity: guide, transform: `translateY(${(1 - guide) * 25}px)`}}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 18}}>
        <span style={{color: CYAN, fontSize: 18, fontWeight: 900, letterSpacing: 3}}>NEXT</span>
        <span style={{color: WHITE, fontSize: 45, fontWeight: 910, letterSpacing: -1.2}}>跟着 GitHub 说明走</span>
      </div>
      <div style={{marginTop: 14, color: 'rgba(255,255,255,.34)', fontSize: 14, fontWeight: 760, letterSpacing: 3.2}}>FOLLOW THE REPOSITORY GUIDE</div>
    </div>
  </AbsoluteFill>;
};

export const ReferenceGrammarScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const absoluteMs = frame * 1000 / fps;
  const visible = absoluteMs >= 47300 && absoluteMs <= 68850;
  if (!visible) return null;
  const vignetteOpacity = Math.max(
    windowOpacity(absoluteMs, 47633, 57399, 340, 300),
    windowOpacity(absoluteMs, 57666, 61066, 260, 260),
    windowOpacity(absoluteMs, 61066, 68532, 260, 340),
  );
  return <AbsoluteFill style={{pointerEvents: 'none'}}>
    <AbsoluteFill style={{opacity: vignetteOpacity, background: 'linear-gradient(90deg, rgba(4,9,16,.68) 0%, rgba(4,9,16,.44) 18%, rgba(4,9,16,.12) 31%, transparent 42%)'}}/>
    {absoluteMs >= 47300 && absoluteMs < 57500 ? <InstallStateBoard absoluteMs={absoluteMs}/> : null}
    {absoluteMs >= 57500 && absoluteMs < 61100 ? <WarningLock absoluteMs={absoluteMs}/> : null}
    {absoluteMs >= 60950 ? <RunningHubEditorial absoluteMs={absoluteMs}/> : null}
  </AbsoluteFill>;
};

export type ReferenceGrammarEventLike = {
  variantId: string;
};

export const ReferenceGrammarEvent: React.FC<{
  event: ReferenceGrammarEventLike;
  durationInFrames: number;
}> = ({event, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const localMs = frame * 1000 / fps;
  const durationMs = durationInFrames * 1000 / fps;
  const opacity = windowOpacity(localMs, 0, durationMs, 280, 300);
  const shiftedMs = event.variantId === 'installStateBoard'
    ? localMs + 47633
    : event.variantId === 'apiWarningLock'
      ? localMs + 57666
      : localMs + 61066;

  return <AbsoluteFill style={{pointerEvents: 'none'}}>
    <AbsoluteFill style={{opacity, background: 'linear-gradient(90deg, rgba(4,9,16,.68) 0%, rgba(4,9,16,.44) 18%, rgba(4,9,16,.12) 31%, transparent 42%)'}}/>
    {event.variantId === 'installStateBoard' ? <InstallStateBoard absoluteMs={shiftedMs}/> : null}
    {event.variantId === 'apiWarningLock' ? <WarningLock absoluteMs={shiftedMs}/> : null}
    {event.variantId === 'runningHubEditorial' ? <RunningHubEditorial absoluteMs={shiftedMs}/> : null}
  </AbsoluteFill>;
};
