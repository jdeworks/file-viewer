const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ada-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ada-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00558b;color:#fff;vertical-align:middle;margin-right:8px;}
.ada-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ada-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ada-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.ada-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.ada-card strong{display:block;font-size:1.2rem;font-weight:700;}
.ada-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.ada-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.ada-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.ada-list{margin:0;padding:0;list-style:none;}
.ada-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.ada-list li:last-child{border-bottom:none;}
.ada-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e0f2fe;color:#0369a1;font-weight:700;}
.ada-tag-with{background:#dcfce7;color:#166534;}
.ada-tag-proc{background:#ede9fe;color:#7c3aed;}
.ada-tag-func{background:#dbeafe;color:#1d4ed8;}
.ada-tag-type{background:#fef9c3;color:#854d0e;}
.ada-tag-pragma{background:#ffe4e6;color:#9f1239;}
.ada-tag-generic{background:#dcfce7;color:#15803d;}
.ada-name{font-weight:600;}
.ada-type{color:#0e7490;}
.ada-mode{color:#9f1239;font-style:italic;}
.ada-ret{color:#1d4ed8;}
.ada-pkg{font-family:ui-monospace,monospace;font-size:13px;color:#00558b;font-weight:700;}
`;

// Split Ada source into top-level statements (paren-aware, comments stripped). Multi-line subprogram
// declarations (params spread over lines) collapse into one statement.
function statements(text) {
  const src = String(text || '').replace(/--[^\n]*/g, ' ');
  const out = [];
  let buf = '', depth = 0;
  for (const ch of src) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ';' && depth === 0) { out.push(buf); buf = ''; } else buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

// Ada parameter groups: "Name[, Name] : [mode] Type [:= default]" separated by ';'.
function adaParams(sig) {
  const m = sig.match(/\(([\s\S]*)\)/);
  if (!m) return [];
  return m[1].split(';').map((g) => g.trim()).filter(Boolean).map((g) => {
    const mm = g.match(/^([\w\s,]+?)\s*:\s*((?:in\s+out|in|out|access|aliased)\s+)?([\w.]+)/i);
    return mm ? { names: mm[1].replace(/\s+/g, ' ').trim(), mode: (mm[2] || '').trim(), type: mm[3] }
              : { names: g, mode: '', type: '' };
  });
}

// Parse into structured facts. Exported (pure, no DOM) for unit testing.
export function analyzeAda(text) {
  let unitName = null;
  const withs = [], procedures = [], functions = [], types = [], pragmas = [];
  let pendingGeneric = false, genericCount = 0;

  for (let st of statements(text)) {
    // `package X is` / `private` / `begin` have no own ';', so they prefix the next decl in one
    // statement — strip the framing and reprocess the remainder (e.g. the first pragma after `is`).
    const pkg = st.match(/^package\s+(?:body\s+)?([\w.]+)\s+is\b\s*(.*)$/i);
    if (pkg) { if (!unitName) unitName = pkg[1]; st = pkg[2].trim(); }
    st = st.replace(/^(?:private|begin)\b\s*/i, '').trim();
    if (!st) continue;

    if (/^generic\b/i.test(st)) { pendingGeneric = true; genericCount++; continue; }
    let m;
    if ((m = st.match(/^with\s+([\w.]+)/i))) { withs.push(m[1]); continue; }

    const sig = st.split(/\bis\b/i)[0].trim();   // signature = decl up to `is` (bodies) or whole (specs)
    if ((m = sig.match(/^procedure\s+("?[\w.]+"?)/i))) {
      procedures.push({ name: m[1], params: adaParams(sig), generic: pendingGeneric });
      pendingGeneric = false; continue;
    }
    if ((m = sig.match(/^function\s+("?[\w.]+"?)/i))) {
      const ret = (sig.match(/\)\s*return\s+([\w.]+)/i) || sig.match(/\breturn\s+([\w.]+)/i) || [])[1] || '';
      functions.push({ name: m[1], params: adaParams(sig), returns: ret, generic: pendingGeneric });
      pendingGeneric = false; continue;
    }
    if ((m = st.match(/^type\s+(\w+)/i))) {
      let kind = 'type';
      if (/\bis\s+record\b/i.test(st)) kind = 'record';
      else if (/\bis\s+new\b/i.test(st)) kind = 'derived';
      else if (/\bis\s+access\b/i.test(st)) kind = 'access';
      else if (/\bis\s+array\b/i.test(st)) kind = 'array';
      else if (/\bis\s+range\b/i.test(st)) kind = 'range';
      else if (/\bis\s*\(/.test(st)) kind = 'enum';
      else if (/\bis\s+private\b/i.test(st)) kind = 'private';
      types.push({ name: m[1], kind });
      continue;
    }
    if ((m = st.match(/^pragma\s+(\w+)/i))) { pragmas.push(m[1]); continue; }
  }
  return { unitName, withs, procedures, functions, types, pragmas, genericCount };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'ada-section';
  const hd = document.createElement('div');
  hd.className = 'ada-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'ada-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="ada-tag ${cls}">${esc(t)}</span>`; }
function paramsHtml(params) {
  return params.map((p) => {
    const mode = p.mode ? `<span class="ada-mode">${esc(p.mode)}</span> ` : '';
    return `${esc(p.names)} : ${mode}<span class="ada-type">${esc(p.type)}</span>`;
  }).join('; ');
}
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }

export async function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').toLowerCase();
  const isSpec = !filename.endsWith('.adb');

  const preview = text.slice(0, 3000);
  if (!/package\s/i.test(preview) && !/procedure\s/i.test(preview) && !/function\s/i.test(preview)) return null;

  const { unitName, withs, procedures, functions, types, pragmas, genericCount } = analyzeAda(text);

  const host = document.createElement('div');
  host.className = 'ada-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'ada-title';
  const badge = document.createElement('span');
  badge.className = 'ada-badge';
  badge.textContent = isSpec ? 'Ada Spec' : 'Ada Body';
  title.appendChild(badge);
  if (unitName) { const n = document.createElement('span'); n.className = 'ada-pkg'; n.textContent = unitName; title.appendChild(n); }
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'ada-sub';
  sub.textContent = [
    withs.length && `${withs.length} with`,
    procedures.length && `${procedures.length} procedure${procedures.length !== 1 ? 's' : ''}`,
    functions.length && `${functions.length} function${functions.length !== 1 ? 's' : ''}`,
    types.length && `${types.length} type${types.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'ada-cards';
  for (const { value, label } of [
    { value: withs.length, label: 'With' },
    { value: procedures.length, label: 'Procedures' },
    { value: functions.length, label: 'Functions' },
    { value: types.length, label: 'Types' },
    { value: pragmas.length, label: 'Pragmas' },
  ]) {
    const card = document.createElement('div');
    card.className = 'ada-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (withs.length) {
    const ul = makeList(makeSection(host, `With Clauses (${withs.length})`));
    for (const w of withs) row(ul, `${tag('ada-tag-with', 'with')} ${esc(w)}`);
  }
  if (types.length) {
    const ul = makeList(makeSection(host, `Types (${types.length})`));
    for (const { name, kind } of types) row(ul, `${tag('ada-tag-type', kind)} <span class="ada-name">${esc(name)}</span>`);
  }
  if (procedures.length) {
    const ul = makeList(makeSection(host, `Procedures (${procedures.length})`));
    for (const p of procedures) {
      row(ul, (p.generic ? tag('ada-tag-generic', 'generic') + ' ' : '') + tag('ada-tag-proc', 'procedure')
        + ` <span class="ada-name">${esc(p.name)}</span>(${paramsHtml(p.params)})`);
    }
  }
  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const f of functions) {
      const ret = f.returns ? ` return <span class="ada-ret">${esc(f.returns)}</span>` : '';
      row(ul, (f.generic ? tag('ada-tag-generic', 'generic') + ' ' : '') + tag('ada-tag-func', 'function')
        + ` <span class="ada-name">${esc(f.name)}</span>(${paramsHtml(f.params)})${ret}`);
    }
  }
  if (pragmas.length) {
    const ul = makeList(makeSection(host, `Pragmas (${pragmas.length})`));
    for (const name of pragmas) row(ul, `${tag('ada-tag-pragma', 'pragma')} ${esc(name)}`);
  }

  return { parentNode: host };
}
