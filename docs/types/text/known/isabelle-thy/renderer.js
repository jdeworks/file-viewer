import { describeCollectionCap } from '../../../../core/collection-cap.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.isa-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.isa-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#8b5cf6;color:#fff;vertical-align:middle;margin-right:8px;}
.isa-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.isa-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.isa-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.isa-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.isa-card strong{display:block;font-size:1.2rem;font-weight:700;}
.isa-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.isa-section{margin:14px 0;}
.isa-section h3{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 6px;}
.isa-table{width:100%;border-collapse:collapse;font-size:13px;}
.isa-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);}
.isa-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.isa-table tr:last-child td{border-bottom:none;}
.isa-pills{display:flex;flex-wrap:wrap;gap:5px;}
.isa-pill{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;background:var(--bg-2,#f0f4fa);border:1px solid var(--border,#d0d7de);color:var(--fg,#374151);font-family:ui-monospace,monospace;}
.isa-method-bar{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;}
.isa-method{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:10px;font-size:11px;background:var(--bg-2,#f0f4fa);border:1px solid var(--border,#d0d7de);}
.isa-method-count{font-weight:700;font-size:12px;}
`;

function parseIsabelle(text) {
  const lines = (text || '').split(/\r?\n/);

  // Theory name: "theory <Name>"
  let theoryName = null;
  const theoryMatch = text.match(/\btheory\s+(\S+)/);
  if (theoryMatch) theoryName = theoryMatch[1];

  // Imports: "imports A B C"
  const imports = [];
  const importsMatch = text.match(/\bimports\s+([\s\S]*?)(?:\bbegin\b)/);
  if (importsMatch) {
    const raw = importsMatch[1].trim();
    // Each import is a token (may be quoted or bare)
    const tokens = raw.match(/"[^"]*"|[^\s"]+/g) || [];
    for (const t of tokens) imports.push(t.replace(/^"|"$/g, ''));
  }

  // Count lemmas, theorems, corollaries, definitions
  let lemmaCount = 0;
  let theoremCount = 0;
  let corollaryCount = 0;
  let definitionCount = 0;

  for (const line of lines) {
    const t = line.trim();
    if (/^lemma\b/.test(t)) lemmaCount++;
    else if (/^theorem\b/.test(t)) theoremCount++;
    else if (/^corollary\b/.test(t)) corollaryCount++;
    else if (/^definition\b/.test(t)) definitionCount++;
  }

  // Proof method distribution
  const methods = {};
  const proofMethodRe = /\bby\s+\(?([\w]+)/g;
  let m;
  while ((m = proofMethodRe.exec(text)) !== null) {
    const method = m[1];
    methods[method] = (methods[method] || 0) + 1;
  }
  // Also simple "by auto", "by simp" etc.
  const simpleByRe = /\bby\s+(auto|simp|blast|metis|arith|omega|linarith|lia|decide|tauto|intuition|trivial|assumption|contradiction|clarsimp|fastforce|force|ring|field_simps)\b/g;
  while ((m = simpleByRe.exec(text)) !== null) {
    const method = m[1];
    methods[method] = (methods[method] || 0) + 1;
  }
  // Sort by count descending
  const allSortedMethods = Object.entries(methods).sort((a, b) => b[1] - a[1]);
  const sortedMethods = allSortedMethods.slice(0, 8);
  const methodCap = describeCollectionCap(allSortedMethods, sortedMethods);

  return { theoryName, imports, lemmaCount, theoremCount, corollaryCount, definitionCount, sortedMethods, methodCap };
}

export function render(intake) {
  const parsed = parseIsabelle(intake.text || '');
  const { theoryName, imports, lemmaCount, theoremCount, corollaryCount, definitionCount, sortedMethods, methodCap } = parsed;

  const host = document.createElement('div');
  host.className = 'isa-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'isa-title';
  const badge = document.createElement('span');
  badge.className = 'isa-badge';
  badge.textContent = 'Isabelle/HOL';
  title.appendChild(badge);
  if (theoryName) {
    title.appendChild(document.createTextNode('Theory: ' + theoryName));
  } else {
    title.appendChild(document.createTextNode('Theory File'));
  }
  host.appendChild(title);

  const totalProofs = lemmaCount + theoremCount + corollaryCount;
  const sub = document.createElement('div');
  sub.className = 'isa-sub';
  const parts = [];
  if (totalProofs) parts.push(`${totalProofs} proof item${totalProofs !== 1 ? 's' : ''}`);
  if (definitionCount) parts.push(`${definitionCount} definition${definitionCount !== 1 ? 's' : ''}`);
  if (imports.length) parts.push(`${imports.length} import${imports.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'isa-summary';
  const cards = [
    { value: lemmaCount, label: 'Lemmas' },
    { value: theoremCount, label: 'Theorems' },
    { value: corollaryCount, label: 'Corollaries' },
    { value: definitionCount, label: 'Definitions' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'isa-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Imports
  if (imports.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'isa-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Imports';
    sec.appendChild(h3);
    const pills = document.createElement('div');
    pills.className = 'isa-pills';
    for (const imp of imports) {
      const p = document.createElement('span');
      p.className = 'isa-pill';
      p.textContent = imp;
      pills.appendChild(p);
    }
    sec.appendChild(pills);
    host.appendChild(sec);
  }

  // Proof methods
  if (sortedMethods.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'isa-section';
    const h3 = document.createElement('h3');
    h3.textContent = `Proof Methods (${methodCap.label})`;
    sec.appendChild(h3);
    const bar = document.createElement('div');
    bar.className = 'isa-method-bar';
    for (const [method, count] of sortedMethods) {
      const el = document.createElement('div');
      el.className = 'isa-method';
      const cnt = document.createElement('span');
      cnt.className = 'isa-method-count';
      cnt.textContent = count;
      const lbl = document.createElement('span');
      lbl.textContent = method;
      el.appendChild(cnt);
      el.appendChild(lbl);
      bar.appendChild(el);
    }
    sec.appendChild(bar);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
