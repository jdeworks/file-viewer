const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cdx-doc{padding:16px 18px;max-width:960px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-cdx{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00AAFF;color:#fff;vertical-align:middle;margin-right:8px}
.cdx-title{font-size:18px;font-weight:700;margin:0 0 4px}
.cdx-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.cdx-sec{margin:14px 0}
.cdx-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.cdx-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.cdx-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.cdx-kv-k{color:var(--fg-2,#888);min-width:140px;flex-shrink:0}
.cdx-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.cdx-table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}
.cdx-table th{text-align:left;padding:4px 8px;background:var(--bg-2,#f6f8fa);border-bottom:1px solid var(--border,#e0e0e0);font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;font-size:11px}
.cdx-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;word-break:break-word}
.cdx-table tr:last-child td{border-bottom:none}
.cdx-pill{display:inline-block;font-size:10px;padding:1px 6px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:1px 2px}
.cdx-warn{background:#fff8e1;border:1px solid #ffe082;border-radius:6px;padding:8px 12px;margin:8px 0;font-size:12px;color:#6d4c00}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="cdx-kv"><span class="cdx-kv-k">${esc(label)}</span><span class="cdx-kv-v">${esc(value)}</span></div>`;
}

function licenseOf(comp) {
  const licenses = comp.licenses;
  if (!Array.isArray(licenses) || !licenses.length) return '';
  return licenses.map((l) => {
    if (l.license?.id) return l.license.id;
    if (l.license?.name) return l.license.name;
    if (l.expression) return l.expression;
    return '?';
  }).join(', ');
}

export function render(intake) {
  let bom;
  try { bom = JSON.parse(intake.text || '{}'); } catch {
    return { parentNode: Object.assign(document.createElement('div'), { textContent: 'Invalid CycloneDX JSON.' }) };
  }

  const metadata = bom.metadata || {};
  const components = Array.isArray(bom.components) ? bom.components : [];
  const vulnerabilities = Array.isArray(bom.vulnerabilities) ? bom.vulnerabilities : [];
  const tools = Array.isArray(metadata.tools) ? metadata.tools
    : Array.isArray(metadata.tools?.components) ? metadata.tools.components : [];

  const subParts = [
    `spec v${bom.specVersion || '?'}`,
    `${components.length} component${components.length !== 1 ? 's' : ''}`,
    vulnerabilities.length ? `${vulnerabilities.length} vuln${vulnerabilities.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);

  const metaHtml = `<div class="cdx-sec"><h3>BOM Metadata</h3><div class="cdx-card">
${kv('BOM format', bom.bomFormat)}
${kv('Spec version', bom.specVersion)}
${kv('Serial number', bom.serialNumber)}
${kv('Version', bom.version != null ? String(bom.version) : '')}
${metadata.timestamp ? kv('Timestamp', metadata.timestamp) : ''}
${metadata.component ? kv('Subject', `${metadata.component.name || ''}${metadata.component.version ? ' @ ' + metadata.component.version : ''}`) : ''}
</div></div>`;

  const toolsHtml = tools.length ? `<div class="cdx-sec"><h3>Tools used (${tools.length})</h3><div class="cdx-card">
${tools.map((t) => `<div class="cdx-kv"><span class="cdx-kv-k">${esc(t.vendor || t.name || '?')}</span><span class="cdx-kv-v">${esc(t.name || '')}${t.version ? ' ' + t.version : ''}</span></div>`).join('')}
</div></div>` : '';

  const compRows = components.slice(0, 200).map((c) => `<tr>
<td>${esc(c.name || '?')}</td>
<td>${esc(c.version || '')}</td>
<td>${esc(c.type || '')}</td>
<td>${esc(licenseOf(c))}</td>
</tr>`).join('');

  const compHtml = `<div class="cdx-sec"><h3>Components (${components.length})</h3>
<table class="cdx-table"><thead><tr><th>Name</th><th>Version</th><th>Type</th><th>License</th></tr></thead>
<tbody>${compRows}</tbody></table>
${components.length > 200 ? `<div style="font-size:11px;color:var(--fg-2,#888);margin-top:4px">Showing first 200 of ${components.length} components.</div>` : ''}
</div>`;

  const vulnRows = vulnerabilities.slice(0, 100).map((v) => {
    const rat = Array.isArray(v.ratings) && v.ratings[0] ? v.ratings[0] : {};
    return `<tr>
<td>${esc(v.id || '?')}</td>
<td>${esc(rat.severity || '')}</td>
<td>${esc(rat.score != null ? String(rat.score) : '')}</td>
<td>${esc(v.description ? v.description.slice(0, 80) : '')}</td>
</tr>`;
  }).join('');

  const vulnHtml = vulnerabilities.length ? `<div class="cdx-sec"><h3>Vulnerabilities (${vulnerabilities.length})</h3>
<table class="cdx-table"><thead><tr><th>ID</th><th>Severity</th><th>Score</th><th>Description</th></tr></thead>
<tbody>${vulnRows}</tbody></table>
</div>` : '';

  const host = document.createElement('div');
  host.className = 'cdx-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-cdx">CycloneDX SBOM</span>
  ${metadata.component?.name ? `<span class="cdx-title">${esc(metadata.component.name)}</span>` : ''}
</div>
<div class="cdx-sub">${esc(subParts.join(' · '))}</div>
${metaHtml}${toolsHtml}${compHtml}${vulnHtml}`;
  return { parentNode: host };
}
