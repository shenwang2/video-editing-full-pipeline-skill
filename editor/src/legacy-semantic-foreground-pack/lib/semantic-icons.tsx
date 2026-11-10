import React, {useId} from "react";

/**
 * Finite semantic SVG vocabulary shared by classic components.
 *
 * `object`, `relations`, `memory`, and `sceneLibrary` preserve the four
 * approved reference visuals. The remaining names mirror the newer atomic
 * component pack so classic variants can reuse the same semantic choices.
 */
export type SemanticIconName =
  | "object" | "relations" | "memory" | "sceneLibrary"
  | "search" | "locate" | "copy" | "send" | "code" | "workflow" | "check"
  | "clock" | "file" | "database" | "user" | "users" | "link" | "chart"
  | "money" | "lock" | "spark" | "settings" | "message" | "play" | "shield"
  | "branch" | "layers" | "gauge" | "star" | "question" | "quote" | "arrow";

export const SEMANTIC_ICON_NAMES: readonly SemanticIconName[] = [
  "object", "relations", "memory", "sceneLibrary",
  "search", "locate", "copy", "send", "code", "workflow", "check",
  "clock", "file", "database", "user", "users", "link", "chart",
  "money", "lock", "spark", "settings", "message", "play", "shield",
  "branch", "layers", "gauge", "star", "question", "quote", "arrow",
] as const;

const atomicPaths: Record<Exclude<SemanticIconName, "object" | "relations" | "memory" | "sceneLibrary">, React.ReactNode> = {
  search: <><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.4 4.4"/></>,
  locate: <><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></>,
  copy: <><rect x="8" y="8" width="11" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/></>,
  send: <><path d="m3 11 18-8-8 18-2-8-8-2Z"/><path d="m11 13 5-5"/></>,
  code: <><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/></>,
  workflow: <><rect x="3" y="4" width="7" height="5" rx="1.5"/><rect x="14" y="15" width="7" height="5" rx="1.5"/><path d="M6.5 9v4h11v2"/></>,
  check: <path d="m4 12 5 5L20 6"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4M9 12h6M9 16h6"/></>,
  database: <><ellipse cx="12" cy="5.5" rx="7" ry="3"/><path d="M5 5.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6M5 11.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.8-4.2 3.3-6.3 7.5-6.3s6.7 2.1 7.5 6.3"/></>,
  users: <><circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9.5" r="2.5"/><path d="M2.8 20c.7-4 2.8-6 6.2-6s5.5 2 6.2 6M15 15c3.2 0 5.2 1.7 6 5"/></>,
  link: <><path d="M9.5 14.5 7 17a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0"/><path d="m14.5 9.5 2.5-2.5a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0M8 12h8"/></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  money: <><circle cx="12" cy="12" r="9"/><path d="M16 8.5c-.8-.7-2-1.1-3.5-1.1-2 0-3.5 1-3.5 2.5 0 3.7 7 1.4 7 5.2 0 1.5-1.6 2.6-3.7 2.6-1.6 0-3-.5-4-1.4M12 5v14"/></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
  spark: <><path d="m12 2 1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></>,
  message: <><path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9h8M8 12h5"/></>,
  play: <><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4V8Z"/></>,
  shield: <path d="M12 2 20 5v6c0 5.2-3.2 8.5-8 11-4.8-2.5-8-5.8-8-11V5l8-3Z"/>,
  branch: <><circle cx="6" cy="5" r="2"/><circle cx="18" cy="7" r="2"/><circle cx="18" cy="17" r="2"/><path d="M6 7v10M8 9c4 0 4-2 8-2M8 15c4 0 4 2 8 2"/></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
  gauge: <><path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 14 4-5M6 18h12"/></>,
  star: <path d="m12 2 3 6 6.7 1-4.8 4.7 1.1 6.6-6-3.1-6 3.1 1.1-6.6L2.3 9 9 8l3-6Z"/>,
  question: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.8 2.8 0 1 1 4 2.5c-1.2.6-1.5 1.3-1.5 2.5M12 18h.01"/></>,
  quote: <><path d="M5 7h6v6H7c0 2-1 3.5-3 4.5M14 7h6v6h-4c0 2-1 3.5-3 4.5"/></>,
  arrow: <><path d="M4 12h15M14 6l6 6-6 6"/></>,
};

const approvedGlyph = (name: "object" | "relations" | "memory") => name === "relations" ? <>
  <path d="M44 24 27 42M28 59 44 76M59 76 77 59M77 42 59 24"/>
  <circle cx="51" cy="17" r="8"/><circle cx="20" cy="51" r="8"/>
  <circle cx="84" cy="51" r="8"/><circle cx="51" cy="84" r="8"/>
  <path d="M40 50h22M51 39v22" strokeWidth="1" opacity=".25" strokeDasharray="1 6"/>
</> : name === "memory" ? <>
  <path d="M21 88V18q0-8 8-8h44q8 0 8 8v15M21 88l26-18 8 6M64 81l17 7V74"/>
  <path d="m48 29 4 12 11 4-11 4-4 12-4-12-11-4 11-4zM82 45l5 14 13 5-13 5-5 14-5-14-13-5 13-5z"/>
</> : <>
  <path d="M11 30V17q0-5 5-5h13M72 12h13q5 0 5 5v13M90 73v13q0 5-5 5H72M29 91H16q-5 0-5-5V73"/>
  <path d="m50 27 24 14v29L50 84 26 70V41zM26 41l24 14 24-14M50 55v29"/>
  <path d="M9 43v19M91 43v19" strokeWidth="1" opacity=".3" strokeDasharray="1 5"/>
