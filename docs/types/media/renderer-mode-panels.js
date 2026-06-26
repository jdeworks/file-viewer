import { createWorkspaceModes } from './workspace-modes.js';
import { makeTogglePanel } from './panel-toggle.js';
import { buildSubtitleLoader, mountSubtitles } from './subtitles.js';

function fmtLpf(freq) {
  return freq >= 1000 ? `${Math.round(freq / 100) / 10}kHz` : `${freq}Hz`;
}

function createNote(message) {
  const note = document.createElement('div');
  note.className = 'media-ed-note';
  note.innerHTML = message;
  return note;
}

async function mountTuneMode(panel, mediaEl) {
  const { PRESETS } = await import('./spectrum-draw.js');
  const { getGraph } = await import('./audio-graph.js');
  const graph = getGraph(mediaEl);
  const presetById = new Map(PRESETS.map((preset) => [preset.id, preset]));
  const intentPresets = [
    { presetId: 'flat', label: 'Flat' },
    { presetId: 'broadcast', label: 'Clean speech' },
    { presetId: 'acx-standard', label: 'ACX standard' },
    { presetId: 'podcast', label: 'Podcast' },
    { presetId: 'findaway', label: 'Findaway' },
    { presetId: 'warmth', label: 'Warmth' },
    { presetId: 'air', label: 'Presence/Air' },
    { presetId: 'deess-m', label: 'De-ess' },
    { presetId: 'bass-cut', label: 'Bass rolloff' },
  ];

  const matchesPreset = (preset) => {
    if (!preset) return false;
    const gains = graph.getGains();
    return gains.length === preset.gains.length
      && gains.every((v, i) => Math.abs(v - preset.gains[i]) <= 0.0001)
      && graph.getHpf() === preset.hpf
      && graph.getLpf() === preset.lpf;
  };

  if (!graph) {
    const note = document.createElement('div');
    note.className = 'media-tune-note';
    note.textContent = 'Audio processing unavailable for this media.';
    panel.appendChild(note);
    return {
      destroy() {
        note.remove();
      },
    };
  }

  const tuneWrap = document.createElement('div');
  tuneWrap.className = 'media-tune-wrap';

  const intentCard = document.createElement('div');
  intentCard.className = 'media-tune-intent-card';

  const intentHeading = document.createElement('div');
  intentHeading.className = 'media-tune-intent-heading';
  intentHeading.textContent = 'Quick intent tuning';

  const intentStatus = document.createElement('div');
  intentStatus.className = 'media-tune-intent-status';

  const intentRow = document.createElement('div');
  intentRow.className = 'media-tune-intent-row';

  const setActiveIntent = (id) => {
    intentRow.querySelectorAll('.media-tune-intent-btn').forEach((button) => {
      const isActive = button.dataset.intent === id;
      button.classList.toggle('media-tune-intent-btn--active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  const reflectIntent = (preset, id) => {
    const hpf = preset?.hpf ?? graph.getHpf();
    const lpf = preset?.lpf ?? graph.getLpf();
    const label = preset?.name || 'Custom';
    intentStatus.textContent = `Intent: ${label} · HPF ${hpf}Hz · LPF ${fmtLpf(lpf)}`;
    setActiveIntent(id);
  };

  const applyPresetIntent = (id) => {
    const preset = presetById.get(id) || PRESETS.find((candidate) => candidate.id === 'flat');
    if (!preset) return;
    graph.setAllGains(preset.gains);
    graph.setHpf(preset.hpf);
    graph.setLpf(preset.lpf);
    reflectIntent(preset, id);
  };

  let initialIntent = 'flat';
  const initialPreset = PRESETS.find((candidate) => matchesPreset(candidate));
  if (initialPreset) initialIntent = initialPreset.id;
  else initialIntent = null;

  for (const intent of intentPresets) {
    const preset = presetById.get(intent.presetId);
    if (!preset) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'media-tune-intent-btn';
    button.dataset.intent = intent.presetId;
    button.textContent = intent.label;
    button.title = `${intent.label} preset`;
    button.addEventListener('click', () => applyPresetIntent(intent.presetId));
    intentRow.append(button);
  }
  const initialPresetState = initialIntent ? PRESETS.find((p) => p.id === initialIntent) : null;
  reflectIntent(initialPresetState, initialIntent);

  const advWrap = document.createElement('div');
  advWrap.className = 'media-tune-advanced';
  const advHeading = document.createElement('div');
  advHeading.className = 'media-tune-advanced-heading';
  advHeading.textContent = 'Advanced controls';

  const spectrumPanel = makeTogglePanel({
    label: 'Spectrum & EQ',
    panelClass: 'media-sp-panel',
    floating: true,
    floatingTitle: 'Spectrum & EQ',
    mount: async (innerPanel) => (await import('./spectrum.js')).mountSpectrumPanel(innerPanel, mediaEl),
  });
  const dynamicsPanel = makeTogglePanel({
    label: 'Dynamics',
    panelClass: 'media-dyn-panel',
    floating: true,
    floatingTitle: 'Dynamics',
    mount: async (innerPanel) => (await import('./dynamics.js')).mountDynamicsPanel(innerPanel, mediaEl),
  });
  advWrap.append(advHeading, spectrumPanel.wrap, dynamicsPanel.wrap);
  intentCard.append(intentHeading, intentStatus, intentRow);
  tuneWrap.append(intentCard, advWrap);

  if (initialIntent) setActiveIntent(initialIntent);
  panel.append(tuneWrap);

  return {
    destroy() {
      spectrumPanel.destroy();
      dynamicsPanel.destroy();
    },
  };
}

export async function mountAudioModePanels({
  modeTabs,
  modePanelWrap,
  mediaElement,
  intake,
  tools,
  trackListEl,
  enableFfmpeg,
  exportPanel,
  onRegisterController,
  onReleaseController,
}) {
  const states = createWorkspaceModes({
    tabWrap: modeTabs,
    panelWrap: modePanelWrap,
    stickyModes: ['listen', 'export'],
    onRegisterController,
    onReleaseController,
  });

  const { registerMode, setMode } = states;
  registerMode('listen', 'Listen');
  registerMode('tune', 'Tune', async (panel) => mountTuneMode(panel, mediaElement));
  registerMode('qc', 'QC', async (panel) => {
    const { mountAcxQcPanel } = await import('./qc-ui.js');
    return mountAcxQcPanel(panel, intake, mediaElement);
  });
  registerMode('export', 'Export', async (panel) => {
    if (!enableFfmpeg) {
      panel.append(createNote(
        'Enable <strong>Media transcoding</strong> in <strong>Settings → Advanced</strong> '
        + 'to unlock audio export and related audio post-processing.',
      ));
      return null;
    }
    if (exportPanel) panel.append(exportPanel);
    return null;
  });
  registerMode('compare', 'Compare', async (panel) => {
    const { mountModularCompare } = await import('./mixer/mixer-compare.js');
    return mountModularCompare(panel, intake, mediaElement, 'audio', { enableFfmpeg });
  });
  registerMode('mix', 'Mix', async (panel) => {
    const { mountModularAudioMixer } = await import('./mixer/mixer-audio-multi.js');
    return mountModularAudioMixer(panel, intake, mediaElement, { enableFfmpeg });
  });

  const audioListenMode = states.states.get('listen');
  audioListenMode.panel.append(tools);
  if (trackListEl) audioListenMode.panel.append(trackListEl);

  void setMode('listen');
  return { audioListenMode };
}

export async function mountVideoModePanels({
  modeTabs,
  modePanelWrap,
  mediaElement,
  host,
  intake,
  tools,
  extras,
  hintPanel,
  enableFfmpeg,
  videoStudio,
  editorPanel,
  exportPanel,
  onRegisterController,
  onReleaseController,
}) {
  const states = createWorkspaceModes({
    tabWrap: modeTabs,
    panelWrap: modePanelWrap,
    stickyModes: ['watch', 'export'],
    onRegisterController,
    onReleaseController,
  });

  const ffmpegBlockedMsg = 'Enable <strong>Media transcoding</strong> in <strong>Settings → Advanced</strong> to unlock this feature.';
  const buildFfNotEnabledHint = (message = ffmpegBlockedMsg) => createNote(message);

  const { registerMode, setMode } = states;
  const watchMode = registerMode('watch', 'Watch');
  registerMode('adjust', 'Adjust', async (panel) => {
    if (videoStudio) {
      panel.append(videoStudio.controls);
      panel.append(videoStudio.mixer);
      return {
        destroy() {
          videoStudio?.destroy();
        },
      };
    }
    return null;
  });
  registerMode('timeline', 'Timeline', async (panel) => {
    const { mountModularVideoSourceMixer } = await import('./mixer/mixer-video-source.js');
    const mixerController = mountModularVideoSourceMixer(panel, intake, mediaElement, { enableFfmpeg });
    if (!enableFfmpeg) {
      panel.append(buildFfNotEnabledHint(
        'Enable <strong>Media transcoding</strong> in <strong>Settings → Advanced</strong> to unlock conversion, proxy generation, and final video render.',
      ));
      return mixerController;
    }
    return mixerController;
  });

  let subtitleController = null;
  let subtitleLoader = null;
  registerMode('subtitles', 'Subtitles', async (panel) => {
    if (!subtitleLoader) {
      if (!subtitleController) subtitleController = mountSubtitles(host, mediaElement);
      if (subtitleController) subtitleLoader = buildSubtitleLoader(subtitleController);
    }
    if (subtitleLoader) {
      panel.append(subtitleLoader);
    } else {
      panel.append(buildFfNotEnabledHint('Subtitle loader unavailable for this environment.'));
    }
    return null;
  });

  registerMode('export', 'Export', async (panel) => {
    if (!enableFfmpeg || !exportPanel) {
      panel.append(buildFfNotEnabledHint(
        'Enable <strong>Media transcoding</strong> in <strong>Settings → Advanced</strong> to unlock video export and fades.',
      ));
      return null;
    }
    panel.append(exportPanel);
    if (editorPanel) panel.append(editorPanel);
    return null;
  });
  registerMode('compare', 'Compare', async (panel) => {
    const { mountModularCompare } = await import('./mixer/mixer-compare.js');
    return mountModularCompare(panel, intake, mediaElement, 'video', { enableFfmpeg });
  });

  if (watchMode) {
    watchMode.panel.append(tools);
    watchMode.panel.append(extras);
    watchMode.panel.append(hintPanel);
  }

  void setMode('watch');
  return { subtitleController };
}
