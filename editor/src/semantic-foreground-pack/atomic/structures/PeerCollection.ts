import type {AtomicSceneAtom, AtomicSceneGraph, NormalizedPoint, SemanticIconName} from "../types";

export type CollectionVisualVariant = "peerScan" | "assembleWhole" | "peerTileWall" | "magneticCluster";

export type CollectionMember = {
  id?: string;
  label: string;
  meta?: string;
  icon?: SemanticIconName;
  showAtInFrames: number;
};

export type PeerCollectionSpec = {
  items: CollectionMember[];
  groupLabel?: string;
  visualVariant?: CollectionVisualVariant;
  accentColor?: string;
  groupAtInFrames?: number;
  columns?: number;
};

const entryOrigins: NormalizedPoint[] = [
  {x: 0.01, y: 0.05},
  {x: 0.72, y: 0.05},
  {x: 0.01, y: 0.76},
  {x: 0.72, y: 0.76},
  {x: 0.36, y: 0.02},
  {x: 0.36, y: 0.80},
];

const resolveVariant = (variant: CollectionVisualVariant | undefined): "peerScan" | "assembleWhole" =>
  variant === "peerScan" || variant === "peerTileWall" ? "peerScan" : "assembleWhole";

/**
 * Build one equal-peer set as either a stable scan grid or inward assembly.
 *
 * Legacy peerTileWall normalizes to peerScan; legacy magneticCluster
 * normalizes to assembleWhole. New cuts use the explicit new names.
 */
