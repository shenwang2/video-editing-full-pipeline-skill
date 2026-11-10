import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {estimateWrappedLineCount} from "../lib/content-sizing";
import {ForegroundPlacement, getAlignedX, getForegroundZone} from "../lib/layout";
import {EASING} from "../lib/motion-tokens";
import {EDITABLE_ROOM_LIGHT_PALETTE} from "../lib/room-light-palette";

const FONT_FAMILY = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';

export type ConceptComparisonItem = {
  text: string;
  showAtInFrames?: number;
  emphasis?: boolean;
};

export type ConceptComparisonSide = {
  label: string;
  title: string;
  subtitle?: string;
  badge?: string;
  accentColor?: string;
  showAtInFrames?: number;
  items?: ConceptComparisonItem[];
};

export type ConceptComparisonCardsProps = {
  sides: [ConceptComparisonSide, ConceptComparisonSide];
  visualVariant?: "dualPeerCards" | "neonMirrorCompare";
  title?: string;
  eyebrow?: string;
  placement?: ForegroundPlacement;
  delayInFrames?: number;
  sideGapInFrames?: number;
  itemGapInFrames?: number;
  revealInFrames?: number;
  exitAtInFrames?: number;
  exitInFrames?: number;
};

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

/**
 * Two equal local cards for a non-numeric A/B comparison. The motion and
 * surface grammar are adapted from RemotionUI Pricing Card, with all pricing,
 * CTA, winner, and full-page semantics removed.
 */
