const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.bbl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-bbl{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#F5DA55;color:#323330;vertical-align:middle;margin-right:8px;}
.bbl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.bbl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.bbl-sec{margin:12px 0;}
.bbl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.bbl-chip{display:inline-block;font-size:11px;padding:2px 9px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 4px 2px 0;}
.bbl-chip-list{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;}
.bbl-table{width:100%;border-collapse:collapse;font-size:13px;}
.bbl-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.bbl-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.bbl-name{font:12px/1.4 ui-monospace,monospace;font-weight:600;}
.bbl-env-hdr{font:11px/1.4 ui-monospace,monospace;font-weight:700;color:var(--fg-2,#888);margin:8px 0 4px;}
`;

function normalizeItem(item) {
  if (typeof item === 'string') return { name: item, opts: null };
  if (Array.isArray(item)) return { name: String(item[0] || ''), opts: item[1] || null };
  return { name: String(item), opts: null };
}

function itemsTable(items, label) {
  if (!items || !items.length) return '';
  const rows = items.map((item) => {
    const { name, opts } = normalizeItem(item);
    const optsStr = opts ? JSON.stringify(opts).slice(0, 60) : '';
    return `<tr>
      <td><span class="bbl-name">${esc(name)}</span></td>
      <td style="font-size:11px;color:var(--fg-2,#888);font-family:ui-monospace,monospace;">${esc(optsStr)}</td>
    </tr>`;
  }).join('');
  return `<div class="bbl-sec"><h3>${label}</h3>
    <table class="bbl-table">
      <thead><tr><th>Name</th><th>Options</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

export function render(intake) {
  let cfg;
  try { cfg = JSON.parse(intake.text || '{}'); } catch {
    const host = document.createElement('div');
    host.className = 'bbl-doc';
    host.innerHTML = `<style>${CSS}</style><div class="bbl-title"><span class="badge-bbl">Babel</span>Invalid JSON</div>`;
    return { parentNode: host };
  }

  const presets = Array.isArray(cfg.presets) ? cfg.presets : [];
  const plugins = Array.isArray(cfg.plugins) ? cfg.plugins : [];
  const envs = cfg.env ? Object.keys(cfg.env) : [];
  const overrides = Array.isArray(cfg.overrides) ? cfg.overrides : [];
  const assumptions = cfg.assumptions ? Object.keys(cfg.assumptions) : [];

  const envsHtml = envs.length ? `<div class="bbl-sec"><h3>Environments (${envs.length})</h3>
    <div class="bbl-chip-list">${envs.map((e) => `<span class="bbl-chip">${esc(e)}</span>`).join('')}</div>
  </div>` : '';

  const assumptionsHtml = assumptions.length ? `<div class="bbl-sec"><h3>Assumptions</h3>
    <div class="bbl-chip-list">${assumptions.map((a) => `<span class="bbl-chip">${esc(a)}: ${esc(cfg.assumptions[a])}</span>`).join('')}</div>
  </div>` : '';

  const host = document.createElement('div');
  host.className = 'bbl-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="bbl-title"><span class="badge-bbl">Babel</span>Babel config</div>
<div class="bbl-sub">${presets.length} preset${presets.length !== 1 ? 's' : ''} · ${plugins.length} plugin${plugins.length !== 1 ? 's' : ''}${envs.length ? ` · ${envs.length} env${envs.length !== 1 ? 's' : ''}` : ''}${overrides.length ? ` · ${overrides.length} override${overrides.length !== 1 ? 's' : ''}` : ''}</div>
${itemsTable(presets, 'Presets')}
${itemsTable(plugins, 'Plugins')}
${envsHtml}
${assumptionsHtml}`;

  return { parentNode: host };
}
