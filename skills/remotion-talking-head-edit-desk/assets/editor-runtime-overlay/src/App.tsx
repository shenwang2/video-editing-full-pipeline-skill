import React, {useEffect, useId, useMemo, useRef, useState} from 'react';
import {Player, type PlayerRef} from '@remotion/player';
import {normalizeSectionTitleData} from './legacy-semantic-foreground-pack/SectionTitleContract';
import {applyAssetUpload, getRenderJob, importProject, listProjects, loadProject, saveProject, startRender, uploadAsset, type RenderJob} from './api';
import {componentAccentColorOptions, defaultPayloadFor, getCompatibleVariants, getComponent, getComponentCatalog, graphicSceneComponent, originalSkillColorOptions, roomLightColorOptions, sectionTitleComponent} from './componentCatalog';
import {GraphicSceneInspector} from './GraphicSceneInspector';
import {isGraphicScene, validateGraphicScene} from './graphicSceneModel';
import {applyAtomicVariant} from './atomicSceneModel';
import {
  clampDraggedBox,
  clampMovedCalloutTarget,
  clampResizedBox,
  clampResizedCalloutTarget,
  getCalloutTargetGeometry,
  getEventPlacementBox,
  getEventScale,
  normalizeProjectPlacement,
  getTransformGroupId,
  canMultiTransform,
  getForegroundSelection,
  resizeForegroundSelection,
  transformForegroundSelection,
  type ForegroundSelection,
  updateEventWithLinkedPlacement,
  isCanvasTransformLocked,
  isRecordedDemoTakeover,
  type NormalizedPlacementBox,
  type ResizeCorner,
} from './editorPlacement';
import {EditComposition} from './remotion/EditComposition';
import {getCaptionVerticalPosition, resolveComponentStyleMode, type ComponentStyleMode, type EditProject, type ForegroundEvent, type LoadedProject, type ProjectSummary} from './types';

const sfxButtonStyle: React.CSSProperties = {border: '1px solid #354151', borderRadius: 7, background: '#18212c', color: '#d8e0e9', padding: '6px 9px', fontSize: 11, cursor: 'pointer'};

const captionFontOptions = [
  {label: '微软雅黑', value: 'Microsoft YaHei, Segoe UI, sans-serif'},
  {label: '微软雅黑 UI', value: 'Microsoft YaHei UI, Microsoft YaHei, sans-serif'},
  {label: '等线', value: 'DengXian, Microsoft YaHei, sans-serif'},
  {label: '黑体', value: 'SimHei, Microsoft YaHei, sans-serif'},
  {label: '宋体', value: 'SimSun, serif'},
  {label: '楷体', value: 'KaiTi, STKaiti, serif'},
  {label: '仿宋', value: 'FangSong, STFangsong, serif'},
  {label: 'Arial', value: 'Arial, sans-serif'},
];

const formatTime = (milliseconds: number) => {
  const seconds = milliseconds / 1000;
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;
};

const renderProgressPercent = (job: RenderJob | null) => {
  if (!job) return 0;
  if (job.status === 'completed') return 100;
  const rendered = /Rendered\s+(\d+)\/(\d+)/i.exec(job.message);
  if (rendered) return Math.min(94, Math.round(6 + (Number(rendered[1]) / Math.max(1, Number(rendered[2]))) * 88));
  const encoded = /Encoded\s+(\d+)\/(\d+)/i.exec(job.message);
  if (encoded) return Math.min(99, Math.round(94 + (Number(encoded[1]) / Math.max(1, Number(encoded[2]))) * 5));
  const bundling = /Bundling\s+(\d+(?:\.\d+)?)%/i.exec(job.message);
  if (bundling) return Math.min(6, Math.round((Number(bundling[1]) / 100) * 6));
  return Math.min(99, Math.max(0, Math.round(job.progress * 100)));
};

const semanticLayerLabels: Record<ForegroundEvent['semanticLayer'], string> = {
  title: '章节标题层',
  realObject: '真实对象层',
  informationRelationship: '信息关系层',
  memory: '记忆层',
};

const canonicalizeClassicHierarchyTrial = (event: ForegroundEvent): ForegroundEvent => {
  if (event.componentId !== 'HierarchyTree' || event.variantId !== 'trialReferenceClassification') return event;
  const payload = event.payload as Record<string, unknown>;
  const legacyChild = Array.isArray(payload.children) && payload.children[0] && typeof payload.children[0] === 'object'
    ? payload.children[0] as Record<string, unknown>
    : {};
  const parsedCount = String(legacyChild.title || '').match(/\d+/)?.[0];
  const {
    rootLabel: _legacyRootLabel,
    rootTitle: _legacyRootTitle,
    rootShowAtMs: _legacyRootShowAtMs,
    children: _legacyChildren,
    libraryLabel: _legacyLibraryLabel,
    ...currentPayload
  } = payload;
  return {
    ...event,
    variantId: 'iconClassification',
    payload: {
      ...currentPayload,
      categoryItems: Array.isArray(payload.categoryItems) ? payload.categoryItems : [],
      summary: {
        label: String(payload.libraryLabel || legacyChild.detail || legacyChild.title || '分类库'),
        count: parsedCount ? Number(parsedCount) : undefined,
        icon: 'sceneLibrary',
        showAtMs: typeof legacyChild.showAtMs === 'number' ? legacyChild.showAtMs : 0,
      },
    },
  };
};

const canonicalizeClassicComparisonTrial = (event: ForegroundEvent): ForegroundEvent => {
  if (event.componentId !== 'ConceptComparisonCards' || event.variantId !== 'trialReferenceBranches') return event;
  return {
    ...event,
    variantId: 'branchOutcomeRows',
  };
};

const canonicalizeSectionTitles = (project: EditProject): EditProject => ({
  ...project,
  timeline: {
    ...project.timeline,
    foregroundEvents: project.timeline.foregroundEvents.map((sourceEvent) => {
      const event = canonicalizeClassicComparisonTrial(canonicalizeClassicHierarchyTrial(sourceEvent));
      if (event.semanticLayer !== 'title') return event;
      const classicTitle = resolveComponentStyleMode(project) === 'legacy';
      const normalizedTitle = normalizeSectionTitleData(event);
      const {titleMode: _legacyTitleMode, visualVariant: _legacyVisualVariant, ...atomicPayload} = event.payload;
      const payload = classicTitle ? normalizedTitle.payload : atomicPayload;
      return {
        ...event,
        componentId: sectionTitleComponent.id,
        variantId: classicTitle ? normalizedTitle.variantId : 'standard',
        placement: classicTitle && event.placement.boundsVersion === 2 ? event.placement : {
          ...(classicTitle ? {boundsVersion: 2 as const, boundsMode: 'visibleContent' as const} : {}),
          mode: 'preset',
          preset: 'leftMiddle',
          alignmentToken: 'sectionTitleLeft',
          visibleEdge: 'left',
          align: 'left',
          zIndex: event.placement.zIndex ?? 42,
        },
        payload,
        elementOverrides: {},
        renderingMode: undefined,
        rendererComponent: undefined,
        structureId: undefined,
        topology: undefined,
        migration: undefined,
      };
    }),
  },
});

type InspectorSelectOption = {
  value: string;
  label: string;
  detail?: string;
};

