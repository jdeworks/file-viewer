import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function row(label, value) {
  if (!value) return '';
  return `<tr><td class="xp-label">${esc(label)}</td><td class="xp-val">${esc(value)}</td></tr>`;
}

export async function render(intake) {
  const text = intake.text || '';
  let doc = {};
  try { doc = (jsYaml.loadAll(text) || [])[0] || {}; } catch { /* ignore */ }

  const kind = doc.kind || '';
  const apiVersion = doc.apiVersion || '';
  const meta = doc.metadata || {};
  const name = meta.name || '';
  const namespace = meta.namespace || '';
  const spec = doc.spec || {};

  // Kind-specific spec rows
  const specRows = [];

  if (kind === 'Provider') {
    const pkg = spec.package || spec.image || '';
    if (pkg) specRows.push(row('package', pkg));
    const controllerConfig = spec.controllerConfigRef?.name || '';
    if (controllerConfig) specRows.push(row('controllerConfig', controllerConfig));
  } else if (kind === 'Configuration') {
    const deps = Array.isArray(spec.dependsOn) ? spec.dependsOn : [];
    deps.forEach((d) => {
      const pkg = d.provider || d.configuration || d.package || '';
      const ver = d.version || '';
      if (pkg) specRows.push(row('dependency', pkg + (ver ? ' ' + ver : '')));
    });
    if (spec.package) specRows.push(row('package', spec.package));
  } else if (kind === 'CompositeResourceDefinition' || kind === 'XRD') {
    if (spec.group) specRows.push(row('group', spec.group));
    const versions = Array.isArray(spec.versions) ? spec.versions.map((v) => v.name || '').filter(Boolean) : [];
    if (versions.length) specRows.push(row('versions', versions.join(', ')));
    const claimKind = spec.claimNames?.kind || '';
    if (claimKind) specRows.push(row('claim kind', claimKind));
  } else if (kind === 'Composition') {
    const compositeRef = spec.compositeTypeRef;
    if (compositeRef?.kind) specRows.push(row('compositeTypeRef', compositeRef.kind + (compositeRef.apiVersion ? ' (' + compositeRef.apiVersion + ')' : '')));
    const resources = Array.isArray(spec.resources) ? spec.resources : [];
    if (resources.length) specRows.push(row('resources', String(resources.length)));
    const pipeline = Array.isArray(spec.pipeline) ? spec.pipeline : [];
    if (pipeline.length) specRows.push(row('pipeline steps', String(pipeline.length)));
  }

  const host = document.createElement('div');
  host.className = 'xp-doc';
  host.innerHTML = `<style>
.xp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-xp{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2563eb;color:#fff;vertical-align:middle;margin-right:8px;}
.xp-kind-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1d4ed8;color:#fff;margin-right:6px;vertical-align:middle;}
.xp-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.xp-meta{font-size:12px;color:var(--fg-2,#888);margin:2px 0 12px;}
.xp-sec{margin:12px 0;}
.xp-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.xp-table{width:100%;border-collapse:collapse;font-size:13px;}
.xp-label{color:var(--fg-2,#888);font-size:12px;padding:4px 16px 4px 0;white-space:nowrap;vertical-align:top;min-width:130px;}
.xp-val{font:13px ui-monospace,monospace;padding:4px 0;word-break:break-all;}
.xp-table tr{border-bottom:1px solid var(--border,#e0e0e0);}
.xp-table tr:last-child{border-bottom:none;}
</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
  <span class="badge-xp">Crossplane</span>
  ${kind ? `<span class="xp-kind-badge">${esc(kind)}</span>` : ''}
  ${name ? `<span class="xp-title">${esc(name)}</span>` : ''}
</div>
${(apiVersion || namespace) ? `<div class="xp-meta">${apiVersion ? esc(apiVersion) : ''}${apiVersion && namespace ? ' · ' : ''}${namespace ? 'namespace: ' + esc(namespace) : ''}</div>` : ''}
${specRows.length ? `<div class="xp-sec"><h3>Spec</h3><table class="xp-table"><tbody>${specRows.join('')}</tbody></table></div>` : ''}`;

  return { parentNode: host };
}
