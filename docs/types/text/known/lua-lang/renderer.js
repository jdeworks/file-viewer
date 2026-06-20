const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.lua-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.lua-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00007c;color:#fff;vertical-align:middle;margin-right:8px;}
.lua-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.lua-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.lua-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.lua-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.lua-card strong{display:block;font-size:1.2rem;font-weight:700;}
.lua-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.lua-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.lua-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.lua-list{margin:0;padding:0;list-style:none;}
.lua-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.lua-list li:last-child{border-bottom:none;}
.lua-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#dbeafe;color:#1e40af;font-weight:700;}
.lua-tag-local{background:#dcfce7;color:#166534;}
.lua-tag-class{background:#fef9c3;color:#854d0e;}
.lua-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.lua-kw{color:#00007c;font-weight:600;}
.lua-str{color:#0a6640;}
.lua-comment{color:#6e7781;font-style:italic;}
.lua-num{color:#b45309;}
`;

const LUA_KEYWORDS = new Set([
  'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
  'goto', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return',
  'then', 'true', 'until', 'while',
]);

function analyzeLua(text) {
  const lines = text.split(/\r?\n/);
  const requires = [];
  const globalFunctions = [];
  const localFunctions = [];
  const classDefs = [];
  const classMethods = [];
  let tableConstructors = 0;
  let isModule = false;

  // Module/return detection
  if (/return\s*\{/.test(text) || /module\s*\(/.test(text)) isModule = true;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) continue;

    // require("...") or require('...')
    const reqM = trimmed.match(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (reqM && !requires.includes(reqM[1])) requires.push(reqM[1]);

    // local function name(...)
    const localFnM = trimmed.match(/^local\s+function\s+(\w+)/);
    if (localFnM && !localFunctions.includes(localFnM[1])) localFunctions.push(localFnM[1]);

    // local name = function(...)
    const localVarFnM = trimmed.match(/^local\s+(\w+)\s*=\s*function\s*\(/);
    if (localVarFnM && !localFunctions.includes(localVarFnM[1])) localFunctions.push(localVarFnM[1]);

    // global function name(...) or MyClass:method(...)
    const globalFnM = trimmed.match(/^function\s+([\w.:]+)\s*\(/);
    if (globalFnM) {
      const fname = globalFnM[1];
      if (fname.includes(':')) {
        if (!classMethods.includes(fname)) classMethods.push(fname);
      } else if (fname.includes('.')) {
        if (!globalFunctions.includes(fname)) globalFunctions.push(fname);
      } else {
        if (!globalFunctions.includes(fname)) globalFunctions.push(fname);
      }
    }

    // Class-like: MyClass = {} or MyClass = MyBase:new()
    const classM = trimmed.match(/^([A-Z]\w*)\s*=\s*(?:\{\}|[\w.]+:new\s*\()/);
    if (classM && !classDefs.includes(classM[1])) classDefs.push(classM[1]);

    // Count table constructors { ... }
    const tableMatches = trimmed.match(/\{/g);
    if (tableMatches) tableConstructors += tableMatches.length;
  }

  return { requires, globalFunctions, localFunctions, classDefs, classMethods, tableConstructors, isModule };
}

function highlightLua(text) {
  return text.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) {
      return '<span class="lua-comment">' + esc(line) + '</span>';
    }

    // Check for inline comment
    const commentIdx = line.indexOf('--');
    let code = line;
    let suffix = '';
    if (commentIdx !== -1) {
      const before = line.slice(0, commentIdx);
      const squotes = (before.match(/'/g) || []).length;
      const dquotes = (before.match(/"/g) || []).length;
      if (squotes % 2 === 0 && dquotes % 2 === 0) {
        code = line.slice(0, commentIdx);
        suffix = '<span class="lua-comment">' + esc(line.slice(commentIdx)) + '</span>';
      }
    }

    let out = '';
    let i = 0;
    while (i < code.length) {
      // String literals
      if (code[i] === '"' || code[i] === "'") {
        const q = code[i];
        let j = i + 1;
        while (j < code.length && code[j] !== q) {
          if (code[j] === '\\') j++;
          j++;
        }
        j++;
        out += '<span class="lua-str">' + esc(code.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Long strings [[...]]
      if (code[i] === '[' && code[i + 1] === '[') {
        const end = code.indexOf(']]', i + 2);
        const j = end === -1 ? code.length : end + 2;
        out += '<span class="lua-str">' + esc(code.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Numbers
      if (/[0-9]/.test(code[i])) {
        let j = i;
        while (j < code.length && /[0-9._xXeEfF]/.test(code[j])) j++;
        out += '<span class="lua-num">' + esc(code.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Identifiers / keywords
      if (/[A-Za-z_]/.test(code[i])) {
        let j = i;
        while (j < code.length && /[\w]/.test(code[j])) j++;
        const word = code.slice(i, j);
        if (LUA_KEYWORDS.has(word)) {
          out += '<span class="lua-kw">' + esc(word) + '</span>';
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
  sec.className = 'lua-section';
  const hd = document.createElement('div');
  hd.className = 'lua-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'lua-list';
  sec.appendChild(ul);
  return ul;
}

function addListItems(ul, items, tagText, tagClass) {
  for (const item of items) {
    const li = document.createElement('li');
    if (tagText) {
      const tag = document.createElement('span');
      tag.className = 'lua-tag' + (tagClass ? ' lua-tag-' + tagClass : '');
      tag.textContent = tagText;
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' '));
    }
    li.appendChild(document.createTextNode(item));
    ul.appendChild(li);
  }
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const info = analyzeLua(text);
  const badge = info.isModule ? 'Lua Module' : 'Lua Script';

  const host = document.createElement('div');
  host.className = 'lua-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'lua-title';
  const badgeEl = document.createElement('span');
  badgeEl.className = 'lua-badge';
  badgeEl.textContent = badge;
  title.appendChild(badgeEl);
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'lua-sub';
  const totalFns = info.globalFunctions.length + info.localFunctions.length + info.classMethods.length;
  sub.textContent = [
    `${info.requires.length} require${info.requires.length !== 1 ? 's' : ''}`,
    `${totalFns} function${totalFns !== 1 ? 's' : ''}`,
    `${info.classDefs.length} class${info.classDefs.length !== 1 ? 'es' : ''}`,
    `${info.tableConstructors} table${info.tableConstructors !== 1 ? 's' : ''}`,
  ].join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'lua-cards';
  for (const { value, label } of [
    { value: info.requires.length, label: 'Requires' },
    { value: info.globalFunctions.length, label: 'Global Fns' },
    { value: info.localFunctions.length, label: 'Local Fns' },
    { value: info.classDefs.length, label: 'Classes' },
  ]) {
    const card = document.createElement('div');
    card.className = 'lua-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Requires
  if (info.requires.length > 0) {
    const sec = makeSection(host, `Requires (${info.requires.length})`);
    const ul = makeList(sec);
    addListItems(ul, info.requires, null, null);
  }

  // Classes
  if (info.classDefs.length > 0) {
    const sec = makeSection(host, `Classes (${info.classDefs.length})`);
    const ul = makeList(sec);
    addListItems(ul, info.classDefs, 'class', 'class');
  }

  // Global functions
  if (info.globalFunctions.length > 0) {
    const sec = makeSection(host, `Global Functions (${info.globalFunctions.length})`);
    const ul = makeList(sec);
    addListItems(ul, info.globalFunctions, 'global', null);
  }

  // Local functions
  if (info.localFunctions.length > 0) {
    const sec = makeSection(host, `Local Functions (${info.localFunctions.length})`);
    const ul = makeList(sec);
    addListItems(ul, info.localFunctions, 'local', 'local');
  }

  // Class methods
  if (info.classMethods.length > 0) {
    const sec = makeSection(host, `Class Methods (${info.classMethods.length})`);
    const ul = makeList(sec);
    addListItems(ul, info.classMethods, 'method', 'class');
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'lua-pre';
  pre.innerHTML = highlightLua(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
