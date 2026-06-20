const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.bal-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.bal-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#20b2aa;color:#fff;vertical-align:middle;margin-right:8px;}
.bal-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.bal-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.bal-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.bal-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.bal-card strong{display:block;font-size:1.2rem;font-weight:700;}
.bal-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.bal-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.bal-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.bal-list{margin:0;padding:0;list-style:none;}
.bal-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.bal-list li:last-child{border-bottom:none;}
.bal-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e0f7fa;color:#00796b;font-weight:700;}
.bal-tag-service{background:#fce7f3;color:#9d174d;}
.bal-tag-isolated{background:#ede9fe;color:#7f52ff;}
.bal-tag-transactional{background:#fef3c7;color:#92400e;}
.bal-tag-remote{background:#dcfce7;color:#166534;}
.bal-tag-resource{background:#dbeafe;color:#1e40af;}
.bal-tag-record{background:#f0fdf4;color:#15803d;}
.bal-tag-object{background:#f5f3ff;color:#6d28d9;}
.bal-tag-enum{background:#fff7ed;color:#c2410c;}
.bal-tag-const{background:#fdf2f8;color:#be185d;}
`;

function parseBallerina(text) {
  const lines = text.split(/\r?\n/);
  const imports = [];
  const services = [];
  const functions = [];
  const types = [];
  const constants = [];
  let configurableCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) continue;

    // import org/module as alias;
    const impM = trimmed.match(/^import\s+([\w.]+\/[\w.]+(?:\.[\w]+)?)\s*(?:as\s+(\w+))?\s*;?/);
    if (impM) {
      imports.push({ module: impM[1], alias: impM[2] || null });
      continue;
    }
    // import module; (no org)
    const impSimpleM = trimmed.match(/^import\s+([\w.]+)\s*(?:as\s+(\w+))?\s*;?/);
    if (impSimpleM && !impM) {
      imports.push({ module: impSimpleM[1], alias: impSimpleM[2] || null });
      continue;
    }

    // configurable
    if (/^configurable\s+/.test(trimmed)) { configurableCount++; continue; }

    // const
    const constM = trimmed.match(/^const\s+(?:\w+\s+)?(\w+)\s*=/);
    if (constM) { constants.push(constM[1]); continue; }

    // service declaration: service <type>? on <listener>
    const svcM = trimmed.match(/^service\s+(\w+)?\s*on\s+(.+)/);
    if (svcM) {
      const name = svcM[1] || '(anonymous)';
      const listener = svcM[2].replace(/\{.*/, '').trim().replace(/;$/, '').trim();
      services.push({ name, listener });
      continue;
    }
    // service /path on ...
    const svcPathM = trimmed.match(/^service\s+(\/[\w/]*)\s+on\s+(.+)/);
    if (svcPathM) {
      const name = svcPathM[1];
      const listener = svcPathM[2].replace(/\{.*/, '').trim().replace(/;$/, '').trim();
      services.push({ name, listener });
      continue;
    }

    // type definition
    const typeRecordM = trimmed.match(/^(?:public\s+)?type\s+(\w+)\s+(record|object|enum)\s*/);
    if (typeRecordM) {
      types.push({ name: typeRecordM[1], kind: typeRecordM[2] });
      continue;
    }
    // type alias
    const typeAliasM = trimmed.match(/^(?:public\s+)?type\s+(\w+)\s+(\w[\w|& ]*);/);
    if (typeAliasM) {
      types.push({ name: typeAliasM[1], kind: 'type' });
      continue;
    }

    // function declaration
    const funcM = trimmed.match(/^(?:(public|private)\s+)?(?:(isolated)\s+)?(?:(transactional)\s+)?(?:(remote|resource)\s+)?function\s+(\w+)\s*\(/);
    if (funcM) {
      const visibility = funcM[1] || null;
      const isIsolated = Boolean(funcM[2]);
      const isTransactional = Boolean(funcM[3]);
      const qualifier = funcM[4] || null;
      const name = funcM[5];
      functions.push({ name, visibility, isIsolated, isTransactional, qualifier });
      continue;
    }
  }

  return { imports, services, functions, types, constants, configurableCount };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'bal-section';
  const hd = document.createElement('div');
  hd.className = 'bal-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'bal-list';
  sec.appendChild(ul);
  return ul;
}

function makeTag(cls, text) {
  const tag = document.createElement('span');
  tag.className = `bal-tag ${cls}`;
  tag.textContent = text;
  return tag;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const { imports, services, functions, types, constants, configurableCount } = parseBallerina(text);

  const host = document.createElement('div');
  host.className = 'bal-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'bal-title';
  title.innerHTML = '<span class="bal-badge">Ballerina</span>';
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'bal-sub';
  const parts = [
    `${imports.length} import${imports.length !== 1 ? 's' : ''}`,
    `${services.length} service${services.length !== 1 ? 's' : ''}`,
    `${functions.length} function${functions.length !== 1 ? 's' : ''}`,
    `${types.length} type${types.length !== 1 ? 's' : ''}`,
  ];
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'bal-cards';
  const cardItems = [
    { value: imports.length, label: 'Imports' },
    { value: services.length, label: 'Services' },
    { value: functions.length, label: 'Functions' },
    { value: types.length, label: 'Types' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'bal-card';
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
  if (imports.length > 0) {
    const MAX = 10;
    const sec = makeSection(host, `Imports (${imports.length})`);
    const ul = makeList(sec);
    for (const { module, alias } of imports.slice(0, MAX)) {
      const li = document.createElement('li');
      li.appendChild(makeTag('bal-tag', 'import'));
      li.appendChild(document.createTextNode(' ' + module + (alias ? ` as ${alias}` : '')));
      ul.appendChild(li);
    }
    if (imports.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${imports.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Services
  if (services.length > 0) {
    const sec = makeSection(host, `Services (${services.length})`);
    const ul = makeList(sec);
    for (const { name, listener } of services) {
      const li = document.createElement('li');
      li.appendChild(makeTag('bal-tag-service', 'service'));
      li.appendChild(document.createTextNode(` ${name}`));
      if (listener) {
        const listenerSpan = document.createElement('span');
        listenerSpan.style.color = 'var(--fg-2,#888)';
        listenerSpan.textContent = ' on ' + listener;
        li.appendChild(listenerSpan);
      }
      ul.appendChild(li);
    }
  }

  // Functions
  if (functions.length > 0) {
    const sec = makeSection(host, `Functions (${functions.length})`);
    const ul = makeList(sec);
    for (const { name, isIsolated, isTransactional, qualifier } of functions) {
      const li = document.createElement('li');
      if (isIsolated) li.appendChild(makeTag('bal-tag-isolated', 'isolated'));
      if (isTransactional) li.appendChild(makeTag('bal-tag-transactional', 'transactional'));
      if (qualifier === 'remote') li.appendChild(makeTag('bal-tag-remote', 'remote'));
      if (qualifier === 'resource') li.appendChild(makeTag('bal-tag-resource', 'resource'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Types
  if (types.length > 0) {
    const sec = makeSection(host, `Type Definitions (${types.length})`);
    const ul = makeList(sec);
    for (const { name, kind } of types) {
      const li = document.createElement('li');
      const tagCls = kind === 'record' ? 'bal-tag-record' : kind === 'object' ? 'bal-tag-object' : kind === 'enum' ? 'bal-tag-enum' : 'bal-tag';
      li.appendChild(makeTag(tagCls, kind));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Constants
  if (constants.length > 0) {
    const sec = makeSection(host, `Constants (${constants.length})`);
    const ul = makeList(sec);
    for (const name of constants) {
      const li = document.createElement('li');
      li.appendChild(makeTag('bal-tag-const', 'const'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Configurables
  if (configurableCount > 0) {
    const sec = makeSection(host, `Configurable Variables (${configurableCount})`);
    const ul = makeList(sec);
    const li = document.createElement('li');
    li.textContent = `${configurableCount} configurable variable${configurableCount !== 1 ? 's' : ''} declared`;
    li.style.color = 'var(--fg-2,#888)';
    ul.appendChild(li);
  }

  return { parentNode: host };
}
