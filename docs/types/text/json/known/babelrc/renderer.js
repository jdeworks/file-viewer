const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.babelrc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-babelrc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#F5DA55;color:#1a1a1a;vertical-align:middle;margin-right:8px;}
.babelrc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.babelrc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.babelrc-sec{margin:12px 0;}
.babelrc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.babelrc-chip{display:inline-block;font-size:11px;padding:2px 9px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 4px 2px 0;}
.babelrc-chip-opts{font-size:10px;opacity:.75;margin-left:4px;}
.babelrc-chip-list{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;}
.babelrc-env-block{border-left:3px solid var(--border,#e0e0e0);padding-left:12px;margin:6px 0 6px 0;}
.babelrc-env-name{font:11px/1.4 ui-monospace,monospace;font-weight:700;color:var(--fg-2,#888);margin:0 0 4px;}
.babelrc-kv{display:grid;grid-template-columns:max-content 1fr;gap:3px 14px;font-size:12px;margin:4px 0;}
.babelrc-k{font-family:ui-monospace,monospace;color:var(--fg-2,#888);}
.babelrc-v{font-family:ui-monospace,monospace;font-weight:600;}
.babelrc-ignore-list{list-style:none;margin:4px 0;padding:0;}
.babelrc-ignore-list li{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
`;

function normalizeItem(item) {
  if (typeof item === 'string') return { name: item, opts: null };
  if (Array.isArray(item)) {
    const name = String(item[0] || '');
    const opts = item[1] != null ? item[1] : null;
    return { name, opts };
  }
  return { name: String(item), opts: null };
}

function itemChip(item) {
  const { name, opts } = normalizeItem(item);
  const optsStr = opts != null ? `<span class="babelrc-chip-opts">${esc(JSON.stringify(opts).slice(0, 60))}</span>` : '';
  return `<span class="babelrc-chip">${esc(name)}${optsStr}</span>`;
}

function itemsSection(items, label, limit = 15) {
  if (!items || !items.length) return '';
  const shown = items.slice(0, limit);
  const more = items.length - shown.length;
  return `<div class="babelrc-sec"><h3>${esc(label)} (${items.length})</h3>
    <div class="babelrc-chip-list">${shown.map(itemChip).join('')}${more > 0 ? `<span class="babelrc-chip" style="opacity:.6">+${more} more</span>` : ''}</div>
  </div>`;
}

export function render(intake) {
  let cfg;
  try {
    cfg = intake.parsed ?? JSON.parse(intake.text || '{}');
  } catch {
    const host = document.createElement('div');
    host.className = 'babelrc-doc';
    host.innerHTML = `<style>${CSS}</style><div class="babelrc-title"><span class="badge-babelrc">Babel</span>Invalid JSON</div>`;
    return { parentNode: host };
  }

  const filename = (intake.name || intake.filename || '').split('/').pop() || '.babelrc';
  const presets = Array.isArray(cfg.presets) ? cfg.presets : [];
  const plugins = Array.isArray(cfg.plugins) ? cfg.plugins : [];
  const envs = cfg.env ? Object.entries(cfg.env) : [];
  const ignore = Array.isArray(cfg.ignore) ? cfg.ignore : [];
  const only = Array.isArray(cfg.only) ? cfg.only : [];
  const sourceMaps = cfg.sourceMaps != null ? cfg.sourceMaps : null;

  // Environment overrides
  const envsHtml = envs.length ? `<div class="babelrc-sec"><h3>Environment overrides (${envs.length})</h3>${envs.map(([envName, envCfg]) => {
    const envPresets = Array.isArray(envCfg.presets) ? envCfg.presets : [];
    const envPlugins = Array.isArray(envCfg.plugins) ? envCfg.plugins : [];
    return `<div class="babelrc-env-block">
      <div class="babelrc-env-name">${esc(envName)}</div>
      ${envPresets.length ? `<div class="babelrc-chip-list">${envPresets.map(itemChip).join('')}</div>` : ''}
      ${envPlugins.length ? `<div class="babelrc-chip-list">${envPlugins.map(itemChip).join('')}</div>` : ''}
    </div>`;
  }).join('')}</div>` : '';

  const ignoreHtml = ignore.length
    ? `<div class="babelrc-sec"><h3>Ignore (${ignore.length})</h3><ul class="babelrc-ignore-list">${ignore.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`
    : '';

  const onlyHtml = only.length
    ? `<div class="babelrc-sec"><h3>Only (${only.length})</h3><ul class="babelrc-ignore-list">${only.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`
    : '';

  const metaHtml = sourceMaps != null
    ? `<div class="babelrc-sec"><h3>Settings</h3><div class="babelrc-kv"><span class="babelrc-k">sourceMaps</span><span class="babelrc-v">${esc(String(sourceMaps))}</span></div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'babelrc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="babelrc-title"><span class="badge-babelrc">Babel</span>${esc(filename)}</div>
<div class="babelrc-sub">Babel transpiler config · ${presets.length} preset${presets.length !== 1 ? 's' : ''} · ${plugins.length} plugin${plugins.length !== 1 ? 's' : ''}${envs.length ? ` · ${envs.length} env${envs.length !== 1 ? 's' : ''}` : ''}</div>
${itemsSection(presets, 'Presets')}
${itemsSection(plugins, 'Plugins', 15)}
${envsHtml}
${metaHtml}
${ignoreHtml}
${onlyHtml}`;

  return { parentNode: host };
}
