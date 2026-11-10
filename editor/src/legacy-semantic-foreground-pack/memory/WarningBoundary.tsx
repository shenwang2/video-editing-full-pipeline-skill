import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  estimateWrappedLineCount,
  getContentCardWidth,
  getForegroundTypographyScale,
} from "../lib/content-sizing";
import {
  ForegroundPlacement,
  getAlignedX,
  getForegroundZone,
} from "../lib/layout";
import {EDITABLE_ROOM_LIGHT_PALETTE, ROOM_LIGHT_PALETTE} from "../lib/room-light-palette";

const FONT = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const Corner: React.FC<{
  position: "tl" | "tr" | "bl" | "br";
  progress: number;
  color: string;
  scale: number;
}> = ({ position, progress, color, scale }) => {
  const top = position.startsWith("t") ? 0 : undefined;
  const bottom = position.startsWith("b") ? 0 : undefined;
  const left = position.endsWith("l") ? 0 : undefined;
  const right = position.endsWith("r") ? 0 : undefined;
  return (
    <div
      style={{
        position: "absolute",
        top,
        bottom,
        left,
        right,
        width: 62 * scale,
        height: 62 * scale,
        opacity: progress,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: top === 0 ? 0 : undefined,
          bottom: bottom === 0 ? 0 : undefined,
          left: 0,
          right: 0,
          height: 6 * scale,
          borderRadius: 99,
          backgroundColor: color,
          scale: `${progress} 1`,
          transformOrigin: left === 0 ? "left center" : "right center",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: left === 0 ? 0 : undefined,
          right: right === 0 ? 0 : undefined,
          top: 0,
          bottom: 0,
          width: 6 * scale,
          borderRadius: 99,
          backgroundColor: color,
          scale: `1 ${progress}`,
          transformOrigin: top === 0 ? "center top" : "center bottom",
        }}
      />
    </div>
  );
};
export type WarningBoundaryProps = {
  eyebrow?: string;
  lead?: string;
  warning: string;
  placement?: ForegroundPlacement;
  warningColor?: string;
  visualVariant?: "blockedRisk" | "riskLock";
  showAtInFrames?: number;
  exitAtInFrames?: number;
  exitInFrames?: number;
};

