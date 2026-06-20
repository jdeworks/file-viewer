// Enhanced tspconfig.yaml viewer — shows emitters, options, imports, extends, envVars.
import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tspconfig-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-tspconfig{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0078D4;color:#fff;vertical-align:middle;margin-right:8px}
.tspconfig-title{font-size:18px;font-weight:700;margin:0 0 4px}
.tspconfig-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.tspconfig-sec{margin:14px 0}
.tspconfig-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.tspconfig-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.tspconfig-row{display:flex;gap:8px;font-size:13px;padding:4px 0;border-bottom:1px solid var(--border,#f0f0f0);align-items:flex-start}
.tspconfig-row:last-child{border-bottom:none}
.tspconfig-key{color:var(--fg-2,#888);min-width:200px;flex-shrink:0;font-size:12px;font-family:ui-monospace,monospace}
.tspconfig-val{font-family:ui-monospace,monospace;word-break:break-all;font-size:12px;color:var(--fg,#24292f)}
.tspconfig-emitter{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:10px}
.tspconfig-emitter-name{font:13px/1.4 ui-monospace,monospace;font-weight:600;color:#0078D4;margin-bottom:6px}
.tspconfig-pill{display:inline-block;font-size:12px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 3px 2px 0}
.tspconfig-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:#e0f2fe;border:1px solid #7dd3fc;color:#0369a1;font-family:ui-monospace,monospace;margin:2px 3px 2px 0}
.tspconfig-extends{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888)}
.tspconfig-env-name{font:12px/1.4 ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f)}
.tspconfig-env-desc{font-size:12px;color:var(--fg-2,#888);margin-left:6px}
`;

function fmtValue(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 80);
  return String(v);
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const emit = Array.isArray(cfg.emit) ? cfg.emit : (cfg.emit ? [cfg.emit] : []);
  const options = cfg.options && typeof cfg.options === 'object' ? cfg.options : {};
  const imports = Array.isArray(cfg.imports) ? cfg.imports : (cfg.imports ? [cfg.imports] : []);
  const extendsPath = cfg.extends || null;
  const envVars = cfg.environmentVariables || cfg.envVars || cfg['env-variables'] || null;

  // Emit section
  const emitHtml = emit.length
    ? `<div class="tspconfig-sec"><h3>Emit (${emit.length} emitter${emit.length !== 1 ? 's' : ''})</h3><div class="tspconfig-card">
        ${emit.map(e => `<div class="tspconfig-row"><span class="tspconfig-val">${esc(String(e))}</span></div>`).join('')}
      </div></div>`
    : '';

  // Options section — one card per emitter
  let optionsHtml = '';
  const optEntries = Object.entries(options);
  if (optEntries.length) {
    const cards = optEntries.map(([emitterName, emitterOpts]) => {
      const rows = emitterOpts && typeof emitterOpts === 'object'
        ? Object.entries(emitterOpts).map(([k, v]) =>
            `<div class="tspconfig-row"><span class="tspconfig-key">${esc(k)}</span><span class="tspconfig-val">${esc(fmtValue(v))}</span></div>`
          ).join('')
        : `<div class="tspconfig-row"><span class="tspconfig-val">${esc(fmtValue(emitterOpts))}</span></div>`;
      return `<div class="tspconfig-emitter">
        <div class="tspconfig-emitter-name">${esc(emitterName)}</div>
        ${rows}
      </div>`;
    }).join('');
    optionsHtml = `<div class="tspconfig-sec"><h3>Options</h3>${cards}</div>`;
  }

  // Imports section
  const importsHtml = imports.length
    ? `<div class="tspconfig-sec"><h3>Imports</h3><div class="tspconfig-card">
        ${imports.map(i => `<div class="tspconfig-row"><span class="tspconfig-val">${esc(String(i))}</span></div>`).join('')}
      </div></div>`
    : '';

  // Extends section
  const extendsHtml = extendsPath
    ? `<div class="tspconfig-sec"><h3>Extends</h3><div class="tspconfig-card"><div class="tspconfig-row"><span class="tspconfig-extends">${esc(String(extendsPath))}</span></div></div></div>`
    : '';

  // Environment variables section
  let envHtml = '';
  if (envVars && typeof envVars === 'object') {
    const envEntries = Object.entries(envVars);
    if (envEntries.length) {
      const rows = envEntries.map(([name, meta]) => {
        const desc = meta && typeof meta === 'object'
          ? (meta.description || meta.desc || '')
          : String(meta || '');
        const defaultVal = meta && typeof meta === 'object' ? meta.default : null;
        return `<div class="tspconfig-row">
          <span class="tspconfig-key">${esc(name)}</span>
          <span class="tspconfig-val">${desc ? esc(String(desc)) : ''}${defaultVal != null ? `<span style="color:var(--fg-2,#888);margin-left:6px">(default: ${esc(String(defaultVal))})</span>` : ''}</span>
        </div>`;
      }).join('');
      envHtml = `<div class="tspconfig-sec"><h3>Environment Variables</h3><div class="tspconfig-card">${rows}</div></div>`;
    }
  }

  const sub = [
    emit.length ? `${emit.length} emitter${emit.length !== 1 ? 's' : ''}` : '',
    optEntries.length ? `${optEntries.length} emitter config${optEntries.length !== 1 ? 's' : ''}` : '',
    imports.length ? `${imports.length} import${imports.length !== 1 ? 's' : ''}` : '',
    extendsPath ? 'extends parent' : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'tspconfig-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="tspconfig-title">
  <span class="badge-tspconfig">TypeSpec</span>TypeSpec config
</div>
<div class="tspconfig-sub">${esc(sub) || 'TypeSpec compiler configuration'}</div>
${emitHtml}${optionsHtml}${importsHtml}${extendsHtml}${envHtml}`;

  return { parentNode: host };
}
