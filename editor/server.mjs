import {createReadStream, createWriteStream, existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {copyFile, mkdir, readdir, readFile, rename, stat, unlink, writeFile} from 'node:fs/promises';
import {createServer as createHttpServer} from 'node:http';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import {fileURLToPath} from 'node:url';
import {createServer as createViteServer} from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));
const projectsRoot = path.join(root, 'projects');
const examplesRoot = path.join(root, 'examples');
const port = Number(process.env.EDIT_DESK_PORT || 4312);
const renderJobs = new Map();

const contentTypes = new Map([
  ['.mp4', 'video/mp4'],
  ['.mov', 'video/quicktime'],
  ['.webm', 'video/webm'],
  ['.mp3', 'audio/mpeg'],
  ['.wav', 'audio/wav'],
  ['.m4a', 'audio/mp4'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
  ['.json', 'application/json; charset=utf-8'],
]);

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {'content-type': 'application/json; charset=utf-8'});
  res.end(JSON.stringify(payload));
};

const readJsonBody = async (req) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16 * 1024 * 1024) throw new Error('request-body-too-large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const isInside = (parent, child) => {
  const relative = path.relative(parent, child);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
};

const discoverProjects = async () => {
  const roots = [projectsRoot, examplesRoot];
  const projects = [];
  for (const base of roots) {
    if (!existsSync(base)) continue;
    const entries = await readdir(base, {withFileTypes: true});
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const projectRoot = path.join(base, entry.name);
      const manifestPath = path.join(projectRoot, 'edit-project.json');
      if (!existsSync(manifestPath)) continue;
      try {
        const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
        projects.push({
          id: manifest.project?.id || entry.name,
          name: manifest.project?.name || entry.name,
          width: manifest.composition?.width,
          height: manifest.composition?.height,
          durationMs: manifest.composition?.durationMs,
          source: base === examplesRoot ? 'example' : 'project',
          projectRoot,
          manifestPath,
        });
      } catch {
        projects.push({id: entry.name, name: entry.name, source: 'invalid', projectRoot, manifestPath});
      }
    }
  }
  return projects;
};

const findProject = async (id) => {
  const projects = await discoverProjects();
  return projects.find((project) => project.id === id);
};

const publicRenderJob = (job) => ({
  id: job.id,
  projectId: job.projectId,
  mode: job.mode,
  status: job.status,
  progress: job.progress,
  message: job.message,
  outputUrl: job.outputUrl,
  outputPath: job.outputPath,
  startedAt: job.startedAt,
  finishedAt: job.finishedAt,
});

