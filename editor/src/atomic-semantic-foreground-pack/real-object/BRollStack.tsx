import {Video} from "@remotion/media";
import {Img, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {CODE_THEMES} from "../lib/code-syntax";
import {
  fitAspectIntoRect,
  getForegroundZone,
  getPlacementHorizontalAlignment,
  type ForegroundPlacement,
} from "../lib/layout";
import {EASING} from "../lib/motion-tokens";
import {
  getMediaObjectFitStyle,
  isVideoSource,
  type MediaFit,
} from "../lib/media-utils";

const fontFamily = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';

export type BRollItem = {
  src: string;
  title?: string;
  caption?: string;
  fit?: MediaFit;
  backgroundColor?: string;
  showAtInFrames?: number;
};

export type BRollStackProps = {
  items?: BRollItem[];
  visualVariant?: "proofDeck" | "evidenceTrack";
  title?: string;
  kicker?: string;
  caption?: string;
  holdSeconds?: number;
  aspect?: number;
  placement?: ForegroundPlacement;
  maxWidthRatio?: number;
  maxHeightRatio?: number;
  accentColor?: string;
  theme?: "dark" | "light";
  /** Optional local backing behind the proof deck; never a page background. */
  surfaceMode?: "transparent" | "localizedGlass";
  speed?: number;
};

const T = {
  header: 0,
  deck: 0.24,
  firstHold: 1.25,
  advance: 0.5,
} as const;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const deckPlacement = (depth: number, u: number) => ({
  x: depth * 26 * u,
  y: depth * -18 * u,
  scale: 1 - depth * 0.065,
  rotate: depth * 1.4,
});

/**
 * Cycle two or more proof shots through a localized transparent deck. The
 * component never paints a full-screen page; the talking head remains visible
 * around the deck and its compact label block.
 */
export const BRollStack: React.FC<BRollStackProps> = ({
  items = [],
  visualVariant = "proofDeck",
  title,
  kicker,
  caption,
  holdSeconds = 1.35,
  aspect = 16 / 9,
  placement = "centerSafe",
  maxWidthRatio = 0.92,
  maxHeightRatio = 0.92,
  accentColor = "#E8B86D",
  theme = "dark",
  surfaceMode = "transparent",
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const palette = CODE_THEMES[theme];
  const zone = getForegroundZone({width, height, placement});
  const u = Math.min(width / 1920, height / 1080);
  const now = (frame / fps) * speed;
  const at = (seconds: number) => (seconds * fps) / speed;
  const ease = (from: number, to: number, easing = EASING.enter) =>
    interpolate(frame, [at(from), at(to)], [0, 1], {easing, ...clamp});
  const count = items.length;
  const headerIn = ease(T.header, T.header + 0.46);
  const deckIn = ease(T.deck, T.deck + 0.5, EASING.editorial);
  const cycle = holdSeconds + T.advance;
  const elapsed = Math.max(now - (T.deck + T.firstHold - holdSeconds), 0);
  const step = Math.floor(elapsed / cycle);
  const advance = interpolate(
    elapsed - step * cycle,
    [holdSeconds, cycle],
    [0, 1],
    {easing: EASING.editorial, ...clamp},
  );
  const front = count > 0 ? step + advance : 0;

  const hasHeader = Boolean(title || kicker || caption);
  const headerHeight = hasHeader
    ? Math.min(zone.height * 0.28, Math.max(112 * u, 70))
    : 0;
  const gap = hasHeader ? Math.max(12 * u, 8) : 0;
  const deckZone = {
    x: zone.x,
    y: zone.y + headerHeight + gap,
    width: zone.width,
    height: Math.max(zone.height - headerHeight - gap, 1),
  };
  const deckWidthRatio = Math.min(
    maxWidthRatio,
    Math.max((deckZone.width - 58 * u) / deckZone.width, 0.55),
  );
  const deckHeightRatio = Math.min(
    maxHeightRatio,
    Math.max((deckZone.height - 38 * u) / deckZone.height, 0.55),
  );
  const cardRect = fitAspectIntoRect({
    rect: deckZone,
    aspect,
    maxWidthRatio: deckWidthRatio,
    maxHeightRatio: deckHeightRatio,
    horizontalAlign: getPlacementHorizontalAlignment(placement),
  });
  const visibleDeckWidth = cardRect.width + 52 * u;
  const visibleDeckHeight = cardRect.height + 34 * u;
  const deckLeft = Math.min(
    Math.max(cardRect.x - 18 * u, zone.x),
    zone.x + zone.width - visibleDeckWidth,
  );
  const deckTop = Math.min(
    Math.max(cardRect.y + 18 * u, deckZone.y),
    deckZone.y + deckZone.height - visibleDeckHeight,
  );
  const cornerRadius = Math.max(12 * u, 7);
  const glassPadding = surfaceMode === "localizedGlass" ? 16 * u : 0;

  if (visualVariant === "evidenceTrack") {
    const wideTrack = placement === "centerSafe" || placement === "upperCenterSafe";
    const portrait = height > width;
    const trackZone = wideTrack
      ? {
          x: width * 0.06,
          y: height * (portrait ? 0.19 : 0.11),
          width: width * 0.88,
          height: height * (portrait ? 0.46 : 0.74),
        }
      : zone;
    const trackHeaderHeight = hasHeader
      ? Math.min(trackZone.height * 0.22, Math.max(92 * u, 62))
      : 0;
    const trackGap = hasHeader ? Math.max(14 * u, 8) : 0;
    const progressHeight = count > 1 ? Math.max(24 * u, 14) : 0;
    const viewportTop = trackZone.y + trackHeaderHeight + trackGap;
    const viewportHeight = Math.max(
      trackZone.height - trackHeaderHeight - trackGap - progressHeight,
      1,
    );
    const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
    const trackCardWidth = Math.min(
      trackZone.width * 0.68,
      viewportHeight * 0.94 * safeAspect,
    );
    const trackCardHeight = trackCardWidth / safeAspect;
    const centerLeft = (trackZone.width - trackCardWidth) / 2;
    const centerTop = Math.max((viewportHeight - trackCardHeight) / 2, 0);
    const stride = trackCardWidth * 0.91;
    const transitionFrames = Math.max(8, at(0.48));
    const railPosition = items.slice(1).reduce((total, item, index) => {
      const showAt = item.showAtInFrames ?? at(1.55 + index * (holdSeconds + 0.5));
      return total + interpolate(
        frame,
        [showAt, showAt + transitionFrames],
        [0, 1],
        {easing: EASING.editorial, ...clamp},
      );
    }, 0);
    const activeIndex = count > 0
      ? Math.min(count - 1, Math.max(0, Math.round(railPosition)))
      : 0;

    return (
      <div data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, width, height, overflow: "hidden", background: "transparent", fontFamily, pointerEvents: "none"}}>
        {hasHeader ? (
          <div style={{position: "absolute", left: trackZone.x, top: trackZone.y, width: trackZone.width, height: trackHeaderHeight, display: "flex", justifyContent: "space-between", alignItems: "flex-end", opacity: headerIn, translate: `0 ${(1 - headerIn) * 10 * u}px`}}>
            <div style={{minWidth: 0}}>
              {kicker ? <div style={{color: accentColor, fontSize: Math.max(16 * u, 12), fontWeight: 750, letterSpacing: "0.1em"}}>{kicker}</div> : null}
              {title ? <div style={{marginTop: kicker ? 4 * u : 0, color: palette.fg, fontSize: Math.max(30 * u, Math.min(trackZone.width * 0.052, 48 * u)), fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.025em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{title}</div> : null}
              {caption ? <div style={{marginTop: 5 * u, color: palette.dim, fontSize: Math.max(18 * u, 13), lineHeight: 1.24, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{caption}</div> : null}
            </div>
            {count > 1 ? <div style={{display: "flex", alignItems: "baseline", gap: 7 * u, color: palette.faint, fontVariantNumeric: "tabular-nums"}}><b style={{color: accentColor, fontSize: Math.max(25 * u, 17)}}>{String(activeIndex + 1).padStart(2, "0")}</b><span style={{fontSize: Math.max(14 * u, 10)}}>/ {String(count).padStart(2, "0")}</span></div> : null}
          </div>
        ) : null}

        <div style={{position: "absolute", left: trackZone.x, top: viewportTop, width: trackZone.width, height: viewportHeight, overflow: "hidden", opacity: deckIn, translate: `0 ${(1 - deckIn) * 22 * u}px`}}>
          {items.map((item, index) => {
            const relative = index - railPosition;
            const distance = Math.abs(relative);
            if (distance > 1.75) return null;
            const activeStrength = interpolate(distance, [0, 0.65], [1, 0], clamp);
            const trackScale = interpolate(distance, [0, 1, 1.7], [1, 0.78, 0.67], clamp);
            const trackOpacity = interpolate(distance, [0, 1.25, 1.75], [1, 0.58, 0], clamp);
            const trackRotate = interpolate(relative, [-1, 0, 1], [-4.5, 0, 4.5], clamp);
            return (
              <div key={`${item.src}-${index}`} style={{position: "absolute", left: centerLeft + relative * stride, top: centerTop, width: trackCardWidth, height: trackCardHeight, borderRadius: cornerRadius, overflow: "hidden", background: item.backgroundColor ?? palette.window, border: `1px solid ${activeStrength > 0.5 ? `${accentColor}A8` : palette.border}`, boxShadow: `0 ${(18 + activeStrength * 12) * u}px ${(46 + activeStrength * 28) * u}px rgba(0,0,0,${0.32 + activeStrength * 0.18}), 0 0 ${activeStrength * 34 * u}px ${accentColor}2E`, opacity: trackOpacity, scale: trackScale, rotate: `${trackRotate}deg`, zIndex: Math.round(100 - distance * 20), transformOrigin: "center center"}}>
                {isVideoSource(item.src) ? <Video src={item.src} muted loop fallbackOffthreadVideoProps={{pauseWhenBuffering: true}} style={{...getMediaObjectFitStyle(item.fit ?? "contain"), filter: `brightness(${0.68 + activeStrength * 0.32}) saturate(${0.72 + activeStrength * 0.28})`}} /> : <Img src={item.src} style={{...getMediaObjectFitStyle(item.fit ?? "contain"), filter: `brightness(${0.68 + activeStrength * 0.32}) saturate(${0.72 + activeStrength * 0.28})`}} />}
                <div style={{position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 54%, rgba(5,7,11,${0.7 + activeStrength * 0.16}) 100%)`}} />
                <div style={{position: "absolute", left: 18 * u, right: 18 * u, bottom: 15 * u, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 * u}}>
                  <div style={{display: "flex", alignItems: "center", gap: 10 * u, minWidth: 0}}>
                    <b style={{height: 28 * u, minWidth: 42 * u, padding: `0 ${9 * u}px`, display: "grid", placeItems: "center", borderRadius: 7 * u, background: activeStrength > 0.5 ? accentColor : `${accentColor}2E`, color: activeStrength > 0.5 ? palette.page : accentColor, fontSize: Math.max(12 * u, 9)}}>{String(index + 1).padStart(2, "0")}</b>
                    {item.title ? <span style={{color: palette.fg, fontSize: Math.max(21 * u, 14), fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{item.title}</span> : null}
                  </div>
                  <span style={{color: palette.faint, fontSize: Math.max(12 * u, 9), letterSpacing: "0.12em"}}>EVIDENCE</span>
                </div>
              </div>
            );
          })}
        </div>

        {count > 1 ? <div style={{position: "absolute", left: trackZone.x + trackZone.width * 0.34, bottom: height - (trackZone.y + trackZone.height), width: trackZone.width * 0.32, height: progressHeight, display: "flex", alignItems: "flex-end", gap: 7 * u, opacity: deckIn}}>{items.map((item, index) => <div key={`${item.src}-progress`} style={{height: Math.max(3 * u, 2), flex: index === activeIndex ? 2.2 : 1, borderRadius: 99, background: index === activeIndex ? accentColor : palette.border, boxShadow: index === activeIndex ? `0 0 ${12 * u}px ${accentColor}80` : "none"}} />)}</div> : null}
      </div>
    );
  }

  return (
    <div
      data-foreground-overlay-root="true"
      style={{
        position: "absolute",
        inset: 0,
        width,
        height,
        overflow: "hidden",
        background: "transparent",
        fontFamily,
        pointerEvents: "none",
      }}
    >
      {surfaceMode === "localizedGlass" ? (
        <div
          style={{
            position: "absolute",
            left: zone.x - glassPadding,
            top: zone.y - glassPadding,
            width: zone.width + glassPadding * 2,
            height: zone.height + glassPadding * 2,
            borderRadius: cornerRadius + glassPadding,
            background:
              "linear-gradient(145deg, rgba(7,10,16,0.66), rgba(7,10,16,0.38))",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 52px rgba(0,0,0,0.2)",
            opacity: deckIn,
          }}
        />
      ) : null}

      {hasHeader ? (
        <div
          style={{
            position: "absolute",
            left: zone.x,
            top: zone.y,
            width: zone.width,
            height: headerHeight,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            opacity: headerIn,
            translate: `0 ${(1 - headerIn) * 10 * u}px`,
          }}
        >
          {kicker ? (
            <div
              style={{
                color: accentColor,
                fontSize: Math.max(16 * u, 12),
                fontWeight: 650,
                letterSpacing: "0.1em",
              }}
            >
              {kicker}
            </div>
          ) : null}
          {title ? (
            <div
              style={{
                marginTop: kicker ? 4 * u : 0,
                color: palette.fg,
                fontSize: Math.max(30 * u, Math.min(zone.width * 0.075, 48 * u)),
                fontWeight: 760,
                lineHeight: 1.08,
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </div>
          ) : null}
          {caption ? (
            <div
              style={{
                marginTop: 5 * u,
                color: palette.dim,
                fontSize: Math.max(18 * u, 13),
                lineHeight: 1.28,
              }}
            >
              {caption}
            </div>
          ) : null}
          {count > 1 ? (
            <div
              style={{
                position: "absolute",
                right: 0,
                bottom: 0,
                color: palette.faint,
                fontSize: Math.max(16 * u, 12),
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {String((Math.round(front) % count) + 1).padStart(2, "0")} /{" "}
              {String(count).padStart(2, "0")}
            </div>
          ) : null}
        </div>
      ) : null}

      {items.map((item, index) => {
        const depth = count > 0 ? (((index - front) % count) + count) % count : 0;
        if (depth > 2.6) return null;
        const spot = deckPlacement(depth, u);
        const isFront = depth < 0.5;
        const fade = interpolate(depth, [2, 2.6], [1, 0], clamp);

        return (
          <div
            key={`${item.src}-${index}`}
            style={{
              position: "absolute",
              left: deckLeft,
              top: deckTop,
              width: cardRect.width,
              height: cardRect.height,
              borderRadius: cornerRadius,
              overflow: "hidden",
              background: item.backgroundColor ?? palette.window,
              border: `1px solid ${isFront ? `${accentColor}72` : palette.border}`,
              boxShadow: `0 ${(12 + (2 - depth) * 9) * u}px ${(34 + (2 - depth) * 18) * u}px ${palette.shadow}`,
              opacity: deckIn * fade,
              translate: `${spot.x}px ${spot.y + (1 - deckIn) * 30 * u}px`,
              scale: `${spot.scale}`,
              rotate: `${spot.rotate}deg`,
              zIndex: Math.round(100 - depth * 10),
            }}
          >
            {isVideoSource(item.src) ? (
              <Video
                src={item.src}
                muted
                loop
                fallbackOffthreadVideoProps={{pauseWhenBuffering: true}}
                style={getMediaObjectFitStyle(item.fit ?? "cover")}
              />
            ) : (
              <Img
                src={item.src}
                style={getMediaObjectFitStyle(item.fit ?? "cover")}
              />
            )}

            <div
              style={{
                position: "absolute",
                inset: 0,
                background: palette.page,
                opacity: interpolate(depth, [0, 1], [0, 0.42], clamp),
              }}
            />

            {item.title || item.caption ? (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: `${48 * u}px ${18 * u}px ${15 * u}px`,
                  background: `linear-gradient(180deg, transparent, ${palette.page}D8 48%, ${palette.page}F2)`,
                  opacity: interpolate(depth, [0, 0.6], [1, 0], clamp),
                }}
              >
                {item.title ? (
                  <div
                    style={{
                      color: "#F5F6F8",
                      fontSize: Math.max(22 * u, 15),
                      fontWeight: 680,
                    }}
                  >
                    {item.title}
                  </div>
                ) : null}
                {item.caption ? (
                  <div
                    style={{
                      marginTop: 3 * u,
                      color: accentColor,
                      fontSize: Math.max(17 * u, 12),
                      fontWeight: 560,
                    }}
                  >
                    {item.caption}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
