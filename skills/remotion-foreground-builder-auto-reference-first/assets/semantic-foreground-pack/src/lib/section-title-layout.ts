import {estimateTextWidth} from './content-sizing';
import {getMasterAlignmentTokens} from './layout';

// One deterministic layout for artwork, selection and exported compositions.
const wrap = (text: string, size: number, spacing: number, width: number) => text.split('\n').flatMap(part => {
  const rows: string[] = []; let row = '';
  for (const char of part) {
    if (row && estimateTextWidth(row + char, size, spacing) > width * .96) {rows.push(row); row = '';}
    row += char;
  }
  rows.push(row); return rows;
});
export const getSectionTitleLayout = ({width, height, variantId, payload}: {
  width: number; height: number; variantId: string; payload: Record<string, unknown>;
}) => {
  const portrait = height > width;
  const u = portrait ? width / 900 : Math.min(width / 2560, height / 1440);
  const v2 = variantId === 'referenceV2';
  const chineseSize = typeof payload.chineseFontSize === 'number' && Number.isFinite(payload.chineseFontSize)
    ? Math.min(48, Math.max(34, payload.chineseFontSize)) : 38;
  const fontSize = (v2 ? chineseSize : 46) * u;
  const maxWidth = portrait ? width * .82 : width * .46;
  const boxWidth = v2 ? Math.min(660 * u, maxWidth) : maxWidth;
  const headline = String(payload.headline || '本段重点');
  const setup = typeof payload.setup === 'string' ? payload.setup : '';
  const headlineLines = wrap(headline, fontSize, (v2 ? -.8 : -1.1) * u, boxWidth);
  const setupLines = setup ? wrap(setup, 22 * u, .7 * u, boxWidth) : [];
  const lineHeight = fontSize * (v2 ? 1.08 : 1.13);
  const actualWidth = v2 ? boxWidth : Math.min(boxWidth, Math.max(82 * u,
    ...headlineLines.map(s => estimateTextWidth(s, fontSize, -1.1 * u)),
    ...setupLines.map(s => estimateTextWidth(s, 22 * u, .7 * u))) + 2 * u);
  const boxHeight = v2 ? (17 + 15 + 16 + 1) * u + headlineLines.length * lineHeight
    : 21 * u + headlineLines.length * lineHeight + (setupLines.length ? 8 * u + setupLines.length * 26.4 * u : 0);
  return {u, fontSize, lineHeight, headlineLines, setupLines,
    bounds: {x: getMasterAlignmentTokens({width, height}).sectionTitleLeft,
      y: portrait ? height * .035 : (v2 ? 100 : 82) * u, width: actualWidth, height: boxHeight}};
};
