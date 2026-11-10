/** Video-layout safe area — 80px sides / 100px vertical at 1080p reference */
const REFERENCE_WIDTH = 1080;
const REFERENCE_HEIGHT = 1080;
const HORIZONTAL_SAFE = 80;
const VERTICAL_SAFE = 100;
const TITLE_REFERENCE_WIDTH = 2560;
const TITLE_REFERENCE_HEIGHT = 1440;
const TITLE_LEFT_AT_REFERENCE = 108;

export type SafePaddingOptions = {
  width: number;
  height: number;
  ratio?: number;
};

export type SafeAreaPadding = {
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
};

/** Per-edge safe area from video-layout guidance */
export function getSafeAreaPadding({
  width,
  height,
}: {
  width: number;
  height: number;
}): SafeAreaPadding {
  const horizontal = Math.round((HORIZONTAL_SAFE / REFERENCE_WIDTH) * width);
  const vertical = Math.round((VERTICAL_SAFE / REFERENCE_HEIGHT) * height);

  return {
    paddingLeft: horizontal,
    paddingRight: horizontal,
    paddingTop: vertical,
    paddingBottom: vertical,
  };
}

/** Uniform padding — max of horizontal/vertical safe insets */
export function getSafePadding({
  width,
  height,
  ratio,
}: SafePaddingOptions): number {
  if (ratio !== undefined) {
    return Math.round(Math.min(width, height) * ratio);
  }

  const { paddingLeft, paddingTop } = getSafeAreaPadding({ width, height });
  return Math.max(paddingLeft, paddingTop);
}

/**
 * Scale a font size defined at 1080p width to any composition width.
 * Skill minimums at 1080: headline 84, supporting 44, label 32.
 */
export function scaleFont(
  sizeAt1080: number,
  width: number,
  referenceWidth = REFERENCE_WIDTH,
): number {
  return Math.round(sizeAt1080 * (width / referenceWidth));
}

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ForegroundHorizontalAlignment = "left" | "center" | "right";

/**
 * Shared visible-edge grid used by the Section title and every foreground
 * component. Keeping this in one runtime helper prevents the title and the
 * component pack from drifting onto separate horizontal coordinate systems.
 */
