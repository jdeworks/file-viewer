const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dprint-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-dprint{display:inline-block;background:#4f46e5;color:#fff;padding:2px 9px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.04em;margin-bottom:10px;}
.dprint-title{font-size:18px;font-weight:700;margin:0 0 12px;}
.dprint-sec{margin:14px 0;}
.dprint-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.dprint-plugins{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.dprint-plugin{display:inline-flex;align-items:center;gap:5px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#d1d9e0);}
.dprint-plugin-name{font-weight:600;}
.dprint-globs{display:flex;flex-direction:column;gap:3px;margin:4px 0;}
.dprint-glob{font:12px ui-monospace,monospace;color:var(--fg,#24292f);background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#d1d9e0);border-radius:4px;padding:2px 8px;display:inline-block;}
.dprint-plugin-cfg{border:1px solid var(--border,#d1d9e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.dprint-plugin-cfg-name{font-weight:700;font-size:13px;margin:0 0 6px;text-transform:capitalize;}
.dprint-kv{display:grid;grid-template-columns:max-content 1fr;gap:3px 16px;}
.dprint-k{font-size:12px;color:var(--fg-2,#888);}
.dprint-v{font:12px ui-monospace,monospace;}
.dprint-global{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.dprint-global-pill{font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#d1d9e0);}
`;

// Known dprint plugin config keys to surface (by plugin name prefix)
const PLUGIN_KEYS = {
  typescript: ['indentWidth', 'lineWidth', 'quoteStyle', 'semiColons', 'trailingCommas', 'useBraces', 'bracePosition'],
  json: ['indentWidth', 'lineWidth', 'trailingCommas'],
  markdown: ['lineWidth', 'emphasisKind', 'strongKind', 'textWrap'],
  toml: ['indentWidth', 'lineWidth'],
  prettier: ['indentWidth', 'lineWidth', 'printWidth'],
  malva: ['indentWidth', 'printWidth'],
  g_sql: ['indentWidth', 'lineWidth', 'keywordCase', 'quoteStyle'],
};

// Infer plugin name from URL or package name
function pluginName(url) {
  if (!url || typeof url !== 'string') return url;
  // e.g. https://plugins.dprint.dev/typescript-0.91.0.wasm -> typescript
  // or   https://plugins.dprint.dev/dprint/typescript@0.91.0/plugin
  const m = url.match(/\/([a-z_-]+?)[@-]\d/) || url.match(/\/([a-z_-]+)\.(wasm|json)$/) || url.match(/dprint\/([a-z_-]+)/);
  if (m) return m[1];
  return url.split('/').pop() || url;
}

export function render(intake) {
  let cfg = {};
  try { cfg = intake.parsed ?? JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const plugins = Array.isArray(cfg.plugins) ? cfg.plugins : [];
  const includes = Array.isArray(cfg.includes) ? cfg.includes : [];
  const excludes = Array.isArray(cfg.excludes) ? cfg.excludes : [];
  const lineWidth = cfg.lineWidth;
  const indentWidth = cfg.indentWidth;

  // Known plugin category keys
  const pluginCategoryKeys = new Set(['typescript', 'javascript', 'json', 'markdown', 'toml', 'malva', 'g-sql', 'graphql', 'prettier']);
  const pluginConfigs = [];
  for (const [key, val] of Object.entries(cfg)) {
    if (key === 'plugins' || key === 'includes' || key === 'excludes' || key === 'lineWidth' || key === 'indentWidth' || key.startsWith('$')) continue;
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      pluginConfigs.push({ name: key, cfg: val });
    }
  }

  const host = document.createElement('div');
  host.className = 'dprint-doc';

  let html = `<style>${CSS}</style>
<span class="badge-dprint">dprint</span>
<div class="dprint-title">dprint formatter</div>`;

  // Global settings
  const globalPills = [];
  if (lineWidth != null) globalPills.push(`lineWidth: ${esc(lineWidth)}`);
  if (indentWidth != null) globalPills.push(`indentWidth: ${esc(indentWidth)}`);
  if (globalPills.length) {
    html += `<div class="dprint-sec"><h3>Global settings</h3><div class="dprint-global">
      ${globalPills.map((p) => `<span class="dprint-global-pill">${p}</span>`).join('')}
    </div></div>`;
  }

  // Plugins
  if (plugins.length) {
    const names = plugins.map(pluginName);
    html += `<div class="dprint-sec"><h3>Plugins (${plugins.length})</h3><div class="dprint-plugins">
      ${names.map((n) => `<span class="dprint-plugin"><span class="dprint-plugin-name">${esc(n)}</span></span>`).join('')}
    </div></div>`;
  }

  // Includes / Excludes
  if (includes.length) {
    html += `<div class="dprint-sec"><h3>Includes</h3><div class="dprint-globs">
      ${includes.slice(0, 10).map((g) => `<span class="dprint-glob">${esc(g)}</span>`).join('')}
      ${includes.length > 10 ? `<span style="font-size:11px;color:var(--fg-2,#888)">…and ${includes.length - 10} more</span>` : ''}
    </div></div>`;
  }
  if (excludes.length) {
    html += `<div class="dprint-sec"><h3>Excludes</h3><div class="dprint-globs">
      ${excludes.slice(0, 10).map((g) => `<span class="dprint-glob">${esc(g)}</span>`).join('')}
      ${excludes.length > 10 ? `<span style="font-size:11px;color:var(--fg-2,#888)">…and ${excludes.length - 10} more</span>` : ''}
    </div></div>`;
  }

  // Per-plugin config blocks
  if (pluginConfigs.length) {
    html += `<div class="dprint-sec"><h3>Per-plugin config</h3>`;
    for (const { name, cfg: pcfg } of pluginConfigs) {
      const interesting = PLUGIN_KEYS[name] || PLUGIN_KEYS[name.replace(/-/g, '_')] || Object.keys(pcfg).slice(0, 8);
      const rows = [];
      for (const key of interesting) {
        if (pcfg[key] != null) {
          const val = typeof pcfg[key] === 'object' ? JSON.stringify(pcfg[key]) : String(pcfg[key]);
          rows.push(`<span class="dprint-k">${esc(key)}</span><span class="dprint-v">${esc(val)}</span>`);
        }
      }
      if (!rows.length) {
        // show first few keys anyway
        for (const [k, v] of Object.entries(pcfg).slice(0, 5)) {
          const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
          rows.push(`<span class="dprint-k">${esc(k)}</span><span class="dprint-v">${esc(val)}</span>`);
        }
      }
      html += `<div class="dprint-plugin-cfg">
<div class="dprint-plugin-cfg-name">${esc(name)}</div>
${rows.length ? `<div class="dprint-kv">${rows.join('')}</div>` : '<span style="font-size:12px;color:var(--fg-2,#888)">no overrides</span>'}
</div>`;
    }
    html += '</div>';
  }

  if (!plugins.length && !pluginConfigs.length && !includes.length) {
    html += `<p style="color:var(--fg-2);font-style:italic;font-size:12px">Empty dprint config.</p>`;
  }

  host.innerHTML = html;
  return { parentNode: host };
}