export const buildPeerCollection = (spec: PeerCollectionSpec): AtomicSceneGraph => {
  if (spec.items.length < 2 || spec.items.length > 6) throw new Error("peer collection requires 2..6 items");
  if (spec.items.some((item) => !item.label.trim() || !Number.isFinite(item.showAtInFrames))) throw new Error("every collection item needs a label and Spoken-Beat frame anchor");

  const visualVariant = resolveVariant(spec.visualVariant);
  const accent = spec.accentColor ?? "#24E5EE";
  const count = spec.items.length;
  const columns = Math.max(1, Math.min(spec.columns ?? (count <= 4 ? 2 : 3), 3, count));
  const rows = Math.ceil(count / columns);
  const gridWidth = 0.84;
  const gapX = 0.035;
  const gapY = 0.055;
  const gridTop = rows === 1 ? 0.36 : 0.25;
  const gridHeight = rows === 1 ? 0.26 : 0.52;
  const tileWidth = (gridWidth - gapX * (columns - 1)) / columns;
  const tileHeight = (gridHeight - gapY * (rows - 1)) / rows;
  const lastItemAt = Math.max(...spec.items.map((item) => item.showAtInFrames));
  const groupAt = spec.groupAtInFrames ?? lastItemAt + 18;
  if (groupAt < lastItemAt) throw new Error("groupAtInFrames must not precede the final collection member");
  const atoms: AtomicSceneAtom[] = [];

  if (spec.groupLabel) {
    atoms.push({id: "collection-group-label", kind: "text", role: "result", text: spec.groupLabel, bounds: {x: 0.18, y: 0.075, width: 0.64, height: 0.11}, revealAtInFrames: visualVariant === "assembleWhole" ? groupAt : spec.items[0].showAtInFrames, color: accent, appearance: "collection-group", zIndex: 5});
  }

  spec.items.forEach((item, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const rowStart = row * columns;
    const rowCount = Math.min(columns, count - rowStart);
    const rowWidth = rowCount * tileWidth + Math.max(0, rowCount - 1) * gapX;
    const left = (1 - rowWidth) / 2 + column * (tileWidth + gapX);
    const top = gridTop + row * (tileHeight + gapY);
    const nextAt = spec.items[index + 1]?.showAtInFrames;
    const timeline = {revealAtInFrames: item.showAtInFrames, activeAtInFrames: item.showAtInFrames, completeAtInFrames: nextAt ?? groupAt};
    const id = item.id ?? `member-${index + 1}`;
    const appearance = visualVariant === "assembleWhole" ? "collection-capsule" as const : "collection-tile" as const;
    const enterFrom = visualVariant === "assembleWhole" ? entryOrigins[index] : undefined;
    const enterDelta = enterFrom ? {x: enterFrom.x - left, y: enterFrom.y - top} : undefined;
    const moveWithSurface = (x: number, y: number) => enterDelta ? {x: x + enterDelta.x, y: y + enterDelta.y} : undefined;

    atoms.push({id: `${id}-surface`, kind: "node", bounds: {x: left, y: top, width: tileWidth, height: tileHeight}, enterFrom, timeline, revealAtInFrames: item.showAtInFrames, accentColor: accent, completeColor: accent, appearance, phaseOpacity: {future: 0, active: 1, complete: 0.88}, zIndex: 1});
    atoms.push({id: `${id}-icon`, kind: "icon", bounds: {x: left + tileWidth * 0.07, y: top + tileHeight * 0.23, width: tileHeight * 0.36, height: tileHeight * 0.54}, enterFrom: moveWithSurface(left + tileWidth * 0.07, top + tileHeight * 0.23), icon: item.icon ?? "star", timeline, revealAtInFrames: item.showAtInFrames, color: accent, completeColor: accent, appearance: "collection-badge", phaseOpacity: {future: 0, active: 1, complete: 0.9}, zIndex: 4});
    atoms.push({id: `${id}-label`, kind: "text", role: "label", text: item.label, bounds: {x: left + tileWidth * 0.34, y: top + tileHeight * 0.24, width: tileWidth * 0.58, height: tileHeight * 0.27}, enterFrom: moveWithSurface(left + tileWidth * 0.34, top + tileHeight * 0.24), timeline, revealAtInFrames: item.showAtInFrames, appearance: "collection-label", phaseOpacity: {future: 0, active: 1, complete: 0.9}, zIndex: 4});
    if (item.meta) atoms.push({id: `${id}-meta`, kind: "text", role: "detail", text: item.meta, bounds: {x: left + tileWidth * 0.34, y: top + tileHeight * 0.55, width: tileWidth * 0.58, height: tileHeight * 0.18}, enterFrom: moveWithSurface(left + tileWidth * 0.34, top + tileHeight * 0.55), timeline, revealAtInFrames: item.showAtInFrames, color: accent, appearance: "collection-meta", phaseOpacity: {future: 0, active: 0.92, complete: 0.72}, zIndex: 4});
  });

  if (visualVariant === "assembleWhole") {
    atoms.push({id: "collection-boundary", kind: "node", bounds: {x: 0.035, y: 0.205, width: 0.93, height: 0.61}, timeline: {revealAtInFrames: groupAt, activeAtInFrames: groupAt}, revealAtInFrames: groupAt, accentColor: accent, appearance: "collection-boundary", zIndex: 0});
  }

  return {
    schemaVersion: "1.0",
    structureId: visualVariant === "assembleWhole" ? "assembled_peer_set" : "peer_collection_grid",
    topology: visualVariant === "assembleWhole" ? "inward-assembly" : "stable-peer-grid",
    coordinateSpace: "normalized-zone",
    atoms,
    metadata: {
      semanticLayer: "informationRelationship",
      semanticPurpose: "collection",
      sourceComponent: "LogoWall",
      visualStyle: visualVariant === "assembleWhole" ? "reference-assembled-peer-set" : "reference-peer-scan-grid",
      lockedLayoutAspect: 1420 / 900,
      compositionRules: visualVariant === "assembleWhole"
        ? ["equal peers enter inward from distinct positions", "each complete member lands on its Spoken Beat", "the shared boundary and grounded group label appear only after the final member", "never imply rank, order, causality, or an outward unpacking motion", "preserve the approved 1420:900 internal layout ratio; fit uniformly and never stretch into a narrow or tall zone"]
        : ["stable equal cells support scanning", "only the spoken member appears and briefly leads", "earlier members persist as equal peers", "the grounded set label may remain visible from the first member", "never imply rank, order, causality, or a completion boundary", "preserve the approved 1420:900 internal layout ratio; fit uniformly and never stretch into a narrow or tall zone"],
    },
  };
};
