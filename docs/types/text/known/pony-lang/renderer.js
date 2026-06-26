import { chip, ensureKnownUiStyle, esc, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

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
.pony-sig{font-family:ui-monospace,monospace;white-space:normal;overflow-wrap:anywhere;}
.pony-source-keyword{color:#7b3f9e;font-weight:700;}
.pony-source-type{color:#1e40af;font-weight:600;}
.pony-source-string{color:#b45309;}
.pony-source-comment{color:var(--fg-2,#6e7681);font-style:italic;}
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
  let currentType = null;
  let currentTypeIndent = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) continue;
    const indent = leadingSpaces(line);
    if (currentType && trimmed && indent <= currentTypeIndent) currentType = null;

    const useM = trimmed.match(/^use\s+"([^"]+)"/);
    if (useM) { uses.push({ name: useM[1], line: i + 1 }); continue; }

    const typeM = trimmed.match(/^type\s+(\w+)\s+is\s+(.+)/);
    if (typeM) { typeAliases.push({ name: typeM[1], alias: typeM[2].trim(), line: i + 1 }); continue; }

    const actorM = trimmed.match(/^actor\s+(\w+)/);
    if (actorM) {
      currentType = { kind: 'actor', name: actorM[1], line: i + 1, fields: 0, funs: 0, behaviours: 0 };
      currentTypeIndent = indent;
      actors.push(currentType);
      continue;
    }

    const classM = trimmed.match(/^class\s+(\w+)/);
    if (classM) {
      currentType = { kind: 'class', name: classM[1], line: i + 1, fields: 0, funs: 0, behaviours: 0 };
      currentTypeIndent = indent;
      classes.push(currentType);
      continue;
    }

    const primM = trimmed.match(/^primitive\s+(\w+)/);
    if (primM) {
      currentType = { kind: 'primitive', name: primM[1], line: i + 1, fields: 0, funs: 0, behaviours: 0 };
      currentTypeIndent = indent;
      primitives.push(currentType);
      continue;
    }

    const ifaceM = trimmed.match(/^interface\s+(\w+)/);
    if (ifaceM) {
      currentType = { kind: 'interface', name: ifaceM[1], line: i + 1, fields: 0, funs: 0, behaviours: 0 };
      currentTypeIndent = indent;
      interfaces.push(currentType);
      continue;
    }

    const traitM = trimmed.match(/^trait\s+(\w+)/);
    if (traitM) {
      currentType = { kind: 'trait', name: traitM[1], line: i + 1, fields: 0, funs: 0, behaviours: 0 };
      currentTypeIndent = indent;
      traits.push(currentType);
      continue;
    }

    const fieldM = trimmed.match(/^(var|let)\s+(\w+)\s*:\s*([^=]+)?/);
    if (fieldM && currentType) {
      currentType.fields++;
      continue;
    }

    const ctorM = trimmed.match(/^new\s+(\w+)\s*(\(.*\))?\s*(?::\s*([\w\s]+))?/);
    if (ctorM) {
      const item = readMember('new', ctorM[1], ctorM[2] || '()', ctorM[3] || '', trimmed, i + 1, currentType);
      funs.push(item);
      if (currentType) currentType.funs++;
      continue;
    }

    const funM = trimmed.match(/^fun\s+(?:(box|ref|val|iso|trn|tag)\s+)?(\w+)\s*(\(.*\))?\s*(?::\s*([\w\s]+))?/);
    if (funM) {
      const item = readMember('fun', funM[2], funM[3] || '()', funM[4] || '', trimmed, i + 1, currentType, funM[1] || '');
      funs.push(item);
      if (currentType) currentType.funs++;
      continue;
    }

    const beM = trimmed.match(/^be\s+(\w+)\s*(\(.*\))?/);
    if (beM) {
      const item = readMember('be', beM[1], beM[2] || '()', '', trimmed, i + 1, currentType);
      behaviours.push(item);
      if (currentType) currentType.behaviours++;
      continue;
    }
  }

  return { uses, actors, classes, primitives, interfaces, traits, funs, behaviours, typeAliases };
}

function leadingSpaces(line) {
  return line.match(/^\s*/)?.[0].length || 0;
}

function readMember(kind, name, paramText, ret, signature, line, owner, receiver = '') {
  const params = splitParams(paramText.replace(/^\(|\)$/g, ''));
  const capabilities = [...new Set(params.flatMap((param) => [...param.matchAll(/\b(iso|val|ref|box|tag|trn)\b/g)].map((m) => m[1])))];
  return {
    kind,
    name,
    params,
    ret: String(ret || '').trim(),
    receiver,
    capabilities,
    signature,
    line,
    owner: owner?.name || '',
    ownerKind: owner?.kind || '',
  };
}

function splitParams(text) {
  const out = [];
  let depth = 0;
  let current = '';
  for (const ch of String(text || '')) {
    if (ch === '(' || ch === '{' || ch === '[') depth++;
    if (ch === ')' || ch === '}' || ch === ']') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      if (current.trim()) out.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
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
  tag.title = tagHint(text);
  li.appendChild(tag);
  li.appendChild(document.createTextNode(' '));
}

function tagHint(text) {
  const hints = {
    actor: 'Concurrent object with asynchronous behaviours.',
    be: 'Behaviour: asynchronous message entry point on an actor.',
    class: 'Object type with fields, constructors, and functions.',
    primitive: 'Stateless singleton type.',
    interface: 'Structural contract implemented by compatible types.',
    trait: 'Reusable method and field requirements.',
    fun: 'Synchronous function.',
    new: 'Constructor.',
    type: 'Type alias.',
    iso: 'Isolated reference capability; no aliases exist.',
    val: 'Immutable shareable reference capability.',
    ref: 'Mutable reference capability.',
    box: 'Read-only view of mutable or immutable data.',
    tag: 'Opaque identity-only reference capability.',
  };
  return hints[text] || '';
}

function highlightPonyLine(line) {
  if (/^\s*\/\//.test(line)) return `<span class="pony-source-comment">${esc(line)}</span>`;
  let out = esc(line);
  out = out.replace(/&quot;[^&]*?&quot;/g, '<span class="pony-source-string">$&</span>');
  out = out.replace(/\b(use|actor|class|primitive|interface|trait|type|is|fun|be|new|var|let|iso|val|ref|box|tag|None|String|U64|U8|Env)\b/g, '<span class="pony-source-keyword">$1</span>');
  out = out.replace(/\b(Counter|Dog|Printable|Serializable|Colors|Set)\b/g, '<span class="pony-source-type">$1</span>');
  return out;
}

function appendApiRow(ul, item) {
  const li = document.createElement('li');
  addTag(li, item.kind, item.kind === 'be' ? 'pony-tag pony-tag-be' : 'pony-tag');
  if (item.receiver) li.appendChild(chip(item.receiver, 'info', tagHint(item.receiver)));
  li.appendChild(sourceButton(item.name, item.line, 'Open member in source'));
  li.appendChild(chip(`arity ${item.params.length}`, 'muted'));
  if (item.ret) li.appendChild(chip(`returns ${item.ret}`, 'info'));
  if (item.owner) li.appendChild(chip(`in ${item.owner}`, 'muted'));
  for (const cap of item.capabilities) li.appendChild(chip(cap, 'info', tagHint(cap)));
  const sig = document.createElement('span');
  sig.className = 'pony-sig';
  sig.textContent = item.signature;
  li.appendChild(sig);
  for (const param of item.params) li.appendChild(chip(param, 'muted', 'Parameter from the member signature.'));
  ul.appendChild(li);
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const { uses, actors, classes, primitives, interfaces, traits, funs, behaviours, typeAliases } = analyzePony(text);

  const host = document.createElement('div');
  host.className = 'pony-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);
  ensureKnownUiStyle(host);

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
      li.appendChild(sourceButton(u.name, u.line, 'Open use declaration in source'));
      ul.appendChild(li);
    }
  }

  // Actors
  if (actors.length) {
    const sec = makeSection(host, `Actors (${actors.length})`);
    const ul = makeList(sec);
    for (const actor of actors) {
      const li = document.createElement('li');
      addTag(li, 'actor', 'pony-tag pony-tag-actor');
      li.appendChild(sourceButton(actor.name, actor.line, 'Open actor in source'));
      li.appendChild(chip(`${actor.behaviours} behaviour${actor.behaviours !== 1 ? 's' : ''}`, 'info'));
      li.appendChild(chip(`${actor.fields} field${actor.fields !== 1 ? 's' : ''}`, 'muted'));
      ul.appendChild(li);
    }
  }

  // Classes
  if (classes.length) {
    const sec = makeSection(host, `Classes (${classes.length})`);
    const ul = makeList(sec);
    for (const cls of classes) {
      const li = document.createElement('li');
      addTag(li, 'class');
      li.appendChild(sourceButton(cls.name, cls.line, 'Open class in source'));
      li.appendChild(chip(`${cls.funs} member${cls.funs !== 1 ? 's' : ''}`, 'info'));
      li.appendChild(chip(`${cls.fields} field${cls.fields !== 1 ? 's' : ''}`, 'muted'));
      ul.appendChild(li);
    }
  }

  // Primitives
  if (primitives.length) {
    const sec = makeSection(host, `Primitives (${primitives.length})`);
    const ul = makeList(sec);
    for (const prim of primitives) {
      const li = document.createElement('li');
      addTag(li, 'primitive', 'pony-tag pony-tag-prim');
      li.appendChild(sourceButton(prim.name, prim.line, 'Open primitive in source'));
      li.appendChild(chip(`${prim.funs} function${prim.funs !== 1 ? 's' : ''}`, 'info'));
      ul.appendChild(li);
    }
  }

  // Interfaces & Traits
  if (interfaces.length + traits.length > 0) {
    const sec = makeSection(host, `Interfaces & Traits (${interfaces.length + traits.length})`);
    const ul = makeList(sec);
    for (const item of interfaces) {
      const li = document.createElement('li');
      addTag(li, 'interface', 'pony-tag pony-tag-iface');
      li.appendChild(sourceButton(item.name, item.line, 'Open interface in source'));
      li.appendChild(chip(`${item.funs} requirement${item.funs !== 1 ? 's' : ''}`, 'info'));
      ul.appendChild(li);
    }
    for (const item of traits) {
      const li = document.createElement('li');
      addTag(li, 'trait', 'pony-tag pony-tag-trait');
      li.appendChild(sourceButton(item.name, item.line, 'Open trait in source'));
      li.appendChild(chip(`${item.funs} requirement${item.funs !== 1 ? 's' : ''}`, 'info'));
      ul.appendChild(li);
    }
  }

  // Function signatures
  if (funs.length) {
    const sec = makeSection(host, `Functions (${funs.length})`);
    const ul = makeList(sec);
    for (const item of funs) appendApiRow(ul, item);
  }

  // Behaviours
  if (behaviours.length) {
    const sec = makeSection(host, `Behaviours (${behaviours.length})`);
    const ul = makeList(sec);
    for (const item of behaviours) appendApiRow(ul, item);
  }

  // Type aliases
  if (typeAliases.length) {
    const sec = makeSection(host, `Type Aliases (${typeAliases.length})`);
    const ul = makeList(sec);
    for (const { name, alias, line } of typeAliases) {
      const li = document.createElement('li');
      addTag(li, 'type');
      li.appendChild(sourceButton(name, line, 'Open type alias in source'));
      li.appendChild(chip(alias, 'muted'));
      ul.appendChild(li);
    }
  }

  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'pony-line', highlighter: highlightPonyLine }));
  wireSourceLinks(host, { idPrefix: 'pony-line' });

  return { parentNode: host };
}
