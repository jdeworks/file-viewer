function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function stripComments(text) {
  // Block comments /* ... */ and # comments
  text = text.replace(/\/\*[\s\S]*?\*\//g, '');
  text = text.replace(/\/\/[^\n]*/g, '');
  text = text.replace(/#[^\n]*/g, '');
  return text;
}

function extractBlock(text, startIdx) {
  let depth = 0;
  let i = startIdx;
  let start = -1;
  while (i < text.length) {
    if (text[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(start + 1, i);
    }
    i++;
  }
  return '';
}

function parseThriftFields(body) {
  const fields = [];
  // Match: [id:] [required|optional] type name [= default] [,;]
  const fieldRe = /(\d+)\s*:\s*(required|optional)?\s*([\w<>,\s]+?)\s+(\w+)\s*(?:=\s*([^,;\n]+))?\s*[,;]/g;
  let m;
  while ((m = fieldRe.exec(body)) !== null) {
    const id = m[1];
    const req = m[2] || '';
    const type = m[3].trim();
    const name = m[4];
    const def = m[5] ? m[5].trim() : null;
    if (['throws'].includes(type)) continue;
    fields.push({ id, req, type, name, def });
  }
  return fields;
}

function parseThriftMethods(body) {
  const methods = [];
  // Match: [oneway] returnType name(params) [throws (...)];
  const methodRe = /(?:oneway\s+)?(\w[\w<>,\s]*?)\s+(\w+)\s*\(([^)]*)\)(?:\s+throws\s*\(([^)]*)\))?/g;
  let m;
  while ((m = methodRe.exec(body)) !== null) {
    const returnType = m[1].trim();
    const name = m[2];
    const params = m[3].trim();
    const throwsStr = m[4] ? m[4].trim() : '';
    if (['struct', 'exception', 'enum', 'service', 'namespace', 'typedef'].includes(returnType)) continue;
    methods.push({ returnType, name, params, throws: throwsStr });
  }
  return methods;
}

function parseEnumValues(body) {
  const values = [];
  const valRe = /(\w+)\s*(?:=\s*(-?\d+))?\s*[,;]?/g;
  let m;
  while ((m = valRe.exec(body)) !== null) {
    if (!m[1] || m[1] === '') continue;
    values.push({ name: m[1], number: m[2] || null });
  }
  return values;
}

function parseThrift(text) {
  const clean = stripComments(text);

  // Namespaces
  const namespaces = [];
  const nsRe = /^namespace\s+(\w+)\s+(\S+)/mg;
  let nm;
  while ((nm = nsRe.exec(clean)) !== null) {
    namespaces.push({ lang: nm[1], ns: nm[2] });
  }

  // Includes
  const includes = [];
  const incRe = /^include\s+"([^"]+)"/mg;
  let im;
  while ((im = incRe.exec(clean)) !== null) {
    includes.push(im[1]);
  }

  // Typedefs
  const typedefs = [];
  const tdRe = /^typedef\s+([\w<>,\s]+?)\s+(\w+)\s*$/mg;
  let tm;
  while ((tm = tdRe.exec(clean)) !== null) {
    typedefs.push({ original: tm[1].trim(), alias: tm[2] });
  }

  // Enums
  const enums = [];
  const enumRe = /\benum\s+(\w+)\s*\{/g;
  let em;
  while ((em = enumRe.exec(clean)) !== null) {
    const name = em[1];
    const body = extractBlock(clean, em.index + em[0].length - 1);
    const values = parseEnumValues(body);
    enums.push({ name, values });
  }

  // Structs
  const structs = [];
  const structRe = /\bstruct\s+(\w+)\s*\{/g;
  let sm;
  while ((sm = structRe.exec(clean)) !== null) {
    const name = sm[1];
    const body = extractBlock(clean, sm.index + sm[0].length - 1);
    const fields = parseThriftFields(body);
    structs.push({ name, fields, kind: 'struct' });
  }

  // Exceptions
  const exceptions = [];
  const excRe = /\bexception\s+(\w+)\s*\{/g;
  let xe;
  while ((xe = excRe.exec(clean)) !== null) {
    const name = xe[1];
    const body = extractBlock(clean, xe.index + xe[0].length - 1);
    const fields = parseThriftFields(body);
    exceptions.push({ name, fields, kind: 'exception' });
  }

  // Services
  const services = [];
  const svcRe = /\bservice\s+(\w+)(?:\s+extends\s+\w+)?\s*\{/g;
  let sv;
  while ((sv = svcRe.exec(clean)) !== null) {
    const name = sv[1];
    const body = extractBlock(clean, sv.index + sv[0].length - 1);
    const methods = parseThriftMethods(body);
    services.push({ name, methods });
  }

  return { namespaces, includes, typedefs, enums, structs, exceptions, services };
}

const STYLES = `
.thrift-root {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  color: var(--text, #111);
  background: var(--bg, #fff);
  padding: 0;
}
.thrift-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border, #e2e8f0);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  background: var(--bg, #fff);
}
.thrift-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  background: #0369a1;
  color: #fff;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.thrift-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text, #111);
}
.thrift-pill {
  font-size: 11px;
  color: #64748b;
  background: var(--border, #f1f5f9);
  border-radius: 10px;
  padding: 2px 9px;
}
.thrift-body {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.thrift-ns-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.thrift-ns-item {
  font-size: 12px;
  color: #374151;
  background: #e0f2fe;
  border-radius: 4px;
  padding: 3px 10px;
  font-family: monospace;
}
.thrift-ns-lang {
  color: #0369a1;
  font-weight: 700;
  margin-right: 5px;
}
.thrift-typedef-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.thrift-typedef-item {
  font-size: 12px;
  font-family: monospace;
  color: #374151;
  background: #f3f4f6;
  border-radius: 4px;
  padding: 3px 10px;
}
.thrift-typedef-alias { color: #7c3aed; font-weight: 600; }
.thrift-typedef-orig { color: #6b7280; margin-left: 4px; }
.thrift-section {
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 6px;
  overflow: hidden;
}
.thrift-section-heading {
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--border, #e5e7eb);
}
.thrift-section-heading.struct { background: #ede9fe; color: #4c1d95; }
.thrift-section-heading.exc { background: #fef2f2; color: #991b1b; }
.thrift-section-heading.svc { background: #dcfce7; color: #14532d; }
.thrift-section-heading.enm { background: #fef9c3; color: #713f12; }
.thrift-kind-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.thrift-kind-badge.struct { background: #7c3aed; color: #fff; }
.thrift-kind-badge.exc { background: #dc2626; color: #fff; }
.thrift-kind-badge.svc { background: #16a34a; color: #fff; }
.thrift-kind-badge.enm { background: #ca8a04; color: #fff; }
.thrift-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.thrift-table th {
  text-align: left;
  padding: 5px 10px;
  color: #6b7280;
  font-size: 11px;
  font-weight: 600;
  border-bottom: 1px solid var(--border, #e5e7eb);
  background: var(--bg, #fafafa);
}
.thrift-table td {
  padding: 5px 10px;
  border-bottom: 1px solid var(--border, #f3f4f6);
  font-family: monospace;
  font-size: 12px;
  vertical-align: middle;
}
.thrift-table tr:last-child td { border-bottom: none; }
.thrift-id { color: #6b7280; font-size: 11px; }
.thrift-req { color: #9333ea; font-size: 11px; font-weight: 600; }
.thrift-opt { color: #64748b; font-size: 11px; }
.thrift-type { color: #0369a1; }
.thrift-name { color: #111; }
.thrift-default { color: #6b7280; font-size: 11px; }
.thrift-method-ret { color: #16a34a; }
.thrift-method-name { color: #111; font-weight: 600; }
.thrift-params { color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px; }
.thrift-throws { color: #dc2626; font-size: 11px; }
.thrift-sub-heading {
  padding: 5px 12px 3px;
  font-size: 10px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-top: 1px solid var(--border, #e5e7eb);
  margin-top: 2px;
}
.thrift-empty {
  padding: 10px 12px;
  color: #9ca3af;
  font-size: 12px;
  font-style: italic;
}
`;

export async function render(intake) {
  const text = intake.text ?? intake.textSample ?? '';

  const root = document.createElement('div');
  root.className = 'thrift-root';

  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  root.appendChild(styleEl);

  let parsed;
  try {
    parsed = parseThrift(text);
  } catch (e) {
    const errEl = document.createElement('div');
    errEl.style.cssText = 'padding:16px;color:#991b1b;font-size:13px;';
    errEl.textContent = 'Parse error: ' + e.message;
    root.appendChild(errEl);
    return { parentNode: root };
  }

  // Header
  const header = document.createElement('div');
  header.className = 'thrift-header';

  const badge = document.createElement('span');
  badge.className = 'thrift-badge';
  badge.textContent = 'Thrift';
  header.appendChild(badge);

  const title = document.createElement('span');
  title.className = 'thrift-title';
  title.textContent = 'Apache Thrift';
  header.appendChild(title);

  const addPill = (text) => {
    const p = document.createElement('span');
    p.className = 'thrift-pill';
    p.textContent = text;
    header.appendChild(p);
  };
  if (parsed.structs.length) addPill(parsed.structs.length + ' struct' + (parsed.structs.length !== 1 ? 's' : ''));
  if (parsed.exceptions.length) addPill(parsed.exceptions.length + ' exception' + (parsed.exceptions.length !== 1 ? 's' : ''));
  if (parsed.services.length) addPill(parsed.services.length + ' service' + (parsed.services.length !== 1 ? 's' : ''));
  if (parsed.enums.length) addPill(parsed.enums.length + ' enum' + (parsed.enums.length !== 1 ? 's' : ''));

  root.appendChild(header);

  const body = document.createElement('div');
  body.className = 'thrift-body';

  // Namespaces
  if (parsed.namespaces.length) {
    const nsList = document.createElement('div');
    nsList.className = 'thrift-ns-list';
    for (const ns of parsed.namespaces) {
      const item = document.createElement('span');
      item.className = 'thrift-ns-item';
      item.innerHTML = `<span class="thrift-ns-lang">${esc(ns.lang)}</span>${esc(ns.ns)}`;
      nsList.appendChild(item);
    }
    body.appendChild(nsList);
  }

  // Typedefs
  if (parsed.typedefs.length) {
    const tdList = document.createElement('div');
    tdList.className = 'thrift-typedef-list';
    for (const td of parsed.typedefs) {
      const item = document.createElement('span');
      item.className = 'thrift-typedef-item';
      item.innerHTML = `<span class="thrift-typedef-alias">${esc(td.alias)}</span><span class="thrift-typedef-orig">= ${esc(td.original)}</span>`;
      tdList.appendChild(item);
    }
    body.appendChild(tdList);
  }

  function makeSection(name, kindClass, kindLabel) {
    const sec = document.createElement('div');
    sec.className = 'thrift-section';
    const heading = document.createElement('div');
    heading.className = 'thrift-section-heading ' + kindClass;
    const kb = document.createElement('span');
    kb.className = 'thrift-kind-badge ' + kindClass;
    kb.textContent = kindLabel;
    heading.appendChild(kb);
    heading.appendChild(document.createTextNode(' ' + name));
    sec.appendChild(heading);
    return sec;
  }

  function makeTable(headers, rows) {
    const tbl = document.createElement('table');
    tbl.className = 'thrift-table';
    const thead = document.createElement('thead');
    const hrow = document.createElement('tr');
    for (const h of headers) {
      const th = document.createElement('th');
      th.textContent = h;
      hrow.appendChild(th);
    }
    thead.appendChild(hrow);
    tbl.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const cells of rows) {
      const tr = document.createElement('tr');
      for (const cell of cells) {
        const td = document.createElement('td');
        td.innerHTML = cell;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    tbl.appendChild(tbody);
    return tbl;
  }

  function renderStructLike(items, kindClass, kindLabel) {
    for (const item of items) {
      const sec = makeSection(item.name, kindClass, kindLabel);
      if (item.fields.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'thrift-empty';
        empty.textContent = 'No fields';
        sec.appendChild(empty);
      } else {
        const rows = item.fields.map((f) => {
          const reqHtml = f.req === 'required'
            ? `<span class="thrift-req">required</span>`
            : f.req === 'optional'
            ? `<span class="thrift-opt">optional</span>`
            : '';
          const defHtml = f.def ? `<span class="thrift-default">${esc(f.def)}</span>` : '';
          return [
            `<span class="thrift-id">${esc(f.id)}</span>`,
            reqHtml,
            `<span class="thrift-type">${esc(f.type)}</span>`,
            `<span class="thrift-name">${esc(f.name)}</span>`,
            defHtml,
          ];
        });
        sec.appendChild(makeTable(['ID', 'Req', 'Type', 'Name', 'Default'], rows));
      }
      body.appendChild(sec);
    }
  }

  // Enums
  for (const enm of parsed.enums) {
    const sec = makeSection(enm.name, 'enm', 'enum');
    if (enm.values.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'thrift-empty';
      empty.textContent = 'No values';
      sec.appendChild(empty);
    } else {
      const rows = enm.values.map((v) => [
        `<span class="thrift-name">${esc(v.name)}</span>`,
        v.number !== null ? `<span class="thrift-id">${esc(v.number)}</span>` : '',
      ]);
      sec.appendChild(makeTable(['Name', 'Value'], rows));
    }
    body.appendChild(sec);
  }

  // Structs
  renderStructLike(parsed.structs, 'struct', 'struct');

  // Exceptions
  renderStructLike(parsed.exceptions, 'exc', 'exception');

  // Services
  for (const svc of parsed.services) {
    const sec = makeSection(svc.name, 'svc', 'service');
    if (svc.methods.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'thrift-empty';
      empty.textContent = 'No methods';
      sec.appendChild(empty);
    } else {
      const rows = svc.methods.map((mt) => [
        `<span class="thrift-method-name">${esc(mt.name)}</span>`,
        `<span class="thrift-method-ret">${esc(mt.returnType)}</span>`,
        `<span class="thrift-params" title="${esc(mt.params)}">${esc(mt.params)}</span>`,
        mt.throws ? `<span class="thrift-throws">${esc(mt.throws)}</span>` : '',
      ]);
      sec.appendChild(makeTable(['Method', 'Returns', 'Parameters', 'Throws'], rows));
    }
    body.appendChild(sec);
  }

  if (parsed.structs.length === 0 && parsed.exceptions.length === 0
      && parsed.services.length === 0 && parsed.enums.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:16px;color:#6b7280;font-size:13px;font-style:italic;';
    empty.textContent = 'No structs, exceptions, services, or enums found.';
    body.appendChild(empty);
  }

  root.appendChild(body);
  return { parentNode: root };
}
