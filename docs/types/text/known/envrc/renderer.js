const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SENSITIVE = /SECRET|PASSWORD|TOKEN|KEY|API|PRIVATE/;

const CSS = `
.erc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-erc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1b4332;color:#fff;vertical-align:middle;margin-right:8px}
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
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const lines = text.split('\n');

  const exports = [];
  const directives = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const expMatch = /^export\s+([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(trimmed);
    if (expMatch) {
      const key = expMatch[1];
      const rawVal = expMatch[2].trim().replace(/^["']|["']$/g, '');
      const isSensitive = SENSITIVE.test(key.toUpperCase());
      exports.push({ key, val: isSensitive ? null : rawVal, redacted: isSensitive });
      continue;
    }

    const layoutMatch = /^(?:layout|use)\s+(.+)$/.exec(trimmed);
    if (layoutMatch) {
      directives.push(trimmed);
    }
  }

  const exportsHtml = exports.length
    ? `<div class="erc-sec"><h3>Exports (${exports.length})</h3><table class="erc-table"><thead><tr><th>Variable</th><th>Value</th></tr></thead><tbody>${exports.map((e) => `<tr><td><span class="erc-key">${esc(e.key)}</span></td><td>${e.redacted ? '<span class="erc-redacted">[redacted]</span>' : `<span class="erc-val">${esc(e.val)}</span>`}</td></tr>`).join('')}</tbody></table></div>`
    : '';

  const dirHtml = directives.length
    ? `<div class="erc-sec"><h3>Directives</h3><div class="erc-pills">${directives.map((d) => `<span class="erc-pill">${esc(d)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'erc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="erc-title"><span class="badge-erc">direnv</span>.envrc</div>
<div class="erc-sub">${exports.length} export${exports.length !== 1 ? 's' : ''}${directives.length ? `, ${directives.length} directive${directives.length !== 1 ? 's' : ''}` : ''}</div>
${exportsHtml}${dirHtml}`;
  return { parentNode: host };
}
