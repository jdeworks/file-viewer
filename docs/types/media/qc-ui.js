// P8b/P8e — Audiobook ACX QC panel: pass/fail report card + one-click compliant
// export. CPU-lazy: nothing decodes or loads ffmpeg until the user clicks a button.
//
// mountAcxQcPanel(panel, intake, mediaEl) → { destroy() }. Vanilla DOM, media-ed-*
// class conventions. The decode is read-only (no ffmpeg); the export uses the
// `acxExport` transcoder op and re-runs QC on the OUTPUT to confirm a pass.

import { analyzeMetrics, evaluateAcx, acxVerdict } from './qc.js';

// Decode an audio File/bytes to channel Float32Arrays. decodeAudioData reads the
// whole buffer (fine for typical chapters; a multi-hour book would be chunked, noted
// as a follow-up). Closes the context after to free memory.
async function decodeFile(intake) {
  const buf = intake.file ? await intake.file.arrayBuffer()
    : (intake.bytes?.buffer ? intake.bytes.buffer : intake.bytes);
  const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext
    || window.AudioContext || window.webkitAudioContext;
  if (!AC) throw new Error('WebAudio is unavailable in this browser.');
  // A throwaway AudioContext just for decodeAudioData (OfflineAudioContext needs a length).
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const audio = await ctx.decodeAudioData(buf.slice ? buf.slice(0) : buf);
    const channels = [];
    for (let c = 0; c < audio.numberOfChannels; c++) channels.push(audio.getChannelData(c));
    return { channels, fs: audio.sampleRate, duration: audio.duration };
  } finally {
    try { await ctx.close(); } catch { /* ignore */ }
  }
}

const VERDICT_TEXT = { pass: '✓ ACX-compliant', warn: '⚠ Borderline — review the amber rows', fail: '✕ Not ACX-compliant' };

function renderCard(host, rows, verdict) {
  host.innerHTML = '';
  const v = document.createElement('div');
  v.className = 'media-qc-verdict media-qc-' + verdict;
  v.textContent = VERDICT_TEXT[verdict] || '';
  host.appendChild(v);
  const table = document.createElement('table');
  table.className = 'media-qc-table';
  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.className = 'media-qc-row media-qc-' + r.status;
    tr.dataset.metric = r.key;
    const dot = document.createElement('td'); dot.className = 'media-qc-dot media-qc-dot-' + r.status;
    dot.textContent = r.status === 'pass' ? '●' : (r.status === 'warn' ? '●' : '●');
    const name = document.createElement('td'); name.className = 'media-qc-metric'; name.textContent = r.label;
    const val = document.createElement('td'); val.className = 'media-qc-value'; val.textContent = r.value;
    tr.append(dot, name, val);
    table.appendChild(tr);
    if (r.status !== 'pass') {
      const fixTr = document.createElement('tr');
      fixTr.className = 'media-qc-fixrow';
      const fixTd = document.createElement('td'); fixTd.colSpan = 3;
      fixTd.className = 'media-qc-fix'; fixTd.textContent = r.fix;
      fixTr.appendChild(fixTd); table.appendChild(fixTr);
    }
  }
  host.appendChild(table);
}

