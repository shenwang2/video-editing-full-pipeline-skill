export type AssetType =
  | 'clean-base'
  | 'raw-video'
  | 'h3-video'
  | 'external-video'
  | 'image'
  | 'audio'
  | 'sfx'
  | 'font';

export type EditAsset = {
  id: string;
  type: AssetType;
  path: string;
  status: 'ready' | 'placeholder' | 'missing';
  originalPath?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  hasAudio?: boolean;
  label?: string;
  checksum?: string;
};

export type Placement = {
  mode: 'preset' | 'normalized';
  preset: string;
  boundsMode?: 'layoutZone' | 'visibleContent';
  /** Version 2 uses semantic-pack artwork bounds. Missing means legacy host bounds. */
  boundsVersion?: 2;
  alignmentToken?: 'sectionTitleLeft' | 'sectionTitleRight' | 'centerAxis' | 'canvas';
  visibleEdge?: 'left' | 'center' | 'right';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  zIndex: number;
  align?: 'left' | 'center' | 'right';
};

export type ForegroundEvent = {
  id: string;
  semanticLayer: 'title' | 'realObject' | 'informationRelationship' | 'memory';
  semanticPurpose?: string;
  componentId: string;
  variantId: string;
  renderingMode?: 'atomic-scene' | 'approved-atomic-semantic' | string;
  rendererComponent?: string;
  structureId?: string;
  topology?: string;
  explanationGoal?: {viewerQuestion: string; visibleInference: string};
  evidenceMap?: Array<{sourceText: string; startMs: number; endMs: number; payloadPaths: string[]}>;
  migration?: Record<string, unknown>;
  fallbackPlacements?: string[];
  placementReason?: string;
  allowConcurrent?: boolean;
  startMs: number;
  endMs: number;
  anchorText?: string;
  placement: Placement;
  payload: Record<string, unknown>;
  stylePreset?: string;
  style?: Record<string, unknown>;
  elementOverrides?: Record<string, {
    x?: number;
    y?: number;
    scale?: number;
    color?: string;
  }>;
  assetIds?: string[];
  compositionGroup?: string;
  collisionCheckedWith?: string[];
  enabled?: boolean;
};

export type H3Event = {
  id: string;
  assetId: string;
  startMs: number;
  endMs: number;
  fit: 'cover';
  cropSafe?: Record<string, unknown>;
  retime: Array<{
    type: 'play' | 'hold';
    timelineStartMs: number;
    timelineEndMs: number;
    sourceStartMs?: number;
    sourceEndMs?: number;
    playbackRate?: number;
  }>;
  audio: {enabled: boolean; volume: number};
  enabled?: boolean;
};

export type CaptionCue = {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  lines?: string[];
  stylePreset?: string;
  style?: Record<string, unknown>;
};

export type CaptionStyle = {
  hidden?: boolean;
  /** Whole-track vertical position: 0 = top, 0.5 = center, 1 = bottom. */
  verticalPosition?: number;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  backgroundEnabled?: boolean;
  backgroundColor?: string;
  backgroundOpacity?: number;
  backgroundRadius?: number;
};

export type SfxCue = {
  id: string;
  assetId: string;
  atMs: number;
  volume: number;
  durationMs?: number;
  enabled?: boolean;
};

export type ComponentStyleMode = 'legacy' | 'atomic';

export type EditProject = {
  schemaVersion: '1.0.0';
  project: {
    id: string;
    name: string;
    mode: 'human-assisted';
    createdAt: string;
    sourceSkill: string;
    sourceSkillFingerprint?: string;
  };
  composition: {
    width: number;
    height: number;
    fps: number;
    durationMs: number;
    backgroundAssetId: string;
    render?: {
      codec?: 'h264' | 'h265' | 'prores';
      crf?: number;
      pixelFormat?: string;
      outputName?: string;
    };
  };
  assets: EditAsset[];
  timeline: {
    foregroundEvents: ForegroundEvent[];
    h3Events: H3Event[];
    captionCues: CaptionCue[];
    sfxCues: SfxCue[];
  };
  settings: {
    componentStyleMode?: ComponentStyleMode;
    palette: string;
    safeArea: {top: number; right: number; bottom: number; left: number};
    audio: {narrationGain: number; h3MasterGain: number; sfxMasterGain: number};
    captionStyle?: CaptionStyle;
  };
  provenance?: Record<string, unknown>;
};

export const resolveComponentStyleMode = (project: EditProject): ComponentStyleMode => {
  const savedMode = project.settings.componentStyleMode;
  if (savedMode === 'legacy' || savedMode === 'atomic') return savedMode;

  const sourceSkill = project.project.sourceSkill.toLowerCase();
  const containsAtomicScene = project.timeline.foregroundEvents.some(
    (event) => event.componentId === 'AtomicSceneRenderer' || event.renderingMode === 'atomic-scene',
  );
  return sourceSkill.includes('atomic-reference-first') || containsAtomicScene ? 'atomic' : 'legacy';
};

/** Shared by the inspector and renderer; absent values retain legacy placement. */
export const getCaptionVerticalPosition = (project: EditProject): number => {
  const style = project.settings.captionStyle || {};
  const value = style.verticalPosition;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.min(1, Math.max(0, value));
  const {height, width} = project.composition;
  const fontSize = typeof style.fontSize === 'number' && Number.isFinite(style.fontSize)
    ? Math.min(220, Math.max(18, style.fontSize)) : Math.max(28, width * 0.028);
  const padding = style.backgroundEnabled === true ? Math.max(7, fontSize * 0.16) * 2 : 0;
  const lineHeight = fontSize * 1.22 + padding;
  const legacyTop = height * (1 - project.settings.safeArea.bottom - 0.07);
  return Math.min(1, Math.max(0, legacyTop / Math.max(1, height - lineHeight)));
};

export type ProjectSummary = {
  id: string;
  name: string;
  width?: number;
  height?: number;
  durationMs?: number;
  source: 'project' | 'example' | 'invalid';
};

export type LoadedProject = {
  manifest: EditProject;
  assetBaseUrl: string;
};
