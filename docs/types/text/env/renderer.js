// .env file viewer — parses KEY=VALUE pairs, redacts sensitive values by default.
// SECURITY: sensitive values are never embedded in the preview DOM.

import { maskedValue } from '../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SENSITIVE = /SECRET|PASSWORD|PASSWD|TOKEN|AUTH|CREDENTIAL|PRIVATE|PWD|SALT|SIGNING|MASTER|WEBHOOK/i;
const NOT_SENSITIVE = /_LENGTH$|_TIMEOUT$|_COUNT$|_SIZE$|_MAX$|_MIN$|^NODE_ENV$|^PORT$|^HOST$|^DEBUG$|^LOG_LEVEL$/i;

function legacySecretReason(key) {
  if (NOT_SENSITIVE.test(key)) return false;
  return SENSITIVE.test(key) ? `masked because "${key}" matches a common secret variable name` : '';
}

function classifyValue(key, value) {
  const shared = maskedValue(key, value);
  if (shared.masked) return shared;
  const legacyReason = legacySecretReason(key);
  if (legacyReason) return { text: '********', masked: true, reason: legacyReason };
  if (hasUrlCreds(value)) {
    return {
      text: redactUrlCreds(value),
      masked: true,
      partial: true,
      reason: 'masked because the value contains URL credentials',
    };
  }
  return { text: String(value ?? ''), masked: false, reason: '' };
}

// Credentials embedded in a connection-string value (e.g. DATABASE_URL=postgres://user:pass@host),
// where the KEY itself isn't flagged sensitive. Redact only the password portion (user/host stay
// visible) so the value is still informative.
const URL_CREDS = /(:\/\/[^\s/:@]+:)([^\s/@]+)(@)/g;
function hasUrlCreds(v) { URL_CREDS.lastIndex = 0; return URL_CREDS.test(v || ''); }
function redactUrlCreds(v) { return String(v || '').replace(URL_CREDS, (m, a, p, c) => a + '••••' + c); }

function parseEnv(text) {
  const entries = [];
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { entries.push({ type: 'blank', line: lineNo, raw: line }); continue; }
    if (trimmed.startsWith('#')) { entries.push({ type: 'comment', text: trimmed.slice(1).trim(), line: lineNo, raw: line }); continue; }

    // Strip 'export ' prefix
    const stripped = trimmed.replace(/^export\s+/, '');

    const eqIdx = stripped.indexOf('=');
    if (eqIdx < 0) { entries.push({ type: 'raw', text: trimmed, line: lineNo, raw: line }); continue; }

    const key = stripped.slice(0, eqIdx).trim();
    let value = stripped.slice(eqIdx + 1);
    let endLine = lineNo;

    // Handle quoted values (single or double, possibly multi-line)
    if (value.startsWith('"') || value.startsWith("'")) {
      const q = value[0];
      let end = value.indexOf(q, 1);
      // Skip escaped quotes
      while (end > 0 && value[end - 1] === '\\') end = value.indexOf(q, end + 1);
      if (end >= 0) {
        value = value.slice(1, end);
      } else {
        // Multi-line: collect until closing quote
        let acc = value.slice(1);
        while (++i < lines.length) {
          const nextLine = lines[i];
          endLine = i + 1;
          const closeIdx = nextLine.indexOf(q);
          if (closeIdx >= 0) { acc += '\n' + nextLine.slice(0, closeIdx); break; }
          acc += '\n' + nextLine;
        }
        value = acc;
      }
    }

    // Un-escape common sequences
    value = value
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');

    entries.push({ type: 'pair', key, value, line: lineNo, endLine, raw: line });
  }
  return entries;
}

function isUrl(value) {
  return /^https?:\/\/\S+$/.test(value.trim());
}