const InspectorSelect: React.FC<{
  ariaLabel: string;
  value: string;
  options: InspectorSelectOption[];
  onChange: (value: string) => void;
}> = ({ariaLabel, value, options, onChange}) => {
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options[selectedIndex] || options[0];

  useEffect(() => {
    if (!open) setActiveIndex(selectedIndex);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.children[activeIndex]?.scrollIntoView({block: 'nearest'});
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const selectAt = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(selectedIndex);
        return;
      }
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => (index + direction + options.length) % options.length);
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      selectAt(activeIndex);
    }
  };

  return (
    <div ref={rootRef} className={`inspector-select ${open ? 'inspector-select-open' : ''}`}>
      <button
        type="button"
        className="inspector-select-trigger"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open ? `${listboxId}-${activeIndex}` : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        <span className="inspector-select-current">
          <b>{selected?.label || value}{selected?.detail ? <span> · {selected.detail}</span> : null}</b>
        </span>
        <span className="inspector-select-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div ref={menuRef} id={listboxId} className="inspector-select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;
            return (
              <button
                id={`${listboxId}-${index}`}
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`inspector-select-option ${isSelected ? 'inspector-select-option-selected' : ''} ${isActive ? 'inspector-select-option-active' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectAt(index)}
              >
                <span><b>{option.label}{option.detail ? <span> · {option.detail}</span> : null}</b></span>
                <i aria-hidden="true">{isSelected ? '✓' : ''}</i>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

const Track: React.FC<{
  label: string;
  durationMs: number;
  events: Array<{id: string; startMs: number; endMs: number; title: string; tone: string}>;
  selectedId?: string | null;
  selectedIds?: string[];
  onSelect?: (id: string, additive: boolean) => void;
}> = ({label, durationMs, events, selectedId, selectedIds, onSelect}) => (
  <div className="track-row">
    <div className="track-label">{label}</div>
    <div className="track-rail">
      {events.map((event) => (
        <button
          key={event.id}
          className={`clip ${selectedIds?.includes(event.id) || selectedId === event.id ? 'clip-selected' : ''}`}
          title={`${event.title} · ${formatTime(event.startMs)}–${formatTime(event.endMs)}`}
          onClick={(click) => onSelect?.(event.id, click.ctrlKey || click.metaKey || click.shiftKey)}
          style={{
            left: `${(event.startMs / durationMs) * 100}%`,
            width: `${Math.max(0.5, ((event.endMs - event.startMs) / durationMs) * 100)}%`,
            background: event.tone,
          }}
        >
          {event.title}
        </button>
      ))}
    </div>
  </div>
);

const foregroundEventIdsAtFrame = (project: EditProject, currentFrame: number) => {
  const currentMs = (currentFrame / project.composition.fps) * 1000;
  return project.timeline.foregroundEvents
    .filter((event) => event.enabled !== false && event.startMs <= currentMs && currentMs < event.endMs)
    .map((event) => event.id);
};

type ComponentDragState = {
  mode: 'move';
  eventId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  canvasWidth: number;
  canvasHeight: number;
  startBox: NormalizedPlacementBox;
};

type ComponentResizeState = {
  mode: 'resize';
  eventId: string;
  pointerId: number;
  corner: ResizeCorner;
  startClientX: number;
  startClientY: number;
  canvasWidth: number;
  canvasHeight: number;
  startBox: NormalizedPlacementBox;
};

type ComponentGestureState = (ComponentDragState | ComponentResizeState) & {selection?: ForegroundSelection};

type CalloutTargetGestureState = {
  mode: 'target-move' | 'target-resize';
  eventId: string;
  pointerId: number;
  corner?: ResizeCorner;
  startClientX: number;
  startClientY: number;
  panelClientWidth: number;
  panelClientHeight: number;
  startTarget: NormalizedPlacementBox;
};

type EditableElementBox = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type EditableElementGestureState = {
  mode: 'move' | 'resize';
  eventId: string;
  elementId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  canvasWidth: number;
  canvasHeight: number;
  elementClientWidth: number;
  elementClientHeight: number;
  componentScale: number;
  startOverride: {x: number; y: number; scale: number; color?: string};
};

export const App: React.FC = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeId, setActiveId] = useState('');
  const [loaded, setLoaded] = useState<LoadedProject | null>(null);
  const [draft, setDraft] = useState<EditProject | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [editableElementBoxes, setEditableElementBoxes] = useState<EditableElementBox[]>([]);
  const [payloadText, setPayloadText] = useState('');
  const [payloadError, setPayloadError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAssetId, setUploadingAssetId] = useState('');
  const [importing, setImporting] = useState(false);
  const [renderJob, setRenderJob] = useState<RenderJob | null>(null);
  const [renderStartingMode, setRenderStartingMode] = useState<'composite' | 'transparent-foreground' | null>(null);
  const [renderPathCopied, setRenderPathCopied] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [activeForegroundEventIds, setActiveForegroundEventIds] = useState<string[]>([]);
  const [captionStyleOpen, setCaptionStyleOpen] = useState(false);
  const [sfxMixerOpen, setSfxMixerOpen] = useState(false);
  const [selectedSfxId, setSelectedSfxId] = useState<string | null>(null);
  const [previewingSfxId, setPreviewingSfxId] = useState<string | null>(null);
  const sfxPreviewEndFrameRef = useRef<number | null>(null);
  const playerRef = useRef<PlayerRef>(null);
  const playerCanvasRef = useRef<HTMLDivElement>(null);
  const playerStageRef = useRef<HTMLDivElement>(null);
  const [playerCanvasSize, setPlayerCanvasSize] = useState<{width: number; height: number} | null>(null);
  const gestureStateRef = useRef<ComponentGestureState | null>(null);
  const calloutTargetGestureRef = useRef<CalloutTargetGestureState | null>(null);
  const editableElementGestureRef = useRef<EditableElementGestureState | null>(null);
  const measureEditableElementsRef = useRef<() => void>(() => undefined);
  const currentFrameRef = useRef(0);
  const draftRef = useRef<EditProject | null>(null);
  const activeForegroundKeyRef = useRef('');

  useEffect(() => {
    const stage = playerStageRef.current;
    if (!stage) return;
    const aspect = draft ? draft.composition.width / draft.composition.height : 16 / 9;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const width = Math.min(entry.contentRect.width, entry.contentRect.height * aspect);
      const height = width / aspect;
      setPlayerCanvasSize((current) => current && Math.abs(current.width - width) < 0.1 && Math.abs(current.height - height) < 0.1 ? current : {width, height});
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [draft?.composition.width, draft?.composition.height]);

  useEffect(() => {
    listProjects()
      .then((items) => {
        setProjects(items);
        if (items[0]) setActiveId(items[0].id);
      })
      .catch((reason) => setError(String(reason)));
  }, []);

  useEffect(() => {
    if (!activeId) return;
    loadProject(activeId)
      .then((project) => {
        const nextDraft = normalizeProjectPlacement(canonicalizeSectionTitles(structuredClone(project.manifest)));
        const initialActiveIds = foregroundEventIdsAtFrame(nextDraft, 0);
        setLoaded(project);
        setDraft(nextDraft);
        draftRef.current = nextDraft;
        setSelectedEventId(project.manifest.timeline.foregroundEvents[0]?.id || null);
        setSelectedEventIds([]);
        setSelectedElementId(null);
        setEditableElementBoxes([]);
        setSelectedSfxId(null);
        setPreviewingSfxId(null);
        sfxPreviewEndFrameRef.current = null;
        setSfxMixerOpen(false);
        currentFrameRef.current = 0;
        activeForegroundKeyRef.current = initialActiveIds.join('|');
        setActiveForegroundEventIds(initialActiveIds);
        setDirty(JSON.stringify(nextDraft) !== JSON.stringify(project.manifest));
        setRenderJob(null);
        setNotice('');
        setError('');
      })
      .catch((reason) => setError(String(reason)));
  }, [activeId]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !draft) return;
    const onFrame = ({detail}: {detail: {frame: number}}) => {
      currentFrameRef.current = detail.frame;
      const currentDraft = draftRef.current;
      if (!currentDraft) return;
      const nextIds = foregroundEventIdsAtFrame(currentDraft, detail.frame);
      if (detail.frame % 3 === 0) window.requestAnimationFrame(() => measureEditableElementsRef.current());
      const nextKey = nextIds.join('|');
      if (nextKey === activeForegroundKeyRef.current) return;
      activeForegroundKeyRef.current = nextKey;
      setActiveForegroundEventIds(nextIds);
    };
    onFrame({detail: {frame: player.getCurrentFrame()}});
    player.addEventListener('frameupdate', onFrame);
    player.addEventListener('seeked', onFrame);
    return () => {
      player.removeEventListener('frameupdate', onFrame);
      player.removeEventListener('seeked', onFrame);
    };
  }, [activeId, loaded, draft?.composition.fps]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const stop = () => {
      sfxPreviewEndFrameRef.current = null;
      setPreviewingSfxId(null);
    };
    const onFrame = ({detail}: {detail: {frame: number}}) => {
      const stopAt = sfxPreviewEndFrameRef.current;
      if (stopAt !== null && detail.frame >= stopAt) {
        stop();
        player.pause();
        player.seekTo(stopAt);
      }
    };
    player.addEventListener('frameupdate', onFrame);
    player.addEventListener('pause', stop);
    player.addEventListener('ended', stop);
    return () => {
      player.removeEventListener('frameupdate', onFrame);
      player.removeEventListener('pause', stop);
      player.removeEventListener('ended', stop);
    };
  }, [activeId, loaded]);

  useEffect(() => {
    draftRef.current = draft;
    if (!draft) return;
    const nextIds = foregroundEventIdsAtFrame(draft, currentFrameRef.current);
    const nextKey = nextIds.join('|');
    if (nextKey === activeForegroundKeyRef.current) return;
    activeForegroundKeyRef.current = nextKey;
    setActiveForegroundEventIds(nextIds);
  }, [draft]);

  useEffect(() => {
    if (!renderJob || !['queued', 'rendering'].includes(renderJob.status)) return;
    const timer = window.setInterval(() => {
      getRenderJob(renderJob.id)
        .then((job) => setRenderJob(job))
        .catch((reason) => setError(String(reason)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [renderJob?.id, renderJob?.status]);

  const activeSummary = projects.find((item) => item.id === activeId);
  const isWritable = activeSummary?.source === 'project';
  const totalFrames = draft ? Math.ceil((draft.composition.durationMs / 1000) * draft.composition.fps) : 1;
  const selectedEvent = useMemo<ForegroundEvent | undefined>(
    () => draft?.timeline.foregroundEvents.find((event) => event.id === selectedEventId),
    [draft, selectedEventId],
  );
  const selectedElement = editableElementBoxes.find((item) => item.id === selectedElementId);
  const selectedElementOverride = selectedEvent && selectedElementId
    ? selectedEvent.elementOverrides?.[selectedElementId]
    : undefined;
  const captionsHidden = draft?.settings.captionStyle?.hidden === true;
  const componentStyleMode = draft ? resolveComponentStyleMode(draft) : 'atomic';
  const captionStyle = draft?.settings.captionStyle || {};
  const captionFontFamily = typeof captionStyle.fontFamily === 'string'
    ? captionStyle.fontFamily
    : captionFontOptions[0].value;
  const captionFontSize = typeof captionStyle.fontSize === 'number'
    ? captionStyle.fontSize
    : Math.max(28, (draft?.composition.width || 1920) * 0.028);
  const captionColor = typeof captionStyle.color === 'string' ? captionStyle.color : '#FFFFFF';
  const captionBackgroundEnabled = captionStyle.backgroundEnabled === true;
  const captionBackgroundColor = typeof captionStyle.backgroundColor === 'string' ? captionStyle.backgroundColor : '#000000';
  const captionBackgroundOpacity = typeof captionStyle.backgroundOpacity === 'number' ? captionStyle.backgroundOpacity : 0.68;
  const captionBackgroundRadius = typeof captionStyle.backgroundRadius === 'number' ? captionStyle.backgroundRadius : 14;
  const captionVerticalPercent = draft ? Math.round(getCaptionVerticalPosition(draft) * 1000) / 10 : 85;
  const activeForegroundEvents = useMemo(() => {
    if (!draft) return [];
    const activeIds = new Set(activeForegroundEventIds);
    return draft.timeline.foregroundEvents.filter((event) => activeIds.has(event.id));
  }, [activeForegroundEventIds, draft]);
  const foregroundSelection = useMemo(() => draft
    ? getForegroundSelection(draft.timeline.foregroundEvents, selectedEventIds, draft.composition.width, draft.composition.height)
    : null, [draft, selectedEventIds]);
  const multiSelected = Boolean(foregroundSelection && foregroundSelection.events.length > 1);

  useEffect(() => {
    const clearSelection = () => {
      setSelectedEventIds([]);
      setSelectedElementId(null);
      setSelectedEventId(null);
    };
    const clearOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || (event.target as HTMLElement)?.closest('input, textarea, [contenteditable="true"]')) return;
      clearSelection();
    };
    const clearOnOutsidePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || gestureStateRef.current || calloutTargetGestureRef.current || editableElementGestureRef.current) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      // Blank space outside the video dismisses selection. Keep the inspector,
      // selection toolbar and controls usable without losing their target.
      if (target.closest('.player-canvas-shell, .inspector, [data-foreground-selection-controls], button, input, select, textarea, label, a, summary, [role="button"], [role="checkbox"], [role="combobox"], [role="option"], [contenteditable="true"]')) return;
      clearSelection();
    };
    window.addEventListener('keydown', clearOnEscape);
    window.addEventListener('pointerdown', clearOnOutsidePointerDown, true);
    return () => {
      window.removeEventListener('keydown', clearOnEscape);
      window.removeEventListener('pointerdown', clearOnOutsidePointerDown, true);
    };
  }, []);
  const playerInputProps = useMemo(
    () => draft && loaded ? {project: draft, assetBaseUrl: loaded.assetBaseUrl} : null,
    [draft, loaded?.assetBaseUrl],
  );

  const measureEditableElements = () => {
    const canvas = playerCanvasRef.current;
    if (!canvas || !selectedEventId || !activeForegroundEventIds.includes(selectedEventId)) {
      setEditableElementBoxes((current) => current.length ? [] : current);
      return;
    }
    const canvasRect = canvas.getBoundingClientRect();
    const eventRoot = canvas.querySelector<HTMLElement>(`[data-foreground-event-id="${CSS.escape(selectedEventId)}"]`);
    if (!eventRoot || canvasRect.width <= 0 || canvasRect.height <= 0) return;
    const next = Array.from(eventRoot.querySelectorAll<HTMLElement>('[data-editable-card-id]'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const opacity = Number.parseFloat(window.getComputedStyle(element).opacity || '1');
        if (rect.width < 8 || rect.height < 8 || opacity < 0.04) return null;
        return {
          id: element.dataset.editableCardId || '',
          label: element.dataset.editableCardLabel || element.dataset.editableCardId || '内部卡片',
          x: (rect.left - canvasRect.left) / canvasRect.width,
          y: (rect.top - canvasRect.top) / canvasRect.height,
          width: rect.width / canvasRect.width,
          height: rect.height / canvasRect.height,
        };
      })
      .filter((item): item is EditableElementBox => Boolean(item?.id));
    const signature = (items: EditableElementBox[]) => JSON.stringify(items.map((item) => [item.id, ...[item.x, item.y, item.width, item.height].map((value) => Math.round(value * 10000))]));
    setEditableElementBoxes((current) => signature(current) === signature(next) ? current : next);
  };
  measureEditableElementsRef.current = measureEditableElements;

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(measureEditableElements);
    const onResize = () => window.requestAnimationFrame(measureEditableElements);
    window.addEventListener('resize', onResize);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', onResize);
    };
  }, [draft, selectedEventId, activeForegroundEventIds.join('|')]);

  useEffect(() => {
    if (selectedElementId && !editableElementBoxes.some((item) => item.id === selectedElementId)) {
      setSelectedElementId(null);
    }
  }, [editableElementBoxes, selectedElementId]);

  useEffect(() => {
    setPayloadText(selectedEvent ? JSON.stringify(selectedEvent.payload, null, 2) : '');
    setPayloadError('');
  }, [selectedEventId, selectedEvent?.componentId]);

  const updateEvent = (updater: (event: ForegroundEvent) => ForegroundEvent) => {
    if (!selectedEventId) return;
    updateEventById(selectedEventId, updater);
  };

  const updateEventById = (eventId: string, updater: (event: ForegroundEvent) => ForegroundEvent) => {
    setDraft((current) => current ? normalizeProjectPlacement({
      ...current,
      timeline: {
        ...current.timeline,
        foregroundEvents: updateEventWithLinkedPlacement(
          current.timeline.foregroundEvents, eventId, updater,
          current.composition.width, current.composition.height,
        ),
      },
    }) : current);
    setDirty(true);
    setNotice('');
  };

  const toggleCaptionVisibility = () => {
    if (!isWritable) return;
    setDraft((current) => current ? {
      ...current,
      settings: {
        ...current.settings,
        captionStyle: {
          ...(current.settings.captionStyle || {}),
          hidden: current.settings.captionStyle?.hidden !== true,
        },
      },
    } : current);
    setDirty(true);
    setNotice('');
  };

  const updateComponentStyleMode = (mode: ComponentStyleMode) => {
    if (!isWritable || componentStyleMode === mode) return;
    setDraft((current) => {
      if (!current || resolveComponentStyleMode(current) === mode) return current;
      return normalizeProjectPlacement({
        ...current,
        settings: {
          ...current.settings,
          componentStyleMode: mode,
        },
      });
    });
    setDirty(true);
    setNotice('');
    setSelectedElementId(null);
    setEditableElementBoxes([]);
  };

  const updateCaptionStyle = (patch: Partial<NonNullable<EditProject['settings']['captionStyle']>>) => {
    if (!isWritable) return;
    setDraft((current) => current ? {
      ...current,
      settings: {
        ...current.settings,
        captionStyle: {
          ...(current.settings.captionStyle || {}),
          ...patch,
        },
      },
    } : current);
    setDirty(true);
    setNotice('');
  };

  const updateSfxMaster = (percent: number) => {
    if (!isWritable || !Number.isFinite(percent)) return;
    const gain = Math.min(200, Math.max(0, percent)) / 100;
    setDraft((current) => current ? {...current, settings: {...current.settings,
      audio: {...current.settings.audio, sfxMasterGain: gain},
    }} : current);
    setDirty(true);
    setNotice('');
  };

  const updateSfxCue = (id: string, patch: {volume?: number; enabled?: boolean}) => {
    if (!isWritable || (patch.volume !== undefined && !Number.isFinite(patch.volume))) return;
    const checkedPatch = patch.volume === undefined ? patch : {...patch, volume: Math.min(1, Math.max(0, patch.volume))};
    setDraft((current) => current ? {...current, timeline: {...current.timeline,
      sfxCues: current.timeline.sfxCues.map((cue) => cue.id === id ? {...cue, ...checkedPatch} : cue),
    }} : current);
    setDirty(true);
    setNotice('');
  };

  const selectSfxCue = (id: string, audition = false) => {
    if (!draft) return;
    const cue = draft.timeline.sfxCues.find((item) => item.id === id);
    if (!cue) return;
    const player = playerRef.current;
    player?.pause();
    sfxPreviewEndFrameRef.current = null;
    setPreviewingSfxId(null);
    setSelectedSfxId(id);
    setSfxMixerOpen(true);
    setCaptionStyleOpen(false);
    const fps = draft.composition.fps;
    const lastFrame = Math.max(0, Math.ceil(draft.composition.durationMs * fps / 1000) - 1);
    player?.seekTo(Math.min(lastFrame, Math.max(0, Math.round((cue.atMs - (audition ? 150 : 0)) * fps / 1000))));
    if (audition && player) {
      sfxPreviewEndFrameRef.current = Math.min(lastFrame, Math.ceil((cue.atMs + (cue.durationMs || 1800) + 200) * fps / 1000));
      setPreviewingSfxId(id);
      void player.play();
    }
  };

  const sfxCues = draft?.timeline.sfxCues || [];
  const selectedSfx = sfxCues.find((cue) => cue.id === selectedSfxId) || sfxCues[0];
  const selectedSfxAsset = draft?.assets.find((asset) => asset.id === selectedSfx?.assetId);
  const sfxMasterPercent = Math.round((draft?.settings.audio.sfxMasterGain ?? 1) * 100);
  const sfxCuePercent = Math.round((selectedSfx?.volume ?? 1) * 100);
  const sfxLabel = (assetId: string) => draft?.assets.find((asset) => asset.id === assetId)?.label || assetId;

  const resetCaptionStyle = () => {
    if (!isWritable) return;
    setDraft((current) => {
      if (!current) return current;
      const hidden = current.settings.captionStyle?.hidden;
      return {
        ...current,
        settings: {
          ...current.settings,
          captionStyle: hidden === undefined ? {} : {hidden},
        },
      };
    });
    setDirty(true);
    setNotice('');
  };

  const selectAndSeekToEvent = (eventId: string, replayEntrance = false) => {
    if (!draft) return;
    const event = draft.timeline.foregroundEvents.find((item) => item.id === eventId);
    if (!event) return;
    setSelectedEventId(eventId);
    setSelectedEventIds(canMultiTransform(event) ? [eventId] : []);
    setSelectedElementId(null);
    // Inspect the real entry frame; skipping 500ms hides shell/copy staging.
    const previewMs = event.startMs;
    const previewFrame = Math.min(
      Math.max(0, totalFrames - 1),
      Math.max(0, Math.round((previewMs / 1000) * draft.composition.fps)),
    );
    playerRef.current?.pause();
    playerRef.current?.seekTo(previewFrame);
    if (replayEntrance) playerRef.current?.play();
    currentFrameRef.current = previewFrame;
    const nextIds = foregroundEventIdsAtFrame(draft, previewFrame);
    activeForegroundKeyRef.current = nextIds.join('|');
    setActiveForegroundEventIds(nextIds);
  };

  const resetEventPlacement = () => {
    updateEvent((event) => {
      const {x: _x, y: _y, width: _width, height: _height, ...placement} = event.placement;
      return {...event, placement: {...placement, mode: 'preset'}};
    });
  };

  const changeRecordedDemoDisplayMode = (mode: 'fullscreen' | 'window') => {
    updateEvent((event) => {
      if (event.componentId !== 'MediaFrame' || event.variantId !== 'recordedDemo') return event;
      const placement = {...event.placement};
      const hasSavedBox = [placement.x, placement.y, placement.width, placement.height]
        .every((value) => typeof value === 'number' && Number.isFinite(value));
      if (mode === 'fullscreen') {
        return {
          ...event,
          payload: {...event.payload, presentationScale: 'detailTakeover'},
          placement: {
            ...placement,
            mode: 'preset',
            preset: 'fullscreen',
            alignmentToken: 'canvas',
            visibleEdge: 'center',
          },
        };
      }
      return {
        ...event,
        payload: {...event.payload, presentationScale: 'large'},
        placement: {
          ...placement,
          mode: hasSavedBox ? 'normalized' : 'preset',
          preset: placement.preset === 'fullscreen' || placement.preset === 'full-frame'
            ? 'centerTakeover'
            : placement.preset,
          alignmentToken: hasSavedBox ? placement.alignmentToken : 'centerAxis',
          visibleEdge: hasSavedBox ? placement.visibleEdge : 'center',
        },
      };
    });
  };

  const changePlacementPreset = (preset: string) => {
    updateEvent((event) => {
      const {x: _x, y: _y, width: _width, height: _height, ...placement} = event.placement;
      const recordedDemo = event.componentId === 'MediaFrame' && event.variantId === 'recordedDemo';
      return {
        ...event,
        payload: recordedDemo
          ? {...event.payload, presentationScale: preset === 'fullscreen' ? 'detailTakeover' : 'large'}
          : event.payload,
        placement: {
          ...placement,
          mode: 'preset',
          preset,
          ...(preset === 'fullscreen' ? {alignmentToken: 'canvas' as const, visibleEdge: 'center' as const} : {}),
        },
      };
    });
  };

  const toggleForegroundSelection = (eventId: string) => {
    const event = draft?.timeline.foregroundEvents.find((item) => item.id === eventId);
    if (!event || !canMultiTransform(event)) return;
    playerRef.current?.pause();
    setSelectedElementId(null);
    setSelectedEventIds((current) => current.includes(eventId)
      ? current.filter((id) => id !== eventId) : [...current, eventId]);
    setSelectedEventId(null);
  };

  const applySelectionTransform = (selection: ForegroundSelection, box: NormalizedPlacementBox) => {
    if (!isWritable) return;
    setDraft((current) => current ? {...current, timeline: {...current.timeline,
      foregroundEvents: transformForegroundSelection(current.timeline.foregroundEvents, selection, box)}} : current);
    setDirty(true);
    setNotice('');
  };

  const beginSelectionGesture = (pointerEvent: React.PointerEvent<HTMLElement>, corner?: ResizeCorner) => {
    const canvas = playerCanvasRef.current;
    if (!foregroundSelection || !canvas || !isWritable) return;
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    playerRef.current?.pause();
    setSelectedElementId(null);
    const rect = canvas.getBoundingClientRect();
    const common = {eventId: foregroundSelection.events[0].id, pointerId: pointerEvent.pointerId,
      startClientX: pointerEvent.clientX, startClientY: pointerEvent.clientY,
      canvasWidth: Math.max(1, rect.width), canvasHeight: Math.max(1, rect.height),
      startBox: foregroundSelection.bounds, selection: foregroundSelection};
    gestureStateRef.current = corner ? {...common, mode: 'resize', corner} : {...common, mode: 'move'};
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
  };

  const beginComponentDrag = (pointerEvent: React.PointerEvent<HTMLDivElement>, eventId: string) => {
    if (!draft || !isWritable) return;
    const event = draft.timeline.foregroundEvents.find((item) => item.id === eventId);
    const canvas = playerCanvasRef.current;
    if (!event || !canvas) return;
    if (pointerEvent.ctrlKey || pointerEvent.metaKey || pointerEvent.shiftKey) {
      pointerEvent.preventDefault(); pointerEvent.stopPropagation();
      toggleForegroundSelection(eventId);
      return;
    }
    if (multiSelected && selectedEventIds.includes(eventId)) {
      beginSelectionGesture(pointerEvent);
      return;
    }
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    playerRef.current?.pause();
    setSelectedEventId(eventId);
    setSelectedEventIds(canMultiTransform(event) ? [eventId] : []);
    if (isCanvasTransformLocked(event)) return;
    const canvasRect = canvas.getBoundingClientRect();
    const startBox = getEventPlacementBox(event, draft.composition.width, draft.composition.height);
    gestureStateRef.current = {
      mode: 'move',
      eventId,
      pointerId: pointerEvent.pointerId,
      startClientX: pointerEvent.clientX,
      startClientY: pointerEvent.clientY,
      canvasWidth: Math.max(1, canvasRect.width),
      canvasHeight: Math.max(1, canvasRect.height),
      startBox,
    };
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
  };

  const beginComponentResize = (
    pointerEvent: React.PointerEvent<HTMLElement>,
    eventId: string,
    corner: ResizeCorner,
  ) => {
    if (!draft || !isWritable) return;
    const event = draft.timeline.foregroundEvents.find((item) => item.id === eventId);
    const canvas = playerCanvasRef.current;
    if (!event || !canvas || isCanvasTransformLocked(event)) return;
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    playerRef.current?.pause();
    setSelectedEventId(eventId);
    const canvasRect = canvas.getBoundingClientRect();
    gestureStateRef.current = {
      mode: 'resize',
      eventId,
      pointerId: pointerEvent.pointerId,
      corner,
      startClientX: pointerEvent.clientX,
      startClientY: pointerEvent.clientY,
      canvasWidth: Math.max(1, canvasRect.width),
      canvasHeight: Math.max(1, canvasRect.height),
      startBox: getEventPlacementBox(event, draft.composition.width, draft.composition.height),
    };
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
  };

  const continueComponentGesture = (pointerEvent: React.PointerEvent<HTMLElement>) => {
    const gesture = gestureStateRef.current;
    if (!gesture || gesture.pointerId !== pointerEvent.pointerId) return;
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    if (gesture.selection) {
      const dx = pointerEvent.clientX - gesture.startClientX;
      const dy = pointerEvent.clientY - gesture.startClientY;
      let box: NormalizedPlacementBox;
      if (gesture.mode === 'move') {
        box = clampDraggedBox(gesture.startBox, gesture.startBox.x + dx / gesture.canvasWidth, gesture.startBox.y + dy / gesture.canvasHeight);
      } else {
        const vx = (gesture.corner.endsWith('e') ? 1 : -1) * gesture.startBox.width * gesture.canvasWidth;
        const vy = (gesture.corner.startsWith('s') ? 1 : -1) * gesture.startBox.height * gesture.canvasHeight;
        box = resizeForegroundSelection(gesture.selection, ((vx + dx) * vx + (vy + dy) * vy) / Math.max(1, vx * vx + vy * vy), gesture.corner);
      }
      applySelectionTransform(gesture.selection, box);
      return;
    }
    const box = gesture.mode === 'move'
      ? clampDraggedBox(
        gesture.startBox,
        gesture.startBox.x + (pointerEvent.clientX - gesture.startClientX) / gesture.canvasWidth,
        gesture.startBox.y + (pointerEvent.clientY - gesture.startClientY) / gesture.canvasHeight,
      )
      : clampResizedBox({
        box: gesture.startBox,
        corner: gesture.corner,
        deltaClientX: pointerEvent.clientX - gesture.startClientX,
        deltaClientY: pointerEvent.clientY - gesture.startClientY,
        canvasWidth: gesture.canvasWidth,
        canvasHeight: gesture.canvasHeight,
      });
    updateEventById(gesture.eventId, (event) => ({
      ...event,
      placement: {
        ...event.placement,
        mode: 'normalized',
        x: Number(box.x.toFixed(5)),
        y: Number(box.y.toFixed(5)),
        width: Number(box.width.toFixed(5)),
        height: Number(box.height.toFixed(5)),
      },
    }));
  };

  const finishComponentGesture = (pointerEvent: React.PointerEvent<HTMLElement>) => {
    const gesture = gestureStateRef.current;
    if (!gesture || gesture.pointerId !== pointerEvent.pointerId) return;
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    if (pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)) {
      pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
    }
    gestureStateRef.current = null;
  };

  const beginEditableElementGesture = (
    pointerEvent: React.PointerEvent<HTMLElement>,
    element: EditableElementBox,
    mode: EditableElementGestureState['mode'],
  ) => {
    if (!draft || !selectedEvent || !isWritable) return;
    const canvas = playerCanvasRef.current;
    if (!canvas) return;
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    playerRef.current?.pause();
    setSelectedElementId(element.id);
    const canvasRect = canvas.getBoundingClientRect();
    const existing = selectedEvent.elementOverrides?.[element.id] || {};
    editableElementGestureRef.current = {
      mode,
      eventId: selectedEvent.id,
      elementId: element.id,
      pointerId: pointerEvent.pointerId,
      startClientX: pointerEvent.clientX,
      startClientY: pointerEvent.clientY,
      canvasWidth: Math.max(1, canvasRect.width),
      canvasHeight: Math.max(1, canvasRect.height),
      elementClientWidth: Math.max(1, element.width * canvasRect.width),
      elementClientHeight: Math.max(1, element.height * canvasRect.height),
      componentScale: Math.max(0.35, getEventScale(selectedEvent, draft.composition.width, draft.composition.height)),
      startOverride: {
        x: typeof existing.x === 'number' ? existing.x : 0,
        y: typeof existing.y === 'number' ? existing.y : 0,
        scale: typeof existing.scale === 'number' ? existing.scale : 1,
        color: typeof existing.color === 'string' ? existing.color : undefined,
      },
    };
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
  };

  const continueEditableElementGesture = (pointerEvent: React.PointerEvent<HTMLElement>) => {
    const gesture = editableElementGestureRef.current;
    if (!gesture || gesture.pointerId !== pointerEvent.pointerId) return;
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    const dx = pointerEvent.clientX - gesture.startClientX;
    const dy = pointerEvent.clientY - gesture.startClientY;
    const next = gesture.mode === 'move'
      ? {
        ...gesture.startOverride,
        x: Math.min(1, Math.max(-1, gesture.startOverride.x + dx / gesture.canvasWidth / gesture.componentScale)),
        y: Math.min(1, Math.max(-1, gesture.startOverride.y + dy / gesture.canvasHeight / gesture.componentScale)),
      }
      : {
        ...gesture.startOverride,
        scale: Math.min(2.8, Math.max(0.35, gesture.startOverride.scale * (1 + (dx / gesture.elementClientWidth + dy / gesture.elementClientHeight) / 2))),
      };
    updateEventById(gesture.eventId, (event) => ({
      ...event,
      elementOverrides: {
        ...(event.elementOverrides || {}),
        [gesture.elementId]: {
          ...next,
          x: Number(next.x.toFixed(5)),
          y: Number(next.y.toFixed(5)),
          scale: Number(next.scale.toFixed(4)),
        },
      },
    }));
  };

  const finishEditableElementGesture = (pointerEvent: React.PointerEvent<HTMLElement>) => {
    const gesture = editableElementGestureRef.current;
    if (!gesture || gesture.pointerId !== pointerEvent.pointerId) return;
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    if (pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)) {
      pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
    }
    editableElementGestureRef.current = null;
    window.requestAnimationFrame(measureEditableElements);
  };

  const updateSelectedElement = (patch: Partial<{x: number; y: number; scale: number; color: string}>) => {
    if (!selectedElementId) return;
    updateEvent((event) => ({
      ...event,
      elementOverrides: {
        ...(event.elementOverrides || {}),
        [selectedElementId]: {
          ...(event.elementOverrides?.[selectedElementId] || {}),
          ...patch,
        },
      },
    }));
  };

  const resetSelectedElement = () => {
    if (!selectedElementId) return;
    updateEvent((event) => {
      const elementOverrides = {...(event.elementOverrides || {})};
      delete elementOverrides[selectedElementId];
      return {...event, elementOverrides};
    });
  };

  const resetAllElements = () => updateEvent((event) => ({...event, elementOverrides: {}}));

  const beginCalloutTargetGesture = (
    pointerEvent: React.PointerEvent<HTMLElement>,
    event: ForegroundEvent,
    mode: CalloutTargetGestureState['mode'],
    corner?: ResizeCorner,
  ) => {
    if (!draft || !isWritable) return;
    const canvas = playerCanvasRef.current;
    const geometry = getCalloutTargetGeometry(
      event,
      draft.assets,
      draft.composition.width,
      draft.composition.height,
    );
    if (!canvas || !geometry) return;
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    playerRef.current?.pause();
    setSelectedEventId(event.id);
    const canvasRect = canvas.getBoundingClientRect();
    calloutTargetGestureRef.current = {
      mode,
      eventId: event.id,
      pointerId: pointerEvent.pointerId,
      corner,
      startClientX: pointerEvent.clientX,
      startClientY: pointerEvent.clientY,
      panelClientWidth: Math.max(1, geometry.panel.width * canvasRect.width),
      panelClientHeight: Math.max(1, geometry.panel.height * canvasRect.height),
      startTarget: geometry.targetInSource,
    };
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
  };

  const continueCalloutTargetGesture = (pointerEvent: React.PointerEvent<HTMLElement>) => {
    const gesture = calloutTargetGestureRef.current;
    if (!gesture || gesture.pointerId !== pointerEvent.pointerId) return;
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    const deltaX = (pointerEvent.clientX - gesture.startClientX) / gesture.panelClientWidth;
    const deltaY = (pointerEvent.clientY - gesture.startClientY) / gesture.panelClientHeight;
    const target = gesture.mode === 'target-move'
      ? clampMovedCalloutTarget(gesture.startTarget, deltaX, deltaY)
      : clampResizedCalloutTarget(gesture.startTarget, gesture.corner || 'se', deltaX, deltaY);
    const serializedTarget = {
      x: Number(target.x.toFixed(5)),
      y: Number(target.y.toFixed(5)),
      width: Number(target.width.toFixed(5)),
      height: Number(target.height.toFixed(5)),
    };
    const currentEvent = draftRef.current?.timeline.foregroundEvents.find((event) => event.id === gesture.eventId);
    if (currentEvent && gesture.eventId === selectedEventId) {
      setPayloadText(JSON.stringify({...currentEvent.payload, target: serializedTarget}, null, 2));
    }
    updateEventById(gesture.eventId, (event) => {
      const payload = {
        ...event.payload,
        target: serializedTarget,
      };
      return {...event, payload};
    });
  };

  const finishCalloutTargetGesture = (pointerEvent: React.PointerEvent<HTMLElement>) => {
    const gesture = calloutTargetGestureRef.current;
    if (!gesture || gesture.pointerId !== pointerEvent.pointerId) return;
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    if (pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)) {
      pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
    }
    calloutTargetGestureRef.current = null;
  };

  const changeComponent = (componentId: string) => {
    const component = getComponent(componentId, componentStyleMode);
    if (!component) return;
    const payload = defaultPayloadFor(componentId);
    setSelectedElementId(null);
    setPayloadText(JSON.stringify(payload, null, 2));
    updateEvent((event) => {
      const next: ForegroundEvent = {
        ...event,
        componentId,
        semanticLayer: component.semanticLayer,
        variantId: component.defaultVariant,
        payload,
        elementOverrides: {},
        renderingMode: undefined,
        rendererComponent: undefined,
        structureId: undefined,
        topology: undefined,
        migration: undefined,
      };
      return componentId === 'AtomicSceneRenderer'
        ? applyAtomicVariant(next, component.defaultVariant)
        : next;
    });
  };

  const changePayload = (value: string) => {
    setPayloadText(value);
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      if (selectedEvent && isGraphicScene(selectedEvent)) {
        const errors = validateGraphicScene(parsed.graphicScene);
        if (errors.length) { setPayloadError(errors.join('；')); return; }
      }
      setPayloadError('');
      updateEvent((event) => ({...event, payload: parsed}));
    } catch {
      setPayloadError('JSON 格式尚未完整，预览暂不更新');
    }
  };

  const commitSave = async () => {
    if (!draft || !isWritable || payloadError) return;
    setSaving(true);
    try {
      const result = await saveProject(draft.project.id, draft);
      setDirty(false);
      setNotice(`已保存 · ${new Date(result.savedAt).toLocaleTimeString()}`);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setSaving(false);
    }
  };

  const replaceAsset = async (assetId: string, file?: File) => {
    if (!draft || !file || !isWritable) return;
    const projectId = draft.project.id;
    setUploadingAssetId(assetId);
    setError('');
    try {
      const result = await uploadAsset(projectId, assetId, file);
      const current = draftRef.current;
      if (!current || current.project.id !== projectId) return;
      const updated = applyAssetUpload(current, projectId, assetId, result);
      const disabledIds = new Set(current.timeline.foregroundEvents.filter((event) => event.enabled === false).map((event) => event.id));
      const activated = updated.timeline.foregroundEvents.find((event) => disabledIds.has(event.id) && event.enabled === true);
      setDraft((latest) => latest ? applyAssetUpload(latest, projectId, assetId, result) : latest);
      setDirty(true);
      setNotice('');
      if (activated) {
        // Show the newly completed demonstration, even when the playhead was elsewhere.
        const previewMs = activated.startMs + Math.min(500, (activated.endMs - activated.startMs) / 2);
        playerRef.current?.pause();
        playerRef.current?.seekTo(Math.round(previewMs * updated.composition.fps / 1000));
        setSelectedEventId(activated.id);
        setSelectedEventIds(canMultiTransform(activated) ? [activated.id] : []);
        setSelectedElementId(null);
      }
    } catch (reason) {
      setError(String(reason));
    } finally {
      setUploadingAssetId('');
    }
  };

  const importManifest = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    try {
      const manifest = JSON.parse(await file.text()) as EditProject;
      const result = await importProject(manifest);
      const items = await listProjects();
      setProjects(items);
      setActiveId(result.id);
    } catch (reason) {
      setError(`导入失败：${String(reason)}`);
    } finally {
      setImporting(false);
    }
  };

  const beginRender = async (mode: 'composite' | 'transparent-foreground' = 'composite') => {
    if (!draft || !isWritable || payloadError) return;
    setRenderStartingMode(mode);
    setRenderPathCopied(false);
    setError('');
    try {
      if (dirty) {
        await saveProject(draft.project.id, draft);
        setDirty(false);
      }
      setRenderJob(await startRender(draft.project.id, mode));
    } catch (reason) {
      setError(`导出失败：${String(reason)}`);
    } finally {
      setRenderStartingMode(null);
    }
  };

  const renderBusy = renderStartingMode !== null || renderJob?.status === 'queued' || renderJob?.status === 'rendering';
  const activeRenderMode = renderStartingMode || renderJob?.mode;
  const visibleRenderProgress = renderProgressPercent(renderJob);

  const copyRenderOutputPath = async () => {
    if (!renderJob?.outputPath) return;
    try {
      await navigator.clipboard.writeText(renderJob.outputPath);
      setRenderPathCopied(true);
    } catch (reason) {
      setError(`复制导出地址失败：${String(reason)}`);
    }
  };

  return (
    <main className="desk-shell">
      <header className="topbar">
        <div>
          <div className="brand-row"><span className="brand-mark">ED</span><h1>AI口播编辑台</h1></div>
          <p>导演JSON转时间线 · 本地预览 · 原分辨率输出</p>
        </div>
        <div className="top-actions">
          <span className="local-badge"><i />仅本地运行</span>
          <select value={activeId} onChange={(event) => setActiveId(event.target.value)}>
            {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <label className={`import-button ${importing ? 'import-disabled' : ''}`}>
            {importing ? '导入中…' : '导入剪辑JSON'}
            <input type="file" accept="application/json,.json" disabled={importing} onChange={(event) => void importManifest(event.target.files?.[0])} />
          </label>
          <button className="save-button" disabled={!dirty || !isWritable || saving || Boolean(payloadError)} onClick={commitSave}>
            {saving ? '保存中…' : dirty ? '保存项目' : notice || '已同步'}
          </button>
          {renderJob?.status === 'completed' ? <a className="output-link" href={renderJob.outputUrl} target="_blank" rel="noreferrer">{renderJob.mode === 'transparent-foreground' ? '打开透明前景' : '打开成片'}</a> : null}
          <button className="save-button" title="仅移除干净底片；保留外部素材、H3、前景、字幕和音效；自动预乘 Alpha，避免剪映放大阴影和发光" disabled={!isWritable || renderBusy || Boolean(payloadError)} onClick={() => void beginRender('transparent-foreground')}>
            {renderStartingMode === 'transparent-foreground'
              ? '正在启动透明导出…'
              : renderJob?.status === 'queued' || renderJob?.status === 'rendering'
              ? renderJob.mode === 'transparent-foreground' ? `透明前景 ${visibleRenderProgress}%` : '导出透明前景'
              : renderJob?.status === 'error' && renderJob.mode === 'transparent-foreground' ? '重试透明前景' : '导出透明前景'}
          </button>
          <button className="primary-button" disabled={!isWritable || renderBusy || Boolean(payloadError)} onClick={() => void beginRender('composite')}>
            {renderStartingMode === 'composite'
              ? '正在启动成片导出…'
              : renderJob?.status === 'queued' || renderJob?.status === 'rendering'
              ? renderJob.mode === 'composite' ? `渲染中 ${visibleRenderProgress}%` : '导出原分辨率成片'
              : renderJob?.status === 'error' && renderJob.mode === 'composite' ? '重试导出' : '导出原分辨率成片'}
          </button>
        </div>
      </header>

      {renderBusy ? (
        <div className="render-status-banner">
          <strong>{activeRenderMode === 'transparent-foreground' ? '透明前景正在导出' : '完整成片正在导出'}</strong>
          <span>{renderStartingMode ? '正在保存项目并启动渲染器…' : `${visibleRenderProgress}% · ${renderJob?.message || '渲染器已启动'}`}</span>
        </div>
      ) : null}

      {renderJob?.status === 'completed' ? (
        <div className="render-complete-banner">
          <strong>{renderJob.mode === 'transparent-foreground' ? '透明前景导出完成' : '完整成片导出完成'}</strong>
          <code className="render-output-path" title={renderJob.outputPath}>{renderJob.outputPath}</code>
          <button type="button" onClick={() => void copyRenderOutputPath()}>{renderPathCopied ? '地址已复制' : '复制地址'}</button>
          <a href={renderJob.outputUrl} target="_blank" rel="noreferrer">打开文件</a>
        </div>
      ) : null}

      {error ? <div className="error-banner" onClick={() => setError('')}>{error}</div> : null}

      <section className="workspace-grid">
        <aside className="asset-panel panel">
          <div className="panel-heading"><span>项目素材</span><b>{draft?.assets.length || 0}</b></div>
          <div className="asset-list">
            {draft?.assets.map((asset) => (
              <div className="asset-row" key={asset.id}>
                <span className={`asset-icon asset-${asset.type}`}>{asset.type === 'clean-base' ? '底' : asset.type === 'h3-video' ? 'H3' : '素'}</span>
                <div><strong>{asset.label || asset.id}</strong><small>{asset.path}</small></div>
                <div className="asset-actions">
                  <em className={`status-${asset.status}`}>{uploadingAssetId === asset.id ? 'uploading' : asset.status}</em>
                  <label className={`replace-asset ${!isWritable || uploadingAssetId === asset.id ? 'replace-disabled' : ''}`}>
                    替换
                    <input
                      type="file"
                      disabled={!isWritable || uploadingAssetId === asset.id}
                      accept={asset.type === 'image' ? 'image/*' : asset.type === 'audio' || asset.type === 'sfx' ? 'audio/*' : 'video/*'}
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        event.currentTarget.value = '';
                        void replaceAsset(asset.id, file);
                      }}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="preview-panel panel">
          <div className="preview-toolbar">
            <span style={{minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={draft?.project.name}>{draft?.project.name || '未载入项目'}</span>
            <div className="preview-toolbar-actions">
              <div className="component-style-toggle" role="group" aria-label="项目组件模式">
                <span>组件</span>
                <button
                  type="button"
                  className={componentStyleMode === 'legacy' ? 'component-style-toggle-active' : ''}
                  disabled={!draft || !isWritable}
                  aria-pressed={componentStyleMode === 'legacy'}
                  onClick={() => updateComponentStyleMode('legacy')}
                  title="使用原编辑台组件外观；选择会随项目保存并用于导出"
                >
                  经典
                </button>
                <button
                  type="button"
                  className={componentStyleMode === 'atomic' ? 'component-style-toggle-active' : ''}
                  disabled={!draft || !isWritable}
                  aria-pressed={componentStyleMode === 'atomic'}
                  onClick={() => updateComponentStyleMode('atomic')}
                  title="使用新版原子组件外观；选择会随项目保存并用于导出"
                >
                  新版原子
                </button>
              </div>
              <small>{draft ? `${draft.composition.width}×${draft.composition.height} · ${draft.composition.fps}fps · ${formatTime(draft.composition.durationMs)}` : ''}</small>
              <button
                type="button"
                className={`caption-visibility-button ${captionsHidden ? 'caption-visibility-button-off' : ''}`}
                disabled={!draft || !isWritable}
                aria-pressed={!captionsHidden}
                onClick={toggleCaptionVisibility}
                title={captionsHidden ? '恢复字幕显示，保存后导出也会显示' : '隐藏字幕，保存后导出也不会显示'}
              >
                {captionsHidden ? '显示字幕' : '隐藏字幕'}
              </button>
              <button
                type="button"
                className={`caption-style-button ${captionStyleOpen ? 'caption-style-button-active' : ''}`}
                disabled={!draft || !isWritable}
                aria-expanded={captionStyleOpen}
                onClick={() => {setCaptionStyleOpen((open) => !open); setSfxMixerOpen(false);}}
              >
                字幕样式
              </button>
              <button type="button" className={`caption-style-button ${sfxMixerOpen ? 'caption-style-button-active' : ''}`}
                aria-label="音效音量" aria-expanded={sfxMixerOpen} disabled={!draft}
                style={{flexShrink: 0}} onClick={() => {setSfxMixerOpen((open) => !open); setCaptionStyleOpen(false);}}>
                音效
              </button>
            </div>
          </div>
          {sfxMixerOpen && draft ? (
            <div className="caption-style-popover" role="region" aria-label="音效音量设置" style={{width: 350, maxWidth: 'calc(100% - 24px)'}}>
              <div className="caption-style-popover-heading">
                <div><strong>音效音量</strong><span>即时试听 · 保存后用于成片和透明前景导出</span></div>
                <button type="button" aria-label="关闭音效音量设置" onClick={() => setSfxMixerOpen(false)}>×</button>
              </div>
              <fieldset disabled={!isWritable || sfxCues.length === 0} style={{border: 0, padding: 0, margin: 0, minWidth: 0}}>
                <div className="caption-style-row">
                  <label>全片音效总音量
                    <input aria-label="音效总音量滑块" type="range" min="0" max="200" step="1" value={sfxMasterPercent} onChange={(event) => updateSfxMaster(event.target.valueAsNumber)} />
                  </label>
                  <label>百分比
                    <input aria-label="音效总音量百分比" type="number" min="0" max="200" step="1" value={sfxMasterPercent} onChange={(event) => updateSfxMaster(event.target.valueAsNumber)} />
                  </label>
                </div>
                <div style={{display: 'flex', gap: 6, marginBottom: 10}}>
                  {[0, 100, 150, 200].map((percent) => <button type="button" key={percent} style={{...sfxButtonStyle, flex: 1, ...(sfxMasterPercent === percent ? {background: '#554022', borderColor: '#b48648', color: '#ffe2b1'} : {})}} aria-pressed={sfxMasterPercent === percent} aria-label={percent === 0 ? '全部音效静音' : `音效总音量设为${percent}%`} onClick={() => updateSfxMaster(percent)}>{percent === 0 ? '静音' : `${percent}%`}</button>)}
                </div>
              </fieldset>
              {selectedSfx ? <>
                <div style={{borderTop: '1px solid #303640', paddingTop: 12, marginBottom: 12}}>
                  <strong style={{display: 'block', color: '#d9dadd', fontSize: 12, marginBottom: 8}}>单条音效 · 共 {sfxCues.length} 条</strong>
                  <InspectorSelect ariaLabel="选择音效" value={selectedSfx.id}
                    options={[...sfxCues].sort((a, b) => a.atMs - b.atMs).map((cue) => ({value: cue.id, label: `${formatTime(cue.atMs)} · ${sfxLabel(cue.assetId)}`, detail: cue.enabled === false ? '已停用' : undefined}))}
                    onChange={(id) => selectSfxCue(id)} />
                </div>
                <fieldset disabled={!isWritable} style={{border: 0, padding: 0, margin: 0, minWidth: 0}}>
                  <div className="caption-style-row">
                    <label>这条音效音量
                      <input aria-label="单条音效音量滑块" type="range" min="0" max="100" step="1" value={sfxCuePercent} onChange={(event) => updateSfxCue(selectedSfx.id, {volume: event.target.valueAsNumber / 100})} />
                    </label>
                    <label>百分比
                      <input aria-label="单条音效音量百分比" type="number" min="0" max="100" step="1" value={sfxCuePercent} onChange={(event) => updateSfxCue(selectedSfx.id, {volume: event.target.valueAsNumber / 100})} />
                    </label>
                  </div>
                </fieldset>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8}}>
                  <label style={{display: 'flex', gap: 8, alignItems: 'center', color: '#d9dadd', fontSize: 12}}>
                    <input aria-label="启用这条音效" type="checkbox" disabled={!isWritable} checked={selectedSfx.enabled !== false} onChange={(event) => updateSfxCue(selectedSfx.id, {enabled: event.target.checked})} />启用这条音效
                  </label>
                  <button type="button" style={sfxButtonStyle} disabled={selectedSfxAsset?.status !== 'ready' || selectedSfx.enabled === false}
                    onClick={() => previewingSfxId === selectedSfx.id ? playerRef.current?.pause() : selectSfxCue(selectedSfx.id, true)}>
                    {previewingSfxId === selectedSfx.id ? '停止试听' : '定位试听'}
                  </button>
                </div>
                <p style={{fontSize: 11, lineHeight: 1.6, color: '#8d949f', marginBottom: 0}}>{selectedSfxAsset?.status !== 'ready' ? '这条音效素材暂不可用，请先在素材区替换。' : sfxMasterPercent === 0 ? '全片音效当前已静音。' : '试听包含原口播，片段结束后自动暂停；点击下方音效轨道也可选择。'}</p>
              </> : <p style={{fontSize: 12, color: '#8d949f'}}>这个项目暂无独立音效。</p>}
            </div>
          ) : null}
          {captionStyleOpen && draft ? (
            <div className="caption-style-popover" aria-label="字幕样式设置">
              <div className="caption-style-popover-heading">
                <div><strong>字幕样式</strong><span>修改后即时预览，保存后用于最终导出</span></div>
                <button type="button" onClick={() => setCaptionStyleOpen(false)} aria-label="关闭字幕样式设置">×</button>
              </div>
              <label>字体
                <select value={captionFontFamily} onChange={(event) => updateCaptionStyle({fontFamily: event.target.value})}>
                  {captionFontOptions.some((font) => font.value === captionFontFamily) ? null : (
                    <option value={captionFontFamily}>{captionFontFamily} · 当前项目字体</option>
                  )}
                  {captionFontOptions.map((font) => <option key={font.label} value={font.value}>{font.label}</option>)}
                </select>
              </label>
              <div className="caption-style-row">
                <label>字号
                  <input type="range" min="24" max="160" step="1" value={captionFontSize} onChange={(event) => updateCaptionStyle({fontSize: Number(event.target.value)})} />
                </label>
                <label className="caption-number-field">像素
                  <input type="number" min="24" max="160" step="1" value={Math.round(captionFontSize)} onChange={(event) => updateCaptionStyle({fontSize: Math.min(160, Math.max(24, Number(event.target.value)))})} />
                </label>
              </div>
              <div className="caption-style-row">
                <label>垂直位置
                  <input aria-label="字幕垂直位置" type="range" min="0" max="100" step="0.1" value={captionVerticalPercent} onChange={(event) => updateCaptionStyle({verticalPosition: Number(event.target.value) / 100})} />
                </label>
                <label className="caption-number-field">百分比
                  <input aria-label="字幕垂直位置百分比" type="number" min="0" max="100" step="0.1" value={captionVerticalPercent} onChange={(event) => {
                    const value = event.target.valueAsNumber;
                    if (Number.isFinite(value)) updateCaptionStyle({verticalPosition: Math.min(100, Math.max(0, value)) / 100});
                  }} />
                </label>
              </div>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12, color: '#8d949f', fontSize: 10}}>
                <span>0% 顶部 · 100% 底部，全片统一</span>
                <button type="button" onClick={() => updateCaptionStyle({verticalPosition: undefined})}>默认位置</button>
              </div>
              <label className="caption-color-field">字幕颜色
                <span><input type="color" value={captionColor} onChange={(event) => updateCaptionStyle({color: event.target.value.toUpperCase()})} /><b>{captionColor}</b></span>
              </label>
              <label className="caption-background-toggle"><input type="checkbox" checked={captionBackgroundEnabled} onChange={(event) => updateCaptionStyle({backgroundEnabled: event.target.checked})} />增加字幕背景框</label>
              <div className={`caption-background-controls ${captionBackgroundEnabled ? '' : 'caption-background-controls-disabled'}`}>
                <label className="caption-color-field">背景填充色
                  <span><input type="color" disabled={!captionBackgroundEnabled} value={captionBackgroundColor} onChange={(event) => updateCaptionStyle({backgroundColor: event.target.value.toUpperCase()})} /><b>{captionBackgroundColor}</b></span>
                </label>
                <label>背景透明度 <b>{Math.round(captionBackgroundOpacity * 100)}%</b>
                  <input type="range" disabled={!captionBackgroundEnabled} min="0" max="1" step="0.01" value={captionBackgroundOpacity} onChange={(event) => updateCaptionStyle({backgroundOpacity: Number(event.target.value)})} />
                </label>
                <label>圆角 <b>{Math.round(captionBackgroundRadius)} px</b>
                  <input type="range" disabled={!captionBackgroundEnabled} min="0" max="80" step="1" value={captionBackgroundRadius} onChange={(event) => updateCaptionStyle({backgroundRadius: Number(event.target.value)})} />
                </label>
              </div>
              <button type="button" className="caption-style-reset" onClick={resetCaptionStyle}>恢复默认字幕样式</button>
            </div>
          ) : null}
          <div data-foreground-selection-controls="true" aria-label="前景多选工具栏" style={{padding: '6px 12px', borderBottom: '1px solid #293638', fontSize: 12, flexShrink: 0}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
              <strong>已选 {foregroundSelection?.events.length || 0} 项</strong>
              <button type="button" disabled={!isWritable} onClick={() => {
                playerRef.current?.pause(); setSelectedElementId(null); setSelectedEventId(null);
                setSelectedEventIds(activeForegroundEvents.filter(canMultiTransform).map((event) => event.id));
              }}>全选当前画面前景</button>
              <button type="button" onClick={() => {setSelectedEventIds([]); setSelectedEventId(null); setSelectedElementId(null);}}>取消多选</button>
              <button type="button" aria-label="统一缩小10%" disabled={!isWritable || !multiSelected} onClick={() => {
                if (foregroundSelection) applySelectionTransform(foregroundSelection, resizeForegroundSelection(foregroundSelection, .9));
              }}>缩小 10%</button>
              <button type="button" aria-label="统一放大10%" disabled={!isWritable || !multiSelected} onClick={() => {
                if (foregroundSelection) applySelectionTransform(foregroundSelection, resizeForegroundSelection(foregroundSelection, 1.1));
              }}>放大 10%</button>
              <span style={{opacity: .7}}>Ctrl / Shift 点选 · 拖动整组 · 拉角等比缩放 · 点击画面外空白 / Esc 取消</span>
            </div>
            <details style={{marginTop: 5}}>
              <summary style={{cursor: 'pointer'}}>当前画面前景列表（可勾选；全屏演示锁定）</summary>
              <div style={{display: 'flex', gap: '8px 14px', flexWrap: 'wrap', maxHeight: 96, overflow: 'auto', paddingTop: 8}}>
                {activeForegroundEvents.map((event) => <label key={event.id} style={{display: 'flex', gap: 5, alignItems: 'center'}}>
                  <input type="checkbox" aria-label={`多选 ${event.id}`} disabled={!isWritable || !canMultiTransform(event)}
                    checked={selectedEventIds.includes(event.id)} onChange={() => toggleForegroundSelection(event.id)} />
                  {String(event.payload.eyebrow || event.payload.headline || event.payload.title || event.componentId)}
                </label>)}
              </div>
            </details>
          </div>
          <div className="player-stage" ref={playerStageRef} style={{'--player-aspect': draft ? `${draft.composition.width} / ${draft.composition.height}` : '16 / 9'} as React.CSSProperties}>
            {draft && loaded && playerInputProps ? (
              <div className="player-canvas-shell" ref={playerCanvasRef} style={playerCanvasSize || undefined}>
                <Player
                  ref={playerRef}
                  component={EditComposition}
                  inputProps={playerInputProps}
                  durationInFrames={totalFrames}
                  compositionWidth={draft.composition.width}
                  compositionHeight={draft.composition.height}
                  fps={draft.composition.fps}
                  controls
                  style={{width: '100%', height: '100%'}}
                />
                <div className="component-drag-layer" aria-label="前景组件拖拽层">
                   {activeForegroundEvents.map((event) => {
                     const selected = event.id === selectedEventId || selectedEventIds.includes(event.id);
                     const locked = isCanvasTransformLocked(event);
                     const box = getEventPlacementBox(event, draft.composition.width, draft.composition.height);
                     const scale = getEventScale(event, draft.composition.width, draft.composition.height);
                     return (
                      <div
                        key={event.id}
                        role="button"
                        tabIndex={0}
                        className={`component-drag-box ${selected ? 'component-drag-box-selected' : ''} ${locked ? 'component-drag-box-locked' : ''}`}
                        style={{
                          left: `${box.x * 100}%`,
                          top: `${box.y * 100}%`,
                          width: `${box.width * 100}%`,
                          height: `${box.height * 100}%`,
                          zIndex: (selected ? 700 : 200) + event.placement.zIndex,
                        }}
                        title={locked ? `${event.componentId} 为全屏展示，位置和尺寸已锁定` : `拖动 ${event.componentId}，或拉四角缩放`}
                        onPointerDown={(pointerEvent) => {
                          setSelectedElementId(null);
                          beginComponentDrag(pointerEvent, event.id);
                        }}
                        onPointerMove={continueComponentGesture}
                        onPointerUp={finishComponentGesture}
                        onPointerCancel={finishComponentGesture}
                        onKeyDown={(keyEvent) => {
                          if (keyEvent.key !== 'Enter' && keyEvent.key !== ' ') return;
                          keyEvent.preventDefault();
                          if (keyEvent.ctrlKey || keyEvent.metaKey || keyEvent.shiftKey) toggleForegroundSelection(event.id);
                          else {setSelectedEventId(event.id); setSelectedEventIds(canMultiTransform(event) ? [event.id] : []);}
                        }}
                      >
                        {selected ? (
                          <span className="component-drag-label">
                            {locked ? '全屏展示 · 已锁定' : `拖动移动 · 拉四角缩放 · ${Math.round(scale * 100)}%`} · {event.componentId}
                          </span>
                        ) : null}
                        {selected && !locked && !multiSelected ? (['nw', 'ne', 'sw', 'se'] as ResizeCorner[]).map((corner) => (
                          <i
                            key={corner}
                            role="button"
                            aria-label={`从${corner}角缩放 ${event.componentId}`}
                            className={`component-resize-handle component-resize-handle-${corner}`}
                            onPointerDown={(pointerEvent) => beginComponentResize(pointerEvent, event.id, corner)}
                            onPointerMove={continueComponentGesture}
                            onPointerUp={finishComponentGesture}
                            onPointerCancel={finishComponentGesture}
                          />
                        )) : null}
                      </div>
                    );
                  })}
                  {multiSelected && foregroundSelection && foregroundSelection.events.some((event) => activeForegroundEventIds.includes(event.id)) ? (
                    <div aria-label="多选前景统一边框" style={{position: 'absolute', pointerEvents: 'none',
                      left: `${foregroundSelection.bounds.x * 100}%`, top: `${foregroundSelection.bounds.y * 100}%`,
                      width: `${foregroundSelection.bounds.width * 100}%`, height: `${foregroundSelection.bounds.height * 100}%`,
                      border: '2px solid #42e1d3', boxSizing: 'border-box', zIndex: 1100}}>
                      <div role="button" aria-label="移动多选前景" className="component-drag-label"
                        style={{background: '#42e1d3', pointerEvents: 'auto', cursor: 'grab', touchAction: 'none', top: 4, left: 4}}
                        onPointerDown={(event) => beginSelectionGesture(event)} onPointerMove={continueComponentGesture}
                        onPointerUp={finishComponentGesture} onPointerCancel={finishComponentGesture}>
                        已选 {foregroundSelection.events.length} 项 · 拖动整组 / 拉角缩放
                      </div>
                      {(['nw', 'ne', 'sw', 'se'] as ResizeCorner[]).map((corner) => <i key={corner} role="button"
                        aria-label={`从${corner}角缩放多选前景`} className={`component-resize-handle component-resize-handle-${corner}`}
                        style={{pointerEvents: 'auto', boxShadow: '0 0 0 2px #42e1d3'}}
                        onPointerDown={(event) => beginSelectionGesture(event, corner)} onPointerMove={continueComponentGesture}
                        onPointerUp={finishComponentGesture} onPointerCancel={finishComponentGesture} />)}
                    </div>
                  ) : null}
                  {selectedEvent?.componentId === 'CalloutSpotlight' && activeForegroundEventIds.includes(selectedEvent.id) ? (() => {
                    const geometry = getCalloutTargetGeometry(
                      selectedEvent,
                      draft.assets,
                      draft.composition.width,
                      draft.composition.height,
                    );
                    if (!geometry) return null;
                    return (
                      <div
                        className="callout-target-box"
                        style={{
                          left: `${geometry.target.x * 100}%`,
                          top: `${geometry.target.y * 100}%`,
                          width: `${geometry.target.width * 100}%`,
                          height: `${geometry.target.height * 100}%`,
                          zIndex: 800 + selectedEvent.placement.zIndex,
                        }}
                        title="拖动绿色框修改聚焦位置；拉四角修改聚焦范围"
                        onPointerDown={(pointerEvent) => beginCalloutTargetGesture(pointerEvent, selectedEvent, 'target-move')}
                        onPointerMove={continueCalloutTargetGesture}
                        onPointerUp={finishCalloutTargetGesture}
                        onPointerCancel={finishCalloutTargetGesture}
                      >
                        <span className="callout-target-label">局部聚焦 · 可拖动</span>
                        {(['nw', 'ne', 'sw', 'se'] as ResizeCorner[]).map((corner) => (
                          <i
                            key={corner}
                            role="button"
                            aria-label={`从${corner}角修改聚焦范围`}
                            className={`callout-target-handle callout-target-handle-${corner}`}
                            onPointerDown={(pointerEvent) => beginCalloutTargetGesture(pointerEvent, selectedEvent, 'target-resize', corner)}
                            onPointerMove={continueCalloutTargetGesture}
                            onPointerUp={finishCalloutTargetGesture}
                            onPointerCancel={finishCalloutTargetGesture}
                          />
                        ))}
                      </div>
                    );
                  })() : null}
                  {selectedEvent && selectedElementId && activeForegroundEventIds.includes(selectedEvent.id) ? editableElementBoxes.map((element) => {
                    const selected = selectedElementId === element.id;
                    return (
                      <div
                        key={element.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`编辑内部卡片 ${element.label}`}
                        className={`editable-element-box ${selected ? 'editable-element-box-selected' : ''}`}
                        style={{
                          left: `${element.x * 100}%`,
                          top: `${element.y * 100}%`,
                          width: `${element.width * 100}%`,
                          height: `${element.height * 100}%`,
                          zIndex: 960 + selectedEvent.placement.zIndex,
                        }}
                        title={`内部卡片：${element.label}。拖动移动，拉右下角缩放`}
                        onPointerDown={(pointerEvent) => beginEditableElementGesture(pointerEvent, element, 'move')}
                        onPointerMove={continueEditableElementGesture}
                        onPointerUp={finishEditableElementGesture}
                        onPointerCancel={finishEditableElementGesture}
                      >
                        {selected ? <span className="editable-element-label">内部卡片 · {element.label}</span> : null}
                        {selected ? (
                          <i
                            role="button"
                            aria-label={`缩放内部卡片 ${element.label}`}
                            className="editable-element-resize-handle"
                            onPointerDown={(pointerEvent) => beginEditableElementGesture(pointerEvent, element, 'resize')}
                            onPointerMove={continueEditableElementGesture}
                            onPointerUp={finishEditableElementGesture}
                            onPointerCancel={finishEditableElementGesture}
                          />
                        ) : null}
                      </div>
                    );
                  }) : null}
                </div>
              </div>
            ) : <div className="loading">正在读取项目……</div>}
          </div>
        </section>

        <aside className="inspector panel">
          <div className="panel-heading"><span>属性</span><b>{isWritable ? '可编辑' : '示例只读'}</b></div>
          {selectedEvent ? (
            <div className="inspector-body">
              <button type="button" className="secondary" onClick={() => selectAndSeekToEvent(selectedEvent.id, true)} title="从此组件开始时间播放，检查底板、标签和文字的入场">重播入场</button>
              <div className="inspector-field">
                <span className="inspector-field-label">组件</span>
                <InspectorSelect
                  ariaLabel="选择组件"
                  value={selectedEvent.componentId}
                  options={(selectedEvent.semanticLayer === 'title'
                    ? [getComponent('SectionTitle', componentStyleMode)!]
                    : [...getComponentCatalog(componentStyleMode), ...(isGraphicScene(selectedEvent) ? [graphicSceneComponent] : [])]
                  ).map((item) => ({value: item.id, label: item.label, detail: item.id}))}
                  onChange={changeComponent}
                />
              </div>
              <div className="inspector-field">
                <span className="inspector-field-label">变体样式</span>
                <InspectorSelect
                  ariaLabel="选择变体样式"
                  value={selectedEvent.variantId}
                  options={getCompatibleVariants(selectedEvent.componentId, selectedEvent.variantId, componentStyleMode).map((variant) => ({value: variant.id, label: variant.label, detail: variant.id}))}
                   onChange={(variantId) => {
                     setSelectedElementId(null);
                     updateEvent((item) => item.componentId === 'AtomicSceneRenderer'
                       ? applyAtomicVariant(item, variantId)
                       : {...item, variantId, elementOverrides: {}});
                   }}
                />
              </div>
              <div className="accent-color-editor">
                <div className="accent-color-heading">
                  <span>组件主色</span>
                  <small>{componentAccentColorOptions.find((color) => color.hex === selectedEvent.style?.accentColor)?.name || '样式默认'}</small>
                </div>
                {[
                  {label: '房间灯七色', colors: roomLightColorOptions},
                  {label: '原始 Skill 色', colors: originalSkillColorOptions},
                ].map((group) => (
                  <div className="accent-color-group" key={group.label}>
                    <div className="accent-color-group-title">{group.label}</div>
                    <div className={`accent-color-swatches ${group.label === '原始 Skill 色' ? 'accent-color-swatches-original' : ''}`}>
                      {group.colors.map((color) => {
                        const selected = selectedEvent.style?.accentColor === color.hex;
                        const source = 'source' in color ? ` · ${color.source}` : '';
                        return (
                          <button
                            key={color.name}
                            type="button"
                            className={`accent-color-swatch ${selected ? 'accent-color-swatch-selected' : ''}`}
                            title={`${color.name} · ${color.hex}${source}`}
                            aria-label={`选择${color.name}`}
                            aria-pressed={selected}
                            onClick={() => updateEvent((item) => ({...item, style: {...(item.style || {}), accentColor: color.hex}}))}
                            style={{'--swatch-color': color.hex} as React.CSSProperties}
                          >
                            <span />
                            <b>{color.name}</b>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="accent-color-reset"
                  disabled={!selectedEvent.style?.accentColor}
                  onClick={() => updateEvent((item) => {
                    const style = {...(item.style || {})};
                    delete style.accentColor;
                    return {...item, style};
                  })}
                >恢复该样式默认色</button>
              </div>
              <div className="inspector-field editable-element-inspector">
                <span className="inspector-field-label">编辑层级</span>
                <div className="editing-level-switch" role="group" aria-label="选择编辑层级">
                  <button type="button" className={!selectedElementId ? 'active' : ''} onClick={() => setSelectedElementId(null)}>整体组件</button>
                  <button type="button" className={selectedElementId ? 'active' : ''} disabled={editableElementBoxes.length === 0} onClick={() => setSelectedElementId(editableElementBoxes[0]?.id || null)}>内部卡片</button>
                </div>
                {editableElementBoxes.length ? (
                  <div className="editable-element-summary">
                    <strong>{selectedElement ? selectedElement.label : `检测到 ${editableElementBoxes.length} 个可编辑卡片`}</strong>
                    <span>{selectedElement ? `拖动画面中的青色框单独移动；拉右下角单独缩放。连接线会根据端点实时重算。` : '点击画面中的卡片进入内部编辑；整体移动、缩放和换色仍然保留。'}</span>
                  </div>
                ) : <div className="editable-element-summary"><span>这个组件当前没有独立卡片表面，继续使用整体编辑。</span></div>}
                {selectedElement ? (
                  <>
                    <div className="accent-color-heading">
                      <span>内部卡片颜色</span>
                      <small>{componentAccentColorOptions.find((color) => color.hex === selectedElementOverride?.color)?.name || '继承原样式'}</small>
                    </div>
                    {[
                      {label: '房间灯七色', colors: roomLightColorOptions},
                      {label: '原始 Skill 色', colors: originalSkillColorOptions},
                    ].map((group) => (
                      <div className="accent-color-group" key={`element-${group.label}`}>
                        <div className="accent-color-group-title">{group.label}</div>
                        <div className={`accent-color-swatches ${group.label === '原始 Skill 色' ? 'accent-color-swatches-original' : ''}`}>
                          {group.colors.map((color) => {
                            const selected = selectedElementOverride?.color === color.hex;
                            const source = 'source' in color ? ` · ${color.source}` : '';
                            return (
                              <button
                                key={`element-${color.name}`}
                                type="button"
                                className={`accent-color-swatch ${selected ? 'accent-color-swatch-selected' : ''}`}
                                title={`${color.name} · ${color.hex}${source}`}
                                aria-label={`把内部卡片改为${color.name}`}
                                aria-pressed={selected}
                                onClick={() => updateSelectedElement({color: color.hex})}
                                style={{'--swatch-color': color.hex} as React.CSSProperties}
                              ><span /><b>{color.name}</b></button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <div className="editable-element-actions">
                      <span>单卡尺寸 {Math.round((selectedElementOverride?.scale || 1) * 100)}%</span>
                      <button type="button" onClick={resetSelectedElement}>恢复此卡片</button>
                      <button type="button" onClick={resetAllElements}>恢复全部内部布局</button>
                    </div>
                  </>
                ) : null}
              </div>
              <GraphicSceneInspector event={selectedEvent} selectedObjectId={selectedElementId} assets={draft?.assets || []} onChange={(payload) => {
                setPayloadText(JSON.stringify(payload, null, 2));
                setPayloadError('');
                updateEvent((event) => ({...event, payload}));
              }} />
              <label>语义层<input readOnly value={semanticLayerLabels[selectedEvent.semanticLayer]} /></label>
              {selectedEvent.componentId === 'MediaFrame' && selectedEvent.variantId === 'recordedDemo' ? (
                <div className="inspector-field">
                  <span className="inspector-field-label">操作演示展示形式</span>
                  <InspectorSelect
                    ariaLabel="选择操作演示展示形式"
                    value={isRecordedDemoTakeover(selectedEvent) ? 'fullscreen' : 'window'}
                    options={[
                      {value: 'fullscreen', label: '全屏演示', detail: '细节接管'},
                      {value: 'window', label: '前景窗口', detail: '可移动缩放'},
                    ]}
                    onChange={(mode) => changeRecordedDemoDisplayMode(mode as 'fullscreen' | 'window')}
                  />
                </div>
              ) : null}
              <div className="two-columns">
                <label>开始（秒）<input type="number" step="0.1" value={(selectedEvent.startMs / 1000).toFixed(1)} onChange={(event) => updateEvent((item) => ({...item, startMs: Math.max(0, Number(event.target.value) * 1000)}))} /></label>
                <label>结束（秒）<input type="number" step="0.1" value={(selectedEvent.endMs / 1000).toFixed(1)} onChange={(event) => updateEvent((item) => ({...item, endMs: Math.min(draft?.composition.durationMs || item.endMs, Number(event.target.value) * 1000)}))} /></label>
              </div>
              <div className="inspector-field">
                <span className="inspector-field-label">位置</span>
                <InspectorSelect
                  ariaLabel="选择组件位置"
                  value={selectedEvent.placement.preset}
                  options={[
                    {value: 'leftMiddle', label: '左侧主体区', detail: 'leftMiddle'},
                    {value: 'rightMiddle', label: '右侧主体区', detail: 'rightMiddle'},
                    {value: 'leftLowerSafe', label: '左下安全区', detail: 'leftLowerSafe'},
                    {value: 'rightLowerSafe', label: '右下安全区', detail: 'rightLowerSafe'},
                    {value: 'upperCenterSafe', label: '上方居中安全区', detail: 'upperCenterSafe'},
                    {value: 'fullWidthUpper', label: '上方横向区域', detail: 'fullWidthUpper'},
                    {value: 'splitLeftRight', label: '左右关系区域', detail: 'splitLeftRight'},
                    {value: 'centerTakeover', label: '画面中心安全区', detail: 'centerTakeover'},
                    {value: 'fullscreen', label: '全屏接管', detail: 'fullscreen'},
                  ]}
                  onChange={changePlacementPreset}
                />
              </div>
              <div className="drag-position-summary">
                <div>
                  <strong>画面直接移动与缩放</strong>
                  {getTransformGroupId(selectedEvent) ? (
                    <span role="status" aria-label="位置大小联动状态">
                      已联动位置与大小 · 拖动、缩放或恢复位置会同步同组图片，内容和时间不变
                    </span>
                  ) : null}
                  <span>
                   {selectedEvent.placement.mode === 'normalized'
                       ? `自定义位置 · X ${Math.round((selectedEvent.placement.x || 0) * 100)}% · Y ${Math.round((selectedEvent.placement.y || 0) * 100)}% · 尺寸 ${Math.round(getEventScale(selectedEvent, draft?.composition.width || 1920, draft?.composition.height || 1080) * 100)}%`
                       : isCanvasTransformLocked(selectedEvent)
                         ? selectedEvent.componentId === 'MediaFrame' && selectedEvent.variantId === 'recordedDemo'
                           ? '当前为全屏操作演示：可以选中并切换为前景窗口；全屏状态不允许误拖动'
                           : '当前全屏事件保持锁定，不允许误缩放'
                         : '点击下方时间线片段，在预览画面中拖动组件；拉四角即可等比缩放'}
                  </span>
                </div>
                <button type="button" disabled={selectedEvent.placement.mode !== 'normalized'} onClick={resetEventPlacement}>恢复预设位置</button>
              </div>
              {selectedEvent.componentId === 'CalloutSpotlight' ? (
                <div className="callout-target-summary">
                  <strong>局部聚焦范围</strong>
                  <span>直接拖动画面中的绿色框改焦点；拉四角改范围。它不会移动或缩放整个素材组件。</span>
                </div>
              ) : null}
              <label className="toggle-row"><input type="checkbox" checked={selectedEvent.enabled !== false} onChange={(event) => updateEvent((item) => ({...item, enabled: event.target.checked}))} />启用此事件</label>
              <label>内容 JSON<textarea value={payloadText} onChange={(event) => changePayload(event.target.value)} spellCheck={false} /></label>
              {payloadError ? <p className="payload-error">{payloadError}</p> : null}
              <p className="next-note">调整会立即反映到中间预览。正式项目可保存，且每次保存前自动备份旧 JSON。</p>
            </div>
          ) : <div className="empty-state">在时间线上选择一个前景事件</div>}
        </aside>
      </section>

      <section className="timeline-panel panel">
        <div className="timeline-header">
          <div><strong>时间线</strong><span>所有时间均来自干净底片</span></div>
          <div className="timeline-scale"><span>00:00</span><span>{draft ? formatTime(draft.composition.durationMs / 2) : '--'}</span><span>{draft ? formatTime(draft.composition.durationMs) : '--'}</span></div>
        </div>
        {draft ? (
          <div className="tracks">
            <Track label="前景" durationMs={draft.composition.durationMs} selectedId={selectedEventId} selectedIds={selectedEventIds}
              onSelect={(id, additive) => additive ? toggleForegroundSelection(id) : selectAndSeekToEvent(id)}
              events={draft.timeline.foregroundEvents.map((event) => ({id: event.id, startMs: event.startMs, endMs: event.endMs, title: event.componentId, tone: '#f3a847'}))} />
            <Track label="音效" durationMs={draft.composition.durationMs} selectedId={selectedSfxId}
              onSelect={(id) => selectSfxCue(id)}
              events={draft.timeline.sfxCues.map((cue) => ({id: cue.id, startMs: cue.atMs, endMs: Math.min(draft.composition.durationMs, cue.atMs + (cue.durationMs || 1800)), title: sfxLabel(cue.assetId), tone: cue.enabled === false ? '#47504f' : '#6484d4'}))} />
            <Track label="H3" durationMs={draft.composition.durationMs} events={draft.timeline.h3Events.map((event) => ({id: event.id, startMs: event.startMs, endMs: event.endMs, title: 'H3', tone: '#7458e8'}))} />
            <Track label={captionsHidden ? '字幕（隐藏）' : '字幕'} durationMs={draft.composition.durationMs} events={draft.timeline.captionCues.map((cue) => ({id: cue.id, startMs: cue.startMs, endMs: cue.endMs, title: cue.text, tone: captionsHidden ? '#47504f' : '#2f9c89'}))} />
          </div>
        ) : null}
      </section>
    </main>
  );
};
