import { moveElement, trimElement, updateElement } from './mixer-model.js';
import { clamp } from './mixer-audio-listen-helpers.js';

export function updateProjectElementField(project, action) {
  const elementId = action.elementId;
  const value = Number(action.value);
  if (!elementId || !Number.isFinite(value)) return project;
  if (action.field === 'start') return moveElement(project, elementId, value * 1000);
  if (action.field === 'source-in') return trimElement(project, elementId, { sourceInMs: value * 1000 });
  if (action.field === 'source-out') return trimElement(project, elementId, { sourceOutMs: value * 1000 });
  if (action.field === 'gain') {
    return updateElement(project, elementId, (element) => ({
      ...element,
      audio: { ...element.audio, gain: clamp(value, 0, 2) },
    }));
  }
  if (action.field === 'fade-in') {
    return updateElement(project, elementId, (element) => ({
      ...element,
      audio: { ...element.audio, fadeInMs: Math.max(0, value) },
    }));
  }
  if (action.field === 'fade-out') {
    return updateElement(project, elementId, (element) => ({
      ...element,
      audio: { ...element.audio, fadeOutMs: Math.max(0, value) },
    }));
  }
  return project;
}

export function laneRange(className, laneId, value, min, max, step, label) {
  const input = document.createElement('input');
  input.type = 'range';
  input.className = className;
  input.dataset.laneId = laneId;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.setAttribute('aria-label', label);
  return input;
}

export function createSilentWav(durationSec, sampleRate, channels) {
  const channelCount = Math.max(1, Math.min(2, Math.round(channels || 1)));
  const frames = Math.max(1, Math.round(durationSec * sampleRate));
  const bytesPerSample = 2;
  const dataSize = frames * channelCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * bytesPerSample, true);
  view.setUint16(32, channelCount * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  return buffer;
}

export function hasAudioDrop(dataTransfer) {
  if (!dataTransfer) return false;
  if ([...(dataTransfer.files || [])].some(isAudioFile)) return true;
  return [...(dataTransfer.items || [])].some((item) => item.kind === 'file' && /^audio\//i.test(item.type || ''));
}

export function isAudioFile(file) {
  if (!file) return false;
  if (/^audio\//i.test(file.type || '')) return true;
  return /\.(wav|wave|mp3|m4a|aac|flac|ogg|oga|opus|webm)$/i.test(file.name || '');
}

export function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}

function writeAscii(view, offset, text) {
  for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
}
