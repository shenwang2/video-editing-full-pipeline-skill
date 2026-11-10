import type {ForegroundEvent} from './types';
import {isProcessTrial, getProcessTrialBounds} from './processTrialLayout';

// Local experiment based on the user's chosen first style frame. Not a Skill variant.
export const isEditorialTrial = (e: ForegroundEvent) =>
  isProcessTrial(e) ||
  (e.componentId === 'HierarchyTree' && e.variantId === 'trialReferenceClassification') ||
  (e.componentId === 'ConceptComparisonCards' && e.variantId === 'trialReferenceBranches') ||
  (e.semanticLayer === 'title' && e.variantId === 'trialReferenceHeading');

export type TrialNode = {
  id: string; label: string; text: string; eyebrow?: string; count?: number; icon?: string;
  kind: 'heading' | 'semantic' | 'library' | 'condition' | 'result';
  showAtMs: number; x: number; y: number; width: number; height: number;
  scale: number; color: string; row?: number;
};
type Rect = {x: number; y: number; width: number; height: number};
export type TrialRow = {condition: TrialNode; result: TrialNode; color: string; frame: Rect};
export const TRIAL_BLUE = '#4DB6FF';
export const TRIAL_GOLD = '#F6BE62';
const record = (v: unknown): Record<string, unknown> => v && typeof v === 'object' ? v as Record<string, unknown> : {};
const number = (v: unknown, fallback = 0) => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const textUnits = (value: string) => Array.from(value).reduce((sum, c) => sum + (/[\u0000-\u007f]/.test(c) ? .54 : 1), 0);
const envelope = (boxes: Rect[], pad = 0): Rect => {
  const x = Math.min(...boxes.map(n => n.x)) - pad;
  const y = Math.min(...boxes.map(n => n.y)) - pad;
  return {x, y, width: Math.max(...boxes.map(n => n.x + n.width)) + pad - x,
    height: Math.max(...boxes.map(n => n.y + n.height)) + pad - y};
};

export const getEditorialTrialLayout = (e: ForegroundEvent, W: number, H: number) => {
  if (!isEditorialTrial(e) || isProcessTrial(e)) return null;
  const u = Math.min(W / 2560, H / 1440);
  const p = e.payload;
  const blue = typeof e.style?.accentColor === 'string' ? e.style.accentColor : TRIAL_BLUE;
  const nodes: TrialNode[] = [];
  const add = (n: Omit<TrialNode, 'scale' | 'color'>, color = blue) => {
    const o = e.elementOverrides?.[n.id];
    const scale = Math.max(.1, o?.scale ?? 1);
    nodes.push({...n, x: n.x * u + (o?.x ?? 0) * W, y: n.y * u + (o?.y ?? 0) * H,
      width: n.width * u * scale, height: n.height * u * scale, scale, color: o?.color || color});
  };
  const rows: TrialRow[] = [];
  if (e.semanticLayer === 'title') {
    const text = String(p.headline || e.anchorText || '');
    add({id: 'reference-heading.1', label: text, text, eyebrow: String(p.setup || ''), kind: 'heading',
      x: 168, y: 153, width: Math.max(620, textUnits(text) * 48 + 20), height: 110, showAtMs: 0});
  } else if (e.componentId === 'HierarchyTree') {
    const items = Array.isArray(p.categoryItems) ? p.categoryItems.slice(0, 3) : [];
    const cardWidth = Math.max(222, ...items.map(item => textUnits(String(record(item).label || '')) * 36 + 54));
    items.forEach((raw, i) => {
      const item = record(raw), text = String(item.label || '');
      add({id: `semantic-category.${i + 1}`, label: text, text, icon: String(item.icon || 'object'), kind: 'semantic',
        x: 172 + i * (cardWidth + 64), y: 314, width: cardWidth, height: 244,
        showAtMs: number(item.showAtMs, number(p.rootShowAtMs))});
    });
    const child = record(Array.isArray(p.children) ? p.children[0] : {});
    const parsedCount = String(child.title || '').match(/\d+/);
    const label = String(p.libraryLabel || child.label || '');
    // Base layout must not depend on transformed siblings: moving a category
    // only moves that category and its connector, never the library node.
    const count = Math.max(1, items.length);
    const cx = 172 + (count * cardWidth + (count - 1) * 64) / 2;
    add({id: 'scene-library.1', label, text: label, count: parsedCount ? Number(parsedCount[0]) : undefined,
      kind: 'library', x: cx - 153, y: 638, width: Math.max(376, textUnits(label) * 40 + 32), height: 292,
      showAtMs: number(child.showAtMs)});
  } else {
    (Array.isArray(p.sides) ? p.sides.slice(0, 2) : []).forEach((raw, i) => {
      const side = record(raw), item = record(Array.isArray(side.items) ? side.items[0] : {});
      const condition = String(side.title || ''), result = String(item.text || '');
      const rowColor = i === 1 && blue.toUpperCase() === TRIAL_BLUE.toUpperCase() ? TRIAL_GOLD : blue;
      const conditionWidth = Math.max(250, 100 + textUnits(condition) * 38);
      add({id: `branch-condition.${i + 1}`, label: condition, text: condition, icon: i === 0 ? 'check' : 'plus',
        kind: 'condition', row: i, x: 228, y: 976 + i * 126, width: conditionWidth, height: 74,
        showAtMs: number(side.showAtMs)}, rowColor);
      add({id: `branch-result.${i + 1}`, label: result, text: result, kind: 'result', row: i,
        x: 654 + Math.max(0, conditionWidth - 250), y: 976 + i * 126,
        width: Math.max(178, textUnits(result) * 37 + 8), height: 74,
        showAtMs: Math.max(number(side.showAtMs), number(item.showAtMs))}, rowColor);
      const a = nodes[nodes.length - 2], b = nodes[nodes.length - 1];
      rows.push({condition: a, result: b, color: e.elementOverrides?.[a.id]?.color || e.elementOverrides?.[b.id]?.color || rowColor,
        frame: envelope([a, b], 20 * u)});
    });
  }
  if (!nodes.length) return null;
  const box = envelope([...nodes, ...rows.map(r => r.frame)], 6 * u);
  return {u, nodes, rows, blue,
    bounds: {x: box.x / W, y: box.y / H, width: box.width / W, height: box.height / H}};
};
export const getEditorialTrialBounds = (e: ForegroundEvent, W: number, H: number) =>
  getProcessTrialBounds(e, W, H) ?? getEditorialTrialLayout(e, W, H)?.bounds ?? null;
