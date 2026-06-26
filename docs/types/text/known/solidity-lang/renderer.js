import { chip, ensureKnownUiStyle, esc, issueList, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

const CSS = `
.sol-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sol-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#627eea;color:#fff;vertical-align:middle;margin-right:6px;}
.sol-badge-warn{background:#dc2626;}
.sol-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sol-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.sol-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.sol-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.sol-card strong{display:block;font-size:1.2rem;font-weight:700;}
.sol-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.sol-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.sol-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.sol-list{margin:0;padding:0;list-style:none;}
.sol-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.sol-list li:last-child{border-bottom:none;}
.sol-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.sol-tag-contract{background:#dbeafe;color:#1e40af;}
.sol-tag-interface{background:#dcfce7;color:#166534;}
.sol-tag-library{background:#fef9c3;color:#854d0e;}
.sol-tag-pub{background:#e0f2fe;color:#0369a1;}
.sol-tag-ext{background:#e0f2fe;color:#075985;}
.sol-tag-priv{background:#fce7f3;color:#9d174d;}
.sol-tag-int{background:#f3e8ff;color:#7e22ce;}
.sol-tag-view{background:#dcfce7;color:#166534;}
.sol-tag-pure{background:#ecfdf5;color:#065f46;}
.sol-tag-payable{background:#fef3c7;color:#92400e;}
.sol-tag-event{background:#fce7f3;color:#9d174d;}
.sol-tag-error{background:#fee2e2;color:#991b1b;}
.sol-tag-modifier{background:#f0f9ff;color:#0c4a6e;}
.sol-sig{font-family:ui-monospace,monospace;white-space:normal;overflow-wrap:anywhere;}
.sol-doc-note{font-family:system-ui,sans-serif;color:var(--fg-2,#5a6678);font-size:12px;flex-basis:100%;}
.sol-source-keyword{color:#627eea;font-weight:700;}
.sol-source-type{color:#1e40af;font-weight:600;}
.sol-source-string{color:#b45309;}
.sol-source-comment{color:var(--fg-2,#6e7681);font-style:italic;}
`;

function parseSolidity(text) {
  const lines = text.split(/\r?\n/);

  let pragmaVersion = null;
  let spdxLicense = null;
  const contracts = [];
  const stateVars = [];
  const functions = [];
  const events = [];
  const errors = [];
  const modifiers = [];
  const issues = [];
  const hasSelfDestruct = /\bselfdestruct\s*\(/.test(text);
  let pendingDocs = [];

  // Pragma version
  const pragmaM = text.match(/pragma\s+solidity\s+([^;]+);/);
  if (pragmaM) pragmaVersion = pragmaM[1].trim();

  // SPDX license
  const spdxM = text.match(/\/\/\s*SPDX-License-Identifier:\s*(.+)/);
  if (spdxM) spdxLicense = spdxM[1].trim();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (t.startsWith('///')) {
      pendingDocs.push(t.replace(/^\/\/\/\s?/, ''));
      continue;
    }
    if (t.startsWith('//') || t.startsWith('*')) continue;

    // Contract / interface / library declarations
    const contractM = t.match(/^(contract|interface|library)\s+(\w+)/);
    if (contractM) {
      contracts.push({ kind: contractM[1], name: contractM[2], line: i + 1, docs: docsText(pendingDocs) });
      pendingDocs = [];
      continue;
    }

    // State variables: visibility modifier + type + name
    // Patterns: uint256 public foo; address private owner; mapping(...) internal ...
    const varM = t.match(/^(?:mapping\s*\([^)]+\)|uint\d*|int\d*|address|bool|bytes\d*|string|bytes)\s+(public|private|internal|external)?\s*(\w+)\s*(?:=|;)/);
    if (varM) {
      const vis = varM[1] || 'internal';
      const name = varM[2];
      if (name && !['function', 'event', 'error', 'modifier', 'constructor'].includes(name)) {
        stateVars.push({ vis, name, type: variableType(t), line: i + 1 });
      }
      continue;
    }

    // Functions
    const fnM = t.match(/^function\s+(\w+)\s*\(([^)]*)\)\s*([^{};]*)/);
    if (fnM) {
      const name = fnM[1];
      const modStr = fnM[3] || '';
      const vis = ['public', 'private', 'internal', 'external'].find((v) => modStr.includes(v)) || 'internal';
      const mods = [];
      if (modStr.includes('view')) mods.push('view');
      if (modStr.includes('pure')) mods.push('pure');
      if (modStr.includes('payable')) mods.push('payable');
      const returns = (modStr.match(/returns\s*\(([^)]*)\)/)?.[1] || '').trim();
      const customModifiers = modStr.replace(/\b(public|private|internal|external|view|pure|payable|virtual|override)\b/g, '').replace(/returns\s*\([^)]*\)/g, '').trim().split(/\s+/).filter(Boolean);
      functions.push({
        name,
        vis,
        mods,
        customModifiers,
        params: splitParams(fnM[2]),
        returns: splitParams(returns),
        signature: t.replace(/\s*\{\s*$/, ''),
        line: i + 1,
        docs: docsText(pendingDocs),
      });
      pendingDocs = [];
      continue;
    }

    const ctorM = t.match(/^constructor\s*\(([^)]*)\)\s*([^{};]*)/);
    if (ctorM) {
      functions.push({
        name: 'constructor',
        vis: 'constructor',
        mods: [],
        customModifiers: [],
        params: splitParams(ctorM[1]),
        returns: [],
        signature: t.replace(/\s*\{\s*$/, ''),
        line: i + 1,
        docs: docsText(pendingDocs),
      });
      pendingDocs = [];
      continue;
    }

    // Events
    const evM = t.match(/^event\s+(\w+)\s*\(([^)]*)\)/);
    if (evM) { events.push({ name: evM[1], params: splitParams(evM[2]), line: i + 1 }); continue; }

    // Custom errors
    const errM = t.match(/^error\s+(\w+)\s*\(([^)]*)\)/);
    if (errM) { errors.push({ name: errM[1], params: splitParams(errM[2]), line: i + 1 }); continue; }

    // Modifiers
    const modM = t.match(/^modifier\s+(\w+)\s*\(([^)]*)\)?/);
    if (modM) { modifiers.push({ name: modM[1], params: splitParams(modM[2] || ''), line: i + 1 }); continue; }
  }

  if (hasSelfDestruct) issues.push({ severity: 'warning', label: 'selfdestruct', message: 'Contract contains selfdestruct; review upgrade and fund-loss implications.' });
  for (const fn of functions) {
    if (fn.mods.includes('payable')) issues.push({ severity: 'info', label: 'payable', line: fn.line, message: `${fn.name} can receive native currency.` });
    if (/\bdelegatecall\b/.test(fn.signature)) issues.push({ severity: 'warning', label: 'delegatecall', line: fn.line, message: `${fn.name} uses delegatecall; review storage-layout and trust assumptions.` });
  }

  // Determine badge
  const hasContract = contracts.some((c) => c.kind === 'contract');
  const hasInterface = contracts.some((c) => c.kind === 'interface');
  const hasLibrary = contracts.some((c) => c.kind === 'library');
  let badge = 'Smart Contract';
  if (!hasContract && hasInterface) badge = 'Interface';
  else if (!hasContract && !hasInterface && hasLibrary) badge = 'Library';

  return { pragmaVersion, spdxLicense, contracts, stateVars, functions, events, errors, modifiers, hasSelfDestruct, badge, issues };
}

