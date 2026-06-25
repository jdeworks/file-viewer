function makeSpan(className, text) {
  const span = document.createElement('span');
  if (className) span.className = className;
  if (text !== undefined) span.textContent = text;
  return span;
}

export function buildExportProgress() {
  const progressArea = document.createElement('div');
  progressArea.className = 'media-ed-progress-area';
  progressArea.hidden = true;

  const progressBar = document.createElement('progress');
  progressBar.max = 100;
  progressBar.value = 0;
  progressBar.className = 'media-ed-progress';

  const progressPct = makeSpan('media-ed-pct', '0%');
  const progressMsg = makeSpan('media-ed-msg', 'Working…');

  progressArea.append(progressBar, progressPct, progressMsg);

  const resultArea = document.createElement('div');
  resultArea.className = 'media-ed-result';
  resultArea.hidden = true;

  function clearResult() {
    resultArea.innerHTML = '';
    resultArea.hidden = true;
  }

  function setProgressRatio(ratio, message) {
    const pct = Math.round(Math.max(0, Math.min(1, isFinite(ratio) ? ratio : 0)) * 100);
    progressBar.value = pct;
    progressPct.textContent = pct + '%';
    if (message) progressMsg.textContent = message;
  }

  function setRunning(running, message = 'Loading ffmpeg…') {
    progressArea.hidden = !running;
    if (!running) return;
    progressBar.value = 0;
    progressPct.textContent = '0%';
    progressMsg.textContent = message;
  }

  function showResult(url, filename, sizeBytes) {
    clearResult();
    const msg = makeSpan('media-ed-done', `Done — ${(sizeBytes / 1048576).toFixed(1)} MB`);
    const dl = document.createElement('a');
    dl.href = url;
    dl.download = filename;
    dl.className = 'media-tx-download';
    dl.textContent = 'Download ' + filename;
    resultArea.append(msg, dl);
    resultArea.hidden = false;
    dl.click();
  }

  function showError(msg) {
    clearResult();
    const lines = String(msg).split('\n');
    const err = makeSpan('media-ed-error', `Error: ${lines[0]}`);
    resultArea.append(err);
    const detail = lines.slice(1).join('\n').trim();
    if (detail) {
      const pre = document.createElement('pre');
      pre.className = 'media-ed-error-detail';
      pre.textContent = detail;
      resultArea.append(pre);
    }
    resultArea.hidden = false;
  }

  return {
    progressArea,
    progressPct,
    progressMsg,
    progressBar,
    resultArea,
    clearResult,
    setProgressRatio,
    setRunning,
    showResult,
    showError,
  };
}
