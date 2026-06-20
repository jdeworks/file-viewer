function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function stripComments(text) {
  // Strip block comments /* ... */
  text = text.replace(/\/\*[\s\S]*?\*\//g, '');
  // Strip line comments //
  text = text.replace(/\/\/[^\n]*/g, '');
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

function parseFields(body) {
  const fields = [];
  // Match: [repeated|optional|required] type name = number [options];
  const fieldRe = /\b(repeated|optional|required)?\s*(\S+)\s+(\w+)\s*=\s*(\d+)\s*[\[;]/g;
  let m;
  while ((m = fieldRe.exec(body)) !== null) {
    const rule = m[1] || '';
    const type = m[2];
    const name = m[3];
    const num = m[4];
    // Skip keywords that look like fields but are not
    if (['message', 'enum', 'service', 'rpc', 'option', 'syntax', 'package', 'import', 'oneof', 'reserved'].includes(type)) continue;
    fields.push({ rule, type, name, num });
  }
  return fields;
}

function parseRpcs(body) {
  const rpcs = [];
  const rpcRe = /rpc\s+(\w+)\s*\(\s*(stream\s+)?(\w+)\s*\)\s+returns\s+\(\s*(stream\s+)?(\w+)\s*\)/g;
  let m;
  while ((m = rpcRe.exec(body)) !== null) {
    rpcs.push({
      name: m[1],
      clientStreaming: !!m[2],
      request: m[3],
      serverStreaming: !!m[4],
      response: m[5],
    });
  }
  return rpcs;
}

function parseEnumValues(body) {
  const values = [];
  const valRe = /(\w+)\s*=\s*(-?\d+)\s*;/g;
  let m;
  while ((m = valRe.exec(body)) !== null) {
    values.push({ name: m[1], number: m[2] });
  }
  return values;
}

function parseProto(text) {
  const clean = stripComments(text);

  const syntaxMatch = clean.match(/syntax\s*=\s*["'](\w+)["']/);
  const syntax = syntaxMatch ? syntaxMatch[1] : 'proto2';

  const pkgMatch = clean.match(/^package\s+([\w.]+)/m);
  const pkg = pkgMatch ? pkgMatch[1] : null;

  const options = [];
  const optRe = /^option\s+(\S+)\s*=\s*([^;]+);/mg;
  let om;
  while ((om = optRe.exec(clean)) !== null) {
    options.push({ key: om[1], value: om[2].trim() });
  }

  const messages = [];
  const msgRe = /\bmessage\s+(\w+)\s*\{/g;
  let mm;
  while ((mm = msgRe.exec(clean)) !== null) {
    const name = mm[1];
    const body = extractBlock(clean, mm.index + mm[0].length - 1);
    const fields = parseFields(body);
    messages.push({ name, fields });
  }

  const services = [];
  const svcRe = /\bservice\s+(\w+)\s*\{/g;
  let sm;
  while ((sm = svcRe.exec(clean)) !== null) {
    const name = sm[1];
    const body = extractBlock(clean, sm.index + sm[0].length - 1);
    const rpcs = parseRpcs(body);
    services.push({ name, rpcs });
  }

  const enums = [];
  const enumRe = /\benum\s+(\w+)\s*\{/g;
  let em;
  while ((em = enumRe.exec(clean)) !== null) {
    const name = em[1];
    const body = extractBlock(clean, em.index + em[0].length - 1);
    const values = parseEnumValues(body);
    enums.push({ name, values });
  }

  return { syntax, pkg, options, messages, services, enums };
}

const STYLES = `
.proto-root {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  color: var(--text, #111);
  background: var(--bg, #fff);
  padding: 0;
}
.proto-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border, #e2e8f0);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  background: var(--bg, #fff);
}
.proto-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  background: #6d28d9;
  color: #fff;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.proto-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text, #111);
}
.proto-pill {
  font-size: 11px;
  color: #64748b;
  background: var(--border, #f1f5f9);
  border-radius: 10px;
  padding: 2px 9px;
}
.proto-body {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.proto-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 2px;
}
.proto-meta-item {
  font-size: 12px;
  color: #374151;
  background: #f3f4f6;
  border-radius: 4px;
  padding: 3px 10px;
  font-family: monospace;
}
.proto-meta-label {
  color: #6b7280;
  font-family: system-ui, sans-serif;
  margin-right: 4px;
}
.proto-section {
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 6px;
  overflow: hidden;
}
.proto-section-heading {
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--border, #e5e7eb);
}
.proto-section-heading.msg { background: #ede9fe; color: #4c1d95; }
.proto-section-heading.svc { background: #dcfce7; color: #14532d; }
.proto-section-heading.enm { background: #fef9c3; color: #713f12; }
.proto-kind-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.proto-kind-badge.msg { background: #7c3aed; color: #fff; }
.proto-kind-badge.svc { background: #16a34a; color: #fff; }
.proto-kind-badge.enm { background: #ca8a04; color: #fff; }
.proto-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.proto-table th {
  text-align: left;
  padding: 5px 10px;
  color: #6b7280;
  font-size: 11px;
  font-weight: 600;
  border-bottom: 1px solid var(--border, #e5e7eb);
  background: var(--bg, #fafafa);
}
.proto-table td {
  padding: 5px 10px;
  border-bottom: 1px solid var(--border, #f3f4f6);
  font-family: monospace;
  font-size: 12px;
  vertical-align: middle;
}
.proto-table tr:last-child td { border-bottom: none; }
.proto-num { color: #6b7280; font-size: 11px; }
.proto-rule { color: #9333ea; font-size: 11px; font-weight: 600; }
.proto-type { color: #0369a1; }
.proto-name { color: #111; }
.proto-stream-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  background: #dcfce7;
  color: #15803d;
  margin-left: 4px;
}
.proto-empty {
  padding: 10px 12px;
  color: #9ca3af;
  font-size: 12px;
  font-style: italic;
}
`;

export async function render(intake) {
  const text = intake.text ?? intake.textSample ?? '';

  const root = document.createElement('div');
  root.className = 'proto-root';

  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  root.appendChild(styleEl);

  let parsed;
  try {
    parsed = parseProto(text);
  } catch (e) {
    const errEl = document.createElement('div');
    errEl.style.cssText = 'padding:16px;color:#991b1b;font-size:13px;';
    errEl.textContent = 'Parse error: ' + e.message;
    root.appendChild(errEl);
    return { parentNode: root };
  }

  // Header
  const header = document.createElement('div');
  header.className = 'proto-header';

  const badge = document.createElement('span');
  badge.className = 'proto-badge';
  badge.textContent = parsed.syntax || 'proto';
  header.appendChild(badge);

  const title = document.createElement('span');
  title.className = 'proto-title';
  title.textContent = 'Protocol Buffer';
  header.appendChild(title);

  const addPill = (text) => {
    const p = document.createElement('span');
    p.className = 'proto-pill';
    p.textContent = text;
    header.appendChild(p);
  };
  if (parsed.pkg) addPill(parsed.pkg);
  if (parsed.messages.length) addPill(parsed.messages.length + ' message' + (parsed.messages.length !== 1 ? 's' : ''));
  if (parsed.services.length) addPill(parsed.services.length + ' service' + (parsed.services.length !== 1 ? 's' : ''));
  if (parsed.enums.length) addPill(parsed.enums.length + ' enum' + (parsed.enums.length !== 1 ? 's' : ''));

  root.appendChild(header);

  const body = document.createElement('div');
  body.className = 'proto-body';

  // Options
  if (parsed.options.length) {
    const meta = document.createElement('div');
    meta.className = 'proto-meta';
    for (const opt of parsed.options) {
      const item = document.createElement('span');
      item.className = 'proto-meta-item';
      item.innerHTML = `<span class="proto-meta-label">${esc(opt.key)}</span>${esc(opt.value)}`;
      meta.appendChild(item);
    }
    body.appendChild(meta);
  }

  function makeSection(name, kindClass, kindLabel) {
    const sec = document.createElement('div');
    sec.className = 'proto-section';
    const heading = document.createElement('div');
    heading.className = 'proto-section-heading ' + kindClass;
    const kb = document.createElement('span');
    kb.className = 'proto-kind-badge ' + kindClass;
    kb.textContent = kindLabel;
    heading.appendChild(kb);
    heading.appendChild(document.createTextNode(' ' + name));
    sec.appendChild(heading);
    return sec;
  }

  function makeTable(headers, rows) {
    const tbl = document.createElement('table');
    tbl.className = 'proto-table';
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
        if (typeof cell === 'string') {
          td.innerHTML = cell;
        } else {
          td.textContent = cell;
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    tbl.appendChild(tbody);
    return tbl;
  }

  // Messages
  for (const msg of parsed.messages) {
    const sec = makeSection(msg.name, 'msg', 'message');
    if (msg.fields.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'proto-empty';
      empty.textContent = 'No fields';
      sec.appendChild(empty);
    } else {
      const rows = msg.fields.map((f) => [
        `<span class="proto-num">${esc(f.num)}</span>`,
        `<span class="proto-name">${esc(f.name)}</span>`,
        `<span class="proto-type">${esc(f.type)}</span>`,
        f.rule ? `<span class="proto-rule">${esc(f.rule)}</span>` : '',
      ]);
      sec.appendChild(makeTable(['#', 'Field', 'Type', 'Rule'], rows));
    }
    body.appendChild(sec);
  }

  // Services
  for (const svc of parsed.services) {
    const sec = makeSection(svc.name, 'svc', 'service');
    if (svc.rpcs.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'proto-empty';
      empty.textContent = 'No RPCs';
      sec.appendChild(empty);
    } else {
      const rows = svc.rpcs.map((r) => {
        const req = `<span class="proto-type">${esc(r.request)}</span>`
          + (r.clientStreaming ? ' <span class="proto-stream-badge">stream</span>' : '');
        const resp = `<span class="proto-type">${esc(r.response)}</span>`
          + (r.serverStreaming ? ' <span class="proto-stream-badge">stream</span>' : '');
        return [
          `<span class="proto-name">${esc(r.name)}</span>`,
          req,
          resp,
          r.clientStreaming && r.serverStreaming ? 'bidirectional'
            : r.clientStreaming ? 'client'
            : r.serverStreaming ? 'server'
            : 'unary',
        ];
      });
      sec.appendChild(makeTable(['Method', 'Request', 'Response', 'Streaming'], rows));
    }
    body.appendChild(sec);
  }

  // Enums
  for (const enm of parsed.enums) {
    const sec = makeSection(enm.name, 'enm', 'enum');
    if (enm.values.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'proto-empty';
      empty.textContent = 'No values';
      sec.appendChild(empty);
    } else {
      const rows = enm.values.map((v) => [
        `<span class="proto-name">${esc(v.name)}</span>`,
        `<span class="proto-num">${esc(v.number)}</span>`,
      ]);
      sec.appendChild(makeTable(['Name', 'Number'], rows));
    }
    body.appendChild(sec);
  }

  if (parsed.messages.length === 0 && parsed.services.length === 0 && parsed.enums.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:16px;color:#6b7280;font-size:13px;font-style:italic;';
    empty.textContent = 'No messages, services, or enums found.';
    body.appendChild(empty);
  }

  root.appendChild(body);
  return { parentNode: root };
}
