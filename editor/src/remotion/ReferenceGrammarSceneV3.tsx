import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';

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

const ChapterTag: React.FC<{
  label: string;
  sublabel: string;
  color: string;
  opacity: number;
}> = ({label, sublabel, color, opacity}) => (
  <div style={{position: 'absolute', left: 104, top: 104, opacity, fontFamily: FONT, filter: 'drop-shadow(0 3px 8px rgba(0,0,0,.68))'}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
      <span style={{width: 7, height: 7, borderRadius: 2, background: color, boxShadow: `0 0 10px ${color}88`}} />
      <span style={{color, fontSize: 14, lineHeight: 1, fontWeight: 850, letterSpacing: 3.3}}>{label}</span>
    </div>
    <div style={{marginTop: 10, marginLeft: 17, color: 'rgba(255,255,255,.98)', fontSize: 40, lineHeight: 1.04, fontWeight: 920, letterSpacing: -.7, textShadow: '0 4px 12px rgba(0,0,0,.52)'}}>{sublabel}</div>
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
  {id: '01', title: '搜索 Skill', meta: 'SEARCH', at: 1300, y: 278, kind: 'search'},
  {id: '02', title: '向下滑动', meta: 'SCROLL', at: 2666, y: 382, kind: 'scroll'},
  {id: '03', title: '复制安装指令', meta: 'COPY', at: 3700, y: 486, kind: 'copy'},
  {id: '04', title: '交给 Codex', meta: 'HANDOFF', at: 5700, y: 590, kind: 'handoff'},
  {id: '05', title: '直接安装', meta: 'INSTALL', at: 8000, y: 694, kind: 'install'},
];

const StepIcon: React.FC<{kind: Step['kind']; color: string; done: boolean}> = ({kind, color, done}) => (
  <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {done ? <path d="m7.5 15 4.6 4.7L22.5 9.5" strokeWidth="2.4"/> : null}
    {!done && kind === 'search' ? <><circle cx="12.5" cy="12.5" r="6"/><path d="m17 17 6 6"/></> : null}
    {!done && kind === 'scroll' ? <><path d="M7 7h15M7 13h11M7 19h13"/><path d="m17 21 3 3 3-3M20 16v8"/></> : null}
    {!done && kind === 'copy' ? <><rect x="6" y="8" width="13" height="16" rx="1.5"/><path d="M11 5h13v16"/></> : null}
    {!done && kind === 'handoff' ? <><circle cx="7" cy="15" r="3"/><circle cx="23" cy="15" r="3"/><path d="M10 15h10m-3-3 3 3-3 3"/></> : null}
    {!done && kind === 'install' ? <><circle cx="15" cy="15" r="9"/><path d="m10.5 15 3 3 6-7"/></> : null}
  </svg>
);

const SearchMotif: React.FC<{p: number}> = ({p}) => (
  <svg width="176" height="52" viewBox="0 0 176 52">
    <rect x="1" y="1" width="174" height="50" rx="7" fill="rgba(5,11,18,.74)" stroke="rgba(56,242,230,.38)"/>
    <circle cx="23" cy="24" r="7" fill="none" stroke={CYAN} strokeWidth="1.8"/>
    <path d="m28 29 6 6" stroke={CYAN} strokeWidth="1.8" strokeLinecap="round"/>
    <text x="44" y="31" fill={WHITE} fontFamily={FONT} fontSize="16" fontWeight="750" opacity={p}>skill</text>
    <path d={`M44 39h${Math.round(88 * p)}`} stroke={CYAN} strokeWidth="2" opacity=".68"/>
  </svg>
);

const ScrollMotif: React.FC<{p: number}> = ({p}) => (
  <svg width="176" height="54" viewBox="0 0 176 54">
    {[0, 1, 2].map((i) => <path key={i} d={`M5 ${9 + i * 17}h${112 - i * 13}`} stroke={i === 1 ? CYAN : 'rgba(255,255,255,.28)'} strokeWidth={i === 1 ? 3 : 1.6} strokeLinecap="round" opacity={0.45 + p * 0.55}/>) }
    <path d="M147 5v43" stroke="rgba(255,255,255,.18)" strokeWidth="1.5"/>
    <rect x="143" y={6 + 24 * p} width="8" height="15" rx="4" fill={CYAN}/>
    <path d="m160 36 5 5 5-5" fill="none" stroke={CYAN} strokeWidth="1.8"/>
  </svg>
);

const CopyMotif: React.FC<{p: number}> = ({p}) => (
  <svg width="184" height="52" viewBox="0 0 184 52">
    <rect x="1" y="1" width="182" height="50" rx="6" fill="rgba(5,11,18,.75)" stroke="rgba(255,255,255,.15)"/>
    <text x="13" y="31" fill={CYAN} fontFamily="Consolas, monospace" fontSize="13.5" fontWeight="700">$ install skill</text>
    <path d={`M12 41h${Math.round(145 * p)}`} stroke={CYAN} strokeWidth="2" opacity=".72"/>
    <path d={`M${16 + 142 * p} 10v32`} stroke="rgba(255,255,255,.65)" strokeWidth="1.5"/>
  </svg>
);

const HandoffMotif: React.FC<{p: number}> = ({p}) => {
  const x = 26 + 105 * p;
  return <svg width="170" height="52" viewBox="0 0 170 52">
    <circle cx="24" cy="26" r="17" fill="rgba(56,242,230,.07)" stroke="rgba(56,242,230,.58)"/>
    <circle cx="138" cy="26" r="18" fill="rgba(98,168,255,.08)" stroke="rgba(98,168,255,.58)"/>
    <path d="M42 26h76" stroke="rgba(255,255,255,.19)" strokeWidth="1.5" strokeDasharray="4 6"/>
    <circle cx={x} cy="26" r="4" fill={WHITE} style={{filter: `drop-shadow(0 0 7px ${CYAN})`}}/>
    <text x="14" y="30" fill={CYAN} fontFamily={FONT} fontSize="10" fontWeight="900">CMD</text>
    <text x="123" y="30" fill={WHITE} fontFamily={FONT} fontSize="9.5" fontWeight="900">CODEX</text>
  </svg>;
};

const InstallMotif: React.FC<{p: number}> = ({p}) => (
  <svg width="176" height="54" viewBox="0 0 176 54">
    <circle cx="27" cy="27" r="20" fill="rgba(56,242,230,.065)" stroke="rgba(56,242,230,.26)"/>
    <circle cx="27" cy="27" r="20" fill="none" stroke={CYAN} strokeWidth="2.4" strokeDasharray="126" strokeDashoffset={126 * (1 - p)} transform="rotate(-90 27 27)"/>
    <path d="m18 27 6 6 12-14" fill="none" stroke={CYAN} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity={reveal(p, .56, .3)}/>
    <text x="62" y="24" fill={WHITE} fontFamily={FONT} fontSize="15" fontWeight="850" letterSpacing="1.6">READY</text>
    <text x="62" y="41" fill={CYAN} fontFamily={FONT} fontSize="10" fontWeight="720" letterSpacing="1.5">SKILL ACTIVE</text>
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
  const opacity = windowOpacity(absoluteMs, 47633, 57399, 300, 250);
  const activeIndex = steps.reduce((latest, step, index) => local >= step.at ? index : latest, 0);
  const current = steps[activeIndex];
  const enterSpring = spring({frame: Math.max(0, (local - current.at) / 1000 * 30), fps: 30, config: {damping: 18, stiffness: 175, mass: .76}});

  return <AbsoluteFill style={{opacity, fontFamily: FONT}}>
    <ChapterTag label="INSTALL SKILL" sublabel="安装路径" color={CYAN} opacity={reveal(local, 0, 300)}/>
    {steps.map((step, index) => {
      const entered = reveal(local, step.at, 250);
      const state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'future';
      const futureGhost = index === activeIndex + 1 ? .11 : .055;
      const rowOpacity = state === 'active' ? 1 : state === 'done' ? .34 : futureGhost;
      const intro = state === 'future' ? 1 : entered;
      const activeWidth = 574 * enterSpring;
      return <div key={step.id} style={{position: 'absolute', left: 100, top: step.y, width: 590, height: 76, opacity: rowOpacity * intro}}>
        {state === 'active' ? <div style={{position: 'absolute', inset: 0, width: activeWidth, borderRadius: 8, background: 'rgba(5,11,18,.70)', border: '1px solid rgba(56,242,230,.34)', boxShadow: '0 9px 24px rgba(0,0,0,.18)', overflow: 'hidden'}}>
          <div style={{position: 'absolute', inset: 0, opacity: .52, background: 'linear-gradient(90deg, rgba(56,242,230,.09), transparent 54%)'}}/>
        </div> : null}
        <div style={{position: 'absolute', left: 15, top: 20, width: 36, height: 36, borderRadius: 99, display: 'grid', placeItems: 'center', background: state === 'active' ? 'rgba(56,242,230,.13)' : 'rgba(5,11,18,.55)', border: `1px solid ${state === 'future' ? 'rgba(255,255,255,.18)' : 'rgba(56,242,230,.54)'}`, boxShadow: state === 'active' ? `0 0 14px rgba(56,242,230,.23)` : 'none'}}>
          <StepIcon kind={step.kind} color={state === 'future' ? 'rgba(255,255,255,.46)' : CYAN} done={state === 'done'}/>
        </div>
        <div style={{position: 'absolute', left: 68, top: 14, color: state === 'active' ? WHITE : 'rgba(255,255,255,.76)', fontSize: state === 'active' ? 29 : 24, lineHeight: 1.08, fontWeight: 860, letterSpacing: -.4}}>{step.title}</div>
        <div style={{position: 'absolute', left: 69, top: 49, color: state === 'active' ? CYAN : 'rgba(255,255,255,.48)', fontSize: 10, lineHeight: 1, fontWeight: 780, letterSpacing: 2.2}}>{step.id}  {step.meta}</div>
        {state === 'active' ? <div style={{position: 'absolute', left: 382, top: 12, width: 184, height: 54, opacity: enterSpring, transform: `translateX(${(1 - enterSpring) * 18}px)`}}>
          <ActiveMotif step={step} p={clamp01(enterSpring)}/>
        </div> : null}
      </div>;
    })}
  </AbsoluteFill>;
};

const WarningIcon: React.FC<{progress: number}> = ({progress}) => (
  <svg width="92" height="92" viewBox="0 0 92 92">
    <circle cx="46" cy="46" r="34" fill="rgba(255,79,98,.06)" stroke="rgba(255,79,98,.23)"/>
    <circle cx="46" cy="46" r="27" fill="none" stroke={RED} strokeWidth="2.4" strokeDasharray="170" strokeDashoffset={170 * (1 - progress)} transform="rotate(-90 46 46)"/>
    <path d="M36 32h20v27H36zM31 38h5m20 0h5M31 46h5m20 0h5M31 54h5m20 0h5" fill="none" stroke={RED} strokeWidth="1.8"/>
    <circle cx="46" cy="46" r="3" fill={RED} style={{filter: `drop-shadow(0 0 8px ${RED})`}}/>
  </svg>
);

const WarningLock: React.FC<{absoluteMs: number}> = ({absoluteMs}) => {
  const local = absoluteMs - 57666;
  const opacity = windowOpacity(absoluteMs, 57666, 61066, 240, 230);
  const build = reveal(local, 0, 350);
  const focus = reveal(local, 1050, 320);
  const pulse = .6 + .4 * Math.sin(local / 180);
  return <AbsoluteFill style={{opacity, fontFamily: FONT}}>
    <ChapterTag label="CONFIG CHECK" sublabel="模型配置" color={RED} opacity={build}/>
    <div style={{position: 'absolute', left: 100, top: 270, width: 598, height: 206, opacity: build, transform: `translateY(${(1 - build) * 18}px)`, borderRadius: 10, background: 'rgba(7,11,18,.72)', border: '1px solid rgba(255,79,98,.30)', boxShadow: '0 12px 30px rgba(0,0,0,.22)', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 14% 50%, rgba(255,79,98,.12), transparent 34%)'}}/>
      <div style={{position: 'absolute', left: 25, top: 57}}><WarningIcon progress={Math.min(1, local / 1500)}/></div>
      <div style={{position: 'absolute', left: 145, top: 42}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,.46)', fontSize: 13, fontWeight: 760, letterSpacing: 2.8}}>
          <span style={{width: 7, height: 7, borderRadius: 99, background: RED, opacity: pulse, boxShadow: `0 0 10px ${RED}`}}/>
          MINIMAX H3
        </div>
        <div style={{marginTop: 13, color: WHITE, fontSize: 43, lineHeight: 1, fontWeight: 920, letterSpacing: -1.5}}>Model API</div>
        <div style={{marginTop: 17, color: focus > .08 ? RED : 'rgba(255,255,255,.46)', fontSize: 25, lineHeight: 1, fontWeight: 850, letterSpacing: .2, transform: `translateX(${(1 - focus) * 10}px)`, opacity: .54 + .46 * focus}}>重点检查配置</div>
      </div>
    </div>
  </AbsoluteFill>;
};

type EditorialRowProps = {
  top: number;
  current: boolean;
  muted: boolean;
  opacity: number;
  color: string;
  eyebrow: string;
  children: React.ReactNode;
};

const EditorialRow: React.FC<EditorialRowProps> = ({top, current, muted, opacity, color, eyebrow, children}) => (
  <div style={{position: 'absolute', left: 100, top, width: 598, height: 108, opacity: opacity * (muted ? .34 : 1), transform: `translateY(${(1 - opacity) * 17}px)`, borderRadius: 9, background: current ? 'rgba(6,12,20,.72)' : 'rgba(6,12,20,.37)', border: current ? `1px solid ${color}55` : '1px solid rgba(255,255,255,.08)', boxShadow: current ? '0 10px 25px rgba(0,0,0,.2)' : 'none'}}>
    <div style={{position: 'absolute', left: 17, top: 19, width: 7, height: 7, borderRadius: 99, background: color, boxShadow: current ? `0 0 10px ${color}` : 'none'}}/>
    <div style={{position: 'absolute', left: 39, top: 14, color: current ? color : 'rgba(255,255,255,.43)', fontSize: 10, lineHeight: 1, fontWeight: 780, letterSpacing: 2.1}}>{eyebrow}</div>
    <div style={{position: 'absolute', left: 39, top: 43, color: current ? WHITE : 'rgba(255,255,255,.76)'}}>{children}</div>
  </div>
);

const RunningHubEditorial: React.FC<{absoluteMs: number}> = ({absoluteMs}) => {
  const local = absoluteMs - 61066;
  const opacity = windowOpacity(absoluteMs, 61066, 68532, 260, 310);
  const intro = reveal(local, 0, 320);
  const hub = reveal(local, 1466, 330);
  const simple = reveal(local, 2600, 360);
  const guide = reveal(local, 4466, 360);
  const current = local < 2600 ? 0 : local < 4466 ? 1 : 2;
  return <AbsoluteFill style={{opacity, fontFamily: FONT}}>
    <ChapterTag label="RUNNINGHUB" sublabel="工作流调用" color={BLUE} opacity={intro}/>
    <EditorialRow top={270} current={current === 0} muted={current > 0} opacity={hub} color={BLUE} eyebrow="WORKFLOW">
      <div style={{fontSize: 34, lineHeight: 1, fontWeight: 920, letterSpacing: -1.1}}>RUNNING<span style={{color: BLUE}}>HUB</span></div>
    </EditorialRow>
    <EditorialRow top={396} current={current === 1} muted={current > 1} opacity={simple} color={CYAN} eyebrow="CONFIG">
      <div style={{fontSize: 34, lineHeight: 1, fontWeight: 910, letterSpacing: -1}}>配置<span style={{color: CYAN}}>更简单</span></div>
    </EditorialRow>
    <EditorialRow top={522} current={current === 2} muted={false} opacity={guide} color={CYAN} eyebrow="NEXT">
      <div style={{fontSize: 29, lineHeight: 1, fontWeight: 880, letterSpacing: -.5}}>跟着 GitHub 说明走</div>
    </EditorialRow>
  </AbsoluteFill>;
};

export const ReferenceGrammarScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const absoluteMs = frame * 1000 / fps;
  const visible = absoluteMs >= 47300 && absoluteMs <= 68850;
  if (!visible) return null;
  const vignetteOpacity = Math.max(
    windowOpacity(absoluteMs, 47633, 57399, 320, 280),
    windowOpacity(absoluteMs, 57666, 61066, 250, 250),
    windowOpacity(absoluteMs, 61066, 68532, 250, 330),
  );
  return <AbsoluteFill style={{pointerEvents: 'none'}}>
    <AbsoluteFill style={{opacity: vignetteOpacity, background: 'linear-gradient(90deg, rgba(3,8,14,.52) 0%, rgba(3,8,14,.31) 18%, rgba(3,8,14,.07) 31%, transparent 39%)'}}/>
    {absoluteMs >= 47300 && absoluteMs < 57500 ? <InstallStateBoard absoluteMs={absoluteMs}/> : null}
    {absoluteMs >= 57500 && absoluteMs < 61100 ? <WarningLock absoluteMs={absoluteMs}/> : null}
    {absoluteMs >= 60950 ? <RunningHubEditorial absoluteMs={absoluteMs}/> : null}
  </AbsoluteFill>;
};

export type ReferenceGrammarEventLike = {variantId: string};

export const ReferenceGrammarEvent: React.FC<{
  event: ReferenceGrammarEventLike;
  durationInFrames: number;
}> = ({event, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const localMs = frame * 1000 / fps;
  const durationMs = durationInFrames * 1000 / fps;
  const opacity = windowOpacity(localMs, 0, durationMs, 260, 280);
  const shiftedMs = event.variantId === 'installStateBoard'
    ? localMs + 47633
    : event.variantId === 'apiWarningLock'
      ? localMs + 57666
      : localMs + 61066;

  return <AbsoluteFill style={{pointerEvents: 'none'}}>
    <AbsoluteFill style={{opacity, background: 'linear-gradient(90deg, rgba(3,8,14,.52) 0%, rgba(3,8,14,.31) 18%, rgba(3,8,14,.07) 31%, transparent 39%)'}}/>
    {event.variantId === 'installStateBoard' ? <InstallStateBoard absoluteMs={shiftedMs}/> : null}
    {event.variantId === 'apiWarningLock' ? <WarningLock absoluteMs={shiftedMs}/> : null}
    {event.variantId === 'runningHubEditorial' ? <RunningHubEditorial absoluteMs={shiftedMs}/> : null}
  </AbsoluteFill>;
};
