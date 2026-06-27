import { buildSpeedPresets, buildVideoExtras } from './playback-extras.js';
import { parseId3 } from './id3.js';
import { downloadBlob } from '../../core/exports.js';

const SLEEP_OPTIONS = [0, 5, 15, 30, 45, 60];

// Build the common media toolbar (sleep timer, codec hint pill, and optional track list).
export function buildMediaTools({
  intake,
  playlist,
  mediaElement,
  enableFfmpeg,
  onNavigateTrack,
  onEditorPanelFocus,
}) {
  const tools = document.createElement('div');
  tools.className = 'media-tools';

  const sleepWrap = document.createElement('label');
  sleepWrap.className = 'media-sleep';
  sleepWrap.innerHTML = '<span>⏱ Sleep</span>';

  const sleepSel = document.createElement('select');
  for (const m of SLEEP_OPTIONS) {
    const option = document.createElement('option');
    option.value = String(m);
    option.textContent = m === 0 ? 'Off' : m + ' min';
    sleepSel.appendChild(option);
  }
  sleepWrap.appendChild(sleepSel);

  const sleepNote = document.createElement('span');
  sleepNote.className = 'media-sleep-note';
  // Sleep timer is hidden during the studio-fidelity work (the select + its logic are kept below
  // so it can be re-enabled later). TODO: re-append `sleepWrap, sleepNote` once the mixer is done.
  // tools.append(sleepWrap, sleepNote);

  // The old "Editor: off/on" ffmpeg pill has been removed — the editor lives in the Export mode and
  // the transcoding toggle is in Settings → Advanced.

  if (intake?.file || intake?.bytes) {
    const downloadBtn = trackButton('↓ Download', 'Download this media file');
    downloadBtn.classList.add('media-download-original');
    downloadBtn.addEventListener('click', () => {
      downloadBlob(intake.file || intake.bytes, intake.filename || 'media', intake.mime || intake.file?.type);
    });
    tools.appendChild(downloadBtn);
  }

  let trackListEl = null;
  let shuffle = false;
  let sleepId = null;
  let sleepAt = 0;
  let tickId = null;
  const goTo = (i) => {
    if (!playlist || i < 0 || i >= playlist.items.length || i === playlist.index) return;
    onNavigateTrack?.(playlist.items[i]);
  };
  const advanceTrack = (dir) => {
    if (!playlist) return false;
    let next;
    if (shuffle && dir > 0) {
      do { next = Math.floor(Math.random() * playlist.items.length); } while (playlist.items.length > 1 && next === playlist.index);
    } else {
      next = playlist.index + dir;
      if (next < 0 || next >= playlist.items.length) return false;
    }
    goTo(next);
    return true;
  };

  if (playlist) {
    const list = document.createElement('div');
    list.className = 'media-playlist';
    const prev = trackButton('⏮', 'Previous track');
    const posLabel = document.createElement('span');
    posLabel.className = 'media-track-pos';
    posLabel.textContent = (playlist.index + 1) + ' / ' + playlist.items.length;
    const next = trackButton('⏭', 'Next track');
    const shuffleWrap = document.createElement('label');
    shuffleWrap.className = 'media-shuffle';
    shuffleWrap.innerHTML = '<input type="checkbox"> 🔀';
    shuffleWrap.querySelector('input').addEventListener('change', (event) => {
      shuffle = event.target.checked;
    });
    prev.addEventListener('click', () => advanceTrack(-1));
    next.addEventListener('click', () => advanceTrack(1));
    list.append(prev, posLabel, next, shuffleWrap);
    tools.appendChild(list);

    trackListEl = document.createElement('div');
    trackListEl.className = 'media-tracklist';
    const labels = [];
    playlist.items.forEach((item, index) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'media-track' + (index === playlist.index ? ' current' : '');

      const number = document.createElement('span');
      number.className = 'media-track-n';
      number.textContent = String(index + 1);
      const label = document.createElement('span');
      label.className = 'media-track-label';
      label.textContent = (item.path || item.file?.name || 'track').split('/').pop();

      const gainKey = 'fv:gain:' + (item.path || item.file?.name || String(index));
      const gainValue = parseInt(localStorage.getItem(gainKey) ?? '100', 10);
      const gainSlider = document.createElement('input');
      gainSlider.type = 'range';
      gainSlider.min = '0';
      gainSlider.max = '200';
      gainSlider.value = String(gainValue);
      gainSlider.className = 'media-gain-slider';
      gainSlider.title = 'Track volume (0–200%)';
      gainSlider.addEventListener('input', () => {
        const v = parseInt(gainSlider.value, 10);
        localStorage.setItem(gainKey, String(v));
        if (index === playlist.index) {
          import('./waveform.js').then(({ connectGain }) => {
            const gain = connectGain(mediaElement);
            if (gain) gain.gain.value = v / 100;
          });
        }
      });

      row.append(number, label, gainSlider);
      row.addEventListener('click', () => goTo(index));
      trackListEl.appendChild(row);
      labels.push({ item, label });
    });
    enrichTrackTags(labels);

    const current = playlist.items[playlist.index];
    const currentKey = 'fv:gain:' + (current.path || current.file?.name || String(playlist.index));
    const currentValue = parseInt(localStorage.getItem(currentKey) ?? '100', 10);
    if (currentValue !== 100) {
      import('./waveform.js').then(({ connectGain }) => {
        const gain = connectGain(mediaElement);
        if (gain) gain.gain.value = currentValue / 100;
      });
    }
  }

  function cancelSleep() {
    if (sleepId) { clearTimeout(sleepId); sleepId = null; }
    if (tickId) { clearInterval(tickId); tickId = null; }
    sleepNote.textContent = '';
    mediaElement.volume = 1;
  }

  function armSleep(minutes) {
    cancelSleep();
    if (!minutes) return;
    sleepAt = performance.now() + minutes * 60000;
    sleepId = setTimeout(() => {
      const fade = setInterval(() => {
        mediaElement.volume = Math.max(0, mediaElement.volume - 0.1);
        if (mediaElement.volume <= 0.01) {
          clearInterval(fade);
          mediaElement.pause();
          mediaElement.volume = 1;
          sleepSel.value = '0';
          cancelSleep();
        }
      }, 120);
    }, minutes * 60000);
    tickId = setInterval(() => {
      const left = Math.max(0, sleepAt - performance.now());
      const mm = Math.floor(left / 60000);
      const ss = Math.floor((left % 60000) / 1000);
      sleepNote.textContent = 'pausing in ' + mm + ':' + String(ss).padStart(2, '0');
    }, 1000);
  }
  sleepSel.addEventListener('change', () => armSleep(parseInt(sleepSel.value, 10) || 0));

  return {
    tools,
    trackListEl,
    advanceTrack,
    cancelSleep,
  };
}

export function buildPlaybackExtras(mediaEl, kind) {
  const extras = document.createElement('div');
  extras.className = 'media-extras';
  extras.appendChild(buildSpeedPresets(mediaEl));
  if (kind === 'video') extras.appendChild(buildVideoExtras(mediaEl));
  return { extras };
}

// ID3 tag enrichment for track labels in folder playlists.
async function enrichTrackTags(labels) {
  for (const { item, label } of labels) {
    const f = item.file;
    if (!f || typeof f.slice !== 'function') continue;
    try {
      const head = new Uint8Array(await f.slice(0, 256 * 1024).arrayBuffer());
      const tags = parseId3(head);
      if (tags && (tags.title || tags.artist)) {
        label.textContent = [tags.title, tags.artist].filter(Boolean).join(' — ');
      }
    } catch { /* keep filename if unreadable */ }
  }
}

function trackButton(label, title) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'media-track-btn';
  button.textContent = label;
  button.title = title;
  return button;
}
