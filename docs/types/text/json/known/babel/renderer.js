const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.babelcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-babelcfg{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f5da55;color:#1a1a1a;vertical-align:middle;margin-right:8px;}
.babelcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.babelcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.babelcfg-sec{margin:12px 0;}
.babelcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.babelcfg-chip{display:inline-block;font-size:11px;padding:2px 9px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 4px 2px 0;}
.babelcfg-chip-list{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;}
.babelcfg-table{width:100%;border-collapse:collapse;font-size:13px;}
.babelcfg-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.babelcfg-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.babelcfg-name{font:12px/1.4 ui-monospace,monospace;font-weight:600;}
.babelcfg-env-hdr{font:11px/1.4 ui-monospace,monospace;font-weight:700;color:var(--fg-2,#888);margin:8px 0 4px;}
.babelcfg-ignore-list{list-style:none;margin:4px 0;padding:0;}
.babelcfg-ignore-list li{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
`;

function normalizeItem(item) {
  if (typeof item === 'string') return { name: item, opts: null };
  if (Array.isArray(item)) return { name: String(item[0] || ''), opts: item[1] || null };
  return { name: String(item), opts: null };
}

function itemsSection(items, label) {
  if (!items || !items.length) return '';
  const chips = items.map((item) => {
    const { name } = normalizeItem(item);
    return `<span class="babelcfg-chip">${esc(name)}</span>`;
  }).join('');
  return `<div class="babelcfg-sec"><h3>${label} (${items.length})</h3>
    <div class="babelcfg-chip-list">${chips}</div>
  </div>`;
}

export function render(intake) {
  let cfg;
  try { cfg = intake.parsed ?? JSON.parse(intake.text || '{}'); } catch {
    const host = document.createElement('div');
    host.className = 'babelcfg-doc';
    host.innerHTML = `<style>${CSS}</style><div class="babelcfg-title"><span class="badge-babelcfg">Babel</span>Invalid JSON</div>`;
    return { parentNode: host };
  }

  const filename = (intake.name || intake.filename || '').split('/').pop() || 'babel.config.json';
  const presets = Array.isArray(cfg.presets) ? cfg.presets : [];
  const plugins = Array.isArray(cfg.plugins) ? cfg.plugins : [];
  const envs = cfg.env ? Object.entries(cfg.env) : [];
  const ignore = Array.isArray(cfg.ignore) ? cfg.ignore : [];

  // Environment overrides section
  const envsHtml = envs.length ? envs.map(([envName, envCfg]) => {
    const envPresets = Array.isArray(envCfg.presets) ? envCfg.presets : [];
    const envPlugins = Array.isArray(envCfg.plugins) ? envCfg.plugins : [];
    const parts = [];
    if (envPresets.length) parts.push(itemsSection(envPresets, 'Presets'));
    if (envPlugins.length) parts.push(itemsSection(envPlugins, 'Plugins'));
    return `<div class="babelcfg-sec">
      <div class="babelcfg-env-hdr">${esc(envName)}</div>
      ${parts.join('')}
    </div>`;
  }).join('') : '';

  const ignoreHtml = ignore.length
    ? `<div class="babelcfg-sec"><h3>Ignore (${ignore.length})</h3>
      <ul class="babelcfg-ignore-list">${ignore.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    </div>`
    : '';

  const host = document.createElement('div');
  host.className = 'babelcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="babelcfg-title"><span class="badge-babelcfg">Babel</span>${esc(filename)}</div>
<div class="babelcfg-sub">JavaScript transpiler config · ${presets.length} preset${presets.length !== 1 ? 's' : ''} · ${plugins.length} plugin${plugins.length !== 1 ? 's' : ''}${envs.length ? ` · ${envs.length} env${envs.length !== 1 ? 's' : ''}` : ''}</div>
${itemsSection(presets, 'Presets')}
${itemsSection(plugins, 'Plugins')}
${envs.length ? `<div class="babelcfg-sec"><h3>Environment overrides (${envs.length})</h3>${envsHtml}</div>` : ''}
${ignoreHtml}`;

  return { parentNode: host };
}
