export type ContentMeasureRow = {
  text?: string;
  fontSize: number;
  letterSpacing?: number;
  trailingWidth?: number;
};

export const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * Deterministic text-width estimate for data-driven Remotion surfaces.
 * It is intentionally conservative: the browser still performs the final
 * line layout, while this estimate prevents a short payload from inheriting
 * a large fixed card silhouette.
 */
export const estimateTextWidth = (
  text: string | undefined,
  fontSize: number,
  letterSpacing = 0,
) => {
  const value = text ?? "";
  let units = 0;
  for (const char of value) {
    if (/\s/u.test(char)) units += 0.34;
    else if (/[\u2E80-\u9FFF\uF900-\uFAFF]/u.test(char)) units += 1;
    else if (/[A-Z0-9]/u.test(char)) units += 0.66;
    else units += 0.56;
  }
  return units * fontSize + Math.max(0, value.length - 1) * letterSpacing;
};

export const estimateWrappedLineCount = ({
  text,
  fontSize,
  availableWidth,
  letterSpacing = 0,
}: {
  text?: string;
  fontSize: number;
  availableWidth: number;
  letterSpacing?: number;
}) => Math.max(
  1,
  Math.ceil(estimateTextWidth(text, fontSize, letterSpacing) / Math.max(availableWidth, 1)),
);

export const getContentCardWidth = ({
  rows,
  horizontalPadding,
  minWidth,
  maxWidth,
}: {
  rows: ContentMeasureRow[];
  horizontalPadding: number;
  minWidth: number;
  maxWidth: number;
}) => {
  const widest = rows.reduce(
    (value, row) => Math.max(
      value,
      estimateTextWidth(row.text, row.fontSize, row.letterSpacing) + (row.trailingWidth ?? 0),
    ),
    0,
  );
  return clampNumber(widest + horizontalPadding * 2, minWidth, maxWidth);
};

/** Scale authored 2560x1440 typography without letting portrait text collapse. */
export const getForegroundTypographyScale = ({
  width,
  height,
  min = 0.52,
  max = 1.55,
}: {
  width: number;
  height: number;
  min?: number;
  max?: number;
}) => clampNumber(Math.min(width / 2560, height / 1440), min, max);
