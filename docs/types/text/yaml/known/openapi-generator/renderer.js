import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.openapigen-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.openapigen-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#49cc90;color:#fff;vertical-align:middle;margin-right:8px}
.openapigen-title{font-size:18px;font-weight:700;margin:0 0 4px}
.openapigen-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.openapigen-gen-chip{display:inline-block;font-size:14px;font-weight:700;padding:4px 14px;border-radius:14px;background:#e7f9f0;border:1px solid #86efac;color:#166534;font-family:ui-monospace,monospace;vertical-align:middle;margin-left:6px}
.openapigen-sec{margin:14px 0}
.openapigen-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.openapigen-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff)}
.openapigen-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:12px;border-bottom:1px solid var(--border,#f0f0f0);padding-bottom:3px}
.openapigen-kv:last-child{border-bottom:none;padding-bottom:0}
.openapigen-kv-k{color:var(--fg-2,#888);min-width:200px;flex-shrink:0;font-family:ui-monospace,monospace}
.openapigen-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.openapigen-url{font-family:ui-monospace,monospace;font-size:12px;color:#49cc90;word-break:break-all}
.openapigen-path{font-family:ui-monospace,monospace;font-size:12px;color:#5277c3;word-break:break-all}
.openapigen-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}
.openapigen-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
`;

const GENERATOR_LANGS = {
  'typescript-axios': 'TypeScript · Axios',
  'typescript-fetch': 'TypeScript · Fetch',
  'typescript-node': 'TypeScript · Node',
  'typescript-angular': 'TypeScript · Angular',
  'java': 'Java',
  'spring': 'Java · Spring',
  'python': 'Python',
  'python-fastapi': 'Python · FastAPI',
  'go': 'Go',
  'rust': 'Rust',
  'kotlin': 'Kotlin',
  'swift5': 'Swift 5',
  'csharp': 'C#',
  'php': 'PHP',
  'ruby': 'Ruby',
  'dart': 'Dart',
  'scala-akka': 'Scala · Akka',
  'javascript': 'JavaScript',
  'javascript-apollo': 'JavaScript · Apollo',
};

function fmtValue(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function kvRow(key, valueHtml) {
  return `<div class="openapigen-kv"><span class="openapigen-kv-k">${esc(key)}</span><span class="openapigen-kv-v">${valueHtml}</span></div>`;
}

function objTable(obj) {
  if (!obj || typeof obj !== 'object') return '';
  const rows = Object.entries(obj)
    .map(([k, v]) => kvRow(k, esc(fmtValue(v))))
    .join('');
  return rows ? `<div class="openapigen-card">${rows}</div>` : '';
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const generatorName = cfg.generatorName || cfg.generator || '';
  const inputSpec = cfg.inputSpec || cfg.input || cfg['input-spec'] || '';
  const outputDir = cfg.outputDir || cfg.output || cfg['output-dir'] || '';
  const additionalProps = cfg.additionalProperties || null;
  const globalProps = cfg.globalProperties || null;
  const typeMappings = cfg.typeMappings || null;
  const importMappings = cfg.importMappings || null;
  const templateDir = cfg.templateDir || cfg['template-dir'] || '';
  const ignoreFile = cfg.ignoreFileOverride || '';

  // Summary parts
  const parts = [];
  if (generatorName) parts.push(`generator: ${generatorName}`);
  if (additionalProps && typeof additionalProps === 'object') {
    parts.push(`${Object.keys(additionalProps).length} additional properties`);
  }

  const genLabel = GENERATOR_LANGS[generatorName] || generatorName;
  const genChip = generatorName
    ? `<span class="openapigen-gen-chip">${esc(genLabel)}</span>`
    : '';

  let sectionsHtml = '';

  // Generator + I/O
  const ioRows = [];
  if (inputSpec) {
    const isUrl = /^https?:\/\//.test(inputSpec);
    ioRows.push(`<div class="openapigen-kv"><span class="openapigen-kv-k">inputSpec</span><span class="${isUrl ? 'openapigen-url' : 'openapigen-path'}">${esc(inputSpec)}</span></div>`);
  }
  if (outputDir) {
    ioRows.push(`<div class="openapigen-kv"><span class="openapigen-kv-k">outputDir</span><span class="openapigen-path">${esc(outputDir)}</span></div>`);
  }
  if (templateDir) {
    ioRows.push(`<div class="openapigen-kv"><span class="openapigen-kv-k">templateDir</span><span class="openapigen-path">${esc(templateDir)}</span></div>`);
  }
  if (ignoreFile) {
    ioRows.push(`<div class="openapigen-kv"><span class="openapigen-kv-k">ignoreFileOverride</span><span class="openapigen-path">${esc(ignoreFile)}</span></div>`);
  }
  if (ioRows.length) {
    sectionsHtml += `<div class="openapigen-sec"><h3>Configuration</h3><div class="openapigen-card">${ioRows.join('')}</div></div>`;
  }

  // Additional properties
  if (additionalProps && typeof additionalProps === 'object') {
    sectionsHtml += `<div class="openapigen-sec"><h3>Additional Properties (${Object.keys(additionalProps).length})</h3>${objTable(additionalProps)}</div>`;
  }

  // Global properties
  if (globalProps && typeof globalProps === 'object') {
    sectionsHtml += `<div class="openapigen-sec"><h3>Global Properties</h3>${objTable(globalProps)}</div>`;
  }

  // Type mappings
  if (typeMappings && typeof typeMappings === 'object') {
    sectionsHtml += `<div class="openapigen-sec"><h3>Type Mappings</h3>${objTable(typeMappings)}</div>`;
  }

  // Import mappings
  if (importMappings && typeof importMappings === 'object') {
    const keys = Object.keys(importMappings);
    if (keys.length) {
      const pills = keys.map((k) => `<span class="openapigen-pill">${esc(k)}</span>`).join('');
      sectionsHtml += `<div class="openapigen-sec"><h3>Import Mappings (${keys.length})</h3><div class="openapigen-pills">${pills}</div></div>`;
    }
  }

  const sub = parts.length ? parts.join(' · ') : 'OpenAPI Generator CLI configuration';

  const host = document.createElement('div');
  host.className = 'openapigen-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="openapigen-title"><span class="openapigen-badge">OpenAPI</span>OpenAPI Generator${genChip}</div>
<div class="openapigen-sub">${esc(sub)}</div>
${sectionsHtml}`;
  return { parentNode: host };
}
