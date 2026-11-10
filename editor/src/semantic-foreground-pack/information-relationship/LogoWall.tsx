import type {ForegroundPlacement} from "../lib/layout";
import {AtomicSceneRenderer} from "../atomic/AtomicSceneRenderer";
import {buildPeerCollection} from "../atomic/structures/PeerCollection";
import {inferSemanticIcon} from "../atomic/structures/ProgressiveStateBoard";
import type {SemanticIconName} from "../atomic/types";

export type CollectionTile = {
  /** Short peer label. The collection must be scanned, not read as prose. */
  name: string;
  /** Optional supporting word; never use it for a second sentence. */
  meta?: string;
  /** Preferred semantic SVG icon for new work. */
  icon?: SemanticIconName;
  /** Deprecated free-form glyph; retained only as adapter input. */
  glyph?: string;
  color?: string;
  /** Local frame aligned to the item's Spoken Beat. */
  showAtInFrames?: number;
};

export type LogoWallProps = {
  items: CollectionTile[];
  /** Choose stable peer scanning or inward assembly. Legacy names normalize to their matching grammar. */
  visualVariant?: "peerScan" | "assembleWhole" | "peerTileWall" | "magneticCluster";
  eyebrow?: string;
  title?: string;
  groupAtInFrames?: number;
  columns?: number;
  placement?: ForegroundPlacement;
  accentColor?: string;
  theme?: "dark" | "light";
  delayInFrames?: number;
  staggerInFrames?: number;
  exitAtInFrames?: number;
  exitInFrames?: number;
};

/** Backwards-compatible adapter. New cuts compile to an atomic peer collection directly. */
export const LogoWall: React.FC<LogoWallProps> = ({
  items,
  visualVariant = "assembleWhole",
  title,
  eyebrow,
  groupAtInFrames,
  columns,
  placement = "centerSafe",
  accentColor = "#24E5EE",
  delayInFrames = 4,
  staggerInFrames = 5,
  exitAtInFrames,
  exitInFrames = 14,
}) => {
  const graph = buildPeerCollection({
    items: items.map((item, index) => ({
      id: `member-${index + 1}`,
      label: item.name,
      meta: item.meta,
      icon: item.icon ?? inferSemanticIcon(`${item.name} ${item.meta ?? ""}`),
      showAtInFrames: item.showAtInFrames ?? delayInFrames + index * staggerInFrames,
    })),
    groupLabel: title ?? eyebrow,
    visualVariant,
    accentColor,
    groupAtInFrames,
    columns,
  });

  return <AtomicSceneRenderer graph={graph} placement={placement} accentColor={accentColor} exitAtInFrames={exitAtInFrames} exitInFrames={exitInFrames} />;
};
