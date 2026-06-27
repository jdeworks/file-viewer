// "OCR → subtitles" control for the video Export panel. Uses the shared, already-shipped OCR
// engine (docs/core/ocr) — we do NOT implement OCR here. tesseract is heavy (~11 MB) and lazy:
// nothing off-origin loads until the user confirms the one-time download and clicks Run.
import { FORMATS, ocrVideo, download, bundleInfo } from '../../core/ocr/index.js';

const INTERVALS = [
  { value: 0.5, label: '0.5 s (dense)' },
  { value: 1, label: '1 s' },
  { value: 2, label: '2 s' },
  { value: 5, label: '5 s' },
  { value: 10, label: '10 s (sparse)' },
];

function baseName(intake) {
  const name = intake?.filename || intake?.file?.name || 'video';
  return name.replace(/\.[^./\\]+$/, '') || 'video';
}

// Build the control. `videoEl` is the <video>; `intake` provides the output base name.
export function buildOcrSubtitlesControl(videoEl, intake) {
  const el = document.createElement('section');
  el.className = 'media-ocr-subs media-ed-block';

  const head = document.createElement('div');
  head.className = 'media-ocr-head';
  head.textContent = 'OCR → subtitles';
  el.appendChild(head);

  const hint = document.createElement('p');
  hint.className = 'media-ed-note';
  hint.textContent = 'Read on-screen text (captions, scoreboards, timestamps) from sampled frames into a subtitle/transcript file. Offline; works on the open video.';
  el.appendChild(hint);

  const row = document.createElement('div');
  row.className = 'media-ocr-row';

  const intervalSel = document.createElement('select');
  intervalSel.className = 'media-ocr-interval';
  intervalSel.title = 'How often to sample a frame';
  for (const opt of INTERVALS) {
    const o = document.createElement('option');
    o.value = String(opt.value);
    o.textContent = opt.label;
    if (opt.value === 2) o.selected = true;
    intervalSel.appendChild(o);
  }
  const intervalLabel = labeled('Sample', intervalSel);

  const formatSel = document.createElement('select');
  formatSel.className = 'media-ocr-format';
  formatSel.title = 'Output format';
  for (const [key, fmt] of Object.entries(FORMATS)) {
    const o = document.createElement('option');
    o.value = key;
    o.textContent = fmt.label;
    if (key === 'srt') o.selected = true;
    formatSel.appendChild(o);
  }
  const formatLabel = labeled('Format', formatSel);

  const digitsWrap = document.createElement('label');
  digitsWrap.className = 'media-ocr-digits-label';
  const digits = document.createElement('input');
  digits.type = 'checkbox';
  digits.className = 'media-ocr-digits';
  digitsWrap.append(digits, document.createTextNode(' digits only'));

  const runBtn = button('Run OCR', 'media-ocr-run media-ed-run');
  const cancelBtn = button('Cancel', 'media-ocr-cancel media-ed-cancel');
  cancelBtn.hidden = true;

  row.append(intervalLabel, formatLabel, digitsWrap, runBtn, cancelBtn);
  el.appendChild(row);

  const status = document.createElement('div');
  status.className = 'media-ocr-status media-ed-note';
  status.hidden = true;
  el.appendChild(status);

  let confirmed = false;
  let controller = null;

  const setStatus = (text) => { status.hidden = !text; status.textContent = text || ''; };

  runBtn.addEventListener('click', () => {
    if (controller) return; // already running
    if (!confirmed) { showOptIn(); return; }
    void run();
  });
  cancelBtn.addEventListener('click', () => { controller?.abort(); });

  // One-time opt-in note before the first heavy download (mirrors the ruffle confirm gate).
  function showOptIn() {
    const note = document.createElement('div');
    note.className = 'media-ocr-optin media-ed-note';
    const msg = document.createElement('span');
    msg.textContent = `OCR needs a one-time ~${bundleInfo.approxMB} MB language download (offline after that). Continue?`;
    const go = button(`Download ~${bundleInfo.approxMB} MB & run`, 'media-ocr-confirm media-ed-run');
    const no = button('Not now', 'media-ocr-decline');
    go.addEventListener('click', () => { confirmed = true; note.remove(); void run(); });
    no.addEventListener('click', () => note.remove());
    note.append(msg, go, no);
    el.appendChild(note);
  }

  async function run() {
    controller = new AbortController();
    runBtn.disabled = true;
    cancelBtn.hidden = false;
    setStatus('Loading OCR engine…');
    const intervalSec = Number(intervalSel.value) || 2;
    try {
      const cues = await ocrVideo(videoEl, {
        intervalSec,
        digits: digits.checked,
        signal: controller.signal,
        onProgress: ({ index, total, time }) => {
          setStatus(`Recognizing frame ${index}/${total} @ ${time.toFixed(1)}s…`);
        },
      });
      const fmtKey = formatSel.value;
      const fmt = FORMATS[fmtKey] || FORMATS.srt;
      const text = fmt.fn(cues);
      if (!cues.length) {
        setStatus('No on-screen text found. Try a denser sample interval.');
      } else {
        download(`${baseName(intake)}.${fmt.ext}`, text, fmt.mime);
        setStatus(`Done — ${cues.length} caption${cues.length === 1 ? '' : 's'} written to ${baseName(intake)}.${fmt.ext}.`);
      }
    } catch (err) {
      if (err?.name === 'AbortError') setStatus('Cancelled.');
      else setStatus(`OCR failed: ${err?.message || err}`);
    } finally {
      controller = null;
      runBtn.disabled = false;
      cancelBtn.hidden = true;
    }
  }

  return { el };
}

function labeled(text, control) {
  const label = document.createElement('label');
  label.className = 'media-ocr-field';
  const span = document.createElement('span');
  span.textContent = text;
  label.append(span, control);
  return label;
}

function button(text, className) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.textContent = text;
  return b;
}
