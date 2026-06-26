import { createButton } from './mixer-audio-listen-helpers.js';

export function decorateMultiToolbar(toolbar, project) {
  toolbar.querySelector('.mmx-title').textContent = 'Mixer';
  const controls = document.createElement('div');
  controls.className = 'mmx-mix-controls';
  const play = createButton('Play', 'Play mix preview', 'mmx-mix-play');
  const stop = createButton('Stop', 'Stop mix preview', 'mmx-mix-stop');
  const addTone = createButton('+ Tone', 'Add generated tone lane', 'mmx-mix-add-tone');
  const addPink = createButton('+ Pink noise', 'Add pink-noise room-tone lane', 'mmx-mix-add-pink');
  const mix = createButton('Mixdown -> WAV', 'Download browser audio mixdown WAV', 'mmx-mix-download');
  const videoPlan = createButton('Plan video export', 'Plan ffmpeg-gated video/image export', 'mmx-mix-video-export-plan mmx-video-export-plan');
  const drop = document.createElement('span');
  drop.className = 'mmx-mix-drop-zone';
  drop.textContent = 'Drop audio, image, or video to add lane';
  const master = document.createElement('label');
  master.className = 'mmx-mix-master';
  const masterText = document.createElement('span');
  masterText.textContent = 'Master';
  const masterSlider = document.createElement('input');
  masterSlider.type = 'range';
  masterSlider.className = 'mmx-mix-master-slider';
  masterSlider.min = '0';
  masterSlider.max = '2';
  masterSlider.step = '0.01';
  masterSlider.value = String(project.master?.audio?.gain ?? 1);
  master.append(masterText, masterSlider);
  const hasVisual = (project.elements || []).some((element) => element.capabilities?.hasVideo || element.capabilities?.hasImage);
  controls.append(play, stop, addTone, addPink, master, mix);
  if (hasVisual) controls.append(videoPlan);
  controls.append(drop);
  toolbar.append(controls);
}

export function reflectMultiPlaybackState(root, state) {
  root.dataset.playing = state.playing ? 'true' : 'false';
  root.dataset.scheduledCount = String(state.scheduledCount || 0);
  root.dataset.skippedCount = String(state.skippedCount || 0);
  root.dataset.generatedScheduled = String(state.generatedCount || 0);
  root.dataset.decodedScheduled = String(state.decodedCount || 0);
  root.dataset.playbackError = state.lastError || '';
}
