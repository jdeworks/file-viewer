// P6 — Video timeline (2-lane) + transitions + visual trim. Tier-2, ffmpeg.wasm, opt-in.
//
// A VIDEO lane (the open clip) with a thumbnail strip + drag trim handles (in/out), and a
// SECOND lane fed by a drop zone (reuses buildSecondaryDropZone) to bring in a second video
// (dissolve / xfade) or a music bed (mux) here. Transitions bake through ffmpeg:
//   • Fade to/from black (single clip)  → 'videofade' op
//   • Dissolve / crossfade (2 clips)    → 'xfade' op   (video) + acrossfade audio
//   • Audio crossfade (2 clips)         → 'acrossfade' op
//   • Mux music under video             → 'muxmusic' op
//
// CPU policy: nothing here loads ffmpeg or generates thumbnails until the user runs an
// action / clicks "Thumbnails". The trim handles drive the existing 'trim' op contract.
// DOM + interaction only; all ffmpeg arg math lives in video-filters.js (PURE) + transcoder.

import { loadFfmpeg, runOperation } from './transcoder.js';
import { clampTrimRange } from './video-filters.js';
import { buildSecondaryDropZone } from './editor-advanced.js';

const TL_PX_PER_SEC = 32;
const TL_MIN_PX = 360;

function mkBtn(text, cls) {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = text; b.className = cls || 'media-ed-btn';
  return b;
}
function fmt(t) {
  if (!isFinite(t)) t = 0;
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return m + ':' + String(s).padStart(2, '0');
}
function hms(t) {
  t = Math.max(0, t || 0);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60);
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}
function clamp01(v) { return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0; }

