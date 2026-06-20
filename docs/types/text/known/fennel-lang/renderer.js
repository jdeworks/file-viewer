const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fnl-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.fnl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2d6a4f;color:#d8f3dc;vertical-align:middle;margin-right:8px;}
.fnl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.fnl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.fnl-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.fnl-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.fnl-card strong{display:block;font-size:1.2rem;font-weight:700;}
.fnl-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.fnl-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.fnl-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.fnl-list{margin:0;padding:0;list-style:none;}
.fnl-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.fnl-list li:last-child{border-bottom:none;}
.fnl-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#d8f3dc;color:#2d6a4f;font-weight:700;}
.fnl-tag-fn{background:#e0f2fe;color:#0369a1;}
.fnl-tag-lambda{background:#ede9fe;color:#7f52ff;}
.fnl-tag-macro{background:#fef3c7;color:#92400e;}
.fnl-tag-var{background:#fce7f3;color:#9d174d;}
.fnl-tag-req{background:#f0fdf4;color:#15803d;}
`;

function analyzeFennel(text) {
  const lines = text.split(/\r?\n/);
  const requires = [];
  const fns = [];
  const locals = [];
  const vars = [];
  const macros = [];
  const importMacros = [];
  let eachCount = 0;
  let forCount = 0;
  let whileCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(';')) continue;

    // (require module)
    const reqM = trimmed.match(/^\(require\s+([\w./-]+)/);
    if (reqM) { requires.push(reqM[1]); }

    // (local name (require module)) - require as local binding
    const localReqM = trimmed.match(/^\(local\s+(\w+)\s+\(require\s+([\w./-]+)\)/);
    if (localReqM && !requires.includes(localReqM[2])) {
      requires.push(localReqM[2]);
    }

    // (import-macros {name :module})
    const importMacrosM = trimmed.match(/^\(import-macros\s+\{[^}]*\}\s+([\w./-]+)/);
    if (importMacrosM) { importMacros.push(importMacrosM[1]); }

    // (fn name [args] body)
    const fnM = trimmed.match(/^\(fn\s+([\w?!-]+)/);
    if (fnM) { fns.push({ name: fnM[1], kind: 'fn' }); continue; }

    // (lambda name or (λ name
    const lambdaM = trimmed.match(/^\((?:lambda|λ)\s+([\w?!-]+)/);
    if (lambdaM) { fns.push({ name: lambdaM[1], kind: 'lambda' }); continue; }

    // (macro name
    const macroM = trimmed.match(/^\(macro\s+([\w?!-]+)/);
    if (macroM) { macros.push(macroM[1]); continue; }

    // (local name value) — skip if it was a require binding
    const localM = trimmed.match(/^\(local\s+([\w?!-]+)/);
    if (localM && !localReqM) { locals.push(localM[1]); }

    // (var name value)
    const varM = trimmed.match(/^\(var\s+([\w?!-]+)/);
    if (varM) { vars.push(varM[1]); }

    // loop counts
    if (/^\(each\s/.test(trimmed)) eachCount++;
    if (/^\(for\s/.test(trimmed)) forCount++;
    if (/^\(while\s/.test(trimmed)) whileCount++;
  }

  return { requires, fns, locals, vars, macros, importMacros, eachCount, forCount, whileCount };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'fnl-section';
  const hd = document.createElement('div');
  hd.className = 'fnl-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'fnl-list';
  sec.appendChild(ul);
  return ul;
}

function makeTag(cls, text) {
  const tag = document.createElement('span');
  tag.className = `fnl-tag ${cls}`;
  tag.textContent = text;
  return tag;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const { requires, fns, locals, vars, macros, importMacros, eachCount, forCount, whileCount } = analyzeFennel(text);

  const host = document.createElement('div');
  host.className = 'fnl-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'fnl-title';
  title.innerHTML = '<span class="fnl-badge">Fennel Script</span>';
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'fnl-sub';
  const parts = [
    `${requires.length} require${requires.length !== 1 ? 's' : ''}`,
    `${fns.length} function${fns.length !== 1 ? 's' : ''}`,
    `${locals.length} local${locals.length !== 1 ? 's' : ''}`,
  ];
  if (macros.length) parts.push(`${macros.length} macro${macros.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'fnl-cards';
  const cardItems = [
    { value: requires.length, label: 'Requires' },
    { value: fns.length, label: 'Functions' },
    { value: locals.length, label: 'Locals' },
    { value: macros.length, label: 'Macros' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'fnl-card';
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
  if (requires.length > 0) {
    const sec = makeSection(host, `Requires (${requires.length})`);
    const ul = makeList(sec);
    for (const name of requires) {
      const li = document.createElement('li');
      li.appendChild(makeTag('fnl-tag-req', 'require'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // import-macros
  if (importMacros.length > 0) {
    const sec = makeSection(host, `Macro Imports (${importMacros.length})`);
    const ul = makeList(sec);
    for (const name of importMacros) {
      const li = document.createElement('li');
      li.appendChild(makeTag('fnl-tag-macro', 'import-macros'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Functions
  if (fns.length > 0) {
    const sec = makeSection(host, `Functions (${fns.length})`);
    const ul = makeList(sec);
    for (const { name, kind } of fns) {
      const li = document.createElement('li');
      const tagCls = kind === 'lambda' ? 'fnl-tag-lambda' : 'fnl-tag-fn';
      li.appendChild(makeTag(tagCls, kind === 'lambda' ? 'λ' : 'fn'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Locals
  if (locals.length > 0) {
    const MAX = 15;
    const sec = makeSection(host, `Local Bindings (${locals.length})`);
    const ul = makeList(sec);
    for (const name of locals.slice(0, MAX)) {
      const li = document.createElement('li');
      li.appendChild(makeTag('fnl-tag', 'local'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
    if (locals.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${locals.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Vars
  if (vars.length > 0) {
    const sec = makeSection(host, `Var Declarations (${vars.length})`);
    const ul = makeList(sec);
    for (const name of vars) {
      const li = document.createElement('li');
      li.appendChild(makeTag('fnl-tag-var', 'var'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Macros
  if (macros.length > 0) {
    const sec = makeSection(host, `Macros (${macros.length})`);
    const ul = makeList(sec);
    for (const name of macros) {
      const li = document.createElement('li');
      li.appendChild(makeTag('fnl-tag-macro', 'macro'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Loop stats
  const loopTotal = eachCount + forCount + whileCount;
  if (loopTotal > 0) {
    const sec = makeSection(host, 'Loop Constructs');
    const ul = makeList(sec);
    if (eachCount > 0) {
      const li = document.createElement('li');
      li.appendChild(makeTag('fnl-tag', 'each'));
      li.appendChild(document.createTextNode(` ×${eachCount}`));
      ul.appendChild(li);
    }
    if (forCount > 0) {
      const li = document.createElement('li');
      li.appendChild(makeTag('fnl-tag', 'for'));
      li.appendChild(document.createTextNode(` ×${forCount}`));
      ul.appendChild(li);
    }
    if (whileCount > 0) {
      const li = document.createElement('li');
      li.appendChild(makeTag('fnl-tag', 'while'));
      li.appendChild(document.createTextNode(` ×${whileCount}`));
      ul.appendChild(li);
    }
  }

  return { parentNode: host };
}
