import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.syft-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-syft{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2196F3;color:#fff;vertical-align:middle;margin-right:8px}
.syft-title{font-size:18px;font-weight:700;margin:0 0 4px}
.syft-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.syft-sec{margin:14px 0}
.syft-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.syft-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.syft-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.syft-kv-k{color:var(--fg-2,#888);min-width:160px;flex-shrink:0}
.syft-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.syft-pills{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0}
.syft-pill{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.syft-bool-on{color:#1a7a3c;font-weight:600}
.syft-bool-off{color:var(--fg-2,#888)}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="syft-kv"><span class="syft-kv-k">${esc(label)}</span><span class="syft-kv-v">${esc(String(value))}</span></div>`;
}

function boolVal(v) {
  if (v === true) return '<span class="syft-bool-on">enabled</span>';
  if (v === false) return '<span class="syft-bool-off">disabled</span>';
  return esc(String(v));
}

export async function render(intake) {
  const jsYaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  const text = intake.text || '';
  let doc = {};
  try { doc = (jsYaml.loadAll(text) || [])[0] || {}; } catch { /* ignore parse errors */ }

  // Output formats
  const outputs = Array.isArray(doc.output) ? doc.output
    : typeof doc.output === 'string' ? [doc.output] : [];

  // Source / scan target
  const source = doc.source || {};
  const sourceImage = source.image || {};
  const sourceName = source.name || '';

  // Catalogers
  const catalogers = doc.catalogers || doc['package-catalogers'] || {};
  const enabledCatalogers = Array.isArray(catalogers.enabled) ? catalogers.enabled
    : Array.isArray(catalogers) ? catalogers : [];
  const disabledCatalogers = Array.isArray(catalogers.disabled) ? catalogers.disabled : [];
  const catalogerDefault = catalogers.default || '';

  // File metadata cataloger
  const fileMeta = doc['file-metadata-cataloger'] || doc.fileMetadataCataloger || {};
  const fileMetaEnabled = fileMeta.enabled;

  // Secrets
  const secrets = doc['secret-cataloger'] || doc.secrets || doc.secretCataloger || {};
  const secretsEnabled = secrets.enabled;
  const secretPatterns = Array.isArray(secrets['additional-patterns']) ? secrets['additional-patterns']
    : Array.isArray(secrets.additionalPatterns) ? secrets.additionalPatterns : [];
  const secretExcludes = secrets.excludePatternNames || secrets['exclude-pattern-names'] || [];

  // File classifications
  const fileClass = doc['file-classification-cataloger'] || doc.fileClassificationCataloger || {};
  const fileClassEnabled = fileClass.enabled;

  // Log level
  const logLevel = doc.log?.level || doc.logLevel || '';

  const subParts = [
    outputs.length ? `${outputs.length} output format${outputs.length !== 1 ? 's' : ''}` : '',
    enabledCatalogers.length ? `${enabledCatalogers.length} cataloger${enabledCatalogers.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);

  const outputHtml = outputs.length ? `<div class="syft-sec"><h3>Output formats</h3>
<div class="syft-pills">${outputs.map((o) => `<span class="syft-pill">${esc(o)}</span>`).join('')}</div></div>` : '';

  const sourceHtml = (sourceName || sourceImage.defaultPullSource) ? `<div class="syft-sec"><h3>Source</h3><div class="syft-card">
${sourceName ? kv('Name', sourceName) : ''}
${sourceImage.defaultPullSource ? kv('Default pull source', sourceImage.defaultPullSource) : ''}
</div></div>` : '';

  const catalogerHtml = (enabledCatalogers.length || disabledCatalogers.length || catalogerDefault) ? `<div class="syft-sec"><h3>Package catalogers</h3><div class="syft-card">
${catalogerDefault ? `<div class="syft-kv"><span class="syft-kv-k">Default</span><span class="syft-kv-v">${esc(catalogerDefault)}</span></div>` : ''}
${enabledCatalogers.length ? `<div class="syft-kv"><span class="syft-kv-k">Enabled</span><span style="flex:1"><div class="syft-pills">${enabledCatalogers.map((c) => `<span class="syft-pill">${esc(c)}</span>`).join('')}</div></span></div>` : ''}
${disabledCatalogers.length ? `<div class="syft-kv"><span class="syft-kv-k">Disabled</span><span style="flex:1"><div class="syft-pills">${disabledCatalogers.map((c) => `<span class="syft-pill">${esc(c)}</span>`).join('')}</div></span></div>` : ''}
</div></div>` : '';

  const metaHtml = fileMetaEnabled != null ? `<div class="syft-sec"><h3>File Metadata Cataloger</h3><div class="syft-card">
<div class="syft-kv"><span class="syft-kv-k">Enabled</span><span>${boolVal(fileMetaEnabled)}</span></div>
</div></div>` : '';

  const secretsHtml = secretsEnabled != null ? `<div class="syft-sec"><h3>Secret cataloger</h3><div class="syft-card">
<div class="syft-kv"><span class="syft-kv-k">Enabled</span><span>${boolVal(secretsEnabled)}</span></div>
${secretPatterns.length ? `<div class="syft-kv"><span class="syft-kv-k">Additional patterns</span><span class="syft-kv-v">${secretPatterns.length}</span></div>` : ''}
${Array.isArray(secretExcludes) && secretExcludes.length ? `<div class="syft-kv"><span class="syft-kv-k">Excluded patterns</span><span style="flex:1"><div class="syft-pills">${secretExcludes.map((p) => `<span class="syft-pill">${esc(p)}</span>`).join('')}</div></span></div>` : ''}
</div></div>` : '';

  const classHtml = fileClassEnabled != null ? `<div class="syft-sec"><h3>File Classification</h3><div class="syft-card">
<div class="syft-kv"><span class="syft-kv-k">Enabled</span><span>${boolVal(fileClassEnabled)}</span></div>
</div></div>` : '';

  const logHtml = logLevel ? `<div class="syft-sec"><h3>Logging</h3><div class="syft-card">
${kv('Log level', logLevel)}
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'syft-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-syft">Syft</span>
  <span class="syft-title">syft.yaml</span>
</div>
<div class="syft-sub">${subParts.length ? esc(subParts.join(' · ')) : 'Syft SBOM generation config'}</div>
${outputHtml}${sourceHtml}${catalogerHtml}${metaHtml}${secretsHtml}${classHtml}${logHtml}`;
  return { parentNode: host };
}
