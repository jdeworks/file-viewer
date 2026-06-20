// Enhanced codegen.yml viewer — shows schema, documents, generates outputs, watch mode, hooks.
import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gqlcodegen-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-gqlcodegen{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#E535AB;color:#fff;vertical-align:middle;margin-right:8px}
.gqlcodegen-title{font-size:18px;font-weight:700;margin:0 0 4px}
.gqlcodegen-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.gqlcodegen-sec{margin:14px 0}
.gqlcodegen-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.gqlcodegen-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.gqlcodegen-row{display:flex;gap:8px;font-size:13px;padding:4px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.gqlcodegen-row:last-child{border-bottom:none}
.gqlcodegen-key{color:var(--fg-2,#888);min-width:140px;flex-shrink:0;font-size:12px}
.gqlcodegen-val{font-family:ui-monospace,monospace;word-break:break-all;font-size:12px}
.gqlcodegen-output{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:10px}
.gqlcodegen-output-path{font:13px/1.4 ui-monospace,monospace;font-weight:600;color:#E535AB;margin-bottom:6px}
.gqlcodegen-preset{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:#fce7f3;border:1px solid #f9a8d4;color:#9d174d;margin-left:6px;vertical-align:middle}
.gqlcodegen-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.gqlcodegen-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:var(--bg-3,#eee);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;color:var(--fg,#333)}
.gqlcodegen-chip.plugin{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
.gqlcodegen-pill{display:inline-block;font-size:12px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 3px 2px 0}
.gqlcodegen-watch{display:inline-block;font-size:11px;padding:2px 9px;border-radius:8px;background:#fef9c3;border:1px solid #fde047;color:#713f12;margin-left:8px;vertical-align:middle}
.gqlcodegen-truncate{max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;vertical-align:bottom}
`;

function toArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return [v];
}

function schemaSource(s) {
  if (typeof s === 'string') return s;
  if (s && typeof s === 'object') {
    const keys = Object.keys(s);
    return keys[0] || '(object)';
  }
  return String(s);
}

function truncate(str, max = 60) {
  const s = String(str);
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

const KNOWN_BOOL_OPTIONS = ['withHooks', 'withRefetchFunctions', 'enumsAsConst', 'skipTypename', 'addDocBlocks', 'avoidOptionals', 'immutableTypes', 'noExport'];

function fmtConfig(cfg) {
  if (!cfg || typeof cfg !== 'object') return '';
  const parts = [];
  for (const key of KNOWN_BOOL_OPTIONS) {
    if (key in cfg) parts.push(`${key}: ${cfg[key]}`);
  }
  // catch other top-level scalar options
  for (const [k, v] of Object.entries(cfg)) {
    if (!KNOWN_BOOL_OPTIONS.includes(k) && typeof v !== 'object') {
      parts.push(`${k}: ${v}`);
    }
  }
  return parts.slice(0, 5).join(', ') + (parts.length > 5 ? ' …' : '');
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const schemas = toArray(cfg.schema);
  const documents = toArray(cfg.documents);
  const generates = cfg.generates && typeof cfg.generates === 'object' ? cfg.generates : {};
  const outputFiles = Object.keys(generates);
  const watchMode = cfg.watch === true;
  const hooks = cfg.hooks || null;

  // Schema section
  const schemaHtml = schemas.length
    ? `<div class="gqlcodegen-sec"><h3>Schema</h3><div class="gqlcodegen-card">
        ${schemas.map(s => `<div class="gqlcodegen-row"><span class="gqlcodegen-key">source</span><span class="gqlcodegen-val"><span class="gqlcodegen-truncate" title="${esc(schemaSource(s))}">${esc(truncate(schemaSource(s), 70))}</span></span></div>`).join('')}
      </div></div>`
    : '';

  // Documents section
  const docsHtml = documents.length
    ? `<div class="gqlcodegen-sec"><h3>Documents</h3><div class="gqlcodegen-card">
        ${documents.map(d => `<div class="gqlcodegen-row"><span class="gqlcodegen-key">glob</span><span class="gqlcodegen-val">${esc(typeof d === 'string' ? d : JSON.stringify(d))}</span></div>`).join('')}
      </div></div>`
    : '';

  // Generates section
  let generatesHtml = '';
  if (outputFiles.length) {
    const cards = outputFiles.map((outPath) => {
      const outCfg = generates[outPath] || {};
      const plugins = Array.isArray(outCfg.plugins) ? outCfg.plugins : [];
      const preset = outCfg.preset || null;
      const presetConfig = outCfg.presetConfig || outCfg.config || null;
      const configSummary = fmtConfig(outCfg.config);

      const pluginNames = plugins.map((p) => {
        if (typeof p === 'string') return p;
        if (typeof p === 'object') return Object.keys(p)[0] || '(plugin)';
        return String(p);
      });

      return `<div class="gqlcodegen-output">
        <div class="gqlcodegen-output-path">${esc(outPath)}${preset ? `<span class="gqlcodegen-preset">preset: ${esc(preset)}</span>` : ''}</div>
        ${pluginNames.length ? `<div style="margin-bottom:4px;font-size:12px;color:var(--fg-2,#888)">Plugins:</div>
          <div class="gqlcodegen-chips">${pluginNames.map(n => `<span class="gqlcodegen-chip plugin">${esc(n)}</span>`).join('')}</div>` : ''}
        ${configSummary ? `<div style="margin-top:6px;font-size:12px;color:var(--fg-2,#888)"><span style="font-weight:600">Config:</span> <span style="font-family:ui-monospace,monospace">${esc(configSummary)}</span></div>` : ''}
      </div>`;
    }).join('');

    generatesHtml = `<div class="gqlcodegen-sec"><h3>Generates (${outputFiles.length} output file${outputFiles.length !== 1 ? 's' : ''})</h3>${cards}</div>`;
  }

  // Hooks section
  let hooksHtml = '';
  if (hooks && typeof hooks === 'object') {
    const hookRows = Object.entries(hooks)
      .filter(([, v]) => v != null)
      .map(([k, v]) => `<div class="gqlcodegen-row"><span class="gqlcodegen-key">${esc(k)}</span><span class="gqlcodegen-val">${esc(Array.isArray(v) ? v.join(', ') : String(v))}</span></div>`)
      .join('');
    if (hookRows) {
      hooksHtml = `<div class="gqlcodegen-sec"><h3>Hooks</h3><div class="gqlcodegen-card">${hookRows}</div></div>`;
    }
  }

  const sub = [
    schemas.length ? `${schemas.length} schema source${schemas.length !== 1 ? 's' : ''}` : '',
    outputFiles.length ? `${outputFiles.length} output file${outputFiles.length !== 1 ? 's' : ''}` : '',
    watchMode ? 'watch mode' : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'gqlcodegen-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="gqlcodegen-title">
  <span class="badge-gqlcodegen">The Guild</span>GraphQL Code Generator${watchMode ? `<span class="gqlcodegen-watch">watch</span>` : ''}
</div>
<div class="gqlcodegen-sub">${esc(sub)}</div>
${schemaHtml}${docsHtml}${generatesHtml}${hooksHtml}`;

  return { parentNode: host };
}
