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
.lua-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.lua-list li:last-child{border-bottom:none;}
.lua-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#dbeafe;color:#1e40af;font-weight:700;}
.lua-tag-local{background:#dcfce7;color:#166534;}
.lua-tag-method{background:#fef9c3;color:#854d0e;}
.lua-tag-table{background:#f3e8ff;color:#7e22ce;}
.lua-tag-req{background:#e0f2fe;color:#0369a1;}
.lua-name{font-weight:600;}
.lua-owner{color:#7c3aed;}
.lua-param{color:#0e7490;}
.lua-self{color:#9f1239;font-style:italic;}
.lua-vararg{color:#b45309;font-weight:700;}
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

// Strip Lua comments so structural parsing isn't fooled by commented-out code.
// Handles long-bracket block comments --[[ ]] / --[==[ ]==] and `--` line comments.
function stripComments(text) {
  return String(text || '')
    .replace(/--\[(=*)\[[\s\S]*?\]\1\]/g, ' ')
    .replace(/--[^\n]*/g, '');
}

// Split a parenthesised param list "(a, b, ...)" into { params:[names], vararg:bool }.
// The Lua vararg `...` is pulled out into a flag, not a named param.
function luaParams(raw) {
  let vararg = false;
  const params = String(raw || '').split(',').map((p) => p.trim()).filter((p) => {
    if (p === '...') { vararg = true; return false; }
    return Boolean(p);
  });
  return { params, vararg };
}

// Resolve a function path token into owner / name / method.
//   "greet"        -> { owner:null,  name:"greet",  method:false }
//   "M.helper"     -> { owner:"M",   name:"helper", method:false }
//   "Animal:speak" -> { owner:"Animal", name:"speak", method:true }  (`:` adds implicit self)
function splitFnName(full) {
  const colon = full.lastIndexOf(':');
  if (colon !== -1) return { owner: full.slice(0, colon), name: full.slice(colon + 1), method: true };
  const dot = full.lastIndexOf('.');
  if (dot !== -1) return { owner: full.slice(0, dot), name: full.slice(dot + 1), method: false };
  return { owner: null, name: full, method: false };
}

// Parse Lua source into structured facts. Pure (no DOM) so it is unit-testable.
export function analyzeLua(text) {
  const src = stripComments(text);
  const lines = src.split(/\r?\n/);
  const requires = [];
  const functions = [];
  const locals = [];
  const assignments = [];
  const seenLocal = new Set();
  const seenAsgn = new Set();
  const hasModuleReturn = /\breturn\s*\{/.test(src) || /\bmodule\s*\(/.test(src);

  const pushReq = (mod) => { if (mod && !requires.includes(mod)) requires.push(mod); };

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    // require "mod" / require("mod") / require('mod') (may appear anywhere on the line)
    let rm;
    const reqRe = /\brequire\s*(?:\(\s*)?['"]([^'"]+)['"]/g;
    while ((rm = reqRe.exec(t))) pushReq(rm[1]);

    // local function name(params)
    let m;
    if ((m = t.match(/^local\s+function\s+([\w.:]+)\s*\(([^)]*)\)/))) {
      const { owner, name, method } = splitFnName(m[1]);
      const { params, vararg } = luaParams(m[2]);
      functions.push({ name, owner, params, method, local: true, vararg });
      continue;
    }
    // local name = function(params)
    if ((m = t.match(/^local\s+(\w+)\s*=\s*function\s*\(([^)]*)\)/))) {
      const { params, vararg } = luaParams(m[2]);
      functions.push({ name: m[1], owner: null, params, method: false, local: true, vararg });
      if (!seenLocal.has(m[1])) { seenLocal.add(m[1]); locals.push(m[1]); }
      continue;
    }
    // function name(params) / function Tbl.name(params) / function Tbl:method(params)
    if ((m = t.match(/^function\s+([\w.:]+)\s*\(([^)]*)\)/))) {
      const { owner, name, method } = splitFnName(m[1]);
      const { params, vararg } = luaParams(m[2]);
      functions.push({ name, owner, params, method, local: false, vararg });
      continue;
    }
    // assignment to a function expression: Tbl.name = function(params) / name = function(params)
    if ((m = t.match(/^([\w.]+)\s*=\s*function\s*\(([^)]*)\)/))) {
      const { owner, name, method } = splitFnName(m[1]);
      const { params, vararg } = luaParams(m[2]);
      functions.push({ name, owner, params, method, local: false, vararg });
      continue;
    }
    // local variable declaration(s): local a, b, c [= ...]
    if ((m = t.match(/^local\s+([\w,\s]+?)\s*(?:=|$)/)) && !/^local\s+function\b/.test(t)) {
      for (const nm of m[1].split(',').map((x) => x.trim()).filter(Boolean)) {
        if (!seenLocal.has(nm)) { seenLocal.add(nm); locals.push(nm); }
      }
      continue;
    }
    // module-table assignment: M.x = ... / Tbl.field.sub = ... (not == comparison, not a function expr)
    if ((m = t.match(/^([A-Za-z_]\w*)((?:\.[A-Za-z_]\w*)+)\s*=\s*[^=]/))) {
      const owner = m[1];
      const field = m[2].replace(/^\./, '');
      const key = owner + '.' + field;
      if (!seenAsgn.has(key)) { seenAsgn.add(key); assignments.push({ owner, field }); }
    }
  }

  return { requires, functions, locals, assignments, hasModuleReturn };
}

function highlightLua(text) {
  return text.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) return '<span class="lua-comment">' + esc(line) + '</span>';

    const commentIdx = line.indexOf('--');
    let code = line, suffix = '';
    if (commentIdx !== -1) {
      const before = line.slice(0, commentIdx);
      const squotes = (before.match(/'/g) || []).length;
      const dquotes = (before.match(/"/g) || []).length;
      if (squotes % 2 === 0 && dquotes % 2 === 0) {
        code = line.slice(0, commentIdx);
        suffix = '<span class="lua-comment">' + esc(line.slice(commentIdx)) + '</span>';
      }
    }

    let out = '', i = 0;
    while (i < code.length) {
      if (code[i] === '"' || code[i] === "'") {
        const q = code[i];
        let j = i + 1;
        while (j < code.length && code[j] !== q) { if (code[j] === '\\') j++; j++; }
        j++;
        out += '<span class="lua-str">' + esc(code.slice(i, j)) + '</span>';
        i = j; continue;
      }
      if (code[i] === '[' && code[i + 1] === '[') {
        const end = code.indexOf(']]', i + 2);
        const j = end === -1 ? code.length : end + 2;
        out += '<span class="lua-str">' + esc(code.slice(i, j)) + '</span>';
        i = j; continue;
      }
      if (/[0-9]/.test(code[i])) {
        let j = i;
        while (j < code.length && /[0-9._xXeEfF]/.test(code[j])) j++;
        out += '<span class="lua-num">' + esc(code.slice(i, j)) + '</span>';
        i = j; continue;
      }
      if (/[A-Za-z_]/.test(code[i])) {
        let j = i;
        while (j < code.length && /[\w]/.test(code[j])) j++;
        const word = code.slice(i, j);
        out += LUA_KEYWORDS.has(word) ? '<span class="lua-kw">' + esc(word) + '</span>' : esc(word);
        i = j; continue;
      }
      out += esc(code[i]); i++;
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
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'lua-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="lua-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }

// Render a function's parameter list, surfacing the implicit `self` of `:` methods and vararg.
function paramsHtml(fn) {
  const parts = [];
  if (fn.method) parts.push('<span class="lua-self">self</span>');
  for (const p of fn.params) parts.push(`<span class="lua-param">${esc(p)}</span>`);
  if (fn.vararg) parts.push('<span class="lua-vararg">...</span>');
  return parts.join(', ');
}

function fnRow(ul, fn) {
  let kind = 'global', cls = 'lua-tag';
  if (fn.local) { kind = 'local'; cls = 'lua-tag-local'; }
  else if (fn.method) { kind = 'method'; cls = 'lua-tag-method'; }
  else if (fn.owner) { kind = 'table fn'; cls = 'lua-tag-table'; }
  const owner = fn.owner ? `<span class="lua-owner">${esc(fn.owner)}${fn.method ? ':' : '.'}</span>` : '';
  row(ul, `${tag(cls, kind)} ${owner}<span class="lua-name">${esc(fn.name)}</span>(${paramsHtml(fn)})`);
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const info = analyzeLua(text);
  const { requires, functions, locals, assignments, hasModuleReturn } = info;

  const host = document.createElement('div');
  host.className = 'lua-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'lua-title';
  const badgeEl = document.createElement('span');
  badgeEl.className = 'lua-badge';
  badgeEl.textContent = hasModuleReturn ? 'Lua Module' : 'Lua Script';
  title.appendChild(badgeEl);
  host.appendChild(title);

  const methods = functions.filter((f) => f.method);
  const tableFns = functions.filter((f) => f.owner && !f.method);
  const localFns = functions.filter((f) => f.local && !f.owner);
  const globalFns = functions.filter((f) => !f.local && !f.owner);

  const sub = document.createElement('div');
  sub.className = 'lua-sub';
  sub.textContent = [
    requires.length && `${requires.length} require${requires.length !== 1 ? 's' : ''}`,
    functions.length && `${functions.length} function${functions.length !== 1 ? 's' : ''}`,
    locals.length && `${locals.length} local${locals.length !== 1 ? 's' : ''}`,
    assignments.length && `${assignments.length} assignment${assignments.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'lua-cards';
  for (const { value, label } of [
    { value: requires.length, label: 'Requires' },
    { value: functions.length, label: 'Functions' },
    { value: methods.length, label: 'Methods' },
    { value: locals.length, label: 'Locals' },
  ]) {
    const card = document.createElement('div');
    card.className = 'lua-card';
    const strong = document.createElement('strong'); strong.textContent = value;
    const span = document.createElement('span'); span.textContent = label;
    card.appendChild(strong); card.appendChild(span); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (requires.length) {
    const ul = makeList(makeSection(host, `Requires (${requires.length})`));
    for (const r of requires) row(ul, `${tag('lua-tag-req', 'require')} <span class="lua-name">${esc(r)}</span>`);
  }
  if (globalFns.length) {
    const ul = makeList(makeSection(host, `Global Functions (${globalFns.length})`));
    for (const f of globalFns) fnRow(ul, f);
  }
  if (methods.length || tableFns.length) {
    const both = [...methods, ...tableFns];
    const ul = makeList(makeSection(host, `Table Functions & Methods (${both.length})`));
    for (const f of both) fnRow(ul, f);
  }
  if (localFns.length) {
    const ul = makeList(makeSection(host, `Local Functions (${localFns.length})`));
    for (const f of localFns) fnRow(ul, f);
  }
  if (assignments.length) {
    const ul = makeList(makeSection(host, `Table Assignments (${assignments.length})`));
    for (const a of assignments) {
      row(ul, `<span class="lua-owner">${esc(a.owner)}.</span><span class="lua-name">${esc(a.field)}</span>`);
    }
  }
  if (locals.length) {
    const ul = makeList(makeSection(host, `Locals (${locals.length})`));
    for (const l of locals) row(ul, `${tag('lua-tag-local', 'local')} <span class="lua-name">${esc(l)}</span>`);
  }

  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'lua-pre';
  pre.innerHTML = highlightLua(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
