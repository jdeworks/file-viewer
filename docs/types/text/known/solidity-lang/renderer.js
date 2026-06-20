const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
.sol-tag-priv{background:#fce7f3;color:#9d174d;}
.sol-tag-int{background:#f3e8ff;color:#7e22ce;}
.sol-tag-view{background:#dcfce7;color:#166534;}
.sol-tag-pure{background:#ecfdf5;color:#065f46;}
.sol-tag-payable{background:#fef3c7;color:#92400e;}
.sol-tag-event{background:#fce7f3;color:#9d174d;}
.sol-tag-error{background:#fee2e2;color:#991b1b;}
.sol-tag-modifier{background:#f0f9ff;color:#0c4a6e;}
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
  const hasSelfDestruct = /\bselfdestruct\s*\(/.test(text);

  // Pragma version
  const pragmaM = text.match(/pragma\s+solidity\s+([^;]+);/);
  if (pragmaM) pragmaVersion = pragmaM[1].trim();

  // SPDX license
  const spdxM = text.match(/\/\/\s*SPDX-License-Identifier:\s*(.+)/);
  if (spdxM) spdxLicense = spdxM[1].trim();

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('*')) continue;

    // Contract / interface / library declarations
    const contractM = t.match(/^(contract|interface|library)\s+(\w+)/);
    if (contractM) {
      contracts.push({ kind: contractM[1], name: contractM[2] });
      continue;
    }

    // State variables: visibility modifier + type + name
    // Patterns: uint256 public foo; address private owner; mapping(...) internal ...
    const varM = t.match(/^(?:mapping\s*\([^)]+\)|uint\d*|int\d*|address|bool|bytes\d*|string|bytes)\s+(public|private|internal|external)?\s*(\w+)\s*(?:=|;)/);
    if (varM) {
      const vis = varM[1] || 'internal';
      const name = varM[2];
      if (name && !['function', 'event', 'error', 'modifier', 'constructor'].includes(name)) {
        stateVars.push({ vis, name });
      }
      continue;
    }

    // Functions
    const fnM = t.match(/^function\s+(\w+)\s*\([^)]*\)\s*((?:(?:public|private|internal|external|view|pure|payable|virtual|override)\s+)*)/);
    if (fnM) {
      const name = fnM[1];
      const modStr = fnM[2] || '';
      const vis = ['public', 'private', 'internal', 'external'].find((v) => modStr.includes(v)) || 'internal';
      const mods = [];
      if (modStr.includes('view')) mods.push('view');
      if (modStr.includes('pure')) mods.push('pure');
      if (modStr.includes('payable')) mods.push('payable');
      functions.push({ name, vis, mods });
      continue;
    }

    // Events
    const evM = t.match(/^event\s+(\w+)\s*\(/);
    if (evM) { events.push(evM[1]); continue; }

    // Custom errors
    const errM = t.match(/^error\s+(\w+)\s*\(/);
    if (errM) { errors.push(errM[1]); continue; }

    // Modifiers
    const modM = t.match(/^modifier\s+(\w+)\s*\(/);
    if (modM) { modifiers.push(modM[1]); continue; }
  }

  // Determine badge
  const hasContract = contracts.some((c) => c.kind === 'contract');
  const hasInterface = contracts.some((c) => c.kind === 'interface');
  const hasLibrary = contracts.some((c) => c.kind === 'library');
  let badge = 'Smart Contract';
  if (!hasContract && hasInterface) badge = 'Interface';
  else if (!hasContract && !hasInterface && hasLibrary) badge = 'Library';

  return { pragmaVersion, spdxLicense, contracts, stateVars, functions, events, errors, modifiers, hasSelfDestruct, badge };
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
  return span;
}

export async function render(intake) {
  const text = intake.text || '';
  const { pragmaVersion, spdxLicense, contracts, stateVars, functions, events, errors, modifiers, hasSelfDestruct, badge } = parseSolidity(text);

  const host = document.createElement('div');
  host.className = 'sol-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

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
    for (const { kind, name } of contracts) {
      const li = document.createElement('li');
      const tagCls = kind === 'interface' ? 'sol-tag-interface' : kind === 'library' ? 'sol-tag-library' : 'sol-tag-contract';
      li.appendChild(makeTag(tagCls, kind));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // State variables
  if (stateVars.length > 0) {
    const MAX = 12;
    const shown = stateVars.slice(0, MAX);
    const sec = makeSection(host, `State Variables (${stateVars.length})`);
    const ul = makeList(sec);
    for (const { vis, name } of shown) {
      const li = document.createElement('li');
      const visCls = vis === 'public' ? 'sol-tag-pub' : vis === 'private' ? 'sol-tag-priv' : 'sol-tag-int';
      li.appendChild(makeTag(visCls, vis));
      li.appendChild(document.createTextNode(' ' + name));
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
    for (const { name, vis, mods } of functions) {
      const li = document.createElement('li');
      const visCls = vis === 'public' ? 'sol-tag-pub' : vis === 'private' ? 'sol-tag-priv' : vis === 'external' ? 'sol-tag-event' : 'sol-tag-int';
      li.appendChild(makeTag(visCls, vis));
      for (const mod of mods) {
        const modCls = mod === 'view' ? 'sol-tag-view' : mod === 'pure' ? 'sol-tag-pure' : 'sol-tag-payable';
        li.appendChild(document.createTextNode(' '));
        li.appendChild(makeTag(modCls, mod));
      }
      li.appendChild(document.createTextNode(' ' + name + '()'));
      ul.appendChild(li);
    }
  }

  // Events
  if (events.length > 0) {
    const sec = makeSection(host, `Events (${events.length})`);
    const ul = makeList(sec);
    for (const name of events) {
      const li = document.createElement('li');
      li.appendChild(makeTag('sol-tag-event', 'event'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Custom errors
  if (errors.length > 0) {
    const sec = makeSection(host, `Custom Errors (${errors.length})`);
    const ul = makeList(sec);
    for (const name of errors) {
      const li = document.createElement('li');
      li.appendChild(makeTag('sol-tag-error', 'error'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Modifiers
  if (modifiers.length > 0) {
    const sec = makeSection(host, `Modifiers (${modifiers.length})`);
    const ul = makeList(sec);
    for (const name of modifiers) {
      const li = document.createElement('li');
      li.appendChild(makeTag('sol-tag-modifier', 'modifier'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  return { parentNode: host };
}
