import { chip, ensureKnownUiStyle, esc, issueList, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

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
.bal-note{color:var(--fg-2,#5a6678);font-family:system-ui,sans-serif;font-size:12px;}
.bal-sig{font-family:ui-monospace,monospace;white-space:normal;overflow-wrap:anywhere;}
.bal-param-list{display:flex;gap:4px;flex-wrap:wrap;margin-left:2px;}
.bal-source-import{color:#0550ae;font-weight:700;}
.bal-source-keyword{color:#7c3aed;font-weight:700;}
.bal-source-type{color:#0f766e;}
.bal-source-string{color:#b45309;}
.bal-source-comment{color:var(--fg-2,#6e7681);font-style:italic;}
`;

function parseBallerina(text) {
  const lines = text.split(/\r?\n/);
  const imports = [];
  const services = [];
  const functions = [];
  const types = [];
  const constants = [];
  const configurables = [];
  const issues = [];
  let currentService = null;
  let serviceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) continue;

    // import org/module as alias;
    const impM = trimmed.match(/^import\s+([\w.]+\/[\w.]+(?:\.[\w]+)?)\s*(?:as\s+(\w+))?\s*;?/);
    if (impM) {
      imports.push({ module: impM[1], alias: impM[2] || null, line: i + 1 });
      continue;
    }
    // import module; (no org)
    const impSimpleM = trimmed.match(/^import\s+([\w.]+)\s*(?:as\s+(\w+))?\s*;?/);
    if (impSimpleM && !impM) {
      imports.push({ module: impSimpleM[1], alias: impSimpleM[2] || null, line: i + 1 });
      continue;
    }

    // configurable
    const configM = trimmed.match(/^configurable\s+([\w:<>|?[\]]+)\s+(\w+)\s*=\s*(.*?);?$/);
    if (configM) {
      const item = { type: configM[1], name: configM[2], value: configM[3], line: i + 1 };
      configurables.push(item);
      if (/(password|secret|token|key|credential)/i.test(item.name)) {
        issues.push({ severity: 'warning', label: 'sensitive config', line: i + 1, message: `${item.name} looks like a secret-bearing configurable value.` });
      }
      continue;
    }

    // const
    const constM = trimmed.match(/^const\s+([\w:<>|?[\]]+)\s+(\w+)\s*=/);
    if (constM) { constants.push({ type: constM[1], name: constM[2], line: i + 1 }); continue; }

    // service declaration: service <type>? on <listener>
    const svcM = trimmed.match(/^service\s+(\w+)?\s*on\s+(.+)/);
    if (svcM) {
      const name = svcM[1] || '(anonymous)';
      const listener = svcM[2].replace(/\{.*/, '').trim().replace(/;$/, '').trim();
      currentService = { name, listener, line: i + 1 };
      services.push(currentService);
      serviceDepth = braceDelta(line);
      continue;
    }
    // service /path on ...
    const svcPathM = trimmed.match(/^service\s+(\/[\w/]*)\s+on\s+(.+)/);
    if (svcPathM) {
      const name = svcPathM[1];
      const listener = svcPathM[2].replace(/\{.*/, '').trim().replace(/;$/, '').trim();
      currentService = { name, listener, line: i + 1 };
      services.push(currentService);
      serviceDepth = braceDelta(line);
      continue;
    }

    // type definition
    const typeRecordM = trimmed.match(/^(?:public\s+)?type\s+(\w+)\s+(record|object|enum)\s*/);
    if (typeRecordM) {
      types.push({ name: typeRecordM[1], kind: typeRecordM[2], fields: countBlockMembers(lines, i), line: i + 1 });
      continue;
    }
    // type alias
    const typeAliasM = trimmed.match(/^(?:public\s+)?type\s+(\w+)\s+(\w[\w|& ]*);/);
    if (typeAliasM) {
      types.push({ name: typeAliasM[1], kind: 'type', fields: 0, line: i + 1 });
      continue;
    }

    // function declaration
    const funcM = trimmed.match(/^((?:(?:public|private|isolated|transactional|remote|resource)\s+)*)function\s+([^({]+?)\s*\(/);
    if (funcM) {
      const qualifiers = funcM[1].trim().split(/\s+/).filter(Boolean);
      const signature = collectSignature(lines, i);
      const parsed = parseSignature(signature);
      functions.push({
        name: funcM[2].trim(),
        signature,
        params: parsed.params,
        returns: parsed.returns,
        qualifiers,
        service: currentService?.name || null,
        line: i + 1,
        bodyLines: countBodyLines(lines, i),
      });
      if (currentService) serviceDepth += braceDelta(line);
      continue;
    }

    if (currentService) {
      serviceDepth += braceDelta(line);
      if (serviceDepth <= 0) currentService = null;
    }
  }

  return { imports, services, functions, types, constants, configurables, issues };
}

function braceDelta(line) {
  const withoutStrings = line.replace(/"([^"\\]|\\.)*"/g, '""').replace(/`[^`]*`/g, '``');
  return (withoutStrings.match(/\{/g) || []).length - (withoutStrings.match(/\}/g) || []).length;
}

function collectSignature(lines, start) {
  const parts = [];
  for (let i = start; i < lines.length; i++) {
    const part = lines[i].trim();
    parts.push(part.replace(/\s*\{\s*$/, ''));
    if (/[{;]\s*$/.test(part)) break;
  }
  return parts.join(' ').replace(/\s+/g, ' ').replace(/\s*\{\s*$/, '').trim();
}

function parseSignature(signature) {
  const m = signature.match(/\((.*)\)\s*(?:returns\s+(.+))?$/);
  const params = m?.[1] ? m[1].split(',').map((p) => p.trim()).filter(Boolean) : [];
  const returns = m?.[2]?.replace(/\s*\{?\s*$/, '').trim() || '';
  return { params, returns };
}

function countBodyLines(lines, start) {
  let depth = 0;
  let seenOpen = false;
  let count = 0;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('{')) seenOpen = true;
    if (seenOpen && i > start && line.trim()) count++;
    depth += braceDelta(line);
    if (seenOpen && depth <= 0) return Math.max(0, count - 1);
  }
  return count;
}

function countBlockMembers(lines, start) {
  let depth = 0;
  let count = 0;
  for (let i = start; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    depth += braceDelta(lines[i]);
    if (i > start && depth > 0 && /;\s*$/.test(trimmed) && !trimmed.startsWith('//')) count++;
    if (i > start && depth <= 0) break;
  }
  return count;
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
  tag.title = qualifierHint(text);
  return tag;
}

function qualifierHint(name) {
  const hints = {
    import: 'Module dependency imported by this file.',
    service: 'Network-facing service bound to a listener.',
    isolated: 'Function is restricted for concurrency-safe access to mutable state.',
    transactional: 'Function participates in a transaction context.',
    remote: 'Method intended for remote method calls on a client/service object.',
    resource: 'HTTP/resource method mapped to a resource path.',
    record: 'Structured data shape with named fields.',
    object: 'Object type with methods and fields.',
    enum: 'Closed set of named values.',
    const: 'Compile-time constant.',
    configurable: 'Runtime-configurable value supplied by environment, config file, or CLI.',
  };
  return hints[name] || '';
}

function highlightBallerinaLine(line) {
  if (/^\s*\/\//.test(line)) return `<span class="bal-source-comment">${esc(line)}</span>`;
  let out = esc(line);
  out = out.replace(/\b(import)\b/g, '<span class="bal-source-import">$1</span>');
  out = out.replace(/\b(service|resource|remote|function|returns|type|record|enum|const|configurable|isolated|transactional)\b/g, '<span class="bal-source-keyword">$1</span>');
  out = out.replace(/\b(http|mysql|time|log):[A-Za-z]\w*/g, '<span class="bal-source-type">$&</span>');
  out = out.replace(/(&quot;[^&]*?&quot;|`[^`]*`)/g, '<span class="bal-source-string">$1</span>');
  return out;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const { imports, services, functions, types, constants, configurables, issues } = parseBallerina(text);

  const host = document.createElement('div');
  host.className = 'bal-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);
  ensureKnownUiStyle(host);

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
    `${configurables.length} configurable${configurables.length !== 1 ? 's' : ''}`,
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
    { value: configurables.length, label: 'Configurables' },
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
    for (const { module, alias, line } of imports.slice(0, MAX)) {
      const li = document.createElement('li');
      li.appendChild(makeTag('bal-tag', 'import'));
      li.appendChild(sourceButton(module + (alias ? ` as ${alias}` : ''), line, 'Open import in source'));
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
    for (const { name, listener, line } of services) {
      const li = document.createElement('li');
      li.appendChild(makeTag('bal-tag-service', 'service'));
      li.appendChild(sourceButton(name, line, 'Open service declaration in source'));
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
    for (const fn of functions) {
      const li = document.createElement('li');
      if (fn.qualifiers.includes('isolated')) li.appendChild(makeTag('bal-tag-isolated', 'isolated'));
      if (fn.qualifiers.includes('transactional')) li.appendChild(makeTag('bal-tag-transactional', 'transactional'));
      if (fn.qualifiers.includes('remote')) li.appendChild(makeTag('bal-tag-remote', 'remote'));
      if (fn.qualifiers.includes('resource')) li.appendChild(makeTag('bal-tag-resource', 'resource'));
      li.appendChild(sourceButton(fn.name, fn.line, 'Open function in source'));
      if (fn.returns) li.appendChild(chip(`returns ${fn.returns}`, 'info'));
      if (fn.bodyLines > 20) li.appendChild(chip(`${fn.bodyLines} lines`, 'warn', 'Longer function body; review for readability.'));
      else li.appendChild(chip(`${fn.bodyLines} lines`, 'muted'));
      if (fn.service) li.appendChild(chip(`in ${fn.service}`, 'muted'));
      const sig = document.createElement('span');
      sig.className = 'bal-sig';
      sig.textContent = fn.signature;
      li.appendChild(sig);
      if (fn.params.length) {
        const params = document.createElement('span');
        params.className = 'bal-param-list';
        for (const param of fn.params) params.appendChild(chip(param, 'muted', 'Parameter from the function signature.'));
        li.appendChild(params);
      }
      ul.appendChild(li);
    }
  }

  // Types
  if (types.length > 0) {
    const sec = makeSection(host, `Type Definitions (${types.length})`);
    const ul = makeList(sec);
    for (const { name, kind, fields, line } of types) {
      const li = document.createElement('li');
      const tagCls = kind === 'record' ? 'bal-tag-record' : kind === 'object' ? 'bal-tag-object' : kind === 'enum' ? 'bal-tag-enum' : 'bal-tag';
      li.appendChild(makeTag(tagCls, kind));
      li.appendChild(sourceButton(name, line, 'Open type definition in source'));
      if (fields) li.appendChild(chip(`${fields} field${fields !== 1 ? 's' : ''}`, 'info'));
      ul.appendChild(li);
    }
  }

  // Constants
  if (constants.length > 0) {
    const sec = makeSection(host, `Constants (${constants.length})`);
    const ul = makeList(sec);
    for (const { name, type, line } of constants) {
      const li = document.createElement('li');
      li.appendChild(makeTag('bal-tag-const', 'const'));
      li.appendChild(sourceButton(name, line, 'Open constant in source'));
      li.appendChild(chip(type, 'muted'));
      ul.appendChild(li);
    }
  }

  // Configurables
  if (configurables.length > 0) {
    const sec = makeSection(host, `Configurable Variables (${configurables.length})`);
    const ul = makeList(sec);
    for (const item of configurables) {
      const li = document.createElement('li');
      li.appendChild(makeTag('bal-tag', 'configurable'));
      li.appendChild(sourceButton(item.name, item.line, 'Open configurable variable in source'));
      li.appendChild(chip(item.type, 'muted'));
      if (item.value === '?') li.appendChild(chip('required at runtime', 'warn', 'The value must be supplied externally.'));
      ul.appendChild(li);
    }
  }

  const issueEl = issueList(issues, { title: 'Review Notes' });
  if (issueEl) host.appendChild(issueEl);

  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'bal-line', highlighter: highlightBallerinaLine }));
  wireSourceLinks(host, { idPrefix: 'bal-line' });

  return { parentNode: host };
}
