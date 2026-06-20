// Enhanced dbt_project.yml viewer.
// Shows project identity, profile, paths, and model materialization summary.
import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dbt-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-dbt{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ff6b35;color:#fff;vertical-align:middle;margin-right:8px}
.dbt-title{font-size:18px;font-weight:700;margin:0 0 4px}
.dbt-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.dbt-sec{margin:12px 0}
.dbt-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.dbt-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.dbt-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.dbt-row:last-child{border-bottom:none}
.dbt-key{color:var(--fg-2,#888);min-width:130px;flex-shrink:0;font-size:12px}
.dbt-val{font-family:ui-monospace,monospace;word-break:break-all}
.dbt-chip{display:inline-block;font-size:11px;padding:2px 9px;border-radius:10px;background:#fff3e0;border:1px solid #ffb74d;color:#e65100;margin:2px 3px 2px 0;font-weight:600}
.dbt-chip.incremental{background:#e8f5e9;border-color:#81c784;color:#1b5e20}
.dbt-chip.view{background:#e3f2fd;border-color:#64b5f6;color:#0d47a1}
.dbt-chip.ephemeral{background:#f3e5f5;border-color:#ba68c8;color:#4a148c}
.dbt-paths{list-style:none;margin:0;padding:0}
.dbt-path{padding:3px 0;font:12px/1.4 ui-monospace,monospace;border-bottom:1px solid var(--border,#f0f0f0)}
.dbt-path:last-child{border-bottom:none}
.dbt-vars{display:grid;grid-template-columns:1fr 1fr;gap:4px}
.dbt-var{font-size:12px;padding:4px 8px;background:var(--bg-2,#f6f8fa);border-radius:4px;border:1px solid var(--border,#e0e0e0)}
.dbt-var-k{color:var(--fg-2,#888);margin-right:4px}
`;

function materializationChip(val) {
  const v = String(val || '').toLowerCase();
  const cls = v === 'incremental' ? 'incremental' : v === 'view' ? 'view' : v === 'ephemeral' ? 'ephemeral' : '';
  return `<span class="dbt-chip ${cls}">${esc(val)}</span>`;
}

// Flatten model config: collect all +materialized values found recursively
function collectMaterializations(obj, results = new Set()) {
  if (!obj || typeof obj !== 'object') return results;
  if (Array.isArray(obj)) return results;
  for (const [k, v] of Object.entries(obj)) {
    if (k === '+materialized' || k === 'materialized') {
      if (typeof v === 'string') results.add(v);
    } else {
      collectMaterializations(v, results);
    }
  }
  return results;
}

// Count model sub-keys (top-level model groups)
function countModelGroups(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return 0;
  return Object.keys(obj).length;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch {
    cfg = intake.parsed || {};
  }

  const name = cfg.name || (intake.filename || intake.name || 'dbt_project.yml').split('/').pop();
  const version = cfg.version;
  const profile = cfg.profile;
  const requiresDbtVersion = cfg['require-dbt-version'];

  // Paths
  const modelPaths = cfg['model-paths'] || cfg.source_paths;
  const seedPaths = cfg['seed-paths'] || cfg.data_paths;
  const testPaths = cfg['test-paths'];
  const analysisPaths = cfg['analysis-paths'];
  const targetPath = cfg['target-path'];
  const cleanTargets = cfg['clean-targets'];

  // Models config
  const models = cfg.models;
  const materializations = collectMaterializations(models);
  const modelGroups = countModelGroups(models);

  // Vars
  const vars = cfg.vars;
  const varEntries = vars && typeof vars === 'object' && !Array.isArray(vars)
    ? Object.entries(vars).slice(0, 12)
    : [];

  // Main settings rows
  const settingsRows = [
    profile ? `<div class="dbt-row"><span class="dbt-key">profile</span><span class="dbt-val">${esc(profile)}</span></div>` : '',
    version != null ? `<div class="dbt-row"><span class="dbt-key">version</span><span class="dbt-val">${esc(version)}</span></div>` : '',
    requiresDbtVersion ? `<div class="dbt-row"><span class="dbt-key">require-dbt-version</span><span class="dbt-val">${esc(requiresDbtVersion)}</span></div>` : '',
    targetPath ? `<div class="dbt-row"><span class="dbt-key">target-path</span><span class="dbt-val">${esc(targetPath)}</span></div>` : '',
  ].filter(Boolean).join('');

  // Paths section
  function pathList(label, paths) {
    if (!paths || !paths.length) return '';
    const items = Array.isArray(paths) ? paths : [paths];
    return `<div class="dbt-sec"><h3>${esc(label)}</h3><div class="dbt-card"><ul class="dbt-paths">${items.map((p) => `<li class="dbt-path">${esc(p)}</li>`).join('')}</ul></div></div>`;
  }

  const pathsHtml = [
    pathList('Model Paths', modelPaths),
    pathList('Seed Paths', seedPaths),
    pathList('Test Paths', testPaths),
    pathList('Analysis Paths', analysisPaths),
    pathList('Clean Targets', cleanTargets),
  ].filter(Boolean).join('');

  // Models summary
  let modelsHtml = '';
  if (models) {
    const chips = materializations.size
      ? [...materializations].map(materializationChip).join('')
      : '';
    modelsHtml = `<div class="dbt-sec"><h3>Models</h3><div class="dbt-card">
      <div class="dbt-row"><span class="dbt-key">groups</span><span class="dbt-val">${esc(modelGroups)} top-level</span></div>
      ${chips ? `<div class="dbt-row"><span class="dbt-key">materializations</span><span class="dbt-val">${chips}</span></div>` : ''}
    </div></div>`;
  }

  // Vars section
  let varsHtml = '';
  if (varEntries.length) {
    const varItems = varEntries.map(([k, v]) =>
      `<div class="dbt-var"><span class="dbt-var-k">${esc(k)}:</span>${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</div>`
    ).join('');
    varsHtml = `<div class="dbt-sec"><h3>Variables (${varEntries.length})</h3><div class="dbt-card"><div class="dbt-vars">${varItems}</div></div></div>`;
  }

  const host = document.createElement('div');
  host.className = 'dbt-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="dbt-title"><span class="badge-dbt">dbt</span>${esc(name)}</div>
<div class="dbt-sub">dbt data transformation project</div>
${settingsRows ? `<div class="dbt-sec"><h3>Project</h3><div class="dbt-card">${settingsRows}</div></div>` : ''}
${modelsHtml}
${pathsHtml}
${varsHtml}`;
  return { parentNode: host };
}
