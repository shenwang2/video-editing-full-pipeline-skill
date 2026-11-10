import {Img, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {CODE_THEMES} from "../lib/code-syntax";
import {
  fitAspectIntoRect,
  getForegroundZone,
  getPlacementHorizontalAlignment,
  type ForegroundPlacement,
} from "../lib/layout";
import {EASING} from "../lib/motion-tokens";

const fontFamily = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';

export type SpotlightTarget = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CalloutSpotlightProps = {
  title: string;
  /** Optional bare colored label outside the screenshot; default card is unchanged. */
  labelAppearance?: "card" | "plainAccent";
  labelColor?: string;
  visualVariant?: "connectorCard" | "cornerFocus";
  subtitle?: string;
  kicker?: string;
  target: SpotlightTarget;
  backgroundSrc?: string;
  sourceWidth: number;
  sourceHeight: number;
  placement?: ForegroundPlacement;
  maxWidthRatio?: number;
  maxHeightRatio?: number;
  dim?: number;
  accentColor?: string;
  theme?: "dark" | "light";
  holdSeconds?: number;
  speed?: number;
};

const T = {
  background: 0,
  iris: 0.24,
  irisFor: 0.62,
  ping: 0.86,
  pingFor: 0.8,
  connector: 0.94,
  card: 1.04,
  kicker: 1.12,
  title: 1.2,
  subtitle: 1.36,
  exitFor: 0.38,
} as const;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const FocusCorner: React.FC<{
  left: number;
  top: number;
  flipX?: boolean;
  flipY?: boolean;
  progress: number;
  color: string;
  unit: number;
}> = ({left, top, flipX, flipY, progress, color, unit}) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      width: 25 * unit,
      height: 25 * unit,
      scale: progress,
      transformOrigin: `${flipX ? "right" : "left"} ${flipY ? "bottom" : "top"}`,
    }}
  >
    <div style={{position: "absolute", left: flipX ? undefined : 0, right: flipX ? 0 : undefined, top: flipY ? undefined : 0, bottom: flipY ? 0 : undefined, width: 25 * unit, height: 4 * unit, borderRadius: 99, background: color}} />
    <div style={{position: "absolute", left: flipX ? undefined : 0, right: flipX ? 0 : undefined, top: flipY ? undefined : 0, bottom: flipY ? 0 : undefined, width: 4 * unit, height: 25 * unit, borderRadius: 99, background: color}} />
  </div>
);

/**
 * Focus one exact region inside a local screenshot panel. The screenshot,
 * dimming mask, ping, connector, and callout all stay inside the selected
 * foreground zone; the talking-head background is never globally dimmed.
 */
