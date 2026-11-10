import React from 'react';
import {isEditorialTrial} from '../editorialTrialLayout';
import {isGraphicScene} from '../graphicSceneModel';
import {AbsoluteFill, Audio, Freeze, OffthreadVideo, Sequence} from 'remotion';
import {getEventScale, getEventTransformOrigin, getEventTranslation} from '../editorPlacement';
import {ForegroundEventRenderer} from './ForegroundEventRenderer';
import {EditableElementBridge as AtomicEditableElementBridge} from '../atomic-semantic-foreground-pack';
import {EditableElementBridge as LegacyEditableElementBridge} from '../legacy-semantic-foreground-pack';
import {getAtomicConnectorComponentId} from '../atomicSceneModel';
import {getCaptionVerticalPosition, resolveComponentStyleMode, type EditAsset, type EditProject} from '../types';

export type EditCompositionProps = {
  project: EditProject;
  assetBaseUrl: string;
  renderMode?: 'composite' | 'transparent-foreground';
};

class ForegroundEventBoundary extends React.Component<
  {eventId: string; children: React.ReactNode},
  {failed: boolean}
> {
  state = {failed: false};

  static getDerivedStateFromError() {
    return {failed: true};
  }

  componentDidCatch(error: unknown) {
    console.error(`[foreground-event:${this.props.eventId}] isolated renderer failure`, error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const assetUrl = (baseUrl: string, asset?: EditAsset) =>
  asset ? `${baseUrl}${asset.path.split('/').map(encodeURIComponent).join('/')}` : '';

const accentRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return '';
  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16)).join(',');
};

