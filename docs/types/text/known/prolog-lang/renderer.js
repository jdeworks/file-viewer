const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pro-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pro-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.pro-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pro-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pro-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.pro-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.pro-card strong{display:block;font-size:1.2rem;font-weight:700;}
.pro-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.pro-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.pro-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.pro-list{margin:0;padding:0;list-style:none;}
.pro-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.pro-list li:last-child{border-bottom:none;}
.pro-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#ede9fe;color:#7c3aed;font-weight:700;}
.pro-tag-fact{background:#dcfce7;color:#166534;}
.pro-tag-rule{background:#dbeafe;color:#1e40af;}
.pro-tag-dcg{background:#fef3c7;color:#92400e;}
.pro-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.pro-kw{color:#7c3aed;font-weight:600;}
.pro-atom{color:#0a6640;}
.pro-comment{color:#6e7781;font-style:italic;}
.pro-var{color:#b45309;}
.pro-op{color:#d1242f;}
`;

function analyzeProlog(text) {
  const lines = text.split(/\r?\n/);
  let moduleName = null;
  const moduleExports = [];
  const useModules = [];
  const facts = [];
  const rules = [];
  const dcgRules = [];
  const predicates = new Map(); // name -> { facts, rules }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%')) continue;

    // Module declaration: :- module(name, [exports]).
    const modM = trimmed.match(/^:-\s*module\s*\(\s*(\w+)\s*,\s*\[([^\]]*)\]/);
    if (modM) {
      moduleName = modM[1];
      const exps = modM[2].split(',').map((s) => s.trim()).filter(Boolean);
      moduleExports.push(...exps);
      continue;
    }

    // use_module: :- use_module(library(name)) or :- use_module(module).
    const useM = trimmed.match(/^:-\s*use_module\s*\(\s*(?:library\s*\(\s*)?(\w+)/);
    if (useM) {
      useModules.push(useM[1]);
      continue;
    }

    // DCG rule: head --> body.
    const dcgM = trimmed.match(/^(\w+)(?:\([^)]*\))?\s*-->/);
    if (dcgM) {
      dcgRules.push(dcgM[1]);
      continue;
    }

    // Rule: head :- body.
    const ruleM = trimmed.match(/^(\w+)(?:\s*\([^)]*\))?\s*:-/);
    if (ruleM && !trimmed.startsWith(':-')) {
      const name = ruleM[1];
      rules.push(name);
      if (!predicates.has(name)) predicates.set(name, { facts: 0, rules: 0 });
      predicates.get(name).rules++;
      continue;
    }

    // Fact: head. (simple term ending with period, no :-)
    // Must start with a lowercase letter or be a compound term
    const factM = trimmed.match(/^([a-z]\w*)(?:\s*\([^)]*\))?\s*\.$/);
    if (factM && !trimmed.includes(':-')) {
      const name = factM[1];
      // Skip directives
      if (name === 'use_module' || name === 'module' || name === 'discontiguous' || name === 'dynamic' || name === 'meta_predicate') continue;
      facts.push(name);
      if (!predicates.has(name)) predicates.set(name, { facts: 0, rules: 0 });
      predicates.get(name).facts++;
    }
  }

  return { moduleName, moduleExports, useModules, facts, rules, dcgRules, predicates };
}

function highlightProlog(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('%')) {
      result.push('<span class="pro-comment">' + esc(line) + '</span>');
      continue;
    }
    let out = '';
    let i = 0;
    while (i < line.length) {
      // Comment %
      if (line[i] === '%') {
        out += '<span class="pro-comment">' + esc(line.slice(i)) + '</span>';
        break;
      }
      // Operators :- and -->
      if (line.slice(i, i + 3) === '-->') {
        out += '<span class="pro-op">--&gt;</span>';
        i += 3;
        continue;
      }
      if (line.slice(i, i + 2) === ':-') {
        out += '<span class="pro-op">:-</span>';
        i += 2;
        continue;
      }
      // Variables (start with uppercase or _)
      if (/[A-Z_]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[\w]/.test(line[j])) j++;
        out += '<span class="pro-var">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Atoms/identifiers
      if (/[a-z]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[\w]/.test(line[j])) j++;
        const word = line.slice(i, j);
        const kws = new Set(['is', 'not', 'true', 'fail', 'false', 'assert', 'retract', 'functor', 'arg', 'copy_term', 'findall', 'bagof', 'setof', 'forall', 'aggregate_all', 'nl', 'write', 'writeln', 'format', 'read', 'atom', 'number', 'integer', 'float', 'string', 'var', 'nonvar', 'compound', 'callable']);
        if (kws.has(word)) {
          out += '<span class="pro-kw">' + esc(word) + '</span>';
        } else {
          out += '<span class="pro-atom">' + esc(word) + '</span>';
        }
        i = j;
        continue;
      }
      out += esc(line[i]);
      i++;
    }
    result.push(out);
  }
  return result.join('\n');
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'pro-section';
  const hd = document.createElement('div');
  hd.className = 'pro-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'pro-list';
  sec.appendChild(ul);
  return ul;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '');
  const isModule = text.includes(':-module(') || text.includes(':- module(');
  const { moduleName, moduleExports, useModules, facts, rules, dcgRules, predicates } = analyzeProlog(text);

  const host = document.createElement('div');
  host.className = 'pro-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'pro-title';
  const badge = document.createElement('span');
  badge.className = 'pro-badge';
  badge.textContent = isModule ? 'Prolog Module' : 'Prolog Script';
  title.appendChild(badge);
  title.appendChild(document.createTextNode(name));
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'pro-sub';
  const parts = [];
  if (moduleName) parts.push('module: ' + moduleName);
  parts.push(`${facts.length} fact${facts.length !== 1 ? 's' : ''}`);
  parts.push(`${rules.length} rule${rules.length !== 1 ? 's' : ''}`);
  if (dcgRules.length) parts.push(`${dcgRules.length} DCG rule${dcgRules.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'pro-cards';
  const cardItems = [
    { value: moduleName || '—', label: 'Module' },
    { value: predicates.size, label: 'Predicates' },
    { value: facts.length, label: 'Facts' },
    { value: rules.length, label: 'Rules' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'pro-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Module exports
  if (moduleExports.length > 0) {
    const sec = makeSection(host, `Module Exports (${moduleExports.length})`);
    const ul = makeList(sec);
    for (const exp of moduleExports) {
      const li = document.createElement('li');
      li.textContent = exp;
      ul.appendChild(li);
    }
  }

  // use_module
  if (useModules.length > 0) {
    const sec = makeSection(host, `use_module (${useModules.length})`);
    const ul = makeList(sec);
    for (const m of useModules) {
      const li = document.createElement('li');
      li.textContent = m;
      ul.appendChild(li);
    }
  }

  // Predicates grouped
  if (predicates.size > 0) {
    const sec = makeSection(host, `Predicates (${predicates.size})`);
    const ul = makeList(sec);
    for (const [pred, { facts: fc, rules: rc }] of predicates) {
      const li = document.createElement('li');
      if (fc > 0) {
        const tag = document.createElement('span');
        tag.className = 'pro-tag pro-tag-fact';
        tag.textContent = `${fc} fact${fc !== 1 ? 's' : ''}`;
        li.appendChild(tag);
        li.appendChild(document.createTextNode(' '));
      }
      if (rc > 0) {
        const tag = document.createElement('span');
        tag.className = 'pro-tag pro-tag-rule';
        tag.textContent = `${rc} rule${rc !== 1 ? 's' : ''}`;
        li.appendChild(tag);
        li.appendChild(document.createTextNode(' '));
      }
      li.appendChild(document.createTextNode(pred));
      ul.appendChild(li);
    }
  }

  // DCG rules
  if (dcgRules.length > 0) {
    const sec = makeSection(host, `DCG Rules (${dcgRules.length})`);
    const ul = makeList(sec);
    for (const dcg of dcgRules) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'pro-tag pro-tag-dcg';
      tag.textContent = 'DCG';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + dcg));
      ul.appendChild(li);
    }
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'pro-pre';
  pre.innerHTML = highlightProlog(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
