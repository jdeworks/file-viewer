const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.spdx-doc{padding:16px 18px;max-width:960px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-spdx{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4CAF50;color:#fff;vertical-align:middle;margin-right:8px}
.spdx-title{font-size:18px;font-weight:700;margin:0 0 4px}
.spdx-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.spdx-sec{margin:14px 0}
.spdx-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.spdx-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.spdx-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.spdx-kv-k{color:var(--fg-2,#888);min-width:160px;flex-shrink:0}
.spdx-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.spdx-table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}
.spdx-table th{text-align:left;padding:4px 8px;background:var(--bg-2,#f6f8fa);border-bottom:1px solid var(--border,#e0e0e0);font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;font-size:11px}
.spdx-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;word-break:break-word;max-width:220px}
.spdx-table tr:last-child td{border-bottom:none}
`;

/**
 * Parse SPDX tag-value format.
 * Returns { docFields: Map<string,string>, packages: Array<Map<string,string>> }
 */
function parseSpdx(text) {
  const lines = text.split('\n');
  const docFields = new Map();
  const packages = [];
  let currentPkg = null;
  let inDocument = true;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // Section separator comment "##"
    if (line.startsWith('##')) {
      const heading = line.replace(/^#+\s*/, '').toLowerCase();
      if (heading.includes('package') || heading.includes('pkg')) {
        if (currentPkg) packages.push(currentPkg);
        currentPkg = new Map();
        inDocument = false;
      }
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();

    // Detect package start by PackageName key
    if (key === 'PackageName') {
      if (currentPkg) packages.push(currentPkg);
      currentPkg = new Map();
      inDocument = false;
    }

    if (currentPkg && !inDocument) {
      currentPkg.set(key, value);
    } else {
      docFields.set(key, value);
    }
  }
  if (currentPkg && currentPkg.size > 0) packages.push(currentPkg);
  return { docFields, packages };
}

function kv(label, value) {
  if (value == null || value === '' || value === 'NOASSERTION') return '';
  return `<div class="spdx-kv"><span class="spdx-kv-k">${esc(label)}</span><span class="spdx-kv-v">${esc(value)}</span></div>`;
}

export function render(intake) {
  const text = intake.text || '';
  const { docFields, packages } = parseSpdx(text);

  const spdxVersion = docFields.get('SPDXVersion') || '?';
  const dataLicense = docFields.get('DataLicense') || '';
  const docName = docFields.get('DocumentName') || '';
  const docNamespace = docFields.get('DocumentNamespace') || '';
  const creators = [];
  for (const [k, v] of docFields) {
    if (k === 'Creator') creators.push(v);
  }
  const created = docFields.get('Created') || '';

  const subParts = [
    spdxVersion,
    `${packages.length} package${packages.length !== 1 ? 's' : ''}`,
  ].filter(Boolean);

  const docHtml = `<div class="spdx-sec"><h3>Document Info</h3><div class="spdx-card">
${kv('SPDX version', spdxVersion)}
${kv('Data license', dataLicense)}
${kv('Document name', docName)}
${docNamespace ? kv('Namespace', docNamespace.length > 80 ? docNamespace.slice(0, 80) + '…' : docNamespace) : ''}
${created ? kv('Created', created) : ''}
${creators.map((c) => kv('Creator', c)).join('')}
</div></div>`;

  const pkgRows = packages.slice(0, 200).map((p) => {
    const dl = p.get('PackageDownloadLocation') || '';
    const dlShort = dl.length > 60 ? dl.slice(0, 60) + '…' : dl;
    return `<tr>
<td>${esc(p.get('PackageName') || '?')}</td>
<td>${esc(p.get('PackageVersion') || '')}</td>
<td>${esc(p.get('PackageLicenseConcluded') || p.get('PackageLicenseDeclared') || '')}</td>
<td>${esc(dlShort)}</td>
</tr>`;
  }).join('');

  const pkgHtml = `<div class="spdx-sec"><h3>Packages (${packages.length})</h3>
<table class="spdx-table"><thead><tr><th>Name</th><th>Version</th><th>License</th><th>Download URL</th></tr></thead>
<tbody>${pkgRows}</tbody></table>
${packages.length > 200 ? `<div style="font-size:11px;color:var(--fg-2,#888);margin-top:4px">Showing first 200 of ${packages.length} packages.</div>` : ''}
</div>`;

  const host = document.createElement('div');
  host.className = 'spdx-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-spdx">SPDX SBOM</span>
  ${docName ? `<span class="spdx-title">${esc(docName)}</span>` : ''}
</div>
<div class="spdx-sub">${esc(subParts.join(' · '))}</div>
${docHtml}${pkgHtml}`;
  return { parentNode: host };
}
