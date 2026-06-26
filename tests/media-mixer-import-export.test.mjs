import assert from 'node:assert/strict';

import {
  MIXER_PROJECT_SCHEMA,
  MIXER_REAPPLY_CHOICES,
  applyRelinkChoice,
  createProjectFromAssetMetadata,
  exportProjectSettings,
  exportProjectSettingsJson,
  hashFileIdentity,
  importProjectSettings,
  partialByteRanges,
} from '../docs/types/media/mixer/index.js';

{
  const project = createProjectFromAssetMetadata({
    id: 'asset-audio',
    name: 'sample.wav',
    mime: 'audio/wav',
    size: 1234,
    lastModified: 1710000000000,
    hash: { algorithm: 'sha256-full-v1', value: 'abc', byteRanges: [{ start: 0, end: 1234 }] },
    capabilities: { hasAudio: true },
    media: { durationMs: 2000, audioSampleRate: 44100, audioChannels: 2 },
    fileObject: { shouldNotExport: true },
    objectUrl: 'blob:local',
    mediaBytes: new Uint8Array([1, 2, 3]),
  });
  project.elements[0].analysis = {
    waveformSummary: { peak: new Float32Array([0.1, 0.2]), buckets: 2 },
    decodedBuffer: { shouldNotExport: true },
    retainedNote: 'manual-marker',
  };
  const settings = exportProjectSettings(project);
  assert.equal(settings.schema, MIXER_PROJECT_SCHEMA, 'export: writes mixer schema');
  assert.equal(settings.assets[0].hash.value, 'abc', 'export: keeps identity hash');
  assert.equal(settings.assets[0].fileObject, undefined, 'export: omits runtime file references');
  assert.equal(settings.assets[0].objectUrl, undefined, 'export: omits object URLs');
  assert.equal(settings.assets[0].mediaBytes, undefined, 'export: omits embedded media bytes');
  assert.equal(settings.elements[0].analysis.waveformSummary, undefined, 'export: omits runtime waveform summaries');
  assert.equal(settings.elements[0].analysis.decodedBuffer, undefined, 'export: omits decoded audio buffers');
  assert.equal(settings.elements[0].analysis.retainedNote, 'manual-marker', 'export: keeps non-runtime analysis notes');

  const json = exportProjectSettingsJson(project);
  assert.equal(/waveformSummary|decodedBuffer/.test(json), false, 'export: runtime analysis not serialized to JSON');
  const imported = importProjectSettings(json);
  assert.equal(imported.project.assets[0].status, 'missing', 'import: asset is missing until relinked');
  assert.equal(imported.needsRelink, true, 'import: reports missing media');
}

{
  const project = createProjectFromAssetMetadata({
    id: 'asset-audio',
    name: 'renamed.wav',
    mime: 'audio/wav',
    size: 1234,
    lastModified: 1710000000000,
    hash: { algorithm: 'sha256-full-v1', value: 'same-hash' },
    capabilities: { hasAudio: true },
    media: { durationMs: 2000 },
  });
  const json = exportProjectSettingsJson(project);
  const imported = importProjectSettings(json, [{
    id: 'local-file',
    name: 'different-name.wav',
    mime: 'audio/wav',
    size: 1234,
    lastModified: 1710000000001,
    hash: { algorithm: 'sha256-full-v1', value: 'same-hash' },
    capabilities: { hasAudio: true },
    media: { durationMs: 2000 },
  }]);
  assert.equal(imported.relink.matches.length, 1, 'relink: hash match relinks renamed file');
  assert.equal(imported.needsRelink, false, 'relink: no missing files when hash matches');

  const ask = applyRelinkChoice(imported.project, imported.relink, MIXER_REAPPLY_CHOICES.ASK_PER_ELEMENT);
  assert.equal(ask.pendingReview.length, 1, 'reapply: ask per element creates review items');
  assert.equal(ask.applied.length, 0, 'reapply: ask per element does not auto-apply');

  const unchanged = applyRelinkChoice(imported.project, imported.relink, MIXER_REAPPLY_CHOICES.DO_NOT_CHANGE_MEDIA);
  assert.equal(unchanged.applied.length, 0, 'reapply: do not change leaves media objects untouched');

  const applied = applyRelinkChoice(imported.project, imported.relink, MIXER_REAPPLY_CHOICES.APPLY_ALL);
  assert.equal(applied.applied.length, 1, 'reapply: apply all records applied relink');
  assert.equal(applied.project.assets[0].name, 'different-name.wav', 'reapply: apply all binds local media identity');
}

{
  assert.deepEqual(
    partialByteRanges(10, 4),
    [{ start: 0, end: 10 }],
    'hash: small files use one range',
  );
  assert.deepEqual(
    partialByteRanges(100, 10),
    [{ start: 0, end: 10 }, { start: 45, end: 55 }, { start: 90, end: 100 }],
    'hash: large files use first/middle/last windows',
  );
}

{
  const small = new File([new Uint8Array([1, 2, 3, 4])], 'small.bin', { lastModified: 10 });
  const identity = await hashFileIdentity(small, { fullHashMaxBytes: 10 });
  assert.equal(identity.algorithm, 'sha256-full-v1', 'hash: small files use full hash');
  assert.equal(identity.byteRanges[0].end, 4, 'hash: full hash records full byte range');

  const large = new File([new Uint8Array(100).fill(7)], 'large.bin', { lastModified: 20 });
  const partial = await hashFileIdentity(large, { fullHashMaxBytes: 10, windowBytes: 8 });
  assert.equal(partial.algorithm, 'sha256-partial-v1', 'hash: large files use partial hash');
  assert.equal(partial.byteRanges.length, 3, 'hash: partial hash records three windows');
}

assert.throws(
  () => importProjectSettings({ schema: 'wrong', version: 1, assets: [], lanes: [], elements: [] }),
  /Unsupported project schema/,
  'import: validates schema',
);
