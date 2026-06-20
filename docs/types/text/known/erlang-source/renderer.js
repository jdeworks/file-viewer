const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.erl-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.erl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#a2003d;color:#fff;vertical-align:middle;margin-right:8px;}
.erl-modname{font-size:13px;font-weight:400;margin-left:8px;color:var(--fg,#24292f);}
.erl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.erl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.erl-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.erl-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.erl-card strong{display:block;font-size:1.2rem;font-weight:700;}
.erl-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.erl-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.erl-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.erl-list{margin:0;padding:0;list-style:none;}
.erl-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.erl-list li:last-child{border-bottom:none;}
.erl-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fee2e2;color:#991b1b;font-weight:700;}
.erl-tag-type{background:#dbeafe;color:#1e40af;}
.erl-tag-opaque{background:#ede9fe;color:#7c3aed;}
.erl-tag-record{background:#dcfce7;color:#166534;}
.erl-tag-macro{background:#fef3c7;color:#92400e;}
.erl-tag-behaviour{background:#fce7f3;color:#9d174d;}
.erl-tag-import{background:#f0fdf4;color:#15803d;}
.erl-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.erl-kw{color:#a2003d;font-weight:600;}
.erl-str{color:#0a6640;}
.erl-comment{color:#6e7781;font-style:italic;}
.erl-atom{color:#0369a1;}
.erl-num{color:#b45309;}
.erl-attr{color:#7c3aed;font-weight:600;}
`;

const ERL_KEYWORDS = new Set([
  'after', 'and', 'andalso', 'band', 'begin', 'bnot', 'bor', 'bsl', 'bsr',
  'bxor', 'case', 'catch', 'cond', 'div', 'end', 'fun', 'if', 'let', 'not',
  'of', 'or', 'orelse', 'receive', 'rem', 'try', 'when', 'xor',
]);

function parseExportList(text) {
  // Extract all -export([...]) content
  const results = [];
  const re = /-export\s*\(\s*\[([\s\S]*?)\]\s*\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const content = m[1];
    // Parse Name/Arity pairs
    const pairRe = /(\w+)\s*\/\s*(\d+)/g;
    let pm;
    while ((pm = pairRe.exec(content)) !== null) {
      results.push({ name: pm[1], arity: pm[2] });
    }
  }
  return results;
}

function parseImportList(text) {
  const results = [];
  const re = /-import\s*\(\s*(\w+)\s*,\s*\[([\s\S]*?)\]\s*\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const fromMod = m[1];
    const content = m[2];
    const pairRe = /(\w+)\s*\/\s*(\d+)/g;
    let pm;
    while ((pm = pairRe.exec(content)) !== null) {
      results.push({ from: fromMod, name: pm[1], arity: pm[2] });
    }
  }
  return results;
}

function analyzeErlang(text, isHrl) {
  const lines = text.split(/\r?\n/);
  let moduleName = null;
  const behaviours = [];
  const exports = [];
  const imports = [];
  const types = [];
  const opaques = [];
  const records = [];
  const macros = [];

  // Module name
  const modM = text.match(/-module\s*\(\s*(\w+)\s*\)/);
  if (modM) moduleName = modM[1];

  // Behaviours
  const behRe = /-behaviour\s*\(\s*(\w+)\s*\)/g;
  let m;
  while ((m = behRe.exec(text)) !== null) {
    if (!behaviours.includes(m[1])) behaviours.push(m[1]);
  }

  // Export lists
  exports.push(...parseExportList(text));

  // Import lists
  imports.push(...parseImportList(text));

  // Type definitions
  const typeRe = /-type\s+(\w+)\s*\(/g;
  while ((m = typeRe.exec(text)) !== null) {
    if (!types.includes(m[1])) types.push(m[1]);
  }

  // Opaque types
  const opaqueRe = /-opaque\s+(\w+)\s*\(/g;
  while ((m = opaqueRe.exec(text)) !== null) {
    if (!opaques.includes(m[1])) opaques.push(m[1]);
  }

  // Record definitions
  const recordRe = /-record\s*\(\s*(\w+)\s*,/g;
  while ((m = recordRe.exec(text)) !== null) {
    if (!records.includes(m[1])) records.push(m[1]);
  }

  // Macro definitions
  const macroRe = /-define\s*\(\s*(\w+)/g;
  while ((m = macroRe.exec(text)) !== null) {
    if (!macros.includes(m[1])) macros.push(m[1]);
  }

  return { moduleName, behaviours, exports, imports, types, opaques, records, macros, isHrl };
}

function highlightErlang(text) {
  return text.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('%')) {
      return '<span class="erl-comment">' + esc(line) + '</span>';
    }

    const commentIdx = line.indexOf('%');
    let code = line;
    let suffix = '';
    if (commentIdx !== -1) {
      const before = line.slice(0, commentIdx);
      const qCount = (before.match(/"/g) || []).length;
      if (qCount % 2 === 0) {
        code = line.slice(0, commentIdx);
        suffix = '<span class="erl-comment">' + esc(line.slice(commentIdx)) + '</span>';
      }
    }

    let out = '';
    let i = 0;
    while (i < code.length) {
      // Attribute -module(, -export(, etc.
      if (code[i] === '-' && i === 0) {
        let j = i + 1;
        while (j < code.length && /[\w]/.test(code[j])) j++;
        const word = code.slice(i + 1, j);
        const attrs = new Set(['module', 'export', 'import', 'define', 'record', 'type', 'opaque', 'behaviour', 'behavior', 'spec', 'callback', 'ifdef', 'ifndef', 'endif', 'include', 'include_lib']);
        if (attrs.has(word)) {
          out += '<span class="erl-attr">' + esc(code.slice(i, j)) + '</span>';
          i = j;
          continue;
        }
      }
      // Strings
      if (code[i] === '"') {
        let j = i + 1;
        while (j < code.length && code[j] !== '"') {
          if (code[j] === '\\') j++;
          j++;
        }
        j++;
        out += '<span class="erl-str">' + esc(code.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Atoms (single-quoted)
      if (code[i] === "'") {
        let j = i + 1;
        while (j < code.length && code[j] !== "'") {
          if (code[j] === '\\') j++;
          j++;
        }
        j++;
        out += '<span class="erl-atom">' + esc(code.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Numbers
      if (/[0-9]/.test(code[i])) {
        let j = i;
        while (j < code.length && /[0-9._#eE]/.test(code[j])) j++;
        out += '<span class="erl-num">' + esc(code.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Identifiers / keywords / atoms
      if (/[A-Za-z_]/.test(code[i])) {
        let j = i;
        while (j < code.length && /[\w@]/.test(code[j])) j++;
        const word = code.slice(i, j);
        if (ERL_KEYWORDS.has(word)) {
          out += '<span class="erl-kw">' + esc(word) + '</span>';
        } else if (/^[a-z]/.test(word)) {
          out += '<span class="erl-atom">' + esc(word) + '</span>';
        } else {
          out += esc(word);
        }
        i = j;
        continue;
      }
      out += esc(code[i]);
      i++;
    }
    return out + suffix;
  }).join('\n');
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'erl-section';
  const hd = document.createElement('div');
  hd.className = 'erl-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'erl-list';
  sec.appendChild(ul);
  return ul;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
  const isHrl = name.endsWith('.hrl');
  const info = analyzeErlang(text, isHrl);
  const badge = isHrl ? 'Erlang Header' : 'Erlang Module';

  const host = document.createElement('div');
  host.className = 'erl-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'erl-title';
  const badgeEl = document.createElement('span');
  badgeEl.className = 'erl-badge';
  badgeEl.textContent = badge;
  title.appendChild(badgeEl);
  if (info.moduleName) {
    const modEl = document.createElement('span');
    modEl.className = 'erl-modname';
    modEl.textContent = info.moduleName;
    title.appendChild(modEl);
  }
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'erl-sub';
  sub.textContent = [
    info.moduleName ? `module ${info.moduleName}` : null,
    `${info.exports.length} export${info.exports.length !== 1 ? 's' : ''}`,
    `${info.records.length} record${info.records.length !== 1 ? 's' : ''}`,
    `${info.macros.length} macro${info.macros.length !== 1 ? 's' : ''}`,
    info.behaviours.length > 0 ? `behaviour: ${info.behaviours.join(', ')}` : null,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'erl-cards';
  for (const { value, label } of [
    { value: info.exports.length, label: 'Exports' },
    { value: info.types.length + info.opaques.length, label: 'Types' },
    { value: info.records.length, label: 'Records' },
    { value: info.macros.length, label: 'Macros' },
  ]) {
    const card = document.createElement('div');
    card.className = 'erl-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Behaviours
  if (info.behaviours.length > 0) {
    const sec = makeSection(host, `Behaviours (${info.behaviours.length})`);
    const ul = makeList(sec);
    for (const beh of info.behaviours) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'erl-tag erl-tag-behaviour';
      tag.textContent = 'behaviour';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + beh));
      ul.appendChild(li);
    }
  }

  // Exports
  if (info.exports.length > 0) {
    const MAX = 10;
    const sec = makeSection(host, `Exported Functions (${info.exports.length})`);
    const ul = makeList(sec);
    for (const { name: fn, arity } of info.exports.slice(0, MAX)) {
      const li = document.createElement('li');
      li.textContent = `${fn}/${arity}`;
      ul.appendChild(li);
    }
    if (info.exports.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${info.exports.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Imports
  if (info.imports.length > 0) {
    const sec = makeSection(host, `Imported Functions (${info.imports.length})`);
    const ul = makeList(sec);
    for (const { from, name: fn, arity } of info.imports) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'erl-tag erl-tag-import';
      tag.textContent = from;
      li.appendChild(tag);
      li.appendChild(document.createTextNode(` ${fn}/${arity}`));
      ul.appendChild(li);
    }
  }

  // Types
  if (info.types.length > 0 || info.opaques.length > 0) {
    const total = info.types.length + info.opaques.length;
    const sec = makeSection(host, `Type Definitions (${total})`);
    const ul = makeList(sec);
    for (const t of info.types) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'erl-tag erl-tag-type';
      tag.textContent = 'type';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + t));
      ul.appendChild(li);
    }
    for (const t of info.opaques) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'erl-tag erl-tag-opaque';
      tag.textContent = 'opaque';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + t));
      ul.appendChild(li);
    }
  }

  // Records
  if (info.records.length > 0) {
    const sec = makeSection(host, `Records (${info.records.length})`);
    const ul = makeList(sec);
    for (const rec of info.records) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'erl-tag erl-tag-record';
      tag.textContent = 'record';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + rec));
      ul.appendChild(li);
    }
  }

  // Macros
  if (info.macros.length > 0) {
    const sec = makeSection(host, `Macros (${info.macros.length})`);
    const ul = makeList(sec);
    for (const mac of info.macros) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'erl-tag erl-tag-macro';
      tag.textContent = 'define';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + mac));
      ul.appendChild(li);
    }
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'erl-pre';
  pre.innerHTML = highlightErlang(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
