import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {CODE_THEMES} from "../lib/code-syntax";
import {
  ForegroundPlacement,
  getAlignedX,
  getForegroundZone,
} from "../lib/layout";
import {EASING} from "../lib/motion-tokens";
import {SemanticIcon, SEMANTIC_ICON_NAMES, type SemanticIconName} from "../lib/semantic-icons";

const FONT_FAMILY = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';

export type CollectionTile = {
  /** Short peer label. The collection must be scanned, not read as prose. */
  name: string;
  /** Optional supporting word; never use it for a second sentence. */
  meta?: string;
  /** Meaningful shared SVG icon; absent/none deliberately leaves a text-only tile. */
  icon?: SemanticIconName | "none";
  /** Legacy input retained for compatibility, never rendered as an icon. */
  glyph?: string;
  color?: string;
  /** Local frame aligned to the item's Spoken Beat. */
  showAtInFrames?: number;
};

export type LogoWallProps = {
  items: CollectionTile[];
  visualVariant?: "peerTileWall" | "magneticCluster";
  eyebrow?: string;
  title?: string;
  columns?: number;
  placement?: ForegroundPlacement;
  accentColor?: string;
  theme?: "dark" | "light";
  delayInFrames?: number;
  staggerInFrames?: number;
  exitAtInFrames?: number;
  exitInFrames?: number;
};

const collectionIcon = (item: CollectionTile): SemanticIconName | undefined =>
  SEMANTIC_ICON_NAMES.includes(item.icon as SemanticIconName) ? item.icon as SemanticIconName : undefined;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

/**
 * RemotionUI Logo Wall adapted as a semantic peer collection.
 *
 * The full-frame host is transparent coordinate space. Only the measured
 * heading and tile wall are visible. Tiles arrive on their own Spoken Beats;
 * a diagonal colour wave then makes the completed set read as one whole.
 */
