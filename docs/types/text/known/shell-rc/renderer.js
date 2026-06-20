const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SENSITIVE = /SECRET|PASSWORD|TOKEN|KEY|API/i;

const CSS = `
.shrc-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-shrc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1e3a5f;color:#fff;vertical-align:middle;margin-right:8px}
.shrc-title{font-size:18px;font-weight:700;margin:0 0 4px}
.shrc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.shrc-sec{margin:14px 0}
.shrc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.shrc-table{width:100%;border-collapse:collapse;font-size:13px}
.shrc-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.shrc-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.shrc-name{font:13px/1.4 ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f)}
.shrc-val{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#666);word-break:break-all}
.shrc-redacted{font:12px/1.4 ui-monospace,monospace;color:#b91c1c;background:#fee2e2;padding:1px 5px;border-radius:4px}
.shrc-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.shrc-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;word-break:break-all}
.shrc-empty{font-size:12px;color:var(--fg-2,#aaa);font-style:italic}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const filename = (intake.name || intake.filename || '').split('/').pop() || 'shell config';
  const lines = text.split('\n');

  const aliases = [];
  const exports = [];
  const sources = [];
  const functions = [];
  const pathAdditions = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // PATH additions (check before general exports)
    const pathMatch = /^export\s+PATH\s*=/.exec(trimmed);
    if (pathMatch) {
      pathAdditions.push(trimmed.replace(/^export\s+PATH\s*=/, '').replace(/^["']|["']$/g, '').trim());
      continue;
    }

    // Aliases: alias name='command' or alias name="command" or alias name=command
    const aliasMatch = /^alias\s+([A-Za-z0-9_.\-]+)\s*=\s*['"]?(.*?)['"]?\s*$/.exec(trimmed);
    if (aliasMatch) {
      const name = aliasMatch[1];
      const cmd = trimmed.replace(/^alias\s+[A-Za-z0-9_.\-]+\s*=\s*/, '').replace(/^['"]|['"]$/g, '');
      aliases.push({ name, cmd });
      continue;
    }

    // Exports: export VAR=value
    const expMatch = /^export\s+([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(trimmed);
    if (expMatch) {
      const key = expMatch[1];
      const rawVal = expMatch[2].trim().replace(/^["']|["']$/g, '');
      const isSensitive = SENSITIVE.test(key);
      exports.push({ key, val: isSensitive ? null : rawVal, redacted: isSensitive });
      continue;
    }

    // Sourced files: source file or . file
    const sourceMatch = /^(?:source|\.)\s+(.+)$/.exec(trimmed);
    if (sourceMatch) {
      sources.push(sourceMatch[1].trim().replace(/^["']|["']$/g, ''));
      continue;
    }

    // Functions: funcname() { or function funcname {
    const funcMatch = /^(?:function\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*\)\s*\{?/.exec(trimmed);
    if (funcMatch && !trimmed.startsWith('if ') && !trimmed.startsWith('while ') && !trimmed.startsWith('for ') && !trimmed.startsWith('case ')) {
      functions.push(funcMatch[1]);
      continue;
    }
    const funcMatch2 = /^function\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*\{|\s*$)/.exec(trimmed);
    if (funcMatch2) {
      if (!functions.includes(funcMatch2[1])) functions.push(funcMatch2[1]);
      continue;
    }
  }

  // Sections HTML
  const aliasRows = aliases.slice(0, 20).map((a) =>
    `<tr><td><span class="shrc-name">${esc(a.name)}</span></td><td><span class="shrc-val">${esc(a.cmd)}</span></td></tr>`
  ).join('');
  const aliasHtml = aliases.length
    ? `<div class="shrc-sec"><h3>Aliases (${Math.min(aliases.length, 20)}${aliases.length > 20 ? ` of ${aliases.length}` : ''})</h3><table class="shrc-table"><thead><tr><th>Name</th><th>Command</th></tr></thead><tbody>${aliasRows}</tbody></table></div>`
    : '';

  const exportRows = exports.slice(0, 15).map((e) =>
    `<tr><td><span class="shrc-name">${esc(e.key)}</span></td><td>${e.redacted ? '<span class="shrc-redacted">[redacted]</span>' : `<span class="shrc-val">${esc(e.val)}</span>`}</td></tr>`
  ).join('');
  const exportHtml = exports.length
    ? `<div class="shrc-sec"><h3>Exports (${Math.min(exports.length, 15)}${exports.length > 15 ? ` of ${exports.length}` : ''})</h3><table class="shrc-table"><thead><tr><th>Variable</th><th>Value</th></tr></thead><tbody>${exportRows}</tbody></table></div>`
    : '';

  const funcHtml = functions.length
    ? `<div class="shrc-sec"><h3>Functions (${Math.min(functions.length, 15)}${functions.length > 15 ? ` of ${functions.length}` : ''})</h3><div class="shrc-pills">${functions.slice(0, 15).map((f) => `<span class="shrc-pill">${esc(f)}()</span>`).join('')}</div></div>`
    : '';

  const sourceHtml = sources.length
    ? `<div class="shrc-sec"><h3>Sourced Files (${Math.min(sources.length, 10)}${sources.length > 10 ? ` of ${sources.length}` : ''})</h3><div class="shrc-pills">${sources.slice(0, 10).map((s) => `<span class="shrc-pill">${esc(s)}</span>`).join('')}</div></div>`
    : '';

  const pathHtml = pathAdditions.length
    ? `<div class="shrc-sec"><h3>PATH Additions (${pathAdditions.length})</h3><div class="shrc-pills">${pathAdditions.map((p) => `<span class="shrc-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const totalItems = aliases.length + exports.length + functions.length + sources.length + pathAdditions.length;
  const sub = [
    aliases.length && `${aliases.length} alias${aliases.length !== 1 ? 'es' : ''}`,
    exports.length && `${exports.length} export${exports.length !== 1 ? 's' : ''}`,
    functions.length && `${functions.length} function${functions.length !== 1 ? 's' : ''}`,
    sources.length && `${sources.length} source${sources.length !== 1 ? 's' : ''}`,
    pathAdditions.length && `${pathAdditions.length} PATH entry${pathAdditions.length !== 1 ? 'ies' : ''}`,
  ].filter(Boolean).join(', ') || 'No recognized shell constructs';

  const host = document.createElement('div');
  host.className = 'shrc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="shrc-title"><span class="badge-shrc">Shell Config</span>${esc(filename)}</div>
<div class="shrc-sub">${esc(sub)}</div>
${aliasHtml}${exportHtml}${funcHtml}${sourceHtml}${pathHtml}`;

  return { parentNode: host };
}
