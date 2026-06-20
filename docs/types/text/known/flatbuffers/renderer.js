const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.flatbuf-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.flatbuf-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0f766e;color:#fff;vertical-align:middle;margin-right:8px;}
.flatbuf-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.flatbuf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.flatbuf-meta{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;}
.flatbuf-meta-item{font-family:ui-monospace,monospace;font-size:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:3px 9px;}
.flatbuf-meta-label{color:var(--fg-2,#888);margin-right:4px;}
.flatbuf-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.flatbuf-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.flatbuf-card strong{display:block;font-size:1.2rem;font-weight:700;}
.flatbuf-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.flatbuf-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.flatbuf-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.flatbuf-list{margin:0;padding:0;list-style:none;}
.flatbuf-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:8px;align-items:baseline;}
.flatbuf-list li:last-child{border-bottom:none;}
.flatbuf-count{font-size:11px;color:var(--fg-2,#888);margin-left:auto;}
.flatbuf-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.flatbuf-kw{color:#0f766e;font-weight:600;}
.flatbuf-str{color:#0369a1;}
.flatbuf-comment{color:#6e7781;font-style:italic;}
.flatbuf-num{color:#b45309;}
.flatbuf-type{color:#7c3aed;}
`;

const KEYWORDS = ['namespace', 'table', 'struct', 'enum', 'union', 'root_type', 'file_identifier', 'file_extension', 'include', 'attribute', 'rpc_service', 'bool', 'byte', 'ubyte', 'short', 'ushort', 'int', 'uint', 'float', 'long', 'ulong', 'double', 'int8', 'int16', 'int32', 'int64', 'uint8', 'uint16', 'uint32', 'uint64', 'float32', 'float64', 'string'];
const TYPE_KW = new Set(['bool', 'byte', 'ubyte', 'short', 'ushort', 'int', 'uint', 'float', 'long', 'ulong', 'double', 'int8', 'int16', 'int32', 'int64', 'uint8', 'uint16', 'uint32', 'uint64', 'float32', 'float64', 'string']);
const CTRL_KW = new Set(['namespace', 'table', 'struct', 'enum', 'union', 'root_type', 'file_identifier', 'file_extension', 'include', 'attribute', 'rpc_service']);

function analyzeFbs(text) {
  const lines = (text || '').split(/\r?\n/);
  let namespace = null;
  let rootType = null;
  let fileIdentifier = null;
  let fileExtension = null;
  const tables = [];
  const structs = [];
  const enums = [];
  const unions = [];

  let currentType = null;
  let currentName = null;
  let currentCount = 0;
  let depth = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;

    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;

    // Top-level metadata
    const nsMatch = trimmed.match(/^namespace\s+([\w.]+)\s*;/);
    if (nsMatch) { namespace = nsMatch[1]; }
    const rtMatch = trimmed.match(/^root_type\s+(\w+)\s*;/);
    if (rtMatch) { rootType = rtMatch[1]; }
    const fiMatch = trimmed.match(/^file_identifier\s+"([^"]+)"\s*;/);
    if (fiMatch) { fileIdentifier = fiMatch[1]; }
    const feMatch = trimmed.match(/^file_extension\s+"([^"]+)"\s*;/);
    if (feMatch) { fileExtension = feMatch[1]; }

    if (depth === 0) {
      const tableMatch = trimmed.match(/^table\s+(\w+)/);
      const structMatch = trimmed.match(/^struct\s+(\w+)/);
      const enumMatch = trimmed.match(/^enum\s+(\w+)/);
      const unionMatch = trimmed.match(/^union\s+(\w+)/);

      if (tableMatch) {
        if (currentType === 'table') tables.push({ name: currentName, count: currentCount });
        else if (currentType === 'struct') structs.push({ name: currentName, count: currentCount });
        else if (currentType === 'enum') enums.push({ name: currentName, count: currentCount });
        else if (currentType === 'union') unions.push({ name: currentName, count: currentCount });
        currentType = 'table'; currentName = tableMatch[1]; currentCount = 0;
      } else if (structMatch) {
        if (currentType === 'table') tables.push({ name: currentName, count: currentCount });
        else if (currentType === 'struct') structs.push({ name: currentName, count: currentCount });
        else if (currentType === 'enum') enums.push({ name: currentName, count: currentCount });
        else if (currentType === 'union') unions.push({ name: currentName, count: currentCount });
        currentType = 'struct'; currentName = structMatch[1]; currentCount = 0;
      } else if (enumMatch) {
        if (currentType === 'table') tables.push({ name: currentName, count: currentCount });
        else if (currentType === 'struct') structs.push({ name: currentName, count: currentCount });
        else if (currentType === 'enum') enums.push({ name: currentName, count: currentCount });
        else if (currentType === 'union') unions.push({ name: currentName, count: currentCount });
        currentType = 'enum'; currentName = enumMatch[1]; currentCount = 0;
      } else if (unionMatch) {
        if (currentType === 'table') tables.push({ name: currentName, count: currentCount });
        else if (currentType === 'struct') structs.push({ name: currentName, count: currentCount });
        else if (currentType === 'enum') enums.push({ name: currentName, count: currentCount });
        else if (currentType === 'union') unions.push({ name: currentName, count: currentCount });
        currentType = 'union'; currentName = unionMatch[1]; currentCount = 0;
      }
    }

    // Count fields at depth 1
    if (currentType && depth === 1) {
      // field: type; or EnumVal = N,
      if (/^\s*\w[\w]*\s*[=:,;]/.test(line)) currentCount++;
    }

    depth += opens - closes;
  }

  // Flush last
  if (currentType === 'table') tables.push({ name: currentName, count: currentCount });
  else if (currentType === 'struct') structs.push({ name: currentName, count: currentCount });
  else if (currentType === 'enum') enums.push({ name: currentName, count: currentCount });
  else if (currentType === 'union') unions.push({ name: currentName, count: currentCount });

  return { namespace, rootType, fileIdentifier, fileExtension, tables, structs, enums, unions };
}

function highlightFbs(text) {
  const lines = (text || '').split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) {
      result.push('<span class="flatbuf-comment">' + esc(line) + '</span>');
      continue;
    }

    let out = '';
    let i = 0;
    const chars = line;
    while (i < chars.length) {
      if (chars[i] === '"') {
        let j = i + 1;
        while (j < chars.length && chars[j] !== '"') {
          if (chars[j] === '\\') j++;
          j++;
        }
        j++;
        out += '<span class="flatbuf-str">' + esc(chars.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      if (/[a-zA-Z_]/.test(chars[i])) {
        let j = i;
        while (j < chars.length && /[\w]/.test(chars[j])) j++;
        const word = chars.slice(i, j);
        if (CTRL_KW.has(word)) {
          out += '<span class="flatbuf-kw">' + esc(word) + '</span>';
        } else if (TYPE_KW.has(word)) {
          out += '<span class="flatbuf-type">' + esc(word) + '</span>';
        } else {
          out += esc(word);
        }
        i = j;
        continue;
      }
      if (/[0-9\-]/.test(chars[i]) && (i === 0 || /[\s=,(]/.test(chars[i - 1]))) {
        let j = i;
        if (chars[j] === '-') j++;
        while (j < chars.length && /[0-9._e]/.test(chars[j])) j++;
        out += '<span class="flatbuf-num">' + esc(chars.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      out += esc(chars[i]);
      i++;
    }
    result.push(out);
  }
  return result.join('\n');
}

export function render(intake) {
  const text = intake.text || '';
  const { namespace, rootType, fileIdentifier, fileExtension, tables, structs, enums, unions } = analyzeFbs(text);

  const host = document.createElement('div');
  host.className = 'flatbuf-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'flatbuf-title';
  title.innerHTML = '<span class="flatbuf-badge">FlatBuffers</span>';
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'flatbuf-sub';
  sub.textContent = `${tables.length} table${tables.length !== 1 ? 's' : ''} · ${structs.length} struct${structs.length !== 1 ? 's' : ''} · ${enums.length} enum${enums.length !== 1 ? 's' : ''} · ${unions.length} union${unions.length !== 1 ? 's' : ''}`;
  host.appendChild(sub);

  // Metadata row
  const metaItems = [];
  if (namespace) metaItems.push({ label: 'namespace', value: namespace });
  if (rootType) metaItems.push({ label: 'root_type', value: rootType });
  if (fileIdentifier) metaItems.push({ label: 'file_identifier', value: '"' + fileIdentifier + '"' });
  if (fileExtension) metaItems.push({ label: 'file_extension', value: '"' + fileExtension + '"' });
  if (metaItems.length > 0) {
    const metaEl = document.createElement('div');
    metaEl.className = 'flatbuf-meta';
    for (const { label, value } of metaItems) {
      const item = document.createElement('span');
      item.className = 'flatbuf-meta-item';
      const lbl = document.createElement('span');
      lbl.className = 'flatbuf-meta-label';
      lbl.textContent = label + ':';
      item.appendChild(lbl);
      item.appendChild(document.createTextNode(value));
      metaEl.appendChild(item);
    }
    host.appendChild(metaEl);
  }

  // Summary cards
  const cards = document.createElement('div');
  cards.className = 'flatbuf-cards';
  for (const { value, label } of [
    { value: tables.length, label: 'Tables' },
    { value: structs.length, label: 'Structs' },
    { value: enums.length, label: 'Enums' },
    { value: unions.length, label: 'Unions' },
  ]) {
    const card = document.createElement('div');
    card.className = 'flatbuf-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  function makeSection(title, items, countLabel) {
    if (items.length === 0) return;
    const sec = document.createElement('div');
    sec.className = 'flatbuf-section';
    const hd = document.createElement('div');
    hd.className = 'flatbuf-section-hd';
    hd.textContent = title;
    sec.appendChild(hd);
    const ul = document.createElement('ul');
    ul.className = 'flatbuf-list';
    for (const { name, count } of items) {
      const li = document.createElement('li');
      li.textContent = name;
      const ct = document.createElement('span');
      ct.className = 'flatbuf-count';
      ct.textContent = count + ' ' + countLabel + (count !== 1 ? 's' : '');
      li.appendChild(ct);
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  makeSection('Tables', tables, 'field');
  makeSection('Structs', structs, 'field');
  makeSection('Enums', enums, 'value');
  makeSection('Unions', unions, 'member');

  // Syntax-highlighted source
  const srcSec = document.createElement('div');
  srcSec.className = 'flatbuf-section';
  const srcHd = document.createElement('div');
  srcHd.className = 'flatbuf-section-hd';
  srcHd.textContent = 'Source';
  srcSec.appendChild(srcHd);
  const pre = document.createElement('pre');
  pre.className = 'flatbuf-pre';
  pre.innerHTML = highlightFbs(text);
  srcSec.appendChild(pre);
  host.appendChild(srcSec);

  return { parentNode: host };
}
