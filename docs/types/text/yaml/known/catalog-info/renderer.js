import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cat-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-cat{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1f5bbd;color:#fff;vertical-align:middle;margin-right:8px;}
.cat-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cat-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.cat-kind{display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:700;border:2px solid;margin-right:6px;vertical-align:middle;}
.cat-kind.Component{background:#e3f2fd;border-color:#1e88e5;color:#1e88e5;}
.cat-kind.API{background:#f3e5f5;border-color:#8e24aa;color:#8e24aa;}
.cat-kind.System{background:#e8f5e9;border-color:#43a047;color:#43a047;}
.cat-kind.Group{background:#fff8e1;border-color:#f9a825;color:#f9a825;}
.cat-kind.User{background:#fce4ec;border-color:#e91e63;color:#e91e63;}
.cat-kind.Resource{background:#fff3e0;border-color:#fb8c00;color:#fb8c00;}
.cat-kind.Domain{background:#e0f2f1;border-color:#00897b;color:#00897b;}
.cat-kind.Location{background:#f1f8e9;border-color:#7cb342;color:#7cb342;}
.cat-kind.other{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.cat-sec{margin:12px 0;}
.cat-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.cat-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:8px 0;}
.cat-key{font-size:12px;color:var(--fg-2,#888);}
.cat-val{font:12px ui-monospace,monospace;color:var(--accent,#1f5bbd);word-break:break-all;}
.cat-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.cat-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.cat-pill.dep{background:#e3f2fd;border-color:#90caf9;color:#1565c0;}
.cat-desc{font-size:13px;color:var(--fg,#24292f);background:var(--bg-2,#f6f8fa);border-radius:6px;padding:8px 12px;margin:6px 0;border-left:3px solid #1f5bbd;}
.cat-tag{display:inline-block;background:#e8eaed;border-radius:4px;padding:2px 7px;font-size:11px;margin:2px;color:var(--fg-2,#555);}
.cat-lc{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;}
.cat-lc.production{background:#e8f5e9;color:#2e7d32;}
.cat-lc.experimental{background:#fff8e1;color:#f57f17;}
.cat-lc.deprecated{background:#fce4ec;color:#c62828;}
.cat-lc.other{background:var(--bg-2,#f6f8fa);color:var(--fg-2,#888);}
`;

const KNOWN_KINDS = new Set(['Component', 'API', 'System', 'Group', 'User', 'Resource', 'Domain', 'Location']);

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = {}; }

  const apiVersion = cfg.apiVersion || '';
  const kind = cfg.kind || '';
  const kindClass = KNOWN_KINDS.has(kind) ? kind : 'other';
  const metadata = cfg.metadata || {};
  const spec = cfg.spec || {};

  const name = metadata.name || '';
  const namespace = metadata.namespace || 'default';
  const description = metadata.description || '';
  const title = metadata.title || '';
  const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
  const labels = metadata.labels || {};
  const annotations = metadata.annotations || {};

  const specType = spec.type || '';
  const lifecycle = spec.lifecycle || '';
  const owner = spec.owner || '';
  const system = spec.system || '';
  const dependsOn = Array.isArray(spec.dependsOn) ? spec.dependsOn : [];
  const dependencyOf = Array.isArray(spec.dependencyOf) ? spec.dependencyOf : [];
  const consumesApis = Array.isArray(spec.consumesApis) ? spec.consumesApis : [];
  const providesApis = Array.isArray(spec.providesApis) ? spec.providesApis : [];
  const members = Array.isArray(spec.members) ? spec.members : [];
  const children = Array.isArray(spec.children) ? spec.children : [];
  const profile = metadata.profile || {};

  const lcClass = ['production', 'experimental', 'deprecated'].includes(lifecycle) ? lifecycle : lifecycle ? 'other' : '';

  const parts = [];
  if (kind) parts.push(kind);
  if (name) parts.push(name);
  if (lifecycle) parts.push(lifecycle);

  const techDocsAnnotation = annotations['backstage.io/techdocs-ref'] || '';

  const host = document.createElement('div');
  host.className = 'cat-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="cat-title">
  <span class="badge-cat">Backstage</span>${esc(title || name || 'Catalog Entity')}
</div>
<div class="cat-sub">${parts.join(' · ')}${namespace !== 'default' ? ` · ns: ${esc(namespace)}` : ''}</div>

<div class="cat-sec">
  <div style="margin-bottom:8px;">
    ${kind ? `<span class="cat-kind ${kindClass}">${esc(kind)}</span>` : ''}
    ${lifecycle ? `<span class="cat-lc ${lcClass}">${esc(lifecycle)}</span>` : ''}
  </div>
  <div class="cat-grid">
    ${name ? `<span class="cat-key">Name</span><span class="cat-val">${esc(name)}</span>` : ''}
    ${apiVersion ? `<span class="cat-key">API version</span><span class="cat-val">${esc(apiVersion)}</span>` : ''}
    ${specType ? `<span class="cat-key">Type</span><span class="cat-val">${esc(specType)}</span>` : ''}
    ${owner ? `<span class="cat-key">Owner</span><span class="cat-val">${esc(owner)}</span>` : ''}
    ${system ? `<span class="cat-key">System</span><span class="cat-val">${esc(system)}</span>` : ''}
    ${spec.definition ? `<span class="cat-key">Definition</span><span class="cat-val">${esc(typeof spec.definition === 'string' ? spec.definition.slice(0, 60) : 'yes')}</span>` : ''}
  </div>
</div>

${description ? `<div class="cat-desc">${esc(description)}</div>` : ''}

${tags.length ? `<div class="cat-sec"><h3>Tags</h3><div>${tags.map((t) => `<span class="cat-tag">${esc(String(t))}</span>`).join('')}</div></div>` : ''}

${dependsOn.length ? `<div class="cat-sec"><h3>Depends On (${dependsOn.length})</h3><div class="cat-pills">${dependsOn.slice(0, 8).map((d) => `<span class="cat-pill dep">${esc(String(d))}</span>`).join('')}${dependsOn.length > 8 ? `<span class="cat-pill">+${dependsOn.length - 8}</span>` : ''}</div></div>` : ''}

${providesApis.length ? `<div class="cat-sec"><h3>Provides APIs</h3><div class="cat-pills">${providesApis.map((a) => `<span class="cat-pill">${esc(String(a))}</span>`).join('')}</div></div>` : ''}

${consumesApis.length ? `<div class="cat-sec"><h3>Consumes APIs</h3><div class="cat-pills">${consumesApis.map((a) => `<span class="cat-pill">${esc(String(a))}</span>`).join('')}</div></div>` : ''}

${members.length ? `<div class="cat-sec"><h3>Members (${members.length})</h3><div class="cat-pills">${members.slice(0, 10).map((m) => `<span class="cat-pill">${esc(String(m))}</span>`).join('')}${members.length > 10 ? `<span class="cat-pill">+${members.length - 10}</span>` : ''}</div></div>` : ''}

${children.length ? `<div class="cat-sec"><h3>Children</h3><div class="cat-pills">${children.map((c) => `<span class="cat-pill">${esc(String(c))}</span>`).join('')}</div></div>` : ''}

${techDocsAnnotation ? `<div class="cat-sec"><h3>TechDocs</h3><div class="cat-pills"><span class="cat-pill">${esc(techDocsAnnotation)}</span></div></div>` : ''}
`;
  return { parentNode: host };
}
