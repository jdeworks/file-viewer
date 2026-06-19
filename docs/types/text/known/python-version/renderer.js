const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pv-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-pv{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3572a5;color:#fff;vertical-align:middle;margin-right:8px;}
.pv-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pv-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pv-versions{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0 16px;}
.pv-badge{display:inline-flex;flex-direction:column;align-items:center;padding:10px 18px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.pv-badge.primary{background:#eff6ff;border-color:#93c5fd;}
.pv-badge-ver{font:22px/1.2 ui-monospace,monospace;font-weight:700;color:var(--fg,#24292f);}
.pv-badge-note{font-size:11px;color:var(--fg-2,#888);margin-top:4px;}
.pv-sec{margin:14px 0 8px;}
.pv-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.pv-table{width:100%;border-collapse:collapse;font-size:13px;}
.pv-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.pv-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.pv-tool{font-weight:600;font-size:13px;}
.pv-cmd{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);}
`;

const MANAGERS = [
  { name: 'pyenv', cmd: (v) => `pyenv install ${v}` },
  { name: 'asdf', cmd: (v) => `asdf install python ${v}` },
  { name: 'mise', cmd: (v) => `mise install python@${v}` },
];

export function render(intake) {
  const text = intake.text || '';
  const versions = text.split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  const badgesHtml = versions.map((v, i) =>
    `<div class="pv-badge${i === 0 ? ' primary' : ''}">
      <span class="pv-badge-ver">${esc(v)}</span>
      <span class="pv-badge-note">${i === 0 ? 'active' : `fallback ${i}`}</span>
    </div>`,
  ).join('');

  // Show install commands for the first (active) version
  const primary = versions[0] || '';
  const managerRows = primary ? MANAGERS.map((m) =>
    `<tr><td class="pv-tool">${esc(m.name)}</td><td class="pv-cmd">${esc(m.cmd(primary))}</td></tr>`,
  ).join('') : '';

  const host = document.createElement('div');
  host.className = 'pv-doc';

  host.innerHTML = `<style>${CSS}</style>
<div class="pv-title"><span class="badge-pv">Python</span>.python-version</div>
<div class="pv-sub">pyenv version pin${versions.length > 1 ? ` · ${versions.length} versions` : ''} · first entry is the active version</div>
${versions.length ? `<div class="pv-versions">${badgesHtml}</div>` : '<div style="color:var(--fg-2,#888);font-size:13px;">No versions found.</div>'}
${primary ? `<div class="pv-sec"><h3>Install active version with</h3>
  <table class="pv-table">
    <thead><tr><th>Manager</th><th>Command</th></tr></thead>
    <tbody>${managerRows}</tbody>
  </table>
</div>` : ''}`;

  return { parentNode: host };
}
