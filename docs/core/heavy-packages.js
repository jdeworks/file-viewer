// Opt-in heavy packages (Advanced settings): when the user flips one ON, eagerly download the
// library so it's ready, then offer a "Reload to apply" button that stays DISABLED until the
// download finishes — so nobody reloads mid-download (which would interrupt/restart the fetch)
// and the new capability is picked up cleanly on the next load.
//
// Each entry's load(onProgress) resolves once the library is fully downloaded. onProgress(ratio)
// reports a 0–1 fraction WHEN the loader emits it (ffmpeg's core download is opaque, so it shows
// an indeterminate "Downloading…" until done). Keys with load:null have nothing to pre-fetch
// (emulator engines download per-engine on first use) — their reload button is enabled at once.

export const HEAVY_PACKAGES = {
  enableFfmpeg: {
    label: 'ffmpeg.wasm',
    load: async (onProgress) => {
      // transcoder.js lives in the media lane; we only IMPORT + CALL its existing export.
      const { loadFfmpeg } = await import('../types/media/transcoder.js');
      await loadFfmpeg((p) => { if (p && typeof p.ratio === 'number') onProgress(p.ratio); });
    },
  },
  enableArchiveWasm: {
    label: 'libarchive.wasm',
    load: async () => {
      const { preloadArchiveLib } = await import('./archivelib.js');
      await preloadArchiveLib();
    },
  },
  enableEmulators: {
    label: 'emulator engines',
    load: null,   // per-engine, downloaded on first use — nothing to pre-fetch
  },
};

const MOUNTED = new WeakMap();   // row element -> its .heavy-dl box

// Remove any download/reload affordance from a settings row (called when the toggle goes OFF).
export function unmountHeavyReload(row) {
  const el = MOUNTED.get(row);
  if (el) { el.remove(); MOUNTED.delete(row); }
}

// Mount the download/reload affordance under a settings row whose heavy toggle was just enabled.
export function mountHeavyReload(row, key) {
  unmountHeavyReload(row);
  const pkg = HEAVY_PACKAGES[key];
  if (!pkg) return;

  const box = document.createElement('div');
  box.className = 'heavy-dl';
  const status = document.createElement('span');
  status.className = 'heavy-dl-status';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn small heavy-dl-reload';
  btn.textContent = 'Reload to apply';
  box.append(status, btn);
  row.appendChild(box);
  MOUNTED.set(row, box);

  let reloading = false;
  btn.addEventListener('click', () => {
    if (btn.disabled || reloading) return;
    reloading = true;
    btn.textContent = 'Reloading…';
    location.reload();
  });

  // Nothing to pre-download → reload available immediately.
  if (!pkg.load) {
    status.textContent = 'Enabled.';
    btn.disabled = false;
    return;
  }

  btn.disabled = true;
  status.className = 'heavy-dl-status';
  status.textContent = 'Downloading ' + pkg.label + '…';
  let pct = -1;
  pkg.load((ratio) => {
    if (typeof ratio === 'number' && ratio >= 0 && ratio <= 1) {
      const p = Math.round(ratio * 100);
      if (p !== pct) { pct = p; status.textContent = 'Downloading ' + pkg.label + '… ' + p + '%'; }
    }
  }).then(() => {
    status.className = 'heavy-dl-status done';
    status.textContent = 'Downloaded ✓';
    btn.disabled = false;
  }).catch(() => {
    // Surface the failure but let the user reload to retry (the lib loads lazily on next use too).
    status.className = 'heavy-dl-status error';
    status.textContent = 'Download failed — reload to retry';
    btn.disabled = false;
  });
}