function docsText(lines) {
  return lines.map((line) => line.replace(/^@(title|notice|dev|author)\s*/i, '')).join(' ').replace(/\s+/g, ' ').trim();
}

function splitParams(text) {
  if (!text) return [];
  return String(text).split(',').map((s) => s.trim()).filter(Boolean);
}

function variableType(line) {
  return line.replace(/\s*(public|private|internal|external)\s+\w+.*$/, '').trim();
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'sol-section';
  const hd = document.createElement('div');
  hd.className = 'sol-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'sol-list';
  sec.appendChild(ul);
  return ul;
}

function makeTag(cls, text) {
  const span = document.createElement('span');
  span.className = 'sol-tag ' + cls;
  span.textContent = text;
  span.title = tagHint(text);
  return span;
}

function tagHint(text) {
  const hints = {
    contract: 'Deployable Solidity contract.',
    interface: 'ABI contract surface without implementation.',
    library: 'Reusable code library.',
    public: 'Callable externally and internally.',
    external: 'Callable from other contracts/accounts, not internally without this.',
    private: 'Callable only within this contract.',
    internal: 'Callable within this contract and derived contracts.',
    view: 'Reads state but should not modify it.',
    pure: 'Does not read or modify contract state.',
    payable: 'Can receive native currency.',
    event: 'Indexed log emitted for off-chain consumers.',
    error: 'Custom revert error; cheaper and typed compared to revert strings.',
    modifier: 'Reusable pre/post-condition wrapper for functions.',
  };
  return hints[text] || '';
}

