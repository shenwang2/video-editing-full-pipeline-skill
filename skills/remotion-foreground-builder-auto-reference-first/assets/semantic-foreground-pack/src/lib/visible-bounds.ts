import {getSectionTitleLayout} from './section-title-layout';
import {estimateTextWidth, estimateWrappedLineCount} from './content-sizing';
import {getStatementFocusLayout} from './statement-focus-layout';
import {fitAspectIntoRect, getAlignedX, getForegroundZone, getPlacementHorizontalAlignment, type ForegroundPlacement, type Rect} from './layout';

/** Stable expanded artwork bounds, in composition pixels. No frame/time inputs.
 * Owned by the semantic pack: editor adapters must not invent generic host boxes.
 * Text includes a small stroke allowance, never the transparent minHeight host.
 */
export type SemanticBoundsInput = {
  componentId: string;
  variantId: string;
  payload: Record<string, unknown>;
  placement: ForegroundPlacement;
  width: number;
  height: number;
};
const str = (v: unknown, fallback = '') => typeof v === 'string' ? v : fallback;
const num = (v: unknown, fallback: number) => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const list = (v: unknown): Record<string, unknown>[] => Array.isArray(v) ? v.filter(x => x && typeof x === 'object') : [];
const lines = (text: string, size: number, width: number, spacing = 0) => text.split('\n').reduce((n, line) => n + estimateWrappedLineCount({text: line, fontSize: size, availableWidth: width, letterSpacing: spacing}), 0);
const textWidth = (s: string, size: number, spacing = 0, max = Infinity) => Math.min(max, Math.max(...s.split('\n').map(x => estimateTextWidth(x, size, spacing))));
const union = (boxes: Rect[], pad = 0): Rect => {
  const x = Math.min(...boxes.map(b => b.x)) - pad;
  const y = Math.min(...boxes.map(b => b.y)) - pad;
  return {x, y, width: Math.max(...boxes.map(b => b.x + b.width)) + pad - x, height: Math.max(...boxes.map(b => b.y + b.height)) + pad - y};
};

