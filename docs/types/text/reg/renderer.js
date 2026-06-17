// Windows Registry (.reg) file viewer
// Parses registry export format and renders a structured view with collapsible keys,
// typed value badges, hive color-coding, and autorun security warnings.

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ── Parser ────────────────────────────────────────────────────────────────────

function parseReg(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const result = { version: '', keys: [] };
  let currentKey = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Handle line continuations (line ending with \)
    let fullLine = line;
    while (fullLine.endsWith('\\') && i + 1 < lines.length) {
      fullLine = fullLine.slice(0, -1) + lines[++i].trim();
    }

    if (!fullLine || fullLine.startsWith(';')) continue; // comment or blank

    if (fullLine.startsWith('Windows Registry Editor') || fullLine.startsWith('REGEDIT4')) {
      result.version = fullLine;
      continue;
    }

    // Key header [HKEY_...] or [-HKEY_...]
    if (fullLine.startsWith('[')) {
      const deleteKey = fullLine.startsWith('[-');
      const keyPath = fullLine.replace(/^\[-?/, '').replace(/\]$/, '');
      currentKey = { path: keyPath, deleted: deleteKey, values: [] };
      result.keys.push(currentKey);
      continue;
    }

    // Value lines
    if (currentKey && (fullLine.startsWith('"') || fullLine.startsWith('@') || fullLine.startsWith('-'))) {
      const deleteValue = fullLine.startsWith('-"');
      const cleanLine = deleteValue ? fullLine.slice(1) : fullLine;

      let name, rawValue;
      if (cleanLine.startsWith('@=')) {
        name = '(Default)';
        rawValue = cleanLine.slice(2);
      } else if (cleanLine.startsWith('"')) {
        const eqIdx = cleanLine.indexOf('"=');
        if (eqIdx < 0) continue;
        name = cleanLine.slice(1, eqIdx);
        rawValue = cleanLine.slice(eqIdx + 2);
      } else continue;

      currentKey.values.push({ name, rawValue, deleted: deleteValue });
    }
  }
  return result;
}

function parseValue(rawValue) {
  if (!rawValue) return { type: 'unknown', display: '' };

  if (rawValue.startsWith('"')) {
    return {
      type: 'REG_SZ',
      display: rawValue.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
    };
  }

  if (rawValue.startsWith('dword:')) {
    const n = parseInt(rawValue.slice(6), 16);
    return { type: 'REG_DWORD', display: `${n} (0x${n.toString(16).padStart(8, '0')})` };
  }

  if (rawValue.startsWith('hex(b):')) {
    // QWORD: 8 bytes little-endian
    const bytes = rawValue.slice(7).split(',').map((h) => parseInt(h, 16));
    let n = 0n;
    for (let i = 7; i >= 0; i--) n = (n << 8n) | BigInt(bytes[i] || 0);
    return { type: 'REG_QWORD', display: n.toString() };
  }

  if (rawValue.startsWith('hex(2):')) {
    // REG_EXPAND_SZ: UTF-16LE hex
    const bytes = rawValue.slice(7).split(',').map((h) => parseInt(h, 16));
    const buf = new Uint8Array(bytes);
    return { type: 'REG_EXPAND_SZ', display: new TextDecoder('utf-16le').decode(buf).replace(/\0/g, '') };
  }

  if (rawValue.startsWith('hex(7):')) {
    // REG_MULTI_SZ: null-separated UTF-16LE strings
    const bytes = rawValue.slice(7).split(',').map((h) => parseInt(h, 16));
    const buf = new Uint8Array(bytes);
    const str = new TextDecoder('utf-16le').decode(buf);
    const parts = str.split('\0').filter((s) => s.length > 0);
    return { type: 'REG_MULTI_SZ', display: parts.join(' | '), parts };
  }

  if (rawValue.startsWith('hex:')) {
    const bytes = rawValue.slice(4).split(',');
    return {
      type: 'REG_BINARY',
      display: bytes.slice(0, 16).join(' ') + (bytes.length > 16 ? ` … (${bytes.length} bytes)` : ''),
    };
  }

  return { type: 'unknown', display: rawValue };
}

// ── Hive color badges ─────────────────────────────────────────────────────────

