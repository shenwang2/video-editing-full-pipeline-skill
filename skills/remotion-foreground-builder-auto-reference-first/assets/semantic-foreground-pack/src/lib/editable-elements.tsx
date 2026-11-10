import React, {useLayoutEffect, useMemo, useRef, useState} from "react";
import {useCurrentFrame} from "remotion";

export type EditableElementOverride = {
  x?: number;
  y?: number;
  scale?: number;
  color?: string;
};

export type EditableElementOverrides = Record<string, EditableElementOverride>;

type Point = {x: number; y: number};
type Connector = {
  id: string;
  d: string;
  color: string;
  start?: Point;
  end?: Point;
  frame?: {x: number; y: number; width: number; height: number};
};
type Rgb = {r: number; g: number; b: number};

const CONNECTED_COMPONENTS = new Set([
  "CauseEffectChain", "ChronologyTrack", "ConceptComparisonCards", "ConditionGate", "FeedbackLoop", "FlowCarrier",
  "FormFillSequence", "HierarchyTree", "KanbanMove", "ProblemSolutionBridge", "ResultLock",
]);

const sanitize = (value: string) => value.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "card";
const alphaHex = (hex: string, alpha: string) => /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${alpha}` : hex;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseRgb = (value: string): Rgb | null => {
  const hex = value.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) return {r: Number.parseInt(hex[1].slice(0, 2), 16), g: Number.parseInt(hex[1].slice(2, 4), 16), b: Number.parseInt(hex[1].slice(4, 6), 16)};
  const rgb = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  return rgb ? {r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3])} : null;
};

const toHex = ({r, g, b}: Rgb) => `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
const colorDistance = (left: Rgb, right: Rgb) => Math.hypot(left.r - right.r, left.g - right.g, left.b - right.b);
const isAccentLike = (value: string, accent: Rgb) => {
  const parsed = parseRgb(value);
  return parsed ? colorDistance(parsed, accent) <= 44 : false;
};

const findSurfaces = (root: HTMLElement) => {
  const explicit = Array.from(root.querySelectorAll<HTMLElement>("[data-content-sized-surface], [data-card-copy-structure]"));
  const discovered = new Set(explicit);
  for (const primary of Array.from(root.querySelectorAll<HTMLElement>("[data-primary-text]"))) {
    let cursor: HTMLElement | null = primary.parentElement;
    for (let depth = 0; cursor && cursor !== root && depth < 5; depth += 1, cursor = cursor.parentElement) {
      const computed = window.getComputedStyle(cursor);
      const rounded = Number.parseFloat(computed.borderTopLeftRadius) >= 6;
      const painted = computed.backgroundImage !== "none" || !computed.backgroundColor.endsWith(", 0)");
      if (rounded && painted) { discovered.add(cursor); break; }
    }
  }
  return Array.from(discovered).filter((element) => {
    const rect = element.getBoundingClientRect();
    // Discover cards in composition pixels, not the scaled preview viewport.
    // Otherwise a small preview skips refreshing colors on already-cached rows.
    return rect.width > 0 && rect.height > 0 && element.offsetWidth >= 24 && element.offsetHeight >= 20;
  });
};

const readOriginalAccent = (surface: HTMLElement, fallback: string) => {
  // Authored live color wins over the DOM discovery cache. Reading computed
  // row colors here would feed our previous --editable-card-color back into
  // itself and permanently mask component-level recoloring and reset.
  const authored = parseRgb(surface.dataset.editableBaseAccent || "");
  if (authored) {
    const hex = toHex(authored);
    surface.dataset.editableOriginalAccent = hex;
    return hex;
  }
  if (surface.dataset.editableOriginalAccent) return surface.dataset.editableOriginalAccent;
  const label = surface.querySelector<HTMLElement>("[data-card-label='true']");
  const candidates = [label ? window.getComputedStyle(label).color : "", window.getComputedStyle(surface).borderTopColor, fallback];
  const resolved = candidates.map(parseRgb).find(Boolean) as Rgb | undefined;
  const hex = resolved ? toHex(resolved) : fallback;
  surface.dataset.editableOriginalAccent = hex;
  return hex;
};