export function mountAcxQcPanel(panel, intake, mediaEl) {
  panel.classList.add('media-qc-panel');
  const blobUrls = [];

  const intro = document.createElement('p');
  intro.className = 'media-ed-note';
  intro.textContent = 'Check this file against the Audible/ACX spec (RMS, peak, '
    + 'noise floor, format, head/tail silence) — all in-browser, no upload. '
    + 'The noise floor is the #1 ACX rejection reason.';
  panel.appendChild(intro);

  const actions = document.createElement('div');
  actions.className = 'media-ed-actions';
  const runBtn = document.createElement('button');
  runBtn.type = 'button'; runBtn.className = 'media-ed-btn media-qc-run';
  runBtn.textContent = 'Run QC';
  const exportBtn = document.createElement('button');
  exportBtn.type = 'button'; exportBtn.className = 'media-ed-btn media-qc-export';
  exportBtn.textContent = 'Export for ACX';
  exportBtn.title = 'Make this file ACX-compliant: −20 LUFS / −3 dBTP, silence-cut + '
    + 'room-tone, mono 44.1 kHz MP3 192 k CBR (needs the media editor / ffmpeg).';
  actions.append(runBtn, exportBtn);
  panel.appendChild(actions);

  const status = document.createElement('div');
  status.className = 'media-ed-msg media-qc-status'; status.hidden = true;
  panel.appendChild(status);

  const card = document.createElement('div');
  card.className = 'media-qc-card'; card.hidden = true;
  panel.appendChild(card);

  const result = document.createElement('div');
  result.className = 'media-ed-result media-qc-result'; result.hidden = true;
  panel.appendChild(result);

  function setStatus(msg) { status.textContent = msg; status.hidden = !msg; }

  async function analyzeIntake(target) {
    const { channels, fs, duration } = await decodeFile(target);
    const metrics = analyzeMetrics(channels, fs, { sampleRate: fs, channels: channels.length, duration });
    const rows = evaluateAcx(metrics);
    return { rows, verdict: acxVerdict(rows) };
  }

  async function runQc() {
    runBtn.disabled = true; exportBtn.disabled = true;
    setStatus('Decoding + analyzing…'); card.hidden = true;
    try {
      const { rows, verdict } = await analyzeIntake(intake);
      renderCard(card, rows, verdict); card.hidden = false;
      setStatus('');
    } catch (err) {
      setStatus('QC failed: ' + (err.message || String(err)));
    } finally {
      runBtn.disabled = false; exportBtn.disabled = false;
    }
  }

  async function exportAcx() {
    runBtn.disabled = true; exportBtn.disabled = true;
    result.hidden = true; result.innerHTML = '';
    setStatus('Loading ffmpeg + encoding (mono 44.1 k MP3 192 k CBR)…');
    try {
      const { loadFfmpeg, runOperation } = await import('./transcoder.js');
      const ff = await loadFfmpeg(({ ratio }) => {
        if (ratio) setStatus('Encoding… ' + Math.round(ratio * 100) + '%');
      });
      const out = await runOperation(ff, 'acxExport', {}, intake);
      blobUrls.push(out.url);
      setStatus('Re-checking the exported file…');
      // Re-run QC on the OUTPUT to confirm it now passes.
      let postVerdict = null;
      try {
        const blob = await (await fetch(out.url)).blob();
        const post = await analyzeIntake({ file: new File([blob], out.filename) });
        renderCard(card, post.rows, post.verdict); card.hidden = false;
        postVerdict = post.verdict;
      } catch { /* card stays on the source analysis */ }
      result.innerHTML = '';
      const done = document.createElement('span');
      done.className = 'media-ed-done';
      done.textContent = 'Exported ' + out.filename + ' (' + (out.bytes / 1048576).toFixed(1) + ' MB)'
        + (postVerdict === 'pass' ? ' — verified ACX-compliant.' : '.');
      const dl = document.createElement('a');
      dl.href = out.url; dl.download = out.filename; dl.className = 'media-tx-download';
      dl.textContent = 'Download ' + out.filename;
      result.append(done, dl); result.hidden = false;
      setStatus('');
      dl.click();
    } catch (err) {
      const m = err.message || String(err);
      setStatus(/loadGlobal|ffmpeg|FFmpeg|vendor/.test(m)
        ? 'Enable the media editor (Settings → Advanced) to run the ACX export.'
        : 'Export failed: ' + m);
    } finally {
      runBtn.disabled = false; exportBtn.disabled = false;
    }
  }

  runBtn.addEventListener('click', runQc);
  exportBtn.addEventListener('click', exportAcx);

  return {
    destroy() {
      for (const u of blobUrls) { try { URL.revokeObjectURL(u); } catch { /* ignore */ } }
      blobUrls.length = 0;
    },
  };
}
