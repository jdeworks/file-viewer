const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pony-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pony-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7b3f9e;color:#fff;vertical-align:middle;margin-right:8px;}
.pony-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pony-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pony-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.pony-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:100px;}
.pony-card strong{display:block;font-size:1.2rem;font-weight:700;}
.pony-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.pony-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.pony-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.pony-list{margin:0;padding:0;list-style:none;}
.pony-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.pony-list li:last-child{border-bottom:none;}
.pony-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#ede9d8;color:#7b3f9e;font-weight:700;}
.pony-tag-be{background:#fce7f3;color:#9d174d;}
.pony-tag-actor{background:#ede9d8;color:#7b3f9e;}
.pony-tag-prim{background:#d1fae5;color:#065f46;}
.pony-tag-iface{background:#dbeafe;color:#1e40af;}
.pony-tag-trait{background:#fef3c7;color:#92400e;}
.pony-use{font-family:ui-monospace,monospace;font-size:11px;color:#7b3f9e;}
`;

function analyzePony(text) {
  const lines = text.split(/\r?\n/);
  const uses = [];
  const actors = [];
  const classes = [];
  const primitives = [];
  const interfaces = [];
  const traits = [];
  const funs = [];
  const behaviours = [];
  const typeAliases = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) continue;

    const useM = trimmed.match(/^use\s+"([^"]+)"/);
    if (useM) { uses.push(useM[1]); continue; }

    const typeM = trimmed.match(/^type\s+(\w+)\s+is\s+(.+)/);
    if (typeM) { typeAliases.push({ name: typeM[1], alias: typeM[2].trim() }); continue; }

    const actorM = trimmed.match(/^actor\s+(\w+)/);
    if (actorM) { actors.push({ name: actorM[1], behaviours: [] }); continue; }

    const classM = trimmed.match(/^class\s+(\w+)/);
    if (classM) { classes.push({ name: classM[1] }); continue; }

    const primM = trimmed.match(/^primitive\s+(\w+)/);
    if (primM) { primitives.push({ name: primM[1] }); continue; }

    const ifaceM = trimmed.match(/^interface\s+(\w+)/);
    if (ifaceM) { interfaces.push({ name: ifaceM[1] }); continue; }

    const traitM = trimmed.match(/^trait\s+(\w+)/);
    if (traitM) { traits.push({ name: traitM[1] }); continue; }

    const funM = trimmed.match(/^fun\s+(?:\w+\s+)?(\w+)\s*(\([^)]*\))?/);
    if (funM) { funs.push({ name: funM[1], params: funM[2] || '()' }); continue; }

    const beM = trimmed.match(/^be\s+(\w+)\s*(\([^)]*\))?/);
    if (beM) { behaviours.push({ name: beM[1], params: beM[2] || '()' }); continue; }
  }

  return { uses, actors, classes, primitives, interfaces, traits, funs, behaviours, typeAliases };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'pony-section';
  const hd = document.createElement('div');
  hd.className = 'pony-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'pony-list';
  sec.appendChild(ul);
  return ul;
}

function addTag(li, text, cls = 'pony-tag') {
  const tag = document.createElement('span');
  tag.className = cls;
  tag.textContent = text;
  li.appendChild(tag);
  li.appendChild(document.createTextNode(' '));
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const { uses, actors, classes, primitives, interfaces, traits, funs, behaviours, typeAliases } = analyzePony(text);

  const host = document.createElement('div');
  host.className = 'pony-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'pony-title';
  title.innerHTML = '<span class="pony-badge">Pony</span>';
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'pony-sub';
  const parts = [];
  if (uses.length) parts.push(`${uses.length} use${uses.length !== 1 ? 's' : ''}`);
  if (actors.length) parts.push(`${actors.length} actor${actors.length !== 1 ? 's' : ''}`);
  if (classes.length) parts.push(`${classes.length} class${classes.length !== 1 ? 'es' : ''}`);
  if (primitives.length) parts.push(`${primitives.length} primitive${primitives.length !== 1 ? 's' : ''}`);
  if (interfaces.length + traits.length) parts.push(`${interfaces.length + traits.length} interface/trait${(interfaces.length + traits.length) !== 1 ? 's' : ''}`);
  if (!parts.length) parts.push('Pony source file');
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'pony-cards';
  for (const { value, label } of [
    { value: actors.length, label: 'Actors' },
    { value: classes.length, label: 'Classes' },
    { value: primitives.length, label: 'Primitives' },
    { value: funs.length + behaviours.length, label: 'Functions' },
  ]) {
    const card = document.createElement('div');
    card.className = 'pony-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Use declarations
  if (uses.length) {
    const sec = makeSection(host, `Use Declarations (${uses.length})`);
    const ul = makeList(sec);
    for (const u of uses) {
      const li = document.createElement('li');
      li.textContent = u;
      ul.appendChild(li);
    }
  }

  // Actors
  if (actors.length) {
    const sec = makeSection(host, `Actors (${actors.length})`);
    const ul = makeList(sec);
    for (const { name } of actors) {
      const li = document.createElement('li');
      addTag(li, 'actor', 'pony-tag pony-tag-actor');
      li.appendChild(document.createTextNode(name));
      ul.appendChild(li);
    }
  }

  // Classes
  if (classes.length) {
    const sec = makeSection(host, `Classes (${classes.length})`);
    const ul = makeList(sec);
    for (const { name } of classes) {
      const li = document.createElement('li');
      addTag(li, 'class');
      li.appendChild(document.createTextNode(name));
      ul.appendChild(li);
    }
  }

  // Primitives
  if (primitives.length) {
    const sec = makeSection(host, `Primitives (${primitives.length})`);
    const ul = makeList(sec);
    for (const { name } of primitives) {
      const li = document.createElement('li');
      addTag(li, 'primitive', 'pony-tag pony-tag-prim');
      li.appendChild(document.createTextNode(name));
      ul.appendChild(li);
    }
  }

  // Interfaces & Traits
  if (interfaces.length + traits.length > 0) {
    const sec = makeSection(host, `Interfaces & Traits (${interfaces.length + traits.length})`);
    const ul = makeList(sec);
    for (const { name } of interfaces) {
      const li = document.createElement('li');
      addTag(li, 'interface', 'pony-tag pony-tag-iface');
      li.appendChild(document.createTextNode(name));
      ul.appendChild(li);
    }
    for (const { name } of traits) {
      const li = document.createElement('li');
      addTag(li, 'trait', 'pony-tag pony-tag-trait');
      li.appendChild(document.createTextNode(name));
      ul.appendChild(li);
    }
  }

  // Function signatures
  if (funs.length) {
    const sec = makeSection(host, `Functions (${funs.length})`);
    const ul = makeList(sec);
    for (const { name, params } of funs) {
      const li = document.createElement('li');
      addTag(li, 'fun');
      li.appendChild(document.createTextNode(name + params));
      ul.appendChild(li);
    }
  }

  // Behaviours
  if (behaviours.length) {
    const sec = makeSection(host, `Behaviours (${behaviours.length})`);
    const ul = makeList(sec);
    for (const { name, params } of behaviours) {
      const li = document.createElement('li');
      addTag(li, 'be', 'pony-tag pony-tag-be');
      li.appendChild(document.createTextNode(name + params));
      ul.appendChild(li);
    }
  }

  // Type aliases
  if (typeAliases.length) {
    const sec = makeSection(host, `Type Aliases (${typeAliases.length})`);
    const ul = makeList(sec);
    for (const { name, alias } of typeAliases) {
      const li = document.createElement('li');
      addTag(li, 'type');
      li.appendChild(document.createTextNode(`${name} = ${alias}`));
      ul.appendChild(li);
    }
  }

  return { parentNode: host };
}