export const ConceptComparisonCards: React.FC<ConceptComparisonCardsProps> = ({
  sides,
  visualVariant = "dualPeerCards",
  title,
  eyebrow = "COMPARE",
  placement = "centerSafe",
  delayInFrames = 4,
  sideGapInFrames = 10,
  itemGapInFrames = 7,
  revealInFrames = 18,
  exitAtInFrames,
  exitInFrames = 14,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const zone = getForegroundZone({width, height, placement});
  const maxItems = Math.max(...sides.map((side) => Math.min(side.items?.length ?? 0, 5)));
  const baseCardWidth = 450;
  const titleSize = 54;
  const subtitleSize = 32;
  const maxTitleLines = Math.max(...sides.map((side) => estimateWrappedLineCount({text: side.title, fontSize: titleSize, availableWidth: baseCardWidth - 48})));
  const maxSubtitleLines = Math.max(...sides.map((side) => side.subtitle ? estimateWrappedLineCount({text: side.subtitle, fontSize: subtitleSize, availableWidth: baseCardWidth - 48}) : 0));
  const cardHeightBase = 24 + 22 + 9 + maxTitleLines * titleSize * 1.08 + 24;
  const auxiliaryHeightBase = (maxSubtitleLines ? 12 + maxSubtitleLines * 25 * 1.22 : 0) + (maxItems ? 14 + 12 + maxItems * 30 * 1.18 + Math.max(0, maxItems - 1) * 10 : 0);
  const baseHeight = (title ? 96 : 12) + cardHeightBase + auxiliaryHeightBase;
  const u = Math.max(
    0.76,
    Math.min(zone.width / 920, zone.height / Math.max(baseHeight, 1), 1.48),
  );
  const panelWidth = Math.min(zone.width, 920 * u);
  const panelHeight = baseHeight * u;
  const gap = 20 * u;
  const cardWidth = (panelWidth - gap) / 2;
  const exit =
    exitAtInFrames === undefined
      ? 0
      : interpolate(
          frame,
          [exitAtInFrames, exitAtInFrames + exitInFrames],
          [0, 1],
          {easing: EASING.exit, ...clamp},
        );

  if (visualVariant === "neonMirrorCompare") {
    const cyanBlue = EDITABLE_ROOM_LIGHT_PALETTE.青蓝;
    const pink = cyanBlue;
    const deepPurple = cyanBlue;
    const leftSide = sides[0];
    const rightSide = sides[1];
    const leftItems = (leftSide.items ?? []).slice(0, 5);
    const rightItems = (rightSide.items ?? []).slice(0, 5);
    const pairCount = Math.max(leftItems.length, rightItems.length);
    const hasAuxiliary = Boolean(leftSide.subtitle || leftSide.badge || rightSide.subtitle || rightSide.badge);
    const mirrorBaseHeight = (title ? 84 : 0) + 108 + (hasAuxiliary ? 36 : 0) + pairCount * 78 + Math.max(0, pairCount - 1) * 14;
    const mirrorUnit = Math.max(0.68, Math.min(zone.width / 940, zone.height / Math.max(mirrorBaseHeight, 1), 1.46));
    const mirrorWidth = Math.min(zone.width, 940 * mirrorUnit);
    const mirrorHeight = mirrorBaseHeight * mirrorUnit;
    const centerGap = 54 * mirrorUnit;
    const sideWidth = (mirrorWidth - centerGap) / 2;
    const globalTitleHeight = title ? 84 * mirrorUnit : 0;
    const headerHeight = 108 * mirrorUnit;
    const auxiliaryHeight = hasAuxiliary ? 36 * mirrorUnit : 0;
    const rowHeight = 78 * mirrorUnit;
    const rowGap = 14 * mirrorUnit;
    const leftStart = leftSide.showAtInFrames ?? delayInFrames;
    const rightStart = rightSide.showAtInFrames ?? delayInFrames + sideGapInFrames;
    const leftIn = Math.min(1, spring({frame: frame - leftStart, fps, config: {damping: 18, stiffness: 150, mass: 0.78}}));
    const rightIn = Math.min(1, spring({frame: frame - rightStart, fps, config: {damping: 18, stiffness: 150, mass: 0.78}}));
    const spineStart = Math.min(leftStart, rightStart) + 8;
    const spineIn = interpolate(frame, [spineStart, spineStart + Math.max(18, fps * 0.6)], [0, 1], {easing: EASING.editorial, ...clamp});
    const contentTop = zone.y + Math.max((zone.height - mirrorHeight) / 2, 0);
    const rowsTop = globalTitleHeight + headerHeight + auxiliaryHeight + 16 * mirrorUnit;

    return (
      <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT_FAMILY}}>
        <div style={{position: "absolute", left: getAlignedX({zone, itemWidth: mirrorWidth, placement}), top: contentTop, width: mirrorWidth, height: mirrorHeight, opacity: 1 - exit, translate: `0 ${exit * 18 * mirrorUnit}px`}}>
          {title ? (
            <div style={{height: globalTitleHeight}}>
              <div style={{color: pink.hex, fontSize: Math.max(15 * mirrorUnit, 11), fontWeight: 820, letterSpacing: "0.12em", textShadow: `0 0 16px rgba(${pink.rgb},0.52)`}}>{eyebrow}</div>
              <div style={{marginTop: 7 * mirrorUnit, color: "#FFFFFF", fontSize: Math.max(39 * mirrorUnit, 25), lineHeight: 1, fontWeight: 900, letterSpacing: "-0.04em"}}>{title}</div>
            </div>
          ) : null}

          <div style={{position: "absolute", left: 0, top: globalTitleHeight, width: sideWidth, height: headerHeight, boxSizing: "border-box", padding: `${21 * mirrorUnit}px ${27 * mirrorUnit}px`, borderRadius: 27 * mirrorUnit, background: `linear-gradient(145deg, rgba(0,0,0,0.76), rgba(${cyanBlue.rgb},0.14))`, backdropFilter: `blur(${18 * mirrorUnit}px) saturate(1.18)`, border: `1px solid rgba(${cyanBlue.rgb},0.56)`, boxShadow: `inset 0 1px rgba(255,255,255,0.10), 0 ${18 * mirrorUnit}px ${38 * mirrorUnit}px rgba(0,0,0,0.28), 0 0 ${30 * mirrorUnit}px rgba(${cyanBlue.rgb},0.18)`, opacity: leftIn, translate: `${(1 - leftIn) * -44 * mirrorUnit}px 0`}}>
            <div style={{color: cyanBlue.hex, fontSize: Math.max(14 * mirrorUnit, 10), fontWeight: 820, letterSpacing: "0.1em", textShadow: `0 0 12px rgba(${cyanBlue.rgb},0.50)`}}>{leftSide.label}</div>
            <div style={{marginTop: 7 * mirrorUnit, color: "#FFFFFF", fontSize: Math.max(37 * mirrorUnit, 24), lineHeight: 1, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{leftSide.title}</div>
          </div>
          <div style={{position: "absolute", right: 0, top: globalTitleHeight, width: sideWidth, height: headerHeight, boxSizing: "border-box", padding: `${21 * mirrorUnit}px ${27 * mirrorUnit}px`, borderRadius: 27 * mirrorUnit, background: `linear-gradient(145deg, rgba(0,0,0,0.76), rgba(${pink.rgb},0.14))`, backdropFilter: `blur(${18 * mirrorUnit}px) saturate(1.18)`, border: `1px solid rgba(${pink.rgb},0.58)`, boxShadow: `inset 0 1px rgba(255,255,255,0.10), 0 ${18 * mirrorUnit}px ${38 * mirrorUnit}px rgba(0,0,0,0.28), 0 0 ${30 * mirrorUnit}px rgba(${pink.rgb},0.18)`, opacity: rightIn, translate: `${(1 - rightIn) * 44 * mirrorUnit}px 0`}}>
            <div style={{color: pink.hex, fontSize: Math.max(14 * mirrorUnit, 10), fontWeight: 820, letterSpacing: "0.1em", textShadow: `0 0 12px rgba(${pink.rgb},0.52)`}}>{rightSide.label}</div>
            <div style={{marginTop: 7 * mirrorUnit, color: "#FFFFFF", fontSize: Math.max(37 * mirrorUnit, 24), lineHeight: 1, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{rightSide.title}</div>
          </div>

          {hasAuxiliary ? (
            <div data-auxiliary-text="true" style={{position: "absolute", left: 0, right: 0, top: globalTitleHeight + headerHeight + 6 * mirrorUnit, height: auxiliaryHeight, display: "grid", gridTemplateColumns: `${sideWidth}px ${centerGap}px ${sideWidth}px`, alignItems: "center", fontSize: Math.max(16 * mirrorUnit, 11), fontWeight: 700}}>
              <div style={{color: "rgba(255,255,255,0.66)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{[leftSide.badge, leftSide.subtitle].filter(Boolean).join(" · ")}</div>
              <div />
              <div style={{color: "rgba(255,255,255,0.68)", textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{[rightSide.badge, rightSide.subtitle].filter(Boolean).join(" · ")}</div>
            </div>
          ) : null}

          <div style={{position: "absolute", left: mirrorWidth / 2 - mirrorUnit, top: globalTitleHeight + 26 * mirrorUnit, width: 2 * mirrorUnit, height: mirrorHeight - globalTitleHeight - 38 * mirrorUnit, background: deepPurple.hex, boxShadow: `0 0 ${20 * mirrorUnit}px rgba(${deepPurple.rgb},0.58)`, opacity: spineIn, scale: `1 ${spineIn}`, transformOrigin: "top center"}} />
          <div style={{position: "absolute", left: mirrorWidth / 2 - 29 * mirrorUnit, top: globalTitleHeight + 16 * mirrorUnit, width: 58 * mirrorUnit, height: 58 * mirrorUnit, display: "grid", placeItems: "center", borderRadius: "50%", color: "#FFFFFF", background: deepPurple.hex, border: `${5 * mirrorUnit}px solid rgba(10,10,16,0.78)`, boxSizing: "border-box", boxShadow: `0 0 ${28 * mirrorUnit}px rgba(${deepPurple.rgb},0.55)`, fontSize: Math.max(16 * mirrorUnit, 11), fontWeight: 950, opacity: spineIn, scale: 0.75 + spineIn * 0.25}}>VS</div>

          {Array.from({length: pairCount}).map((_, index) => {
            const leftItem = leftItems[index];
            const rightItem = rightItems[index];
            const leftItemStart = leftItem?.showAtInFrames ?? leftStart + revealInFrames + index * itemGapInFrames;
            const rightItemStart = rightItem?.showAtInFrames ?? rightStart + revealInFrames + index * itemGapInFrames;
            const leftItemIn = leftItem ? interpolate(frame, [leftItemStart, leftItemStart + 12], [0, 1], {easing: EASING.enter, ...clamp}) : 0;
            const rightItemIn = rightItem ? interpolate(frame, [rightItemStart, rightItemStart + 12], [0, 1], {easing: EASING.enter, ...clamp}) : 0;
            const nodeIn = Math.max(leftItemIn, rightItemIn);
            const top = rowsTop + index * (rowHeight + rowGap);
            return (
              <div key={`mirror-pair-${index}`} style={{position: "absolute", left: 0, right: 0, top, height: rowHeight, display: "grid", gridTemplateColumns: `${sideWidth}px ${centerGap}px ${sideWidth}px`, alignItems: "center"}}>
                <div style={{height: rowHeight, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: `0 ${26 * mirrorUnit}px`, boxSizing: "border-box", borderRadius: 21 * mirrorUnit, color: "#FFFFFF", background: `linear-gradient(90deg, rgba(0,0,0,0.54), rgba(${cyanBlue.rgb},0.16))`, backdropFilter: `blur(${15 * mirrorUnit}px)`, border: `1px solid rgba(${cyanBlue.rgb},0.34)`, boxShadow: `inset 0 1px rgba(255,255,255,0.07), 0 0 ${22 * mirrorUnit}px rgba(${cyanBlue.rgb},0.08)`, fontSize: Math.max(27 * mirrorUnit, 18), fontWeight: leftItem?.emphasis ? 900 : 800, opacity: leftItemIn, translate: `${(1 - leftItemIn) * -34 * mirrorUnit}px 0`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{leftItem?.text ?? ""}</div>
                <div style={{justifySelf: "center", width: 15 * mirrorUnit, height: 15 * mirrorUnit, borderRadius: "50%", background: deepPurple.hex, border: `${4 * mirrorUnit}px solid rgba(0,0,0,0.82)`, boxSizing: "border-box", boxShadow: `0 0 ${(12 + nodeIn * 17) * mirrorUnit}px rgba(${deepPurple.rgb},${0.3 + nodeIn * 0.34})`, opacity: nodeIn, scale: 0.75 + nodeIn * 0.25}} />
                <div style={{height: rowHeight, display: "flex", alignItems: "center", padding: `0 ${26 * mirrorUnit}px`, boxSizing: "border-box", borderRadius: 21 * mirrorUnit, color: "#FFFFFF", background: `linear-gradient(90deg, rgba(${pink.rgb},0.16), rgba(0,0,0,0.54))`, backdropFilter: `blur(${15 * mirrorUnit}px)`, border: `1px solid rgba(${pink.rgb},0.35)`, boxShadow: `inset 0 1px rgba(255,255,255,0.07), 0 0 ${22 * mirrorUnit}px rgba(${pink.rgb},0.08)`, fontSize: Math.max(27 * mirrorUnit, 18), fontWeight: rightItem?.emphasis ? 900 : 830, opacity: rightItemIn, translate: `${(1 - rightItemIn) * 34 * mirrorUnit}px 0`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{rightItem?.text ?? ""}</div>
              </div>
            );
          })}
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
          left: getAlignedX({zone, itemWidth: panelWidth, placement}),
          top: zone.y + (zone.height - panelHeight) / 2,
          width: panelWidth,
          opacity: 1 - exit,
          transform: `translateY(${exit * 18 * u}px)`,
        }}
      >
        {title ? (
          <div style={{marginBottom: 18 * u}}>
            <div
              style={{
                color: "#E8B86D",
                fontSize: 16 * u,
                fontWeight: 850,
                letterSpacing: "0.12em",
              }}
            >
              {eyebrow}
            </div>
            <div
              style={{
                marginTop: 5 * u,
                color: "#F8FAFC",
                fontSize: 38 * u,
                fontWeight: 900,
                lineHeight: 1.05,
              }}
            >
              {title}
            </div>
          </div>
        ) : null}

        <div style={{display: "flex", gap}}>
          {sides.map((side, sideIndex) => {
            const accent = side.accentColor ?? (sideIndex === 0 ? "#70A5EB" : "#E8B86D");
            const sideStart = side.showAtInFrames ?? delayInFrames + sideIndex * sideGapInFrames;
            const sideProgress = interpolate(
              frame,
              [sideStart, sideStart + revealInFrames],
              [0, 1],
              {easing: EASING.editorial, ...clamp},
            );
            const lift = spring({
              frame: frame - sideStart,
              fps,
              config: {damping: 18, stiffness: 132, mass: 0.82},
            });
            const visibleItems = (side.items ?? []).slice(0, 5);

            return (
              <div
                key={`${side.label}-${sideIndex}`}
                style={{
                  width: cardWidth,
                  position: "relative",
                  opacity: sideProgress,
                  transform: `translateY(${(1 - lift) * 20 * u}px)`,
                }}
              >
                <div data-content-sized-surface="concept-comparison-peer" data-card-copy-structure="label-primary" style={{height: cardHeightBase * u, padding: 24 * u, boxSizing: "border-box", borderRadius: 24 * u, position: "relative", overflow: "hidden", background: "rgba(15,17,24,0.70)", border: `1px solid ${accent}66`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 ${20 * u}px ${50 * u}px rgba(0,0,0,0.24)`, clipPath: `inset(0 0 ${(1 - sideProgress) * 100}% 0 round ${24 * u}px)`}}>
                  <div style={{position: "absolute", inset: 0, background: `radial-gradient(115% 76% at 8% 0%, ${accent}28, transparent 64%)`}} />
                  <div style={{position: "relative"}}>
                    <div data-card-label="true" style={{display: "flex", alignItems: "center", gap: 9 * u}}>
                      <span
                        style={{
                          color: "rgba(248,250,252,0.72)",
                        fontSize: 18 * u,
                        fontWeight: 820,
                        letterSpacing: "0.04em",
                      }}
                      >
                        {side.label}
                      </span>
                    </div>
                    <div data-primary-text="true" style={{marginTop: 9 * u, color: "#F8FAFC", fontSize: titleSize * u, fontWeight: 920, lineHeight: 1.08, overflowWrap: "anywhere"}}>{side.title}</div>
                  </div>
                </div>
                {(side.subtitle || side.badge) ? <div data-auxiliary-text="true" style={{marginTop: 12 * u, display: "flex", alignItems: "baseline", gap: 9 * u, color: "rgba(226,232,240,0.68)", fontSize: 25 * u, fontWeight: 620, lineHeight: 1.22, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>
                  {side.badge ? <span style={{flex: "0 0 auto", color: accent, fontSize: 17 * u, fontWeight: 780}}>{side.badge}</span> : null}
                  {side.subtitle ? <span style={{minWidth: 0, overflow: "hidden", textOverflow: "ellipsis"}}>{side.subtitle}</span> : null}
                </div> : null}
                {visibleItems.length > 0 ? (
                    <div
                      style={{
                        marginTop: 14 * u,
                        paddingTop: 12 * u,
                        borderTop: "1px solid rgba(255,255,255,0.12)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 9 * u,
                      }}
                    >
                      {visibleItems.map((item, itemIndex) => {
                        const itemStart =
                          item.showAtInFrames ??
                          sideStart + revealInFrames + itemIndex * itemGapInFrames;
                        const itemIn = interpolate(
                          frame,
                          [itemStart, itemStart + 12],
                          [0, 1],
                          {easing: EASING.enter, ...clamp},
                        );
                        return (
                          <div
                            key={`${item.text}-${itemIndex}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 9 * u,
                              opacity: itemIn,
                              transform: `translateX(${(1 - itemIn) * -10 * u}px)`,
                            }}
                          >
                            <span
                              style={{
                                width: 15 * u,
                                height: 15 * u,
                                borderRadius: 999,
                                flex: "0 0 auto",
                                background: item.emphasis ? accent : `${accent}35`,
                                border: `2px solid ${accent}`,
                                boxShadow: item.emphasis ? `0 0 ${14 * u}px ${accent}55` : undefined,
                              }}
                            />
                            <span
                              style={{
                                color: item.emphasis ? "#FFFFFF" : "rgba(248,250,252,0.84)",
                                fontSize: 30 * u,
                                fontWeight: item.emphasis ? 840 : 700,
                                lineHeight: 1.18,
                              }}
                            >
                              {item.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