const HIVE_COLORS = {
  HKEY_LOCAL_MACHINE: '#2563eb',   // blue
  HKEY_CURRENT_USER: '#16a34a',    // green
  HKEY_CLASSES_ROOT: '#7c3aed',    // purple
  HKEY_USERS: '#ea580c',           // orange
  HKEY_CURRENT_CONFIG: '#0d9488',  // teal
};

function getHive(keyPath) {
  for (const hive of Object.keys(HIVE_COLORS)) {
    if (keyPath.startsWith(hive)) return hive;
  }
  return null;
}

// ── Autorun detection ─────────────────────────────────────────────────────────

const AUTORUN_PATTERNS = ['\\Run\\', '\\RunOnce\\', '\\Winlogon\\', '\\Run]', '\\RunOnce]', '\\Winlogon]'];

function isAutorunKey(keyPath) {
  return AUTORUN_PATTERNS.some((p) => keyPath.includes(p));
}

// ── Render ────────────────────────────────────────────────────────────────────

export async function render(intake) {
  const text = intake.text ?? '';
  let parsed;
  try {
    parsed = parseReg(text);
  } catch {
    return { bodyHtml: `<pre style="padding:16px;font-family:monospace;white-space:pre-wrap">${esc(text)}</pre>`, hadUnsafe: false };
  }

  const totalValues = parsed.keys.reduce((sum, k) => sum + k.values.length, 0);
  const hasAutorun = parsed.keys.some((k) => isAutorunKey(k.path));

  const parts = [];

  parts.push(`<style>
*,*::before,*::after{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:var(--text,#111);background:var(--bg,#fff)}
.reg-header{padding:10px 14px;border-bottom:1px solid var(--border,#ddd);display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.reg-version{font-size:11px;font-family:monospace;color:#888;background:var(--border,#eee);border-radius:10px;padding:2px 8px}
.reg-stats{font-size:11px;color:#888}
.reg-title{font-weight:600;font-size:14px}
.reg-warn{margin:8px 14px;padding:8px 12px;background:#fef9c3;border:1px solid #fde047;border-radius:6px;font-size:12px;color:#854d0e}
.reg-controls{padding:6px 14px;display:flex;gap:6px;border-bottom:1px solid var(--border,#ddd)}
.reg-btn{font-size:11px;padding:3px 10px;border-radius:4px;border:1px solid var(--border,#ddd);background:var(--bg,#fff);color:var(--text,#888);cursor:pointer}
.reg-btn:hover{background:var(--border,#eee)}
.reg-key{border-bottom:1px solid var(--border,#eee)}
details>summary{list-style:none;display:flex;align-items:center;gap:6px;padding:7px 14px;cursor:pointer;user-select:none}
details>summary::-webkit-details-marker{display:none}
details>summary::before{content:'▶';font-size:9px;color:#aaa;flex-shrink:0;transition:transform 0.15s}
details[open]>summary::before{transform:rotate(90deg)}
.reg-hive{font-size:10px;font-weight:700;color:#fff;border-radius:3px;padding:1px 5px;flex-shrink:0}
.reg-path{font-size:12px;font-family:monospace;color:var(--text,#555);word-break:break-all}
.reg-path b{color:var(--text,#111)}
.reg-deleted-badge{font-size:10px;color:#dc2626;background:#fee2e2;border-radius:3px;padding:1px 5px;flex-shrink:0}
.reg-deleted summary .reg-path{text-decoration:line-through;color:#aaa}
.reg-table-wrap{padding:0 14px 10px 36px}
table{width:100%;border-collapse:collapse;font-size:12px}
th{text-align:left;padding:4px 8px;border-bottom:2px solid var(--border,#ddd);color:#888;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.04em}
td{padding:4px 8px;border-bottom:1px solid var(--border,#eee);vertical-align:top}
tr:last-child td{border-bottom:none}
td:first-child{font-family:monospace;white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis}
td:last-child{font-family:monospace;word-break:break-all;color:var(--text,#333)}
.reg-type-badge{font-size:10px;font-weight:600;font-family:monospace;border-radius:3px;padding:1px 5px;white-space:nowrap}
.type-REG_SZ{background:#dbeafe;color:#1d4ed8}
.type-REG_DWORD{background:#dcfce7;color:#166534}
.type-REG_QWORD{background:#f0fdf4;color:#166534}
.type-REG_BINARY{background:#fef3c7;color:#92400e}
.type-REG_EXPAND_SZ{background:#ede9fe;color:#5b21b6}
.type-REG_MULTI_SZ{background:#fce7f3;color:#9d174d}
.type-unknown{background:#f3f4f6;color:#6b7280}
.reg-default{font-style:italic;color:#888}
.reg-val-deleted td{text-decoration:line-through;color:#bbb}
.reg-empty{padding:6px 8px;color:#aaa;font-style:italic;font-size:11px}
</style>`);

  // Header
  parts.push(`<div class="reg-header">`);
  parts.push(`<span class="reg-title">Windows Registry</span>`);
  if (parsed.version) parts.push(`<span class="reg-version">${esc(parsed.version)}</span>`);
  parts.push(`<span class="reg-stats">${parsed.keys.length} registry key${parsed.keys.length !== 1 ? 's' : ''}, ${totalValues} value${totalValues !== 1 ? 's' : ''}</span>`);
  parts.push(`</div>`);

  // Autorun warning
  if (hasAutorun) {
    parts.push(`<div class="reg-warn">&#9888;&#65039; Contains autorun keys — these run programs at startup (Run, RunOnce, or Winlogon)</div>`);
  }

  // Expand/collapse controls
  parts.push(`<div class="reg-controls">`);
  parts.push(`<button class="reg-btn" onclick="document.querySelectorAll('details').forEach(d=>d.open=true)">Expand all</button>`);
  parts.push(`<button class="reg-btn" onclick="document.querySelectorAll('details').forEach(d=>d.open=false)">Collapse all</button>`);
  parts.push(`</div>`);

  // Keys
  for (const key of parsed.keys) {
    const hive = getHive(key.path);
    const hiveColor = hive ? HIVE_COLORS[hive] : '#6b7280';
    const hiveName = hive || 'HKEY';
    const subPath = hive ? key.path.slice(hive.length) : key.path;

    // Split subpath into segments, bold the last one
    const segments = subPath.split('\\').filter(Boolean);
    let pathHtml = esc(hive || '');
    if (segments.length > 0) {
      const prefix = segments.slice(0, -1).map(esc).join('\\');
      const last = esc(segments[segments.length - 1]);
      if (prefix) {
        pathHtml += `\\${prefix}\\<b>${last}</b>`;
      } else {
        pathHtml += `\\<b>${last}</b>`;
      }
    }

    const deletedClass = key.deleted ? ' reg-deleted' : '';
    parts.push(`<div class="reg-key${deletedClass}">`);
    parts.push(`<details>`);
    parts.push(`<summary>`);
    parts.push(`<span class="reg-hive" style="background:${esc(hiveColor)}">${esc(hiveName.replace('HKEY_', ''))}</span>`);
    parts.push(`<span class="reg-path">${pathHtml}</span>`);
    if (key.deleted) parts.push(`<span class="reg-deleted-badge">&#9940; deleted</span>`);
    parts.push(`</summary>`);

    // Values table
    parts.push(`<div class="reg-table-wrap">`);
    if (key.values.length === 0) {
      parts.push(`<div class="reg-empty">(no values)</div>`);
    } else {
      parts.push(`<table><thead><tr><th>Name</th><th>Type</th><th>Value</th></tr></thead><tbody>`);
      for (const val of key.values) {
        const parsed2 = parseValue(val.rawValue);
        const typeClass = `type-${parsed2.type}`;
        const isDefault = val.name === '(Default)';
        const nameHtml = isDefault
          ? `<span class="reg-default">${esc(val.name)}</span>`
          : esc(val.name);
        const deletedRowClass = val.deleted ? ' class="reg-val-deleted"' : '';
        parts.push(`<tr${deletedRowClass}>`);
        parts.push(`<td>${nameHtml}</td>`);
        parts.push(`<td><span class="reg-type-badge ${typeClass}">${esc(parsed2.type)}</span></td>`);
        parts.push(`<td>${esc(parsed2.display)}</td>`);
        parts.push(`</tr>`);
      }
      parts.push(`</tbody></table>`);
    }
    parts.push(`</div></details></div>`);
  }

  if (parsed.keys.length === 0) {
    parts.push(`<div style="padding:20px;color:#888;text-align:center">No registry keys found.</div>`);
  }

  return { bodyHtml: parts.join('\n'), hadUnsafe: false };
}