function renderValue(key, value, classified) {
  if (classified.masked) {
    const cls = classified.partial ? 'env-secret-val env-cred-val' : 'env-secret-val';
    return `<span class="${cls}" title="${esc(classified.reason)}">${esc(classified.text)}</span>`
      + `<span class="env-reason" title="${esc(classified.reason)}">${esc(classified.reason)}</span>`;
  }

  // NODE_ENV badge
  if (key === 'NODE_ENV') {
    const lv = value.toLowerCase();
    const cls = lv === 'production' ? 'env-badge-prod' : lv === 'development' ? 'env-badge-dev' : 'env-badge-neutral';
    return `<span class="env-badge ${cls}">${esc(value)}</span>`;
  }

  // Long values — truncate with expand
  const display = esc(value);
  const urlIcon = isUrl(value) ? ' <span class="env-url-icon" title="URL value">&#x1F517;</span>' : '';

  if (value.length > 80) {
    const short = esc(value.slice(0, 80));
    const full = esc(value);
    return `<span class="env-val-short"><span class="env-val-text">${short}<span class="env-ellipsis">&#x2026;</span></span>`
      + `<button class="env-expand-btn" onclick="envExpand(this)" data-full="${full}" aria-label="Expand value">expand</button></span>${urlIcon}`;
  }

  return `<span class="env-val-text">${display}</span>${urlIcon}`;
}

function redactedSource(text, entries) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  for (const entry of entries) {
    if (entry.type !== 'pair') continue;
    const classified = classifyValue(entry.key, entry.value);
    if (!classified.masked) continue;
    const idx = entry.line - 1;
    const raw = lines[idx] || '';
    const eqIdx = raw.indexOf('=');
    if (eqIdx >= 0) {
      lines[idx] = raw.slice(0, eqIdx + 1) + classified.text;
    } else {
      lines[idx] = `${entry.key}=${classified.text}`;
    }
    for (let i = entry.line; i < (entry.endLine || entry.line); i++) lines[i] = '';
  }
  return lines;
}

