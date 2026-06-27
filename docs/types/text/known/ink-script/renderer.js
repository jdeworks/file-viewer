const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ink-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ink-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a1a2e;color:#e0b0ff;vertical-align:middle;margin-right:8px;}
.ink-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ink-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ink-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.ink-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.ink-card strong{display:block;font-size:1.2rem;font-weight:700;}
.ink-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.ink-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.ink-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.ink-list{margin:0;padding:0;list-style:none;}
.ink-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.ink-list li:last-child{border-bottom:none;}
.ink-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e0e7ff;color:#3730a3;font-weight:700;}
.ink-tag-var{background:#fce7f3;color:#9d174d;}
.ink-tag-const{background:#fef9c3;color:#854d0e;}
.ink-tag-list{background:#e0f2fe;color:#0369a1;}
.ink-tag-stitch{background:#dcfce7;color:#166534;}
.ink-tag-fn{background:#fef3c7;color:#92400e;}
.ink-tag-inc{background:#f0fdf4;color:#15803d;}
.ink-tag-ext{background:#ffe4e6;color:#9f1239;}
.ink-name{font-weight:600;}
.ink-val{color:#0e7490;}
.ink-param{color:#9f1239;font-style:italic;}
.ink-stitch-sub{color:var(--fg-2,#888);font-size:11px;margin-left:6px;}
.ink-muted{color:var(--fg-2,#888);}
`;

// Strip Ink comments: /* block */ (replaced by newlines to keep line numbers) and // line comments.
function stripComments(text) {
  let src = String(text || '').replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  return src.split(/\r?\n/).map((l) => l.replace(/\/\/.*$/, '')).join('\n');
}

// Parse a knot/function header body (already stripped of surrounding `=`).
// Returns { isFunction, name, params } or null.
function parseHeader(body) {
  const fn = body.match(/^function\s+(\w+)\s*(?:\(([^)]*)\))?\s*$/i);
  if (fn) return { isFunction: true, name: fn[1], params: splitParams(fn[2]) };
  const kn = body.match(/^([\w.]+)\s*(?:\(([^)]*)\))?\s*$/);
  if (kn) return { isFunction: false, name: kn[1], params: splitParams(kn[2]) };
  return null;
}

function splitParams(raw) {
  if (!raw) return [];
  return raw.split(',').map((p) => p.trim()).filter(Boolean);
}

// Parse Ink source into structured facts. Exported, pure, DOM-free, for unit testing.
export function analyzeInk(text) {
  const lines = stripComments(text).split(/\r?\n/);

  const knots = [];        // [{ name, params, stitches:[...] }]
  const functions = [];    // [{ name, params:[...] }]
  const variables = [];    // [{ kind:'VAR'|'CONST', name, value }]
  const lists = [];        // [{ name, values:[...] }]
  const includes = [];
  const externals = [];    // [{ name, params:[...] }]
  const divertTargets = []; // ordered, with dups (callers can dedupe)
  let choiceCount = 0, stickyChoiceCount = 0, gatherCount = 0, tempCount = 0;

  let currentKnot = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // INCLUDE file.ink
    let m;
    if ((m = trimmed.match(/^INCLUDE\s+(.+)$/))) { includes.push(m[1].trim()); continue; }

    // EXTERNAL fn(args)
    if ((m = trimmed.match(/^EXTERNAL\s+(\w+)\s*\(([^)]*)\)/))) {
      externals.push({ name: m[1], params: splitParams(m[2]) });
      continue;
    }

    // CONST / VAR name = value
    if ((m = trimmed.match(/^(VAR|CONST)\s+(\w+)\s*=\s*(.+)$/))) {
      variables.push({ kind: m[1], name: m[2], value: m[3].trim() });
      continue;
    }

    // LIST name = a, b, (c)
    if ((m = trimmed.match(/^LIST\s+(\w+)\s*=\s*(.+)$/))) {
      lists.push({ name: m[1], values: splitParams(m[2].replace(/[()]/g, '')) });
      continue;
    }

    // Knot / function header: two or more `=`, optional trailing `=`.
    if (/^={2,}/.test(trimmed)) {
      const body = trimmed.replace(/^=+\s*/, '').replace(/\s*=+\s*$/, '').trim();
      const hdr = parseHeader(body);
      if (hdr) {
        if (hdr.isFunction) {
          functions.push({ name: hdr.name, params: hdr.params });
          currentKnot = null; // function bodies don't host stitches we track
        } else {
          currentKnot = { name: hdr.name, params: hdr.params, stitches: [] };
          knots.push(currentKnot);
        }
        continue;
      }
    }

    // Stitch: single leading `=` (not `==`), then a name.
    if ((m = trimmed.match(/^=(?!=)\s*(\w+)/))) {
      const stitch = m[1];
      if (currentKnot) currentKnot.stitches.push(stitch);
      else { currentKnot = { name: '(top-level)', params: [], stitches: [stitch] }; knots.push(currentKnot); }
      continue;
    }

    // Choices: leading * (once-only) or + (sticky); gathers use -.
    if (/^\*+\s*\S/.test(trimmed)) { choiceCount++; }
    else if (/^\++\s*\S/.test(trimmed)) { choiceCount++; stickyChoiceCount++; }
    else if (/^-(?!>)\s*\S/.test(trimmed) && !/^-\s*else\b/i.test(trimmed)) { gatherCount++; }

    // Temp vars: ~ temp name
    if (/^~\s*temp\s+\w+/.test(trimmed)) tempCount++;

    // Diverts: -> target  (target may be knot.stitch; skip the empty tunnel-return `->`)
    const divRe = /->\s*([A-Za-z_][\w.]*)/g;
    let dm;
    while ((dm = divRe.exec(trimmed))) divertTargets.push(dm[1]);
  }

  const divertCount = divertTargets.length;
  const stitchCount = knots.reduce((n, k) => n + k.stitches.length, 0);

  return {
    knots, functions, variables, lists, includes, externals,
    divertTargets, choiceCount, stickyChoiceCount, gatherCount,
    tempCount, divertCount, stitchCount,
  };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'ink-section';
  const hd = document.createElement('div');
  hd.className = 'ink-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'ink-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="ink-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function paramsHtml(params) {
  if (!params || !params.length) return '';
  return `(<span class="ink-param">${params.map(esc).join(', ')}</span>)`;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const facts = analyzeInk(text);
  const {
    knots, functions, variables, lists, includes, externals,
    divertTargets, choiceCount, gatherCount, tempCount, divertCount, stitchCount,
  } = facts;

  const host = document.createElement('div');
  host.className = 'ink-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'ink-title';
  title.innerHTML = '<span class="ink-badge">Ink Story</span>';
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'ink-sub';
  sub.textContent = [
    knots.length && `${knots.length} knot${knots.length !== 1 ? 's' : ''}`,
    stitchCount && `${stitchCount} stitch${stitchCount !== 1 ? 'es' : ''}`,
    choiceCount && `${choiceCount} choice${choiceCount !== 1 ? 's' : ''}`,
    divertCount && `${divertCount} divert${divertCount !== 1 ? 's' : ''}`,
    variables.length && `${variables.length} variable${variables.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'ink-cards';
  for (const { value, label } of [
    { value: knots.length, label: 'Knots' },
    { value: stitchCount, label: 'Stitches' },
    { value: functions.length, label: 'Functions' },
    { value: choiceCount, label: 'Choices' },
    { value: divertCount, label: 'Diverts' },
  ]) {
    const card = document.createElement('div');
    card.className = 'ink-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  // Includes
  if (includes.length) {
    const ul = makeList(makeSection(host, `Includes (${includes.length})`));
    for (const f of includes) row(ul, `${tag('ink-tag-inc', 'INCLUDE')} <span class="ink-name">${esc(f)}</span>`);
  }

  // Variables (VAR / CONST)
  if (variables.length) {
    const ul = makeList(makeSection(host, `Variables (${variables.length})`));
    for (const { kind, name, value } of variables) {
      const cls = kind === 'CONST' ? 'ink-tag-const' : 'ink-tag-var';
      row(ul, `${tag(cls, kind)} <span class="ink-name">${esc(name)}</span> = <span class="ink-val">${esc(value)}</span>`);
    }
  }

  // Lists
  if (lists.length) {
    const ul = makeList(makeSection(host, `Lists (${lists.length})`));
    for (const { name, values } of lists) {
      row(ul, `${tag('ink-tag-list', 'LIST')} <span class="ink-name">${esc(name)}</span> = <span class="ink-val">${esc(values.join(', '))}</span>`);
    }
  }

  // Knots (with their stitches)
  if (knots.length) {
    const MAX = 40;
    const ul = makeList(makeSection(host, `Knots (${knots.length})`));
    for (const k of knots.slice(0, MAX)) {
      const stitchInfo = k.stitches.length
        ? `<span class="ink-stitch-sub">${esc(k.stitches.map((s) => '= ' + s).join('  '))}</span>` : '';
      row(ul, `${tag('ink-tag', '==')} <span class="ink-name">${esc(k.name)}</span>${paramsHtml(k.params)}${stitchInfo}`);
    }
    if (knots.length > MAX) row(ul, `<span class="ink-muted">… and ${knots.length - MAX} more</span>`);
  }

  // Functions (with params)
  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const f of functions) {
      row(ul, `${tag('ink-tag-fn', 'function')} <span class="ink-name">${esc(f.name)}</span>${paramsHtml(f.params)}`);
    }
  }

  // External functions
  if (externals.length) {
    const ul = makeList(makeSection(host, `External Functions (${externals.length})`));
    for (const e of externals) {
      row(ul, `${tag('ink-tag-ext', 'EXTERNAL')} <span class="ink-name">${esc(e.name)}</span>${paramsHtml(e.params)}`);
    }
  }

  // Divert targets (unique)
  const uniqueTargets = [...new Set(divertTargets)];
  if (uniqueTargets.length) {
    const MAX = 40;
    const ul = makeList(makeSection(host, `Divert Targets (${uniqueTargets.length})`));
    for (const t of uniqueTargets.slice(0, MAX)) {
      row(ul, `<span class="ink-muted">-&gt;</span> <span class="ink-name">${esc(t)}</span>`);
    }
    if (uniqueTargets.length > MAX) row(ul, `<span class="ink-muted">… and ${uniqueTargets.length - MAX} more</span>`);
  }

  // Statistics
  const stats = [
    { label: 'Choices (* / +)', value: choiceCount },
    { label: 'Gathers (-)', value: gatherCount },
    { label: 'Diverts (->)', value: divertCount },
    { label: 'Temp vars (~ temp)', value: tempCount },
  ].filter((s) => s.value > 0);
  if (stats.length) {
    const ul = makeList(makeSection(host, 'Story Statistics'));
    for (const { label, value } of stats) row(ul, `${esc(label)}: <strong>${value}</strong>`);
  }

  return { parentNode: host };
}