function addDocs(li, docs) {
  if (!docs) return;
  const span = document.createElement('span');
  span.className = 'sol-doc-note';
  span.textContent = docs;
  li.appendChild(span);
}

function highlightSolidityLine(line) {
  if (/^\s*(\/\/|\/\*|\*)/.test(line)) return `<span class="sol-source-comment">${esc(line)}</span>`;
  let out = esc(line);
  out = out.replace(/&quot;[^&]*?&quot;/g, '<span class="sol-source-string">$&</span>');
  out = out.replace(/\b(pragma|solidity|contract|interface|library|event|error|modifier|constructor|function|returns|public|private|internal|external|view|pure|payable|return|revert|require|emit|mapping)\b/g, '<span class="sol-source-keyword">$1</span>');
  out = out.replace(/\b(uint256|address|bool|string|memory|indexed)\b/g, '<span class="sol-source-type">$1</span>');
  return out;
}

export async function render(intake) {
  const text = intake.text || '';
  const { pragmaVersion, spdxLicense, contracts, stateVars, functions, events, errors, modifiers, hasSelfDestruct, badge, issues } = parseSolidity(text);

  const host = document.createElement('div');
  host.className = 'sol-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);
  ensureKnownUiStyle(host);

  // Title row
  const title = document.createElement('div');
  title.className = 'sol-title';
  const badgeEl = document.createElement('span');
  badgeEl.className = 'sol-badge';
  badgeEl.textContent = badge;
  title.appendChild(badgeEl);
  if (hasSelfDestruct) {
    const warnEl = document.createElement('span');
    warnEl.className = 'sol-badge sol-badge-warn';
    warnEl.textContent = '⚠️ Contains selfdestruct';
    title.appendChild(warnEl);
  }
  host.appendChild(title);

  // Sub line
  const sub = document.createElement('div');
  sub.className = 'sol-sub';
  const parts = [];
  if (pragmaVersion) parts.push('solidity ' + pragmaVersion);
  if (spdxLicense) parts.push('SPDX: ' + spdxLicense);
  parts.push(`${contracts.length} definition${contracts.length !== 1 ? 's' : ''}`);
  parts.push(`${functions.length} function${functions.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const cards = document.createElement('div');
  cards.className = 'sol-cards';
  const cardItems = [
    { value: pragmaVersion || '—', label: 'Version' },
    { value: contracts.length, label: 'Definitions' },
    { value: functions.length, label: 'Functions' },
    { value: events.length, label: 'Events' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'sol-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Contracts / interfaces / libraries
  if (contracts.length > 0) {
    const sec = makeSection(host, `Definitions (${contracts.length})`);
    const ul = makeList(sec);
    for (const { kind, name, line, docs } of contracts) {
      const li = document.createElement('li');
      const tagCls = kind === 'interface' ? 'sol-tag-interface' : kind === 'library' ? 'sol-tag-library' : 'sol-tag-contract';
      li.appendChild(makeTag(tagCls, kind));
      li.appendChild(sourceButton(name, line, 'Open definition in source'));
      addDocs(li, docs);
      ul.appendChild(li);
    }
  }

  // State variables
  if (stateVars.length > 0) {
    const MAX = 12;
    const shown = stateVars.slice(0, MAX);
    const sec = makeSection(host, `State Variables (${stateVars.length})`);
    const ul = makeList(sec);
    for (const { vis, name, type, line } of shown) {
      const li = document.createElement('li');
      const visCls = vis === 'public' ? 'sol-tag-pub' : vis === 'private' ? 'sol-tag-priv' : 'sol-tag-int';
      li.appendChild(makeTag(visCls, vis));
      li.appendChild(sourceButton(name, line, 'Open state variable in source'));
      li.appendChild(chip(type, 'muted'));
      ul.appendChild(li);
    }
    if (stateVars.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${stateVars.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Functions
  if (functions.length > 0) {
    const sec = makeSection(host, `Functions (${functions.length})`);
    const ul = makeList(sec);
    for (const fn of functions) {
      const li = document.createElement('li');
      const visCls = fn.vis === 'public' ? 'sol-tag-pub' : fn.vis === 'private' ? 'sol-tag-priv' : fn.vis === 'external' ? 'sol-tag-ext' : 'sol-tag-int';
      li.appendChild(makeTag(visCls, fn.vis));
      for (const mod of fn.mods) {
        const modCls = mod === 'view' ? 'sol-tag-view' : mod === 'pure' ? 'sol-tag-pure' : 'sol-tag-payable';
        li.appendChild(document.createTextNode(' '));
        li.appendChild(makeTag(modCls, mod));
      }
      for (const mod of fn.customModifiers) li.appendChild(chip(mod, 'info', 'Custom modifier applied to this function.'));
      li.appendChild(sourceButton(fn.name, fn.line, 'Open function in source'));
      li.appendChild(chip(`arity ${fn.params.length}`, 'muted'));
      if (fn.returns.length) li.appendChild(chip(`returns ${fn.returns.join(', ')}`, 'info'));
      const sig = document.createElement('span');
      sig.className = 'sol-sig';
      sig.textContent = fn.signature;
      li.appendChild(sig);
      for (const param of fn.params) li.appendChild(chip(param, 'muted', 'ABI parameter from the function signature.'));
      addDocs(li, fn.docs);
      ul.appendChild(li);
    }
  }

  // Events
  if (events.length > 0) {
    const sec = makeSection(host, `Events (${events.length})`);
    const ul = makeList(sec);
    for (const item of events) {
      const li = document.createElement('li');
      li.appendChild(makeTag('sol-tag-event', 'event'));
      li.appendChild(sourceButton(item.name, item.line, 'Open event in source'));
      li.appendChild(chip(`${item.params.length} field${item.params.length !== 1 ? 's' : ''}`, 'muted'));
      for (const param of item.params) li.appendChild(chip(param, /indexed/.test(param) ? 'info' : 'muted', 'Event parameter.'));
      ul.appendChild(li);
    }
  }

  // Custom errors
  if (errors.length > 0) {
    const sec = makeSection(host, `Custom Errors (${errors.length})`);
    const ul = makeList(sec);
    for (const item of errors) {
      const li = document.createElement('li');
      li.appendChild(makeTag('sol-tag-error', 'error'));
      li.appendChild(sourceButton(item.name, item.line, 'Open custom error in source'));
      li.appendChild(chip(`${item.params.length} arg${item.params.length !== 1 ? 's' : ''}`, 'muted'));
      for (const param of item.params) li.appendChild(chip(param, 'muted', 'Custom error argument.'));
      ul.appendChild(li);
    }
  }

  // Modifiers
  if (modifiers.length > 0) {
    const sec = makeSection(host, `Modifiers (${modifiers.length})`);
    const ul = makeList(sec);
    for (const item of modifiers) {
      const li = document.createElement('li');
      li.appendChild(makeTag('sol-tag-modifier', 'modifier'));
      li.appendChild(sourceButton(item.name, item.line, 'Open modifier in source'));
      li.appendChild(chip(`${item.params.length} param${item.params.length !== 1 ? 's' : ''}`, 'muted'));
      ul.appendChild(li);
    }
  }

  const issueEl = issueList(issues, { title: 'Review Notes' });
  if (issueEl) host.appendChild(issueEl);

  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'sol-line', highlighter: highlightSolidityLine }));
  wireSourceLinks(host, { idPrefix: 'sol-line' });

  return { parentNode: host };
}
