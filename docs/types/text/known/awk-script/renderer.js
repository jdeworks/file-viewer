const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.awk-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.awk-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2d6a4f;color:#fff;vertical-align:middle;margin-right:8px;}
.awk-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.awk-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.awk-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.awk-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:100px;}
.awk-card strong{display:block;font-size:1.2rem;font-weight:700;}
.awk-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.awk-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.awk-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.awk-list{margin:0;padding:0;list-style:none;}
.awk-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.awk-list li:last-child{border-bottom:none;}
.awk-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#d1fae5;color:#065f46;font-weight:700;}
.awk-tag-pattern{background:#fef3c7;color:#92400e;}
.awk-tag-func{background:#ede9fe;color:#5b21b6;}
.awk-tag-var{background:#e0f2fe;color:#0369a1;}
.awk-pill{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f1f5f9);border:1px solid var(--border,#cbd5e1);font-family:ui-monospace,monospace;margin:2px 2px;}
.awk-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
`;

function analyzeAwk(text) {
  const lines = text.split(/\r?\n/);
  let hasBegin = false;
  let hasEnd = false;
  let ruleCount = 0;
  const functions = [];
  const fieldSeps = [];
  let printCount = 0;
  let printfCount = 0;
  let getlineCount = 0;
  let pipeCount = 0;
  let isGawk = false;

  // Check gawk-specific features
  if (/\bgensub\s*\(/.test(text) || /\bPROCINFO\b/.test(text) || /\bpatsplit\s*\(/.test(text) || /\bgensub\b/.test(text)) {
    isGawk = true;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // BEGIN block
    if (/^\s*BEGIN\s*\{/.test(line)) { hasBegin = true; }
    // END block
    if (/^\s*END\s*\{/.test(line)) { hasEnd = true; }

    // Function definitions: function name(params)
    const funcM = trimmed.match(/^function\s+(\w+)\s*\(/);
    if (funcM) {
      functions.push(funcM[1]);
      continue;
    }

    // Pattern-action rules (not BEGIN/END/function)
    // A rule is a line at top-level starting a pattern or action
    const ruleM = trimmed.match(/^(\/[^/]+\/|"[^"]*"|[^{]+)?\s*\{/);
    if (ruleM && !/^\s*(BEGIN|END|function)\b/.test(trimmed)) {
      ruleCount++;
    }

    // FS/OFS/RS/ORS assignments
    const fsM = trimmed.match(/\b(FS|OFS|RS|ORS)\s*=/);
    if (fsM) fieldSeps.push(fsM[1]);

    // print/printf counts
    const printMatches = (trimmed.match(/\bprint\b/g) || []).length;
    const printfMatches = (trimmed.match(/\bprintf\b/g) || []).length;
    printCount += printMatches;
    printfCount += printfMatches;

    // getline usage
    if (/\bgetline\b/.test(trimmed)) getlineCount++;

    // pipe usage (| in print context or input)
    if (/\|/.test(trimmed)) pipeCount++;
  }

  return { hasBegin, hasEnd, ruleCount, functions, fieldSeps: [...new Set(fieldSeps)], printCount, printfCount, getlineCount, pipeCount, isGawk };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'awk-section';
  const hd = document.createElement('div');
  hd.className = 'awk-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'awk-list';
  sec.appendChild(ul);
  return ul;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();
  const { hasBegin, hasEnd, ruleCount, functions, fieldSeps, printCount, printfCount, getlineCount, pipeCount, isGawk } = analyzeAwk(text);

  const host = document.createElement('div');
  host.className = 'awk-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'awk-title';
  const badgeLabel = isGawk ? 'GAWK Script' : 'AWK Script';
  title.innerHTML = `<span class="awk-badge">${esc(badgeLabel)}</span>${esc(name)}`;
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'awk-sub';
  const parts = [];
  if (hasBegin) parts.push('BEGIN block');
  if (hasEnd) parts.push('END block');
  parts.push(`${ruleCount} rule${ruleCount !== 1 ? 's' : ''}`);
  if (functions.length) parts.push(`${functions.length} function${functions.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'awk-cards';
  const cardItems = [
    { value: ruleCount, label: 'Rules' },
    { value: functions.length, label: 'Functions' },
    { value: printCount + printfCount, label: 'print calls' },
    { value: pipeCount, label: 'Pipes' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'awk-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Field separators
  if (fieldSeps.length > 0) {
    const sec = makeSection(host, `Field/Record Separators (${fieldSeps.length})`);
    const ul = makeList(sec);
    for (const sep of fieldSeps) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'awk-tag awk-tag-var';
      tag.textContent = sep;
      li.appendChild(tag);
      ul.appendChild(li);
    }
  }

  // Functions
  if (functions.length > 0) {
    const sec = makeSection(host, `Functions (${functions.length})`);
    const ul = makeList(sec);
    for (const fn of functions) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'awk-tag awk-tag-func';
      tag.textContent = 'function';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + fn));
      ul.appendChild(li);
    }
  }

  // Features
  const features = [];
  if (hasBegin) features.push('BEGIN block');
  if (hasEnd) features.push('END block');
  if (getlineCount > 0) features.push(`getline (${getlineCount}×)`);
  if (pipeCount > 0) features.push(`pipes (${pipeCount}×)`);
  if (printfCount > 0) features.push(`printf (${printfCount}×)`);
  if (isGawk) features.push('gawk extensions');

  if (features.length > 0) {
    const sec = makeSection(host, 'Features');
    const wrapper = document.createElement('div');
    wrapper.style.padding = '10px 14px';
    for (const feat of features) {
      const pill = document.createElement('span');
      pill.className = 'awk-pill';
      pill.textContent = feat;
      wrapper.appendChild(pill);
    }
    sec.appendChild(wrapper);
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'awk-pre';
  pre.textContent = text;
  srcSec.appendChild(pre);

  return { parentNode: host };
}