export function getMasterAlignmentTokens({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const titleScale = Math.min(
    width / TITLE_REFERENCE_WIDTH,
    height / TITLE_REFERENCE_HEIGHT,
  );
  const sectionTitleLeft = TITLE_LEFT_AT_REFERENCE * titleScale;
  return {
    sectionTitleLeft,
    sectionTitleRight: width - sectionTitleLeft,
    centerAxis: width / 2,
  } as const;
}

export function getPlacementHorizontalAlignment(
  placement: ForegroundPlacement,
): ForegroundHorizontalAlignment {
  if (placement.startsWith("left")) return "left";
  if (placement.startsWith("right")) return "right";
  return "center";
}

/** Align the actual visible surface, not merely its transparent host/zone. */
export function getAlignedX({
  zone,
  itemWidth,
  placement,
}: {
  zone: Rect;
  itemWidth: number;
  placement: ForegroundPlacement;
}): number {
  const alignment = getPlacementHorizontalAlignment(placement);
  if (alignment === "left") return zone.x;
  if (alignment === "right") return zone.x + zone.width - itemWidth;
  return zone.x + (zone.width - itemWidth) / 2;
}

/**
 * Local foreground zones. These name visible overlay regions, not full-screen
 * scenes. The composition may use a transparent full-frame host only as a
 * coordinate system; every visible component must stay inside one of these
 * measured zones.
 */
export const FOREGROUND_PLACEMENTS = [
  "leftMiddle",
  "rightMiddle",
  "leftLowerSafe",
  "rightLowerSafe",
  "upperCenterSafe",
  "centerSafe",
] as const;

export type ForegroundPlacement = (typeof FOREGROUND_PLACEMENTS)[number];

export function getForegroundZone({
  width,
  height,
  placement,
}: {
  width: number;
  height: number;
  placement: ForegroundPlacement;
}): Rect {
  const safe = getSafeAreaPadding({ width, height });
  const portrait = height > width;
  const safeWidth = width - safe.paddingLeft - safe.paddingRight;
  const safeHeight = height - safe.paddingTop - safe.paddingBottom;
  const sideWidth = portrait ? safeWidth * 0.88 : width * 0.34;
  const sideHeight = portrait ? safeHeight * 0.42 : safeHeight * 0.62;
  const alignment = getMasterAlignmentTokens({width, height});
  const leftX = alignment.sectionTitleLeft;
  const rightX = alignment.sectionTitleRight - sideWidth;
  const middleY = portrait
    ? safe.paddingTop + safeHeight * 0.18
    : height * 0.22;
  const lowerY = portrait ? height * 0.48 : height * 0.47;

  switch (placement) {
    case "leftMiddle":
      return { x: leftX, y: middleY, width: sideWidth, height: sideHeight };
    case "rightMiddle":
      return { x: rightX, y: middleY, width: sideWidth, height: sideHeight };
    case "leftLowerSafe":
      return {
        x: leftX,
        y: lowerY,
        width: sideWidth,
        height: Math.max(height - safe.paddingBottom - lowerY, 1),
      };
    case "rightLowerSafe":
      return {
        x: rightX,
        y: lowerY,
        width: sideWidth,
        height: Math.max(height - safe.paddingBottom - lowerY, 1),
      };
    case "upperCenterSafe": {
      const zoneWidth = portrait ? safeWidth * 0.9 : width * 0.62;
      return {
        x: (width - zoneWidth) / 2,
        y: portrait ? height * 0.17 : height * 0.15,
        width: zoneWidth,
        height: portrait ? safeHeight * 0.3 : safeHeight * 0.36,
      };
    }
    case "centerSafe":
    default: {
      const zoneWidth = portrait ? safeWidth * 0.94 : width * 0.64;
      const zoneHeight = portrait ? safeHeight * 0.56 : safeHeight * 0.64;
      return {
        x: (width - zoneWidth) / 2,
        y: safe.paddingTop + (safeHeight - zoneHeight) / 2,
        width: zoneWidth,
        height: zoneHeight,
      };
    }
  }
}

/** Fit one aspect-preserving visible object inside a local foreground zone. */
export function fitAspectIntoRect({
  rect,
  aspect,
  maxWidthRatio = 1,
  maxHeightRatio = 1,
  horizontalAlign = "center",
}: {
  rect: Rect;
  aspect: number;
  maxWidthRatio?: number;
  maxHeightRatio?: number;
  horizontalAlign?: ForegroundHorizontalAlignment;
}): Rect {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  const availableWidth = rect.width * Math.min(Math.max(maxWidthRatio, 0.1), 1);
  const availableHeight = rect.height * Math.min(Math.max(maxHeightRatio, 0.1), 1);
  const fittedWidth = Math.min(availableWidth, availableHeight * safeAspect);
  const fittedHeight = fittedWidth / safeAspect;

  const x = horizontalAlign === "left"
    ? rect.x
    : horizontalAlign === "right"
      ? rect.x + rect.width - fittedWidth
      : rect.x + (rect.width - fittedWidth) / 2;

  return {
    x,
    y: rect.y + (rect.height - fittedHeight) / 2,
    width: fittedWidth,
    height: fittedHeight,
  };
}

/** Clamp a rect inside the video safe area (for spotlight targets, overlays). */
export function clampRectToSafeArea(
  rect: Rect,
  frameWidth: number,
  frameHeight: number,
): Rect {
  const safe = getSafeAreaPadding({ width: frameWidth, height: frameHeight });
  const minX = safe.paddingLeft;
  const minY = safe.paddingTop;
  const maxX = frameWidth - safe.paddingRight;
  const maxY = frameHeight - safe.paddingBottom;

  const width = Math.min(rect.width, maxX - minX);
  const height = Math.min(rect.height, maxY - minY);
  const x = Math.min(Math.max(rect.x, minX), maxX - width);
  const y = Math.min(Math.max(rect.y, minY), maxY - height);

  return { x, y, width, height };
}

/** Preview aspect presets for docs QA */
export const PREVIEW_LANDSCAPE = { width: 960, height: 540 } as const;
export const PREVIEW_PORTRAIT = { width: 1080, height: 1920 } as const;
export const PREVIEW_HD = { width: 1920, height: 1080 } as const;
