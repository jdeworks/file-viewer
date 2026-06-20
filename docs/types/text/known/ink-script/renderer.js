const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ink-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ink-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a1a2e;color:#e0b0ff;vertical-align:middle;margin-right:8px;}
.ink-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ink-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ink-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.ink-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.ink-card strong{display:block;font-size:1.2rem;font-weight:700;}
.ink-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.ink-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.ink-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.ink-list{margin:0;padding:0;list-style:none;}
.ink-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.ink-list li:last-child{border-bottom:none;}
.ink-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e0e7ff;color:#3730a3;font-weight:700;}
.ink-tag-var{background:#fce7f3;color:#9d174d;}
.ink-tag-stitch{background:#dcfce7;color:#166534;}
.ink-tag-fn{background:#fef3c7;color:#92400e;}
.ink-tag-inc{background:#f0fdf4;color:#15803d;}
`;

function analyzeInk(text) {
  const lines = text.split(/\r?\n/);
  const knots = [];
  const stitches = [];
  const variables = [];
  const includes = [];
  const functions = [];
  let choiceCount = 0;
  let divertCount = 0;
  let tempCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) continue;

    // INCLUDE
    const incM = trimmed.match(/^INCLUDE\s+(.+)/);
    if (incM) { includes.push(incM[1].trim()); continue; }

    // VAR declaration
    const varM = trimmed.match(/^VAR\s+(\w+)\s*=\s*(.+)/);
    if (varM) { variables.push({ name: varM[1], value: varM[2].trim() }); continue; }

    // === function === (must check before knot)
    const fnM = trimmed.match(/^===\s*function\s+(\w+)\s*(?:\(([^)]*)\))?\s*===/);
    if (fnM) { functions.push({ name: fnM[1], params: fnM[2] || '' }); continue; }

    // === knot_name ===
    const knotM = trimmed.match(/^===\s*([\w]+)\s*===/);
    if (knotM) { knots.push(knotM[1]); continue; }

    // = stitch_name
    const stitchM = trimmed.match(/^=\s+([\w]+)\s*$/);
    if (stitchM) { stitches.push(stitchM[1]); continue; }

    // Choices: * or +
    if (/^\*+\s/.test(trimmed) || /^\++\s/.test(trimmed)) { choiceCount++; }

    // Diverts: ->
    const divertMatches = trimmed.match(/->/g);
    if (divertMatches) divertCount += divertMatches.length;

    // Temp vars: ~
    if (/^~\s+temp\s+\w+/.test(trimmed)) tempCount++;
  }

  return { knots, stitches, variables, includes, functions, choiceCount, divertCount, tempCount };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'ink-section';
  const hd = document.createElement('div');
  hd.className = 'ink-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'ink-list';
  sec.appendChild(ul);
  return ul;
}

function makeTag(cls, text) {
  const tag = document.createElement('span');
  tag.className = `ink-tag ${cls}`;
  tag.textContent = text;
  return tag;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const { knots, stitches, variables, includes, functions, choiceCount, divertCount, tempCount } = analyzeInk(text);

  const host = document.createElement('div');
  host.className = 'ink-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'ink-title';
  title.innerHTML = '<span class="ink-badge">Ink Story</span>';
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'ink-sub';
  const parts = [
    `${knots.length} knot${knots.length !== 1 ? 's' : ''}`,
    `${choiceCount} choice${choiceCount !== 1 ? 's' : ''}`,
    `${divertCount} divert${divertCount !== 1 ? 's' : ''}`,
  ];
  if (variables.length) parts.push(`${variables.length} variable${variables.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'ink-cards';
  const cardItems = [
    { value: knots.length, label: 'Knots' },
    { value: stitches.length, label: 'Stitches' },
    { value: choiceCount, label: 'Choices' },
    { value: divertCount, label: 'Diverts' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'ink-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // INCLUDEs
  if (includes.length > 0) {
    const sec = makeSection(host, `Includes (${includes.length})`);
    const ul = makeList(sec);
    for (const file of includes) {
      const li = document.createElement('li');
      li.appendChild(makeTag('ink-tag-inc', 'INCLUDE'));
      li.appendChild(document.createTextNode(' ' + file));
      ul.appendChild(li);
    }
  }

  // Knots
  if (knots.length > 0) {
    const MAX = 20;
    const sec = makeSection(host, `Knots (${knots.length})`);
    const ul = makeList(sec);
    for (const name of knots.slice(0, MAX)) {
      const li = document.createElement('li');
      li.appendChild(makeTag('ink-tag', '==='));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
    if (knots.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${knots.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Stitches
  if (stitches.length > 0) {
    const MAX = 15;
    const sec = makeSection(host, `Stitches (${stitches.length})`);
    const ul = makeList(sec);
    for (const name of stitches.slice(0, MAX)) {
      const li = document.createElement('li');
      li.appendChild(makeTag('ink-tag-stitch', '='));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
    if (stitches.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${stitches.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Variables
  if (variables.length > 0) {
    const sec = makeSection(host, `Variables (${variables.length})`);
    const ul = makeList(sec);
    for (const { name, value } of variables) {
      const li = document.createElement('li');
      li.appendChild(makeTag('ink-tag-var', 'VAR'));
      li.appendChild(document.createTextNode(` ${name} = ${value}`));
      ul.appendChild(li);
    }
  }

  // Functions
  if (functions.length > 0) {
    const sec = makeSection(host, `Functions (${functions.length})`);
    const ul = makeList(sec);
    for (const { name, params } of functions) {
      const li = document.createElement('li');
      li.appendChild(makeTag('ink-tag-fn', 'function'));
      li.appendChild(document.createTextNode(` ${name}(${params})`));
      ul.appendChild(li);
    }
  }

  // Stats
  if (tempCount > 0 || choiceCount > 0 || divertCount > 0) {
    const sec = makeSection(host, 'Story Statistics');
    const ul = makeList(sec);
    const statsItems = [
      { label: 'Choices (* / +)', value: choiceCount },
      { label: 'Diverts (->)', value: divertCount },
      { label: 'Temp vars (~)', value: tempCount },
    ];
    for (const { label, value } of statsItems) {
      if (value === 0) continue;
      const li = document.createElement('li');
      li.textContent = `${label}: ${value}`;
      ul.appendChild(li);
    }
  }

  return { parentNode: host };
}