const startRenderJob = async (project, mode = 'composite') => {
  const manifest = JSON.parse(await readFile(project.manifestPath, 'utf8'));
  const renderRoot = path.join(project.projectRoot, '.render');
  const outputRoot = path.join(project.projectRoot, 'output');
  await mkdir(renderRoot, {recursive: true});
  await mkdir(outputRoot, {recursive: true});
  const id = randomUUID();
  const transparentForeground = mode === 'transparent-foreground';
  const codec = transparentForeground ? 'prores' : ['h264', 'h265', 'prores'].includes(manifest.composition?.render?.codec)
    ? manifest.composition.render.codec
    : 'h264';
  const extension = codec === 'prores' ? '.mov' : '.mp4';
  const preferredName = manifest.composition?.render?.outputName || manifest.project?.name || manifest.project?.id || '成片';
  const baseName = path.basename(preferredName, path.extname(preferredName)).replace(/[^\p{L}\p{N}._-]+/gu, '-').slice(0, 90) || '成片';
  const stamp = new Date().toISOString().replaceAll(':', '-').replace('T', '-').replace('Z', '');
  const outputName = `${baseName}${transparentForeground ? '-透明前景' : ''}-${stamp}${extension}`;
  const outputPath = path.join(outputRoot, outputName);
  const propsPath = path.join(renderRoot, `${id}-props.json`);
  const remotionOutputPath = transparentForeground
    ? path.join(renderRoot, `${id}-straight-alpha.mov`)
    : outputPath;
  const assetBaseUrl = `http://127.0.0.1:${port}/project-assets/${encodeURIComponent(project.id)}/`;
  await writeFile(propsPath, `${JSON.stringify({project: manifest, assetBaseUrl, renderMode: mode}, null, 2)}\n`, 'utf8');
  const crf = Number.isFinite(Number(manifest.composition?.render?.crf))
    ? Math.min(51, Math.max(0, Number(manifest.composition.render.crf)))
    : 18;
  const cliPath = path.join(root, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');
  const args = [
    cliPath,
    'render',
    path.join(root, 'src', 'remotion-entry.tsx'),
    'EditDeskVideo',
    remotionOutputPath,
    `--props=${propsPath}`,
    `--codec=${codec}`,
    '--log=verbose',
  ];
  if (transparentForeground) {
    args.push('--image-format=png', '--pixel-format=yuva444p10le', '--prores-profile=4444');
  } else if (codec !== 'prores') {
    args.push(`--crf=${crf}`);
  }
  const job = {
    id,
    projectId: project.id,
    mode,
    status: 'queued',
    progress: 0,
    message: '等待 Remotion 启动',
    outputUrl: '',
    outputPath,
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };
  renderJobs.set(id, job);
  const child = spawn(process.execPath, args, {cwd: root, windowsHide: true});
  job.status = 'rendering';
  const consume = (chunk) => {
    const clean = String(chunk).replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '').trim();
    if (!clean) return;
    const rendered = /Rendered\s+(\d+)\/(\d+)/i.exec(clean);
    const encoded = /Encoded\s+(\d+)\/(\d+)/i.exec(clean);
    const bundling = /Bundling\s+(\d+(?:\.\d+)?)%/i.exec(clean);
    if (rendered) {
      job.progress = Math.min(0.94, 0.06 + (Number(rendered[1]) / Math.max(1, Number(rendered[2]))) * 0.88);
    } else if (encoded) {
      job.progress = Math.min(0.99, 0.94 + (Number(encoded[1]) / Math.max(1, Number(encoded[2]))) * 0.05);
    } else if (bundling) {
      job.progress = Math.min(0.06, (Number(bundling[1]) / 100) * 0.06);
    }
    job.message = clean.slice(-260);
  };
  child.stdout.on('data', consume);
  child.stderr.on('data', consume);
  child.on('error', (error) => {
    job.status = 'error';
    job.message = String(error);
    job.finishedAt = new Date().toISOString();
  });
  const finishSuccessfully = () => {
    job.finishedAt = new Date().toISOString();
    if (existsSync(outputPath)) {
      job.status = 'completed';
      job.progress = 1;
      job.message = '渲染完成';
      job.outputUrl = `/project-assets/${encodeURIComponent(project.id)}/output/${encodeURIComponent(outputName)}`;
    } else {
      job.status = 'error';
      job.message = '渲染完成但找不到输出文件';
    }
  };
  const premultiplyForJianying = () => {
    const totalFrames = Math.max(1, Math.ceil((Number(manifest.composition?.durationMs) / 1000) * Number(manifest.composition?.fps)));
    job.progress = 0.94;
    job.message = '正在适配剪映的阴影与发光透明度';
    const alphaArgs = [
      '-y',
      '-i', remotionOutputPath,
      '-map', '0:v:0',
      '-map', '0:a?',
      '-vf', 'format=gbrap,premultiply=inplace=1,format=yuva444p10le',
      '-c:v', 'prores_ks',
      '-profile:v', '4',
      '-alpha_bits', '16',
      '-c:a', 'copy',
      '-progress', 'pipe:1',
      '-nostats',
      outputPath,
    ];
    let alphaError = '';
    const alphaProcess = spawn('ffmpeg', alphaArgs, {cwd: root, windowsHide: true});
    alphaProcess.stdout.on('data', (chunk) => {
      const value = String(chunk);
      const frames = [...value.matchAll(/frame=(\d+)/g)];
      const currentFrame = Number(frames.at(-1)?.[1]);
      if (Number.isFinite(currentFrame)) {
        job.progress = Math.min(0.99, 0.94 + (currentFrame / totalFrames) * 0.05);
        job.message = `正在适配剪映的阴影与发光透明度 · ${Math.min(currentFrame, totalFrames)}/${totalFrames}`;
      }
    });
    alphaProcess.stderr.on('data', (chunk) => {
      alphaError = `${alphaError}${String(chunk)}`.slice(-1200);
    });
    alphaProcess.on('error', (error) => {
      job.status = 'error';
      job.message = `剪映 Alpha 兼容处理启动失败：${String(error)}`;
      job.finishedAt = new Date().toISOString();
    });
    alphaProcess.on('close', (alphaCode) => {
      void unlink(remotionOutputPath).catch(() => undefined);
      if (alphaCode === 0 && existsSync(outputPath)) {
        finishSuccessfully();
      } else {
        job.status = 'error';
        job.message = `剪映 Alpha 兼容处理失败（退出码 ${alphaCode}）：${alphaError.slice(-420)}`;
        job.finishedAt = new Date().toISOString();
      }
    });
  };
  child.on('close', (code) => {
    if (code === 0 && existsSync(remotionOutputPath)) {
      if (transparentForeground) premultiplyForJianying();
      else finishSuccessfully();
    } else {
      job.finishedAt = new Date().toISOString();
      job.status = 'error';
      job.message = `${job.message || 'Remotion 渲染失败'}（退出码 ${code}）`;
    }
  });
  return job;
};