export const CalloutSpotlight: React.FC<CalloutSpotlightProps> = ({
  title,
  labelAppearance = "card",
  labelColor,
  visualVariant = "connectorCard",
  subtitle,
  kicker,
  target,
  backgroundSrc,
  sourceWidth,
  sourceHeight,
  placement = "centerSafe",
  maxWidthRatio = 0.94,
  maxHeightRatio = 0.94,
  dim = 0.72,
  accentColor = "#E8B86D",
  theme = "dark",
  holdSeconds,
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const palette = CODE_THEMES[theme];
  const zone = getForegroundZone({width, height, placement});
  const u = Math.min(width / 1920, height / 1080);
  const at = (seconds: number) => (seconds * fps) / speed;
  const ease = (from: number, to: number, easing = EASING.enter) =>
    interpolate(frame, [at(from), at(to)], [0, 1], {easing, ...clamp});
  const exit =
    holdSeconds === undefined
      ? 0
      : interpolate(
          frame,
          [at(holdSeconds), at(holdSeconds + T.exitFor)],
          [0, 1],
          {easing: EASING.exit, ...clamp},
        );

  const safeSourceWidth = sourceWidth > 0 ? sourceWidth : 16;
  const safeSourceHeight = sourceHeight > 0 ? sourceHeight : 9;
  const sourceAspect = safeSourceWidth / safeSourceHeight;

  if (visualVariant === "cornerFocus") {
    const footerHeight = subtitle ? 54 * u : 0;
    const cornerPanelZone = {
      x: zone.x,
      y: zone.y,
      width: zone.width,
      height: Math.max(zone.height - footerHeight, 1),
    };
    const cornerPanel = fitAspectIntoRect({
      rect: cornerPanelZone,
      aspect: sourceAspect,
      maxWidthRatio,
      maxHeightRatio,
      horizontalAlign: getPlacementHorizontalAlignment(placement),
    });
    const cornerGroupHeight = cornerPanel.height + footerHeight;
    const cornerTop = zone.y + Math.max((zone.height - cornerGroupHeight) / 2, 0);
    const cornerTarget = {
      x: Math.min(Math.max((target.x / safeSourceWidth) * cornerPanel.width, 0), cornerPanel.width),
      y: Math.min(Math.max((target.y / safeSourceHeight) * cornerPanel.height, 0), cornerPanel.height),
      width: Math.min(Math.max((target.width / safeSourceWidth) * cornerPanel.width, 1), cornerPanel.width),
      height: Math.min(Math.max((target.height / safeSourceHeight) * cornerPanel.height, 1), cornerPanel.height),
    };
    cornerTarget.x = Math.min(cornerTarget.x, cornerPanel.width - cornerTarget.width);
    cornerTarget.y = Math.min(cornerTarget.y, cornerPanel.height - cornerTarget.height);
    const cornerEnter = Math.min(spring({frame: frame - at(0.08), fps, config: {damping: 20, mass: 0.82, stiffness: 145}}), 1);
    const cornerDim = ease(0.42, 0.82, EASING.editorial);
    const cornerFocus = Math.min(spring({frame: frame - at(0.7), fps, config: {damping: 17, mass: 0.7, stiffness: 175}}), 1);
    const cornerLabelIn = ease(0.92, 1.34);
    const cornerFooterIn = subtitle ? ease(1.1, 1.52) : 0;
    const cornerRadius = Math.max(12 * u, 6);
    const labelWidth = Math.min(Math.max(title.length * 30 * u + 32 * u, 150 * u), cornerPanel.width * 0.46);
    const proposedLabelLeft = cornerTarget.x + cornerTarget.width + 18 * u;
    const labelLeft = proposedLabelLeft + labelWidth <= cornerPanel.width - 12 * u
      ? proposedLabelLeft
      : Math.max(12 * u, cornerTarget.x - labelWidth - 18 * u);
    const labelTop = Math.min(Math.max(cornerTarget.y + cornerTarget.height / 2 - 24 * u, 12 * u), cornerPanel.height - 60 * u);

    return (
      <div data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, width, height, overflow: "hidden", background: "transparent", fontFamily, pointerEvents: "none"}}>
        <div style={{position: "absolute", left: cornerPanel.x + cornerPanel.width * 0.04, top: cornerTop + cornerPanel.height * 0.06, width: cornerPanel.width * 0.92, height: cornerPanel.height * 0.88, borderRadius: cornerRadius * 2.4, background: `radial-gradient(ellipse at 24% 16%, ${accentColor}47, transparent 54%), radial-gradient(ellipse at 78% 82%, ${accentColor}30, transparent 58%)`, filter: `blur(${Math.max(24 * u, 12)}px)`, opacity: 0.66 * cornerEnter * (1 - exit)}} />
        <div style={{position: "absolute", left: cornerPanel.x, top: cornerTop, width: cornerPanel.width, height: cornerPanel.height, overflow: "hidden", borderRadius: cornerRadius, background: palette.window, border: `1px solid ${palette.border}`, boxShadow: `0 ${24 * u}px ${68 * u}px rgba(0,0,0,0.46), 0 0 ${44 * u}px ${accentColor}1F`, opacity: cornerEnter * (1 - exit), translate: `0px ${(1 - cornerEnter) * 16 * u + exit * 14 * u}px`, scale: 0.988 + cornerEnter * 0.012}}>
          {backgroundSrc ? <Img src={backgroundSrc} style={{position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill"}} /> : <div style={{position: "absolute", inset: 0, display: "grid", placeItems: "center", color: palette.dim, background: palette.window}}>待替换真实截图</div>}
          <div style={{position: "absolute", inset: 0, background: `rgba(4,5,9,${dim * cornerDim * (1 - exit)})`}} />
          {backgroundSrc ? <Img src={backgroundSrc} style={{position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", clipPath: `inset(${cornerTarget.y}px ${cornerPanel.width - cornerTarget.x - cornerTarget.width}px ${cornerPanel.height - cornerTarget.y - cornerTarget.height}px ${cornerTarget.x}px)`}} /> : null}
          <div style={{position: "absolute", left: cornerTarget.x - 8 * u, top: cornerTarget.y - 6 * u, width: cornerTarget.width + 16 * u, height: cornerTarget.height + 12 * u, borderRadius: 10 * u, boxShadow: `0 0 ${28 * u}px ${accentColor}38`, opacity: cornerFocus}}>
            <FocusCorner left={0} top={0} progress={cornerFocus} color={accentColor} unit={u} />
            <FocusCorner left={cornerTarget.width - 9 * u} top={0} flipX progress={cornerFocus} color={accentColor} unit={u} />
            <FocusCorner left={0} top={cornerTarget.height - 13 * u} flipY progress={cornerFocus} color={accentColor} unit={u} />
            <FocusCorner left={cornerTarget.width - 9 * u} top={cornerTarget.height - 13 * u} flipX flipY progress={cornerFocus} color={accentColor} unit={u} />
          </div>
          <div style={{position: "absolute", left: labelLeft, top: labelTop, width: labelWidth, boxSizing: "border-box", padding: `${9 * u}px ${14 * u}px`, borderRadius: 9 * u, background: "rgba(10,13,18,0.78)", border: `1px solid ${accentColor}61`, color: palette.fg, fontSize: Math.max(17 * u, 12), fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", opacity: cornerLabelIn, translate: `${(1 - cornerLabelIn) * -10 * u}px 0px`}}>{kicker ? <span style={{marginRight: 9 * u, color: accentColor, fontSize: Math.max(13 * u, 10)}}>{kicker}</span> : null}{title}</div>
        </div>
        {subtitle ? <div style={{position: "absolute", left: cornerPanel.x, top: cornerTop + cornerPanel.height + 15 * u, width: cornerPanel.width, display: "flex", alignItems: "center", gap: 12 * u, color: palette.dim, fontSize: Math.max(19 * u, 13), fontWeight: 650, opacity: cornerFooterIn * (1 - exit), translate: `0px ${(1 - cornerFooterIn) * 8 * u}px`}}><div style={{width: 34 * u, height: 4 * u, borderRadius: 99, background: accentColor}} />{subtitle}</div> : null}
      </div>
    );
  }

  const cardHeight = Math.min(zone.height * 0.28, 170 * u);
  const gap = Math.max(12 * u, zone.height * 0.025);
  const panelZone = {
    x: zone.x,
    y: zone.y,
    width: zone.width,
    height: Math.max(zone.height - cardHeight - gap, 1),
  };
  const panel = fitAspectIntoRect({
    rect: panelZone,
    aspect: sourceAspect,
    maxWidthRatio,
    maxHeightRatio,
    horizontalAlign: getPlacementHorizontalAlignment(placement),
  });
  const groupHeight = panel.height + gap + cardHeight;
  const groupTop = zone.y + Math.max((zone.height - groupHeight) / 2, 0);
  const panelTop = groupTop;
  const panelLeft = panel.x;

  const targetRect = {
    x: Math.min(
      Math.max((target.x / safeSourceWidth) * panel.width, 0),
      panel.width,
    ),
    y: Math.min(
      Math.max((target.y / safeSourceHeight) * panel.height, 0),
      panel.height,
    ),
    width: Math.min(
      Math.max((target.width / safeSourceWidth) * panel.width, 1),
      panel.width,
    ),
    height: Math.min(
      Math.max((target.height / safeSourceHeight) * panel.height, 1),
      panel.height,
    ),
  };
  targetRect.x = Math.min(targetRect.x, panel.width - targetRect.width);
  targetRect.y = Math.min(targetRect.y, panel.height - targetRect.height);

  const backgroundIn = ease(T.background, T.background + 0.5, EASING.editorial);
  const iris = ease(T.iris, T.iris + T.irisFor, EASING.editorial);
  const ping = ease(T.ping, T.ping + T.pingFor, EASING.editorial);
  const connector = ease(T.connector, T.connector + 0.4, EASING.editorial);
  const cardIn = Math.min(
    spring({
      frame: frame - at(T.card),
      fps,
      config: {damping: 16, stiffness: 150, mass: 0.7},
    }),
    1,
  );
  const kickerIn = kicker ? ease(T.kicker, T.kicker + 0.36) : 0;
  const titleIn = ease(T.title, T.title + 0.42);
  const subtitleIn = subtitle ? ease(T.subtitle, T.subtitle + 0.42) : 0;
  const hole = {
    x: interpolate(iris, [0, 1], [0, targetRect.x]),
    y: interpolate(iris, [0, 1], [0, targetRect.y]),
    width: interpolate(iris, [0, 1], [panel.width, targetRect.width]),
    height: interpolate(iris, [0, 1], [panel.height, targetRect.height]),
  };
  const connectorX = targetRect.x + targetRect.width / 2;
  const connectorTop = targetRect.y + targetRect.height;
  const connectorHeight = Math.max(panel.height - connectorTop + gap, gap);
  const cornerRadius = Math.max(12 * u, 6);

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
          left: panelLeft,
          top: panelTop,
          width: panel.width,
          height: panel.height,
          overflow: "hidden",
          borderRadius: cornerRadius,
          background: palette.window,
          border: `1px solid ${palette.border}`,
          boxShadow: `inset 0 1px 0 ${palette.highlight}, 0 ${16 * u}px ${46 * u}px ${palette.shadow}`,
          opacity: 1 - exit,
        }}
      >
        {backgroundSrc ? (
          <Img
            src={backgroundSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              scale: `${interpolate(backgroundIn, [0, 1], [1.025, 1])}`,
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: palette.dim,
              fontSize: Math.max(18 * u, 14),
              background: "rgba(12,16,24,0.72)",
            }}
          >
            待替换真实截图
          </div>
        )}

        <div
          style={{
            position: "absolute",
            left: hole.x,
            top: hole.y,
            width: hole.width,
            height: hole.height,
            borderRadius: cornerRadius * iris,
            boxShadow: `0 0 0 ${Math.max(panel.width, panel.height)}px rgba(4,5,9,${
              dim * iris * (1 - exit)
            })`,
            border: `${Math.max(2 * u, 1)}px solid ${accentColor}${
              iris > 0.6 && exit < 0.5 ? "CC" : "00"
            }`,
          }}
        />

        <div
          style={{
            position: "absolute",
            left: targetRect.x,
            top: targetRect.y,
            width: targetRect.width,
            height: targetRect.height,
            borderRadius: cornerRadius,
            border: `${Math.max(2 * u, 1)}px solid ${accentColor}`,
            opacity: ping > 0 && ping < 1 ? (1 - ping) * 0.85 : 0,
            scale: `${interpolate(ping, [0, 1], [1, 1.1])}`,
          }}
        />

        <div
          style={{
            position: "absolute",
            left: connectorX - Math.max(u, 1),
            top: connectorTop,
            width: Math.max(2 * u, 1),
            height: connectorHeight,
            background: accentColor,
            transformOrigin: "top center",
            scale: `1 ${connector}`,
            opacity: 0.85 * (1 - exit),
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: panelLeft,
          top: panelTop + panel.height + gap,
          width: panel.width,
          minHeight: labelAppearance === "plainAccent" ? undefined : cardHeight,
          boxSizing: "border-box",
          borderRadius: labelAppearance === "plainAccent" ? 0 : cornerRadius,
          background: labelAppearance === "plainAccent" ? "transparent" :
            "linear-gradient(145deg, rgba(7,10,16,0.82), rgba(7,10,16,0.58))",
          border: labelAppearance === "plainAccent" ? "none" : "1px solid rgba(255,255,255,0.14)",
          boxShadow: labelAppearance === "plainAccent" ? "none" :
            "inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 42px rgba(0,0,0,0.24)",
          padding: labelAppearance === "plainAccent" ? 0 : `${Math.max(15 * u, 10)}px ${Math.max(20 * u, 14)}px`,
          opacity: cardIn * (1 - exit),
          translate: `0 ${((1 - cardIn) * 14 + exit * 12) * u}px`,
        }}
      >
        {kicker ? (
          <div
            style={{
              color: accentColor,
              fontSize: Math.max(16 * u, 12),
              fontWeight: 650,
              letterSpacing: "0.1em",
              opacity: kickerIn,
            }}
          >
            {kicker}
          </div>
        ) : null}
        <div style={{overflow: "hidden", marginTop: kicker ? 5 * u : 0}}>
          <div
            style={{
              color: labelAppearance === "plainAccent" ? labelColor ?? accentColor : palette.fg,
              fontSize: Math.max(30 * u, Math.min(panel.width * 0.075, 48 * u)),
              fontWeight: 760,
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
              translate: `0 ${(1 - titleIn) * 100}%`,
            }}
          >
            {title}
          </div>
        </div>
        {subtitle ? (
          <div
            style={{
              marginTop: 6 * u,
              color: palette.dim,
              fontSize: Math.max(19 * u, 14),
              lineHeight: 1.32,
              opacity: subtitleIn,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
};