const markAccentTargets = (surface: HTMLElement, originalAccent: string) => {
  const accent = parseRgb(originalAccent);
  if (!accent) return;
  const elements = Array.from(surface.querySelectorAll<HTMLElement | SVGElement>("*"));
  for (const element of elements) {
    const computed = window.getComputedStyle(element);
    if ((element as HTMLElement).dataset?.cardLabel === "true" || isAccentLike(computed.color, accent)) (element as HTMLElement).dataset.editableAccentColor = "true";
    if (isAccentLike(computed.backgroundColor, accent)) (element as HTMLElement).dataset.editableAccentBackground = "true";
    if ([computed.borderTopColor, computed.borderRightColor, computed.borderBottomColor, computed.borderLeftColor].some((color) => isAccentLike(color, accent))) (element as HTMLElement).dataset.editableAccentBorder = "true";
    if (isAccentLike(computed.fill, accent)) (element as HTMLElement).dataset.editableAccentFill = "true";
    if (isAccentLike(computed.stroke, accent)) (element as HTMLElement).dataset.editableAccentStroke = "true";
  }
};

const endpoint = (from: DOMRect, to: DOMRect): Point => {
  const cx = from.left + from.width / 2;
  const cy = from.top + from.height / 2;
  const tx = to.left + to.width / 2;
  const ty = to.top + to.height / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  const ratio = Math.max(Math.abs(dx) / Math.max(1, from.width / 2), Math.abs(dy) / Math.max(1, from.height / 2), 1);
  return {x: cx + dx / ratio, y: cy + dy / ratio};
};

const connectorPath = (componentId: string, index: number, start: Point, end: Point) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const bend = (index % 2 === 0 ? -1 : 1) * clamp(distance * 0.18, 28, 92);
  if (componentId === "CauseEffectChain") return `M ${start.x} ${start.y} C ${start.x + dx * 0.34} ${start.y + bend}, ${start.x + dx * 0.66} ${end.y + bend}, ${end.x} ${end.y}`;
  if (componentId === "FlowCarrier") return `M ${start.x} ${start.y} C ${start.x + dx * 0.42} ${start.y}, ${end.x - dx * 0.42} ${end.y}, ${end.x} ${end.y}`;
  if (componentId === "HierarchyTree") return Math.abs(dy) >= Math.abs(dx) * 0.55
    ? `M ${start.x} ${start.y} C ${start.x} ${start.y + dy * 0.46}, ${end.x} ${end.y - dy * 0.46}, ${end.x} ${end.y}`
    : `M ${start.x} ${start.y} C ${start.x + dx * 0.48} ${start.y}, ${end.x - dx * 0.48} ${end.y}, ${end.x} ${end.y}`;
  if (componentId === "KanbanMove") {
    const arch = -clamp(distance * 0.28, 42, 128);
    return `M ${start.x} ${start.y} C ${start.x + dx * 0.30} ${start.y + arch}, ${start.x + dx * 0.70} ${end.y + arch}, ${end.x} ${end.y}`;
  }
  if (componentId === "FeedbackLoop") {
    const loop = clamp(distance * 0.42, 54, 150);
    return horizontal
      ? `M ${start.x} ${start.y} C ${start.x + dx * 0.28} ${start.y - loop}, ${end.x - dx * 0.28} ${end.y - loop}, ${end.x} ${end.y}`
      : `M ${start.x} ${start.y} C ${start.x + loop} ${start.y + dy * 0.28}, ${end.x + loop} ${end.y - dy * 0.28}, ${end.x} ${end.y}`;
  }
  if (["ConditionGate", "FormFillSequence", "ProblemSolutionBridge", "ResultLock"].includes(componentId)) return horizontal
    ? `M ${start.x} ${start.y} C ${start.x + dx * 0.48} ${start.y}, ${end.x - dx * 0.48} ${end.y}, ${end.x} ${end.y}`
    : `M ${start.x} ${start.y} C ${start.x} ${start.y + dy * 0.48}, ${end.x} ${end.y - dy * 0.48}, ${end.x} ${end.y}`;
  const softBend = horizontal ? bend * 0.34 : bend * 0.22;
  return horizontal
    ? `M ${start.x} ${start.y} C ${start.x + dx * 0.36} ${start.y + softBend}, ${end.x - dx * 0.36} ${end.y + softBend}, ${end.x} ${end.y}`
    : `M ${start.x} ${start.y} C ${start.x + softBend} ${start.y + dy * 0.36}, ${end.x + softBend} ${end.y - dy * 0.36}, ${end.x} ${end.y}`;
};

