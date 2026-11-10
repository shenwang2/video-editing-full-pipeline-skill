import React from "react";
import {AtomicSceneRenderer} from "../atomic/AtomicSceneRenderer";
import {buildHierarchyGrouping} from "../atomic/structures/HierarchyGrouping";
import type {SemanticIconName} from "../atomic/types";
import type {ForegroundPlacement} from "../lib/layout";

export type HierarchyLeaf = {
  title: string;
  showAtInFrames: number;
  icon?: SemanticIconName;
};

export type HierarchyChild = {
  label?: string;
  title: string;
  detail?: string;
  showAtInFrames: number;
  icon?: SemanticIconName;
  accentColor?: string;
  leaves?: HierarchyLeaf[];
};

export type HierarchyTreeProps = {
  rootTitle: string;
  rootLabel?: string;
  rootShowAtInFrames?: number;
  children: HierarchyChild[];
  visualVariant?: "nestedList" | "tierCards" | "balancedTree" | "radialHub";
  placement?: ForegroundPlacement;
  accentColor?: string;
  theme?: "dark" | "light";
  exitAtInFrames?: number;
  exitInFrames?: number;
};

/** Compatibility adapter. New work uses the atomic hierarchy_grouping grammar. */
export const HierarchyTree: React.FC<HierarchyTreeProps> = ({
  rootTitle,
  rootLabel = "整体",
  rootShowAtInFrames = 0,
  children,
  visualVariant = "nestedList",
  placement = "centerSafe",
  accentColor,
  exitAtInFrames,
  exitInFrames,
}) => {
  const resolvedVariant = visualVariant === "nestedList" ? "nestedList" : "tierCards";
  const graph = buildHierarchyGrouping({
    rootTitle,
    rootLabel,
    rootShowAtInFrames,
    visualVariant: resolvedVariant,
    accentColor,
    children: children.map((child) => ({
      label: child.label ?? "分组",
      title: child.title,
      showAtInFrames: child.showAtInFrames,
      icon: child.icon,
      accentColor: child.accentColor,
      leaves: child.leaves ?? (child.detail ? [{title: child.detail, showAtInFrames: child.showAtInFrames + 1, icon: "branch"}] : []),
    })),
  });
  return <AtomicSceneRenderer graph={graph} placement={placement} accentColor={accentColor} exitAtInFrames={exitAtInFrames} exitInFrames={exitInFrames} />;
};
