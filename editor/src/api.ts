import type {EditProject, LoadedProject, ProjectSummary} from './types';

export type RenderJob = {
  id: string;
  projectId: string;
  mode: 'composite' | 'transparent-foreground';
  status: 'queued' | 'rendering' | 'completed' | 'error';
  progress: number;
  message: string;
  outputUrl: string;
  outputPath: string;
  startedAt: string;
  finishedAt: string | null;
};

const readJson = async <T,>(response: Response): Promise<T> => {
  if (!response.ok) throw new Error(`请求失败：${response.status}`);
  return (await response.json()) as T;
};

export const listProjects = async (): Promise<ProjectSummary[]> =>
  readJson<ProjectSummary[]>(await fetch('/api/projects'));

export const loadProject = async (id: string): Promise<LoadedProject> =>
  readJson<LoadedProject>(await fetch(`/api/projects/${encodeURIComponent(id)}`));

export const importProject = async (manifest: EditProject): Promise<{ok: true; id: string}> =>
  readJson<{ok: true; id: string}>(
    await fetch('/api/projects/import', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({manifest}),
    }),
  );

export const saveProject = async (id: string, manifest: EditProject): Promise<{ok: true; savedAt: string}> =>
  readJson<{ok: true; savedAt: string}>(
    await fetch(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(manifest),
    }),
  );

export const uploadAsset = async (
  projectId: string,
  assetId: string,
  file: File,
): Promise<{ok: true; path: string; filename: string}> =>
  readJson<{ok: true; path: string; filename: string}>(
    await fetch(`/api/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}`, {
      method: 'POST',
      headers: {'content-type': file.type || 'application/octet-stream', 'x-filename': encodeURIComponent(file.name), 'x-filename-encoding': 'percent-utf8'},
      body: file,
    }),
  );

export const startRender = async (
  projectId: string,
  mode: 'composite' | 'transparent-foreground' = 'composite',
): Promise<RenderJob> =>
  readJson<RenderJob>(
    await fetch(`/api/projects/${encodeURIComponent(projectId)}/render`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({mode}),
    }),
  );

export const getRenderJob = async (jobId: string): Promise<RenderJob> =>
  readJson<RenderJob>(await fetch(`/api/render-jobs/${encodeURIComponent(jobId)}`));

// Apply to the latest draft after the upload, preserving edits made while it ran.
export const applyAssetUpload = (
  project: EditProject,
  projectId: string,
  assetId: string,
  result: {path: string; filename: string},
): EditProject => {
  if (project.project.id !== projectId) return project;
  const previous = project.assets.find((asset) => asset.id === assetId);
  if (!previous) return project;
  const assets = project.assets.map((asset) => asset.id === assetId
    ? {...asset, path: result.path, label: result.filename, status: 'ready' as const}
    : asset);
  const readyIds = new Set(assets.filter((asset) => asset.status === 'ready').map((asset) => asset.id));
  return {
    ...project,
    assets,
    timeline: {
      ...project.timeline,
      foregroundEvents: project.timeline.foregroundEvents.map((event) => {
        // Only complete a missing-material placeholder. Replacing ready media must
        // preserve deliberate event disabling, timing, layout, and user styling.
        const completedPlaceholder = previous.status === 'placeholder'
          && Boolean(event.payload.placeholderInstructions)
          && event.assetIds?.includes(assetId)
          && event.assetIds.every((id) => readyIds.has(id));
        return completedPlaceholder && event.enabled === false ? {...event, enabled: true} : event;
      }),
    },
  };
};