export const LogoWall: React.FC<LogoWallProps> = ({
  items,
  visualVariant = "peerTileWall",
  eyebrow,
  title,
  columns,
  placement = "centerSafe",
  accentColor = "#E8B86D",
  theme = "dark",
  delayInFrames = 4,
  staggerInFrames = 5,
  exitAtInFrames,
  exitInFrames = 14,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const palette = CODE_THEMES[theme];
  const zone = getForegroundZone({width, height, placement});
  const safeColumns = Math.max(1, Math.min(columns ?? 2, Math.max(items.length, 1)));
  const rows = Math.max(1, Math.ceil(items.length / safeColumns));
  const baseWidth = safeColumns * 250 + (safeColumns - 1) * 16;
  const baseHeight = 92 + rows * 94 + (rows - 1) * 14;
  const u = Math.max(
    0.72,
    Math.min(zone.width / baseWidth, zone.height / baseHeight, 1.65),
  );
  const wallWidth = Math.min(zone.width, baseWidth * u);
  const tileGap = 14 * u;
  const tileWidth =
    (wallWidth - tileGap * Math.max(0, safeColumns - 1)) / safeColumns;
  const tileHeight = 80 * u;
  const titleBlockHeight = title || eyebrow ? 78 * u : 0;
  const contentHeight = titleBlockHeight + rows * tileHeight + (rows - 1) * tileGap;
  const x = getAlignedX({zone, itemWidth: wallWidth, placement});
  const y = zone.y + (zone.height - contentHeight) / 2;

  const exit =
    exitAtInFrames === undefined
      ? 0
      : interpolate(
          frame,
          [exitAtInFrames, exitAtInFrames + exitInFrames],
          [0, 1],
          {easing: EASING.exit, ...clamp},
        );
  const headingIn = interpolate(frame, [0, Math.max(10, fps * 0.32)], [0, 1], {
    easing: EASING.enter,
    ...clamp,
  });

  if (visualVariant === "magneticCluster") {
    const count = items.length;
    const clusterColumns = Math.max(1, Math.min(columns ?? 3, Math.max(count, 1), 3));
    const clusterRows = Math.max(1, Math.ceil(count / clusterColumns));
    const baseTileWidth = 250;
    const baseTileHeight = 88;
    const baseGapX = 20;
    const baseGapY = 24;
    const baseHeadingHeight = title || eyebrow ? 96 : 0;
    const baseClusterWidth = clusterColumns * baseTileWidth + Math.max(0, clusterColumns - 1) * baseGapX + 96;
    const baseClusterHeight = clusterRows * baseTileHeight + Math.max(0, clusterRows - 1) * baseGapY + 34;
    const clusterUnit = Math.max(
      0.68,
      Math.min(
        zone.width / baseClusterWidth,
        zone.height / Math.max(baseHeadingHeight + baseClusterHeight, 1),
        1.55,
      ),
    );
    const clusterWidth = Math.min(zone.width, baseClusterWidth * clusterUnit);
    const clusterHeight = baseClusterHeight * clusterUnit;
    const headingHeight = baseHeadingHeight * clusterUnit;
    const totalHeight = headingHeight + clusterHeight;
    const clusterX = getAlignedX({zone, itemWidth: clusterWidth, placement});
    const contentTop = zone.y + Math.max((zone.height - totalHeight) / 2, 0);
    const clusterTop = contentTop + headingHeight;
    const tileWidth = baseTileWidth * clusterUnit;
    const tileHeight = baseTileHeight * clusterUnit;
    const gapX = baseGapX * clusterUnit;
    const gapY = baseGapY * clusterUnit;
    const starts = items.map((item, index) => item.showAtInFrames ?? delayInFrames + index * staggerInFrames);
    const lastStart = starts.length > 0 ? Math.max(...starts) : delayInFrames;
    const groupLock = interpolate(
      frame,
      [lastStart + Math.max(10, fps * 0.24), lastStart + Math.max(26, fps * 0.72)],
      [0, 1],
      {easing: EASING.editorial, ...clamp},
    );
    const originX = clusterWidth / 2 - tileWidth / 2;
    const originY = clusterHeight / 2 - tileHeight / 2;

    return (
      <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT_FAMILY}}>
        <div style={{position: "absolute", left: clusterX, top: contentTop, width: clusterWidth, opacity: 1 - exit, translate: `0 ${exit * 22 * clusterUnit}px`}}>
          {eyebrow ? <div style={{color: accentColor, fontSize: Math.max(18 * clusterUnit, 12), fontWeight: 760, letterSpacing: "0.08em", opacity: headingIn, marginBottom: 5 * clusterUnit}}>{eyebrow}</div> : null}
          {title ? <div style={{color: palette.fg, fontSize: Math.max(38 * clusterUnit, 25), lineHeight: 1.04, fontWeight: 860, letterSpacing: "-0.028em", opacity: headingIn, translate: `0 ${(1 - headingIn) * 10 * clusterUnit}px`}}>{title}</div> : null}

          <div style={{position: "absolute", left: 0, top: headingHeight, width: clusterWidth, height: clusterHeight}}>
            <div style={{position: "absolute", inset: 0, borderRadius: 38 * clusterUnit, border: `1px solid ${accentColor}38`, boxShadow: `inset 0 0 ${46 * clusterUnit}px ${accentColor}0D, 0 0 ${38 * clusterUnit}px ${accentColor}12`, opacity: groupLock, scale: 0.975 + groupLock * 0.025}} />
            <div style={{position: "absolute", left: 22 * clusterUnit, right: 22 * clusterUnit, top: "50%", height: 1, background: `linear-gradient(90deg, transparent, ${accentColor}2A, transparent)`, opacity: groupLock}} />

            {items.map((item, index) => {
              const row = Math.floor(index / clusterColumns);
              const column = index % clusterColumns;
              const rowStart = row * clusterColumns;
              const rowCount = Math.min(clusterColumns, count - rowStart);
              const rowWidth = rowCount * tileWidth + Math.max(0, rowCount - 1) * gapX;
              const staggerOffset = row % 2 === 1 ? 34 * clusterUnit : -10 * clusterUnit;
              const rowLeft = Math.min(
                Math.max((clusterWidth - rowWidth) / 2 + staggerOffset, 18 * clusterUnit),
                clusterWidth - rowWidth - 18 * clusterUnit,
              );
              const targetLeft = rowLeft + column * (tileWidth + gapX);
              const targetTop = 17 * clusterUnit + row * (tileHeight + gapY);
              const start = starts[index];
              const arrive = Math.min(1, spring({frame: frame - start, fps, config: {damping: 17, stiffness: 150, mass: 0.75}}));
              const warm = interpolate(frame, [start + 8, start + Math.max(24, fps * 0.74)], [0, 1], {easing: EASING.editorial, ...clamp});
              const left = interpolate(arrive, [0, 1], [originX, targetLeft]);
              const top = interpolate(arrive, [0, 1], [originY, targetTop]);
              const rotate = interpolate(arrive, [0, 1], [(index % 2 === 0 ? -1 : 1) * (7 + index), 0]);
              const color = accentColor;
              const icon = collectionIcon(item);
              return (
                <div key={`${item.name}-${index}`} style={{position: "absolute", left, top, width: tileWidth, height: tileHeight, boxSizing: "border-box", padding: `0 ${18 * clusterUnit}px 0 ${14 * clusterUnit}px`, borderRadius: tileHeight / 2, display: "flex", alignItems: "center", gap: 13 * clusterUnit, background: theme === "dark" ? "linear-gradient(145deg, rgba(10,13,19,0.48), rgba(23,27,35,0.24))" : "linear-gradient(145deg, rgba(255,255,255,0.62), rgba(248,248,246,0.34))", backdropFilter: `blur(${16 * clusterUnit}px) saturate(1.16)`, border: `1px solid ${warm > 0.45 ? `${color}76` : palette.border}`, boxShadow: `inset 0 1px 0 ${palette.highlight}, 0 ${16 * clusterUnit}px ${34 * clusterUnit}px rgba(0,0,0,0.24), 0 0 ${warm * 22 * clusterUnit}px ${color}1F`, opacity: arrive, scale: 0.62 + arrive * 0.38, rotate: `${rotate}deg`, zIndex: 20 + index}}>
                  {icon ? <div data-semantic-icon={icon} style={{width: 54 * clusterUnit, height: 54 * clusterUnit, flex: `0 0 ${54 * clusterUnit}px`, display: "grid", placeItems: "center", borderRadius: "50%", background: `linear-gradient(145deg, ${color}${warm > 0.55 ? "C2" : "52"}, ${color}24)`, color: warm > 0.55 ? palette.page : color, boxShadow: `0 0 ${warm * 18 * clusterUnit}px ${color}3D`, fontSize: Math.max(21 * clusterUnit, 14), fontWeight: 900}}><SemanticIcon name={icon} size={32 * clusterUnit} color={warm > 0.55 ? palette.page : color} strokeWidth={2.2} /></div> : null}
                  <div style={{minWidth: 0}}>
                    <div style={{color: palette.fg, fontSize: Math.max(25 * clusterUnit, 17), lineHeight: 1, fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{item.name}</div>
                    {item.meta ? <div style={{marginTop: 7 * clusterUnit, color: palette.dim, fontSize: Math.max(13 * clusterUnit, 10), lineHeight: 1, fontWeight: 650, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{item.meta}</div> : null}
                  </div>
                </div>
              );
            })}

            <div style={{position: "absolute", left: 0, top: 0, width: 38 * clusterUnit, height: 38 * clusterUnit, borderLeft: `${3 * clusterUnit}px solid ${accentColor}`, borderTop: `${3 * clusterUnit}px solid ${accentColor}`, borderRadius: `${16 * clusterUnit}px 0 0 0`, opacity: groupLock}} />
            <div style={{position: "absolute", right: 0, bottom: 0, width: 38 * clusterUnit, height: 38 * clusterUnit, borderRight: `${3 * clusterUnit}px solid ${accentColor}`, borderBottom: `${3 * clusterUnit}px solid ${accentColor}`, borderRadius: `0 0 ${16 * clusterUnit}px 0`, opacity: groupLock}} />
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      data-foreground-overlay-root="true"
      style={{
        position: "absolute",
        inset: 0,
        background: "transparent",
        pointerEvents: "none",
        fontFamily: FONT_FAMILY,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: wallWidth,
          opacity: 1 - exit,
          transform: `translateY(${exit * 22 * u}px)`,
        }}
      >
        {eyebrow ? (
          <div
            style={{
              color: accentColor,
              fontSize: 19 * u,
              fontWeight: 760,
              letterSpacing: "0.08em",
              opacity: headingIn,
              marginBottom: 5 * u,
            }}
          >
            {eyebrow}
          </div>
        ) : null}
        {title ? (
          <div
            style={{
              color: palette.fg,
              fontSize: 40 * u,
              lineHeight: 1.06,
              fontWeight: 850,
              letterSpacing: "-0.025em",
              opacity: headingIn,
              transform: `translateY(${(1 - headingIn) * 10 * u}px)`,
              marginBottom: 18 * u,
            }}
          >
            {title}
          </div>
        ) : null}

        <div style={{display: "flex", flexWrap: "wrap", gap: tileGap}}>
          {items.map((item, index) => {
            const row = Math.floor(index / safeColumns);
            const column = index % safeColumns;
            const start = item.showAtInFrames ?? delayInFrames + index * staggerInFrames;
            const arrive = spring({
              frame: frame - start,
              fps,
              config: {damping: 18, stiffness: 145, mass: 0.82},
            });
            const warm = interpolate(
              frame,
              [start + 7 + (row + column) * 3, start + 24 + (row + column) * 3],
              [0, 1],
              {easing: EASING.editorial, ...clamp},
            );
            const color = item.color ?? accentColor;
            const icon = collectionIcon(item);

            return (
              <div
                key={`${item.name}-${index}`}
                style={{
                  width: tileWidth,
                  height: tileHeight,
                  boxSizing: "border-box",
                  padding: `0 ${16 * u}px`,
                  borderRadius: 15 * u,
                  background:
                    theme === "dark"
                      ? "linear-gradient(145deg, rgba(7,9,15,0.56), rgba(13,17,27,0.36))"
                      : "linear-gradient(145deg, rgba(255,255,255,0.92), rgba(244,244,242,0.78))",
                  backdropFilter: "blur(10px) saturate(1.08)",
                  border: `1px solid ${warm > 0.45 ? `${color}70` : palette.border}`,
                  boxShadow: `inset 0 1px 0 ${palette.highlight}, 0 ${10 * u}px ${26 * u}px ${palette.shadow}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 12 * u,
                  opacity: Math.min(1, arrive),
                  transform: `translateY(${(1 - arrive) * 18 * u}px) scale(${0.93 + arrive * 0.07})`,
                  filter: `saturate(${0.2 + warm * 0.8}) brightness(${0.78 + warm * 0.22})`,
                }}
              >
                {icon ? <div
                  data-semantic-icon={icon}
                  style={{
                    width: 36 * u,
                    height: 36 * u,
                    flex: `0 0 ${36 * u}px`,
                    borderRadius: 11 * u,
                    display: "grid",
                    placeItems: "center",
                    background: `linear-gradient(140deg, ${color}, ${color}8F)`,
                    color: theme === "dark" ? "#11131A" : "#FFFFFF",
                    fontSize: 20 * u,
                    fontWeight: 900,
                  }}
                >
                  <SemanticIcon name={icon} size={25 * u} color={theme === "dark" ? "#11131A" : "#FFFFFF"} strokeWidth={2.2} />
                </div> : null}
                <div style={{minWidth: 0}}>
                  <div
                    style={{
                      color: palette.fg,
                      fontSize: 31 * u,
                      lineHeight: 1.05,
                      fontWeight: 850,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.name}
                  </div>
                  {item.meta ? (
                    <div
                      style={{
                        marginTop: 4 * u,
                        color: palette.dim,
                        fontSize: 17 * u,
                        lineHeight: 1,
                        fontWeight: 650,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.meta}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
