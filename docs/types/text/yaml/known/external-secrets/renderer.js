import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.exs-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-exs{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1f6feb;color:#fff;vertical-align:middle;margin-right:8px}
.exs-kind{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3a5ccc;color:#fff;vertical-align:middle;margin-right:6px}
.exs-title{font-size:18px;font-weight:700;margin:0 0 4px}
.exs-meta{font-size:12px;color:var(--fg-2,#888);margin:2px 0 12px}
.exs-sec{margin:12px 0}
.exs-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.exs-table{width:100%;border-collapse:collapse;font-size:13px}
.exs-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.exs-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;word-break:break-all;vertical-align:top}
.exs-table tr:last-child td{border-bottom:none}
.exs-row{display:flex;gap:8px;font-size:13px;padding:3px 0}
.exs-key{color:var(--fg-2,#888);min-width:130px;flex-shrink:0;font-size:12px}
.exs-val{font-family:ui-monospace,monospace;word-break:break-all}
.exs-masked{color:var(--fg-2,#aaa);font-style:italic}
.exs-info{background:#fff8e1;border:1px solid #ffe082;border-radius:6px;padding:8px 12px;font-size:12px;color:#7a5c00;margin-top:10px}
`;

// External Secrets reference values FROM a provider; the manifest itself should not contain the
// resolved secret. But template.data values often embed Go-template placeholders or literal
// fallbacks — mask anything that looks like an inline secret literal so we never surface one.
function maskTemplateValue(v) {
  const s = String(v == null ? '' : v);
  // Go-template placeholders ({{ .x }}) carry no secret — show as-is.
  if (/^\s*\{\{[\s\S]*\}\}\s*$/.test(s)) return { html: esc(s), masked: false };
  // Anything else in a secret template body is a literal value → redact.
  return { html: '<span class="exs-masked">[redacted]</span>', masked: true };
}

export async function render(intake) {
  const jsYaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  const text = intake.text || '';
  let doc = {};
  try { doc = (jsYaml.loadAll(text) || []).find((d) => d && d.kind) || {}; } catch { /* ignore */ }

  const kind = doc.kind || 'ExternalSecret';
  const meta = doc.metadata || {};
  const spec = doc.spec || {};

  const storeRef = spec.secretStoreRef || {};
  const target = spec.target || {};
  const dataEntries = Array.isArray(spec.data) ? spec.data : [];
  const dataFrom = Array.isArray(spec.dataFrom) ? spec.dataFrom : [];
  const provider = spec.provider || {};

  // SecretStore/ClusterSecretStore expose a provider block instead of data.
  const providerName = Object.keys(provider)[0] || '';

  const metaRows = [
    storeRef.name ? `<div class="exs-row"><span class="exs-key">store</span><span class="exs-val">${esc(storeRef.name)}${storeRef.kind ? ' (' + esc(storeRef.kind) + ')' : ''}</span></div>` : '',
    spec.refreshInterval ? `<div class="exs-row"><span class="exs-key">refreshInterval</span><span class="exs-val">${esc(spec.refreshInterval)}</span></div>` : '',
    target.name ? `<div class="exs-row"><span class="exs-key">target secret</span><span class="exs-val">${esc(target.name)}</span></div>` : '',
    target.creationPolicy ? `<div class="exs-row"><span class="exs-key">creationPolicy</span><span class="exs-val">${esc(target.creationPolicy)}</span></div>` : '',
    providerName ? `<div class="exs-row"><span class="exs-key">provider</span><span class="exs-val">${esc(providerName)}</span></div>` : '',
  ].filter(Boolean).join('');

  const specHtml = metaRows ? `<div class="exs-sec"><h3>Spec</h3>${metaRows}</div>` : '';

  const dataRows = dataEntries.map((d) => {
    const ref = d.remoteRef || {};
    return `<tr><td>${esc(d.secretKey || '')}</td><td>${esc(ref.key || '')}</td><td>${esc(ref.property || '—')}</td></tr>`;
  }).join('');
  const dataHtml = dataEntries.length
    ? `<div class="exs-sec"><h3>Mapped keys (${dataEntries.length})</h3><table class="exs-table"><thead><tr><th>Secret key</th><th>Remote key</th><th>Property</th></tr></thead><tbody>${dataRows}</tbody></table></div>`
    : '';

  const dataFromHtml = dataFrom.length
    ? `<div class="exs-sec"><h3>dataFrom (${dataFrom.length})</h3><table class="exs-table"><thead><tr><th>Source</th><th>Remote key</th></tr></thead><tbody>${dataFrom.map((f) => {
        const src = f.extract ? 'extract' : (f.find ? 'find' : '?');
        const key = (f.extract && f.extract.key) || (f.find && f.find.name && f.find.name.regexp) || '';
        return `<tr><td>${esc(src)}</td><td>${esc(key)}</td></tr>`;
      }).join('')}</tbody></table></div>`
    : '';

  // Inline template literals are redacted to honour the project's secret-redaction rule.
  const tmplData = target.template && target.template.data ? target.template.data : null;
  let templateHtml = '';
  let hadMasked = false;
  if (tmplData && typeof tmplData === 'object') {
    const rows = Object.entries(tmplData).map(([k, v]) => {
      const { html, masked } = maskTemplateValue(v);
      if (masked) hadMasked = true;
      return `<tr><td>${esc(k)}</td><td>${html}</td></tr>`;
    }).join('');
    templateHtml = `<div class="exs-sec"><h3>Template data</h3><table class="exs-table"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  const host = document.createElement('div');
  host.className = 'exs-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="exs-title"><span class="badge-exs">External Secrets</span><span class="exs-kind">${esc(kind)}</span>${meta.name ? esc(meta.name) : ''}</div>
<div class="exs-meta">${meta.namespace ? 'namespace: ' + esc(meta.namespace) : 'External Secrets Operator manifest'}</div>
${specHtml}${dataHtml}${dataFromHtml}${templateHtml}
${hadMasked ? '<div class="exs-info">Inline secret literals in the template body are redacted. Resolved secret values are fetched at runtime from the configured provider and are never stored in this manifest.</div>' : ''}`;

  return { parentNode: host };
}
