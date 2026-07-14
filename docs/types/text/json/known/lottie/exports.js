import { downloadBlob } from '../../../../../core/exports.js';
import { intakeFromFile } from '../../../../../core/intake.js';
import {
  LOTTIE_EXPORT_LIMITS,
  authoredFramePositions,
  frameFilename,
  gifFrameSchedule,
  normalizeColor,
  normalizeFps,
  normalizeScale,
  rasterCacheKey,
  validateExportJob,
} from './export-model.js';
import { createRasterProcessor, exportAbortError, packagePngZip } from './export-processors.js';

function button(label, className, title = '') {
  const element = document.createElement('button');
  element.type = 'button'; element.className = className; element.textContent = label;
  if (title) element.title = title;
  return element;
}

function field(labelText, input) {
  const label = document.createElement('label');
  label.className = 'lottie-export-field';
  const text = document.createElement('span'); text.textContent = labelText;
  label.append(text, input);
  return label;
}

function sourceBase(filename) {
  const name = String(filename || 'animation').split('/').pop() || 'animation';
  return name.replace(/\.[^.]+$/, '') || 'animation';
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw exportAbortError();
}

export function mountLottieExports({
  controls, summary, filename, getPlayer, getPlaybackMode, openIntake,
}) {
  const baseName = sourceBase(filename);
  const toggle = button('Export options', 'lottie-export-toggle', 'Split frames or export this Lottie animation');
  toggle.setAttribute('aria-expanded', 'false');
  controls.appendChild(toggle);

  const panel = document.createElement('section'); panel.className = 'lottie-export-panel'; panel.hidden = true;
  const settings = document.createElement('div'); settings.className = 'lottie-export-settings';
  const scale = document.createElement('input'); scale.className = 'lottie-export-scale'; scale.type = 'number'; scale.min = '10'; scale.max = '400'; scale.step = '1'; scale.value = '100'; scale.setAttribute('aria-label', 'Export scale percent');
  const scaleSuffix = document.createElement('span'); scaleSuffix.className = 'lottie-export-suffix'; scaleSuffix.textContent = '%';
  const scaleWrap = document.createElement('span'); scaleWrap.className = 'lottie-export-number'; scaleWrap.append(scale, scaleSuffix);
  const fps = document.createElement('input'); fps.className = 'lottie-export-fps'; fps.type = 'number'; fps.min = '1'; fps.max = '100'; fps.step = '0.01'; fps.value = String(normalizeFps(summary.fps, summary.fps)); fps.setAttribute('aria-label', 'GIF frames per second');
  const background = document.createElement('select'); background.className = 'lottie-export-background'; background.setAttribute('aria-label', 'Export background');
  for (const [value, text] of [['transparent', 'Transparent'], ['solid', 'Solid color']]) {
    const option = document.createElement('option'); option.value = value; option.textContent = text; background.appendChild(option);
  }
  const color = document.createElement('input'); color.className = 'lottie-export-color'; color.type = 'color'; color.value = '#ffffff'; color.disabled = true; color.setAttribute('aria-label', 'Solid export background color');
  const backgroundWrap = document.createElement('span'); backgroundWrap.className = 'lottie-export-background-wrap'; backgroundWrap.append(background, color);
  const loopLabel = document.createElement('label'); loopLabel.className = 'lottie-export-loop';
  const loop = document.createElement('input'); loop.type = 'checkbox'; loop.className = 'lottie-export-loop-check';
  loopLabel.append(loop, document.createTextNode(' Loop GIF'));
  settings.append(field('Scale', scaleWrap), field('GIF FPS', fps), field('Background', backgroundWrap), loopLabel);

  const actions = document.createElement('div'); actions.className = 'lottie-export-actions';
  const split = button('✂ Split frames', 'lottie-export-split', 'Show authored frames as PNG files in the sidebar');
  const zip = button('⬇ Frames ZIP', 'lottie-export-zip', 'Download every authored frame as PNG in a ZIP');
  const gif = button('⬇ Export GIF', 'lottie-export-gif', 'Render this Lottie animation as a GIF');
  const cancel = button('Cancel', 'lottie-export-cancel'); cancel.hidden = true;
  actions.append(split, zip, gif, cancel);
  const progress = document.createElement('progress'); progress.className = 'lottie-export-progress'; progress.max = 1; progress.value = 0; progress.hidden = true;
  const status = document.createElement('div'); status.className = 'lottie-export-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); status.textContent = 'Export actions become available when the animation is ready.';
  const framesBox = document.createElement('div'); framesBox.className = 'lottie-export-frames'; framesBox.hidden = true;
  panel.append(settings, actions, progress, status, framesBox);
  controls.after(panel);

  const actionButtons = [split, zip, gif];
  const settingInputs = [scale, fps, background, color, loop];
  let ready = false;
  let destroyed = false;
  let active = null;
  let nextJobId = 0;
  let pngCache = null;
  let loopInitialized = false;
  let objectUrls = [];

  function setStatus(text) { status.textContent = text; }

  function syncDisabled() {
    const busy = !!active;
    for (const control of settingInputs) control.disabled = busy || (control === color && background.value !== 'solid');
    for (const control of actionButtons) control.disabled = busy || !ready;
    cancel.hidden = !busy;
    progress.hidden = !busy;
  }

  function currentSettings() {
    scale.value = String(normalizeScale(scale.value));
    fps.value = String(normalizeFps(fps.value, summary.fps));
    color.value = normalizeColor(color.value);
    return {
      scale: Number(scale.value),
      fps: Number(fps.value),
      backgroundMode: background.value === 'solid' ? 'solid' : 'transparent',
      color: normalizeColor(color.value),
      loop: loop.checked,
    };
  }

  function clearInlineFrames() {
    for (const url of objectUrls) URL.revokeObjectURL(url);
    objectUrls = [];
    framesBox.replaceChildren(); framesBox.hidden = true;
  }

  function invalidatePngCache() {
    pngCache = null;
  }

  function progressText(done, total, verb = 'Rendering') {
    progress.max = total; progress.value = done;
    setStatus(`${verb} frame ${done.toLocaleString()} of ${total.toLocaleString()}…`);
  }

  async function capture(job, positions, exportSettings, metrics, mode) {
    const player = getPlayer();
    if (!player) throw new Error('The Lottie player is not ready.');
    const processor = await createRasterProcessor({
      jobId: job.id,
      mode,
      width: metrics.width,
      height: metrics.height,
      transparent: exportSettings.backgroundMode === 'transparent',
      repeat: exportSettings.loop ? 0 : -1,
      minDelayMs: 10,
      byteLimit: LOTTIE_EXPORT_LIMITS.maxGeneratedBytes,
    });
    job.player = player; job.processor = processor;
    try {
      throwIfAborted(job.controller.signal);
      await player.startExport({
        jobId: job.id,
        width: metrics.width,
        height: metrics.height,
        background: exportSettings.backgroundMode === 'solid' ? exportSettings.color : '',
      });
      const blobs = [];
      for (let index = 0; index < positions.length; index += 1) {
        throwIfAborted(job.controller.signal);
        const position = positions[index];
        const raster = await player.captureExportFrame(job.id, index, position.relativeFrame);
        if (job.controller.signal.aborted) {
          raster.bitmap?.close?.();
          throw exportAbortError();
        }
        if (raster.width !== metrics.width || raster.height !== metrics.height) {
          raster.bitmap?.close?.();
          throw new Error(`The sandbox returned ${raster.width} × ${raster.height}, expected ${metrics.width} × ${metrics.height}.`);
        }
        const blob = await processor.addFrame(raster, { index, delayMs: position.delayMs });
        if (blob) blobs.push(blob);
        progressText(index + 1, positions.length);
      }
      const output = await processor.finish();
      job.processor = null;
      player.endExport(job.id); job.player = null;
      return { blobs, output };
    } catch (error) {
      player.endExport(job.id); job.player = null;
      processor.cancel(); job.processor = null;
      if (job.controller.signal.aborted) throw exportAbortError();
      throw error;
    }
  }

  async function ensurePngFrames(job, exportSettings, metrics) {
    const key = rasterCacheKey(exportSettings);
    if (pngCache?.key === key) {
      setStatus(`Using ${pngCache.blobs.length.toLocaleString()} already-rendered PNG frames…`);
      return pngCache.blobs;
    }
    const positions = authoredFramePositions(summary);
    const { blobs } = await capture(job, positions, exportSettings, metrics, 'png');
    throwIfAborted(job.controller.signal);
    pngCache = { key, blobs };
    return blobs;
  }

  function frameEntries(blobs) {
    return blobs.map((blob, index) => ({ name: frameFilename(index, blobs.length), blob }));
  }

  async function frameIntake(entry) {
    return intakeFromFile(new File([entry.blob], entry.name, { type: 'image/png' }));
  }

  async function showInlineFrames(entries) {
    clearInlineFrames(); framesBox.hidden = false;
    const heading = document.createElement('strong'); heading.textContent = 'Frames'; framesBox.appendChild(heading);
    for (const entry of entries) {
      const url = URL.createObjectURL(entry.blob); objectUrls.push(url);
      const row = document.createElement('div'); row.className = 'lottie-export-frame';
      const thumb = document.createElement('img'); thumb.src = url; thumb.alt = entry.name;
      const label = document.createElement('span'); label.textContent = entry.name;
      const download = document.createElement('a'); download.href = url; download.download = entry.name; download.textContent = '⬇ Download';
      const open = button('↗ Open', 'lottie-export-open'); open.disabled = typeof openIntake !== 'function';
      open.addEventListener('click', async () => openIntake?.(await frameIntake(entry)));
      row.append(thumb, label, download, open); framesBox.appendChild(row);
    }
  }

  async function publishFrames(entries) {
    const expand = window.__fv?.expandFileRootToFolder;
    if (typeof expand === 'function') {
      const byName = new Map(entries.map((entry) => [entry.name, entry]));
      const expanded = expand({
        entries: entries.map((entry) => ({ name: entry.name, size: entry.blob.size })),
        getIntake: async (innerPath) => byName.has(innerPath) ? frameIntake(byName.get(innerPath)) : null,
      });
      if (expanded) { clearInlineFrames(); return true; }
    }
    await showInlineFrames(entries);
    return false;
  }

  async function runJob(label, operation) {
    if (active || destroyed) return;
    const job = { id: `lottie-${++nextJobId}`, controller: new AbortController(), player: null, processor: null };
    active = job; progress.value = 0; setStatus(label); syncDisabled();
    try {
      await operation(job);
    } catch (error) {
      if (error?.name === 'AbortError' || job.controller.signal.aborted) setStatus('Export cancelled.');
      else setStatus(`Export failed: ${error?.message || String(error)}`);
    } finally {
      job.player?.endExport(job.id); job.processor?.cancel();
      if (active === job) active = null;
      syncDisabled();
    }
  }

  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden && !loopInitialized) {
      loop.checked = getPlaybackMode() === 'loop';
      loopInitialized = true;
    }
  });
  background.addEventListener('change', () => { color.disabled = background.value !== 'solid' || !!active; invalidatePngCache(); });
  scale.addEventListener('change', () => { scale.value = String(normalizeScale(scale.value)); invalidatePngCache(); });
  color.addEventListener('change', () => { color.value = normalizeColor(color.value); invalidatePngCache(); });
  fps.addEventListener('change', () => { fps.value = String(normalizeFps(fps.value, summary.fps)); });
  cancel.addEventListener('click', () => {
    if (!active) return;
    active.controller.abort(); active.player?.endExport(active.id); active.processor?.cancel();
  });

  split.addEventListener('click', () => runJob('Preparing authored frames…', async (job) => {
    const exportSettings = currentSettings();
    const metrics = validateExportJob(summary, { action: 'split', ...exportSettings });
    if (!metrics.ok) throw new Error(metrics.reason);
    const blobs = await ensurePngFrames(job, exportSettings, metrics);
    throwIfAborted(job.controller.signal);
    const expanded = await publishFrames(frameEntries(blobs));
    setStatus(`${blobs.length.toLocaleString()} PNG frames ${expanded ? 'added beneath this file in the sidebar.' : 'shown below.'}`);
  }));

  zip.addEventListener('click', () => runJob('Preparing authored frames…', async (job) => {
    const exportSettings = currentSettings();
    const metrics = validateExportJob(summary, { action: 'zip', ...exportSettings });
    if (!metrics.ok) throw new Error(metrics.reason);
    const blobs = await ensurePngFrames(job, exportSettings, metrics);
    throwIfAborted(job.controller.signal);
    const entries = frameEntries(blobs);
    progress.max = 1; progress.value = 0; setStatus('Packaging PNG frames…');
    const blob = await packagePngZip(entries, LOTTIE_EXPORT_LIMITS.maxGeneratedBytes, { signal: job.controller.signal });
    throwIfAborted(job.controller.signal);
    downloadBlob(blob, `${baseName}-frames.zip`, 'application/zip');
    progress.value = 1; setStatus(`Downloaded ${entries.length.toLocaleString()} PNG frames.`);
  }));

  gif.addEventListener('click', () => runJob('Preparing GIF export…', async (job) => {
    const exportSettings = currentSettings();
    const metrics = validateExportJob(summary, { action: 'gif', ...exportSettings });
    if (!metrics.ok) throw new Error(metrics.reason);
    const schedule = gifFrameSchedule(summary, exportSettings.fps);
    const { output } = await capture(job, schedule, exportSettings, metrics, 'gif');
    throwIfAborted(job.controller.signal);
    downloadBlob(output, `${baseName}.gif`, 'image/gif');
    setStatus(`Downloaded a ${schedule.length.toLocaleString()}-frame GIF at ${exportSettings.fps} fps.`);
  }));

  syncDisabled();
  return {
    panel,
    setReady(value) {
      ready = !!value;
      if (ready && !active) setStatus('Ready to split frames or export a GIF.');
      else if (!ready && !active) setStatus('Export actions become available when the animation is ready.');
      syncDisabled();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      active?.controller.abort(); active?.player?.endExport(active.id); active?.processor?.cancel(); active = null;
      clearInlineFrames(); pngCache = null; panel.remove(); toggle.remove();
    },
  };
}
