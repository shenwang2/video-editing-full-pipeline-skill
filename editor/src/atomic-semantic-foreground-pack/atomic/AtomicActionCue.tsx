import React from "react";

const FONT = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';
const WHITE = "#F7FBFF";
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const shortLabel = (label: string | undefined, fallback: string) => {
  const value = (label || fallback).trim();
  return [...value].slice(0, 11).join("");
};

export type AtomicActionCueProps = {
  cue: "search" | "locate" | "copy" | "send" | "complete" | "generic";
  progress: number;
  color: string;
  label?: string;
  width: number;
  height: number;
};

/**
 * A data-driven micro-illustration atom adapted from the user-approved blind-test V3.
 * It visualizes the current action only; it never supplies a new semantic step.
 */
export const AtomicActionCue: React.FC<AtomicActionCueProps> = ({cue, progress, color, label, width, height}) => {
  const p = clamp01(progress);
  const common = {width, height, viewBox: "0 0 184 54", style: {display: "block"}} as const;

  if (cue === "search") return (
    <svg {...common}>
      <rect x="1" y="1" width="182" height="52" rx="7" fill="rgba(5,11,18,.74)" stroke={`${color}70`} />
      <circle cx="24" cy="25" r="7" fill="none" stroke={color} strokeWidth="1.8" />
      <path d="m29 30 6 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <text x="46" y="32" fill={WHITE} fontFamily={FONT} fontSize="15" fontWeight="750" opacity={p}>{shortLabel(label, "SEARCH")}</text>
      <path d={`M46 42h${Math.round(92 * p)}`} stroke={color} strokeWidth="2" opacity=".72" />
    </svg>
  );

  if (cue === "locate") return (
    <svg {...common}>
      {[0, 1, 2].map((index) => <path key={index} d={`M6 ${10 + index * 17}h${116 - index * 14}`} stroke={index === 1 ? color : "rgba(255,255,255,.28)"} strokeWidth={index === 1 ? 3 : 1.6} strokeLinecap="round" opacity={0.42 + p * 0.58} />)}
      <path d="M148 6v42" stroke="rgba(255,255,255,.18)" strokeWidth="1.5" />
      <rect x="144" y={7 + 23 * p} width="8" height="15" rx="4" fill={color} />
      <circle cx="169" cy="27" r={4 + p * 6} fill="none" stroke={color} strokeWidth="1.8" opacity={p} />
      <circle cx="169" cy="27" r="2.7" fill={color} opacity={p} />
    </svg>
  );

  if (cue === "copy") return (
    <svg {...common}>
      <rect x="1" y="1" width="182" height="52" rx="6" fill="rgba(5,11,18,.75)" stroke="rgba(255,255,255,.15)" />
      <text x="13" y="31" fill={color} fontFamily="Consolas, monospace" fontSize="13" fontWeight="700">$ {shortLabel(label, "copy")}</text>
      <path d={`M12 42h${Math.round(146 * p)}`} stroke={color} strokeWidth="2" opacity=".72" />
      <path d={`M${16 + 142 * p} 10v32`} stroke="rgba(255,255,255,.65)" strokeWidth="1.5" />
    </svg>
  );

  if (cue === "send") {
    const x = 27 + 106 * p;
    return (
      <svg {...common}>
        <circle cx="25" cy="27" r="17" fill={`${color}12`} stroke={`${color}94`} />
        <circle cx="140" cy="27" r="18" fill={`${color}12`} stroke={`${color}94`} />
        <path d="M43 27h78" stroke="rgba(255,255,255,.19)" strokeWidth="1.5" strokeDasharray="4 6" />
        <circle cx={x} cy="27" r="4" fill={WHITE} style={{filter: `drop-shadow(0 0 7px ${color})`}} />
        <text x="13" y="31" fill={color} fontFamily={FONT} fontSize="9.5" fontWeight="900">DATA</text>
        <text x="124" y="31" fill={WHITE} fontFamily={FONT} fontSize="9" fontWeight="900">NEXT</text>
      </svg>
    );
  }

  if (cue === "complete") return (
    <svg {...common}>
      <circle cx="28" cy="27" r="20" fill={`${color}11`} stroke={`${color}42`} />
      <circle cx="28" cy="27" r="20" fill="none" stroke={color} strokeWidth="2.4" strokeDasharray="126" strokeDashoffset={126 * (1 - p)} transform="rotate(-90 28 27)" />
      <path d="m19 27 6 6 12-14" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity={clamp01((p - 0.56) / 0.3)} />
      <text x="64" y="25" fill={WHITE} fontFamily={FONT} fontSize="15" fontWeight="850" letterSpacing="1.5">READY</text>
      <text x="64" y="42" fill={color} fontFamily={FONT} fontSize="10" fontWeight="720" letterSpacing="1.3">STATE LOCKED</text>
    </svg>
  );

  return (
    <svg {...common}>
      <path d={`M10 27h${Math.round(142 * p)}`} stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <path d="m144 20 10 7-10 7" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity={p} />
      <circle cx={10 + 142 * p} cy="27" r="4" fill={WHITE} style={{filter: `drop-shadow(0 0 7px ${color})`}} />
    </svg>
  );
};
