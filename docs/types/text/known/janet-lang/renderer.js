const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.janet-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.janet-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1e7145;color:#fff;vertical-align:middle;margin-right:8px;}
.janet-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.janet-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.janet-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.janet-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:100px;}
.janet-card strong{display:block;font-size:1.2rem;font-weight:700;}
.janet-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.janet-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.janet-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.janet-list{margin:0;padding:0;list-style:none;}
.janet-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.janet-list li:last-child{border-bottom:none;}
.janet-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#d1fae5;color:#1e7145;font-weight:700;}
.janet-tag-defn{background:#d1fae5;color:#065f46;}
.janet-tag-private{background:#f3f4f6;color:#374151;}
.janet-tag-macro{background:#fce7f3;color:#9d174d;}
.janet-tag-def{background:#dbeafe;color:#1e40af;}
.janet-tag-var{background:#fef3c7;color:#92400e;}
.janet-tag-import{background:#ede9fe;color:#5b21b6;}
.janet-doc-str{font-size:11px;color:var(--fg-2,#6e7781);font-style:italic;font-family:system-ui,sans-serif;margin-left:4px;}
`;

function analyzeJanet(text) {
  const lines = text.split(/\r?\n/);
  let moduleName = null;
  const imports = [];
  const uses = [];
  const defns = [];
  const defnPrivates = [];
  const macros = [];
  const defs = [];
  const vars = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;

    // Module declaration
    const modM = trimmed.match(/^\(module\s+(\S+)/);
    if (modM && !moduleName) { moduleName = modM[1]; continue; }

    // Imports
    const impM = trimmed.match(/^\(import\s+([\w./:-]+)/);
    if (impM) { imports.push(impM[1]); continue; }

    const useM = trimmed.match(/^\(use\s+([\w./:-]+)/);
    if (useM) { uses.push(useM[1]); continue; }

    // defmacro
    const macroM = trimmed.match(/^\(defmacro\s+(\S+)/);
    if (macroM) {
      const docM = lines[i + 1] && lines[i + 1].trim().match(/^"([^"]+)"/);
      macros.push({ name: macroM[1], doc: docM ? docM[1] : null });
      continue;
    }

    // defn- (private function)
    const defnPrivM = trimmed.match(/^\(defn-\s+(\S+)/);
    if (defnPrivM) {
      const docM = lines[i + 1] && lines[i + 1].trim().match(/^"([^"]+)"/);
      defnPrivates.push({ name: defnPrivM[1], doc: docM ? docM[1] : null });
      continue;
    }

    // defn (public function)
    const defnM = trimmed.match(/^\(defn\s+(\S+)/);
    if (defnM) {
      const docM = lines[i + 1] && lines[i + 1].trim().match(/^"([^"]+)"/);
      defns.push({ name: defnM[1], doc: docM ? docM[1] : null });
      continue;
    }

    // var
    const varM = trimmed.match(/^\(var\s+(\S+)/);
    if (varM) { vars.push(varM[1]); continue; }

    // def
    const defM = trimmed.match(/^\(def\s+(\S+)/);
    if (defM) { defs.push(defM[1]); continue; }
  }

  return { moduleName, imports, uses, defns, defnPrivates, macros, defs, vars };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'janet-section';
  const hd = document.createElement('div');
  hd.className = 'janet-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'janet-list';
  sec.appendChild(ul);
  return ul;
}

function addTag(li, text, cls = 'janet-tag') {
  const tag = document.createElement('span');
  tag.className = cls;
  tag.textContent = text;
  li.appendChild(tag);
  li.appendChild(document.createTextNode(' '));
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const { moduleName, imports, uses, defns, defnPrivates, macros, defs, vars } = analyzeJanet(text);

  const host = document.createElement('div');
  host.className = 'janet-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'janet-title';
  const badgeHtml = '<span class="janet-badge">Janet Script</span>';
  const moduleHtml = moduleName ? ` <span style="font-size:14px;font-weight:400;color:var(--fg-2,#888)">${esc(moduleName)}</span>` : '';
  title.innerHTML = badgeHtml + moduleHtml;
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'janet-sub';
  const parts = [];
  if (imports.length + uses.length) parts.push(`${imports.length + uses.length} import${(imports.length + uses.length) !== 1 ? 's' : ''}`);
  if (defns.length) parts.push(`${defns.length} fn${defns.length !== 1 ? 's' : ''}`);
  if (macros.length) parts.push(`${macros.length} macro${macros.length !== 1 ? 's' : ''}`);
  if (defs.length) parts.push(`${defs.length} def${defs.length !== 1 ? 's' : ''}`);
  if (!parts.length) parts.push('Janet source file');
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'janet-cards';
  for (const { value, label } of [
    { value: imports.length + uses.length, label: 'Imports' },
    { value: defns.length + defnPrivates.length, label: 'Functions' },
    { value: macros.length, label: 'Macros' },
    { value: defs.length, label: 'Defs' },
  ]) {
    const card = document.createElement('div');
    card.className = 'janet-card';
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
  const allImports = [
    ...imports.map((i) => ({ name: i, kind: 'import' })),
    ...uses.map((u) => ({ name: u, kind: 'use' })),
  ];
  if (allImports.length) {
    const sec = makeSection(host, `Imports (${allImports.length})`);
    const ul = makeList(sec);
    for (const { name, kind } of allImports) {
      const li = document.createElement('li');
      addTag(li, kind, 'janet-tag janet-tag-import');
      li.appendChild(document.createTextNode(name));
      ul.appendChild(li);
    }
  }

  // Functions (public)
  if (defns.length) {
    const sec = makeSection(host, `Functions (${defns.length})`);
    const ul = makeList(sec);
    for (const { name, doc } of defns) {
      const li = document.createElement('li');
      addTag(li, 'defn', 'janet-tag janet-tag-defn');
      li.appendChild(document.createTextNode(name));
      if (doc) {
        const ds = document.createElement('span');
        ds.className = 'janet-doc-str';
        ds.textContent = doc.length > 60 ? doc.slice(0, 57) + '…' : doc;
        li.appendChild(ds);
      }
      ul.appendChild(li);
    }
  }

  // Private functions
  if (defnPrivates.length) {
    const sec = makeSection(host, `Private Functions (${defnPrivates.length})`);
    const ul = makeList(sec);
    for (const { name, doc } of defnPrivates) {
      const li = document.createElement('li');
      addTag(li, 'defn-', 'janet-tag janet-tag-private');
      li.appendChild(document.createTextNode(name));
      if (doc) {
        const ds = document.createElement('span');
        ds.className = 'janet-doc-str';
        ds.textContent = doc.length > 60 ? doc.slice(0, 57) + '…' : doc;
        li.appendChild(ds);
      }
      ul.appendChild(li);
    }
  }

  // Macros
  if (macros.length) {
    const sec = makeSection(host, `Macros (${macros.length})`);
    const ul = makeList(sec);
    for (const { name, doc } of macros) {
      const li = document.createElement('li');
      addTag(li, 'defmacro', 'janet-tag janet-tag-macro');
      li.appendChild(document.createTextNode(name));
      if (doc) {
        const ds = document.createElement('span');
        ds.className = 'janet-doc-str';
        ds.textContent = doc.length > 60 ? doc.slice(0, 57) + '…' : doc;
        li.appendChild(ds);
      }
      ul.appendChild(li);
    }
  }

  // Defs
  if (defs.length) {
    const sec = makeSection(host, `Values (${defs.length})`);
    const ul = makeList(sec);
    for (const d of defs) {
      const li = document.createElement('li');
      addTag(li, 'def', 'janet-tag janet-tag-def');
      li.appendChild(document.createTextNode(d));
      ul.appendChild(li);
    }
  }

  // Vars
  if (vars.length) {
    const sec = makeSection(host, `Mutable Vars (${vars.length})`);
    const ul = makeList(sec);
    for (const v of vars) {
      const li = document.createElement('li');
      addTag(li, 'var', 'janet-tag janet-tag-var');
      li.appendChild(document.createTextNode(v));
      ul.appendChild(li);
    }
  }

  return { parentNode: host };
}
