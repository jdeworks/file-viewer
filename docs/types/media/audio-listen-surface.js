function fmtTime(value) {
  const total = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function clamp(value, min, max) {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
}

function iconButton(label, title, className = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `media-listen-btn ${className}`.trim();
  button.textContent = label;
  button.title = title;
  button.setAttribute('aria-label', title);
  return button;
}

export function buildAudioListenSurface(mediaEl, intake) {
  mediaEl.controls = false;
  mediaEl.classList.add('media-view-hidden');
  mediaEl.setAttribute('aria-hidden', 'true');
  mediaEl.tabIndex = -1;

  const wrap = document.createElement('div');
  wrap.className = 'media-listen-surface';

  const lane = document.createElement('div');
  lane.className = 'media-listen-lane';

  const laneIndex = document.createElement('div');
  laneIndex.className = 'media-listen-index';
  laneIndex.textContent = '1';

  const controls = document.createElement('div');
  controls.className = 'media-listen-controls';

  const playBtn = iconButton('Play', 'Play or pause', 'media-listen-play');
  const stopBtn = iconButton('Stop', 'Stop and rewind');
  const backBtn = iconButton('-10', 'Seek back 10 seconds');
  const fwdBtn = iconButton('+10', 'Seek forward 10 seconds');
  const volume = document.createElement('input');
  volume.type = 'range';
  volume.className = 'media-listen-volume';
  volume.min = '0';
  volume.max = '1';
  volume.step = '0.01';
  volume.value = String(mediaEl.volume ?? 1);
  volume.title = 'Volume';
  controls.append(playBtn, stopBtn, backBtn, fwdBtn, volume);

  const track = document.createElement('div');
  track.className = 'media-listen-track';

  const labelRow = document.createElement('div');
  labelRow.className = 'media-listen-label-row';
  const name = document.createElement('span');
  name.className = 'media-listen-name';
  name.textContent = intake.filename || 'Audio';
  const time = document.createElement('span');
  time.className = 'media-listen-time';
  time.textContent = '0:00 / --:--';
  labelRow.append(name, time);

  const progressWrap = document.createElement('div');
  progressWrap.className = 'media-listen-progress-wrap';
  const progress = document.createElement('input');
  progress.type = 'range';
  progress.className = 'media-listen-progress';
  progress.min = '0';
  progress.max = '1000';
  progress.step = '1';
  progress.value = '0';
  progress.title = 'Seek';
  const playhead = document.createElement('div');
  playhead.className = 'media-listen-playhead';
  progressWrap.append(progress, playhead);

  track.append(labelRow, progressWrap);
  lane.append(laneIndex, controls, track);
  wrap.append(lane);

  let scrubbing = false;
  const duration = () => Number(mediaEl.duration) || 0;
  const current = () => Number(mediaEl.currentTime) || 0;

  const sync = () => {
    const dur = duration();
    const now = current();
    const pct = dur > 0 ? clamp(now / dur, 0, 1) : 0;
    if (!scrubbing) progress.value = String(Math.round(pct * 1000));
    progress.disabled = dur <= 0;
    playhead.style.left = `${pct * 100}%`;
    time.textContent = `${fmtTime(now)} / ${dur > 0 ? fmtTime(dur) : '--:--'}`;
    playBtn.textContent = mediaEl.paused ? 'Play' : 'Pause';
    playBtn.setAttribute('aria-label', mediaEl.paused ? 'Play' : 'Pause');
  };

  const seekBy = (delta) => {
    const dur = duration();
    mediaEl.currentTime = clamp(current() + delta, 0, dur > 0 ? dur : Number.MAX_SAFE_INTEGER);
    sync();
  };

  playBtn.addEventListener('click', () => {
    if (mediaEl.paused) mediaEl.play().catch(() => {});
    else mediaEl.pause();
    sync();
  });
  stopBtn.addEventListener('click', () => {
    mediaEl.pause();
    mediaEl.currentTime = 0;
    sync();
  });
  backBtn.addEventListener('click', () => seekBy(-10));
  fwdBtn.addEventListener('click', () => seekBy(10));
  volume.addEventListener('input', () => {
    mediaEl.volume = clamp(Number(volume.value), 0, 1);
  });
  progress.addEventListener('input', () => {
    scrubbing = true;
    const dur = duration();
    if (dur > 0) {
      const pct = clamp(Number(progress.value) / 1000, 0, 1);
      playhead.style.left = `${pct * 100}%`;
      time.textContent = `${fmtTime(pct * dur)} / ${fmtTime(dur)}`;
    }
  });
  progress.addEventListener('change', () => {
    const dur = duration();
    if (dur > 0) mediaEl.currentTime = clamp(Number(progress.value) / 1000, 0, 1) * dur;
    scrubbing = false;
    sync();
  });

  const events = ['loadedmetadata', 'durationchange', 'timeupdate', 'play', 'pause', 'seeked', 'ended', 'volumechange'];
  events.forEach((event) => mediaEl.addEventListener(event, sync));
  sync();

  return {
    el: wrap,
    update: sync,
    destroy() {
      events.forEach((event) => mediaEl.removeEventListener(event, sync));
      wrap.remove();
    },
  };
}