// Mount the timeline into `container` for the primary `intake` video + its `mediaEl`.
// onNewUrl(url) lets the caller swap the player to a baked result. Returns { destroy() }.
export function mountTimeline(container, intake, mediaEl, onNewUrl) {
  const blobUrls = [];
  let ffInstance = null;
  let secondZone = null;     // { el, getFile() } — second clip / music bed
  let trimIn = 0, trimOut = 0; // seconds (out=0 means "till end")
  let operating = false;

  const wrap = document.createElement('div');
  wrap.className = 'tl-wrap';

  const head = document.createElement('div');
  head.className = 'tl-head';
  const headTitle = document.createElement('div');
  headTitle.className = 'tl-head-title';
  headTitle.textContent = 'Timeline';
  const headStatus = document.createElement('div');
  headStatus.className = 'tl-head-status';
  head.append(headTitle, headStatus);

  const context = document.createElement('div');
  context.className = 'tl-context';

  // Shared grammar: ruler, lanes and playhead.
  const timeline = document.createElement('div');
  timeline.className = 'tl-timeline';
  const ruler = document.createElement('div');
  ruler.className = 'tl-ruler';
  const playhead = document.createElement('div');
  playhead.className = 'tl-playhead';
  const playheadTime = document.createElement('span');
  playheadTime.className = 'tl-playhead-time';
  playhead.append(playheadTime);

  const laneView = document.createElement('div');
  laneView.className = 'tl-lane-view';
  const lanes = document.createElement('div');
  lanes.className = 'tl-lane-track';

  // ── Video lane (clip A) ──
  const vLane = document.createElement('div');
  vLane.className = 'tl-lane tl-lane--video';
  const vName = document.createElement('div');
  vName.className = 'tl-lane-name'; vName.textContent = intake.filename || 'Clip A';
  const vTrack = document.createElement('div');
  vTrack.className = 'tl-lane-track-row';
  const strip = document.createElement('div');
  strip.className = 'tl-strip';
  const thumbRow = document.createElement('div');
  thumbRow.className = 'tl-thumbs';
  const thumbHint = document.createElement('span');
  thumbHint.className = 'tl-thumb-hint';
  thumbHint.textContent = 'Thumbnails load on demand →';
  const thumbBtn = mkBtn('▦ Thumbnails', 'tl-thumb-btn');
  thumbRow.append(thumbHint, thumbBtn);
  // Trim handles (in / out) over the strip.
  const handleIn = document.createElement('div');
  handleIn.className = 'tl-handle tl-handle-in'; handleIn.title = 'Drag: trim in';
  const handleOut = document.createElement('div');
  handleOut.className = 'tl-handle tl-handle-out'; handleOut.title = 'Drag: trim out';
  handleOut.style.right = '0px';
  const trimLabel = document.createElement('div');
  trimLabel.className = 'tl-trim-label'; trimLabel.textContent = 'Trim: full clip';
  strip.append(thumbRow, handleIn, handleOut);
  vTrack.append(strip, trimLabel);
  vLane.append(vName, vTrack);

  // ── Music / second lane (clip B) ──
  const bLane = document.createElement('div');
  bLane.className = 'tl-lane tl-lane--b';
  const bName = document.createElement('div');
  bName.className = 'tl-lane-name'; bName.textContent = 'Second clip / music';
  const bTrack = document.createElement('div');
  bTrack.className = 'tl-lane-track-row';
  const dropDef = { accept: 'video/*,audio/*', hint: 'Drop a 2nd video (dissolve) or music bed (mux) here' };
  secondZone = buildSecondaryDropZone(dropDef, () => { syncActions(); syncStatusLine(); });
  bTrack.appendChild(secondZone.el);
  bLane.append(bName, bTrack);

  // ── Transition controls ──
  const ctrls = document.createElement('div');
  ctrls.className = 'tl-ctrls';
  const transSel = document.createElement('select');
  transSel.className = 'tl-trans-sel sp-preset-sel';
  [['fade', 'Dissolve (fade)'], ['fadeblack', 'Fade through black'],
    ['wipeleft', 'Wipe left'], ['slideleft', 'Slide left']].forEach(([v, l]) => {
    const o = document.createElement('option'); o.value = v; o.textContent = l; transSel.append(o);
  });
  const durInput = document.createElement('input');
  durInput.type = 'number'; durInput.min = '0.1'; durInput.max = '10'; durInput.step = '0.1';
  durInput.value = '1'; durInput.className = 'tl-dur-input';
  const durLabel = document.createElement('label');
  durLabel.append(document.createTextNode('Length (s) '), durInput);
  const transLabel = document.createElement('label');
  transLabel.append(document.createTextNode('Transition '), transSel);
  ctrls.append(transLabel, durLabel);

  // ── Action buttons ──
  const actions = document.createElement('div');
  actions.className = 'tl-actions';
  const trimBtn = mkBtn('Trim selected range', 'tl-act tl-act-trim');
  const fadeBtn = mkBtn('Fade to/from black', 'tl-act tl-act-fade');
  const xfadeBtn = mkBtn('Dissolve 2 clips (video)', 'tl-act tl-act-xfade');
  const acrossBtn = mkBtn('Crossfade audio (2 clips)', 'tl-act tl-act-across');
  const muxBtn = mkBtn('Mux music under video', 'tl-act tl-act-mux');
  const singleActions = document.createElement('div');
  singleActions.className = 'tl-action-group';
  singleActions.append(trimBtn, fadeBtn);
  const dualActions = document.createElement('div');
  dualActions.className = 'tl-action-group';
  dualActions.append(xfadeBtn, acrossBtn, muxBtn);
  actions.append(singleActions, dualActions);

  // ── Status / result ──
  const status = document.createElement('div');
  status.className = 'tl-status';
  const result = document.createElement('div');
  result.className = 'tl-result'; result.hidden = true;

  lanes.append(vLane, bLane);
  laneView.append(lanes);
  timeline.append(ruler, laneView, playhead);
  wrap.append(head, context, timeline, ctrls, actions, status, result);
  container.append(wrap);

  function onWindowResize() { syncTrackDims(); refreshPlayhead(); }

  // ── Trim handle drag → trimIn / trimOut (seconds, mapped off strip width vs duration) ──
  function dur() { return isFinite(mediaEl.duration) && mediaEl.duration > 0 ? mediaEl.duration : 0; }
  function secondLabel() {
    const f = secondZone?.getFile();
    return f ? `Second clip: ${f.name}` : 'Second clip/music: add one';
  }
  function selectedTrim() {
    const d = dur();
    const out = trimOut > 0 ? trimOut : d;
    const source = d ? fmt(d) : 'loading';
    if (!d) {
      return {
        trimText: 'Trim: full clip',
        totalText: source,
      };
    }
    if (trimIn <= 0 && trimOut <= 0) return { trimText: `Trim: 0:00 → ${fmt(d)} (full)`, totalText: source };
    return { trimText: `Trim: ${fmt(trimIn)} → ${fmt(out)}`, totalText: source };
  }
  function syncStatusLine() {
    const t = selectedTrim();
    headStatus.textContent = `${t.trimText} • ${t.totalText}`;
    context.textContent = `${secondLabel()} • ${intake.filename || 'video'}`;
    if (!operating) {
      status.textContent = `${t.trimText} ${secondZone?.getFile() ? '• 2-clip actions enabled' : '• add a second clip/music to unlock dissolve / crossfade / mux'}`;
    }
  }

  function timelinePx() {
    const d = dur();
    return Math.max(TL_MIN_PX, Math.round(Math.max(1, d) * TL_PX_PER_SEC));
  }

  function buildRuler(totalSeconds, pxWidth) {
    ruler.innerHTML = '';
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
      const tick = document.createElement('div');
      tick.className = 'tl-ruler-tick';
      tick.style.left = '0px';
      const label = document.createElement('span');
      label.className = 'tl-ruler-label';
      label.textContent = '0:00';
      tick.append(label);
      ruler.appendChild(tick);
      return;
    }

    const baseTick = TL_PX_PER_SEC >= 28 ? 1 : TL_PX_PER_SEC >= 14 ? 2 : 5;
    const labelEvery = Math.max(5, baseTick * 2);
    const labelPxLimit = 40;
    const tickCount = Math.ceil(totalSeconds / baseTick);
    for (let i = 0; i <= tickCount; i += 1) {
      const sec = Math.min(totalSeconds, i * baseTick);
      const x = Math.max(0, Math.min(pxWidth, Math.round((sec / totalSeconds) * pxWidth)));
      const tick = document.createElement('div');
      tick.className = 'tl-ruler-tick';
      tick.style.left = x + 'px';
      if (i % Math.round(labelEvery / baseTick) === 0 || sec === totalSeconds) {
        const label = document.createElement('span');
        label.className = 'tl-ruler-label';
        label.style.left = sec === totalSeconds ? `-${labelPxLimit - 8}px` : '-14px';
        label.textContent = fmt(sec);
        tick.append(label);
        tick.classList.add('with-label');
      }
      ruler.appendChild(tick);
    }
  }

  function syncTrackDims() {
    const pxWidth = timelinePx();
    const width = `${pxWidth}px`;
    vTrack.style.width = width;
    bTrack.style.width = width;
    ruler.style.width = width;
    lanes.style.width = width;
    buildRuler(dur(), pxWidth);
    refreshPlayhead();
  }

  function refreshPlayhead() {
    const d = dur();
    const pxWidth = timelinePx();
    if (!d) {
      playhead.style.left = '0px';
      playheadTime.textContent = '0:00';
      return;
    }
    const t = Math.max(0, Math.min(mediaEl.currentTime || 0, d));
    const x = Math.round((t / d) * pxWidth);
    playhead.style.left = `${Math.max(0, Math.min(pxWidth - 2, x))}px`;
    playheadTime.textContent = fmt(t);
  }

  function clampTrim() {
    const d = dur();
    if (!d) {
      trimIn = 0;
      trimOut = 0;
      return;
    }
    const out = trimOut > 0 ? trimOut : d;
    const v = clampTrimRange(trimIn, out, d, 0.01);
    trimIn = v.start;
    trimOut = (v.end === d ? 0 : v.end);
  }

  function syncTrimHandles() {
    const d = dur();
    if (!d) {
      handleIn.style.left = '0%';
      handleOut.style.right = '0%';
      return;
    }
    const out = trimOut > 0 ? trimOut : d;
    handleIn.style.left = ((trimIn / d) * 100) + '%';
    handleOut.style.right = ((1 - out / d) * 100) + '%';
  }

  function syncTrim() {
    clampTrim();
    syncTrimHandles();
    updateTrimLabel();
    syncTrackDims();
    syncStatusLine();
  }

  function updateTrimLabel() {
    const d = dur();
    const outV = trimOut > 0 ? trimOut : d;
    trimLabel.textContent = (trimIn <= 0 && trimOut <= 0)
      ? 'Trim: full clip' + (d ? ' (' + fmt(d) + ')' : '')
      : 'Trim: ' + fmt(trimIn) + ' → ' + fmt(outV);
  }

  function wireHandle(handle, isIn) {
    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const rect = strip.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      handle.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const frac = clamp01((ev.clientX - rect.left) / rect.width);
        const d = dur();
        const px = frac * d;
        const out = trimOut > 0 ? trimOut : d;
        if (isIn) {
          trimIn = px;
          if (trimIn >= out) trimIn = Math.max(0, out - 0.01);
        } else {
          trimOut = px >= d - 0.01 ? 0 : px;
          const finalOut = trimOut > 0 ? trimOut : d;
          if (finalOut <= trimIn) trimIn = Math.max(0, finalOut - 0.01);
        }
        syncTrim();
      };
      const up = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
    });
  }

  wireHandle(handleIn, true);
  wireHandle(handleOut, false);

  const syncFromMetadata = () => {
    syncTrim();
    syncTrackDims();
    refreshPlayhead();
  };
  const syncFromPlayhead = () => {
    refreshPlayhead();
  };
  mediaEl.addEventListener('loadedmetadata', syncFromMetadata);
  mediaEl.addEventListener('timeupdate', syncFromPlayhead);
  mediaEl.addEventListener('seeked', syncFromPlayhead);
  window.addEventListener('resize', onWindowResize);
  syncTrim();

  // ── Thumbnails (lazy: only fetch ffmpeg + a thumbstrip when asked) ──
  thumbBtn.addEventListener('click', async () => {
    thumbBtn.disabled = true; thumbHint.textContent = 'Loading ffmpeg + sampling frames…';
    try {
      const ff = await loadFfmpeg();
      const r = await runOperation(ff, 'thumbstrip', {}, intake);
      blobUrls.push(r.url);
      const img = document.createElement('img');
      img.className = 'tl-thumb-img'; img.src = r.url; img.alt = 'frame thumbnails';
      thumbRow.innerHTML = ''; thumbRow.appendChild(img);
    } catch (err) {
      thumbHint.textContent = 'Thumbnails failed: ' + (err.message || err).split('\n')[0];
      thumbBtn.disabled = false;
    }
  });

  // ── Actions enable/disable based on a second file being present ──
  function syncActions() {
    const has2 = !!secondZone.getFile();
    xfadeBtn.disabled = acrossBtn.disabled = muxBtn.disabled = !has2;
  }

  function showResult(r) {
    result.innerHTML = '';
    const a = document.createElement('a');
    a.href = r.url; a.download = r.filename; a.className = 'media-tx-download';
    a.textContent = 'Download ' + r.filename + ' (' + (r.bytes / 1048576).toFixed(1) + ' MB)';
    result.appendChild(a); result.hidden = false;
    a.click();
  }

  async function runOp(opId, extra) {
    operating = true;
    status.textContent = 'Loading ffmpeg…';
    [trimBtn, fadeBtn, xfadeBtn, acrossBtn, muxBtn].forEach((b) => { b.disabled = true; });
    try {
      const ff = await loadFfmpeg(({ ratio }) => {
        status.textContent = 'Encoding… ' + Math.round((ratio || 0) * 100) + '%';
      });
      ffInstance = ff;
      const params = { ...extra };
      const r = await runOperation(ff, opId, params, intake);
      blobUrls.push(r.url);
      status.textContent = 'Done.';
      showResult(r);
      if (onNewUrl && /\.(mp4|m4a)$/.test(r.filename)) onNewUrl(r.url);
    } catch (err) {
      status.textContent = 'Error: ' + (err.message || String(err)).split('\n')[0];
    } finally {
      ffInstance = null;
      operating = false;
      syncActions();
      [trimBtn, fadeBtn, xfadeBtn, acrossBtn, muxBtn].forEach((b) => { b.disabled = false; });
      syncActions();
      syncStatusLine();
    }
  }

  trimBtn.addEventListener('click', () => {
    const d = dur();
    const t = clampTrimRange(trimIn, trimOut > 0 ? trimOut : d, d, 0.01);
    runOp('trim', {
      start: hms(t.start),
      end: hms(t.end || d),
      precise: false,
    });
  });

  // Fade-to-black uses the existing single-clip 'videofade' op (in = trimIn? no — fade is at
  // clip edges). We pass a default 1s in/out so the button is one-click meaningful.
  fadeBtn.addEventListener('click', () => runOp('videofade',
    { fadeIn: Number(durInput.value) || 1, fadeOut: Number(durInput.value) || 1, duration: dur() }));
  xfadeBtn.addEventListener('click', () => runOp('xfade',
    { secondary: secondZone.getFile(), durationA: dur(), transition: transSel.value, duration: Number(durInput.value) || 1 }));
  acrossBtn.addEventListener('click', () => runOp('acrossfade',
    { secondary: secondZone.getFile(), duration: Number(durInput.value) || 1 }));
  muxBtn.addEventListener('click', () => runOp('muxmusic',
    { secondary: secondZone.getFile(), musicGain: 0.35 }));

  syncTrackDims();
  syncStatusLine();
  syncActions();

  return {
    destroy() {
      operating = false;
      if (ffInstance) { try { ffInstance.exit(); } catch { /* ignore */ } ffInstance = null; }
      mediaEl.removeEventListener('loadedmetadata', syncFromMetadata);
      mediaEl.removeEventListener('timeupdate', syncFromPlayhead);
      mediaEl.removeEventListener('seeked', syncFromPlayhead);
      window.removeEventListener('resize', onWindowResize);
      for (const u of blobUrls) { try { URL.revokeObjectURL(u); } catch { /* ignore */ } }
      blobUrls.length = 0;
      wrap.remove();
    },
    // Exposed for callers that want to read the visual-trim region (in HH:MM:SS) — wires
    // into the existing 'trim' op contract. trimOut=0 → end-of-file.
    getTrim() {
      const d = dur();
      const t = clampTrimRange(trimIn, trimOut > 0 ? trimOut : d, d, 0.01);
      return { start: hms(t.start), end: hms(t.end || d) };
    },
  };
}
