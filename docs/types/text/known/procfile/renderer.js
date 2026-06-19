const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pfl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-pfl{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7209b7;color:#fff;vertical-align:middle;margin-right:8px}
.pfl-title{font-size:18px;font-weight:700;margin:0 0 4px}
.pfl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.pfl-table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
.pfl-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.pfl-table td{padding:6px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.pfl-type{font:13px/1.4 ui-monospace,monospace;font-weight:600;color:var(--accent,#7209b7)}
.pfl-cmd{font:12px/1.4 ui-monospace,monospace;color:var(--fg,#24292f);word-break:break-all}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const lines = text.split('\n');

  const procs = lines
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf(':');
      return i > 0 ? { type: l.slice(0, i).trim(), cmd: l.slice(i + 1).trim() } : null;
    })
    .filter(Boolean);

  const rows = procs.map((p) => `<tr><td><span class="pfl-type">${esc(p.type)}</span></td><td><span class="pfl-cmd">${esc(p.cmd)}</span></td></tr>`).join('');

  const tableHtml = procs.length
    ? `<table class="pfl-table"><thead><tr><th>Process type</th><th>Command</th></tr></thead><tbody>${rows}</tbody></table>`
    : '<div style="color:var(--fg-2,#888);font-size:13px">No process types found</div>';

  const host = document.createElement('div');
  host.className = 'pfl-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="pfl-title"><span class="badge-pfl">Procfile</span>Process definitions</div>
<div class="pfl-sub">${procs.length} process type${procs.length !== 1 ? 's' : ''}</div>
${tableHtml}`;
  return { parentNode: host };
}
