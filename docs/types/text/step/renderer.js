// STEP AP214 / AP242 (ISO 10303-21) header parser
// Structure: ISO-10303-21; / HEADER; / FILE_DESCRIPTION(...); / FILE_NAME(...); / FILE_SCHEMA(...); / ENDSEC; / DATA; ... / ENDSEC; / END-ISO-10303-21;

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseArgs(str) {
  // Extract args from a STEP entity call like ENTITY_NAME('arg1','arg2',(...))
  // Simple parser: handles nested parens, single-quoted strings
  const args = [];
  let depth = 0, inStr = false, cur = '', i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (ch === "'" && !inStr) { inStr = true; i++; continue; }
    if (ch === "'" && inStr) { inStr = false; i++; continue; }
    if (inStr) { cur += ch; i++; continue; }
    if (ch === '(') { if (depth > 0) cur += ch; depth++; i++; continue; }
    if (ch === ')') { depth--; if (depth === 0) { if (cur.trim()) args.push(cur.trim()); break; } cur += ch; i++; continue; }
    if (ch === ',' && depth === 1) { args.push(cur.trim()); cur = ''; i++; continue; }
    cur += ch; i++;
  }
  return args;
}

function parseHeader(text) {
  const result = {};
  const headerMatch = text.match(/HEADER;([\s\S]*?)ENDSEC;/i);
  if (!headerMatch) return result;
  const header = headerMatch[1];

  const fdMatch = header.match(/FILE_DESCRIPTION\s*\(([^;]+)\)/i);
  if (fdMatch) {
    const args = parseArgs('(' + fdMatch[1] + ')');
    if (args[0]) result.description = args[0].replace(/[()'"]/g, '');
    if (args[1]) result.implementationLevel = args[1];
  }

  const fnMatch = header.match(/FILE_NAME\s*\(([^;]+)\)/i);
  if (fnMatch) {
    const args = parseArgs('(' + fnMatch[1] + ')');
    if (args[0]) result.filename = args[0];
    if (args[1]) result.timestamp = args[1];
    if (args[2]) result.author = args[2].replace(/[()]/g, '');
    if (args[3]) result.organization = args[3].replace(/[()]/g, '');
    if (args[5]) result.system = args[5];
    if (args[6]) result.authorization = args[6];
  }

  const fsMatch = header.match(/FILE_SCHEMA\s*\(([^;]+)\)/i);
  if (fsMatch) {
    result.schema = fsMatch[1].replace(/[()'"]/g, '').trim();
  }

  return result;
}

function countEntities(text) {
  // Count DATA section entity lines: lines starting with #N = ENTITY_TYPE(
  const dataMatch = text.match(/DATA;([\s\S]*?)ENDSEC;/i);
  if (!dataMatch) return null;
  const dataSection = dataMatch[1];
  const entityMatches = dataSection.match(/^#\d+\s*=/gm);
  if (!entityMatches) return 0;

  // Count by entity type
  const typeCounts = {};
  const typeRegex = /^#\d+\s*=\s*([A-Z_]+)\s*\(/gm;
  let m;
  while ((m = typeRegex.exec(dataSection)) !== null) {
    const t = m[1];
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  return { total: entityMatches.length, types: typeCounts };
}

export function render(intake) {
  const text = intake.text || '';
  if (!text.trimStart().startsWith('ISO-10303-21;')) {
    return { bodyHtml: '<p class="viewer-message">Not a valid STEP file.</p>', hadUnsafe: false };
  }

  const header = parseHeader(text);
  const entityInfo = countEntities(text);

  const infoRows = [
    ['Format', 'STEP (ISO 10303-21)'],
    header.schema ? ['Schema', header.schema] : null,
    header.description ? ['Description', header.description] : null,
    header.timestamp ? ['Timestamp', header.timestamp] : null,
    header.author ? ['Author', header.author] : null,
    header.organization ? ['Organization', header.organization] : null,
    header.system ? ['CAD system', header.system] : null,
    entityInfo !== null ? ['Entities', typeof entityInfo === 'object' ? entityInfo.total.toLocaleString() : String(entityInfo)] : null,
    ['File size', `${(text.length).toLocaleString()} chars`],
  ].filter(Boolean).map(([k, v]) =>
    `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`
  ).join('');

  let typeTableHtml = '';
  if (entityInfo && typeof entityInfo === 'object' && Object.keys(entityInfo.types).length) {
    const sortedTypes = Object.entries(entityInfo.types).sort((a, b) => b[1] - a[1]).slice(0, 20);
    typeTableHtml = `
      <div class="meta-section">
        <h4 class="meta-section-title">Entity Types (top 20)</h4>
        <table class="step-table">
          <thead><tr><th>Type</th><th>Count</th></tr></thead>
          <tbody>${sortedTypes.map(([t, n]) => `<tr><td class="step-type">${esc(t)}</td><td>${n.toLocaleString()}</td></tr>`).join('')}</tbody>
        </table>
      </div>`;
  }

  return {
    bodyHtml: `
      <style>
        .badge-step { background: #0277bd; color: #fff; }
        .step-table { border-collapse: collapse; width: 100%; font-size: 0.84rem; margin: 8px 0; }
        .step-table th { background: #e3f2fd; text-align: left; padding: 4px 8px; border-bottom: 2px solid #b3d4f0; }
        .step-table td { padding: 3px 8px; border-bottom: 1px solid #f0f0f0; }
        .step-type { font-family: monospace; font-size: 0.82rem; color: #1565c0; }
      </style>
      <div class="badge-row"><span class="badge badge-step">STEP</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">File Info</h4>
        ${infoRows}
      </div>
      ${typeTableHtml}`,
    hadUnsafe: false,
  };
}
