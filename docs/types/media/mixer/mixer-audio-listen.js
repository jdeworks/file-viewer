import { buildAudioListenSurface } from '../audio-listen-surface.js';
import {
  createProjectFromAssetMetadata,
  updateElement,
} from './mixer-model.js';
import {
  exportProjectSettingsJson,
  importProjectSettings,
} from './mixer-import-export.js';

export function buildMixerAudioListenSurface(mediaEl, intake, options = {}) {
  const base = buildAudioListenSurface(mediaEl, intake, options);
  const root = base.el;
  root.classList.add('mmx-audio-listen');
  root.dataset.mixerContext = 'listen';

  let project = buildProject(mediaEl, intake);
  const firstElementId = () => project.elements[0]?.id;

  const projectTools = document.createElement('div');
  projectTools.className = 'mmx-listen-project-tools';
  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'mmx-settings-export';
  exportBtn.textContent = 'Export settings';
  const importBtn = document.createElement('button');
  importBtn.type = 'button';
  importBtn.className = 'mmx-settings-import';
  importBtn.textContent = 'Import settings';
  importBtn.hidden = true;
  projectTools.append(exportBtn, importBtn);
  root.append(projectTools);

  function syncProjectFromControls() {
    const id = firstElementId();
    if (!id) return;
    const offsetSec = readNumber(root, '.media-lane-offset', 0);
    const inSec = readNumber(root, '.media-lane-in', 0);
    const outSec = readNumber(root, '.media-lane-out', mediaDuration(mediaEl));
    const gain = readNumber(root, '.media-lane-gain', 1);
    const fadeInMs = readNumber(root, '.media-lane-fade-in', 0);
    const fadeOutMs = readNumber(root, '.media-lane-fade-out', 0);
    const roomTone = !!root.querySelector('.media-lane-room-toggle')?.checked;
    project = updateElement(project, id, (element) => ({
      ...element,
      timeline: {
        ...element.timeline,
        startMs: Math.max(0, offsetSec * 1000),
        sourceInMs: Math.max(0, inSec * 1000),
        sourceOutMs: Math.max(inSec * 1000, outSec * 1000),
        durationMs: Math.max(0, (outSec - inSec) * 1000),
        placementDurationMs: Math.max(0, (outSec - inSec) * 1000),
      },
      audio: {
        ...element.audio,
        gain,
        fadeInMs,
        fadeOutMs,
        roomTone: roomTone ? { kind: 'room-tone', source: 'derived-gap-bed', levelDb: -52 } : null,
      },
    }));
    reflectProjectState();
  }

  function reflectProjectState() {
    const element = project.elements[0];
    root.dataset.mixerProjectId = project.project.id;
    root.dataset.mixerElementId = element?.id || '';
    root.dataset.mixerOffsetMs = String(Math.round(element?.timeline?.startMs || 0));
    root.dataset.mixerGain = String(element?.audio?.gain ?? 1);
    root.dataset.mixerRoomTone = element?.audio?.roomTone ? 'true' : 'false';
  }

  function exportSettings() {
    syncProjectFromControls();
    const json = exportProjectSettingsJson(project);
    root.dataset.projectSettings = json;
    return json;
  }

  function importSettings(json) {
    const imported = importProjectSettings(json);
    project = imported.project;
    const element = project.elements[0];
    if (element) {
      setValue(root, '.media-lane-offset', (element.timeline.startMs || 0) / 1000);
      setValue(root, '.media-lane-in', (element.timeline.sourceInMs || 0) / 1000);
      setValue(root, '.media-lane-out', (element.timeline.sourceOutMs || element.timeline.durationMs || 0) / 1000);
      setValue(root, '.media-lane-gain', element.audio?.gain ?? 1);
      setValue(root, '.media-lane-fade-in', element.audio?.fadeInMs ?? 0);
      setValue(root, '.media-lane-fade-out', element.audio?.fadeOutMs ?? 0);
      const room = root.querySelector('.media-lane-room-toggle');
      if (room) {
        room.checked = !!element.audio?.roomTone;
        room.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    reflectProjectState();
    return imported;
  }

  const onInput = (event) => {
    if (event.target?.matches?.('.media-lane-offset, .media-lane-in, .media-lane-out, .media-lane-gain, .media-lane-fade-in, .media-lane-fade-out')) {
      syncProjectFromControls();
    }
  };
  const onChange = (event) => {
    if (event.target?.matches?.('.media-lane-room-toggle')) syncProjectFromControls();
  };
  const onLoadedMetadata = () => {
    project = buildProject(mediaEl, intake);
    syncProjectFromControls();
  };
  root.addEventListener('input', onInput);
  root.addEventListener('change', onChange);
  mediaEl.addEventListener('loadedmetadata', onLoadedMetadata);
  exportBtn.addEventListener('click', exportSettings);

  root.__mediaMixerListen = {
    getProject: () => project,
    exportSettings,
    importSettings,
  };
  reflectProjectState();

  return {
    ...base,
    el: root,
    getProject: () => project,
    exportSettings,
    importSettings,
    destroy() {
      root.removeEventListener('input', onInput);
      root.removeEventListener('change', onChange);
      mediaEl.removeEventListener('loadedmetadata', onLoadedMetadata);
      delete root.__mediaMixerListen;
      base.destroy?.();
    },
  };
}

function buildProject(mediaEl, intake) {
  const durationMs = Math.max(0, mediaDuration(mediaEl) * 1000);
  return createProjectFromAssetMetadata({
    id: 'asset-listen-source',
    name: intake.filename || intake.file?.name || 'Audio source',
    mime: intake.mime || intake.file?.type || '',
    size: intake.size || intake.file?.size || 0,
    lastModified: intake.file?.lastModified || null,
    capabilities: { hasAudio: true, hasVideo: false, hasImage: false },
    media: {
      durationMs,
      audioSampleRate: 0,
      audioChannels: 0,
    },
  }, {
    name: intake.filename || 'Audio listen',
    laneLabel: 'Source',
  });
}

function mediaDuration(mediaEl) {
  const value = Number(mediaEl.duration);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function readNumber(root, selector, fallback) {
  const value = Number(root.querySelector(selector)?.value);
  return Number.isFinite(value) ? value : fallback;
}

function setValue(root, selector, value) {
  const input = root.querySelector(selector);
  if (!input) return;
  input.value = String(Math.round(Number(value) * 1000) / 1000);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
