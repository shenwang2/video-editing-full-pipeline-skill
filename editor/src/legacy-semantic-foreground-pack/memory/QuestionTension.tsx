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
  ForegroundPlacement,
  getAlignedX,
  getForegroundZone,
} from "../lib/layout";
import {EDITABLE_ROOM_LIGHT_PALETTE, ROOM_LIGHT_PALETTE} from "../lib/room-light-palette";

const FONT = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type QuestionTensionProps = {
  setup?: string;
  question: string;
  highlight?: string;
  placement?: ForegroundPlacement;
  accentColor?: string;
  secondaryAccentColor?: string;
  visualVariant?: "openQuestion" | "suspenseGap";
  showAtInFrames?: number;
  exitAtInFrames?: number;
  exitInFrames?: number;
};

export const QuestionTension: React.FC<QuestionTensionProps> = ({
  setup,
  question,
  highlight,
  placement = "rightMiddle",
  accentColor = ROOM_LIGHT_PALETTE.浅紫.hex,
  secondaryAccentColor = ROOM_LIGHT_PALETTE.浅紫.hex,
  visualVariant = "openQuestion",
  showAtInFrames = 0,
  exitAtInFrames,
  exitInFrames = 12,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const zone = getForegroundZone({ width, height, placement });
  const u = Math.max(0.52, Math.min(zone.width / 700, zone.height / 470, 1.55));
  const panelWidth = 680 * u;
  const panelHeight = 460 * u;
  const x = getAlignedX({ zone, itemWidth: panelWidth, placement });
  const y = zone.y + (zone.height - panelHeight) / 2;
  const arc = interpolate(
    frame,
    [showAtInFrames + 4, showAtInFrames + 34],
    [0, 1],
    { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) },
  );
  const setupIn = interpolate(
    frame,
    [showAtInFrames + 14, showAtInFrames + 28],
    [0, 1],
    clamp,
  );
  const questionIn = interpolate(
    frame,
    [showAtInFrames + 28, showAtInFrames + 44],
    [0, 1],
    { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) },
  );
  const line = interpolate(
    frame,
    [showAtInFrames + 46, showAtInFrames + 62],
    [0, 1],
    { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) },
  );
  const exit =
    exitAtInFrames === undefined
      ? 0
      : interpolate(
          frame,
          [exitAtInFrames, exitAtInFrames + exitInFrames],
          [0, 1],
          { ...clamp, easing: Easing.bezier(0.7, 0, 0.84, 0) },
        );
  const hit = highlight ? question.indexOf(highlight) : -1;
  const content =
    hit < 0 || !highlight ? (
      question
    ) : (
      <>
        {question.slice(0, hit)}
        <span style={{ color: accentColor }}>{highlight}</span>
        {question.slice(hit + highlight.length)}
      </>
    );
  if (visualVariant === "suspenseGap") {
    const suspense = EDITABLE_ROOM_LIGHT_PALETTE.浅紫;
    const questionSize = Math.min(
      78 * u,
      (panelWidth * 0.78) / Math.max(question.length * 0.48, 4.8),
    );
    const pulse = 0.72 + Math.sin(frame / 5) * 0.1;
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
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: panelWidth,
            height: panelHeight,
            opacity: 1 - exit,
            translate: `${(1 - questionIn) * 28 * u}px ${exit * 18 * u}px`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              padding: `${8 * u}px ${16 * u}px`,
              borderRadius: 999,
              color: suspense.hex,
              border: `1px solid rgba(${suspense.rgb},0.48)`,
              background: `rgba(${suspense.rgb},0.09)`,
              fontSize: 18 * u,
              fontWeight: 900,
              letterSpacing: 4 * u,
            }}
          >
            问题还没回答
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 78 * u,
              width: panelWidth * 0.84,
              height: 215 * u,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 8 * u,
                height: 215 * u * arc,
                borderRadius: 99,
                background: suspense.hex,
                boxShadow: `0 0 ${24 * u}px rgba(${suspense.rgb},0.62)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: panelWidth * 0.62 * arc,
                height: 3 * u,
                borderRadius: 99,
                background: `rgba(${suspense.rgb},0.72)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                bottom: 0,
                width: panelWidth * 0.72 * arc,
                height: 3 * u,
                borderRadius: 99,
                background: `rgba(${suspense.rgb},0.72)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 34 * u,
                top: 35 * u,
                width: panelWidth * 0.66,
                fontSize: questionSize,
                lineHeight: 1.15,
                fontWeight: 950,
                letterSpacing: 3 * u,
                color: "#FFFDF6",
                opacity: questionIn,
                translate: `0 ${(1 - questionIn) * 22 * u}px`,
              }}
            >
              {question}
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 108 * u,
              width: 118 * u,
              height: 118 * u,
              display: "grid",
              placeItems: "center",
              borderRadius: "50%",
              border: `2px solid rgba(${suspense.rgb},0.56)`,
              background: `rgba(${suspense.rgb},0.07)`,
              boxShadow: `0 0 ${30 * u * pulse}px rgba(${suspense.rgb},0.24)`,
              color: suspense.hex,
              fontSize: 92 * u,
              lineHeight: 1,
              fontWeight: 950,
              opacity: questionIn,
              scale: 0.88 + questionIn * 0.12,
            }}
          >
            ?
          </div>
          {setup ? (
            <div
              style={{
                position: "absolute",
                left: 4 * u,
                top: 330 * u,
                maxWidth: panelWidth * 0.88,
                fontSize: 25 * u,
                fontWeight: 680,
                letterSpacing: 3 * u,
                color: "rgba(255,255,255,0.56)",
                opacity: setupIn,
              }}
            >
              {setup}
            </div>
          ) : null}
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
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: panelWidth,
          height: panelHeight,
          opacity: 1 - exit,
          translate: `0px ${exit * 18 * u}px`,
        }}
      >
        <svg
          width={350 * u}
          height={350 * u}
          viewBox="0 0 200 200"
          style={{
            position: "absolute",
            right: -18 * u,
            top: -54 * u,
            opacity: 0.76,
          }}
        >
          <circle
            cx="100"
            cy="100"
            r="76"
            fill="none"
            stroke={`${accentColor}66`}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="478"
            strokeDashoffset={478 * (1 - arc)}
            transform="rotate(-112 100 100)"
          />
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke={`${accentColor}2E`}
            strokeWidth="1.5"
            strokeDasharray="10 15"
            strokeDashoffset={interpolate(
              frame,
              [showAtInFrames, showAtInFrames + 85],
              [120, 0],
              clamp,
            )}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            right: 64 * u,
            top: 0,
            fontSize: 210 * u,
            lineHeight: 1,
            fontWeight: 950,
            color: `${accentColor}22`,
            WebkitTextStroke: `${2 * u}px ${accentColor}70`,
            rotate: interpolate(
              frame,
              [showAtInFrames + 4, showAtInFrames + 28],
              ["-18deg", "0deg"],
              { ...clamp, easing: Easing.spring({ damping: 17 }) },
            ),
            scale: spring({
              frame: frame - showAtInFrames - 4,
              fps,
              config: { damping: 15, mass: 0.7, stiffness: 155 },
            }),
          }}
        >
          ?
        </div>
        {setup ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 90 * u,
              fontSize: 54 * u,
              lineHeight: 1.25,
              fontWeight: 760,
              color: "rgba(255,253,246,0.66)",
              opacity: setupIn,
              translate: `${(1 - setupIn) * 24 * u}px 0px`,
            }}
          >
            {setup}
          </div>
        ) : null}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: (setup ? 166 : 120) * u,
            maxWidth: 650 * u,
            fontSize: 94 * u,
            lineHeight: 1.14,
            fontWeight: 950,
            color: "#FFFDF6",
            opacity: questionIn,
            translate: `0px ${(1 - questionIn) * 28 * u}px`,
          }}
        >
          {content}
        </div>
        <div
          style={{
            position: "absolute",
            left: 2 * u,
            top: 310 * u,
            width: 455 * u * line,
            height: 3 * u,
            background: accentColor,
            opacity: 0.78,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
