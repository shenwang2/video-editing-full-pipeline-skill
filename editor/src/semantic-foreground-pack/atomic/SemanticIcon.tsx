import React from "react";
import type {SemanticIconName} from "./types";

const paths: Record<SemanticIconName, React.ReactNode> = {
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

export const SemanticIcon: React.FC<{name: SemanticIconName; size: number; color: string; progress?: number}> = ({name, size, color, progress = 1}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{display: "block", opacity: progress}}>
    {paths[name]}
  </svg>
);