const finiteNumber = (value: unknown, fallback: number, minimum: number, maximum: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback;

const colorWithOpacity = (color: string, opacity: number) => {
  const normalized = color.replace('#', '');
  if (/^[0-9a-f]{6}$/i.test(normalized)) {
    const [red, green, blue] = [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
    return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
  }
  return color;
};

const H3Retime: React.FC<{
  event: EditProject['timeline']['h3Events'][number];
  src: string;
  fps: number;
  masterGain: number;
}> = ({event, src, fps, masterGain}) => {
  const frame = (ms: number) => Math.max(0, Math.round((ms / 1000) * fps));
  const eventDurationMs = event.endMs - event.startMs;
  const segments = event.retime.length > 0 ? event.retime : [{
    type: 'play' as const,
    timelineStartMs: event.startMs,
    timelineEndMs: event.endMs,
    sourceStartMs: 0,
    sourceEndMs: eventDurationMs,
    playbackRate: 1,
  }];
  const volume = event.audio.enabled ? Math.min(1, event.audio.volume * masterGain) : 0;
  return (
    <AbsoluteFill>
      {segments.map((segment, index) => {
        const localStartMs = Math.max(0, segment.timelineStartMs - event.startMs);
        const localEndMs = Math.min(eventDurationMs, segment.timelineEndMs - event.startMs);
        if (localEndMs <= localStartMs) return null;
        const durationInFrames = Math.max(1, frame(localEndMs - localStartMs));
        const sourceStartMs = segment.sourceStartMs || 0;
        const sourceEndMs = segment.sourceEndMs ?? sourceStartMs + (localEndMs - localStartMs);
        const derivedRate = (sourceEndMs - sourceStartMs) / Math.max(1, localEndMs - localStartMs);
        const playbackRate = segment.playbackRate || derivedRate || 1;
        const video = (
          <OffthreadVideo
            src={src}
            startFrom={segment.type === 'hold' ? 0 : frame(sourceStartMs)}
            playbackRate={segment.type === 'play' ? playbackRate : 1}
            volume={segment.type === 'play' ? volume : 0}
            style={{width: '100%', height: '100%', objectFit: 'cover'}}
          />
        );
        return (
          <Sequence key={`${segment.type}-${index}`} from={frame(localStartMs)} durationInFrames={durationInFrames}>
            {segment.type === 'hold' ? <Freeze frame={frame(sourceStartMs)}>{video}</Freeze> : video}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const EditComposition: React.FC<EditCompositionProps> = ({project, assetBaseUrl, renderMode = 'composite'}) => {
  const {fps, width, height, durationMs, backgroundAssetId} = project.composition;
  const frame = (ms: number) => Math.max(0, Math.round((ms / 1000) * fps));
  const duration = (startMs: number, endMs: number) => Math.max(1, frame(endMs) - frame(startMs));
  const assets = new Map(project.assets.map((asset) => [asset.id, asset]));
  const background = assets.get(backgroundAssetId);
  const backgroundReady = background?.status === 'ready';
  const includeCleanBase = renderMode !== 'transparent-foreground';
  const captionStyle = project.settings.captionStyle || {};
  const captionFontFamily = typeof captionStyle.fontFamily === 'string' && captionStyle.fontFamily.trim()
    ? captionStyle.fontFamily
    : 'Microsoft YaHei, Segoe UI, sans-serif';
  const captionFontSize = finiteNumber(captionStyle.fontSize, Math.max(28, width * 0.028), 18, 220);
  const captionColor = typeof captionStyle.color === 'string' ? captionStyle.color : '#FFFFFF';
  const captionStrokeColor = typeof captionStyle.strokeColor === 'string' ? captionStyle.strokeColor : '#111111';
  const captionStrokeWidth = finiteNumber(captionStyle.strokeWidth, Math.max(1.5, width * 0.0015), 0, 16);
  const captionBackgroundEnabled = captionStyle.backgroundEnabled === true;
  const captionBackgroundColor = typeof captionStyle.backgroundColor === 'string' ? captionStyle.backgroundColor : '#000000';
  const captionBackgroundOpacity = finiteNumber(captionStyle.backgroundOpacity, 0.68, 0, 1);
  const captionBackgroundRadius = finiteNumber(captionStyle.backgroundRadius, 14, 0, 100);
  const captionPositionExplicit = typeof captionStyle.verticalPosition === 'number' && Number.isFinite(captionStyle.verticalPosition);
  const captionVerticalPosition = getCaptionVerticalPosition(project);
  const componentStyleMode = resolveComponentStyleMode(project);
  const EditableElementBridge = componentStyleMode === 'legacy'
    ? LegacyEditableElementBridge
    : AtomicEditableElementBridge;
  return (
    <AbsoluteFill style={{backgroundColor: includeCleanBase ? '#080b11' : 'transparent', overflow: 'hidden'}}>
      {includeCleanBase && backgroundReady ? (
        <OffthreadVideo
          src={assetUrl(assetBaseUrl, background)}
          volume={project.settings.audio.narrationGain}
          style={{width: '100%', height: '100%', objectFit: 'cover'}}
        />
      ) : includeCleanBase ? (
        <AbsoluteFill
          style={{
            background: 'radial-gradient(circle at 50% 42%, #243044 0, #111722 48%, #07090d 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,.34)',
            fontFamily: 'Microsoft YaHei, Segoe UI, sans-serif',
            fontSize: Math.max(26, width * 0.024),
            letterSpacing: 2,
          }}
        >
          干净底片占位 · {width}×{height} · {(durationMs / 1000).toFixed(1)}秒
        </AbsoluteFill>
      ) : null}

      {project.timeline.h3Events.filter((event) => event.enabled !== false).map((event) => {
        const asset = assets.get(event.assetId);
        if (!asset || asset.status !== 'ready') return null;
        return (
          <Sequence key={event.id} from={frame(event.startMs)} durationInFrames={duration(event.startMs, event.endMs)} premountFor={Math.round(fps / 2)}>
            <H3Retime event={event} src={assetUrl(assetBaseUrl, asset)} fps={fps} masterGain={project.settings.audio.h3MasterGain} />
          </Sequence>
        );
      })}

      {project.timeline.foregroundEvents.filter((event) => event.enabled !== false).map((event) => {
         const eventDuration = duration(event.startMs, event.endMs);
         const isSectionTitle = (event.semanticLayer === 'title' || event.componentId === 'SectionTitle') && componentStyleMode !== 'legacy';
         const translation = isSectionTitle ? {x: 0, y: 0} : getEventTranslation(event, width, height);
         const visualScale = isSectionTitle ? 1 : getEventScale(event, width, height);
         const transformOrigin = isSectionTitle ? {x: 0, y: 0} : getEventTransformOrigin(event, width, height);
         const eventAccent = typeof event.style?.accentColor === 'string' ? event.style.accentColor : '';
         const eventAccentRgb = eventAccent ? accentRgb(eventAccent) : '';
         return (
          <Sequence key={event.id} from={frame(event.startMs)} durationInFrames={eventDuration} premountFor={Math.round(fps / 3)}>
            <AbsoluteFill
              style={{
                 pointerEvents: 'none',
                 translate: `${translation.x}px ${translation.y}px`,
                 scale: visualScale,
                 transformOrigin: `${transformOrigin.x}px ${transformOrigin.y}px`,
                 ...(eventAccent ? {
                   '--component-accent': eventAccent,
                   '--component-accent-rgb': eventAccentRgb,
                 } as React.CSSProperties : {}),
               }}
            >
              <ForegroundEventBoundary eventId={event.id}>
                <div data-foreground-event-id={event.id} style={{position: 'absolute', inset: 0}}>
                  {isEditorialTrial(event) || isGraphicScene(event) ? <ForegroundEventRenderer event={event} durationInFrames={eventDuration} fps={fps} assets={project.assets} assetBaseUrl={assetBaseUrl} componentStyleMode={componentStyleMode} /> : <EditableElementBridge
                    componentId={event.componentId}
                    connectorComponentId={getAtomicConnectorComponentId(event)}
                    overrides={event.elementOverrides}
                    accentColor={eventAccent || '#FFB84A'}
                  >
                    <ForegroundEventRenderer event={event} durationInFrames={eventDuration} fps={fps} assets={project.assets} assetBaseUrl={assetBaseUrl} componentStyleMode={componentStyleMode} />
                  </EditableElementBridge>}
                </div>
              </ForegroundEventBoundary>
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {project.settings.captionStyle?.hidden === true ? null : project.timeline.captionCues.map((cue) => (
        <Sequence key={cue.id} from={frame(cue.startMs)} durationInFrames={duration(cue.startMs, cue.endMs)}>
          <div
            data-caption-position="true"
            data-caption-cue-id={cue.id}
            style={{
              position: 'absolute',
              left: width * 0.1,
              right: width * 0.1,
              top: captionPositionExplicit ? height * captionVerticalPosition : height * (1 - project.settings.safeArea.bottom - 0.07),
              // Translate by the same fraction of the caption's own height so
              // both endpoints stay inside the canvas, including multiline text.
              transform: captionPositionExplicit ? `translateY(-${captionVerticalPosition * 100}%)` : undefined,
              display: 'flex',
              justifyContent: 'center',
              textAlign: 'center',
              zIndex: 110,
            }}
          >
            <span
              data-caption-surface="true"
              style={{
                display: 'inline-block',
                maxWidth: '100%',
                boxSizing: 'border-box',
                padding: captionBackgroundEnabled
                  ? `${Math.max(7, captionFontSize * 0.16)}px ${Math.max(14, captionFontSize * 0.34)}px`
                  : 0,
                color: captionColor,
                backgroundColor: captionBackgroundEnabled
                  ? colorWithOpacity(captionBackgroundColor, captionBackgroundOpacity)
                  : 'transparent',
                borderRadius: captionBackgroundEnabled ? captionBackgroundRadius : 0,
                fontFamily: captionFontFamily,
                fontSize: captionFontSize,
                fontWeight: 820,
                lineHeight: 1.22,
                WebkitTextStroke: `${captionStrokeWidth}px ${captionStrokeColor}`,
                paintOrder: 'stroke fill',
                textShadow: '0 4px 12px rgba(0,0,0,.7)',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
              }}
            >
              {cue.text}
            </span>
          </div>
        </Sequence>
      ))}

      {project.timeline.sfxCues.filter((cue) => cue.enabled !== false).map((cue) => {
        const asset = assets.get(cue.assetId);
        if (!asset || asset.status !== 'ready') return null;
        return (
          <Sequence key={cue.id} from={frame(cue.atMs)} durationInFrames={frame(cue.durationMs || 1800)}>
            <Audio src={assetUrl(assetBaseUrl, asset)} volume={Math.min(1, cue.volume * project.settings.audio.sfxMasterGain)} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
