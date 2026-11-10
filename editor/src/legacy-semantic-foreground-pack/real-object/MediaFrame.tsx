import {Video} from "@remotion/media";
import {Img, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {CODE_THEMES} from "../lib/code-syntax";
import {
  fitAspectIntoRect,
  getForegroundZone,
  getPlacementHorizontalAlignment,
  type ForegroundPlacement,
  type Rect,
} from "../lib/layout";
import {EASING} from "../lib/motion-tokens";
import {
  getMediaObjectFitStyle,
  isVideoSource,
  type MediaFit,
} from "../lib/media-utils";

const fontFamily = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';

export type MediaFrameProps = {
  src: string;
  mode?: "show" | "recordedDemo";
  visualVariant?: "standard" | "cleanGlow";
  title?: string;
  caption?: string;
  eyebrow?: string;
  fit?: MediaFit;
  aspect?: number;
  sourceWidth?: number;
  sourceHeight?: number;
  /** Measured local foreground region. Never a full-screen scene selector. */
  placement?: ForegroundPlacement;
  /** Optional director-measured region; its visible edge wins over placement centering. */
  zoneOverride?: Rect;
  /** show accepts local/large only; detailTakeover is reserved for recordedDemo. */
  presentationScale?: "local" | "large" | "detailTakeover";
  /** Fraction of the selected local region, not the whole composition. */
  maxWidthRatio?: number;
  maxHeightRatio?: number;
  radius?: number;
  backgroundColor?: string;
  accentColor?: string;
  theme?: "dark" | "light";
  /** Optional glass belongs only to this local object; the root stays transparent. */
  surfaceMode?: "transparent" | "localizedGlass";
  muted?: boolean;
  loop?: boolean;
  volume?: number;
  playbackRate?: number;
  holdSeconds?: number;
  speed?: number;
};

const T = {
  open: 0,
  openTo: 0.62,
  eyebrow: 0.24,
  title: 0.34,
  caption: 0.58,
  push: 6,
  exitFor: 0.42,
} as const;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

/**
 * Present one real image or recording at the scale required to understand it.
 * Ordinary external materials stay measured and local/large. recordedDemo is
 * the only real-object mode allowed to take over the full frame.
 */
export const MediaFrame: React.FC<MediaFrameProps> = ({
  src,
  mode = "show",
  visualVariant = "standard",
  title,
  caption,
  eyebrow,
  fit = "contain",
  aspect,
  sourceWidth,
  sourceHeight,
  placement = "centerSafe",
  zoneOverride,
  presentationScale: presentationScaleInput,
  maxWidthRatio = 0.96,
  maxHeightRatio = 0.96,
  radius,
  backgroundColor,
  accentColor = "#E8B86D",
  theme = "dark",
  surfaceMode = "transparent",
  muted,
  loop,
  volume,
  playbackRate = 1,
  holdSeconds,
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const palette = CODE_THEMES[theme];
  const presentationScale =
    mode === "recordedDemo"
      ? "detailTakeover"
      : presentationScaleInput === "local"
        ? "local"
        : "large";
  const selectedZone = getForegroundZone({width, height, placement});
  const largeZone = height > width
    ? {x: width * 0.06, y: height * 0.12, width: width * 0.88, height: height * 0.7}
    : {x: width * 0.08, y: height * 0.15, width: width * 0.84, height: height * 0.7};
  const zone = zoneOverride ?? (
    presentationScale === "detailTakeover"
      ? {x: 0, y: 0, width, height}
      : presentationScale === "large"
        ? largeZone
        : selectedZone
  );
  const at = (seconds: number) => (seconds * fps) / speed;
  const ease = (from: number, to: number, easing = EASING.enter) =>
    interpolate(frame, [at(from), at(to)], [0, 1], {easing, ...clamp});

  const resolvedAspect =
    aspect ??
    (sourceWidth && sourceHeight && sourceHeight > 0
      ? sourceWidth / sourceHeight
      : 16 / 9);
  const u = Math.min(width / 1920, height / 1080);
  const open = ease(T.open, T.openTo, EASING.editorial);
  const eyebrowIn = eyebrow ? ease(T.eyebrow, T.eyebrow + 0.4) : 0;
  const titleIn = title ? ease(T.title, T.title + 0.45) : 0;
  const captionIn = caption ? ease(T.caption, T.caption + 0.45) : 0;
  const push = mode === "recordedDemo" ? 1 : ease(0, T.push, EASING.editorial);
  const exit =
    holdSeconds === undefined
      ? 0
      : interpolate(
          frame,
          [at(holdSeconds), at(holdSeconds + T.exitFor)],
          [0, 1],
          {easing: EASING.exit, ...clamp},
        );

  const showLocalLabels = presentationScale !== "detailTakeover";
  const titleSize = Math.max(28 * u, Math.min(46 * u, zone.width * 0.075));
  const eyebrowBlock = showLocalLabels && eyebrow ? Math.max(24 * u, titleSize * 0.62) : 0;
  const titleBlock = showLocalLabels && title ? titleSize * 1.18 + 10 * u : 0;
  const captionBlock = showLocalLabels && caption ? Math.max(28 * u, titleSize * 0.72) + 10 * u : 0;
  const headerHeight = eyebrowBlock + titleBlock;
  const mediaZone = {
    x: zone.x,
    y: zone.y + headerHeight,
    width: zone.width,
    height: Math.max(zone.height - headerHeight - captionBlock, 1),
  };
  const mediaRect = fitAspectIntoRect({
    rect: mediaZone,
    aspect: resolvedAspect,
    maxWidthRatio: presentationScale === "detailTakeover" ? 1 : maxWidthRatio,
    maxHeightRatio: presentationScale === "detailTakeover" ? 1 : maxHeightRatio,
    horizontalAlign: getPlacementHorizontalAlignment(placement),
  });
  const groupHeight = headerHeight + mediaRect.height + captionBlock;
  const naturalGroupTop = zone.y + Math.max((zone.height - groupHeight) / 2, 0);
  const detailTakeover = presentationScale === "detailTakeover";
  const cornerRadius = detailTakeover ? 0 : radius ?? Math.max(12 * u, 6);
  const localGlassPadding = !detailTakeover && surfaceMode === "localizedGlass" ? 16 * u : 0;
  const groupLeft = detailTakeover ? 0 : mediaRect.x - localGlassPadding;
  const groupTop = detailTakeover ? 0 : naturalGroupTop - localGlassPadding;
  const visibleGroupWidth = detailTakeover
    ? width
    : mediaRect.width + localGlassPadding * 2;
  const visibleGroupHeight = detailTakeover
    ? height
    : groupHeight + localGlassPadding * 2;
  const mediaLeft = detailTakeover ? mediaRect.x : localGlassPadding;
  const mediaTop = detailTakeover ? mediaRect.y : localGlassPadding + headerHeight;

  if (mode === "show" && visualVariant === "cleanGlow") {
    const footerHeight = title || caption ? 58 * u : 0;
    const cleanMediaZone = {
      x: zone.x,
      y: zone.y,
      width: zone.width,
      height: Math.max(zone.height - footerHeight, 1),
    };
    const cleanMediaRect = fitAspectIntoRect({
      rect: cleanMediaZone,
      aspect: resolvedAspect,
      maxWidthRatio,
      maxHeightRatio,
      horizontalAlign: getPlacementHorizontalAlignment(placement),
    });
    const cleanGroupHeight = cleanMediaRect.height + footerHeight;
    const cleanTop = zone.y + Math.max((zone.height - cleanGroupHeight) / 2, 0);
    const cleanEnter = spring({
      frame: frame - at(0.08),
      fps,
      config: {damping: 20, mass: 0.8, stiffness: 150},
    });
    const cleanLabelIn = ease(0.38, 0.76);
    const cleanFooterIn = ease(0.62, 1.04);
    const cleanRadius = radius ?? Math.max(12 * u, 6);
    const cleanLabel = eyebrow ?? "真实素材";

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
        <div
          style={{
            position: "absolute",
            left: cleanMediaRect.x + cleanMediaRect.width * 0.04,
            top: cleanTop + cleanMediaRect.height * 0.07,
            width: cleanMediaRect.width * 0.92,
            height: cleanMediaRect.height * 0.86,
            borderRadius: cleanRadius * 2.3,
            background: `radial-gradient(ellipse at 28% 18%, ${accentColor}4D, transparent 52%), radial-gradient(ellipse at 76% 76%, ${accentColor}38, transparent 56%)`,
            filter: `blur(${Math.max(22 * u, 12)}px)`,
            opacity: cleanEnter * 0.72 * (1 - exit),
            scale: 0.94 + cleanEnter * 0.06,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: cleanMediaRect.x,
            top: cleanTop,
            width: cleanMediaRect.width,
            height: cleanMediaRect.height,
            overflow: "hidden",
            borderRadius: cleanRadius,
            background: backgroundColor ?? palette.window,
            border: "1px solid rgba(255,255,255,0.20)",
            boxShadow: `0 ${24 * u}px ${68 * u}px rgba(0,0,0,0.48), 0 0 ${44 * u}px ${accentColor}29, 0 0 ${78 * u}px ${accentColor}14`,
            opacity: cleanEnter * (1 - exit),
            translate: `0px ${(1 - cleanEnter) * 18 * u + exit * 16 * u}px`,
            scale: 0.985 + cleanEnter * 0.015,
          }}
        >
          {isVideoSource(src) ? (
            <Video
              src={src}
              muted={muted ?? true}
              loop={loop ?? true}
              volume={volume ?? 0}
              playbackRate={playbackRate}
              fallbackOffthreadVideoProps={{pauseWhenBuffering: true}}
              style={getMediaObjectFitStyle(fit)}
            />
          ) : (
            <Img src={src} style={getMediaObjectFitStyle(fit)} />
          )}
          <div style={{position: "absolute", inset: 0, borderRadius: cleanRadius, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)"}} />
          <div
            style={{
              position: "absolute",
              left: 18 * u,
              top: 18 * u,
              padding: `${8 * u}px ${14 * u}px`,
              borderRadius: 9 * u,
              background: "rgba(10,13,18,0.72)",
              border: `1px solid ${accentColor}6B`,
              color: accentColor,
              fontSize: Math.max(15 * u, 10),
              fontWeight: 850,
              letterSpacing: u,
              opacity: cleanLabelIn,
              translate: `${(1 - cleanLabelIn) * -8 * u}px 0px`,
            }}
          >
            {cleanLabel}
          </div>
        </div>
        {footerHeight > 0 ? (
          <div
            style={{
              position: "absolute",
              left: cleanMediaRect.x,
              top: cleanTop + cleanMediaRect.height + 16 * u,
              width: cleanMediaRect.width,
              height: footerHeight - 16 * u,
              display: "flex",
              alignItems: "center",
              gap: 12 * u,
              opacity: cleanFooterIn * (1 - exit),
              translate: `0px ${(1 - cleanFooterIn) * 8 * u}px`,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            <div style={{width: 34 * u, height: 4 * u, flex: "0 0 auto", borderRadius: 99, background: accentColor}} />
            {title ? <div style={{color: palette.fg, fontSize: Math.max(22 * u, 14), fontWeight: 780, overflow: "hidden", textOverflow: "ellipsis"}}>{title}</div> : null}
            {title && caption ? <div style={{width: 1, height: 20 * u, flex: "0 0 auto", background: "rgba(255,255,255,0.18)"}} /> : null}
            {caption ? <div style={{minWidth: 0, color: palette.dim, fontSize: Math.max(18 * u, 12), fontWeight: 620, overflow: "hidden", textOverflow: "ellipsis"}}>{caption}</div> : null}
          </div>
        ) : null}
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
      <div
        style={{
          position: "absolute",
          left: groupLeft,
          top: groupTop,
          width: visibleGroupWidth,
          height: visibleGroupHeight,
          borderRadius: cornerRadius + localGlassPadding,
          background: detailTakeover
            ? backgroundColor ?? "linear-gradient(145deg, #070A10, #111827)"
            : surfaceMode === "localizedGlass"
              ? "linear-gradient(145deg, rgba(7,10,16,0.72), rgba(7,10,16,0.42))"
              : "transparent",
          border:
            !detailTakeover && surfaceMode === "localizedGlass"
              ? "1px solid rgba(255,255,255,0.14)"
              : "none",
          boxShadow:
            !detailTakeover && surfaceMode === "localizedGlass"
              ? "inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 54px rgba(0,0,0,0.22)"
              : "none",
          opacity: 1 - exit,
          translate: `0 ${exit * -22 * u}px`,
        }}
      >
        {showLocalLabels && eyebrow ? (
          <div
            style={{
              position: "absolute",
              left: localGlassPadding,
              top: localGlassPadding,
              width: mediaRect.width,
              height: eyebrowBlock,
              color: accentColor,
              fontSize: Math.max(16 * u, titleSize * 0.43),
              fontWeight: 650,
              letterSpacing: "0.1em",
              opacity: eyebrowIn,
              translate: `0 ${(1 - eyebrowIn) * 8 * u}px`,
            }}
          >
            {eyebrow}
          </div>
        ) : null}

        {showLocalLabels && title ? (
          <div
            style={{
              position: "absolute",
              left: localGlassPadding,
              top: localGlassPadding + eyebrowBlock,
              width: mediaRect.width,
              height: titleBlock,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                color: palette.fg,
                fontSize: titleSize,
                fontWeight: 760,
                lineHeight: 1.08,
                letterSpacing: "-0.02em",
                translate: `0 ${(1 - titleIn) * titleSize}px`,
              }}
            >
              {title}
            </div>
          </div>
        ) : null}

        <div
          style={{
            position: "absolute",
            left: mediaLeft,
            top: mediaTop,
            width: mediaRect.width,
            height: mediaRect.height,
            borderRadius: cornerRadius,
            overflow: "hidden",
            background: backgroundColor ?? palette.window,
            border: detailTakeover ? "none" : `1px solid ${palette.border}`,
            boxShadow: detailTakeover
              ? "none"
              : `inset 0 1px 0 ${palette.highlight}, 0 ${16 * u}px ${42 * u}px ${palette.shadow}`,
            clipPath: `inset(${(1 - open) * 50}% 0% ${(1 - open) * 50}% 0% round ${cornerRadius}px)`,
            scale: `${interpolate(open, [0, 1], [0.985, 1])}`,
          }}
        >
          {isVideoSource(src) ? (
            <Video
              src={src}
              muted={muted ?? mode !== "recordedDemo"}
              loop={loop ?? mode !== "recordedDemo"}
              volume={volume ?? (mode === "recordedDemo" ? 0.35 : 0)}
              playbackRate={playbackRate}
              fallbackOffthreadVideoProps={{pauseWhenBuffering: true}}
              style={{
                ...getMediaObjectFitStyle(fit),
                scale: `${interpolate(
                  push,
                  [0, 1],
                  [mode === "recordedDemo" ? 1 : 1.045, 1],
                )}`,
              }}
            />
          ) : (
            <Img
              src={src}
              style={{
                ...getMediaObjectFitStyle(fit),
                scale: `${interpolate(push, [0, 1], [1.045, 1])}`,
              }}
            />
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(180deg, ${accentColor}10, transparent 28%, transparent 76%, ${palette.shadow})`,
              opacity: open,
            }}
          />
        </div>

        {showLocalLabels && caption ? (
          <div
            style={{
              position: "absolute",
              left: localGlassPadding,
              top: localGlassPadding + headerHeight + mediaRect.height,
              width: mediaRect.width,
              height: captionBlock,
              display: "flex",
              alignItems: "flex-end",
              color: palette.dim,
              fontSize: Math.max(18 * u, titleSize * 0.52),
              fontWeight: 520,
              opacity: captionIn,
              translate: `0 ${(1 - captionIn) * 8 * u}px`,
            }}
          >
            {caption}
          </div>
        ) : null}
      </div>
    </div>
  );
};
