const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.slsa-doc{padding:16px 18px;max-width:960px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-slsa{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7B1FA2;color:#fff;vertical-align:middle;margin-right:8px}
.slsa-title{font-size:18px;font-weight:700;margin:0 0 4px}
.slsa-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.slsa-sec{margin:14px 0}
.slsa-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.slsa-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.slsa-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.slsa-kv-k{color:var(--fg-2,#888);min-width:140px;flex-shrink:0}
.slsa-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.slsa-table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}
.slsa-table th{text-align:left;padding:4px 8px;background:var(--bg-2,#f6f8fa);border-bottom:1px solid var(--border,#e0e0e0);font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;font-size:11px}
.slsa-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;word-break:break-word}
.slsa-table tr:last-child td{border-bottom:none}
.slsa-mono{font-family:ui-monospace,monospace;font-size:11px}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="slsa-kv"><span class="slsa-kv-k">${esc(label)}</span><span class="slsa-kv-v">${esc(value)}</span></div>`;
}

function truncateDigest(digest) {
  if (!digest || typeof digest !== 'object') return '';
  return Object.entries(digest).map(([alg, val]) => {
    const v = String(val);
    return `${alg}:${v.length > 16 ? v.slice(0, 8) + '…' + v.slice(-8) : v}`;
  }).join(', ');
}

export function render(intake) {
  let doc;
  try { doc = JSON.parse(intake.text || '{}'); } catch {
    return { parentNode: Object.assign(document.createElement('div'), { textContent: 'Invalid SLSA provenance JSON.' }) };
  }

  // Support both wrapped (in-toto statement) and bare predicate forms
  const isStatement = doc._type || doc.subject;
  const statementType = doc._type || '';
  const predicateType = doc.predicateType || '';
  const subjects = Array.isArray(doc.subject) ? doc.subject : [];
  const predicate = doc.predicate || doc; // bare form fallback

  const builder = predicate.builder || {};
  const buildType = predicate.buildType || '';
  const invocation = predicate.invocation || predicate.recipe || {};
  const configSource = invocation.configSource || invocation.environment || {};
  const entryPoint = invocation.entryPoint || configSource.entryPoint || '';
  const materials = Array.isArray(predicate.materials) ? predicate.materials
    : Array.isArray(predicate.buildConfig?.steps) ? [] : [];
  const metadata = predicate.metadata || predicate.buildMetadata || {};

  const subParts = [
    subjects.length ? `${subjects.length} subject${subjects.length !== 1 ? 's' : ''}` : '',
    materials.length ? `${materials.length} material${materials.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);

  const stmtHtml = `<div class="slsa-sec"><h3>Statement</h3><div class="slsa-card">
${statementType ? kv('Type', statementType.length > 80 ? statementType.slice(0, 80) + '…' : statementType) : ''}
${predicateType ? kv('Predicate type', predicateType.length > 80 ? predicateType.slice(0, 80) + '…' : predicateType) : ''}
${metadata.buildStartedOn ? kv('Build started', metadata.buildStartedOn) : ''}
${metadata.buildFinishedOn ? kv('Build finished', metadata.buildFinishedOn) : ''}
</div></div>`;

  const subjRows = subjects.map((s) => `<tr>
<td>${esc(s.name || '?')}</td>
<td class="slsa-mono">${esc(truncateDigest(s.digest))}</td>
</tr>`).join('');

  const subjHtml = subjects.length ? `<div class="slsa-sec"><h3>Subjects (${subjects.length})</h3>
<table class="slsa-table"><thead><tr><th>Name</th><th>Digest</th></tr></thead>
<tbody>${subjRows}</tbody></table></div>` : '';

  const builderHtml = `<div class="slsa-sec"><h3>Build Info</h3><div class="slsa-card">
${builder.id ? kv('Builder ID', builder.id.length > 80 ? builder.id.slice(0, 80) + '…' : builder.id) : ''}
${buildType ? kv('Build type', buildType.length > 80 ? buildType.slice(0, 80) + '…' : buildType) : ''}
${entryPoint ? kv('Entry point', entryPoint) : ''}
${configSource.uri ? kv('Config source', configSource.uri.length > 80 ? configSource.uri.slice(0, 80) + '…' : configSource.uri) : ''}
${configSource.ref ? kv('Config ref', configSource.ref) : ''}
</div></div>`;

  const matRows = materials.slice(0, 100).map((m) => `<tr>
<td>${esc(m.uri || '?')}</td>
<td class="slsa-mono">${esc(truncateDigest(m.digest))}</td>
</tr>`).join('');

  const matHtml = materials.length ? `<div class="slsa-sec"><h3>Materials / dependencies (${materials.length})</h3>
<table class="slsa-table"><thead><tr><th>URI</th><th>Digest</th></tr></thead>
<tbody>${matRows}</tbody></table>
${materials.length > 100 ? `<div style="font-size:11px;color:var(--fg-2,#888);margin-top:4px">Showing first 100 of ${materials.length} materials.</div>` : ''}
</div>` : '';

  const firstSubject = subjects[0];
  const host = document.createElement('div');
  host.className = 'slsa-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-slsa">SLSA Provenance</span>
  ${firstSubject?.name ? `<span class="slsa-title">${esc(firstSubject.name)}</span>` : ''}
</div>
<div class="slsa-sub">${esc(subParts.join(' · '))}</div>
${stmtHtml}${subjHtml}${builderHtml}${matHtml}`;
  return { parentNode: host };
}
