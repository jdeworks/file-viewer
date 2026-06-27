const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gp-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.gp-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e05300;color:#fff;vertical-align:middle;margin-right:8px;}
.gp-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.gp-name{font-family:ui-monospace,monospace;font-size:13px;color:#e05300;font-weight:700;}
.gp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.gp-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.gp-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.gp-card strong{display:block;font-size:1.2rem;font-weight:700;}
.gp-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.gp-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.gp-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.gp-list{margin:0;padding:0;list-style:none;}
.gp-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.gp-list li:last-child{border-bottom:none;}
.gp-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;background:#e0f2fe;color:#0369a1;}
.gp-tag-set{background:#e0f2fe;color:#0369a1;}
.gp-tag-var{background:#fef9c3;color:#854d0e;}
.gp-tag-func{background:#dbeafe;color:#1d4ed8;}
.gp-tag-plot{background:#dcfce7;color:#166534;}
.gp-tag-splot{background:#ede9fe;color:#7c3aed;}
.gp-tag-load{background:#ffe4e6;color:#9f1239;}
.gp-opt{font-weight:600;color:#0e7490;}
.gp-val{color:var(--fg,#24292f);}
.gp-mod{color:#7c3aed;font-style:italic;}
.gp-mut{color:var(--fg-2,#888);}
`;

// ── pure parser (DOM-free, exported for unit testing) ─────────────────────────

// Quote-aware: strip a `#` comment (outside single/double quotes) from one line.
function stripComment(line) {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === q) q = null; }
    else if (c === "'" || c === '"') q = c;
    else if (c === '#') return line.slice(0, i);
  }
  return line;
}

// Turn raw text into logical commands: join `\`-continuations, drop comments,
// then split each logical line on top-level `;` (outside quotes/brackets).
function commands(text) {
  const physical = String(text || '').split(/\r?\n/);
  const logical = [];
  let buf = '';
  for (const raw of physical) {
    const noComment = stripComment(raw);
    const trimmedEnd = noComment.replace(/\s+$/, '');
    if (trimmedEnd.endsWith('\\')) { buf += trimmedEnd.slice(0, -1) + ' '; continue; }
    logical.push(buf + noComment); buf = '';
  }
  if (buf.trim()) logical.push(buf);

  const out = [];
  for (const line of logical) {
    let q = null, depth = 0, cur = '';
    for (const c of line) {
      if (q) { cur += c; if (c === q) q = null; continue; }
      if (c === "'" || c === '"') { q = c; cur += c; continue; }
      if (c === '[' || c === '(') depth++;
      else if (c === ']' || c === ')') depth = Math.max(0, depth - 1);
      if (c === ';' && depth === 0) { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    if (cur.trim()) out.push(cur.trim());
  }
  return out;
}

const unquote = (s) => (s || '').trim().replace(/^['"]([\s\S]*)['"]$/, '$1');

// Split a plot/splot argument list on top-level commas (outside quotes/brackets).
function splitSpecs(s) {
  const out = []; let q = null, depth = 0, cur = '';
  for (const c of s) {
    if (q) { cur += c; if (c === q) q = null; continue; }
    if (c === "'" || c === '"') { q = c; cur += c; continue; }
    if (c === '[' || c === '(') depth++;
    else if (c === ']' || c === ')') depth = Math.max(0, depth - 1);
    if (c === ',' && depth === 0) { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const MOD_RE = /\b(using|with|title|notitle|every|index|smooth|axes|axis)\b/i;

function parseSpec(spec, kind) {
  const m = spec.match(MOD_RE);
  const target = unquote((m ? spec.slice(0, m.index) : spec).trim());
  const using = (spec.match(/\busing\s+(\S+)/i) || [])[1] || null;
  const wth = (spec.match(/\bwith\s+([\w]+)/i) || [])[1] || null;
  let title = null;
  if (/\bnotitle\b/i.test(spec)) title = '(notitle)';
  else { const t = spec.match(/\btitle\s+(['"])([\s\S]*?)\1/i); if (t) title = t[2]; }
  return { kind, target, using, with: wth, title };
}

export function analyzeGnuplot(text) {
  const sets = [], variables = [], functions = [], plots = [], loads = [];
  let terminal = null, output = null;

  for (const cmd of commands(text)) {
    let m;
    // function definition: f(x) = body  /  envelope(x, k) = body
    if ((m = cmd.match(/^([A-Za-z_]\w*)\s*\(([^)]*)\)\s*=(?!=)\s*(.+)$/))) {
      const params = m[2].split(',').map((p) => p.trim()).filter(Boolean);
      functions.push({ name: m[1], params, body: m[3].trim() });
      continue;
    }
    // variable definition: a = 5
    if ((m = cmd.match(/^([A-Za-z_]\w*)\s*=(?!=)\s*(.+)$/))) {
      variables.push({ name: m[1], value: m[2].trim() });
      continue;
    }
    // load / call <file>
    if ((m = cmd.match(/^(load|call)\b\s+(.+)$/i))) {
      loads.push({ cmd: m[1].toLowerCase(), file: unquote(m[2]) });
      continue;
    }
    // set <option> <value>
    if ((m = cmd.match(/^set\s+(\S+)\s*([\s\S]*)$/i))) {
      const option = m[1].toLowerCase();
      const value = m[2].trim();
      if (option === 'terminal' || option === 'term') terminal = value.split(/\s+/)[0] || value;
      if (option === 'output') output = unquote(value);
      sets.push({ option, value });
      continue;
    }
    // plot / splot
    if ((m = cmd.match(/^(splot|plot)\b\s*([\s\S]*)$/i))) {
      const kind = m[1].toLowerCase();
      for (const spec of splitSpecs(m[2])) plots.push(parseSpec(spec, kind));
      continue;
    }
  }
  return { sets, variables, functions, plots, loads, terminal, output };
}

// ── DOM rendering ─────────────────────────────────────────────────────────────

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'gp-section';
  const hd = document.createElement('div');
  hd.className = 'gp-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'gp-list'; sec.appendChild(ul); return ul; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function tag(cls, t) { return `<span class="gp-tag ${cls}">${esc(t)}</span>`; }

export function render(intake) {
  const text = intake.text || '';
  const { sets, variables, functions, plots, loads, terminal, output } = analyzeGnuplot(text);

  const host = document.createElement('div');
  host.className = 'gp-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'gp-title';
  const badge = document.createElement('span');
  badge.className = 'gp-badge';
  badge.textContent = 'gnuplot';
  title.appendChild(badge);
  if (output) { const n = document.createElement('span'); n.className = 'gp-name'; n.textContent = output; title.appendChild(n); }
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'gp-sub';
  sub.textContent = [
    terminal && `terminal: ${terminal}`,
    plots.length && `${plots.length} plot target${plots.length !== 1 ? 's' : ''}`,
    functions.length && `${functions.length} function${functions.length !== 1 ? 's' : ''}`,
    sets.length && `${sets.length} set option${sets.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'gp-cards';
  for (const { value, label } of [
    { value: plots.length, label: 'Plots' },
    { value: functions.length, label: 'Functions' },
    { value: variables.length, label: 'Variables' },
    { value: sets.length, label: 'Set opts' },
    { value: loads.length, label: 'Includes' },
  ]) {
    const card = document.createElement('div');
    card.className = 'gp-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (plots.length) {
    const ul = makeList(makeSection(host, `Plot Commands (${plots.length})`));
    for (const p of plots) {
      const mods = [
        p.using && `<span class="gp-mod">using ${esc(p.using)}</span>`,
        p.with && `<span class="gp-mod">with ${esc(p.with)}</span>`,
        p.title && `<span class="gp-mut">title ${esc(p.title)}</span>`,
      ].filter(Boolean).join(' ');
      row(ul, `${tag(p.kind === 'splot' ? 'gp-tag-splot' : 'gp-tag-plot', p.kind)} <span class="gp-name">${esc(p.target)}</span> ${mods}`);
    }
  }
  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const f of functions) {
      row(ul, `${tag('gp-tag-func', 'func')} <span class="gp-name">${esc(f.name)}</span>(<span class="gp-opt">${esc(f.params.join(', '))}</span>) = <span class="gp-val">${esc(f.body)}</span>`);
    }
  }
  if (variables.length) {
    const ul = makeList(makeSection(host, `Variables (${variables.length})`));
    for (const v of variables) row(ul, `${tag('gp-tag-var', 'var')} <span class="gp-name">${esc(v.name)}</span> = <span class="gp-val">${esc(v.value)}</span>`);
  }
  if (loads.length) {
    const ul = makeList(makeSection(host, `Includes (${loads.length})`));
    for (const l of loads) row(ul, `${tag('gp-tag-load', l.cmd)} <span class="gp-val">${esc(l.file)}</span>`);
  }
  if (sets.length) {
    const ul = makeList(makeSection(host, `Set Options (${sets.length})`));
    for (const s of sets) row(ul, `${tag('gp-tag-set', 'set')} <span class="gp-opt">${esc(s.option)}</span> ${s.value ? `<span class="gp-val">${esc(s.value)}</span>` : ''}`);
  }

  return { parentNode: host };
}
