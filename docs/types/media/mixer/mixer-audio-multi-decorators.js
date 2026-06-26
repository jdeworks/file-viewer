import { createButton } from './mixer-audio-listen-helpers.js';

export function decorateMultiToolbar(toolbar, project) {
  toolbar.querySelector('.mmx-title').textContent = 'Mixer';
  const controls = document.createElement('div');
  controls.className = 'mx-controls';
  const play = createButton('Play', 'Play mix preview', 'mx-play');
  const stop = createButton('Stop', 'Stop mix preview', 'mx-stop');
  const addTone = createButton('+ Tone', 'Add generated tone lane', 'mx-add-btn');
  const addPink = createButton('+ Pink noise', 'Add pink-noise room-tone lane', 'mx-add-pink');
  const mix = createButton('Mixdown -> WAV', 'Download browser audio mixdown WAV', 'mx-mix-btn');
  const drop = document.createElement('span');
  drop.className = 'mx-drop-zone';
  drop.textContent = 'Drop audio to add lane';
  const master = document.createElement('label');
  master.className = 'mx-master';
  const masterText = document.createElement('span');
  masterText.textContent = 'Master';
  const masterSlider = document.createElement('input');
  masterSlider.type = 'range';
  masterSlider.className = 'mx-master-slider';
  masterSlider.min = '0';
  masterSlider.max = '2';
  masterSlider.step = '0.01';
  masterSlider.value = String(project.master?.audio?.gain ?? 1);
  master.append(masterText, masterSlider);
  controls.append(play, stop, addTone, addPink, master, mix, drop);
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
