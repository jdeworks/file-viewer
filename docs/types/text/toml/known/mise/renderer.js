const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mse-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-mse{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#6d28d9;color:#fff;vertical-align:middle;margin-right:8px}
.mse-title{font-size:18px;font-weight:700;margin:0 0 4px}
.mse-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.mse-sec{margin:12px 0}
.mse-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.mse-table{width:100%;border-collapse:collapse;font-size:13px}
.mse-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.mse-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.mse-tool{font:13px/1.4 ui-monospace,monospace;font-weight:600}
.mse-ver{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888)}
.mse-pills{display:flex;flex-wrap:wrap;gap:6px}
.mse-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
`;

function parseSectionBlock(text, header) {
  const re = new RegExp('\\[' + header.replace('.', '\\.') + '\\]([\\s\\S]*?)(?=\\n\\[|$)');
  const m = re.exec(text);
  return m ? m[1] : '';
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);

  // Parse [tools] section
  const toolsBlock = parseSectionBlock(text, 'tools');
  const tools = [];
  for (const line of toolsBlock.split('\n')) {
    const m = /^\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*"?([^"#\n]+)"?/.exec(line);
    if (m) tools.push({ name: m[1].trim(), version: m[2].trim() });
  }

  // Parse [tasks.NAME] sections
  const taskNames = [...text.matchAll(/\[tasks\.([^\]]+)\]/g)].map((m) => m[1]);

  // Parse [env] section key names
  const envBlock = parseSectionBlock(text, 'env');
  const envKeys = [];
  for (const line of envBlock.split('\n')) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    if (m) envKeys.push(m[1]);
  }

  const toolsHtml = tools.length
    ? `<div class="mse-sec"><h3>Tools (${tools.length})</h3><table class="mse-table"><thead><tr><th>Tool</th><th>Version</th></tr></thead><tbody>${tools.map((t) => `<tr><td><span class="mse-tool">${esc(t.name)}</span></td><td><span class="mse-ver">${esc(t.version)}</span></td></tr>`).join('')}</tbody></table></div>`
    : '';

  const tasksHtml = taskNames.length
    ? `<div class="mse-sec"><h3>Tasks (${taskNames.length})</h3><div class="mse-pills">${taskNames.map((t) => `<span class="mse-pill">${esc(t)}</span>`).join('')}</div></div>`
    : '';

  const envHtml = envKeys.length
    ? `<div class="mse-sec"><h3>Env vars (${envKeys.length})</h3><div class="mse-pills">${envKeys.map((k) => `<span class="mse-pill">${esc(k)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'mse-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="mse-title"><span class="badge-mse">mise</span>mise.toml</div>
<div class="mse-sub">${tools.length} tool${tools.length !== 1 ? 's' : ''}${taskNames.length ? `, ${taskNames.length} task${taskNames.length !== 1 ? 's' : ''}` : ''}</div>
${toolsHtml}${tasksHtml}${envHtml}`;
  return { parentNode: host };
}
