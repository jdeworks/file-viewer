const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pas-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pas-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e67e22;color:#fff;vertical-align:middle;margin-right:8px;}
.pas-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pas-name{font-family:ui-monospace,monospace;font-size:16px;color:#b9540a;font-weight:700;}
.pas-kind{font-size:11px;color:var(--fg-2,#888);font-style:italic;}
.pas-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pas-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.pas-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.pas-card strong{display:block;font-size:1.2rem;font-weight:700;}
.pas-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.pas-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.pas-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.pas-list{margin:0;padding:0;list-style:none;}
.pas-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.pas-list li:last-child{border-bottom:none;}
.pas-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.pas-tag-uses{background:#dcfce7;color:#166534;}
.pas-tag-proc{background:#ede9fe;color:#7c3aed;}
.pas-tag-func{background:#dbeafe;color:#1d4ed8;}
.pas-tag-ctor{background:#fce7f3;color:#9d174d;}
.pas-tag-type{background:#fef9c3;color:#854d0e;}
.pas-tag-const{background:#e0f2fe;color:#0369a1;}
.pas-tag-var{background:#ffedd5;color:#9a3412;}
.pas-id{font-weight:600;}
.pas-type{color:#0e7490;}
.pas-mode{color:#9f1239;font-style:italic;}
.pas-ret{color:#1d4ed8;}
.pas-val{color:#15803d;}
.pas-fields{display:block;width:100%;margin:2px 0 0 14px;color:var(--fg-2,#666);}
`;

// Strip { } block, (* *) block, and // line comments — preserving newlines and string literals.
function stripComments(text) {
  const s = String(text || '');
  const n = s.length;
  let out = '', i = 0, state = 'code';
  while (i < n) {
    const c = s[i], c2 = s[i + 1];
    if (state === 'code') {
      if (c === '{') { state = 'brace'; i++; }
      else if (c === '(' && c2 === '*') { state = 'paren'; i += 2; }
      else if (c === '/' && c2 === '/') { state = 'line'; i += 2; }
      else if (c === "'") { out += c; i++; while (i < n) { out += s[i]; if (s[i] === "'") { i++; break; } i++; } }
      else { out += c; i++; }
    } else if (state === 'brace') {
      if (c === '}') state = 'code'; else if (c === '\n') out += '\n'; i++;
    } else if (state === 'paren') {
      if (c === '*' && c2 === ')') { state = 'code'; i += 2; } else { if (c === '\n') out += '\n'; i++; }
    } else { // line comment
      if (c === '\n') { state = 'code'; out += '\n'; } i++;
    }
  }
  return out;
}

// Parse a Pascal parameter list "(a, b: Integer; const c: string)" into [{names,type,mode}].
function pascalParams(group) {
  const m = String(group || '').match(/\(([\s\S]*)\)/);
  if (!m) return [];
  return m[1].split(';').map((g) => g.replace(/\s+/g, ' ').trim()).filter(Boolean).map((g) => {
    const mm = g.match(/^((?:const|var|out|constref)\s+)?([\w\s,]+?)\s*:\s*([\w.]+(?:\s+of\s+[\w.]+)?)/i);
    return mm ? { names: mm[2].replace(/\s+/g, ' ').trim(), type: mm[3].trim(), mode: (mm[1] || '').trim() }
              : { names: g, type: '', mode: '' };
  });
}

function parseInlineFields(rhs, cur) {
  const body = rhs.replace(/^(packed\s+)?record\b/i, '').replace(/\bend\b[\s\S]*$/i, '');
  for (const part of body.split(';')) {
    const fm = part.trim().match(/^([\w][\w\s,]*?)\s*:\s*([\w.]+)/i);
    if (fm) cur.fields.push({ names: fm[1].replace(/\s+/g, ' ').trim(), type: fm[2].trim() });
  }
}

// Parse Pascal source into structured facts. Pure (DOM-free) and exported for unit testing.
export function analyzePascal(text) {
  const cleaned = stripComments(text);

  const unit = (cleaned.match(/\bunit\s+([\w.]+)\s*;/i) || [])[1] || null;
  const program = (cleaned.match(/\bprogram\s+([\w.]+)\s*[;(]/i) || [])[1] || null;

  const uses = [];
  for (const um of cleaned.matchAll(/\buses\s+([^;]+);/gi)) {
    for (let item of um[1].split(',')) {
      item = item.trim().split(/\s+in\s+/i)[0].replace(/\s+/g, '');
      if (item && !uses.includes(item)) uses.push(item);
    }
  }

  // Routines (interface decls + implementation bodies) — deduped by name+param-types+return.
  const routines = [], seen = new Set();
  const reRoutine = /\b(procedure|function|constructor|destructor)\s+([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?)\s*(\([^)]*\))?\s*(?::\s*([A-Za-z_]\w*))?\s*;/gi;
  for (const m of cleaned.matchAll(reRoutine)) {
    const kind = m[1].toLowerCase();
    const name = m[2];
    const params = pascalParams(m[3] || '');
    const returns = kind === 'function' ? (m[4] || '') : '';
    const key = name.split('.').pop().toLowerCase() + '(' + params.map((p) => p.type.toLowerCase()).join(',') + '):' + returns.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    routines.push({ kind, name, params, returns });
  }

  // Types / consts / vars via line-based section scan with record/class block tracking.
  const types = [], consts = [], vars = [];
  let section = null, depth = 0, cur = null;
  for (let line of cleaned.split(/\r?\n/)) {
    line = line.trim();
    if (!line) continue;

    if (cur && depth > 0) { // inside a record/class body
      if (/^end\b/i.test(line)) { if (--depth === 0) { types.push(cur); cur = null; } continue; }
      if (/\brecord\b/i.test(line)) depth++;
      if (!/^(procedure|function|constructor|destructor|property|case|public|private|protected|published|strict)\b/i.test(line)) {
        const fm = line.match(/^([\w][\w\s,]*?)\s*:\s*([\w.]+(?:\s+of\s+[\w.]+)?)\s*;?/i);
        if (fm) cur.fields.push({ names: fm[1].replace(/\s+/g, ' ').trim(), type: fm[2].trim() });
      }
      continue;
    }

    const secKw = line.match(/^(type|const|var)\b\s*(.*)$/i);
    if (secKw) { section = secKw[1].toLowerCase(); line = secKw[2].trim(); if (!line) continue; }

    if (/^(begin|asm|implementation|interface|uses|label|resourcestring|threadvar|initialization|finalization)\b/i.test(line)) { section = null; continue; }
    if (/^(procedure|function|constructor|destructor|property)\b/i.test(line)) { section = null; continue; }

    if (section === 'type') {
      const tm = line.match(/^(\w+)\s*=\s*(.*)$/);
      if (!tm) continue;
      const name = tm[1], rhs = tm[2];
      if (/^(packed\s+)?record\b/i.test(rhs)) {
        cur = { name, kind: 'record', fields: [] }; depth = 1;
        if (/\bend\b/i.test(rhs)) { parseInlineFields(rhs, cur); depth = 0; types.push(cur); cur = null; }
      } else if (/^(packed\s+)?(class|object|interface)\b/i.test(rhs)) {
        if (/^(packed\s+)?(class|object|interface)\s*;/i.test(rhs)) { types.push({ name, kind: 'class', fields: [], parent: null }); }
        else { const pm = rhs.match(/\(([^)]*)\)/); cur = { name, kind: 'class', fields: [], parent: pm ? pm[1].trim() : null }; depth = 1; }
      } else if (/^\(/.test(rhs)) {
        const em = rhs.match(/\(([^)]*)\)/);
        const vals = em ? em[1].split(',').map((v) => v.trim().split(/\s*=\s*/)[0].trim()).filter(Boolean) : [];
        types.push({ name, kind: 'enum', fields: vals.map((v) => ({ names: v, type: '' })) });
      } else {
        let kind = 'alias';
        if (/^array\b/i.test(rhs)) kind = 'array';
        else if (/^\^/.test(rhs)) kind = 'pointer';
        else if (/^set\s+of\b/i.test(rhs)) kind = 'set';
        else if (/^(procedure|function)\b/i.test(rhs)) kind = 'proctype';
        types.push({ name, kind, target: rhs.replace(/;.*$/, '').trim(), fields: [] });
      }
    } else if (section === 'const') {
      const cm = line.match(/^(\w+)\s*(?::\s*([\w.]+))?\s*=\s*(.+?);?\s*$/);
      if (cm) consts.push({ name: cm[1], type: cm[2] || '', value: (cm[3] || '').trim() });
    } else if (section === 'var') {
      const vm = line.match(/^([\w][\w\s,]*?)\s*:\s*([\w.]+(?:\s+of\s+[\w.]+)?)\s*(?:=\s*(.+?))?;?\s*$/);
      if (vm) vars.push({ names: vm[1].replace(/\s+/g, ' ').trim(), type: vm[2].trim(), value: (vm[3] || '').trim() });
    }
  }

  return { unit, program, uses, routines, types, consts, vars };
}

// ---- DOM rendering -------------------------------------------------------
function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'pas-section';
  const hd = document.createElement('div');
  hd.className = 'pas-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'pas-list'; sec.appendChild(ul); return ul; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function tag(cls, t) { return `<span class="pas-tag ${cls}">${esc(t)}</span>`; }
function paramsHtml(params) {
  return params.map((p) => {
    const mode = p.mode ? `<span class="pas-mode">${esc(p.mode)}</span> ` : '';
    const type = p.type ? `: <span class="pas-type">${esc(p.type)}</span>` : '';
    return `${mode}${esc(p.names)}${type}`;
  }).join('; ');
}
function fieldsHtml(fields) {
  return fields.map((f) => `${esc(f.names)}${f.type ? `: <span class="pas-type">${esc(f.type)}</span>` : ''}`).join('; ');
}
const routineTagClass = (k) => k === 'function' ? 'pas-tag-func' : (k === 'constructor' || k === 'destructor') ? 'pas-tag-ctor' : 'pas-tag-proc';

export function render(intake) {
  const text = intake.text || '';
  const { unit, program, uses, routines, types, consts, vars } = analyzePascal(text);
  const moduleName = unit || program || null;
  const moduleKind = unit ? 'unit' : program ? 'program' : null;

  const host = document.createElement('div');
  host.className = 'pas-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'pas-title';
  title.innerHTML = `<span class="pas-badge">Pascal</span>`
    + (moduleName ? `<span class="pas-name">${esc(moduleName)}</span>` : 'Source File')
    + (moduleKind ? ` <span class="pas-kind">(${esc(moduleKind)})</span>` : '');
  host.appendChild(title);

  const procCount = routines.filter((r) => r.kind === 'procedure').length;
  const funcCount = routines.filter((r) => r.kind === 'function').length;
  const sub = document.createElement('div');
  sub.className = 'pas-sub';
  sub.textContent = [
    uses.length && `${uses.length} import${uses.length !== 1 ? 's' : ''}`,
    routines.length && `${routines.length} routine${routines.length !== 1 ? 's' : ''}`,
    types.length && `${types.length} type${types.length !== 1 ? 's' : ''}`,
    consts.length && `${consts.length} const${consts.length !== 1 ? 's' : ''}`,
    vars.length && `${vars.length} var${vars.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ') || 'Pascal source';
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'pas-cards';
  for (const { value, label } of [
    { value: uses.length, label: 'Uses' },
    { value: procCount, label: 'Procedures' },
    { value: funcCount, label: 'Functions' },
    { value: types.length, label: 'Types' },
    { value: consts.length + vars.length, label: 'Const/Var' },
  ]) {
    const card = document.createElement('div');
    card.className = 'pas-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (uses.length) {
    const ul = makeList(makeSection(host, `Uses Clause (${uses.length})`));
    for (const u of uses) row(ul, `${tag('pas-tag-uses', 'uses')} <span class="pas-id">${esc(u)}</span>`);
  }

  if (types.length) {
    const ul = makeList(makeSection(host, `Types (${types.length})`));
    for (const t of types) {
      let html = `${tag('pas-tag-type', t.kind)} <span class="pas-id">${esc(t.name)}</span>`;
      if (t.kind === 'class' && t.parent) html += ` <span class="pas-type">(${esc(t.parent)})</span>`;
      if (t.target) html += ` = <span class="pas-type">${esc(t.target)}</span>`;
      if (t.fields && t.fields.length) {
        const label = t.kind === 'enum' ? t.fields.map((f) => esc(f.names)).join(', ') : fieldsHtml(t.fields);
        html += `<span class="pas-fields">${label}</span>`;
      }
      row(ul, html);
    }
  }

  if (routines.length) {
    const ul = makeList(makeSection(host, `Routines (${routines.length})`));
    for (const r of routines) {
      const ret = r.returns ? ` : <span class="pas-ret">${esc(r.returns)}</span>` : '';
      row(ul, `${tag(routineTagClass(r.kind), r.kind)} <span class="pas-id">${esc(r.name)}</span>(${paramsHtml(r.params)})${ret}`);
    }
  }

  if (consts.length) {
    const ul = makeList(makeSection(host, `Constants (${consts.length})`));
    for (const c of consts) {
      const type = c.type ? ` : <span class="pas-type">${esc(c.type)}</span>` : '';
      row(ul, `${tag('pas-tag-const', 'const')} <span class="pas-id">${esc(c.name)}</span>${type} = <span class="pas-val">${esc(c.value)}</span>`);
    }
  }

  if (vars.length) {
    const ul = makeList(makeSection(host, `Variables (${vars.length})`));
    for (const v of vars) {
      const val = v.value ? ` = <span class="pas-val">${esc(v.value)}</span>` : '';
      row(ul, `${tag('pas-tag-var', 'var')} <span class="pas-id">${esc(v.names)}</span> : <span class="pas-type">${esc(v.type)}</span>${val}`);
    }
  }

  return { parentNode: host };
}
