const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ttl-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ttl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0891b2;color:#fff;vertical-align:middle;margin-right:8px;}
.ttl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ttl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ttl-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.ttl-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.ttl-card strong{display:block;font-size:1.2rem;font-weight:700;}
.ttl-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.ttl-section{margin:16px 0;}
.ttl-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.ttl-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.ttl-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.ttl-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.ttl-table tr:last-child td{border-bottom:none;}
.ttl-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:14px;overflow:auto;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;margin-top:16px;white-space:pre-wrap;word-break:break-word;}
.ttl-kw{color:#0891b2;font-weight:700;}
.ttl-prefix-name{color:#0f6fba;font-weight:600;}
.ttl-uri{color:#059669;}
.ttl-literal{color:#b91c1c;}
.ttl-lang{color:#7c3aed;}
.ttl-comment{color:#888;font-style:italic;}
.ttl-type-a{color:#0891b2;font-weight:700;}
`;

function parseTurtle(text) {
  const lines = (text || '').split(/\r?\n/);

  // Prefixes
  const prefixes = [];
  for (const line of lines) {
    const m = line.match(/^\s*@prefix\s+(\S*)\s*:\s*<([^>]*)>/i);
    if (m) prefixes.push({ name: m[1] + ':', uri: m[2] });
  }

  // Subjects — lines that start with <uri> or prefix:name not preceded by whitespace (rough)
  const subjects = new Set();
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('@')) continue;
    // Subject is the first term on a line that starts a new statement (not continuing with ; or ,)
    const subjectMatch = t.match(/^(<[^>]+>|[\w-]+:[\w-]+|\[\s*\]|_:[\w-]+)/);
    if (subjectMatch && !t.startsWith(';') && !t.startsWith(',')) {
      subjects.add(subjectMatch[1]);
    }
  }

  // Triple count (rough): count lines with a predicate-object pair
  let tripleCount = 0;
  let classCount = 0;
  let propertyCount = 0;

  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('@')) continue;
    // If line has a predicate-like term
    if (/[^\s]+\s+[^\s]+/.test(t)) tripleCount++;
    // Class definition: rdf:type owl:Class or a owl:Class
    if (/\ba\s+owl:Class\b/.test(t) || /rdf:type\s+owl:Class/.test(t) || /a\s+rdfs:Class/.test(t)) classCount++;
    // Property definition
    if (/a\s+owl:ObjectProperty|a\s+owl:DatatypeProperty|a\s+rdf:Property/.test(t)) propertyCount++;
  }

  return { prefixes, subjectCount: subjects.size, tripleCount: Math.max(0, tripleCount - prefixes.length), classCount, propertyCount };
}

function highlightTurtle(text) {
  const lines = text.split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('#')) {
      result.push(`<span class="ttl-comment">${esc(line)}</span>`);
      continue;
    }

    let out = esc(line);

    // Literals with language tags "..."@lang
    out = out.replace(/(&quot;[^&]*&quot;)@([\w-]+)/g, '<span class="ttl-literal">$1</span><span class="ttl-lang">@$2</span>');
    // Literals
    out = out.replace(/(&quot;[^&]*&quot;)/g, '<span class="ttl-literal">$1</span>');
    // URIs
    out = out.replace(/(&lt;[^&]*&gt;)/g, '<span class="ttl-uri">$1</span>');
    // @prefix and @base keywords
    out = out.replace(/@(prefix|base|forAll|forSome)\b/gi, '<span class="ttl-kw">@$1</span>');
    // Standalone `a` (rdf:type shorthand) — word boundary, not part of a prefixed name
    out = out.replace(/(?<=\s|^|\.|;|,)\ba\b(?=\s)/g, '<span class="ttl-type-a">a</span>');

    result.push(out);
  }

  return result.join('\n');
}

export function render(intake) {
  const parsed = parseTurtle(intake.text || '');
  const { prefixes, subjectCount, tripleCount, classCount, propertyCount } = parsed;

  const host = document.createElement('div');
  host.className = 'ttl-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'ttl-title';
  title.innerHTML = '<span class="ttl-badge">Turtle RDF</span>RDF Document';
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'ttl-sub';
  const parts = [`${prefixes.length} prefix${prefixes.length !== 1 ? 'es' : ''}`, `${subjectCount} subject${subjectCount !== 1 ? 's' : ''}`, `~${tripleCount} triple${tripleCount !== 1 ? 's' : ''}`];
  if (classCount) parts.push(`${classCount} class${classCount !== 1 ? 'es' : ''}`);
  if (propertyCount) parts.push(`${propertyCount} propert${propertyCount !== 1 ? 'ies' : 'y'}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'ttl-summary';
  const cards = [
    { value: prefixes.length, label: 'Prefixes' },
    { value: subjectCount, label: 'Subjects' },
    { value: tripleCount, label: 'Triples (est.)' },
    { value: classCount, label: 'OWL Classes' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'ttl-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Prefix table
  if (prefixes.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'ttl-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Namespace Prefixes';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'ttl-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Prefix</th><th>Namespace URI</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const { name, uri } of prefixes) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><span class="ttl-prefix-name">${esc(name)}</span></td><td>${esc(uri)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Syntax-highlighted source
  const pre = document.createElement('pre');
  pre.className = 'ttl-pre';
  pre.innerHTML = highlightTurtle(intake.text || '');
  host.appendChild(pre);

  return { parentNode: host };
}