const serveFile = async (req, res, filePath) => {
  const info = await stat(filePath);
  const contentType = contentTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream';
  const range = req.headers.range;
  if (!range) {
    res.writeHead(200, {
      'content-type': contentType,
      'content-length': info.size,
      'accept-ranges': 'bytes',
      'cache-control': 'no-cache',
    });
    createReadStream(filePath).pipe(res);
    return;
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) {
    res.writeHead(416, {'content-range': `bytes */${info.size}`});
    res.end();
    return;
  }
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
  if (start > end || start >= info.size) {
    res.writeHead(416, {'content-range': `bytes */${info.size}`});
    res.end();
    return;
  }
  res.writeHead(206, {
    'content-type': contentType,
    'content-length': end - start + 1,
    'content-range': `bytes ${start}-${end}/${info.size}`,
    'accept-ranges': 'bytes',
    'cache-control': 'no-cache',
  });
  createReadStream(filePath, {start, end}).pipe(res);
};

const vite = await createViteServer({
  root,
  server: {middlewareMode: true},
  appType: 'spa',
});

const server = createHttpServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || `127.0.0.1:${port}`}`);
    if (req.method === 'GET' && url.pathname === '/api/projects') {
      const projects = await discoverProjects();
      sendJson(res, 200, projects.map(({projectRoot, manifestPath, ...project}) => project));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/projects/import') {
      const body = await readJsonBody(req);
      const manifest = body?.manifest;
      if (!manifest?.project?.id || !manifest?.composition || !manifest?.timeline || !Array.isArray(manifest?.assets)) {
        sendJson(res, 400, {error: 'invalid-edit-project'});
        return;
      }
      await mkdir(projectsRoot, {recursive: true});
      const baseId = String(manifest.project.id).replace(/[^\p{L}\p{N}._-]+/gu, '-').slice(0, 80) || 'project';
      let projectId = baseId;
      if ((await findProject(projectId)) || existsSync(path.join(projectsRoot, projectId))) projectId = `${baseId}-${Date.now()}`;
      const projectRoot = path.join(projectsRoot, projectId);
      await mkdir(projectRoot, {recursive: false});
      manifest.project.id = projectId;
      await writeFile(path.join(projectRoot, 'edit-project.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
      sendJson(res, 201, {ok: true, id: projectId});
      return;
    }
    const projectMatch = /^\/api\/projects\/([^/]+)$/.exec(url.pathname);
    if (req.method === 'GET' && projectMatch) {
      const id = decodeURIComponent(projectMatch[1]);
      const project = await findProject(id);
      if (!project) {
        sendJson(res, 404, {error: 'project-not-found'});
        return;
      }
      const manifest = JSON.parse(await readFile(project.manifestPath, 'utf8'));
      sendJson(res, 200, {
        manifest,
        assetBaseUrl: `/project-assets/${encodeURIComponent(id)}/`,
      });
      return;
    }
    if (req.method === 'POST' && projectMatch) {
      const id = decodeURIComponent(projectMatch[1]);
      const project = await findProject(id);
      if (!project) {
        sendJson(res, 404, {error: 'project-not-found'});
        return;
      }
      if (project.source !== 'project') {
        sendJson(res, 403, {error: 'example-is-read-only'});
        return;
      }
      const manifest = await readJsonBody(req);
      if (manifest?.project?.id !== id) {
        sendJson(res, 400, {error: 'project-id-mismatch'});
        return;
      }
      const autosaveRoot = path.join(project.projectRoot, 'autosave');
      await mkdir(autosaveRoot, {recursive: true});
      const stamp = new Date().toISOString().replaceAll(':', '-');
      await copyFile(project.manifestPath, path.join(autosaveRoot, `edit-project-${stamp}.json`));
      await writeFile(project.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
      sendJson(res, 200, {ok: true, savedAt: new Date().toISOString()});
      return;
    }
    const renderMatch = /^\/api\/projects\/([^/]+)\/render$/.exec(url.pathname);
    if (req.method === 'POST' && renderMatch) {
      const id = decodeURIComponent(renderMatch[1]);
      const project = await findProject(id);
      if (!project) {
        sendJson(res, 404, {error: 'project-not-found'});
        return;
      }
      if (project.source !== 'project') {
        sendJson(res, 403, {error: 'example-is-read-only'});
        return;
      }
      let mode = 'composite';
      try {
        const body = await readJsonBody(req);
        mode = body?.mode === 'transparent-foreground' ? 'transparent-foreground' : 'composite';
      } catch {
        mode = 'composite';
      }
      const activeJob = [...renderJobs.values()].find((job) => job.projectId === id && ['queued', 'rendering'].includes(job.status));
      if (activeJob) {
        sendJson(res, 409, {error: 'render-already-running', job: publicRenderJob(activeJob)});
        return;
      }
      const job = await startRenderJob(project, mode);
      sendJson(res, 202, publicRenderJob(job));
      return;
    }
    const renderJobMatch = /^\/api\/render-jobs\/([^/]+)$/.exec(url.pathname);
    if (req.method === 'GET' && renderJobMatch) {
      const job = renderJobs.get(decodeURIComponent(renderJobMatch[1]));
      if (!job) {
        sendJson(res, 404, {error: 'render-job-not-found'});
        return;
      }
      sendJson(res, 200, publicRenderJob(job));
      return;
    }
    const assetUploadMatch = /^\/api\/projects\/([^/]+)\/assets\/([^/]+)$/.exec(url.pathname);
    if (req.method === 'POST' && assetUploadMatch) {
      const id = decodeURIComponent(assetUploadMatch[1]);
      const assetId = decodeURIComponent(assetUploadMatch[2]);
      const project = await findProject(id);
      if (!project) {
        sendJson(res, 404, {error: 'project-not-found'});
        return;
      }
      if (project.source !== 'project') {
        sendJson(res, 403, {error: 'example-is-read-only'});
        return;
      }
      const manifest = JSON.parse(await readFile(project.manifestPath, 'utf8'));
      if (!manifest.assets?.some((asset) => asset.id === assetId)) {
        sendJson(res, 404, {error: 'asset-not-found'});
        return;
      }
      let rawName = String(req.headers['x-filename'] || 'asset.bin');
      // Browser header values are ByteStrings. Decode the explicitly tagged
      // UTF-8 name once; legacy ASCII names (including literal %) stay intact.
      if (req.headers['x-filename-encoding'] === 'percent-utf8') {
        try {
          rawName = decodeURIComponent(rawName);
        } catch {
          sendJson(res, 400, {error: 'invalid-filename-encoding'});
          return;
        }
      }
      const safeName = path.basename(rawName).replace(/[^\p{L}\p{N}._-]+/gu, '-').slice(-120) || 'asset.bin';
      const importedRoot = path.join(project.projectRoot, 'media', 'imported');
      await mkdir(importedRoot, {recursive: true});
      const outputName = `${assetId}-${Date.now()}-${safeName}`;
      const finalPath = path.join(importedRoot, outputName);
      const temporaryPath = `${finalPath}.part`;
      await pipeline(req, createWriteStream(temporaryPath));
      await rename(temporaryPath, finalPath);
      sendJson(res, 200, {
        ok: true,
        path: path.relative(project.projectRoot, finalPath).split(path.sep).join('/'),
        filename: safeName,
      });
      return;
    }
    const assetMatch = /^\/project-assets\/([^/]+)\/(.+)$/.exec(url.pathname);
    if (req.method === 'GET' && assetMatch) {
      const id = decodeURIComponent(assetMatch[1]);
      const project = await findProject(id);
      if (!project) {
        res.writeHead(404).end();
        return;
      }
      const relativePath = decodeURIComponent(assetMatch[2]).replaceAll('/', path.sep);
      const filePath = path.resolve(project.projectRoot, relativePath);
      if (!isInside(project.projectRoot, filePath) || !existsSync(filePath)) {
        res.writeHead(404).end();
        return;
      }
      await serveFile(req, res, filePath);
      return;
    }
    vite.middlewares(req, res, () => {
      res.writeHead(404).end();
    });
  } catch (error) {
    console.error(error);
    if (!res.headersSent) sendJson(res, 500, {error: String(error)});
    else res.end();
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`AI口播编辑台已启动：http://127.0.0.1:${port}`);
  console.log(`项目目录：${projectsRoot}`);
});
