import {resolveComponentStyleMode, type EditProject, type EditAsset, type ForegroundEvent} from './types';
import {getSemanticVisibleBounds} from './legacy-semantic-foreground-pack/lib/visible-bounds';
import {getEditorialTrialBounds, isEditorialTrial} from './editorialTrialLayout';
import {getGraphicSceneBounds, isGraphicScene} from './graphicSceneModel';
import {buildAtomicSceneGraph, isAtomicSceneEvent} from './atomicSceneModel';
import {estimateWrappedLineCount} from './atomic-semantic-foreground-pack/lib/content-sizing';
import {
  getBranchOutcomeRowsLayout,
  getCompactExplanationStackLayout,
  getIconClassificationLayout,
  getStepRailLayout,
  type IconClassificationCategory,
  type IconClassificationSummary,
  type SemanticIconName,
} from './legacy-semantic-foreground-pack';
import {
  getAlignedX,
  getForegroundZone,
  getMasterAlignmentTokens,
  getPlacementHorizontalAlignment,
  fitAspectIntoRect,
  type ForegroundPlacement,
} from './atomic-semantic-foreground-pack/lib/layout';

export type NormalizedPlacementBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

export type CalloutTargetGeometry = {
  panel: NormalizedPlacementBox;
  target: NormalizedPlacementBox;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export const isRecordedDemoTakeover = (event: ForegroundEvent) => {
  if (event.componentId !== 'MediaFrame' || event.variantId !== 'recordedDemo') return false;
  const presentationScale = (event.payload as {presentationScale?: unknown}).presentationScale;
  return presentationScale !== 'large' && presentationScale !== 'local';
};

export const isCanvasTransformLocked = (event: ForegroundEvent) => {
  const presentationScale = (event.payload as {presentationScale?: unknown}).presentationScale;
  return (
    ['fullscreen', 'full-frame'].includes(event.placement.preset) ||
    presentationScale === 'detailTakeover' ||
    isRecordedDemoTakeover(event)
  );
};

const getTitleAlignmentInset = (frameWidth: number, frameHeight: number) =>
  (108 * Math.min(frameWidth / 2560, frameHeight / 1440)) / frameWidth;

const normalizedPreset = (preset: string) => {
  const aliases: Record<string, string> = {
    'top-left': 'leftMiddle',
    'top-center': 'upperCenterSafe',
    'top-right': 'rightMiddle',
    'middle-left': 'leftMiddle',
    'middle-center': 'centerTakeover',
    'middle-right': 'rightMiddle',
    'bottom-left': 'leftLowerSafe',
    'bottom-center': 'centerTakeover',
    'bottom-right': 'rightLowerSafe',
    'full-frame': 'fullscreen',
    centerSafe: 'centerTakeover',
  };
  return aliases[preset] || preset;
};

const toForegroundPlacement = (preset: string): ForegroundPlacement => {
  const normalized = normalizedPreset(preset);
  if (
    normalized === 'leftMiddle' ||
    normalized === 'rightMiddle' ||
    normalized === 'leftLowerSafe' ||
    normalized === 'rightLowerSafe' ||
    normalized === 'upperCenterSafe' ||
    normalized === 'centerSafe'
  ) {
    return normalized;
  }
  if (normalized === 'fullWidthUpper') return 'upperCenterSafe';
  return 'centerSafe';
};

type ConceptComparisonSide = {
  label?: unknown;
  title?: unknown;
  subtitle?: unknown;
  badge?: unknown;
  accentColor?: unknown;
  items?: unknown;
};

const getConceptComparisonVisibleBox = (
  event: ForegroundEvent,
  frameWidth: number,
  frameHeight: number,
): NormalizedPlacementBox | null => {
  if (event.componentId !== 'ConceptComparisonCards') return null;
  const payload = event.payload as {title?: unknown; sides?: unknown};
  if (!Array.isArray(payload.sides) || payload.sides.length < 2) return null;

  const sides = payload.sides.slice(0, 2) as ConceptComparisonSide[];
  const placement = toForegroundPlacement(event.placement.preset);
  const zone = getForegroundZone({width: frameWidth, height: frameHeight, placement});
  const title = typeof payload.title === 'string' ? payload.title : '';
  const normalizePixels = (box: {x: number; y: number; width: number; height: number}) => ({
    x: box.x / frameWidth,
    y: box.y / frameHeight,
    width: box.width / frameWidth,
    height: box.height / frameHeight,
  });

  if (event.variantId === 'branchOutcomeRows') {
    const branchSides = sides.map((side) => {
      const firstItem = Array.isArray(side.items) && side.items[0] && typeof side.items[0] === 'object'
        ? side.items[0] as Record<string, unknown>
        : {};
      return {
        label: typeof side.label === 'string' ? side.label : '',
        title: typeof side.title === 'string' ? side.title : '',
        accentColor: typeof side.accentColor === 'string' ? side.accentColor : undefined,
        showAtInFrames: 0,
        items: [{text: typeof firstItem.text === 'string' ? firstItem.text : '', showAtInFrames: 0}],
      };
    }) as any;
    const layout = getBranchOutcomeRowsLayout({
      width: frameWidth,
      height: frameHeight,
      placement,
      sides: branchSides,
    });
    const transformed = (id: string, box: {x: number; y: number; width: number; height: number}) => {
      const override = event.elementOverrides?.[id];
      const scale = Math.max(.1, override?.scale ?? 1);
      return {
        x: box.x + (override?.x || 0) * frameWidth + box.width * (1 - scale) / 2,
        y: box.y + (override?.y || 0) * frameHeight + box.height * (1 - scale) / 2,
        width: box.width * scale,
        height: box.height * scale,
      };
    };
    const rowFrames = layout.rows.map((row, index) => {
      const condition = transformed(`branch-condition.${index + 1}`, row.condition);
      const outcome = transformed(`branch-result.${index + 1}`, row.outcome);
      const padding = 20 * layout.unit;
      const left = Math.min(condition.x, outcome.x) - padding;
      const top = Math.min(condition.y, outcome.y) - padding;
      const right = Math.max(condition.x + condition.width, outcome.x + outcome.width) + padding;
      const bottom = Math.max(condition.y + condition.height, outcome.y + outcome.height) + padding;
      return {x: left, y: top, width: right - left, height: bottom - top};
    });
    const padding = 6 * layout.unit;
    const left = Math.min(...rowFrames.map((box) => box.x)) - padding;
    const top = Math.min(...rowFrames.map((box) => box.y)) - padding;
    const right = Math.max(...rowFrames.map((box) => box.x + box.width)) + padding;
    const bottom = Math.max(...rowFrames.map((box) => box.y + box.height)) + padding;
    return normalizePixels({x: left, y: top, width: right - left, height: bottom - top});
  }

  if (event.variantId === 'neonMirrorCompare') {
    const itemCount = (side: ConceptComparisonSide) =>
      Array.isArray(side.items) ? Math.min(side.items.length, 5) : 0;
    const pairCount = Math.max(...sides.map(itemCount));
    const hasAuxiliary = sides.some(
      (side) => Boolean(side.subtitle || side.badge),
    );
    const mirrorBaseHeight =
      (title ? 84 : 0) +
      108 +
      (hasAuxiliary ? 36 : 0) +
      pairCount * 78 +
      Math.max(0, pairCount - 1) * 14;
    const mirrorUnit = Math.max(
      0.68,
      Math.min(zone.width / 940, zone.height / Math.max(mirrorBaseHeight, 1), 1.46),
    );
    const mirrorWidth = Math.min(zone.width, 940 * mirrorUnit);
    const mirrorHeight = mirrorBaseHeight * mirrorUnit;
    return normalizePixels({
      x: getAlignedX({zone, itemWidth: mirrorWidth, placement}),
      y: zone.y + Math.max((zone.height - mirrorHeight) / 2, 0),
      width: mirrorWidth,
      height: mirrorHeight,
    });
  }

  const maxItems = Math.max(
    ...sides.map((side) => (Array.isArray(side.items) ? Math.min(side.items.length, 5) : 0)),
  );
  const baseCardWidth = 450;
  const titleSize = 54;
  const subtitleSize = 32;
  const maxTitleLines = Math.max(
    ...sides.map((side) => estimateWrappedLineCount({
      text: typeof side.title === 'string' ? side.title : '',
      fontSize: titleSize,
      availableWidth: baseCardWidth - 48,
    })),
  );
  const maxSubtitleLines = Math.max(
    ...sides.map((side) => typeof side.subtitle === 'string'
      ? estimateWrappedLineCount({
        text: side.subtitle,
        fontSize: subtitleSize,
        availableWidth: baseCardWidth - 48,
      })
      : 0),
  );
  const cardHeightBase = 24 + 22 + 9 + maxTitleLines * titleSize * 1.08 + 24;
  const auxiliaryHeightBase =
    (maxSubtitleLines ? 12 + maxSubtitleLines * 25 * 1.22 : 0) +
    (maxItems ? 14 + 12 + maxItems * 30 * 1.18 + Math.max(0, maxItems - 1) * 10 : 0);
  const baseHeight = (title ? 96 : 12) + cardHeightBase + auxiliaryHeightBase;
  const unit = Math.max(
    0.76,
    Math.min(zone.width / 920, zone.height / Math.max(baseHeight, 1), 1.48),
  );
  const panelWidth = Math.min(zone.width, 920 * unit);
  const panelHeight = baseHeight * unit;
  return normalizePixels({
    x: getAlignedX({zone, itemWidth: panelWidth, placement}),
    y: zone.y + (zone.height - panelHeight) / 2,
    width: panelWidth,
    height: panelHeight,
  });
};

const getFormFillSequenceVisibleBox = (
  event: ForegroundEvent,
  frameWidth: number,
  frameHeight: number,
): NormalizedPlacementBox | null => {
  if (event.componentId !== 'FormFillSequence' || !['stepRail', 'compactExplanationStack'].includes(event.variantId)) return null;
  const payload = event.payload as {title?: unknown; eyebrow?: unknown; resultLabel?: unknown; steps?: unknown};
  const stepCount = Array.isArray(payload.steps) ? Math.max(1, Math.min(5, payload.steps.length)) : 1;
  const common = {
    width: frameWidth,
    height: frameHeight,
    placement: toForegroundPlacement(event.placement.preset),
    stepCount,
    hasResult: typeof payload.resultLabel === 'string' && payload.resultLabel.length > 0,
  };
  const layout = event.variantId === 'compactExplanationStack'
    ? getCompactExplanationStackLayout({
        ...common,
        hasHeader: [payload.title, payload.eyebrow].some((value) => typeof value === 'string' && value.length > 0),
      })
    : getStepRailLayout({
        ...common,
        hasTitle: typeof payload.title === 'string' && payload.title.length > 0,
      });
  const boxes = [
    {x: layout.x, y: layout.y, width: layout.width, height: layout.height},
    ...layout.rows.map((box, index) => {
      const override = event.elementOverrides?.[`sequence-step.${index + 1}`];
      const scale = Math.max(.1, override?.scale ?? 1);
      return {
        x: box.x + (override?.x || 0) * frameWidth + box.width * (1 - scale) / 2,
        y: box.y + (override?.y || 0) * frameHeight + box.height * (1 - scale) / 2,
        width: box.width * scale,
        height: box.height * scale,
      };
    }),
  ];
  const padding = 6 * layout.unit;
  const left = Math.min(...boxes.map((box) => box.x)) - padding;
  const top = Math.min(...boxes.map((box) => box.y)) - padding;
  const right = Math.max(...boxes.map((box) => box.x + box.width)) + padding;
  const bottom = Math.max(...boxes.map((box) => box.y + box.height)) + padding;
  return {
    x: left / frameWidth,
    y: top / frameHeight,
    width: (right - left) / frameWidth,
    height: (bottom - top) / frameHeight,
  };
};

// Mirrors the approved balancedTree geometry, including independently moved
// inner cards. Never use its 920px transparent layout panel as a visible box.
const getHierarchyVisibleBox = (
  event: ForegroundEvent,
  frameWidth: number,
  frameHeight: number,
): NormalizedPlacementBox | null => {
  if (event.componentId !== 'HierarchyTree' || ['radialHub', 'iconClassification'].includes(event.variantId)) return null;
  const children = (Array.isArray(event.payload.children) ? event.payload.children : []).slice(0, 4) as Array<{title?: string; detail?: string}>;
  const placement = toForegroundPlacement(event.placement.preset);
  const zone = getForegroundZone({width: frameWidth, height: frameHeight, placement});
  const lines = Math.max(1, ...children.map((child) => estimateWrappedLineCount({text: child.title || '', fontSize: 27, availableWidth: 182})));
  const childHeight = 18 + 16 + 8 + lines * 27 * 1.05 + 18;
  const baseHeight = 216 + childHeight + (children.some((child) => child.detail) ? 38 : 0);
  const unit = Math.max(0.65, Math.min(zone.width / 920, zone.height / baseHeight, 1.55));
  const panelWidth = 920 * unit;
  const panelX = getAlignedX({zone, itemWidth: panelWidth, placement});
  const panelY = zone.y + (zone.height - baseHeight * unit) / 2;
  const childWidth = Math.min(210 * unit, (panelWidth - 24 * unit * Math.max(0, children.length - 1)) / Math.max(1, children.length));
  const childGap = children.length > 1 ? (panelWidth - childWidth * children.length) / (children.length - 1) : 0;
  const boxes: NormalizedPlacementBox[] = [];
  const add = (id: string, x: number, y: number, width: number, height: number) => {
    const override = event.elementOverrides?.[id];
    const scale = override?.scale ?? 1;
    boxes.push({
      x: x + (override?.x || 0) * frameWidth + width * (1 - scale) / 2,
      y: y + (override?.y || 0) * frameHeight + height * (1 - scale) / 2,
      width: width * scale,
      height: height * scale,
    });
  };
  add('hierarchy-root.1', panelX + (panelWidth - 300 * unit) / 2, panelY, 300 * unit, 112 * unit);
  children.forEach((child, index) => {
    const x = panelX + index * (childWidth + childGap);
    const y = panelY + 216 * unit;
    add(`hierarchy-child.${index + 1}`, x, y, childWidth, childHeight * unit);
    // Auxiliary copy is a sibling of the transformed surface, not inside it.
    if (child.detail) boxes.push({x, y: y + (childHeight + 9) * unit, width: childWidth, height: 19.2 * unit});
  });
  const padding = 4 * unit; // small stroke/glow allowance, not unused host space
  const left = Math.min(...boxes.map((box) => box.x)) - padding;
  const top = Math.min(...boxes.map((box) => box.y)) - padding;
  const right = Math.max(...boxes.map((box) => box.x + box.width)) + padding;
  const bottom = Math.max(...boxes.map((box) => box.y + box.height)) + padding;
  return {x: left / frameWidth, y: top / frameHeight, width: (right - left) / frameWidth, height: (bottom - top) / frameHeight};
};

const getHierarchyIconClassificationVisibleBox = (
  event: ForegroundEvent,
  frameWidth: number,
  frameHeight: number,
): NormalizedPlacementBox | null => {
  if (event.componentId !== 'HierarchyTree' || event.variantId !== 'iconClassification') return null;
  const payload = event.payload as Record<string, unknown>;
  const records = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const categories: IconClassificationCategory[] = (Array.isArray(payload.categoryItems) ? payload.categoryItems : []).slice(0, 4).map((raw) => {
    const item = records(raw);
    return {
      label: String(item.label || ''),
      icon: (typeof item.icon === 'string' ? item.icon : 'layers') as SemanticIconName,
      showAtInFrames: 0,
      accentColor: typeof item.accentColor === 'string' ? item.accentColor : undefined,
    };
  });
  const legacyChild = records(Array.isArray(payload.children) ? payload.children[0] : undefined);
  const summaryRecord = records(payload.summary);
  const legacyCount = String(legacyChild.title || '').match(/\d+/)?.[0];
  const summary: IconClassificationSummary = {
    label: String(summaryRecord.label || payload.libraryLabel || legacyChild.detail || legacyChild.title || '分类库'),
    count: typeof summaryRecord.count === 'number' ? summaryRecord.count : legacyCount ? Number(legacyCount) : undefined,
    icon: (typeof summaryRecord.icon === 'string' ? summaryRecord.icon : 'sceneLibrary') as SemanticIconName,
    showAtInFrames: 0,
  };
  const layout = getIconClassificationLayout({
    width: frameWidth,
    height: frameHeight,
    placement: toForegroundPlacement(event.placement.preset),
    categoryItems: categories,
    summary,
  });
  const boxes = [
    ...layout.categories.map((box, index) => ({id: `semantic-category.${index + 1}`, ...box})),
    {id: 'scene-library.1', ...layout.summary},
  ].map((box) => {
    const override = event.elementOverrides?.[box.id];
    const scale = Math.max(.1, override?.scale ?? 1);
    return {
      x: box.x + (override?.x || 0) * frameWidth + box.width * (1 - scale) / 2,
      y: box.y + (override?.y || 0) * frameHeight + box.height * (1 - scale) / 2,
      width: box.width * scale,
      height: box.height * scale,
    };
  });
  if (!boxes.length) return null;
  const padding = 6 * layout.unit;
  const left = Math.min(...boxes.map((box) => box.x)) - padding;
  const top = Math.min(...boxes.map((box) => box.y)) - padding;
  const right = Math.max(...boxes.map((box) => box.x + box.width)) + padding;
  const bottom = Math.max(...boxes.map((box) => box.y + box.height)) + padding;
  return {x: left / frameWidth, y: top / frameHeight, width: (right - left) / frameWidth, height: (bottom - top) / frameHeight};
};

const getAtomicVisibleBox = (
  event: ForegroundEvent,
  frameWidth: number,
  frameHeight: number,
): NormalizedPlacementBox | null => {
  if (!isAtomicSceneEvent(event)) return null;
  const placement = toForegroundPlacement(event.placement.preset);
  let graph;
  try {
    graph = buildAtomicSceneGraph(event);
  } catch {
    return null;
  }
  const referenceSequence = ['reference-v3-editorial', 'reference-cumulative-signals'].includes(graph.metadata.visualStyle || '');
  const alignment = getMasterAlignmentTokens({width: frameWidth, height: frameHeight});
  const hostZone = referenceSequence && (placement.startsWith('left') || placement.startsWith('right'))
    ? {
        x: placement.startsWith('right') ? frameWidth * (1 - 0.039 - 0.235) : alignment.sectionTitleLeft - frameWidth * 0.235 * 0.01,
        y: frameHeight * 0.18,
        width: frameWidth * 0.235,
        height: frameHeight * 0.38,
      }
    : getForegroundZone({width: frameWidth, height: frameHeight, placement});
  const zone = graph.metadata.lockedLayoutAspect
    ? fitAspectIntoRect({rect: hostZone, aspect: graph.metadata.lockedLayoutAspect, horizontalAlign: getPlacementHorizontalAlignment(placement)})
    : hostZone;

  // Approved presentation renderers own fixed internal geometry and use their
  // fitted zone as the stable editing envelope.
  if (graph.presentation || graph.atoms.length === 0) {
    return {x: zone.x / frameWidth, y: zone.y / frameHeight, width: zone.width / frameWidth, height: zone.height / frameHeight};
  }

  const points: Array<{x: number; y: number}> = [];
  for (const atom of graph.atoms) {
    if ('bounds' in atom) {
      points.push({x: atom.bounds.x, y: atom.bounds.y});
      points.push({x: atom.bounds.x + atom.bounds.width, y: atom.bounds.y + atom.bounds.height});
    } else if (atom.kind === 'connector') {
      points.push(atom.from, atom.to);
    } else if (atom.kind === 'carrier') {
      const halfWidth = atom.size.width / 2;
      const halfHeight = atom.size.height / 2;
      for (const point of [atom.start, ...atom.segments.map((segment) => segment.to)]) {
        points.push({x: point.x - halfWidth, y: point.y - halfHeight});
        points.push({x: point.x + halfWidth, y: point.y + halfHeight});
      }
    }
  }
  if (!points.length) return null;
  const minX = clamp(Math.min(...points.map((point) => point.x)), 0, 1);
  const minY = clamp(Math.min(...points.map((point) => point.y)), 0, 1);
  const maxX = clamp(Math.max(...points.map((point) => point.x)), 0, 1);
  const maxY = clamp(Math.max(...points.map((point) => point.y)), 0, 1);
  const paddingX = Math.min(6 / frameWidth, zone.width / frameWidth * 0.012);
  const paddingY = Math.min(6 / frameHeight, zone.height / frameHeight * 0.012);
  const left = zone.x / frameWidth + minX * zone.width / frameWidth - paddingX;
  const top = zone.y / frameHeight + minY * zone.height / frameHeight - paddingY;
  const right = zone.x / frameWidth + maxX * zone.width / frameWidth + paddingX;
  const bottom = zone.y / frameHeight + maxY * zone.height / frameHeight + paddingY;
  return {x: left, y: top, width: right - left, height: bottom - top};
};

/**
 * Stable, fully-expanded visible envelope for components whose transparent
 * full-frame host is larger than their rendered content.
 */
const getLegacyVisiblePlacementBox = (
  event: ForegroundEvent,
  frameWidth: number,
  frameHeight: number,
): NormalizedPlacementBox =>
  getGraphicSceneBounds(event, frameWidth, frameHeight) ??
  getEditorialTrialBounds(event, frameWidth, frameHeight) ??
  getAtomicVisibleBox(event, frameWidth, frameHeight) ??
  getHierarchyIconClassificationVisibleBox(event, frameWidth, frameHeight) ??
  getHierarchyVisibleBox(event, frameWidth, frameHeight) ??
  getConceptComparisonVisibleBox(event, frameWidth, frameHeight) ??
  getFormFillSequenceVisibleBox(event, frameWidth, frameHeight) ??
  getDefaultPlacementBox(event, frameWidth, frameHeight);

export const getDefaultVisiblePlacementBox = (
  event: ForegroundEvent, frameWidth: number, frameHeight: number,
): NormalizedPlacementBox => {
  const rect = getSemanticVisibleBounds({componentId: event.componentId, variantId: event.variantId,
    payload: event.componentId === 'SectionTitle' ? {...event.payload, headline: event.payload.headline || event.anchorText || '本段重点'} : event.payload, placement: toForegroundPlacement(event.placement.preset), width: frameWidth, height: frameHeight});
  return rect ? {x: rect.x / frameWidth, y: rect.y / frameHeight, width: rect.width / frameWidth, height: rect.height / frameHeight}
    : getLegacyVisiblePlacementBox(event, frameWidth, frameHeight);
};

const getTransformReferenceBox = (
  event: ForegroundEvent,
  frameWidth: number,
  frameHeight: number,
) => event.placement.boundsVersion === 2
  ? getDefaultVisiblePlacementBox(event, frameWidth, frameHeight)
  : event.placement.boundsMode === 'visibleContent'
  ? getLegacyVisiblePlacementBox(event, frameWidth, frameHeight)
  : getDefaultPlacementBox(event, frameWidth, frameHeight);

export const getDefaultPlacementBox = (
  event: ForegroundEvent,
  frameWidth: number,
  frameHeight: number,
): NormalizedPlacementBox => {
  if (event.semanticLayer === 'title') {
    return {x: 0.042, y: 0.055, width: 0.44, height: 0.14};
  }

  if (isRecordedDemoTakeover(event)) {
    return {x: 0.035, y: 0.045, width: 0.93, height: 0.82};
  }

  const presentationScale = (event.payload as {presentationScale?: unknown}).presentationScale;
  if (
    event.componentId === 'MediaFrame' &&
    event.variantId === 'recordedDemo' &&
    presentationScale === 'large'
  ) {
    const portrait = frameHeight > frameWidth;
    return portrait
      ? {x: 0.06, y: 0.12, width: 0.88, height: 0.7}
      : {x: 0.08, y: 0.15, width: 0.84, height: 0.7};
  }

  const preset = normalizedPreset(event.placement.preset);
  if (
    event.componentId === 'BRollStack' &&
    event.variantId === 'evidenceTrack' &&
    ['centerTakeover', 'upperCenterSafe'].includes(preset)
  ) {
    const portrait = frameHeight > frameWidth;
    return {
      x: 0.06,
      y: portrait ? 0.19 : 0.11,
      width: 0.88,
      height: portrait ? 0.46 : 0.74,
    };
  }
  if (preset === 'fullscreen') {
    return {x: 0.035, y: 0.045, width: 0.93, height: 0.82};
  }

  const safeLeft = getTitleAlignmentInset(frameWidth, frameHeight);
  const safeTop = 100 / 1080;
  const portrait = frameHeight > frameWidth;
  const safeWidth = 1 - safeLeft * 2;
  const safeHeight = 1 - safeTop * 2;
  const sideWidth = portrait ? safeWidth * 0.88 : 0.34;
  const sideHeight = portrait ? safeHeight * 0.42 : safeHeight * 0.62;
  const leftX = safeLeft;
  const rightX = 1 - safeLeft - sideWidth;
  const middleY = portrait ? safeTop + safeHeight * 0.18 : 0.22;
  const lowerY = portrait ? 0.48 : 0.47;

  switch (preset) {
    case 'leftMiddle':
      return {x: leftX, y: middleY, width: sideWidth, height: sideHeight};
    case 'rightMiddle':
      return {x: rightX, y: middleY, width: sideWidth, height: sideHeight};
    case 'leftLowerSafe':
      return {x: leftX, y: lowerY, width: sideWidth, height: Math.max(0.12, 1 - safeTop - lowerY)};
    case 'rightLowerSafe':
      return {x: rightX, y: lowerY, width: sideWidth, height: Math.max(0.12, 1 - safeTop - lowerY)};
    case 'upperCenterSafe':
    case 'fullWidthUpper': {
      const width = portrait ? safeWidth * 0.9 : 0.62;
      return {
        x: (1 - width) / 2,
        y: portrait ? 0.17 : 0.15,
        width,
        height: portrait ? safeHeight * 0.3 : safeHeight * 0.36,
      };
    }
    case 'splitLeftRight':
    case 'centerTakeover':
    default: {
      const width = portrait ? safeWidth * 0.94 : 0.64;
      const height = portrait ? safeHeight * 0.56 : safeHeight * 0.64;
      return {x: (1 - width) / 2, y: safeTop + (safeHeight - height) / 2, width, height};
    }
  }
};

export const getEventPlacementBox = (
  event: ForegroundEvent,
  frameWidth: number,
  frameHeight: number,
): NormalizedPlacementBox => {
  const fallback = getTransformReferenceBox(event, frameWidth, frameHeight);
  if (isCanvasTransformLocked(event)) return fallback;
  if (
    event.placement.mode !== 'normalized' ||
    typeof event.placement.x !== 'number' ||
    typeof event.placement.y !== 'number' ||
    typeof event.placement.width !== 'number' ||
    typeof event.placement.height !== 'number'
  ) {
    return fallback;
  }

  // Small real content (e.g. a short text line) must not acquire invisible padding.
  // A migrated box also must not be clamped a second time and move the artwork.
  if (event.placement.boundsVersion === 2) return {x: event.placement.x, y: event.placement.y,
    width: Math.max(1 / frameWidth, event.placement.width), height: Math.max(1 / frameHeight, event.placement.height)};
  const width = clamp(event.placement.width, 0.08, 1);
  const height = clamp(event.placement.height, 0.06, 1);
  return {
    x: clamp(event.placement.x, 0, 1 - width),
    y: clamp(event.placement.y, 0, 1 - height),
    width,
    height,
  };
};

export const getEventTranslation = (
  event: ForegroundEvent,
  frameWidth: number,
  frameHeight: number,
) => {
  if (event.placement.mode !== 'normalized' || isCanvasTransformLocked(event)) return {x: 0, y: 0};
  const fallback = getTransformReferenceBox(event, frameWidth, frameHeight);
  const actual = getEventPlacementBox(event, frameWidth, frameHeight);
  return {
    x: (actual.x + actual.width / 2 - fallback.x - fallback.width / 2) * frameWidth,
    y: (actual.y + actual.height / 2 - fallback.y - fallback.height / 2) * frameHeight,
  };
};

export const getEventScale = (
  event: ForegroundEvent,
  frameWidth: number,
  frameHeight: number,
) => {
  if (event.placement.mode !== 'normalized' || isCanvasTransformLocked(event)) return 1;
  const fallback = getTransformReferenceBox(event, frameWidth, frameHeight);
  const actual = getEventPlacementBox(event, frameWidth, frameHeight);
  const widthScale = actual.width / Math.max(0.0001, fallback.width);
  const heightScale = actual.height / Math.max(0.0001, fallback.height);
  // Visible-content boxes already obey canvas limits. A second hidden scale
  // cap would let the handles grow while the artwork stops at 240%.
  if (event.placement.boundsMode === 'visibleContent') return (widthScale + heightScale) / 2;
  return clamp((widthScale + heightScale) / 2, 0.35, 2.4);
};

export const getEventTransformOrigin = (
  event: ForegroundEvent,
  frameWidth: number,
  frameHeight: number,
) => {
  const fallback = getTransformReferenceBox(event, frameWidth, frameHeight);
  return {
    x: (fallback.x + fallback.width / 2) * frameWidth,
    y: (fallback.y + fallback.height / 2) * frameHeight,
  };
};

/** Upgrade the coordinate contract, preserving the old affine transform exactly.
 * Presence of boundsMode alone is not a migration marker: older compilers wrote
 * 'visibleContent' even when that component fell back to a layout-zone resolver.
 */
export const migrateVisiblePlacement = (
  event: ForegroundEvent, frameWidth: number, frameHeight: number,
): ForegroundEvent => {
  if (isCanvasTransformLocked(event) || event.placement.boundsVersion === 2) return event;
  // Old title boxes never affected the artwork. Start from the shared default;
  // versioned manual placements are preserved above, including save/reopen.
  if (event.semanticLayer === 'title' || event.componentId === 'SectionTitle') return {...event, placement: {
    mode: 'preset', preset: 'leftMiddle', alignmentToken: 'sectionTitleLeft', visibleEdge: 'left', align: 'left',
    zIndex: event.placement.zIndex ?? 42, boundsMode: 'visibleContent', boundsVersion: 2}};
  const rect = getSemanticVisibleBounds({componentId: event.componentId, variantId: event.variantId,
    payload: event.componentId === 'SectionTitle' ? {...event.payload, headline: event.payload.headline || event.anchorText || '本段重点'} : event.payload, placement: toForegroundPlacement(event.placement.preset), width: frameWidth, height: frameHeight});
  if (!rect) return event;
  const visible = {x: rect.x / frameWidth, y: rect.y / frameHeight, width: rect.width / frameWidth, height: rect.height / frameHeight};
  if (event.placement.mode !== 'normalized') return {...event, placement: {...event.placement, boundsMode: 'visibleContent', boundsVersion: 2}};
  const scale = getEventScale(event, frameWidth, frameHeight);
  const origin = getEventTransformOrigin(event, frameWidth, frameHeight);
  const translation = getEventTranslation(event, frameWidth, frameHeight);
  return {...event, placement: {...event.placement, boundsMode: 'visibleContent', boundsVersion: 2,
    x: (origin.x + (visible.x * frameWidth - origin.x) * scale + translation.x) / frameWidth,
    y: (origin.y + (visible.y * frameHeight - origin.y) * scale + translation.y) / frameHeight,
    width: visible.width * scale, height: visible.height * scale,
  }};
};

/** Attach the same source dimensions used by the renderer, then migrate once. */
export const normalizeProjectPlacement = (project: EditProject): EditProject => {
  if (resolveComponentStyleMode(project) !== 'legacy') return {...project, timeline: {...project.timeline,
    foregroundEvents: project.timeline.foregroundEvents.map(event => {
      if (event.placement.boundsVersion !== 2) return event;
      const next = {...event, placement: {...event.placement}};
      delete next.placement.boundsVersion;
      if (event.placement.mode !== 'normalized') return next;
      const ref = getTransformReferenceBox(next, project.composition.width, project.composition.height);
      const origin = getEventTransformOrigin(event, project.composition.width, project.composition.height);
      const translate = getEventTranslation(event, project.composition.width, project.composition.height);
      const scale = getEventScale(event, project.composition.width, project.composition.height);
      next.placement = {...next.placement, x: (origin.x + (ref.x * project.composition.width - origin.x) * scale + translate.x) / project.composition.width,
        y: (origin.y + (ref.y * project.composition.height - origin.y) * scale + translate.y) / project.composition.height,
        width: ref.width * scale, height: ref.height * scale};
      return next;
    })}};
  return {...project, timeline: {...project.timeline, foregroundEvents: project.timeline.foregroundEvents.map((source) => {
    let event = source;
    if (['MediaFrame', 'CalloutSpotlight'].includes(event.componentId)) {
      const asset = (event.assetIds || []).map(id => project.assets.find(a => a.id === id && a.status === 'ready')).find(Boolean);
      if (asset?.width && asset.height) event = {...event, payload: {...event.payload, sourceWidth: asset.width, sourceHeight: asset.height}};
    }
    return migrateVisiblePlacement(event, project.composition.width, project.composition.height);
  })}};
};

/** Convert legacy host-based placement without moving or resizing any artwork. */
export const migrateHierarchyVisiblePlacement = (
  event: ForegroundEvent,
  frameWidth: number,
  frameHeight: number,
): ForegroundEvent => {
  const visible = getHierarchyIconClassificationVisibleBox(event, frameWidth, frameHeight) ?? getHierarchyVisibleBox(event, frameWidth, frameHeight);
  if (!visible || event.placement.boundsMode === 'visibleContent') return event;
  const scale = getEventScale(event, frameWidth, frameHeight);
  const origin = getEventTransformOrigin(event, frameWidth, frameHeight);
  const translation = getEventTranslation(event, frameWidth, frameHeight);
  return {...event, placement: {...event.placement, mode: 'normalized', boundsMode: 'visibleContent',
    x: (origin.x + (visible.x * frameWidth - origin.x) * scale + translation.x) / frameWidth,
    y: (origin.y + (visible.y * frameHeight - origin.y) * scale + translation.y) / frameHeight,
    width: visible.width * scale, height: visible.height * scale,
  }};
};

/** Changing one inner card changes the envelope, not the other cards' transform. */
export const preserveHierarchyInnerTransform = (
  before: ForegroundEvent,
  after: ForegroundEvent,
  frameWidth: number,
  frameHeight: number,
): ForegroundEvent => {
  const isBranchOutcomeRows = before.componentId === 'ConceptComparisonCards' && before.variantId === 'branchOutcomeRows';
  if ((!isGraphicScene(before) && !isEditorialTrial(before) && !isBranchOutcomeRows && (before.componentId !== 'HierarchyTree' || before.variantId === 'radialHub'))
    || before.componentId !== after.componentId || before.variantId !== after.variantId
    || before.placement.boundsMode !== 'visibleContent'
    || (before.elementOverrides === after.elementOverrides && (!isGraphicScene(before) || before.payload === after.payload)) || before.placement !== after.placement) return after;
  const next = getGraphicSceneBounds(after, frameWidth, frameHeight) ?? getEditorialTrialBounds(after, frameWidth, frameHeight) ?? getHierarchyIconClassificationVisibleBox(after, frameWidth, frameHeight) ?? getHierarchyVisibleBox(after, frameWidth, frameHeight) ?? getConceptComparisonVisibleBox(after, frameWidth, frameHeight);
  if (!next) return after;
  const scale = getEventScale(before, frameWidth, frameHeight);
  const origin = getEventTransformOrigin(before, frameWidth, frameHeight);
  const translation = getEventTranslation(before, frameWidth, frameHeight);
  const width = next.width * scale;
  const height = next.height * scale;
  // An inner reset can restore a card beyond the canvas edge; only then apply
  // the existing canvas constraint, instead of persisting invalid coordinates.
  return {...after, placement: {...after.placement, mode: 'normalized',
    x: clamp((origin.x + (next.x * frameWidth - origin.x) * scale + translation.x) / frameWidth, 0, Math.max(0, 1 - width)),
    y: clamp((origin.y + (next.y * frameHeight - origin.y) * scale + translation.y) / frameHeight, 0, Math.max(0, 1 - height)),
    width, height,
  }};
};

export const clampDraggedBox = (
  box: NormalizedPlacementBox,
  nextX: number,
  nextY: number,
): NormalizedPlacementBox => ({
  ...box,
  x: clamp(nextX, 0, 1 - box.width),
  y: clamp(nextY, 0, 1 - box.height),
});

/** An explicit editor-only link; compositionGroup never implies edit linkage. */
export type PlacementLinkedEvent = ForegroundEvent & {transformGroupId?: string};

export const getTransformGroupId = (event: PlacementLinkedEvent): string =>
  typeof event.transformGroupId === 'string' ? event.transformGroupId.trim() : '';

/** Temporary editor selection; final transforms remain on individual events. */
export const canMultiTransform = (event: ForegroundEvent) =>
  event.enabled !== false && (event.semanticLayer !== 'title' || event.placement.boundsVersion === 2) && !isCanvasTransformLocked(event);

export type ForegroundSelection = {
  events: ForegroundEvent[];
  boxes: NormalizedPlacementBox[];
  bounds: NormalizedPlacementBox;
  minimumScale: number;
  maximumScale: number;
};

export const getForegroundSelection = (
  events: ForegroundEvent[], ids: string[], frameWidth: number, frameHeight: number,
): ForegroundSelection | null => {
  const selected = events.filter((event) => ids.includes(event.id) && canMultiTransform(event));
  if (!selected.length) return null;
  const boxes = selected.map((event) => getEventPlacementBox(event, frameWidth, frameHeight));
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return {events: selected, boxes, bounds: {x, y, width: right - x, height: bottom - y},
    minimumScale: Math.max(...boxes.map((box, index) => Math.max(
      (selected[index].placement.boundsVersion === 2 ? .015 : .08) / box.width,
      (selected[index].placement.boundsVersion === 2 ? .015 : .06) / box.height,
      selected[index].placement.boundsMode === 'visibleContent' ? 0 : .35 / getEventScale(selected[index], frameWidth, frameHeight),
    ))),
    maximumScale: Math.min(...boxes.map((box, index) => Math.min(
      1 / box.width, 1 / box.height,
      selected[index].placement.boundsMode === 'visibleContent' ? Infinity : 2.4 / getEventScale(selected[index], frameWidth, frameHeight),
    ))),
  };
};

/** One common anchor/scale, constrained before mapping members: no per-item drift. */
export const resizeForegroundSelection = (
  selection: ForegroundSelection, requestedScale: number, corner?: ResizeCorner,
): NormalizedPlacementBox => {
  const box = selection.bounds;
  const anchorX = corner ? (corner.endsWith('e') ? box.x : box.x + box.width) : box.x + box.width / 2;
  const anchorY = corner ? (corner.startsWith('s') ? box.y : box.y + box.height) : box.y + box.height / 2;
  const horizontalLimit = corner
    ? (corner.endsWith('e') ? 1 - anchorX : anchorX) / box.width
    : Math.min(anchorX, 1 - anchorX) * 2 / box.width;
  const verticalLimit = corner
    ? (corner.startsWith('s') ? 1 - anchorY : anchorY) / box.height
    : Math.min(anchorY, 1 - anchorY) * 2 / box.height;
  const upper = Math.min(selection.maximumScale, horizontalLimit, verticalLimit);
  const scale = clamp(requestedScale, Math.min(selection.minimumScale, upper), upper);
  const width = box.width * scale, height = box.height * scale;
  return {x: corner ? (corner.endsWith('e') ? anchorX : anchorX - width) : anchorX - width / 2,
    y: corner ? (corner.startsWith('s') ? anchorY : anchorY - height) : anchorY - height / 2, width, height};
};

export const transformForegroundSelection = (
  events: ForegroundEvent[], selection: ForegroundSelection, target: NormalizedPlacementBox,
): ForegroundEvent[] => {
  const scale = target.width / selection.bounds.width;
  const replacements = new Map<string, ForegroundEvent['placement']>();
  selection.events.forEach((event, index) => {
    const box = selection.boxes[index];
    replacements.set(event.id, {...event.placement, mode: 'normalized',
      x: target.x + (box.x - selection.bounds.x) * scale,
      y: target.y + (box.y - selection.bounds.y) * scale,
      width: box.width * scale, height: box.height * scale});
  });
  return events.map((event) => {
    const own = replacements.get(event.id);
    if (own && canMultiTransform(event)) return {...event, placement: own};
    if (!canMultiTransform(event) || !getTransformGroupId(event)) return event;
    // Selected members keep their relative geometry. Unselected linked image
    // instances still inherit the first compatible selected member, once.
    const driver = selection.events.find((selected) =>
      getTransformGroupId(selected) === getTransformGroupId(event)
      && selected.componentId === event.componentId && selected.variantId === event.variantId);
    if (!driver) return event;
    const placement = {...event.placement};
    const from = replacements.get(driver.id)!;
    for (const key of linkedPlacementKeys) {
      delete (placement as Record<string, unknown>)[key];
      if (from[key] !== undefined) (placement as Record<string, unknown>)[key] = from[key];
    }
    return {...event, placement};
  });
};

const linkedPlacementKeys = [
  'mode', 'preset', 'boundsMode', 'boundsVersion', 'alignmentToken', 'visibleEdge', 'align',
  'x', 'y', 'width', 'height',
] as const;

/** One immutable update for pointer gestures, preset changes and resets.
 * Copy only geometry to explicitly linked, compatible local events. Payload,
 * timing, material, color, inner overrides and stacking remain independent.
 */
export const updateEventWithLinkedPlacement = (
  events: ForegroundEvent[],
  eventId: string,
  updater: (event: ForegroundEvent) => ForegroundEvent,
  frameWidth: number,
  frameHeight: number,
): ForegroundEvent[] => {
  const before = events.find((event) => event.id === eventId);
  if (!before) return events;
  const after = preserveHierarchyInnerTransform(before, updater(before), frameWidth, frameHeight);
  const groupId = getTransformGroupId(before);
  const geometryChanged = linkedPlacementKeys.some((key) => before.placement[key] !== after.placement[key]);
  const link = groupId && groupId === getTransformGroupId(after) && geometryChanged
    && before.placement !== after.placement
    && before.componentId === after.componentId && before.variantId === after.variantId
    && !isCanvasTransformLocked(before) && !isCanvasTransformLocked(after);
  return events.map((event) => {
    if (event.id === eventId) return after;
    if (!link || getTransformGroupId(event) !== groupId || isCanvasTransformLocked(event)
      || event.componentId !== after.componentId || event.variantId !== after.variantId) return event;
    // Rebuild the positional subset, removing stale normalized coordinates on
    // reset. Keep the peer's own zIndex and any future non-positional fields.
    const placement = {...event.placement};
    for (const key of linkedPlacementKeys) delete (placement as Record<string, unknown>)[key];
    for (const key of linkedPlacementKeys) {
      if (after.placement[key] !== undefined) {
        (placement as Record<string, unknown>)[key] = after.placement[key];
      }
    }
    return {...event, placement};
  });
};

export const clampResizedBox = ({
  box,
  corner,
  deltaClientX,
  deltaClientY,
  canvasWidth,
  canvasHeight,
}: {
  box: NormalizedPlacementBox;
  corner: ResizeCorner;
  deltaClientX: number;
  deltaClientY: number;
  canvasWidth: number;
  canvasHeight: number;
}): NormalizedPlacementBox => {
  const east = corner.endsWith('e');
  const south = corner.startsWith('s');
  const anchorX = east ? box.x : box.x + box.width;
  const anchorY = south ? box.y : box.y + box.height;
  const startVectorX = (east ? box.width : -box.width) * canvasWidth;
  const startVectorY = (south ? box.height : -box.height) * canvasHeight;
  const currentVectorX = startVectorX + deltaClientX;
  const currentVectorY = startVectorY + deltaClientY;
  const vectorLengthSquared = Math.max(1, startVectorX ** 2 + startVectorY ** 2);
  const projectedScale =
    (currentVectorX * startVectorX + currentVectorY * startVectorY) / vectorLengthSquared;

  const minimumScale = Math.max(0.1, 0.015 / box.width, 0.015 / box.height);
  const horizontalLimit = east ? (1 - anchorX) / box.width : anchorX / box.width;
  const verticalLimit = south ? (1 - anchorY) / box.height : anchorY / box.height;
  const maximumScale = Math.max(minimumScale, Math.min(2.4, horizontalLimit, verticalLimit));
  const scale = clamp(projectedScale, minimumScale, maximumScale);
  const width = box.width * scale;
  const height = box.height * scale;

  return {
    x: east ? anchorX : anchorX - width,
    y: south ? anchorY : anchorY - height,
    width,
    height,
  };
};

const fitAspectIntoBox = (
  box: NormalizedPlacementBox,
  aspect: number,
  horizontalAlign: 'left' | 'center' | 'right',
): NormalizedPlacementBox => {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  const availableWidth = box.width * 0.94;
  const availableHeight = box.height * 0.94;
  const width = Math.min(availableWidth, availableHeight * safeAspect);
  const height = width / safeAspect;
  const x = horizontalAlign === 'left'
    ? box.x
    : horizontalAlign === 'right'
      ? box.x + box.width - width
      : box.x + (box.width - width) / 2;
  return {x, y: box.y + (box.height - height) / 2, width, height};
};

const getHorizontalAlignment = (preset: string): 'left' | 'center' | 'right' => {
  const normalized = normalizedPreset(preset);
  if (normalized.startsWith('left')) return 'left';
  if (normalized.startsWith('right')) return 'right';
  return 'center';
};

const normalizeCalloutTarget = (
  event: ForegroundEvent,
  sourceWidth: number,
  sourceHeight: number,
): NormalizedPlacementBox => {
  const raw = (event.payload as {target?: Partial<NormalizedPlacementBox>}).target || {};
  const values = [raw.x, raw.y, raw.width, raw.height];
  const alreadyNormalized = values.every(
    (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1,
  );
  const candidate = alreadyNormalized
    ? raw
    : {
        x: Number(raw.x || 0) / sourceWidth,
        y: Number(raw.y || 0) / sourceHeight,
        width: Number(raw.width || sourceWidth * 0.22) / sourceWidth,
        height: Number(raw.height || sourceHeight * 0.18) / sourceHeight,
      };
  const width = clamp(Number(candidate.width || 0.22), 0.03, 1);
  const height = clamp(Number(candidate.height || 0.18), 0.03, 1);
  return {
    x: clamp(Number(candidate.x || 0), 0, 1 - width),
    y: clamp(Number(candidate.y || 0), 0, 1 - height),
    width,
    height,
  };
};

/**
 * Reproduce CalloutSpotlight's visible media panel in editor coordinates.
 * The returned target is canvas-normalized while targetInSource stays
 * normalized to the underlying screenshot/video and survives component moves.
 */
export const getCalloutTargetGeometry = (
  event: ForegroundEvent,
  assets: EditAsset[],
  frameWidth: number,
  frameHeight: number,
): (CalloutTargetGeometry & {targetInSource: NormalizedPlacementBox}) | null => {
  if (event.componentId !== 'CalloutSpotlight') return null;
  const primaryAsset = (event.assetIds || [])
    .map((id) => assets.find((asset) => asset.id === id))
    .find(Boolean);
  const payload = event.payload as {
    sourceWidth?: number;
    sourceHeight?: number;
    subtitle?: unknown;
  };
  const sourceWidth = Math.max(1, primaryAsset?.width || payload.sourceWidth || 1920);
  const sourceHeight = Math.max(1, primaryAsset?.height || payload.sourceHeight || 1080);
  const targetInSource = normalizeCalloutTarget(event, sourceWidth, sourceHeight);
  const pixelZone = getForegroundZone({width: frameWidth, height: frameHeight, placement: toForegroundPlacement(event.placement.preset)});
  const zone = event.placement.boundsVersion === 2
    ? {x: pixelZone.x / frameWidth, y: pixelZone.y / frameHeight, width: pixelZone.width / frameWidth, height: pixelZone.height / frameHeight}
    : getDefaultPlacementBox(event, frameWidth, frameHeight);
  const unit = Math.min(frameWidth / 1920, frameHeight / 1080);
  const horizontalAlign = getHorizontalAlignment(event.placement.preset);

  let panel: NormalizedPlacementBox;
  if (event.variantId === 'cornerFocus') {
    const footerHeight = payload.subtitle ? (54 * unit) / frameHeight : 0;
    const panelZone = {...zone, height: Math.max(zone.height - footerHeight, 1 / frameHeight)};
    const fitted = fitAspectIntoBox(panelZone, (sourceWidth / sourceHeight) * (frameHeight / frameWidth), horizontalAlign);
    const groupHeight = fitted.height + footerHeight;
    panel = {
      ...fitted,
      y: zone.y + Math.max((zone.height - groupHeight) / 2, 0),
    };
  } else {
    const cardHeight = Math.min(zone.height * 0.28, (170 * unit) / frameHeight);
    const gap = Math.max((12 * unit) / frameHeight, zone.height * 0.025);
    const panelZone = {...zone, height: Math.max(zone.height - cardHeight - gap, 1 / frameHeight)};
    const fitted = fitAspectIntoBox(panelZone, (sourceWidth / sourceHeight) * (frameHeight / frameWidth), horizontalAlign);
    const groupHeight = fitted.height + gap + cardHeight;
    panel = {
      ...fitted,
      y: zone.y + Math.max((zone.height - groupHeight) / 2, 0),
    };
  }

  const translation = getEventTranslation(event, frameWidth, frameHeight);
  const scale = getEventScale(event, frameWidth, frameHeight);
  const origin = getEventTransformOrigin(event, frameWidth, frameHeight);
  const transformBox = (box: NormalizedPlacementBox): NormalizedPlacementBox => {
    const xPixels = box.x * frameWidth;
    const yPixels = box.y * frameHeight;
    return {
      x: (origin.x + (xPixels - origin.x) * scale + translation.x) / frameWidth,
      y: (origin.y + (yPixels - origin.y) * scale + translation.y) / frameHeight,
      width: box.width * scale,
      height: box.height * scale,
    };
  };
  const transformedPanel = transformBox(panel);
  return {
    panel: transformedPanel,
    targetInSource,
    target: {
      x: transformedPanel.x + targetInSource.x * transformedPanel.width,
      y: transformedPanel.y + targetInSource.y * transformedPanel.height,
      width: targetInSource.width * transformedPanel.width,
      height: targetInSource.height * transformedPanel.height,
    },
  };
};

export const clampMovedCalloutTarget = (
  box: NormalizedPlacementBox,
  deltaX: number,
  deltaY: number,
): NormalizedPlacementBox => ({
  ...box,
  x: clamp(box.x + deltaX, 0, 1 - box.width),
  y: clamp(box.y + deltaY, 0, 1 - box.height),
});

export const clampResizedCalloutTarget = (
  box: NormalizedPlacementBox,
  corner: ResizeCorner,
  deltaX: number,
  deltaY: number,
): NormalizedPlacementBox => {
  const minimum = 0.03;
  const right = box.x + box.width;
  const bottom = box.y + box.height;
  const nextLeft = corner.endsWith('e') ? box.x : clamp(box.x + deltaX, 0, right - minimum);
  const nextTop = corner.startsWith('s') ? box.y : clamp(box.y + deltaY, 0, bottom - minimum);
  const nextRight = corner.endsWith('e') ? clamp(right + deltaX, box.x + minimum, 1) : right;
  const nextBottom = corner.startsWith('s') ? clamp(bottom + deltaY, box.y + minimum, 1) : bottom;
  return {
    x: nextLeft,
    y: nextTop,
    width: nextRight - nextLeft,
    height: nextBottom - nextTop,
  };
};