export function getSemanticVisibleBounds({componentId: id, variantId: variant, payload: p, placement, width, height}: SemanticBoundsInput): Rect | null {
  if (id === 'SectionTitle') return getSectionTitleLayout({width, height, variantId: variant, payload: p}).bounds;
  if (id === 'InsightFocus' && variant === 'statementFocus') return getStatementFocusLayout({width,height,placement,headline:str(p.headline),highlight:str(p.highlight),setup:str(p.setup),payoff:str(p.payoff)}).bounds;
  const zone = getForegroundZone({width, height, placement});
  const panel = (bw: number, bh: number, min = .52, max = 1.55, fw = bw, fh = bh) => {
    const u = Math.max(min, Math.min(zone.width / fw, zone.height / fh, max));
    return {x: getAlignedX({zone, itemWidth: bw * u, placement}), y: zone.y + (zone.height - bh * u) / 2, width: bw * u, height: bh * u, u};
  };
  const sourceWidth = Math.max(1, num(p.sourceWidth, 1920));
  const sourceHeight = Math.max(1, num(p.sourceHeight, 1080));
  if (id === 'MediaFrame') {
    const recorded = ['recordedDemo', 'recordedDemoCleanGlow'].includes(variant);
    const takeover = recorded && p.presentationScale !== 'large' && p.presentationScale !== 'local';
    if (takeover) return {x: 0, y: 0, width, height};
    const z = p.presentationScale === 'local' ? zone : height > width
      ? {x: width * .06, y: height * .12, width: width * .88, height: height * .7}
      : {x: width * .08, y: height * .15, width: width * .84, height: height * .7};
    const u = Math.min(width / 1920, height / 1080);
    const clean = ['cleanGlow', 'recordedDemoCleanGlow'].includes(variant);
    const title = str(p.title), caption = str(p.caption), eyebrow = str(p.eyebrow);
    const size = Math.max(28 * u, Math.min(46 * u, z.width * .075));
    const header = clean ? 0 : (eyebrow ? Math.max(24 * u, size * .62) : 0) + (title ? size * 1.18 + 10 * u : 0);
    const footer = clean ? (title || caption ? 58 * u : 0) : caption ? Math.max(28 * u, size * .72) + 10 * u : 0;
    const media = fitAspectIntoRect({rect: {...z, y: z.y + header, height: Math.max(z.height - header - footer, 1)}, aspect: num(p.aspect, sourceWidth / sourceHeight), maxWidthRatio: .96, maxHeightRatio: .96, horizontalAlign: getPlacementHorizontalAlignment(placement)});
    const total = header + media.height + footer;
    const glass = !clean && p.surfaceMode === 'localizedGlass' ? 16 * u : 0;
    return {x: media.x - glass, y: z.y + Math.max((z.height - total) / 2, 0) - glass, width: media.width + glass * 2, height: total + glass * 2};
  }
  if (id === 'CalloutSpotlight') {
    const u = Math.min(width / 1920, height / 1080);
    const corner = variant === 'cornerFocus';
    const footer = corner ? (p.subtitle ? 54 * u : 0) : Math.min(zone.height * .28, 170 * u);
    const gap = corner ? 0 : Math.max(12 * u, zone.height * .025);
    const media = fitAspectIntoRect({rect: {...zone, height: Math.max(zone.height - footer - gap, 1)}, aspect: sourceWidth / sourceHeight, maxWidthRatio: .94, maxHeightRatio: .94, horizontalAlign: getPlacementHorizontalAlignment(placement)});
    const total = media.height + footer + gap;
    return {x: media.x, y: zone.y + Math.max((zone.height - total) / 2, 0), width: media.width, height: total};
  }
  if (id === 'ImpactToken' && ['keywordImpact', 'numberLanding', 'focusBeacon'].includes(variant)) {
    const number = variant === 'numberLanding' || p.mode === 'number';
    const b = panel(number ? 650 : 690, number ? 410 : 300), u = b.u;
    if (variant === 'numberLanding') return {x: b.x, y: b.y, width: 610 * u, height: 390 * u};
    const text = number ? `${num(p.value, 30)}${str(p.unit, '秒')}` : str(p.text, '自动化');
    const eyebrow = str(p.eyebrow, number ? '一个可验证的时间点' : '核心词');
    if (variant === 'focusBeacon') {
      const size = Math.min(142 * u, b.width * .9 / Math.max(text.length * .92, 2.5));
      const note = str(p.caption, number ? eyebrow : '');
      return union([{x: b.x, y: b.y, width: Math.max(34 * u + textWidth(text, size, Math.min(12 * u, size * .08)), 66 * u + textWidth(eyebrow, 19 * u, 4 * u)), height: 228 * u}, ...(note ? [{x: b.x + 38 * u, y: b.y + 230 * u, width: textWidth(note, 26 * u, 3 * u), height: 32 * u}] : [])], 3 * u);
    }
    const size = Math.min(146 * u, b.width * .94 / Math.max(text.length * .9, 2.3));
    const visibleWidth = Math.max(22 * u + textWidth(eyebrow, 24 * u, 5 * u), textWidth(text, size, Math.min(10 * u, size * .07)) * 1.045);
    return {x: b.x - 3 * u, y: b.y - 3 * u, width: visibleWidth + 6 * u, height: 48.8 * u + size * 1.18 + 6 * u};
  }
  if (id === 'SectionTitle') return getSectionTitleLayout({width, height, variantId: variant, payload: p}).bounds;
  if (id === 'InsightFocus' && variant === 'claimLanding') {
    const b = panel(690, 350, .52, 1.55, 700, 360), u = b.u;
    const setup = str(p.setup), headline = str(p.headline), payoff = str(p.payoff);
    const max = b.width - 34 * u;
    const setupHeight = setup ? lines(setup, 48 * u, max, 2 * u) * 62.4 * u : 0;
    const headlineY = b.y + setupHeight + (setup ? 16 * u : 0);
    const headlineHeight = lines(headline, 92 * u, max, 3 * u) * 108.56 * u;
    const boxes = [{x: b.x, y: b.y + 4 * u, width: 8 * u, height: 196 * u}, {x: b.x + 34 * u, y: headlineY, width: textWidth(headline, 92 * u, 3 * u, max), height: headlineHeight}];
    if (setup) boxes.push({x: b.x + 34 * u, y: b.y, width: textWidth(setup, 48 * u, 2 * u, max), height: setupHeight});
    if (payoff) boxes.push({x: b.x + 34 * u, y: headlineY + headlineHeight + 32 * u, width: textWidth(payoff, 28 * u, 3 * u, max), height: lines(payoff, 28 * u, max, 3 * u) * 34 * u});
    return union(boxes, 3 * u);
  }
  if (id === 'DefinitionReveal' && variant === 'termMeaning') {
    const b = panel(690, 430), u = b.u, term = str(p.term), meaning = str(p.definition), eyebrow = str(p.eyebrow, '一个概念');
    const size = Math.min(106 * u, b.width * .83 / Math.max(term.length * .92, 2.5));
    return union([{x: b.x, y: b.y + 38 * u, width: 22 * u, height: 256 * u}, {x: b.x + 56 * u, y: b.y, width: Math.max(textWidth(eyebrow, 24 * u, 6 * u), textWidth(term, size, 3 * u)), height: 43.8 * u + size * 1.05}, {x: b.x + 58 * u, y: b.y + 190 * u, width: Math.max(82 * u, textWidth(meaning, 43 * u, 0, 560 * u)), height: 28 * u + lines(meaning, 43 * u, 560 * u) * 58.05 * u}], 3 * u);
  }
  if (id === 'QuoteFrame' && variant === 'attributedQuote') {
    const b = panel(690, 470), u = b.u, quote = str(p.quote), attribution = str(p.attribution);
    const size = Math.min(55 * u, b.width * .82 / Math.max(Math.min(quote.length, 16) * .7, 7));
    return union([{x: b.x, y: b.y + 78 * u, width: 8 * u, height: 300 * u}, {x: b.x + 34 * u, y: b.y - 16 * u, width: 110 * u, height: 220 * u}, {x: b.x + 66 * u, y: b.y + 104 * u, width: textWidth(`“${quote}”`, size, 2 * u, 584 * u), height: lines(`“${quote}”`, size, 584 * u, 2 * u) * size * 1.42}, ...(attribution ? [{x: b.x + 66 * u, y: b.y + 400 * u, width: 74 * u + textWidth(attribution, 25 * u, 3 * u), height: 30 * u}] : [])], 3 * u);
  }
  if (id === 'VerdictStamp' && variant === 'judgmentSeal') {
    const b = panel(700, 410), u = b.u;
    // Stamp's steady -8deg rotation is part of its stable visible envelope.
    const side = 176 * u, rotated = side * (Math.cos(Math.PI * 8 / 180) + Math.sin(Math.PI * 8 / 180));
    const stamp = {x: b.x + b.width - 2 * u - side - (rotated - side) / 2, y: b.y + 186 * u - (rotated - side) / 2, width: rotated, height: rotated};
    const setup = str(p.setup), verdict = str(p.verdict), eyebrow = str(p.eyebrow, '核心结论');
    const size = Math.min(90 * u, b.width * .72 / Math.max(verdict.length * .88, 3.2));
    const setupH = setup ? 24 * u + lines(setup, 62 * u, 510 * u) * 73.16 * u : 0;
    const verdictY = b.y + 30 * u + setupH + (setup ? 4 : 42) * u;
    return union([stamp, {x: b.x, y: b.y, width: textWidth(eyebrow, 25 * u, 7 * u), height: 30 * u}, {x: b.x, y: verdictY, width: textWidth(verdict, size, u, 510 * u), height: lines(verdict, size, 510 * u, u) * size * 1.18}, {x: b.x, y: b.y + (setup ? 260 : 218) * u, width: 430 * u, height: 8 * u}, ...(setup ? [{x: b.x, y: b.y + 54 * u, width: textWidth(setup, 62 * u, 0, 510 * u), height: setupH - 24 * u}] : [])], 3 * u);
  }
  if (id === 'LogoWall' && ['peerTileWall', 'magneticCluster'].includes(variant)) {
    const n = Math.max(1, list(p.items).length), cluster = variant === 'magneticCluster';
    const cols = Math.max(1, Math.min(num(p.columns, cluster ? 3 : 2), n, cluster ? 3 : n)), rows = Math.ceil(n / cols);
    const bw = cluster ? cols * 250 + (cols - 1) * 20 + 96 : cols * 250 + (cols - 1) * 16;
    const header = p.title || p.eyebrow ? (cluster ? 96 : 78) : 0;
    const bh = cluster ? header + rows * 88 + (rows - 1) * 24 + 34 : 92 + rows * 94 + (rows - 1) * 14;
    const u = Math.max(cluster ? .68 : .72, Math.min(zone.width / bw, zone.height / bh, cluster ? 1.55 : 1.65));
    const w = Math.min(zone.width, bw * u), h = (cluster ? bh : header + rows * 80 + (rows - 1) * 14) * u;
    return {x: getAlignedX({zone, itemWidth: w, placement}), y: zone.y + (zone.height - h) / 2, width: w, height: h};
  }
  if (id === 'ConditionGate' && variant === 'validationGate') {
    const b = panel(940, 360, .64), u = b.u;
    const criteriaH = Math.min(3, list(p.conditions).length) * 66 - 8;
    return {x: b.x, y: b.y, width: b.width, height: Math.max(319, criteriaH) * u};
  }
  if (id === 'CauseEffectChain' && ['causalHandoff', 'energyChain'].includes(variant)) {
    const nodes = [p.cause, ...(p.mechanism ? [p.mechanism] : []), p.effect] as Record<string, unknown>[];
    if (variant === 'energyChain') {
      const b = panel(nodes.length === 3 ? 960 : 720, 330, .66, 1.48), u = b.u, size = nodes.length === 3 ? 184 : 200;
      const detail = nodes.some(n => n?.detail);
      return {x: b.x - 4 * u, y: b.y + 34 * u, width: b.width + 8 * u, height: (size + (detail ? 41 : 8)) * u};
    }
    const bw = nodes.length === 3 ? 980 : 700, u = Math.max(.68, Math.min(zone.width / bw, zone.height / 320, 1.55));
    const h = Math.max(...nodes.map(n => 42 + 24 + 14 + lines(str(n?.title), 42, 258) * 45.36)) * u;
    const detail = nodes.some(n => n?.detail) ? 37.5 * u : 0;
    return {x: getAlignedX({zone, itemWidth: bw * u, placement}), y: zone.y + (zone.height - h) / 2, width: bw * u, height: h + detail};
  }
  if (id === 'FlowCarrier' && variant === 'stageTransfer') {
    const b = panel(960, 350, .68), u = b.u;
    const n = Math.max(1, Math.min(4, list(p.stages).length));
    const nodeYs = Array.from({length: n}, (_, i) => (i % 2 === 0 ? 122 : 228) * u);
    const halfCard = (n === 4 ? 196 : 222) / 2;
    return {x: b.x + (100 - halfCard - 4) * u, y: b.y + Math.min(...nodeYs) - 115 * u, width: ((n === 1 ? 0 : 760) + halfCard * 2 + 8) * u, height: Math.max(...nodeYs) + 56 * u - (Math.min(...nodeYs) - 115 * u)};
  }
  return null;
}
