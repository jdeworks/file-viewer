const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.r-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.r-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#276dc3;color:#fff;vertical-align:middle;margin-right:8px;}
.r-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.r-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.r-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.r-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.r-card strong{display:block;font-size:1.2rem;font-weight:700;}
.r-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.r-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.r-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.r-list{margin:0;padding:0;list-style:none;}
.r-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.r-list li:last-child{border-bottom:none;}
.r-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#dbeafe;color:#1d4ed8;font-weight:700;}
.r-lib{font-family:ui-monospace,monospace;font-size:12px;color:#276dc3;}
`;

function analyzeR(text) {
  const lines = text.split(/\r?\n/);
  const libraries = [];
  const functions = [];
  let assignCount = 0;
  let commentLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Comment lines
    if (trimmed.startsWith('#')) {
      commentLines++;
      continue;
    }

    // library() / require()
    const libM = trimmed.match(/^(?:library|require)\(\s*["']?(\w+)["']?/);
    if (libM) {
      const pkg = libM[1];
      if (!libraries.includes(pkg)) libraries.push(pkg);
    }

    // Function definitions: name <- function(...) or name = function(...)
    const funcM = trimmed.match(/^(\w+(?:\.\w+)*)\s*(?:<-|=)\s*function\s*\(/);
    if (funcM) {
      functions.push(funcM[1]);
    }

    // Count assignments (<-)
    const arrowMatches = (line.match(/<-/g) || []).length;
    assignCount += arrowMatches;
  }

  return { libraries, functions, assignCount, commentLines };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'r-section';
  const hd = document.createElement('div');
  hd.className = 'r-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'r-list';
  sec.appendChild(ul);
  return ul;
}

export async function render(intake) {
  const text = intake.text || '';
  const { libraries, functions, assignCount, commentLines } = analyzeR(text);

  const host = document.createElement('div');
  host.className = 'r-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'r-title';
  const badge = document.createElement('span');
  badge.className = 'r-badge';
  badge.textContent = 'R Script';
  title.appendChild(badge);
  host.appendChild(title);

  // Subtitle
  const sub = document.createElement('div');
  sub.className = 'r-sub';
  const parts = [];
  parts.push(`${libraries.length} librar${libraries.length !== 1 ? 'ies' : 'y'}`);
  parts.push(`${functions.length} function${functions.length !== 1 ? 's' : ''}`);
  parts.push(`${assignCount} assignment${assignCount !== 1 ? 's' : ''}`);
  if (commentLines > 0) parts.push(`${commentLines} comment line${commentLines !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'r-cards';
  const cardItems = [
    { value: libraries.length, label: 'Libraries' },
    { value: functions.length, label: 'Functions' },
    { value: assignCount, label: 'Assignments' },
    { value: commentLines, label: 'Comments' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'r-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Libraries
  if (libraries.length > 0) {
    const sec = makeSection(host, `Libraries (${libraries.length})`);
    const ul = makeList(sec);
    for (const lib of libraries) {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'r-lib';
      span.textContent = lib;
      li.appendChild(span);
      ul.appendChild(li);
    }
  }

  // Functions
  if (functions.length > 0) {
    const sec = makeSection(host, `Functions (${functions.length})`);
    const ul = makeList(sec);
    const MAX = 8;
    const shown = functions.slice(0, MAX);
    for (const fname of shown) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'r-tag';
      tag.textContent = 'fn';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + fname));
      ul.appendChild(li);
    }
    if (functions.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${functions.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  return { parentNode: host };
}
