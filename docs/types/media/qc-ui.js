// P8b/P8e — Audiobook ACX QC panel: pass/fail report card + one-click compliant
// export. CPU-lazy: nothing decodes or loads ffmpeg until the user clicks a button.
//
// mountAcxQcPanel(panel, intake, mediaEl) → { destroy() }. Vanilla DOM, media-ed-*
// class conventions. The decode is read-only (no ffmpeg); the export uses the
// `acxExport` transcoder op and re-runs QC on the OUTPUT to confirm a pass.

import { analyzeMetrics, evaluateAcx, acxVerdict } from './qc.js';

const CHECKS = [
  { key: 'rms', label: 'RMS' },
  { key: 'lufs', label: 'Integrated LUFS' },
  { key: 'peak', label: 'Sample peak' },
  { key: 'truePeak', label: 'Estimated true peak' },
  { key: 'noise', label: 'Noise floor' },
  { key: 'sr', label: 'Sample rate' },
  { key: 'ch', label: 'Channels' },
  { key: 'head', label: 'Head silence' },
  { key: 'tail', label: 'Tail silence' },
];

const STATUS_TEXT = {
  pass: 'PASS',
  warn: 'Review',
  fail: 'Fix',
};

const VERDICT_TEXT = {
  pass: '✓ ACX-compliant',
  warn: '⚠ Borderline — review the amber rows',
  fail: '✕ Not ACX-compliant',
};

// Decode an audio File/bytes to channel Float32Arrays. decodeAudioData reads the
// whole buffer (fine for typical chapters; a multi-hour book would be chunked, noted
// as a follow-up). Closes the context after to free memory.
async function decodeFile(intake) {
  const buf = intake.file
    ? await intake.file.arrayBuffer()
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

function statusText(status) {
  return STATUS_TEXT[status] || 'Review';
}

function renderPendingChecklist(container) {
  container.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'media-qc-checklist-list';
  for (const item of CHECKS) {
    const row = document.createElement('div');
    row.className = 'media-qc-checklist-item';
    const b = document.createElement('span');
    b.className = 'media-qc-checklist-badge';
    b.textContent = '◯';
    const label = document.createElement('span');
    label.className = 'media-qc-checklist-label';
    label.textContent = item.label;
    row.append(b, label);
    list.appendChild(row);
  }
  container.appendChild(list);
}

function renderCard(host, rows, verdict) {
  host.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'media-qc-header';
  const title = document.createElement('div');
  title.className = 'media-qc-title';
  title.textContent = 'ACX report';
  const state = document.createElement('div');
  state.className = 'media-qc-substatus';
  state.textContent = 'Complete';

  const v = document.createElement('div');
  v.className = 'media-qc-verdict media-qc-' + verdict;
  v.textContent = VERDICT_TEXT[verdict] || '';
  header.append(title, state, v);

  const table = document.createElement('table');
  table.className = 'media-qc-table';
  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.className = 'media-qc-row media-qc-' + r.status;
    tr.dataset.metric = r.key;

    const dot = document.createElement('td');
    dot.className = 'media-qc-dot media-qc-dot-' + r.status;
    dot.textContent = r.status === 'pass' ? '●' : (r.status === 'warn' ? '●' : '●');

    const name = document.createElement('td');
    name.className = 'media-qc-metric';
    name.textContent = r.label;

    const val = document.createElement('td');
    val.className = 'media-qc-value';
    val.textContent = r.value;

    const action = document.createElement('td');
    action.className = 'media-qc-action';
    action.textContent = statusText(r.status);

    tr.append(dot, name, val, action);
    table.appendChild(tr);

    if (r.status !== 'pass') {
      const fixTr = document.createElement('tr');
      fixTr.className = 'media-qc-fixrow';
      const fixTd = document.createElement('td');
      fixTd.colSpan = 4;
      fixTd.className = 'media-qc-fix';
      fixTd.textContent = r.fix;
      fixTr.appendChild(fixTd);
      table.appendChild(fixTr);
    }
  }

  host.append(header, table);
}

function renderQueuedState(host, checklistHost) {
  host.innerHTML = '';
  const ready = document.createElement('div');
  ready.className = 'media-qc-ready';
  ready.textContent = 'Ready';
  host.append(ready);
  renderPendingChecklist(checklistHost);
}