export const EditableElementBridge: React.FC<{
  componentId: string;
  overrides?: EditableElementOverrides;
  accentColor?: string;
  children: React.ReactNode;
}> = ({componentId, overrides = {}, accentColor = "#FFB84A", children}) => {
  const frame = useCurrentFrame();
  const rootRef = useRef<HTMLDivElement>(null);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const serializedOverrides = useMemo(() => JSON.stringify(overrides), [overrides]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const surfaces = findSurfaces(root);
    const occurrences = new Map<string, number>();
    const surfaceById = new Map<string, HTMLElement>();
    const originalAccentById = new Map<string, string>();

    for (const surface of surfaces) {
      const base = sanitize(surface.dataset.contentSizedSurface || surface.dataset.cardCopyStructure || "card");
      const occurrence = occurrences.get(base) || 0;
      occurrences.set(base, occurrence + 1);
      const id = `${base}.${occurrence + 1}`;
      const override = overrides[id];
      const originalAccent = readOriginalAccent(surface, accentColor);
      markAccentTargets(surface, originalAccent);
      originalAccentById.set(id, originalAccent);
      surface.dataset.editableCardId = id;
      surface.dataset.editableCardLabel = surface.dataset.contentSizedSurface || `卡片 ${surfaceById.size + 1}`;
      surfaceById.set(id, surface);
      if (override && (override.x || override.y || override.scale !== undefined || override.color)) {
        surface.dataset.editableCardActive = "true";
        surface.style.setProperty("--editable-card-x", `${(override.x || 0) * root.clientWidth}px`);
        surface.style.setProperty("--editable-card-y", `${(override.y || 0) * root.clientHeight}px`);
        surface.style.setProperty("--editable-card-scale", `${override.scale ?? 1}`);
        surface.style.setProperty("--editable-card-color", override.color || originalAccent);
        surface.style.setProperty("--editable-card-color-soft", alphaHex(override.color || originalAccent, "2E"));
      } else {
        delete surface.dataset.editableCardActive;
        surface.style.removeProperty("--editable-card-x"); surface.style.removeProperty("--editable-card-y");
        surface.style.removeProperty("--editable-card-scale");
        // Keep an explicit local color scope even for an unchanged card. Without
        // this reset, a nested card inherits an edited ancestor's CSS variables
        // and appears recolored even though it has no element override.
        surface.style.setProperty("--editable-card-color", originalAccent);
        surface.style.setProperty("--editable-card-color-soft", alphaHex(originalAccent, "2E"));
      }
    }

    for (const stale of Array.from(root.querySelectorAll<HTMLElement>("[data-editable-card-id]"))) {
      if (!surfaceById.has(stale.dataset.editableCardId || "")) {
        delete stale.dataset.editableCardId; delete stale.dataset.editableCardLabel; delete stale.dataset.editableCardActive;
      }
    }
    for (const oldConnector of Array.from(root.querySelectorAll<HTMLElement | SVGElement>("[data-editable-native-connector]"))) delete (oldConnector as HTMLElement).dataset.editableNativeConnector;

    const hasOverrides = Object.keys(overrides).length > 0;
    const branchOutcomeRows = componentId === "ConceptComparisonCards" && Boolean(root.querySelector('[data-connector-grammar="branchOutcomeRows"]'));
    const shouldDeriveConnectors = hasOverrides && CONNECTED_COMPONENTS.has(componentId) && surfaces.length >= 2;
    if (shouldDeriveConnectors) {
      const surfaceSet = new Set(surfaces);
      for (const candidate of Array.from(root.querySelectorAll<HTMLElement>("div"))) {
        if (surfaceSet.has(candidate) || surfaces.some((surface) => surface.contains(candidate))) continue;
        const rect = candidate.getBoundingClientRect();
        const computed = window.getComputedStyle(candidate);
        const thin = Math.min(rect.width, rect.height) <= 14 && Math.max(rect.width, rect.height) >= 12;
        const painted = computed.backgroundImage !== "none" || !computed.backgroundColor.endsWith(", 0)");
        if (computed.position === "absolute" && thin && painted) candidate.dataset.editableNativeConnector = "true";
      }
      for (const candidate of Array.from(root.querySelectorAll<SVGElement>("svg"))) {
        if (candidate.dataset.editableDerivedConnectors === "true") continue;
        if (surfaces.some((surface) => surface.contains(candidate))) continue;
        const rect = candidate.getBoundingClientRect();
        if (rect.width >= 40 && rect.height >= 20 && candidate.querySelector("path, line, polyline, ellipse")) candidate.dataset.editableNativeConnector = "true";
      }
    }
    if (!shouldDeriveConnectors) { setConnectors((current) => current.length ? [] : current); return; }

    const animationFrame = window.requestAnimationFrame(() => {
      const rootRect = root.getBoundingClientRect();
      const scaleX = root.clientWidth / Math.max(1, rootRect.width);
      const scaleY = root.clientHeight / Math.max(1, rootRect.height);
      const ids = surfaces.map((surface) => surface.dataset.editableCardId || "");
      const rects = surfaces.map((surface) => surface.getBoundingClientRect());
      const visible = surfaces.map((surface, index) => {
        const opacity = Number.parseFloat(window.getComputedStyle(surface).opacity || "1");
        return opacity >= 0.04 && rects[index].width >= 8 && rects[index].height >= 8;
      });
      const candidatePairs: Array<[number, number]> = branchOutcomeRows
        ? [[0, 1], [2, 3]]
        : componentId === "HierarchyTree"
          ? rects.slice(1).map((_, index) => [0, index + 1])
          : rects.slice(0, -1).map((_, index) => [index, index + 1]);
      const pairs = candidatePairs.filter(([fromIndex, toIndex]) => visible[fromIndex] && visible[toIndex]);
      const next = pairs.map(([fromIndex, toIndex], index) => {
        const fromId = ids[fromIndex]; const toId = ids[toIndex];
        const startViewport = endpoint(rects[fromIndex], rects[toIndex]);
        const endViewport = endpoint(rects[toIndex], rects[fromIndex]);
        const start = {x: (startViewport.x - rootRect.left) * scaleX, y: (startViewport.y - rootRect.top) * scaleY};
        const end = {x: (endViewport.x - rootRect.left) * scaleX, y: (endViewport.y - rootRect.top) * scaleY};
        const color = overrides[toId]?.color || overrides[fromId]?.color || originalAccentById.get(toId) || originalAccentById.get(fromId) || accentColor;
        const unit = Math.min(root.clientWidth / 2560, root.clientHeight / 1440);
        const frame = branchOutcomeRows ? {
          x: (Math.min(rects[fromIndex].left, rects[toIndex].left) - rootRect.left) * scaleX - 20 * unit,
          y: (Math.min(rects[fromIndex].top, rects[toIndex].top) - rootRect.top) * scaleY - 20 * unit,
          width: (Math.max(rects[fromIndex].right, rects[toIndex].right) - Math.min(rects[fromIndex].left, rects[toIndex].left)) * scaleX + 40 * unit,
          height: (Math.max(rects[fromIndex].bottom, rects[toIndex].bottom) - Math.min(rects[fromIndex].top, rects[toIndex].top)) * scaleY + 40 * unit,
        } : undefined;
        const d = branchOutcomeRows
          ? `M ${start.x} ${start.y} L ${end.x} ${end.y}`
          : connectorPath(componentId, index, start, end);
        return {id: `${fromIndex}-${toIndex}-${index}`, d, color, start, end, frame};
      });
      setConnectors((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next);
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [accentColor, componentId, frame, serializedOverrides]);

  return (
    <div ref={rootRef} data-editable-component={componentId} data-editable-connectors-active={connectors.length > 0 ? "true" : "false"} style={{position: "absolute", inset: 0, pointerEvents: "none"}}>
      <style>{`
        [data-editable-card-active="true"] {
          transform: translate(var(--editable-card-x), var(--editable-card-y)) scale(var(--editable-card-scale)) !important;
          transform-origin: center center !important;
        }
        [data-editable-card-active="true"]:not([data-editable-preserve-transparent="true"]) {
          border-color: var(--editable-card-color) !important;
          background: linear-gradient(145deg, rgba(8,10,16,.80), var(--editable-card-color-soft)) !important;
          box-shadow: 0 16px 42px rgba(0,0,0,.34), 0 0 28px var(--editable-card-color-soft), inset 0 1px 0 rgba(255,255,255,.13) !important;
        }
        [data-editable-card-active="true"] [data-card-label="true"], [data-editable-card-active="true"] [data-editable-accent-color="true"] { color: var(--editable-card-color) !important; }
        [data-editable-card-active="true"] [data-editable-accent-background="true"] { background: var(--editable-card-color) !important; box-shadow: 0 0 18px var(--editable-card-color-soft) !important; }
        [data-editable-card-active="true"] [data-editable-accent-border="true"] { border-color: var(--editable-card-color) !important; }
        [data-editable-card-active="true"] [data-editable-accent-fill="true"] { fill: var(--editable-card-color) !important; }
        [data-editable-card-active="true"] [data-editable-accent-stroke="true"] { stroke: var(--editable-card-color) !important; }
        [data-editable-connectors-active="true"] [data-editable-native-connector="true"] { opacity: 0 !important; }
      `}</style>
      {children}
      {connectors.length ? (
        <svg data-editable-derived-connectors="true" width="100%" height="100%" viewBox={`0 0 ${rootRef.current?.clientWidth || 1} ${rootRef.current?.clientHeight || 1}`} preserveAspectRatio="none" style={{position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none", zIndex: 1}}>
          {connectors.map((connector) => <React.Fragment key={connector.id}>
            {connector.frame ? <><rect x={connector.frame.x} y={connector.frame.y} width={connector.frame.width} height={connector.frame.height} rx={11} fill="rgba(1,7,14,.45)" stroke={alphaHex(connector.color, "94")} strokeWidth={1.3}/><path d={`M ${connector.frame.x + 13} ${connector.frame.y + 2} H ${connector.frame.x + connector.frame.width - 13}`} fill="none" stroke="rgba(214,236,255,.08)" strokeWidth={1}/></> : null}
            <path d={connector.d} fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth={5} strokeDasharray="9 13" strokeLinecap="round" />
            <path d={connector.d} fill="none" stroke={connector.color} strokeWidth={3.2} strokeDasharray="9 13" strokeLinecap="round" opacity={0.84} style={{filter: `drop-shadow(0 0 6px ${connector.color})`}} />
            {connector.frame && connector.start && connector.end ? <><circle cx={connector.start.x} cy={connector.start.y} r={8.5} fill={connector.color}/><circle cx={connector.end.x} cy={connector.end.y} r={8.5} fill={connector.color}/><circle cx={connector.start.x} cy={connector.start.y} r={11} fill={connector.color} opacity={.13}/><circle cx={connector.end.x} cy={connector.end.y} r={11} fill={connector.color} opacity={.13}/></> : null}
          </React.Fragment>)}
        </svg>
      ) : null}
    </div>
  );
};
