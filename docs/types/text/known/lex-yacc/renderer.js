const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ly-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ly-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;color:#fff;vertical-align:middle;margin-right:8px;}
.ly-badge-lex{background:#0369a1;}
.ly-badge-yacc{background:#be185d;}
.ly-badge-both{background:#6d28d9;}
.ly-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ly-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ly-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.ly-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:100px;}
.ly-card strong{display:block;font-size:1.2rem;font-weight:700;}
.ly-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.ly-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.ly-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.ly-list{margin:0;padding:0;list-style:none;}
.ly-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.ly-list li:last-child{border-bottom:none;}
.ly-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.ly-tag-tok{background:#dbeafe;color:#1d4ed8;}
.ly-tag-rule{background:#fce7f3;color:#be185d;}
.ly-tag-state{background:#fef3c7;color:#92400e;}
.ly-tag-type{background:#d1fae5;color:#065f46;}
.ly-tag-opt{background:#e0f2fe;color:#0369a1;}
.ly-pill{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f1f5f9);border:1px solid var(--border,#cbd5e1);font-family:ui-monospace,monospace;margin:2px 2px;}
.ly-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
`;

function analyzeLexYacc(text, filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const isYacc = ['y', 'yy', 'ypp', 'yacc'].includes(ext);
  const isLex = ['l', 'll', 'lex'].includes(ext);

  const lines = text.split(/\r?\n/);

  const tokens = [];
  const rules = [];
  const states = [];
  const types = [];
  const options = [];
  let hasUnion = false;
  let hasProlog = false;
  let hasPrologue = false;
  let precedences = 0;
  let sectionIdx = 0; // which %% section we're in
  let headerLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '%%') { sectionIdx++; continue; }
    if (trimmed.startsWith('%{')) { hasProlog = true; }

    // %token declarations
    const tokenM = trimmed.match(/^%token\s+(<\w+>)?\s*(.*)/);
    if (tokenM) {
      const toks = tokenM[2].trim().split(/\s+/).filter((t) => /^[A-Z_][A-Z0-9_]*$/.test(t));
      tokens.push(...toks);
      continue;
    }

    // %type
    const typeM = trimmed.match(/^%type\s+<(\w+)>\s*(.*)/);
    if (typeM) {
      const names = typeM[2].trim().split(/\s+/).filter(Boolean);
      for (const n of names) types.push({ type: typeM[1], name: n });
      continue;
    }

    // %union
    if (/^%union\s*\{/.test(trimmed)) { hasUnion = true; continue; }

    // %left, %right, %nonassoc, %precedence
    if (/^%(left|right|nonassoc|precedence)\b/.test(trimmed)) { precedences++; continue; }

    // %s, %x — start conditions/states
    const stateM = trimmed.match(/^%[sx]\s+(.*)/);
    if (stateM) {
      const s = stateM[1].trim().split(/\s+/).filter(Boolean);
      states.push(...s);
      continue;
    }

    // %option (lex)
    const optM = trimmed.match(/^%option\s+(.*)/);
    if (optM) {
      options.push(...optM[1].trim().split(/\s+/).filter(Boolean));
      continue;
    }

    // In the first section (definitions), count grammar rules in yacc (non-terminal: production)
    // Grammar rules appear in section 1 for yacc; in lex section 1 = patterns
    if (sectionIdx === 1) {
      // Yacc grammar rule: starts with identifier followed by ':'
      const grammarM = trimmed.match(/^([a-z_][a-zA-Z0-9_]*)\s*:/);
      if (grammarM && isYacc) {
        rules.push(grammarM[1]);
      }
      // Lex pattern rule: non-empty, non-directive line
      if (isLex && !trimmed.startsWith('%') && trimmed.length > 0 && !trimmed.startsWith('/*')) {
        rules.push(trimmed.split(/\s/)[0].slice(0, 30));
      }
    }
  }

  // Determine mode
  let mode;
  if (isYacc) mode = 'yacc';
  else if (isLex) mode = 'lex';
  else {
    // Heuristic: tokens + grammar rules → yacc; pattern rules → lex
    mode = tokens.length > 0 || hasUnion ? 'yacc' : 'lex';
  }

  return { mode, tokens, rules, states, types, options, hasUnion, hasPrologue: hasProlog, precedences };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'ly-section';
  const hd = document.createElement('div');
  hd.className = 'ly-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'ly-list';
  sec.appendChild(ul);
  return ul;
}

export function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop();
  const { mode, tokens, rules, states, types, options, hasUnion, hasPrologue, precedences } = analyzeLexYacc(text, filename);

  const host = document.createElement('div');
  host.className = 'ly-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'ly-title';
  let badgeClass = 'ly-badge-lex';
  let badgeText = 'Lex/Flex';
  if (mode === 'yacc') { badgeClass = 'ly-badge-yacc'; badgeText = 'Yacc/Bison'; }
  title.innerHTML = `<span class="ly-badge ${badgeClass}">${badgeText}</span>${esc(filename)}`;
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'ly-sub';
  const parts = [];
  if (mode === 'yacc') {
    parts.push(`${tokens.length} token${tokens.length !== 1 ? 's' : ''}`);
    parts.push(`${rules.length} rule${rules.length !== 1 ? 's' : ''}`);
    if (precedences) parts.push(`${precedences} precedence declaration${precedences !== 1 ? 's' : ''}`);
  } else {
    parts.push(`${rules.length} lex rule${rules.length !== 1 ? 's' : ''}`);
    if (states.length) parts.push(`${states.length} start condition${states.length !== 1 ? 's' : ''}`);
  }
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'ly-cards';
  const cardItems = mode === 'yacc'
    ? [
        { value: tokens.length, label: 'Tokens' },
        { value: rules.length, label: 'Grammar rules' },
        { value: types.length, label: 'Typed symbols' },
        { value: precedences, label: 'Precedences' },
      ]
    : [
        { value: rules.length, label: 'Lex rules' },
        { value: states.length, label: 'Start states' },
        { value: options.length, label: 'Options' },
      ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'ly-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Tokens (yacc)
  if (tokens.length > 0) {
    const MAX = 30;
    const shown = tokens.slice(0, MAX);
    const extra = tokens.length - shown.length;
    const sec = makeSection(host, `Tokens (${tokens.length})`);
    const wrapper = document.createElement('div');
    wrapper.style.padding = '10px 14px';
    for (const tok of shown) {
      const pill = document.createElement('span');
      pill.className = 'ly-pill';
      pill.textContent = tok;
      wrapper.appendChild(pill);
    }
    if (extra > 0) {
      const more = document.createElement('span');
      more.style.cssText = 'font-size:11px;color:var(--fg-2,#888);margin-left:4px;';
      more.textContent = `+${extra} more`;
      wrapper.appendChild(more);
    }
    sec.appendChild(wrapper);
  }

  // Grammar rules (yacc)
  if (mode === 'yacc' && rules.length > 0) {
    const MAX = 20;
    const shown = rules.slice(0, MAX);
    const extra = rules.length - shown.length;
    const sec = makeSection(host, `Grammar Rules (${rules.length})`);
    const ul = makeList(sec);
    for (const rule of shown) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'ly-tag ly-tag-rule';
      tag.textContent = 'rule';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + rule));
      ul.appendChild(li);
    }
    if (extra > 0) {
      const li = document.createElement('li');
      li.textContent = `… and ${extra} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Start states (lex)
  if (states.length > 0) {
    const sec = makeSection(host, `Start Conditions (${states.length})`);
    const ul = makeList(sec);
    for (const s of states) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'ly-tag ly-tag-state';
      tag.textContent = 'state';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + s));
      ul.appendChild(li);
    }
  }

  // Options (lex)
  if (options.length > 0) {
    const sec = makeSection(host, `%option (${options.length})`);
    const wrapper = document.createElement('div');
    wrapper.style.padding = '10px 14px';
    for (const opt of options) {
      const pill = document.createElement('span');
      pill.className = 'ly-pill';
      pill.textContent = opt;
      wrapper.appendChild(pill);
    }
    sec.appendChild(wrapper);
  }

  // Features
  const features = [];
  if (hasPrologue) features.push('%{ prolog %}');
  if (hasUnion) features.push('%union');
  if (precedences > 0) features.push(`${precedences} precedence rule${precedences !== 1 ? 's' : ''}`);
  if (features.length > 0) {
    const sec = makeSection(host, 'Features');
    const wrapper = document.createElement('div');
    wrapper.style.padding = '10px 14px';
    for (const f of features) {
      const pill = document.createElement('span');
      pill.className = 'ly-pill';
      pill.textContent = f;
      wrapper.appendChild(pill);
    }
    sec.appendChild(wrapper);
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'ly-pre';
  pre.textContent = text;
  srcSec.appendChild(pre);

  return { parentNode: host };
}