export const WarningBoundary: React.FC<WarningBoundaryProps> = ({
  eyebrow = "风险提醒",
  lead,
  warning,
  placement = "leftMiddle",
  warningColor = ROOM_LIGHT_PALETTE.亮红.hex,
  visualVariant = "blockedRisk",
  showAtInFrames = 0,
  exitAtInFrames,
  exitInFrames = 12,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const zone = getForegroundZone({ width, height, placement });
  const u = getForegroundTypographyScale({ width, height });
  const horizontalPadding = 42 * u;
  const headerSize = 26 * u;
  const warningSize = 94 * u;
  const auxiliarySize = 28 * u;
  const warningTrailingWidth = 82 * u;
  const panelWidth = getContentCardWidth({
    rows: [
      {
        text: eyebrow,
        fontSize: headerSize,
        letterSpacing: 5 * u,
        trailingWidth: 76 * u,
      },
      {
        text: warning,
        fontSize: warningSize,
        trailingWidth: warningTrailingWidth,
      },
    ],
    horizontalPadding,
    minWidth: 500 * u,
    maxWidth: zone.width,
  });
  const contentWidth = Math.max(1, panelWidth - horizontalPadding * 2);
  const warningLines = estimateWrappedLineCount({
    text: warning,
    fontSize: warningSize,
    availableWidth: Math.max(1, contentWidth - warningTrailingWidth),
  });
  const auxiliaryLines = lead
    ? Math.min(
        2,
        estimateWrappedLineCount({
          text: lead,
          fontSize: auxiliarySize,
          availableWidth: panelWidth,
        }),
      )
    : 0;
  const panelHeight = Math.min(
    zone.height,
    42 * u + 58 * u + 19 * u + warningLines * warningSize * 1.12 + 42 * u,
  );
  const auxiliaryHeight = auxiliaryLines * auxiliarySize * 1.3;
  const groupHeight = panelHeight + (lead ? 14 * u + auxiliaryHeight : 0);
  const x = getAlignedX({ zone, itemWidth: panelWidth, placement });
  const y = zone.y + (zone.height - groupHeight) / 2;
  const enter = interpolate(
    frame,
    [showAtInFrames, showAtInFrames + 12],
    [0, 1],
    clamp,
  );
  const corner = interpolate(
    frame,
    [showAtInFrames + 4, showAtInFrames + 24],
    [0, 1],
    { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) },
  );
  const leadIn = interpolate(
    frame,
    [showAtInFrames + 20, showAtInFrames + 34],
    [0, 1],
    clamp,
  );
  const warningIn = interpolate(
    frame,
    [showAtInFrames + 32, showAtInFrames + 48],
    [0, 1],
    { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) },
  );
  const symbolIn = spring({
    frame: frame - showAtInFrames - 52,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 180 },
  });
  const exit =
    exitAtInFrames === undefined
      ? 0
      : interpolate(
          frame,
          [exitAtInFrames, exitAtInFrames + exitInFrames],
          [0, 1],
          { ...clamp, easing: Easing.bezier(0.7, 0, 0.84, 0) },
        );
  if (visualVariant === "riskLock") {
    const risk = EDITABLE_ROOM_LIGHT_PALETTE.亮红;
    const rail = interpolate(
      frame,
      [showAtInFrames + 4, showAtInFrames + 34],
      [0, 1],
      { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) },
    );
    return (
      <AbsoluteFill
        data-foreground-overlay-root="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "transparent",
          pointerEvents: "none",
          fontFamily: FONT,
        }}
      >
        <div
          data-content-sized-surface="warning"
          data-card-copy-structure="label-primary"
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: panelWidth,
            height: panelHeight,
            minHeight: 176 * u,
            padding: `${28 * u}px ${34 * u}px ${28 * u}px ${144 * u}`,
            boxSizing: "border-box",
            borderRadius: 28 * u,
            background: `linear-gradient(145deg, rgba(${risk.rgb},0.11), rgba(9,10,14,0.68))`,
            border: `1px solid rgba(${risk.rgb},0.56)`,
            boxShadow: `0 ${22 * u}px ${54 * u}px rgba(0,0,0,0.34), 0 0 ${38 * u}px rgba(${risk.rgb},0.14), inset 0 1px 0 rgba(255,255,255,0.09)`,
            opacity: enter * (1 - exit),
            translate: `${(1 - enter) * -24 * u}px ${exit * 18 * u}px`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: panelWidth * rail,
              height: 6 * u,
              borderRadius: `${28 * u}px ${28 * u}px 99px 99px`,
              background: risk.hex,
              boxShadow: `0 0 ${24 * u}px rgba(${risk.rgb},0.72)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 30 * u,
              top: 31 * u,
              width: 86 * u,
              height: 86 * u,
              display: "grid",
              placeItems: "center",
              background: `rgba(${risk.rgb},0.10)`,
              border: `2px solid rgba(${risk.rgb},0.72)`,
              clipPath:
                "polygon(28% 0,72% 0,100% 28%,100% 72%,72% 100%,28% 100%,0 72%,0 28%)",
              boxShadow: `0 0 ${30 * u}px rgba(${risk.rgb},0.24)`,
              scale: 0.84 + symbolIn * 0.16,
            }}
          >
            <span
              style={{
                color: risk.hex,
                fontSize: 58 * u,
                lineHeight: 1,
                fontWeight: 950,
              }}
            >
              !
            </span>
          </div>
          <div
            data-card-label="true"
            style={{
              color: risk.hex,
              fontSize: 18 * u,
              fontWeight: 900,
              letterSpacing: 4 * u,
              opacity: warningIn,
            }}
          >
            {eyebrow}
          </div>
          <div
            data-primary-text="true"
            data-hero-text="true"
            style={{
              marginTop: 13 * u,
              color: "#FFFDF8",
              fontSize: Math.min(warningSize, 70 * u),
              lineHeight: 1.1,
              fontWeight: 950,
              letterSpacing: 3 * u,
              opacity: warningIn,
            }}
          >
            {warning}
          </div>
          <div
            style={{
              position: "absolute",
              right: 28 * u,
              top: 57 * u,
              width: 58 * u,
              height: 58 * u,
              display: "grid",
              placeItems: "center",
              borderRadius: "50%",
              border: `${3 * u}px solid ${risk.hex}`,
              opacity: symbolIn,
              scale: symbolIn,
            }}
          >
            <div
              style={{
                width: 31 * u,
                height: 7 * u,
                borderRadius: 99,
                background: risk.hex,
              }}
            />
          </div>
        </div>
        {lead ? (
          <div
            data-auxiliary-text="true"
            style={{
              position: "absolute",
              left: x + 8 * u,
              top: y + panelHeight + 14 * u,
              width: panelWidth,
              display: "flex",
              alignItems: "center",
              gap: 14 * u,
              color: "rgba(255,255,255,0.60)",
              fontSize: auxiliarySize,
              fontWeight: 680,
              letterSpacing: 3 * u,
              opacity: leadIn * (1 - exit),
            }}
          >
            <div
              style={{
                width: 40 * u,
                height: 4 * u,
                borderRadius: 99,
                background: risk.hex,
                boxShadow: `0 0 ${14 * u}px rgba(${risk.rgb},0.58)`,
              }}
            />
            {lead}
          </div>
        ) : null}
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
        fontFamily: FONT,
      }}
    >
      <div
        data-content-sized-surface="warning"
        data-card-copy-structure="label-primary"
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: panelWidth,
          height: panelHeight,
          padding: `${42 * u}px`,
          boxSizing: "border-box",
          background: `linear-gradient(135deg, ${warningColor}16, rgba(10,11,14,0.56))`,
          backdropFilter: "blur(10px) saturate(1.06)",
          borderRadius: 24 * u,
          outline: `1px solid ${warningColor}38`,
          boxShadow: `0 ${26 * u}px ${66 * u}px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06)`,
          opacity: enter * (1 - exit),
          translate: `0px ${exit * 18 * u}px`,
        }}
      >
        {(["tl", "tr", "bl", "br"] as const).map((position) => (
          <Corner
            key={position}
            position={position}
            progress={corner}
            color={warningColor}
            scale={u}
          />
        ))}
        <div
          data-card-label="true"
          style={{ display: "flex", alignItems: "center", gap: 16 * u }}
        >
          <div
            style={{
              width: 58 * u,
              height: 58 * u,
              borderRadius: 18 * u,
              display: "grid",
              placeItems: "center",
              backgroundColor: `${warningColor}1F`,
              outline: `1px solid ${warningColor}52`,
              scale: spring({
                frame: frame - showAtInFrames - 10,
                fps,
                config: { damping: 14, mass: 0.62, stiffness: 175 },
              }),
            }}
          >
            <svg width={34 * u} height={34 * u} viewBox="0 0 34 34">
              <path
                d="M17 4 L31 29 H3 Z"
                fill="none"
                stroke={warningColor}
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M17 11 V20"
                stroke={warningColor}
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <circle cx="17" cy="25" r="1.8" fill={warningColor} />
            </svg>
          </div>
          <div
            style={{
              fontSize: headerSize,
              fontWeight: 850,
              letterSpacing: 5 * u,
              color: warningColor,
            }}
          >
            {eyebrow}
          </div>
        </div>
        <div
          data-primary-text="true"
          data-hero-text="true"
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 19 * u,
            maxWidth: "100%",
            fontSize: warningSize,
            lineHeight: 1.12,
            fontWeight: 950,
            color: warningColor,
            opacity: warningIn,
            translate: `0px ${(1 - warningIn) * 26 * u}px`,
          }}
        >
          <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
            {warning}
          </span>
          <span
            style={{
              display: "inline-grid",
              placeItems: "center",
              width: 58 * u,
              height: 58 * u,
              marginLeft: 18 * u,
              borderRadius: 999,
              backgroundColor: `${warningColor}1A`,
              outline: `${3 * u}px solid ${warningColor}`,
              opacity: symbolIn,
              scale: symbolIn,
              transformOrigin: "center center",
              flex: "0 0 auto",
            }}
          >
            <span
              style={{
                width: 30 * u,
                height: 7 * u,
                borderRadius: 99,
                backgroundColor: warningColor,
              }}
            />
          </span>
        </div>
      </div>
      {lead ? (
        <div
          data-auxiliary-text="true"
          style={{
            position: "absolute",
            left: x,
            top: y + panelHeight + 14 * u,
            width: panelWidth,
            color: "rgba(255,253,246,0.68)",
            fontSize: auxiliarySize,
            lineHeight: 1.3,
            fontWeight: 620,
            opacity: leadIn * (1 - exit),
            translate: `0px ${(1 - leadIn) * 10 * u}px`,
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
          }}
        >
          {lead}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