function sourceHtml(lines) {
  return `<details class="env-source-details">
<summary>Redacted source (${lines.length} lines)</summary>
<pre class="env-source">${lines.map((line, idx) => {
    const lineNo = idx + 1;
    return `<span id="env-src-${lineNo}" class="env-src-line" data-line="${lineNo}"><span class="env-src-ln">${lineNo}</span><span class="env-src-code">${esc(line)}</span></span>`;
  }).join('')}</pre>
</details>`;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const entries = parseEnv(text);

  const pairs = entries.filter((e) => e.type === 'pair');
  const sensitiveCount = pairs.filter((e) => classifyValue(e.key, e.value).masked).length;

  const hasSensitive = sensitiveCount > 0;

  const STYLES = `
<style>
* { box-sizing: border-box; }
body { font-family: system-ui, -apple-system, sans-serif; font-size: 13px; margin: 0 auto; padding: clamp(16px, 3vw, 28px); background: #fff; color: #111827; }
.env-doc { width: min(100%, 980px); margin: 0 auto; }
.env-stats { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 12px; }
.env-stat-num { font-size: 18px; font-weight: 700; color: #111827; }
.env-stat-label { font-size: 12px; color: #64748b; }
.env-stat-sep { color: #cbd5e1; }
.env-notice { display: flex; align-items: flex-start; gap: 8px; padding: 8px 12px; background: #fefce8; border: 1px solid #fde047; border-radius: 6px; margin-bottom: 12px; font-size: 12px; color: #713f12; }
.env-notice-icon { flex-shrink: 0; font-size: 14px; margin-top: 1px; }
table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; font-size: 12px; }
thead th { text-align: left; padding: 7px 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
tbody tr { border-bottom: 1px solid #f1f5f9; }
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: #f8fafc; }
td { padding: 7px 12px; vertical-align: top; }
td.env-line-cell { width: 1%; white-space: nowrap; color: #64748b; font-family: ui-monospace, monospace; font-size: 11px; }
td.env-key-cell { font-family: monospace; font-size: 12px; white-space: nowrap; color: #1d4ed8; font-weight: 600; width: 1%; padding-right: 20px; }
td.env-val-cell { font-family: monospace; font-size: 12px; word-break: break-all; }
tr.env-comment-row td { padding: 5px 12px; font-style: italic; color: #888; background: transparent; font-family: sans-serif; font-size: 11px; }
tr.env-comment-row td::before { content: "# "; opacity: 0.6; }
.env-secret-val { color: #9ca3af; letter-spacing: 0.1em; user-select: none; }
.env-reason { display: inline-block; margin-left: 8px; color: #713f12; font-family: system-ui, sans-serif; font-size: 11px; letter-spacing: 0; }
.env-line-btn { border: 0; background: transparent; color: inherit; padding: 0; font: inherit; cursor: pointer; text-decoration: underline; text-decoration-style: dotted; text-underline-offset: 2px; }
.env-line-btn:hover { color: #1d4ed8; }
.env-expand-btn { margin-left: 6px; padding: 1px 6px; font-size: 11px; border: 1px solid #d1d5db; border-radius: 4px; background: #f9fafb; color: #374151; cursor: pointer; font-family: sans-serif; }
.env-expand-btn:hover { background: #e5e7eb; }
.env-ellipsis { color: #9ca3af; }
.env-badge { display: inline-block; padding: 1px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; font-family: sans-serif; letter-spacing: 0.04em; }
.env-badge-prod { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
.env-badge-dev { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
.env-badge-neutral { background: #e0e7ff; color: #3730a3; border: 1px solid #a5b4fc; }
.env-url-icon { font-size: 11px; opacity: 0.6; margin-left: 4px; }
.env-sensitive-icon { color: #9ca3af; font-size: 11px; }
.env-empty { padding: 24px; text-align: center; color: #888; font-style: italic; }
.env-source-details { margin-top: 14px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: #fff; }
.env-source-details summary { cursor: pointer; padding: 8px 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-weight: 600; font-size: 12px; }
.env-source { margin: 0; max-height: 60vh; overflow: auto; font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: normal; }
.env-src-line { display: grid; grid-template-columns: 4.2em minmax(0, 1fr); align-items: start; }
.env-src-line.env-source-hit { background: #fff7cc; }
.env-src-ln { position: sticky; left: 0; text-align: right; padding: 0 10px; color: #64748b; background: #f8fafc; border-right: 1px solid #e2e8f0; user-select: none; }
.env-src-code { white-space: pre-wrap; overflow-wrap: anywhere; padding: 0 12px; }
body.fv-dark { background: #1e1e1e; color: #e5e7eb; }
body.fv-dark .env-stats { background: #252a31; border-color: #3b4552; }
body.fv-dark .env-stat-num { color: #f8fafc; }
body.fv-dark .env-stat-label, body.fv-dark thead th, body.fv-dark tr.env-comment-row td, body.fv-dark td.env-line-cell { color: #a8b3c2; }
body.fv-dark .env-stat-sep { color: #5b6573; }
body.fv-dark .env-notice { background: #3f3217; border-color: #8a6a18; color: #f8e7a1; }
body.fv-dark table { border-color: #3b4552; }
body.fv-dark thead th { background: #252a31; border-bottom-color: #3b4552; }
body.fv-dark tbody tr { border-bottom-color: #2f3742; }
body.fv-dark tbody tr:hover { background: #252a31; }
body.fv-dark td.env-key-cell { color: #93c5fd; }
body.fv-dark .env-secret-val, body.fv-dark .env-sensitive-icon, body.fv-dark .env-ellipsis { color: #a8b3c2; }
body.fv-dark .env-reason { color: #f8e7a1; }
body.fv-dark .env-line-btn:hover { color: #93c5fd; }
body.fv-dark .env-expand-btn { background: #252a31; border-color: #4b5563; color: #e5e7eb; }
body.fv-dark .env-expand-btn:hover { background: #374151; }
body.fv-dark .env-source-details { border-color: #3b4552; background: #1e1e1e; }
body.fv-dark .env-source-details summary, body.fv-dark .env-src-ln { background: #252a31; border-color: #3b4552; color: #a8b3c2; }
body.fv-dark .env-src-line.env-source-hit { background: #4b421e; }
</style>`;

  const SCRIPT = `
<script>
function envExpand(btn) {
  var container = btn.parentElement;
  var isExpanded = btn.textContent === 'collapse';
  if (isExpanded) {
    var short = btn.dataset.short || (btn.dataset.full || '').slice(0, 80);
    container.querySelector('.env-val-text').innerHTML = short + '<span class="env-ellipsis">…</span>';
    btn.textContent = 'expand';
  } else {
    if (!btn.dataset.short) {
      btn.dataset.short = container.querySelector('.env-val-text').textContent.slice(0, 80);
    }
    container.querySelector('.env-val-text').textContent = btn.dataset.full;
    btn.textContent = 'collapse';
  }
}
function envGoLine(line) {
  var details = document.querySelector('.env-source-details');
  if (details) details.open = true;
  var row = document.getElementById('env-src-' + line);
  if (!row) return;
  row.classList.add('env-source-hit');
  row.scrollIntoView({ block: 'center', behavior: 'smooth' });
  window.setTimeout(function () { row.classList.remove('env-source-hit'); }, 1500);
}
</scr` + `ipt>`;

  // Build stats bar
  const statsHtml = `<div class="env-stats">
  <span class="env-stat-num">${pairs.length}</span><span class="env-stat-label">variable${pairs.length !== 1 ? 's' : ''}</span>
  ${hasSensitive ? `<span class="env-stat-sep">&middot;</span><span class="env-stat-num">${sensitiveCount}</span><span class="env-stat-label">sensitive (redacted)</span>` : ''}
</div>`;

  const noticeHtml = hasSensitive
    ? `<div class="env-notice"><span class="env-notice-icon">&#x1F512;</span><span>Secret-like values and URL credentials are redacted in the table and source preview. Hover the note beside a value for the masking reason.</span></div>`
    : '';

  // Build table rows
  const rows = [];
  for (const entry of entries) {
    if (entry.type === 'blank') continue;

    if (entry.type === 'comment') {
      rows.push(`<tr class="env-comment-row"><td colspan="4">${esc(entry.text)}</td></tr>`);
      continue;
    }

    if (entry.type === 'raw') {
      rows.push(`<tr><td colspan="4" style="font-family:monospace;font-size:12px;color:#888">${esc(entry.text)}</td></tr>`);
      continue;
    }

    if (entry.type === 'pair') {
      const classified = classifyValue(entry.key, entry.value);
      const valHtml = renderValue(entry.key, entry.value, classified);
      const redacted = classified.masked;
      const sensitiveCell = redacted
        ? `<td class="env-sensitive-icon" title="${esc(classified.reason)}">&#x1F512;</td>`
        : `<td></td>`;
      rows.push(`<tr>
  <td class="env-line-cell"><button class="env-line-btn" onclick="envGoLine(${entry.line})" title="Open redacted source at line ${entry.line}">${entry.line}</button></td>
  <td class="env-key-cell">${esc(entry.key)}</td>
  <td class="env-val-cell">${valHtml}</td>
  ${sensitiveCell}
</tr>`);
    }
  }

  if (rows.length === 0) {
    return {
      bodyHtml: `${STYLES}<div class="env-empty">No key-value pairs found.</div>`,
      hadUnsafe: false,
    };
  }

  const tableHtml = `<table>
<thead><tr><th>Line</th><th>Key</th><th>Value</th><th></th></tr></thead>
<tbody>${rows.join('\n')}</tbody>
</table>`;

  const bodyHtml = STYLES + SCRIPT + `\n<div class="env-doc">\n${statsHtml}${noticeHtml}${tableHtml}${sourceHtml(redactedSource(text, entries))}\n</div>`;

  return { bodyHtml, hadUnsafe: false };
}