export function mountAcxQcPanel(panel, intake) {
  panel.classList.add('media-qc-panel');
  const blobUrls = [];

  const card = document.createElement('div');
  card.className = 'media-qc-card';

  const shellHead = document.createElement('div');
  shellHead.className = 'media-qc-shell-head';
  const shellTitle = document.createElement('div');
  shellTitle.className = 'media-qc-shell-title';
  shellTitle.textContent = 'ACX QC';
  const shellStatus = document.createElement('div');
  shellStatus.className = 'media-qc-shell-status';
  shellStatus.textContent = 'Ready for analysis';
  shellHead.append(shellTitle, shellStatus);

  const checklist = document.createElement('div');
  checklist.className = 'media-qc-checklist';

  const reportWrap = document.createElement('div');
  reportWrap.className = 'media-qc-report';

  const actions = document.createElement('div');
  actions.className = 'media-ed-actions media-qc-actions';

  const runBtn = document.createElement('button');
  runBtn.type = 'button';
  runBtn.className = 'media-ed-btn media-qc-run';
  runBtn.textContent = 'Run QC';

  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'media-ed-btn media-qc-export';
  exportBtn.textContent = 'Export for ACX';

  const exportHint = document.createElement('div');
  exportHint.className = 'media-qc-export-hint';
  exportHint.textContent = 'Export target: mono 44.1 kHz MP3 192k CBR, loudnorm −20 LUFS / TP −3 dBTP (QC true peak is estimated)';

  const status = document.createElement('div');
  status.className = 'media-ed-msg media-qc-status';
  status.hidden = true;

  const result = document.createElement('div');
  result.className = 'media-ed-result media-qc-result';
  result.hidden = true;

  actions.append(runBtn, exportBtn);
  card.append(shellHead, checklist, reportWrap, actions, exportHint);
  panel.append(card, status, result);

  function setStatus(msg) {
    status.textContent = msg;
    status.hidden = !msg;
  }

  async function analyzeIntake(target) {
    const { channels, fs, duration } = await decodeFile(target);
    const metrics = analyzeMetrics(channels, fs, { sampleRate: fs, channels: channels.length, duration });
    const rows = evaluateAcx(metrics);
    return { rows, verdict: acxVerdict(rows) };
  }

  async function runQc() {
    runBtn.disabled = true;
    exportBtn.disabled = true;
    shellStatus.textContent = 'Analyzing…';
    result.hidden = true;
    result.innerHTML = '';
    setStatus('Decoding + analyzing…');
    try {
      const { rows, verdict } = await analyzeIntake(intake);
      shellStatus.textContent = 'Report ready';
      renderCard(reportWrap, rows, verdict);
      setStatus('');
    } catch (err) {
      shellStatus.textContent = 'Ready for analysis';
      renderQueuedState(reportWrap, checklist);
      setStatus('QC failed: ' + (err.message || String(err)));
    } finally {
      runBtn.disabled = false;
      exportBtn.disabled = false;
    }
  }

  async function exportAcx() {
    runBtn.disabled = true;
    exportBtn.disabled = true;
    result.hidden = true;
    result.innerHTML = '';
    setStatus('Loading ffmpeg + encoding (mono 44.1 k MP3 192 k CBR)…');
    try {
      const { classifyFfmpegError, loadFfmpeg, runOperation } = await import('./transcoder.js');
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
        renderCard(reportWrap, post.rows, post.verdict);
        shellStatus.textContent = 'Report ready';
        postVerdict = post.verdict;
      } catch { /* card stays on the source analysis */ }
      result.innerHTML = '';
      const done = document.createElement('span');
      done.className = 'media-ed-done';
      done.textContent = 'Exported ' + out.filename + ' (' + (out.bytes / 1048576).toFixed(1) + ' MB)'
        + (postVerdict === 'pass' ? ' — verified ACX-compliant.' : '.');
      const dl = document.createElement('a');
      dl.href = out.url;
      dl.download = out.filename;
      dl.className = 'media-tx-download';
      dl.textContent = 'Download ' + out.filename;
      result.append(done, dl);
      result.hidden = false;
      setStatus('');
      dl.click();
    } catch (err) {
      const m = err.message || String(err);
      const { headline } = classifyFfmpegError(err);
      setStatus(/loadGlobal|ffmpeg|FFmpeg|vendor/.test(m)
        ? 'Enable the media editor (Settings → Advanced) to run the ACX export.'
        : 'Export failed: ' + (headline || m));
    } finally {
      runBtn.disabled = false;
      exportBtn.disabled = false;
    }
  }

  runBtn.addEventListener('click', runQc);
  exportBtn.addEventListener('click', exportAcx);

  renderQueuedState(reportWrap, checklist);

  return {
    destroy() {
      for (const u of blobUrls) {
        try { URL.revokeObjectURL(u); } catch { /* ignore */ }
      }
      blobUrls.length = 0;
    },
  };
}
