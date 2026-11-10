const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const editor = process.argv[2] || '.';
const built = require(path.join(editor, 'node_modules/esbuild')).buildSync({
  entryPoints: [path.join(editor, 'src/api.ts')], bundle: true,
  platform: 'node', format: 'cjs', write: false, logLevel: 'silent',
});
const compiled = new Module('asset-replacement-regression');
compiled._compile(built.outputFiles[0].text, 'asset-replacement-regression.cjs');
const {applyAssetUpload} = compiled.exports;
const event = (id, ids, placeholder = true) => ({id, enabled: false, assetIds: ids,
  startMs: 4840, endMs: 12100, placement: {x: .2}, style: {accentColor: '#24E5EE'},
  payload: placeholder ? {placeholderInstructions: '整组调整'} : {headline: 'Keep hidden'},
});
const project = {project: {id: 'fixture'}, settings: {volume: 1.8}, assets: [
  {id: 'demo', status: 'placeholder', path: 'pending.mp4'},
  {id: 'other', status: 'placeholder', path: 'other.mp4'},
  {id: 'ready', status: 'ready', path: 'ready.mp4'},
], timeline: {captions: [{text: 'unchanged'}], foregroundEvents: [
  event('demo-event', ['demo']), event('pending-event', ['other']),
  event('multi-event', ['demo', 'other']), event('manual-disabled', ['demo'], false),
  event('ready-disabled', ['ready']),
]}};
const snapshot = JSON.stringify(project);
const upload = {path: 'media/整组调整.mp4', filename: '整组调整.mp4'};
const result = applyAssetUpload(project, 'fixture', 'demo', upload);
assert.equal(result.assets[0].status, 'ready');
assert.equal(result.assets[0].path, upload.path);
assert.equal(result.timeline.foregroundEvents[0].enabled, true);
assert.deepEqual(result.timeline.foregroundEvents[0], {...project.timeline.foregroundEvents[0], enabled: true});
for (const i of [1, 2, 3, 4]) assert.equal(result.timeline.foregroundEvents[i], project.timeline.foregroundEvents[i]);
assert.equal(result.timeline.captions, project.timeline.captions);
assert.equal(result.settings, project.settings);
assert.equal(JSON.stringify(project), snapshot);
const complete = applyAssetUpload(result, 'fixture', 'other', upload);
assert.equal(complete.timeline.foregroundEvents[2].enabled, true);
const ordinary = applyAssetUpload(project, 'fixture', 'ready', upload);
assert.equal(ordinary.timeline.foregroundEvents[4].enabled, false);
assert.equal(applyAssetUpload(project, 'different-project', 'demo', upload), project);
assert.equal(applyAssetUpload(project, 'fixture', 'removed-asset', upload), project);
const latest = structuredClone(project);
latest.timeline.foregroundEvents[0].startMs = 6000;
latest.timeline.foregroundEvents[0].style.accentColor = '#FF4D55';
const latestResult = applyAssetUpload(latest, 'fixture', 'demo', upload);
assert.equal(latestResult.timeline.foregroundEvents[0].startMs, 6000);
assert.equal(latestResult.timeline.foregroundEvents[0].style.accentColor, '#FF4D55');
const reopened = JSON.parse(JSON.stringify(result));
assert.equal(reopened.timeline.foregroundEvents[0].enabled, true);
assert.equal(applyAssetUpload(reopened, 'fixture', 'demo', upload).timeline.foregroundEvents[0].enabled, true);
console.log('PASS: placeholder activation, multi-asset readiness, manual disabling preserved, current edits retained, project switch guarded, save/reopen retained.');
