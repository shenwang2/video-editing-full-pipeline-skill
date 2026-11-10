import React from "react";
import {useCurrentFrame, useVideoConfig} from "remotion";

/** Keep every character in normal inline flow: animation never changes wrapping. */
export const splitCopy = (text: string): string[] => {
  if (Array.from(text).length <= 6 && !text.includes("\n")) return [text];
  const tokens = text.match(/[A-Za-z0-9]+(?:[.'’_-][A-Za-z0-9]+)*|[^A-Za-z0-9]/gu) ?? [];
  const chunks: string[] = [];
  let current = "";
  let units = 0;
  for (const token of tokens) {
    current += token;
    units += /^[A-Za-z0-9]/.test(token) ? 2 : /\s/u.test(token) ? 0 : 1;
    // Punctuation belongs to its preceding phrase, never a flashing lone mark.
    if (/[，。；！？、,;!?\n]/u.test(token) || units >= 5) {
      chunks.push(current); current = ""; units = 0;
    }
  }
  if (current) chunks.push(current);
  return chunks.reduce<string[]>((out, chunk) => {
    if (/^[\s，。；！？、,;!?“”"'’）)]+$/u.test(chunk) && out.length) out[out.length - 1] += chunk;
    else out.push(chunk);
    return out;
  }, []);
};

export const copyProgress = (frame: number, start: number, duration: number) => {
  const t = Math.max(0, Math.min(1, (frame - start) / Math.max(1, duration)));
  return t * t * (3 - 2 * t);
};

/** Visible shell is fully established before the label starts at 0.42s. */
export const surfaceEntrance = (frame: number, start: number, fps: number) => {
  const t = Math.max(0, Math.min(1, (frame - start) / Math.max(1, Math.round(fps * .32))));
  return 1 - (1 - t) ** 3;
};

export const ProgressiveCopy: React.FC<{
  text?: string;
  startAt: number;
  delaySeconds?: number;
  beforeFrame?: number;
  highlight?: string;
  highlightColor?: string;
}> = ({text = "", startAt, delaySeconds = 0, beforeFrame, highlight, highlightColor}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const chunks = splitCopy(text);
  // Compress all copy phases by the same event-local budget for a short window,
  // so label -> primary -> auxiliary order survives and no text misses its exit.
  const available = beforeFrame === undefined ? Infinity : Math.max(1, beforeFrame - startAt - fps * .12);
  const pacing = Math.min(1, available / (fps * 2.97));
  const start = startAt + Math.round(delaySeconds * fps * pacing);
  const naturalDuration = fps * Math.min(1.85, .35 + Math.max(0, chunks.length - 1) * .22) * pacing;
  const duration = Math.max(1, Math.min(naturalDuration, beforeFrame === undefined ? Infinity : beforeFrame - start - fps * .12));
  const fade = Math.min(fps * .35 * pacing, duration);
  const stagger = chunks.length > 1 ? (duration - fade) / (chunks.length - 1) : 0;
  const highlightStart = highlight ? text.indexOf(highlight) : -1;
  const highlightEnd = highlightStart >= 0 ? highlightStart + highlight!.length : -1;
  let offset = 0;
  return <span data-progressive-copy="true" aria-label={text}>{chunks.map((chunk, index) => {
    const from = offset; offset += chunk.length;
    const a = Math.max(0, highlightStart - from), b = Math.min(chunk.length, highlightEnd - from);
    const content = highlightStart >= 0 && a < b
      ? <>{chunk.slice(0, a)}<span style={{color: highlightColor}}>{chunk.slice(a, b)}</span>{chunk.slice(b)}</>
      : chunk;
    const progress = copyProgress(frame, start + index * stagger, fade);
    return <span aria-hidden="true" data-copy-chunk={index} key={index} style={{opacity: progress}}>{content}</span>;
  })}</span>;
};
