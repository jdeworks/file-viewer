const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.kka-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.kka-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.kka-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.kka-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.kka-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.kka-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.kka-card strong{display:block;font-size:1.2rem;font-weight:700;}
.kka-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.kka-section{margin:16px 0;}
.kka-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.kka-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.kka-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.kka-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.kka-table tr:last-child td{border-bottom:none;}
.kka-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:14px;overflow:auto;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;margin-top:16px;white-space:pre-wrap;word-break:break-word;}
.kka-kw{color:#7c3aed;font-weight:700;}
.kka-str{color:#b91c1c;}
.kka-comment{color:#888;font-style:italic;}
.kka-type{color:#0f766e;}
`;

function parseKoka(text) {
  const lines = (text || '').split(/\r?\n/);
  let moduleName = '';
  const effects = [];
  const funs = [];
  const handlers = [];
  const vals = [];

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('//')) continue;

    // module name
    const modMatch = t.match(/^module\s+(\S+)/);
    if (modMatch && !moduleName) moduleName = modMatch[1];

    // effect definitions
    const effectMatch = t.match(/^(?:pub\s+)?effect\s+(\w+)/);
    if (effectMatch) effects.push(effectMatch[1]);

    // fun definitions
    const funMatch = t.match(/^(?:pub\s+)?fun\s+(\w+)\s*[(<]/);
    if (funMatch) funs.push(funMatch[1]);

    // with handlers
    if (/^\s*with\s+/.test(line)) handlers.push(t.slice(0, 60));

    // val declarations
    const valMatch = t.match(/^(?:pub\s+)?val\s+(\w+)/);
    if (valMatch) vals.push(valMatch[1]);
  }

  return { moduleName, effects, funs, handlers, vals };
}

function highlightKoka(text) {
  const KWS = ['fun', 'effect', 'handle', 'with', 'val', 'module', 'import', 'pub', 'return', 'if', 'then', 'else', 'match', 'forall', 'exists', 'type', 'alias', 'struct', 'con', 'fn', 'resume'];
  const lines = text.split(/\r?\n/);
  return lines.map(line => {
    const ciIdx = line.indexOf('//');
    if (ciIdx >= 0) {
      return highlightKokaLine(line.slice(0, ciIdx), KWS) + `<span class="kka-comment">${esc(line.slice(ciIdx))}</span>`;
    }
    return highlightKokaLine(line, KWS);
  }).join('\n');
}

function highlightKokaLine(line, KWS) {
  let out = esc(line);
  out = out.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, '<span class="kka-str">$1</span>');
  out = out.replace(/\b([A-Z]\w*)\b/g, '<span class="kka-type">$1</span>');
  const sorted = [...KWS].sort((a, b) => b.length - a.length);
  for (const kw of sorted) {
    const re = new RegExp(`(?<![\\w])(${kw})(?![\\w])`, 'g');
    out = out.replace(re, '<span class="kka-kw">$1</span>');
  }
  return out;
}

export function render(intake) {
  const { moduleName, effects, funs, handlers, vals } = parseKoka(intake.text || '');

  const host = document.createElement('div');
  host.className = 'kka-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'kka-title';
  title.innerHTML = `<span class="kka-badge">Koka</span>${esc(moduleName || 'Source File')}`;
  host.appendChild(title);

  const parts = [`${funs.length} fun`];
  if (effects.length) parts.push(`${effects.length} effect${effects.length !== 1 ? 's' : ''}`);
  if (handlers.length) parts.push(`${handlers.length} handler${handlers.length !== 1 ? 's' : ''}`);
  if (vals.length) parts.push(`${vals.length} val${vals.length !== 1 ? 's' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'kka-sub';
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'kka-summary';
  const cards = [
    { value: funs.length, label: 'Functions' },
    { value: effects.length, label: 'Effects' },
    { value: handlers.length, label: 'Handlers' },
    { value: vals.length, label: 'Vals' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'kka-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Effects section
  if (effects.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'kka-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Effect Definitions';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'kka-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Effect</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of effects.slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Functions section
  if (funs.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'kka-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Function Definitions';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'kka-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Function</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of funs.slice(0, 40)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Source
  const pre = document.createElement('pre');
  pre.className = 'kka-pre';
  pre.innerHTML = highlightKoka(intake.text || '');
  host.appendChild(pre);

  return { parentNode: host };
}
