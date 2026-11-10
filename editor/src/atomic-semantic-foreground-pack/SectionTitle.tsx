import React from "react";
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {getMasterAlignmentTokens} from "./lib/layout";

export const SectionTitle: React.FC<{text: string; english?: string; accentColor?: string}> = ({text, english = "", accentColor = "#FFB84A"}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, width, height} = useVideoConfig();
  const u = Math.min(width / 2560, height / 1440);
  const alignment = getMasterAlignmentTokens({width, height});
  const enter = interpolate(frame, [0, 9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exit = interpolate(frame, [Math.max(0, durationInFrames - 10), durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const headline = text;
  const setup = english;

  return (
    <AbsoluteFill data-section-title="true" style={{pointerEvents: 'none', zIndex: 100, background: 'transparent'}}>
      <div
        style={{
          position: 'absolute',
          left: alignment.sectionTitleLeft,
          top: 82 * u,
          maxWidth: width * 0.46,
          opacity: enter * exit,
          transform: `translateX(${(1 - enter) * -22 * u}px)`,
          fontFamily: 'Microsoft YaHei, Segoe UI, sans-serif',
          textShadow: '0 4px 12px rgba(0,0,0,.42)',
        }}
      >
        {setup ? (
          <div
            style={{
              color: accentColor,
              fontSize: 20 * u,
              lineHeight: 1.2,
              fontWeight: 850,
              letterSpacing: 3.2 * u,
            }}
          >
            {setup}
          </div>
        ) : null}
        <div
          style={{
            marginTop: setup ? 7 * u : 0,
            color: '#FFFDF7',
            fontSize: 46 * u,
            lineHeight: 1.13,
            fontWeight: 900,
            letterSpacing: -1.1 * u,
            textWrap: 'balance',
          }}
        >
          {headline}
        </div>
      </div>
    </AbsoluteFill>
  );
};
