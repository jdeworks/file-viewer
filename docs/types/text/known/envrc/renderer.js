const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SENSITIVE = /SECRET|PASSWORD|TOKEN|KEY|API|PRIVATE/;

const CSS = `
.erc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-erc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#E5A800;color:#1a1a1a;vertical-align:middle;margin-right:8px}
.erc-title{font-size:18px;font-weight:700;margin:0 0 4px}
.erc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.erc-sec{margin:12px 0}
.erc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.erc-table{width:100%;border-collapse:collapse;font-size:13px}
.erc-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.erc-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.erc-key{font:13px/1.4 ui-monospace,monospace;font-weight:600}
.erc-val{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);word-break:break-all}
.erc-redacted{font:12px/1.4 ui-monospace,monospace;color:#b91c1c;background:#fee2e2;padding:1px 5px;border-radius:4px}
.erc-pills{display:flex;flex-wrap:wrap;gap:6px}
.erc-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.erc-pill-layout{background:#e0f0ff;border-color:#90c4f0}
.erc-pill-use{background:#f0ffe0;border-color:#90d080}
.erc-info-row{font-size:13px;padding:4px 0;color:var(--fg,#24292f);display:flex;align-items:center;gap:8px}
.erc-info-label{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);min-width:100px}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const lines = text.split('\n');

  const exports = [];      // { key, val, redacted }
  const layouts = [];      // 'layout node', 'layout python3' etc
  const uses = [];         // 'use nvm 18', 'use ruby 3.1' etc
  const pathAdds = [];     // path strings
  const dotenvLines = [];  // 'dotenv', 'dotenv_if_exists .env.local'
  const sourceLines = [];  // source_up, source_env
  const customs = [];      // anything else

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // export VAR=value
    const expMatch = /^export\s+([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(trimmed);
    if (expMatch) {
      const key = expMatch[1];
      const rawVal = expMatch[2].trim().replace(/^["']|["']$/g, '');
      const isSensitive = SENSITIVE.test(key.toUpperCase());
      exports.push({ key, val: isSensitive ? null : rawVal, redacted: isSensitive });
      continue;
    }

    // layout <runtime>
    const layoutMatch = /^layout\s+(.+)$/.exec(trimmed);
    if (layoutMatch) {
      layouts.push(trimmed);
      continue;
    }

    // use <tool> [version]
    const useMatch = /^use\s+(.+)$/.exec(trimmed);
    if (useMatch) {
      uses.push(trimmed);
      continue;
    }

    // PATH_add <path>
    const pathMatch = /^PATH_add\s+(.+)$/.exec(trimmed);
    if (pathMatch) {
      pathAdds.push(pathMatch[1].trim());
      continue;
    }

    // dotenv / dotenv_if_exists
    if (/^dotenv(?:_if_exists)?/.test(trimmed)) {
      dotenvLines.push(trimmed);
      continue;
    }

    // source_up / source_env
    if (/^source_(?:up|env)/.test(trimmed)) {
      sourceLines.push(trimmed);
      continue;
    }

    customs.push(trimmed);
  }

  let html = '<style>' + CSS + '</style>';
  html += '<div class="erc-title"><span class="badge-erc">direnv</span>.envrc</div>';

  const parts = [];
  if (layouts.length) parts.push(layouts.length + ' layout' + (layouts.length !== 1 ? 's' : ''));
  if (uses.length) parts.push(uses.length + ' use');
  if (exports.length) parts.push(exports.length + ' export' + (exports.length !== 1 ? 's' : ''));
  if (pathAdds.length) parts.push(pathAdds.length + ' PATH_add');
  html += '<div class="erc-sub">' + (parts.join(', ') || 'Empty config') + '</div>';

  // Layout + use directives
  if (layouts.length || uses.length) {
    html += '<div class="erc-sec"><h3>Layouts &amp; Runtimes</h3><div class="erc-pills">';
    for (const l of layouts) html += '<span class="erc-pill erc-pill-layout">' + esc(l) + '</span>';
    for (const u of uses) html += '<span class="erc-pill erc-pill-use">' + esc(u) + '</span>';
    html += '</div></div>';
  }

  // PATH additions
  if (pathAdds.length) {
    const shown = pathAdds.slice(0, 5);
    html += '<div class="erc-sec"><h3>PATH additions</h3><div class="erc-pills">';
    for (const p of shown) html += '<span class="erc-pill">' + esc(p) + '</span>';
    if (pathAdds.length > 5) html += '<span style="font-size:12px;color:var(--fg-2,#888)">+' + (pathAdds.length - 5) + ' more</span>';
    html += '</div></div>';
  }

  // dotenv
  if (dotenvLines.length) {
    html += '<div class="erc-sec"><h3>dotenv loading</h3><div class="erc-pills">';
    for (const d of dotenvLines) html += '<span class="erc-pill">' + esc(d) + '</span>';
    html += '</div></div>';
  }

  // source
  if (sourceLines.length) {
    html += '<div class="erc-sec"><h3>Source</h3><div class="erc-pills">';
    for (const s of sourceLines) html += '<span class="erc-pill">' + esc(s) + '</span>';
    html += '</div></div>';
  }

  // Exports table
  if (exports.length) {
    html += '<div class="erc-sec"><h3>Exports (' + exports.length + ')</h3>'
      + '<table class="erc-table"><thead><tr><th>Variable</th><th>Value</th></tr></thead><tbody>';
    for (const e of exports) {
      const valHtml = e.redacted
        ? '<span class="erc-redacted">[configured]</span>'
        : '<span class="erc-val">' + esc(e.val) + '</span>';
      html += '<tr><td><span class="erc-key">' + esc(e.key) + '</span></td><td>' + valHtml + '</td></tr>';
    }
    html += '</tbody></table></div>';
  }

  // Custom commands (first 5)
  if (customs.length) {
    const shown = customs.slice(0, 5);
    html += '<div class="erc-sec"><h3>Custom commands</h3><div class="erc-pills">';
    for (const c of shown) html += '<span class="erc-pill">' + esc(c) + '</span>';
    if (customs.length > 5) html += '<span style="font-size:12px;color:var(--fg-2,#888)">+' + (customs.length - 5) + ' more</span>';
    html += '</div></div>';
  }

  if (!layouts.length && !uses.length && !exports.length && !pathAdds.length && !dotenvLines.length && !sourceLines.length && !customs.length) {
    html += '<p style="color:var(--fg-2,#888);font-size:13px">No directives found.</p>';
  }

  const host = document.createElement('div');
  host.className = 'erc-doc';
  host.innerHTML = html;
  return { parentNode: host };
}