</>;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => 1 - (1 - clamp01(value)) ** 3;

export const SceneLibraryIcon: React.FC<{
  color: string;
  progress?: number;
  width: number;
  height: number;
  id?: string;
}> = ({color, progress = 1, width, height, id = "semantic-scene-library"}) => {
  const reactId = useId();
  const prefix = `${id}-${reactId}`.replace(/[^a-z0-9]/gi, "");
  const folder = "M8 26V6Q8 0 16 2L48 7Q56 8 62 22L147 35Q156 37 156 46V157Q156 169 146 167L18 147Q8 145 8 136Z";
  return <svg width={width} height={height} viewBox="0 0 320 260" fill="none" style={{display: "block", overflow: "visible"}}>
    <defs>
      <linearGradient id={`${prefix}face`} x1="0" y1="0" x2="1" y2=".5"><stop stopColor={color} stopOpacity=".32"/><stop offset=".22" stopColor="#13243B" stopOpacity=".94"/><stop offset=".72" stopColor="#060F1F" stopOpacity=".96"/><stop offset="1" stopColor="#173451" stopOpacity=".92"/></linearGradient>
      <linearGradient id={`${prefix}edge`} x1="0" y1="0" x2=".7" y2="1"><stop stopColor="#CCEFFF"/><stop offset=".32" stopColor={color}/><stop offset="1" stopColor={color} stopOpacity=".4"/></linearGradient>
      <linearGradient id={`${prefix}paper`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#E7F1FF"/><stop offset=".11" stopColor="#6D86A4"/><stop offset=".19" stopColor="#102034"/></linearGradient>
      <linearGradient id={`${prefix}base`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#152C43"/><stop offset=".55" stopColor="#050C16"/><stop offset="1" stopColor="#0D2035"/></linearGradient>
    </defs>
    <g opacity={Math.min(1, clamp01(progress) * 3)} strokeLinejoin="round">
      <path d="M18 197 106 158 301 187 219 227Z" fill={`url(#${prefix}base)`} stroke={color} strokeWidth="1.4"/>
      <path d="M18 197v18q0 5 5 6l188 26q8 1 14-2l76-35v-23l-82 40Z" fill="#07101C" stroke={color} strokeOpacity=".7" strokeWidth="1.5"/>
      <path d="M21 205 216 234 295 198" stroke={color} strokeWidth="1.3"/>
      <path d="m257 240 24-12m-30 5 29-14" stroke={color} strokeWidth="1.4" opacity=".72"/>
    </g>
    {Array.from({length: 6}, (_, index) => {
      const depth = 5 - index;
      const amount = ease((clamp01(progress) - index * .055) / .65);
      const x = 42 + depth * 16;
      const y = 56 - depth * 8 - (1 - amount) * 20;
      return <g key={index} transform={`translate(${x} ${y})`} opacity={amount} strokeLinejoin="round">
        <path d="M71 16 153 30q8 1 8 10v118l-7 4V46q0-9-8-10L66 24Z" fill={`url(#${prefix}paper)`} stroke="#BDD5F4" strokeWidth=".8"/>
        <path d={folder} fill={`url(#${prefix}face)`} stroke={`url(#${prefix}edge)`} strokeWidth="1.6"/>
        <path d="M16 4 48 9q6 1 11 14l87 14q7 1 7 9" stroke="#CDEAFF" strokeOpacity=".74" strokeWidth="1"/>
        {index === 5 ? <><path d="m50 55 68 10q6 1 6 7v65q0 6-6 5l-68-10q-6-1-6-7V62q0-8 6-7Z" fill="#091526" fillOpacity=".75" stroke={color} strokeWidth="1.1"/><path d="m120 74 0 54" stroke={color} strokeWidth=".8" opacity=".18"/></> : null}
      </g>;
    })}
    <path d="M20 213 214 241 299 203" stroke={color} strokeOpacity=".15" strokeWidth="5" style={{filter: "blur(3px)"}}/>
  </svg>;
};

export const SemanticIcon: React.FC<{
  name: SemanticIconName;
  size: number;
  color: string;
  progress?: number;
  strokeWidth?: number;
  id?: string;
}> = ({name, size, color, progress = 1, strokeWidth, id}) => {
  if (name === "sceneLibrary") {
    return <SceneLibraryIcon color={color} progress={progress} width={size * 320 / 260} height={size} id={id}/>;
  }
  const isApprovedGlyph = name === "object" || name === "relations" || name === "memory";
  const viewBox = isApprovedGlyph ? "0 0 104 104" : "0 0 24 24";
  const body = isApprovedGlyph ? approvedGlyph(name) : atomicPaths[name];
  const reveal = clamp01(progress);
  const resolvedStroke = strokeWidth ?? (isApprovedGlyph ? 4.2 : 2);
  return <svg width={size} height={size} viewBox={viewBox} fill="none" stroke={color} strokeWidth={resolvedStroke} strokeLinecap="round" strokeLinejoin="round" style={{display: "block", overflow: "visible"}}>
    {isApprovedGlyph ? <g opacity=".2" style={{filter: "blur(3px)"}}>{body}</g> : null}
    <g style={{clipPath: `inset(${(1 - reveal) * 100}% 0 0 0)`}}>{body}</g>
  </svg>;
};
