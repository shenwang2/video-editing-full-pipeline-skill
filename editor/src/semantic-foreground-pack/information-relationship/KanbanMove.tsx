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
import {EDITABLE_ROOM_LIGHT_PALETTE} from "../lib/room-light-palette";

const FONT_FAMILY = '"Microsoft YaHei", "Segoe UI", Arial, sans-serif';

export type StateMoveCard = {
  title: string;
  meta?: string;
  from: number;
  to?: number;
  tint?: string;
  showAtInFrames?: number;
  moveAtInFrames?: number;
};

export type KanbanMoveProps = {
  states: string[];
  cards: StateMoveCard[];
  visualVariant?: "stateTransfer" | "statePortal";
  placement?: ForegroundPlacement;
  moveInFrames?: number;
  dealStaggerInFrames?: number;
  accentColor?: string;
  theme?: "dark" | "light";
  exitAtInFrames?: number;
  exitInFrames?: number;
};

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

/**
 * RemotionUI Kanban Move adapted for a spoken transformation.
 * One carrier card visibly leaves its old state, arcs across the gap, and
 * settles into the new state. State change is therefore shown, not captioned.
 */
export const KanbanMove: React.FC<KanbanMoveProps> = ({
  states,
  cards,
  visualVariant = "stateTransfer",
  placement = "upperCenterSafe",
  moveInFrames = 20,
  dealStaggerInFrames = 4,
  accentColor = "#E8B86D",
  theme = "dark",
  exitAtInFrames,
  exitInFrames = 14,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const palette = CODE_THEMES[theme];
  const zone = getForegroundZone({width, height, placement});
  const stateCount = Math.max(2, Math.min(states.length, 3));
  const safeStates = states.slice(0, stateCount);
  const maxRows = Math.max(
    1,
    ...safeStates.map((_, stateIndex) =>
      cards.filter((card) => card.from === stateIndex || card.to === stateIndex).length,
    ),
  );
  const baseWidth = stateCount * 250 + (stateCount - 1) * 20;
  const baseHeight = 52 + Math.min(maxRows, 3) * 96 + 20;
  const u = Math.max(
    0.72,
    Math.min(zone.width / baseWidth, zone.height / baseHeight, 1.55),
  );
  const boardWidth = Math.min(zone.width, baseWidth * u);
  const gutter = 18 * u;
  const columnWidth = (boardWidth - gutter * (stateCount - 1)) / stateCount;
  const headerHeight = 46 * u;
  const cardHeight = 78 * u;
  const cardGap = 11 * u;
  const boardHeight = headerHeight + Math.min(maxRows, 3) * (cardHeight + cardGap);
  const boardX = getAlignedX({zone, itemWidth: boardWidth, placement});
  const boardY = zone.y + (zone.height - boardHeight) / 2;
  const boardIn = spring({
    frame,
    fps,
    config: {damping: 18, stiffness: 135, mass: 0.86},
  });
  const exit =
    exitAtInFrames === undefined
      ? 0
      : interpolate(
          frame,
          [exitAtInFrames, exitAtInFrames + exitInFrames],
          [0, 1],
          {easing: EASING.exit, ...clamp},
        );

  if (visualVariant === "statePortal") {
    const oldColor = EDITABLE_ROOM_LIGHT_PALETTE.电光蓝;
    const portalColor = oldColor;
    const newColor = oldColor;
    const carrier = cards[0] ?? {title: "核心对象", from: 0, to: 1};
    const oldState = safeStates[0] ?? "原状态";
    const newState = safeStates[1] ?? "新状态";
    const portalBaseWidth = 920;
    const portalBaseHeight = 330;
    const pu = Math.max(0.62, Math.min(zone.width / portalBaseWidth, zone.height / portalBaseHeight, 1.45));
    const portalWidth = portalBaseWidth * pu;
    const portalHeight = portalBaseHeight * pu;
    const portalX = getAlignedX({zone, itemWidth: portalWidth, placement});
    const portalY = zone.y + (zone.height - portalHeight) / 2;
    const sideWidth = 300 * pu;
    const sideHeight = 230 * pu;
    const sideTop = 46 * pu;
    const rightLeft = portalWidth - sideWidth;
    const gateSize = 138 * pu;
    const gateLeft = (portalWidth - gateSize) / 2;
    const gateTop = sideTop + (sideHeight - gateSize) / 2;
    const showAt = carrier.showAtInFrames ?? 4;
    const moveAt = carrier.moveAtInFrames ?? 30;
    const arrive = spring({frame: frame - showAt, fps, config: {damping: 18, stiffness: 150, mass: 0.8}});
    const travel = interpolate(frame, [moveAt, moveAt + Math.max(moveInFrames, 24)], [0, 1], {
      ...clamp,
      easing: EASING.editorial,
    });
    const lift = Math.sin(travel * Math.PI);
    const cardWidth = 250 * pu;
    const cardHeight = 86 * pu;
    const startX = 25 * pu;
    const endX = rightLeft + 25 * pu;
    const restingY = sideTop + sideHeight - cardHeight - 22 * pu;
    const cardX = interpolate(travel, [0, 1], [startX, endX]);
    const cardY = interpolate(travel, [0, 0.5, 1], [restingY, gateTop - 26 * pu, restingY]);
    const resultIn = interpolate(travel, [0.78, 1], [0, 1], clamp);
    const trail = interpolate(travel, [0, 1], [0, 1], clamp);
    const stateSurface = (color: {hex: string; rgb: string}, active: number): React.CSSProperties => ({
      position: "absolute",
      top: sideTop,
      width: sideWidth,
      height: sideHeight,
      boxSizing: "border-box",
      borderRadius: 28 * pu,
      padding: `${26 * pu}px ${28 * pu}px`,
      background: `linear-gradient(145deg, rgba(${color.rgb},${0.1 + active * 0.06}), rgba(6,8,12,0.62))`,
      border: `${2 * pu}px solid rgba(${color.rgb},${active > 0.5 ? 0.84 : 0.46})`,
      boxShadow: `0 0 ${30 * pu}px rgba(${color.rgb},${active > 0.5 ? 0.26 : 0.13}), inset 0 1px 0 rgba(255,255,255,0.13)`,
      backdropFilter: "blur(12px) saturate(1.08)",
    });

    return (
      <AbsoluteFill data-foreground-overlay-root="true" style={{position: "absolute", inset: 0, background: "transparent", pointerEvents: "none", fontFamily: FONT_FAMILY}}>
        <div style={{position: "absolute", left: portalX, top: portalY, width: portalWidth, height: portalHeight, opacity: Math.min(1, boardIn) * (1 - exit), translate: `0 ${(1 - boardIn) * 18 * pu + exit * 22 * pu}px`}}>
          <div style={{...stateSurface(oldColor, 1 - travel), left: 0}}>
            <div style={{fontSize: 17 * pu, color: "rgba(255,255,255,0.58)", fontWeight: 760}}>原状态</div>
            <div style={{marginTop: 10 * pu, fontSize: 33 * pu, lineHeight: 1, color: palette.fg, fontWeight: 920, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{oldState}</div>
            <div style={{position: "absolute", left: 24 * pu, right: 24 * pu, bottom: 19 * pu, height: 58 * pu, borderRadius: 16 * pu, border: `${1 * pu}px dashed rgba(${oldColor.rgb},0.45)`, background: `rgba(${oldColor.rgb},0.06)`}} />
          </div>
          <div style={{...stateSurface(newColor, resultIn), left: rightLeft}}>
            <div style={{fontSize: 17 * pu, color: "rgba(255,255,255,0.58)", fontWeight: 760}}>新状态</div>
            <div style={{marginTop: 10 * pu, fontSize: 33 * pu, lineHeight: 1, color: palette.fg, fontWeight: 920, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{newState}</div>
            <div style={{position: "absolute", left: 24 * pu, right: 24 * pu, bottom: 19 * pu, height: 58 * pu, borderRadius: 16 * pu, border: `${1 * pu}px dashed rgba(${newColor.rgb},${resultIn > 0.55 ? 0.78 : 0.41})`, background: `rgba(${newColor.rgb},${resultIn > 0.55 ? 0.12 : 0.04})`}} />
          </div>
          <svg width={portalWidth} height={portalHeight} viewBox={`0 0 ${portalWidth} ${portalHeight}`} style={{position: "absolute", inset: 0}}>
            <path d={`M ${sideWidth - 42 * pu} ${restingY + cardHeight / 2} C ${portalWidth * 0.4} ${gateTop - 40 * pu}, ${portalWidth * 0.6} ${gateTop - 40 * pu}, ${rightLeft + 42 * pu} ${restingY + cardHeight / 2}`} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={2.5 * pu} strokeDasharray={`${8 * pu} ${11 * pu}`} />
            <path d={`M ${sideWidth - 42 * pu} ${restingY + cardHeight / 2} C ${portalWidth * 0.4} ${gateTop - 40 * pu}, ${portalWidth * 0.6} ${gateTop - 40 * pu}, ${rightLeft + 42 * pu} ${restingY + cardHeight / 2}`} fill="none" stroke={portalColor.hex} strokeWidth={4 * pu} strokeLinecap="round" pathLength={1} strokeDasharray={`${trail} 1`} opacity={0.24 + lift * 0.62} style={{filter: `drop-shadow(0 0 ${8 * pu}px rgba(${portalColor.rgb},0.65))`}} />
          </svg>
          <div style={{position: "absolute", left: gateLeft, top: gateTop, width: gateSize, height: gateSize, borderRadius: "50%", border: `${3 * pu}px solid ${portalColor.hex}`, boxShadow: `0 0 ${32 * pu}px rgba(${portalColor.rgb},0.38), inset 0 0 ${24 * pu}px rgba(${portalColor.rgb},0.18)`, display: "grid", placeItems: "center", background: `rgba(${portalColor.rgb},0.07)`}}>
            <div style={{width: 96 * pu, height: 96 * pu, borderRadius: "50%", border: `${1 * pu}px solid rgba(${portalColor.rgb},0.53)`, display: "grid", placeItems: "center", color: palette.fg, fontSize: 17 * pu, fontWeight: 900}}>状态跃迁</div>
          </div>
          <div style={{position: "absolute", left: cardX, top: cardY, width: cardWidth, height: cardHeight, boxSizing: "border-box", padding: `0 ${20 * pu}px`, borderRadius: 21 * pu, background: "linear-gradient(145deg, rgba(20,22,30,0.96), rgba(7,8,12,0.92))", border: `${2 * pu}px solid ${travel < 0.52 ? oldColor.hex : newColor.hex}`, boxShadow: `0 ${(16 + lift * 20) * pu}px ${(30 + lift * 24) * pu}px rgba(0,0,0,0.46), 0 0 ${24 * pu}px rgba(${travel < 0.52 ? oldColor.rgb : newColor.rgb},${travel < 0.52 ? 0.28 : 0.3}), inset 0 1px 0 rgba(255,255,255,0.16)`, display: "flex", alignItems: "center", gap: 16 * pu, opacity: Math.min(1, arrive), scale: 0.94 + arrive * 0.06 + lift * 0.07, rotate: `${lift * -3}deg`, zIndex: 5}}>
            <div style={{width: 44 * pu, height: 44 * pu, borderRadius: 13 * pu, display: "grid", placeItems: "center", color: "#050608", background: travel < 0.52 ? oldColor.hex : newColor.hex, fontSize: 22 * pu, fontWeight: 950}}>01</div>
            <div style={{minWidth: 0}}>
              <div style={{fontSize: 27 * pu, lineHeight: 1, color: palette.fg, fontWeight: 920, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{carrier.title}</div>
              {carrier.meta ? <div style={{marginTop: 8 * pu, fontSize: 15 * pu, lineHeight: 1, color: palette.dim, fontWeight: 680, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{carrier.meta}</div> : null}
            </div>
          </div>
          <div style={{position: "absolute", right: 5 * pu, bottom: 0, padding: `${9 * pu}px ${15 * pu}px`, borderRadius: 999, border: `${1 * pu}px solid rgba(${newColor.rgb},0.69)`, color: newColor.hex, fontSize: 16 * pu, fontWeight: 850, opacity: resultIn, translate: `0 ${(1 - resultIn) * 8 * pu}px`}}>转化完成</div>
        </div>
      </AbsoluteFill>
    );
  }

  const columnX = (column: number) => column * (columnWidth + gutter);
  const cardY = (slot: number) => headerHeight + slot * (cardHeight + cardGap);
  const startSlot = (card: StateMoveCard, index: number) =>
    cards.filter((other, otherIndex) => other.from === card.from && otherIndex < index)
      .length;
  const targetSlot = (card: StateMoveCard, index: number) => {
    const target = card.to ?? card.from;
    const arrival = card.moveAtInFrames ?? Number.POSITIVE_INFINITY;
    const residents = cards.filter(
      (other, otherIndex) =>
        otherIndex !== index &&
        other.from === target &&
        (other.to === undefined ||
          other.moveAtInFrames === undefined ||
          other.moveAtInFrames >= arrival),
    ).length;
    const earlierArrivals = cards.filter(
      (other, otherIndex) =>
        otherIndex !== index &&
        other.to === target &&
        other.moveAtInFrames !== undefined &&
        other.moveAtInFrames < arrival,
    ).length;
    return residents + earlierArrivals;
  };

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
          left: boardX,
          top: boardY,
          width: boardWidth,
          height: boardHeight,
          opacity: Math.min(1, boardIn) * (1 - exit),
          transform: `translateY(${(1 - boardIn) * 20 * u + exit * 24 * u}px)`,
        }}
      >
        {safeStates.map((state, stateIndex) => {
          const incomingPeak = cards.reduce((peak, card) => {
            if (card.to !== stateIndex || card.moveAtInFrames === undefined) return peak;
            const progress = interpolate(
              frame,
              [card.moveAtInFrames, card.moveAtInFrames + moveInFrames],
              [0, 1],
              {...clamp, easing: EASING.editorial},
            );
            return Math.max(peak, Math.min(1, progress * (1 - progress) * 4));
          }, 0);

          return (
            <div
              key={`${state}-${stateIndex}`}
              style={{
                position: "absolute",
                left: columnX(stateIndex),
                top: 0,
                width: columnWidth,
                height: boardHeight,
                boxSizing: "border-box",
                borderRadius: 16 * u,
                background:
                  theme === "dark"
                    ? "linear-gradient(150deg, rgba(6,8,14,0.48), rgba(14,18,28,0.30))"
                    : "linear-gradient(150deg, rgba(255,255,255,0.88), rgba(244,244,242,0.72))",
                backdropFilter: "blur(11px) saturate(1.08)",
                border: `1px solid ${
                  incomingPeak > 0.05 ? `${accentColor}88` : palette.border
                }`,
                boxShadow:
                  incomingPeak > 0.05
                    ? `inset 0 1px 0 ${palette.highlight}, 0 0 ${26 * u}px ${accentColor}38`
                    : `inset 0 1px 0 ${palette.highlight}, 0 ${12 * u}px ${28 * u}px ${palette.shadow}`,
              }}
            >
              <div
                style={{
                  height: headerHeight,
                  boxSizing: "border-box",
                  padding: `0 ${14 * u}px`,
                  display: "flex",
                  alignItems: "center",
                  gap: 9 * u,
                  color: palette.fg,
                  fontSize: 24 * u,
                  lineHeight: 1,
                  fontWeight: 850,
                }}
              >
                <span
                  style={{
                    width: 8 * u,
                    height: 8 * u,
                    borderRadius: "50%",
                    background: stateIndex === 0 ? palette.dim : accentColor,
                    boxShadow:
                      stateIndex === 0 ? "none" : `0 0 ${12 * u}px ${accentColor}80`,
                  }}
                />
                {state}
              </div>
            </div>
          );
        })}

        {cards.map((card, index) => {
          const showAt = card.showAtInFrames ?? 5 + index * dealStaggerInFrames;
          const arrive = spring({
            frame: frame - showAt,
            fps,
            config: {damping: 19, stiffness: 155, mass: 0.8},
          });
          const moving = card.to !== undefined && card.moveAtInFrames !== undefined;
          const progress = moving
            ? interpolate(
                frame,
                [card.moveAtInFrames!, card.moveAtInFrames! + moveInFrames],
                [0, 1],
                {...clamp, easing: EASING.editorial},
              )
            : 0;
          const fromX = columnX(Math.min(card.from, stateCount - 1));
          const fromY = cardY(startSlot(card, index));
          const finalState = Math.min(card.to ?? card.from, stateCount - 1);
          const toX = columnX(finalState);
          const toY = cardY(targetSlot(card, index));
          const x = interpolate(progress, [0, 1], [fromX, toX]);
          const y = interpolate(progress, [0, 0.5, 1], [fromY, Math.min(fromY, toY) - 28 * u, toY]);
          const lift = Math.sin(progress * Math.PI);
          const tint = card.tint ?? accentColor;

          return (
            <div
              key={`${card.title}-${index}`}
              style={{
                position: "absolute",
                left: x + 9 * u,
                top: y + 4 * u,
                width: columnWidth - 18 * u,
                height: cardHeight,
                boxSizing: "border-box",
                padding: `0 ${14 * u}px 0 ${17 * u}px`,
                borderRadius: 13 * u,
                background:
                  theme === "dark"
                    ? "linear-gradient(145deg, rgba(18,23,34,0.92), rgba(7,10,17,0.82))"
                    : "linear-gradient(145deg, rgba(255,255,255,0.98), rgba(245,245,243,0.94))",
                border: `1px solid ${progress > 0.05 ? `${tint}88` : palette.border}`,
                boxShadow: `inset ${5 * u}px 0 0 ${tint}, 0 ${
                  (8 + lift * 20) * u
                }px ${(18 + lift * 34) * u}px rgba(0,0,0,${0.26 + lift * 0.24})`,
                display: "flex",
                justifyContent: "center",
                flexDirection: "column",
                opacity: Math.min(1, arrive),
                transform: `scale(${0.93 + arrive * 0.07 + lift * 0.035}) rotate(${
                  (0.5 - progress) * lift * -2.5
                }deg)`,
                zIndex: moving && progress > 0 && progress < 1 ? 5 : 2,
              }}
            >
              <div
                style={{
                  color: palette.fg,
                  fontSize: 30 * u,
                  lineHeight: 1.05,
                  fontWeight: 850,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {card.title}
              </div>
              {card.meta ? (
                <div
                  style={{
                    marginTop: 7 * u,
                    color: palette.dim,
                    fontSize: 16 * u,
                    lineHeight: 1,
                    fontWeight: 650,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {card.meta}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
