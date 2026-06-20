const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wren-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.wren-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#403075;color:#fff;vertical-align:middle;margin-right:8px;}
.wren-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.wren-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.wren-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.wren-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:100px;}
.wren-card strong{display:block;font-size:1.2rem;font-weight:700;}
.wren-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.wren-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.wren-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.wren-list{margin:0;padding:0;list-style:none;}
.wren-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.wren-list li:last-child{border-bottom:none;}
.wren-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#ede9fe;color:#403075;font-weight:700;}
.wren-tag-construct{background:#fce7f3;color:#9d174d;}
.wren-tag-static{background:#d1fae5;color:#065f46;}
.wren-tag-foreign{background:#fef3c7;color:#92400e;}
.wren-tag-class{background:#dbeafe;color:#1e40af;}
.wren-tag-var{background:#f3f4f6;color:#374151;}
`;

function analyzeWren(text) {
  const lines = text.split(/\r?\n/);
  const imports = [];
  const classes = [];
  const methods = [];
  const staticFields = [];
  const vars = [];
  let currentClass = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) continue;

    const impM = trimmed.match(/^import\s+"([^"]+)"(?:\s+for\s+(.+))?/);
    if (impM) {
      imports.push({ module: impM[1], names: impM[2] ? impM[2].split(',').map((s) => s.trim()) : [] });
      continue;
    }

    const classM = trimmed.match(/^class\s+(\w+)(?:\s+is\s+(\w+))?/);
    if (classM) {
      currentClass = { name: classM[1], superclass: classM[2] || null };
      classes.push(currentClass);
      continue;
    }

    const constructM = trimmed.match(/^construct\s+(\w+)\s*\(([^)]*)\)/);
    if (constructM) {
      methods.push({ name: constructM[1], params: constructM[2], kind: 'construct', class: currentClass ? currentClass.name : null });
      continue;
    }

    const staticM = trimmed.match(/^static\s+(\w+)\s*(?:\{|=)/);
    if (staticM) {
      staticFields.push({ name: staticM[1], class: currentClass ? currentClass.name : null });
      continue;
    }

    const methodM = trimmed.match(/^(?:(foreign)\s+)?(\w+)\s*\(([^)]*)\)\s*\{/);
    if (methodM && methodM[2] !== 'if' && methodM[2] !== 'while' && methodM[2] !== 'for') {
      methods.push({ name: methodM[2], params: methodM[3], kind: methodM[1] ? 'foreign' : 'method', class: currentClass ? currentClass.name : null });
      continue;
    }

    const varM = trimmed.match(/^var\s+(\w+)\s*=/);
    if (varM) {
      vars.push(varM[1]);
      continue;
    }
  }

  return { imports, classes, methods, staticFields, vars };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'wren-section';
  const hd = document.createElement('div');
  hd.className = 'wren-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'wren-list';
  sec.appendChild(ul);
  return ul;
}

function addTag(li, text, cls = 'wren-tag') {
  const tag = document.createElement('span');
  tag.className = cls;
  tag.textContent = text;
  li.appendChild(tag);
  li.appendChild(document.createTextNode(' '));
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const { imports, classes, methods, staticFields, vars } = analyzeWren(text);

  const host = document.createElement('div');
  host.className = 'wren-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'wren-title';
  title.innerHTML = '<span class="wren-badge">Wren Script</span>';
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'wren-sub';
  const parts = [];
  if (imports.length) parts.push(`${imports.length} import${imports.length !== 1 ? 's' : ''}`);
  if (classes.length) parts.push(`${classes.length} class${classes.length !== 1 ? 'es' : ''}`);
  if (methods.length) parts.push(`${methods.length} method${methods.length !== 1 ? 's' : ''}`);
  if (vars.length) parts.push(`${vars.length} var${vars.length !== 1 ? 's' : ''}`);
  if (!parts.length) parts.push('Wren script');
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'wren-cards';
  for (const { value, label } of [
    { value: imports.length, label: 'Imports' },
    { value: classes.length, label: 'Classes' },
    { value: methods.length, label: 'Methods' },
    { value: vars.length, label: 'Vars' },
  ]) {
    const card = document.createElement('div');
    card.className = 'wren-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Imports
  if (imports.length) {
    const sec = makeSection(host, `Imports (${imports.length})`);
    const ul = makeList(sec);
    for (const { module: mod, names } of imports) {
      const li = document.createElement('li');
      li.appendChild(document.createTextNode(mod));
      if (names.length) {
        const small = document.createElement('span');
        small.style.color = 'var(--fg-2,#888)';
        small.style.fontSize = '11px';
        small.textContent = ' for ' + names.join(', ');
        li.appendChild(small);
      }
      ul.appendChild(li);
    }
  }

  // Classes
  if (classes.length) {
    const sec = makeSection(host, `Classes (${classes.length})`);
    const ul = makeList(sec);
    for (const { name, superclass } of classes) {
      const li = document.createElement('li');
      addTag(li, 'class', 'wren-tag wren-tag-class');
      li.appendChild(document.createTextNode(name));
      if (superclass) {
        const small = document.createElement('span');
        small.style.color = 'var(--fg-2,#888)';
        small.style.fontSize = '11px';
        small.textContent = ' is ' + superclass;
        li.appendChild(small);
      }
      ul.appendChild(li);
    }
  }

  // Methods
  const constructs = methods.filter((m) => m.kind === 'construct');
  const foreignMethods = methods.filter((m) => m.kind === 'foreign');
  const regularMethods = methods.filter((m) => m.kind === 'method');

  if (constructs.length) {
    const sec = makeSection(host, `Constructors (${constructs.length})`);
    const ul = makeList(sec);
    for (const { name, params, class: cls } of constructs) {
      const li = document.createElement('li');
      addTag(li, 'construct', 'wren-tag wren-tag-construct');
      li.appendChild(document.createTextNode(`${name}(${params})`));
      if (cls) {
        const small = document.createElement('span');
        small.style.color = 'var(--fg-2,#888)';
        small.textContent = ' in ' + cls;
        li.appendChild(small);
      }
      ul.appendChild(li);
    }
  }

  if (regularMethods.length) {
    const sec = makeSection(host, `Methods (${regularMethods.length})`);
    const ul = makeList(sec);
    for (const { name, params, class: cls } of regularMethods) {
      const li = document.createElement('li');
      li.appendChild(document.createTextNode(`${name}(${params})`));
      if (cls) {
        const small = document.createElement('span');
        small.style.color = 'var(--fg-2,#888)';
        small.textContent = ' in ' + cls;
        li.appendChild(small);
      }
      ul.appendChild(li);
    }
  }

  if (foreignMethods.length) {
    const sec = makeSection(host, `Foreign Methods (${foreignMethods.length})`);
    const ul = makeList(sec);
    for (const { name, params, class: cls } of foreignMethods) {
      const li = document.createElement('li');
      addTag(li, 'foreign', 'wren-tag wren-tag-foreign');
      li.appendChild(document.createTextNode(`${name}(${params})`));
      if (cls) {
        const small = document.createElement('span');
        small.style.color = 'var(--fg-2,#888)';
        small.textContent = ' in ' + cls;
        li.appendChild(small);
      }
      ul.appendChild(li);
    }
  }

  // Static fields
  if (staticFields.length) {
    const sec = makeSection(host, `Static Members (${staticFields.length})`);
    const ul = makeList(sec);
    for (const { name, class: cls } of staticFields) {
      const li = document.createElement('li');
      addTag(li, 'static', 'wren-tag wren-tag-static');
      li.appendChild(document.createTextNode(name));
      if (cls) {
        const small = document.createElement('span');
        small.style.color = 'var(--fg-2,#888)';
        small.textContent = ' in ' + cls;
        li.appendChild(small);
      }
      ul.appendChild(li);
    }
  }

  // Vars
  if (vars.length) {
    const sec = makeSection(host, `Top-level Vars (${vars.length})`);
    const ul = makeList(sec);
    for (const v of vars) {
      const li = document.createElement('li');
      addTag(li, 'var', 'wren-tag wren-tag-var');
      li.appendChild(document.createTextNode(v));
      ul.appendChild(li);
    }
  }

  return { parentNode: host };
}
