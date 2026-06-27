const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cue-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.cue-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#059669;color:#fff;vertical-align:middle;margin-right:8px;}
.cue-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cue-pkg{font-family:ui-monospace,monospace;font-size:13px;color:#059669;font-weight:700;}
.cue-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.cue-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.cue-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.cue-card strong{display:block;font-size:1.2rem;font-weight:700;}
.cue-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.cue-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.cue-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.cue-list{margin:0;padding:0;list-style:none;}
.cue-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.cue-list li:last-child{border-bottom:none;}
.cue-def-block{padding:8px 14px;border-bottom:1px solid var(--border,#eaecf0);}
.cue-def-block:last-child{border-bottom:none;}
.cue-def-head{font-family:ui-monospace,monospace;font-size:12px;margin-bottom:4px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.cue-def-count{color:var(--fg-2,#888);font-size:11px;}
.cue-def-fields{margin:0;padding:0 0 0 14px;list-style:none;}
.cue-def-fields li{font-family:ui-monospace,monospace;font-size:12px;padding:2px 0;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.cue-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e0f2fe;color:#0369a1;font-weight:700;}
.cue-tag-def{background:#f3e8ff;color:#7c3aed;}
.cue-tag-opt{background:#fef3c7;color:#92400e;}
.cue-tag-alias{background:#dcfce7;color:#15803d;}
.cue-name{font-weight:600;}
.cue-def{color:#9333ea;font-weight:600;}
.cue-type{color:#0e7490;}
`;

// ── pure parser (DOM-free, exported for unit testing) ─────────────────────────

// Strip a trailing `//` line comment, respecting double-quoted strings.
function stripComment(line) {
  let inStr = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '\\') { i++; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (!inStr && c === '/' && line[i + 1] === '/') return line.slice(0, i);
  }
  return line;
}

// Normalise a field's right-hand side into a readable type/constraint, dropping a
// trailing struct opener and dangling connective so `#Config & {` → `#Config`.
function cleanType(rhs) {
  return rhs
    .replace(/\{\s*$/, '')        // trailing struct opener
    .replace(/[&|]\s*$/, '')      // dangling conjunction/disjunction
    .trim();
}

// Returns structured facts: { package, imports, definitions:[{name,fields:[{name,type,optional}]}],
// fields:[{name,type}], aliases:[string] }. Brace depth associates fields with their definition.
export function analyzeCue(text) {
  const lines = String(text || '').split(/\r?\n/);
  let pkg = null;
  const imports = [];
  const definitions = [];
  const fields = [];
  const aliases = [];

  let inImport = false;
  // Frame stack: one entry per open `{`. `.def` = the definition object when the
  // brace opened a definition body, else null. Innermost non-null def owns fields.
  const frames = [];
  const currentDef = () => (frames.length ? frames[frames.length - 1].def : null);
  const atTop = () => frames.length === 0;

  const declRe = /^(#?[A-Za-z_]\w*)(\?)?\s*:\s*(.*)$/;

  for (const raw of lines) {
    const line = stripComment(raw);
    const trimmed = line.trim();
    if (!trimmed) continue;

    // ── imports ──
    if (inImport) {
      if (trimmed === ')') { inImport = false; continue; }
      const m = trimmed.match(/^(?:[\w.]+\s+)?"([^"]+)"/);
      if (m) imports.push(m[1]);
      continue;
    }
    if (/^import\s*\(/.test(trimmed)) { inImport = true; continue; }
    let m;
    if ((m = trimmed.match(/^import\s+(?:[\w.]+\s+)?"([^"]+)"/))) { imports.push(m[1]); continue; }

    // ── package ──
    if ((m = trimmed.match(/^package\s+(\w+)/))) { if (!pkg) pkg = m[1]; continue; }

    // ── aliases (let bindings) ──
    if ((m = trimmed.match(/^let\s+([A-Za-z_]\w*)\s*=/))) { aliases.push(m[1]); }

    // ── declarations (definitions / fields) ──
    let lineDef = null;       // a def opened on THIS line claims its first `{`
    const decl = trimmed.match(declRe);
    if (decl && !trimmed.startsWith('[')) {
      const name = decl[1];
      const optional = decl[2] === '?';
      const type = cleanType(decl[3] || '');

      if (name.startsWith('#')) {
        const def = { name, fields: [], optional };
        definitions.push(def);
        lineDef = def;        // its body opener (this or a following `{`) is its own
      } else {
        const owner = currentDef();
        if (owner) owner.fields.push({ name, type, optional });
        else if (atTop()) fields.push({ name, type });
        // else: nested field inside a concrete struct — not surfaced.
      }
    } else if ((m = trimmed.match(/^([A-Za-z_]\w*)\s*=(?!=)/))) {
      // value / field alias: `X=expr`
      if (!aliases.includes(m[1])) aliases.push(m[1]);
    }

    // ── brace scan: maintain frame stack (respect strings) ──
    let inStr = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '\\') { i++; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === '{') { frames.push({ def: lineDef }); lineDef = null; }
      else if (c === '}') { frames.pop(); }
    }
  }

  return { package: pkg, imports, definitions, fields, aliases };
}

// ── render ────────────────────────────────────────────────────────────────────

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'cue-section';
  const hd = document.createElement('div');
  hd.className = 'cue-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'cue-list'; sec.appendChild(ul); return ul; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function tag(cls, t) { return `<span class="cue-tag ${cls}">${esc(t)}</span>`; }
function fieldHtml({ name, type, optional }) {
  const nm = `<span class="cue-name">${esc(name)}</span>` + (optional ? tag('cue-tag-opt', '?') : '');
  const t = type ? ` : <span class="cue-type">${esc(type)}</span>` : '';
  return nm + t;
}

export function render(intake) {
  const text = intake.text || '';
  const { package: pkg, imports, definitions, fields, aliases } = analyzeCue(text);

  const host = document.createElement('div');
  host.className = 'cue-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'cue-title';
  const badge = document.createElement('span');
  badge.className = 'cue-badge';
  badge.textContent = 'CUE';
  title.appendChild(badge);
  if (pkg) { const n = document.createElement('span'); n.className = 'cue-pkg'; n.textContent = pkg; title.appendChild(n); }
  host.appendChild(title);

  const defFieldCount = definitions.reduce((a, d) => a + d.fields.length, 0);
  const sub = document.createElement('div');
  sub.className = 'cue-sub';
  sub.textContent = [
    pkg && `package ${pkg}`,
    imports.length && `${imports.length} import${imports.length !== 1 ? 's' : ''}`,
    definitions.length && `${definitions.length} definition${definitions.length !== 1 ? 's' : ''}`,
    fields.length && `${fields.length} field${fields.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'cue-cards';
  for (const { value, label } of [
    { value: imports.length, label: 'Imports' },
    { value: definitions.length, label: 'Definitions' },
    { value: defFieldCount, label: 'Schema fields' },
    { value: fields.length, label: 'Fields' },
    { value: aliases.length, label: 'Aliases' },
  ]) {
    const card = document.createElement('div');
    card.className = 'cue-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (imports.length) {
    const ul = makeList(makeSection(host, `Imports (${imports.length})`));
    for (const imp of imports) row(ul, `${tag('', 'import')} ${esc(imp)}`);
  }

  if (definitions.length) {
    const sec = makeSection(host, `Definitions (${definitions.length})`);
    for (const def of definitions) {
      const block = document.createElement('div');
      block.className = 'cue-def-block';
      const head = document.createElement('div');
      head.className = 'cue-def-head';
      head.innerHTML = `${tag('cue-tag-def', 'def')} <span class="cue-def">${esc(def.name)}</span>`
        + (def.optional ? ` ${tag('cue-tag-opt', 'optional')}` : '')
        + ` <span class="cue-def-count">${def.fields.length} field${def.fields.length !== 1 ? 's' : ''}</span>`;
      block.appendChild(head);
      if (def.fields.length) {
        const fl = document.createElement('ul');
        fl.className = 'cue-def-fields';
        for (const f of def.fields) row(fl, fieldHtml(f));
        block.appendChild(fl);
      }
      sec.appendChild(block);
    }
  }

  if (fields.length) {
    const ul = makeList(makeSection(host, `Concrete Fields (${fields.length})`));
    for (const f of fields) row(ul, fieldHtml(f));
  }

  if (aliases.length) {
    const ul = makeList(makeSection(host, `Aliases (${aliases.length})`));
    for (const a of aliases) row(ul, `${tag('cue-tag-alias', 'alias')} <span class="cue-name">${esc(a)}</span>`);
  }

  return { parentNode: host };
}
