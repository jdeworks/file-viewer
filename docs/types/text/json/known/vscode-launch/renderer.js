const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vsc-launch-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-vsc-launch{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#007acc;color:#fff;vertical-align:middle;margin-right:8px;}
.vsc-launch-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.vsc-launch-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.vsc-launch-sec{margin:12px 0;}
.vsc-launch-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.vsc-launch-table{width:100%;border-collapse:collapse;font-size:13px;}
.vsc-launch-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.vsc-launch-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.vsc-launch-name{font-weight:600;color:var(--fg,#24292f);}
.vsc-launch-type{font:11px/1.4 ui-monospace,monospace;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.vsc-launch-req{font-size:11px;padding:1px 7px;border-radius:8px;font-family:ui-monospace,monospace;}
.vsc-launch-req.launch{background:#e6f4ea;color:#1a7f37;border:1px solid #86efac;}
.vsc-launch-req.attach{background:#eff6ff;color:#1d4ed8;border:1px solid #93c5fd;}
.vsc-mono{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);}
`;

export function render(intake) {
  let cfg;
  try { cfg = JSON.parse(intake.text || '{}'); } catch { return { parentNode: Object.assign(document.createElement('div'), { textContent: 'Invalid VS Code launch JSON.' }) }; }

  const configs = Array.isArray(cfg.configurations) ? cfg.configurations : [];
  const compounds = Array.isArray(cfg.compounds) ? cfg.compounds : [];

  const rows = configs.map((c) => {
    const target = c.program || c.url || c.remoteRoot || '';
    return `<tr>
      <td><span class="vsc-launch-name">${esc(c.name || '?')}</span></td>
      <td><span class="vsc-launch-type">${esc(c.type || '?')}</span></td>
      <td><span class="vsc-launch-req ${c.request === 'attach' ? 'attach' : 'launch'}">${esc(c.request || 'launch')}</span></td>
      <td><span class="vsc-mono">${esc(target || '—')}</span></td>
    </tr>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'vsc-launch-doc';

  host.innerHTML = `<style>${CSS}</style>
<div class="vsc-launch-title"><span class="badge-vsc-launch">VS Code</span>Launch configurations</div>
<div class="vsc-launch-sub">${configs.length} configuration${configs.length !== 1 ? 's' : ''}${compounds.length ? ` · ${compounds.length} compound${compounds.length !== 1 ? 's' : ''}` : ''}</div>
${configs.length ? `<div class="vsc-launch-sec"><h3>Configurations</h3>
  <table class="vsc-launch-table">
    <thead><tr><th>Name</th><th>Type</th><th>Request</th><th>Target</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>` : '<div style="color:var(--fg-2,#888);font-size:13px">No debug configurations found.</div>'}
${compounds.length ? `<div class="vsc-launch-sec"><h3>Compounds</h3><div style="display:flex;flex-wrap:wrap;gap:6px">${compounds.map((c) => `<span style="font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0)">${esc(c.name || '?')}</span>`).join('')}</div></div>` : ''}`;

  return { parentNode: host };
}
