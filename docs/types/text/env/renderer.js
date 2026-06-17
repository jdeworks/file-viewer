// .env file viewer — parses KEY=VALUE pairs, redacts sensitive values by default.
// Reveal toggle is an inline script (sandbox allows-scripts is always set by iframe.js).
// SECURITY: sensitive keys are blurred/dotted; no copy button for them.

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SENSITIVE = /SECRET|PASSWORD|PASSWD|TOKEN|KEY|AUTH|CREDENTIAL|PRIVATE|PWD|SALT|SIGNING|MASTER|WEBHOOK/i;
const NOT_SENSITIVE = /_LENGTH$|_TIMEOUT$|_COUNT$|_SIZE$|_MAX$|_MIN$|^NODE_ENV$|^PORT$|^HOST$|^DEBUG$|^LOG_LEVEL$/i;

function isSensitive(key) {
  if (NOT_SENSITIVE.test(key)) return false;
  return SENSITIVE.test(key);
}

function parseEnv(text) {
  const entries = [];
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { entries.push({ type: 'blank' }); continue; }
    if (trimmed.startsWith('#')) { entries.push({ type: 'comment', text: trimmed.slice(1).trim() }); continue; }

    // Strip 'export ' prefix
    const stripped = trimmed.replace(/^export\s+/, '');

    const eqIdx = stripped.indexOf('=');
    if (eqIdx < 0) { entries.push({ type: 'raw', text: trimmed }); continue; }

    const key = stripped.slice(0, eqIdx).trim();
    let value = stripped.slice(eqIdx + 1);

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

    entries.push({ type: 'pair', key, value });
  }
  return entries;
}

function isUrl(value) {
  return /^https?:\/\/\S+$/.test(value.trim());
}

function renderValue(key, value, sensitive) {
  if (sensitive) {
    // Escape value for embedding in data attribute (html-encoded)
    const escapedVal = esc(value);
    return `<span class="env-secret-val" data-val="${escapedVal}">&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;</span>`
      + `<button class="env-reveal-btn" onclick="envReveal(this)" aria-label="Reveal value">reveal</button>`;
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

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const entries = parseEnv(text);

  const pairs = entries.filter((e) => e.type === 'pair');
  const sensitiveCount = pairs.filter((e) => isSensitive(e.key)).length;

  const hasSensitive = sensitiveCount > 0;

  const STYLES = `
<style>
* { box-sizing: border-box; }
body { font-family: system-ui, -apple-system, sans-serif; font-size: 13px; margin: 0; padding: 16px; background: var(--bg, #fff); color: var(--fg, #111); }
.env-stats { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 10px 14px; background: var(--surface, #f8fafc); border: 1px solid var(--border, #e2e8f0); border-radius: 6px; margin-bottom: 12px; }
.env-stat-num { font-size: 18px; font-weight: 700; color: var(--fg, #111); }
.env-stat-label { font-size: 12px; color: #888; }
.env-stat-sep { color: #ccc; }
.env-notice { display: flex; align-items: flex-start; gap: 8px; padding: 8px 12px; background: #fefce8; border: 1px solid #fde047; border-radius: 6px; margin-bottom: 12px; font-size: 12px; color: #713f12; }
.env-notice-icon { flex-shrink: 0; font-size: 14px; margin-top: 1px; }
table { width: 100%; border-collapse: collapse; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; overflow: hidden; font-size: 12px; }
thead th { text-align: left; padding: 7px 12px; background: var(--surface, #f8fafc); border-bottom: 1px solid var(--border, #e2e8f0); color: #888; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
tbody tr { border-bottom: 1px solid var(--border, #f1f5f9); }
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: var(--hover, #f8fafc); }
td { padding: 7px 12px; vertical-align: top; }
td.env-key-cell { font-family: monospace; font-size: 12px; white-space: nowrap; color: #1d4ed8; font-weight: 600; width: 1%; padding-right: 20px; }
td.env-val-cell { font-family: monospace; font-size: 12px; word-break: break-all; }
tr.env-comment-row td { padding: 5px 12px; font-style: italic; color: #888; background: transparent; font-family: sans-serif; font-size: 11px; }
tr.env-comment-row td::before { content: "# "; opacity: 0.6; }
.env-secret-val { color: #9ca3af; letter-spacing: 0.1em; user-select: none; }
.env-reveal-btn { margin-left: 8px; padding: 1px 8px; font-size: 11px; border: 1px solid #d1d5db; border-radius: 4px; background: #f9fafb; color: #374151; cursor: pointer; font-family: sans-serif; }
.env-reveal-btn:hover { background: #e5e7eb; }
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
</style>`;

  const SCRIPT = `
<script>
function envReveal(btn) {
  var span = btn.previousElementSibling;
  var isHidden = span.textContent.includes('•');
  if (isHidden) {
    span.textContent = span.dataset.val;
    btn.textContent = 'hide';
  } else {
    span.textContent = '••••••••••';
    btn.textContent = 'reveal';
  }
}
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
</scr` + `ipt>`;

  // Build stats bar
  const statsHtml = `<div class="env-stats">
  <span class="env-stat-num">${pairs.length}</span><span class="env-stat-label">variable${pairs.length !== 1 ? 's' : ''}</span>
  ${hasSensitive ? `<span class="env-stat-sep">&middot;</span><span class="env-stat-num">${sensitiveCount}</span><span class="env-stat-label">sensitive (redacted)</span>` : ''}
</div>`;

  const noticeHtml = hasSensitive
    ? `<div class="env-notice"><span class="env-notice-icon">&#x1F512;</span><span>Values matching secret patterns are hidden by default. Click <strong>reveal</strong> to show.</span></div>`
    : '';

  // Build table rows
  const rows = [];
  for (const entry of entries) {
    if (entry.type === 'blank') continue;

    if (entry.type === 'comment') {
      rows.push(`<tr class="env-comment-row"><td colspan="3">${esc(entry.text)}</td></tr>`);
      continue;
    }

    if (entry.type === 'raw') {
      rows.push(`<tr><td colspan="3" style="font-family:monospace;font-size:12px;color:#888">${esc(entry.text)}</td></tr>`);
      continue;
    }

    if (entry.type === 'pair') {
      const sensitive = isSensitive(entry.key);
      const valHtml = renderValue(entry.key, entry.value, sensitive);
      const sensitiveCell = sensitive
        ? `<td class="env-sensitive-icon" title="Sensitive — redacted by default">&#x1F512;</td>`
        : `<td></td>`;
      rows.push(`<tr>
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
<thead><tr><th>Key</th><th>Value</th><th></th></tr></thead>
<tbody>${rows.join('\n')}</tbody>
</table>`;

  const bodyHtml = STYLES + SCRIPT + `\n<div>\n${statsHtml}${noticeHtml}${tableHtml}\n</div>`;

  return { bodyHtml, hadUnsafe: false };
}
