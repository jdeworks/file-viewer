const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.capnp-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.capnp-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#c2410c;color:#fff;vertical-align:middle;margin-right:8px;}
.capnp-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.capnp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.capnp-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.capnp-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.capnp-card strong{display:block;font-size:1.2rem;font-weight:700;}
.capnp-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.capnp-fileid{font-family:ui-monospace,monospace;font-size:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:4px 10px;margin-bottom:14px;display:inline-block;}
.capnp-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.capnp-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.capnp-list{margin:0;padding:0;list-style:none;}
.capnp-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:8px;align-items:baseline;}
.capnp-list li:last-child{border-bottom:none;}
.capnp-count{font-size:11px;color:var(--fg-2,#888);margin-left:auto;}
.capnp-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.capnp-kw{color:#c2410c;font-weight:600;}
.capnp-str{color:#0369a1;}
.capnp-comment{color:#6e7781;font-style:italic;}
.capnp-num{color:#b45309;}
.capnp-id{color:#7c3aed;}
.capnp-type{color:#0891b2;}
`;

const KEYWORDS = ['struct', 'interface', 'enum', 'const', 'using', 'import', 'annotation', 'extends', 'in', 'out', 'param', 'group', 'union', 'void', 'Bool', 'Int8', 'Int16', 'Int32', 'Int64', 'UInt8', 'UInt16', 'UInt32', 'UInt64', 'Float32', 'Float64', 'Text', 'Data', 'List', 'AnyPointer', 'Capability'];

function analyzeCapnp(text) {
  const lines = (text || '').split(/\r?\n/);
  let fileId = null;
  const structs = [];
  const interfaces = [];
  const enums = [];
  const consts = [];

  // Track current block type and name for counting fields/methods
  let currentType = null;
  let currentName = null;
  let currentCount = 0;
  let depth = 0;
  let startDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // File ID: @0x...;
    if (!fileId) {
      const idMatch = trimmed.match(/^@(0x[0-9a-fA-F]+)\s*;/);
      if (idMatch) { fileId = idMatch[1]; continue; }
    }

    // Count braces for depth tracking
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;

    // Top-level declarations (depth === 0 when declaration starts)
    if (depth === 0 || (depth === startDepth && currentType)) {
      const structMatch = trimmed.match(/^struct\s+(\w+)/);
      const ifaceMatch = trimmed.match(/^interface\s+(\w+)/);
      const enumMatch = trimmed.match(/^enum\s+(\w+)/);
      const constMatch = trimmed.match(/^const\s+(\w+)/);

      if (structMatch) {
        if (currentType === 'struct') structs.push({ name: currentName, count: currentCount });
        else if (currentType === 'interface') interfaces.push({ name: currentName, count: currentCount });
        else if (currentType === 'enum') enums.push({ name: currentName, count: currentCount });
        currentType = 'struct'; currentName = structMatch[1]; currentCount = 0; startDepth = depth;
      } else if (ifaceMatch) {
        if (currentType === 'struct') structs.push({ name: currentName, count: currentCount });
        else if (currentType === 'interface') interfaces.push({ name: currentName, count: currentCount });
        else if (currentType === 'enum') enums.push({ name: currentName, count: currentCount });
        currentType = 'interface'; currentName = ifaceMatch[1]; currentCount = 0; startDepth = depth;
      } else if (enumMatch) {
        if (currentType === 'struct') structs.push({ name: currentName, count: currentCount });
        else if (currentType === 'interface') interfaces.push({ name: currentName, count: currentCount });
        else if (currentType === 'enum') enums.push({ name: currentName, count: currentCount });
        currentType = 'enum'; currentName = enumMatch[1]; currentCount = 0; startDepth = depth;
      } else if (constMatch) {
        consts.push(constMatch[1]);
      }
    }

    // Count fields/methods/enum values at depth startDepth+1
    if (currentType && depth === startDepth + 1) {
      const fieldMatch = trimmed.match(/^(\w+)\s+@\d+/);
      if (fieldMatch) currentCount++;
    }

    depth += opens - closes;
  }

  // Flush last block
  if (currentType === 'struct') structs.push({ name: currentName, count: currentCount });
  else if (currentType === 'interface') interfaces.push({ name: currentName, count: currentCount });
  else if (currentType === 'enum') enums.push({ name: currentName, count: currentCount });

  return { fileId, structs, interfaces, enums, consts };
}

function highlightCapnp(text) {
  const lines = (text || '').split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Comment lines
    if (trimmed.startsWith('#')) {
      result.push('<span class="capnp-comment">' + esc(line) + '</span>');
      continue;
    }

    let out = '';
    let i = 0;
    const chars = line;
    while (i < chars.length) {
      // String literals
      if (chars[i] === '"') {
        let j = i + 1;
        while (j < chars.length && chars[j] !== '"') {
          if (chars[j] === '\\') j++;
          j++;
        }
        j++;
        out += '<span class="capnp-str">' + esc(chars.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Hex file ID @0x...
      if (chars[i] === '@' && chars.slice(i + 1, i + 3) === '0x') {
        let j = i + 1;
        while (j < chars.length && /[0-9a-fA-FxX]/.test(chars[j])) j++;
        out += '<span class="capnp-id">' + esc(chars.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Field ordinal @N
      if (chars[i] === '@') {
        let j = i + 1;
        while (j < chars.length && /\d/.test(chars[j])) j++;
        out += '<span class="capnp-num">' + esc(chars.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Keywords and identifiers
      if (/[a-zA-Z_]/.test(chars[i])) {
        let j = i;
        while (j < chars.length && /[\w]/.test(chars[j])) j++;
        const word = chars.slice(i, j);
        if (KEYWORDS.includes(word)) {
          // Distinguish type-keywords vs control keywords
          if (['struct', 'interface', 'enum', 'const', 'using', 'import', 'annotation', 'extends', 'group', 'union'].includes(word)) {
            out += '<span class="capnp-kw">' + esc(word) + '</span>';
          } else if (['Text', 'Data', 'List', 'AnyPointer', 'Bool', 'Int8', 'Int16', 'Int32', 'Int64', 'UInt8', 'UInt16', 'UInt32', 'UInt64', 'Float32', 'Float64', 'Void', 'Capability'].includes(word)) {
            out += '<span class="capnp-type">' + esc(word) + '</span>';
          } else {
            out += '<span class="capnp-kw">' + esc(word) + '</span>';
          }
        } else {
          out += esc(word);
        }
        i = j;
        continue;
      }
      // Numbers
      if (/[0-9]/.test(chars[i])) {
        let j = i;
        while (j < chars.length && /[0-9._]/.test(chars[j])) j++;
        out += '<span class="capnp-num">' + esc(chars.slice(i, j)) + '</span>';
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
  const { fileId, structs, interfaces, enums, consts } = analyzeCapnp(text);

  const host = document.createElement('div');
  host.className = 'capnp-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'capnp-title';
  title.innerHTML = '<span class="capnp-badge">Cap\'n Proto</span>';
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'capnp-sub';
  sub.textContent = `${structs.length} struct${structs.length !== 1 ? 's' : ''} · ${interfaces.length} interface${interfaces.length !== 1 ? 's' : ''} · ${enums.length} enum${enums.length !== 1 ? 's' : ''} · ${consts.length} const${consts.length !== 1 ? 's' : ''}`;
  host.appendChild(sub);

  if (fileId) {
    const idEl = document.createElement('div');
    idEl.className = 'capnp-fileid';
    idEl.textContent = 'File ID: ' + fileId;
    host.appendChild(idEl);
  }

  // Summary cards
  const cards = document.createElement('div');
  cards.className = 'capnp-cards';
  for (const { value, label } of [
    { value: structs.length, label: 'Structs' },
    { value: interfaces.length, label: 'Interfaces' },
    { value: enums.length, label: 'Enums' },
    { value: consts.length, label: 'Constants' },
  ]) {
    const card = document.createElement('div');
    card.className = 'capnp-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Structs section
  if (structs.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'capnp-section';
    const hd = document.createElement('div');
    hd.className = 'capnp-section-hd';
    hd.textContent = 'Structs';
    sec.appendChild(hd);
    const ul = document.createElement('ul');
    ul.className = 'capnp-list';
    for (const { name, count } of structs) {
      const li = document.createElement('li');
      li.textContent = name;
      const ct = document.createElement('span');
      ct.className = 'capnp-count';
      ct.textContent = count + ' field' + (count !== 1 ? 's' : '');
      li.appendChild(ct);
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  // Interfaces section
  if (interfaces.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'capnp-section';
    const hd = document.createElement('div');
    hd.className = 'capnp-section-hd';
    hd.textContent = 'Interfaces';
    sec.appendChild(hd);
    const ul = document.createElement('ul');
    ul.className = 'capnp-list';
    for (const { name, count } of interfaces) {
      const li = document.createElement('li');
      li.textContent = name;
      const ct = document.createElement('span');
      ct.className = 'capnp-count';
      ct.textContent = count + ' method' + (count !== 1 ? 's' : '');
      li.appendChild(ct);
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  // Enums section
  if (enums.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'capnp-section';
    const hd = document.createElement('div');
    hd.className = 'capnp-section-hd';
    hd.textContent = 'Enums';
    sec.appendChild(hd);
    const ul = document.createElement('ul');
    ul.className = 'capnp-list';
    for (const { name, count } of enums) {
      const li = document.createElement('li');
      li.textContent = name;
      const ct = document.createElement('span');
      ct.className = 'capnp-count';
      ct.textContent = count + ' value' + (count !== 1 ? 's' : '');
      li.appendChild(ct);
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  // Syntax-highlighted source
  const srcSec = document.createElement('div');
  srcSec.className = 'capnp-section';
  const srcHd = document.createElement('div');
  srcHd.className = 'capnp-section-hd';
  srcHd.textContent = 'Source';
  srcSec.appendChild(srcHd);
  const pre = document.createElement('pre');
  pre.className = 'capnp-pre';
  pre.innerHTML = highlightCapnp(text);
  srcSec.appendChild(pre);
  host.appendChild(srcSec);

  return { parentNode: host };
}
