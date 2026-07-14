import { hexDump } from './hexdump.js';
import { syncHasToolsClass } from './rawpane-shared.js';

export const HEX_WINDOW_BYTES = 64 * 1024;

export function parseHexPattern(value) {
  let compact = String(value || '').trim().replace(/0x/gi, '').replace(/[\s:_-]+/g, '');
  if (!compact || compact.length % 2 || /[^0-9a-f]/i.test(compact)) return null;
  const bytes = new Uint8Array(compact.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(compact.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

// Boyer–Moore–Horspool keeps long local searches responsive without a dependency.
export function findBytePattern(bytes, pattern, from = 0) {
  if (!bytes?.length || !pattern?.length || pattern.length > bytes.length) return -1;
  const start = Math.max(0, Math.trunc(Number(from)) || 0);
  const last = pattern.length - 1;
  const skip = new Uint32Array(256); skip.fill(pattern.length);
  for (let i = 0; i < last; i += 1) skip[pattern[i]] = last - i;
  for (let offset = start; offset <= bytes.length - pattern.length;) {
    let index = last;
    while (index >= 0 && bytes[offset + index] === pattern[index]) index -= 1;
    if (index < 0) return offset;
    offset += skip[bytes[offset + last]] || 1;
  }
  return -1;
}

export function byteStatistics(bytes) {
  const counts = new Uint32Array(256);
  for (const byte of bytes || []) counts[byte] += 1;
  const total = bytes?.length || 0;
  let entropy = 0;
  if (total) {
    for (const count of counts) {
      if (!count) continue;
      const probability = count / total;
      entropy -= probability * Math.log2(probability);
    }
  }
  return { counts, total, entropy };
}

export function extractAsciiStrings(bytes, { minLength = 4, limit = 500 } = {}) {
  const source = bytes || new Uint8Array();
  const results = [];
  let start = -1;
  const finish = (end) => {
    if (start < 0 || end - start < minLength || results.length >= limit) { start = -1; return; }
    results.push({ offset: start, text: new TextDecoder('ascii').decode(source.subarray(start, end)) });
    start = -1;
  };
  for (let index = 0; index <= source.length; index += 1) {
    const byte = source[index];
    if (index < source.length && byte >= 0x20 && byte <= 0x7e) {
      if (start < 0) start = index;
    } else finish(index);
    if (results.length >= limit) break;
  }
  return results;
}

let active = null;

export function unmountBinaryInspector() {
  active?.dialog?.remove();
  active = null;
  const bar = document.getElementById('binaryTools');
  if (bar) bar.hidden = true;
  document.getElementById('rawPane')?.classList.remove('has-binary-tools');
  syncHasToolsClass();
}

export function mountBinaryInspector({ intake, rawview }) {
  unmountBinaryInspector();
  const bytes = intake?.bytes || new Uint8Array();
  const bar = document.getElementById('binaryTools');
  if (!bar || !rawview) return;
  bar.hidden = false;
  document.getElementById('rawPane')?.classList.add('has-binary-tools');
  syncHasToolsClass();

  const offsetInput = bar.querySelector('[data-bin-offset]');
  const patternInput = bar.querySelector('[data-bin-pattern]');
  const status = bar.querySelector('[data-bin-status]');
  const prev = bar.querySelector('[data-bin-action="prev"]');
  const next = bar.querySelector('[data-bin-action="next"]');
  let offset = 0, lastMatch = -1, lastQuery = '';

  function align(value) {
    if (!bytes.length) return 0;
    return Math.floor(Math.max(0, Math.min(bytes.length - 1, Number(value) || 0)) / 16) * 16;
  }

  function showWindow(value, match = -1) {
    offset = align(value);
    rawview.replaceReadOnlyValue(hexDump(bytes, HEX_WINDOW_BYTES, offset));
    offsetInput.value = `0x${offset.toString(16)}`;
    const end = Math.min(bytes.length, offset + HEX_WINDOW_BYTES);
    status.textContent = bytes.length
      ? `0x${offset.toString(16)}–0x${Math.max(offset, end - 1).toString(16)} / ${bytes.length.toLocaleString()} loaded bytes`
      : 'empty file';
    prev.disabled = offset === 0;
    next.disabled = end >= bytes.length;
    if (match >= offset && match < end) {
      const line = Math.floor((match - offset) / 16) + 1;
      rawview.decorate(line, line); rawview.reveal(line);
    }
  }

  function parsedOffset() {
    const value = offsetInput.value.trim();
    if (/^0x[0-9a-f]+$/i.test(value)) return parseInt(value.slice(2), 16);
    if (/^[0-9]+$/.test(value)) return Number(value);
    return NaN;
  }

  function go() {
    const value = parsedOffset();
    if (!Number.isFinite(value)) { status.textContent = 'Enter a decimal offset or 0x-prefixed hexadecimal offset.'; return; }
    showWindow(value);
  }

  function find() {
    const query = patternInput.value.trim();
    const pattern = parseHexPattern(query);
    if (!pattern) { status.textContent = 'Enter complete hexadecimal bytes, for example 50 4b 03 04.'; return; }
    if (query !== lastQuery) { lastMatch = -1; lastQuery = query; }
    let match = findBytePattern(bytes, pattern, lastMatch + 1);
    let wrapped = false;
    if (match < 0 && lastMatch >= 0) { match = findBytePattern(bytes, pattern, 0); wrapped = match >= 0; }
    if (match < 0) { status.textContent = `Pattern not found in ${bytes.length.toLocaleString()} loaded bytes.`; return; }
    lastMatch = match;
    showWindow(match, match);
    status.textContent = `Match at 0x${match.toString(16)}${wrapped ? ' (wrapped)' : ''}`;
  }

  function showDialog(mode) {
    active?.dialog?.remove();
    const dialog = document.createElement('dialog'); dialog.className = 'binary-inspector-dialog';
    const header = document.createElement('header');
    const title = document.createElement('h2'); title.textContent = mode === 'stats' ? 'Binary statistics' : 'Printable ASCII strings';
    const close = document.createElement('button'); close.type = 'button'; close.textContent = '✕'; close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', () => dialog.close()); header.append(title, close); dialog.append(header);
    if (mode === 'stats') mountStats(dialog, bytes);
    else mountStrings(dialog, bytes);
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    document.body.append(dialog); active = { dialog }; dialog.showModal();
  }

  bar.onclick = (event) => {
    const action = event.target.closest('[data-bin-action]')?.dataset.binAction;
    if (action === 'prev') showWindow(offset - HEX_WINDOW_BYTES);
    else if (action === 'next') showWindow(offset + HEX_WINDOW_BYTES);
    else if (action === 'go') go();
    else if (action === 'find') find();
    else if (action === 'stats') showDialog('stats');
    else if (action === 'strings') showDialog('strings');
  };
  offsetInput.onkeydown = (event) => { if (event.key === 'Enter') go(); };
  patternInput.onkeydown = (event) => { if (event.key === 'Enter') find(); };
  patternInput.oninput = () => { lastMatch = -1; lastQuery = ''; };
  showWindow(0);
}

function mountStats(dialog, bytes) {
  const stats = byteStatistics(bytes);
  const summary = document.createElement('p');
  summary.className = 'binary-summary';
  summary.textContent = `${stats.total.toLocaleString()} loaded bytes · Shannon entropy ${stats.entropy.toFixed(4)} bits/byte`;
  const canvas = document.createElement('canvas'); canvas.className = 'binary-histogram';
  canvas.width = 768; canvas.height = 180; canvas.setAttribute('aria-label', 'Frequency histogram for byte values 00 through ff');
  const ctx = canvas.getContext('2d');
  const peak = Math.max(1, ...stats.counts);
  ctx.fillStyle = '#4f7cff';
  stats.counts.forEach((count, index) => {
    const height = Math.round((count / peak) * (canvas.height - 20));
    ctx.fillRect(index * 3, canvas.height - height, 2, height);
  });
  const ranked = [...stats.counts].map((count, byte) => ({ byte, count })).sort((a, b) => b.count - a.count || a.byte - b.byte).slice(0, 16);
  const table = document.createElement('table');
  const caption = document.createElement('caption'); caption.textContent = 'Most frequent byte values'; table.append(caption);
  const body = document.createElement('tbody');
  ranked.forEach(({ byte, count }) => {
    const row = document.createElement('tr');
    const key = document.createElement('th'); key.textContent = `0x${byte.toString(16).padStart(2, '0')}`;
    const value = document.createElement('td'); value.textContent = `${count.toLocaleString()} (${stats.total ? (count / stats.total * 100).toFixed(2) : '0.00'}%)`;
    row.append(key, value); body.append(row);
  });
  table.append(body); dialog.append(summary, canvas, table);
}

function mountStrings(dialog, bytes) {
  const strings = extractAsciiStrings(bytes);
  const summary = document.createElement('p'); summary.className = 'binary-summary';
  summary.textContent = strings.length
    ? `Showing ${strings.length.toLocaleString()} strings of at least four printable ASCII characters${strings.length === 500 ? ' (limit reached)' : ''}.`
    : 'No printable ASCII strings of at least four characters were found.';
  dialog.append(summary);
  if (!strings.length) return;
  const list = document.createElement('ol'); list.className = 'binary-strings';
  strings.forEach((entry) => {
    const item = document.createElement('li');
    const offset = document.createElement('code'); offset.textContent = `0x${entry.offset.toString(16).padStart(8, '0')}`;
    const value = document.createElement('span'); value.textContent = entry.text;
    item.append(offset, value); list.append(item);
  });
  dialog.append(list);
}
