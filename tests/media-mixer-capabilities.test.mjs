import assert from 'node:assert/strict';

import {
  CAPABILITY_STATUS,
  createProjectFromAssetMetadata,
  evaluateMixerCapabilities,
  summarizeReducedCapabilities,
} from '../docs/types/media/mixer/index.js';

{
  const project = createProjectFromAssetMetadata({
    id: 'asset-audio',
    name: 'sample.mp3',
    capabilities: { hasAudio: true },
    media: { durationMs: 1000 },
  });
  const evaluation = evaluateMixerCapabilities({ webAudio: true, nativeAudioDecode: true }, project);
  assert.equal(evaluation.actions.projectSettings.status, CAPABILITY_STATUS.AVAILABLE, 'capabilities: project settings are always available');
  assert.equal(evaluation.actions.audioPreview.status, CAPABILITY_STATUS.AVAILABLE, 'capabilities: audio preview is available with WebAudio/decode');
  assert.equal(evaluation.actions.waveformAnalysis.status, CAPABILITY_STATUS.AVAILABLE, 'capabilities: waveform is available within caps');
}

{
  const project = createProjectFromAssetMetadata({
    id: 'asset-video',
    name: 'sample.avi',
    capabilities: {
      hasAudio: true,
      hasVideo: true,
      nativePreview: false,
      needsFfmpegForPreview: true,
      needsFfmpegForExport: true,
    },
    media: { durationMs: 1000 },
  });
  const disabled = evaluateMixerCapabilities({ ffmpegEnabled: false, ffmpegLoaded: false }, project);
  assert.equal(disabled.actions.finalVideoExport.status, CAPABILITY_STATUS.OPT_IN, 'capabilities: disabled ffmpeg is opt-in for video export');
  assert.match(disabled.actions.finalVideoExport.message, /Enable Media Transcoding/, 'capabilities: opt-in note explains what unlocks');
  assert.equal(disabled.actions.ffmpegConversion.status, CAPABILITY_STATUS.OPT_IN, 'capabilities: conversion is visible as opt-in');

  const enabled = evaluateMixerCapabilities({ ffmpegEnabled: true, ffmpegLoaded: true }, project);
  assert.equal(enabled.actions.finalVideoExport.status, CAPABILITY_STATUS.AVAILABLE, 'capabilities: loaded ffmpeg unlocks video export');
}

{
  const project = createProjectFromAssetMetadata({
    id: 'asset-audio',
    name: 'sample.wav',
    capabilities: { hasAudio: true },
    media: { durationMs: 1000 },
  });
  const unavailable = evaluateMixerCapabilities({ webAudio: false, nativeAudioDecode: false }, project);
  assert.equal(unavailable.actions.audioPreview.status, CAPABILITY_STATUS.UNSUPPORTED, 'capabilities: missing WebAudio disables audio preview');
  assert.equal(unavailable.actions.waveformAnalysis.status, CAPABILITY_STATUS.UNSUPPORTED, 'capabilities: missing decode disables waveform');
  const summary = summarizeReducedCapabilities(unavailable);
  assert(summary.some((item) => item.id === 'projectSettings' && item.availableNow), 'capabilities: reduced mode keeps settings available');
}

