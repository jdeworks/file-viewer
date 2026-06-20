const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.f8-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-f8{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2563eb;color:#fff;vertical-align:middle;margin-right:8px;}
.f8-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.f8-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.f8-sec{margin:12px 0;}
.f8-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.f8-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.f8-row{display:flex;gap:8px;font-size:13px;padding:3px 0;}
.f8-key{color:var(--fg-2,#888);min-width:160px;flex-shrink:0;font-size:12px;font-family:ui-monospace,monospace;}
.f8-val{font-family:ui-monospace,monospace;word-break:break-all;}
.f8-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;}
.f8-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;font-family:ui-monospace,monospace;}
.f8-chip.exc{background:#f0fdf4;border-color:#86efac;color:#166534;}
.f8-pf-block{margin:4px 0;font-size:12px;}
.f8-pf-key{font-family:ui-monospace,monospace;color:var(--fg-2,#888);font-size:11px;}
`;

function parseIni(text) {
  const secs = {};
  let cur = null;
  let lastKey = null;
  for (const rawLine of (text || '').split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trim().startsWith('#') || rawLine.trim().startsWith(';')) { lastKey = null; continue; }
    const sec = rawLine.trim().match(/^\[([^\]]+)\]/);
    if (sec) { cur = sec[1].trim(); secs[cur] = {}; lastKey = null; continue; }
    // Continuation line: starts with whitespace and follows a key
    if (cur && lastKey && /^[ \t]/.test(rawLine)) {
      secs[cur][lastKey] += '\n' + rawLine.trim();
      continue;
    }
    if (cur) {
      const kv = rawLine.trim().match(/^([^=]+)=(.*)/);
      if (kv) {
        lastKey = kv[1].trim();
        const val = kv[2].trim();
        if (!(lastKey in secs[cur])) secs[cur][lastKey] = val;
      } else {
        lastKey = null;
      }
    }
  }
  return secs;
}

function row(label, value) {
  if (value == null || value === '') return '';
  return `<div class="f8-row"><span class="f8-key">${esc(label)}</span><span class="f8-val">${esc(value)}</span></div>`;
}

export function render(intake) {
  const ini = parseIni(intake.text || '');
  const flake8 = ini['flake8'] || {};

  const maxLine = flake8['max-line-length'] || flake8['max_line_length'] || '';
  const maxComplexity = flake8['max-complexity'] || flake8['max_complexity'] || '';
  const maxDocLength = flake8['max-doc-length'] || flake8['max_doc_length'] || '';
  const selectRaw = flake8['select'] || '';
  const extendSelectRaw = flake8['extend-select'] || flake8['extend_select'] || '';

  // ignore / extend-ignore codes
  const ignoreRaw = flake8['ignore'] || flake8['extend-ignore'] || flake8['extend_ignore'] || '';
  const extIgnoreRaw = (flake8['extend-ignore'] || flake8['extend_ignore'] || '');
  const allIgnoreRaw = [flake8['ignore'] || '', extIgnoreRaw].filter(Boolean).join(',');
  const ignoreCodes = allIgnoreRaw.split(',').map((s) => s.trim()).filter(Boolean);

  // exclude dirs
  const excludeRaw = flake8['exclude'] || flake8['extend-exclude'] || flake8['extend_exclude'] || '';
  const excludeDirs = excludeRaw.split(',').map((s) => s.trim()).filter(Boolean);

  // per-file-ignores
  const perFileRaw = flake8['per-file-ignores'] || flake8['per_file_ignores'] || '';
  const perFileLines = perFileRaw.split(/[\n,]/).map((s) => s.trim()).filter((s) => s.includes(':'));

  const settingsHtml = (maxLine || maxComplexity || maxDocLength) ? `
<div class="f8-sec"><h3>[flake8] Settings</h3><div class="f8-card">
${row('max-line-length', maxLine)}
${row('max-complexity', maxComplexity)}
${row('max-doc-length', maxDocLength)}
</div></div>` : '';

  const ignoreHtml = ignoreCodes.length ? `
<div class="f8-sec"><h3>Ignored codes (${ignoreCodes.length})</h3>
<div class="f8-chips">${ignoreCodes.slice(0, 40).map((c) => `<span class="f8-chip">${esc(c)}</span>`).join('')}${ignoreCodes.length > 40 ? `<span class="f8-chip">+${ignoreCodes.length - 40} more</span>` : ''}</div>
</div>` : '';

  const excludeHtml = excludeDirs.length ? `
<div class="f8-sec"><h3>Excluded paths (${excludeDirs.length})</h3>
<div class="f8-chips">${excludeDirs.map((d) => `<span class="f8-chip exc">${esc(d)}</span>`).join('')}</div>
</div>` : '';

  const perFileHtml = perFileLines.length ? `
<div class="f8-sec"><h3>Per-file ignores (${perFileLines.length})</h3>
<div class="f8-card">${perFileLines.map((l) => {
    const [pat, codes] = l.split(':');
    return `<div class="f8-pf-block"><span class="f8-pf-key">${esc(pat.trim())}</span> → ${esc(codes ? codes.trim() : '')}</div>`;
  }).join('')}</div>
</div>` : '';

  const subParts = [];
  if (maxLine) subParts.push(`max-line: ${maxLine}`);
  if (maxComplexity) subParts.push(`max-complexity: ${maxComplexity}`);
  if (ignoreCodes.length) subParts.push(`${ignoreCodes.length} ignored`);
  if (excludeDirs.length) subParts.push(`${excludeDirs.length} excluded`);
  const sub = subParts.join(' · ') || 'Flake8 style and lint configuration';

  const host = document.createElement('div');
  host.className = 'f8-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="f8-title"><span class="badge-f8">Flake8</span>Flake8 Configuration</div>
<div class="f8-sub">${esc(sub)}</div>
${settingsHtml}${ignoreHtml}${excludeHtml}${perFileHtml}`;
  return { parentNode: host };
}
