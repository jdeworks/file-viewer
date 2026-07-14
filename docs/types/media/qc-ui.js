// P8b/P8e — Audiobook ACX QC panel: pass/fail report card + targeted export.
// export. CPU-lazy: nothing decodes or loads ffmpeg until the user clicks a button.
//
// mountAcxQcPanel(panel, intake, mediaEl) → { destroy() }. Vanilla DOM, media-ed-*
// class conventions. The decode is read-only (no ffmpeg); the export uses the
// `acxExport` transcoder op and re-runs the measurable checks on the actual output.

import { analyzeMetrics, evaluateAcx, acxVerdict } from './qc.js';
import { inspectAcxEncoding } from './qc-encoding.js';
import { buildWorkingCopyButton } from './media-working-copy.js';

const CHECKS = [
  { key: 'rms', label: 'RMS' },
  { key: 'lufs', label: 'Integrated LUFS' },
  { key: 'peak', label: 'Sample peak' },
  { key: 'truePeak', label: 'Estimated true peak' },
  { key: 'noise', label: 'Noise floor' },
  { key: 'sr', label: 'Sample rate' },
  { key: 'ch', label: 'Channels' },
  { key: 'format', label: 'Submission format' },
  { key: 'bitrate', label: 'MP3 bitrate mode' },
  { key: 'head', label: 'Quiet head spacing' },
  { key: 'tail', label: 'Quiet tail spacing' },
];

const STATUS_TEXT = {
  pass: 'PASS',
  warn: 'Review',
  fail: 'Fix',
};

const VERDICT_TEXT = {
  pass: '✓ Passes measured ACX checks',
  warn: '⚠ Borderline — review the amber rows',
  fail: '✕ Does not pass measured ACX checks',
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
    return {
      channels,
      fs: audio.sampleRate,
      duration: audio.duration,
      encoding: inspectAcxEncoding(new Uint8Array(buf), intake.filename),
    };
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
    const visualStatus = r.required === false && r.status !== 'pass' ? 'warn' : r.status;
    const tr = document.createElement('tr');
    tr.className = 'media-qc-row media-qc-' + visualStatus;
    tr.dataset.metric = r.key;
    tr.dataset.required = r.required === false ? 'false' : 'true';

    const dot = document.createElement('td');
    dot.className = 'media-qc-dot media-qc-dot-' + visualStatus;
    dot.textContent = '●';

    const name = document.createElement('td');
    name.className = 'media-qc-metric';
    name.textContent = r.label;

    const val = document.createElement('td');
    val.className = 'media-qc-value';
    val.textContent = r.value;

    const action = document.createElement('td');
    action.className = 'media-qc-action';
    action.textContent = r.required === false ? 'Guidance' : statusText(r.status);

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

export function mountAcxQcPanel(panel, intake, _mediaEl, options = {}) {
  panel.classList.add('media-qc-panel');
  const blobUrls = [];

  const card = document.createElement('div');
  card.className = 'media-qc-card';

  const shellHead = document.createElement('div');
  shellHead.className = 'media-qc-shell-head';
  const shellTitle = document.createElement('div');
  shellTitle.className = 'media-qc-shell-title';
  shellTitle.textContent = 'ACX submission checks';
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
  exportBtn.textContent = 'Export ACX-targeted MP3';

  const exportHint = document.createElement('div');
  exportHint.className = 'media-qc-export-hint';
  exportHint.textContent = 'Target: mono 44.1 kHz MP3 192k CBR, loudnorm −20 LUFS / TP −3 dBTP. Existing edge spacing is preserved; the tool does not synthesize room tone.';

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
    const { channels, fs, duration, encoding } = await decodeFile(target);
    const metrics = analyzeMetrics(channels, fs, {
      sampleRate: fs,
      channels: channels.length,
      duration,
      encoding,
    });
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
    setStatus('Loading ffmpeg + encoding (mono 44.1 kHz MP3 192 kbps CBR)…');
    try {
      const { classifyFfmpegError, loadFfmpeg, runOperation } = await import('./transcoder.js');
      const ff = await loadFfmpeg(({ ratio }) => {
        if (ratio) setStatus('Encoding… ' + Math.round(ratio * 100) + '%');
      });
      const out = await runOperation(ff, 'acxExport', {}, intake);
      blobUrls.push(out.url);
      setStatus('Re-checking the exported file…');
      // Re-run QC on the actual output bytes; this still cannot replace listening review or
      // production-wide checks such as keeping every chapter mono/stereo consistently.
      let postVerdict = null;
      try {
        const post = await analyzeIntake({ file: new File([out.blob], out.filename), filename: out.filename });
        renderCard(reportWrap, post.rows, post.verdict);
        shellStatus.textContent = 'Report ready';
        postVerdict = post.verdict;
      } catch { /* card stays on the source analysis */ }
      result.innerHTML = '';
      const done = document.createElement('span');
      done.className = 'media-ed-done';
      done.textContent = 'Exported ' + out.filename + ' (' + (out.bytes / 1048576).toFixed(1) + ' MB)'
        + (postVerdict === 'pass' ? ' — passes the measured single-file checks; listen before submission.' : '.');
      const dl = document.createElement('a');
      dl.href = out.url;
      dl.download = out.filename;
      dl.className = 'media-tx-download';
      dl.textContent = 'Download ' + out.filename;
      result.append(done, dl);
      const workingCopyButton = buildWorkingCopyButton(out, options.workingCopy);
      if (workingCopyButton) result.append(workingCopyButton);
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
