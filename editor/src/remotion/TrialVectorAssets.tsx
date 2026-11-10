import React from 'react';
const ease = (v: number) => 1 - (1 - v) ** 3;

export const SemanticGlyph: React.FC<{name?: string; color: string; size: number; draw: number; stroke: number}> = ({name, color, size, draw, stroke}) => {
  const body = name === 'relations' ? <>
    <path d="M44 24 27 42M28 59 44 76M59 76 77 59M77 42 59 24"/>
    <circle cx="51" cy="17" r="8"/><circle cx="20" cy="51" r="8"/>
    <circle cx="84" cy="51" r="8"/><circle cx="51" cy="84" r="8"/>
    <path d="M40 50h22M51 39v22" strokeWidth="1" opacity=".25" strokeDasharray="1 6"/>
  </> : name === 'memory' ? <>
    <path d="M21 88V18q0-8 8-8h44q8 0 8 8v15M21 88l26-18 8 6M64 81l17 7V74"/>
    <path d="m48 29 4 12 11 4-11 4-4 12-4-12-11-4 11-4zM82 45l5 14 13 5-13 5-5 14-5-14-13-5 13-5z"/>
  </> : <>
    <path d="M11 30V17q0-5 5-5h13M72 12h13q5 0 5 5v13M90 73v13q0 5-5 5H72M29 91H16q-5 0-5-5V73"/>
    <path d="m50 27 24 14v29L50 84 26 70V41zM26 41l24 14 24-14M50 55v29"/>
    <path d="M9 43v19M91 43v19" strokeWidth="1" opacity=".3" strokeDasharray="1 5"/>
  </>;
  return <svg width={size} height={size} viewBox="0 0 104 104" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{overflow: 'visible'}}>
    <g opacity=".2" style={{filter: 'blur(3px)'}}>{body}</g>
    <g style={{clipPath: `inset(${(1 - draw) * 100}% 0 0 0)`}}>{body}</g>
  </svg>;
};

// Real vector layers, not a flattened image of the approved mockup.
export const SceneLibrary: React.FC<{color: string; progress: number; id: string}> = ({color, progress, id}) => {
  const prefix = id.replace(/[^a-z0-9]/gi, '');
  const folder = 'M8 26V6Q8 0 16 2L48 7Q56 8 62 22L147 35Q156 37 156 46V157Q156 169 146 167L18 147Q8 145 8 136Z';
  return <svg width="100%" height="100%" viewBox="0 0 320 260" fill="none" style={{overflow: 'visible'}}>
    <defs>
      <linearGradient id={`${prefix}face`} x1="0" y1="0" x2="1" y2=".5">
        <stop stopColor={color} stopOpacity=".32"/><stop offset=".22" stopColor="#13243B" stopOpacity=".94"/>
        <stop offset=".72" stopColor="#060F1F" stopOpacity=".96"/><stop offset="1" stopColor="#173451" stopOpacity=".92"/>
      </linearGradient>
      <linearGradient id={`${prefix}edge`} x1="0" y1="0" x2=".7" y2="1">
        <stop stopColor="#CCEFFF"/><stop offset=".32" stopColor={color}/><stop offset="1" stopColor={color} stopOpacity=".4"/>
      </linearGradient>
      <linearGradient id={`${prefix}paper`} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#E7F1FF"/><stop offset=".11" stopColor="#6D86A4"/><stop offset=".19" stopColor="#102034"/>
      </linearGradient>
      <linearGradient id={`${prefix}base`} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#152C43"/><stop offset=".55" stopColor="#050C16"/><stop offset="1" stopColor="#0D2035"/>
      </linearGradient>
    </defs>
    <g opacity={Math.min(1, progress * 3)} strokeLinejoin="round">
      <path d="M18 197 106 158 301 187 219 227Z" fill={`url(#${prefix}base)`} stroke={color} strokeWidth="1.4"/>
      <path d="M18 197v18q0 5 5 6l188 26q8 1 14-2l76-35v-23l-82 40Z" fill="#07101C" stroke={color} strokeOpacity=".7" strokeWidth="1.5"/>
      <path d="M21 205 216 234 295 198" stroke={color} strokeWidth="1.3"/>
      <path d="m257 240 24-12m-30 5 29-14" stroke={color} strokeWidth="1.4" opacity=".72"/>
    </g>
    {Array.from({length: 6}, (_, i) => {
      const depth = 5 - i;
      const amount = ease(Math.max(0, Math.min(1, (progress - i * .055) / .65)));
      const x = 42 + depth * 16;
      const y = 56 - depth * 8 - (1 - amount) * 20;
      return <g key={i} transform={`translate(${x} ${y})`} opacity={amount} strokeLinejoin="round">
        <path d="M71 16 153 30q8 1 8 10v118l-7 4V46q0-9-8-10L66 24Z" fill={`url(#${prefix}paper)`} stroke="#BDD5F4" strokeWidth=".8"/>
        <path d={folder} fill={`url(#${prefix}face)`} stroke={`url(#${prefix}edge)`} strokeWidth="1.6"/>
        <path d="M16 4 48 9q6 1 11 14l87 14q7 1 7 9" stroke="#CDEAFF" strokeOpacity=".74" strokeWidth="1"/>
        {i === 5 && <>
          <path d="m50 55 68 10q6 1 6 7v65q0 6-6 5l-68-10q-6-1-6-7V62q0-8 6-7Z" fill="#091526" fillOpacity=".75" stroke={color} strokeWidth="1.1"/>
          <path d="m120 74 0 54" stroke={color} strokeWidth=".8" opacity=".18"/>
        </>}
      </g>;
    })}
    <path d="M20 213 214 241 299 203" stroke={color} strokeOpacity=".15" strokeWidth="5" style={{filter: 'blur(3px)'}}/>
  </svg>;
};

export const GlyphState: React.FC<{kind?: string; color: string; size: number; progress: number; stroke: number}> = ({kind, color, size, progress, stroke}) =>
  <svg width={size} height={size} viewBox="0 0 68 68" fill="none" stroke={color} strokeLinecap="round" strokeWidth={stroke}>
    <circle cx="34" cy="34" r="28" strokeOpacity=".15" strokeWidth="7"/>
    <circle cx="34" cy="34" r="27"/>
    <path d={kind === 'plus' ? 'M34 19v30M19 34h30' : 'm21 35 9 9 18-21'} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress}/>
  </svg>;

