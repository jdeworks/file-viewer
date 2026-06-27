const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cob-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.cob-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1e3a5f;color:#fff;vertical-align:middle;margin-right:8px;}
.cob-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cob-prog{font-family:ui-monospace,monospace;font-size:14px;color:#1e3a5f;font-weight:700;}
.cob-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.cob-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.cob-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.cob-card strong{display:block;font-size:1.2rem;font-weight:700;}
.cob-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.cob-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.cob-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.cob-list{margin:0;padding:0;list-style:none;}
.cob-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.cob-list li:last-child{border-bottom:none;}
.cob-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.cob-tag-div{background:#dbeafe;color:#1e40af;}
.cob-tag-section{background:#f3e8ff;color:#7e22ce;}
.cob-tag-para{background:#dcfce7;color:#166534;}
.cob-tag-file{background:#fef3c7;color:#92400e;}
.cob-tag-fd{background:#fde68a;color:#78350f;}
.cob-tag-lvl{background:#fce7f3;color:#9d174d;}
.cob-name{font-weight:600;color:#1e3a5f;}
.cob-filler{font-weight:600;color:#94a3b8;font-style:italic;}
.cob-pic{color:#0369a1;}
.cob-type{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;background:#e0f2fe;color:#0369a1;}
.cob-type-numeric{background:#dcfce7;color:#166534;}
.cob-type-decimal{background:#cffafe;color:#0e7490;}
.cob-type-alphanumeric{background:#e0e7ff;color:#3730a3;}
.cob-type-alphabetic{background:#fef9c3;color:#854d0e;}
.cob-type-edited{background:#ffe4e6;color:#9f1239;}
.cob-usage{color:#7c3aed;font-style:italic;}
.cob-val{color:#9d174d;}
.cob-meta{padding:10px 14px;font-size:13px;}
.cob-meta-row{display:flex;gap:8px;margin-bottom:4px;}
.cob-meta-label{color:var(--fg-2,#888);min-width:110px;font-size:12px;}
.cob-muted{color:var(--fg-2,#888);}
`;

const DIVISIONS = ['IDENTIFICATION', 'ENVIRONMENT', 'DATA', 'PROCEDURE'];
// COBOL reserved words that introduce structure, never user paragraph names.
const RESERVED_PARA = /^(IDENTIFICATION|ENVIRONMENT|DATA|PROCEDURE|CONFIGURATION|INPUT-OUTPUT|FILE|WORKING-STORAGE|LOCAL-STORAGE|LINKAGE|REPORT|SCREEN|FILE-CONTROL|SOURCE-COMPUTER|OBJECT-COMPUTER|SPECIAL-NAMES|PROGRAM-ID|AUTHOR|DATE-WRITTEN|DATE-COMPILED|INSTALLATION|SECURITY|REMARKS)$/i;

// Strip COBOL fixed-format gutters: cols 1-6 = sequence numbers, col 7 = indicator
// (* or / = comment, - = continuation, D = debug). Returns null for comment lines.
// Free-format source (no 6-char numeric/blank gutter) is passed through untouched.
function stripFixed(line) {
  let code = line;
  if (line.length >= 7 && /^[\d\s]{6}$/.test(line.slice(0, 6))) {
    const ind = line[6];
    if (ind === '*' || ind === '/') return null;            // comment line
    code = line.slice(7);                                    // drop gutter + indicator col
  }
  // Free-format inline comment marker `*>` and `*` at very start of a line.
  const trimmed = code.trimStart();
  if (trimmed.startsWith('*>') || trimmed.startsWith('*')) return null;
  return code.replace(/\*>.*$/, '');                          // strip trailing inline comment
}

// Infer a human type from a COBOL PICTURE string. PIC 9 = numeric, X = alphanumeric,
// A = alphabetic; V/decimal point => decimal; edit symbols (Z $ * , B 0 / + CR DB) => edited.
function picType(pic) {
  if (!pic) return '';
  const p = pic.toUpperCase();
  if (/[Z$*,BCRD+/]/.test(p.replace(/[X9AVSP()0-9.]/g, '')) || /[Z$*]/.test(p)) {
    // editing chars present alongside digits → edited numeric
    if (/[9Z$*]/.test(p)) return 'edited';
  }
  if (/[9]/.test(p)) return (/[V.]/.test(p)) ? 'decimal' : 'numeric';
  if (/X/.test(p)) return 'alphanumeric';
  if (/A/.test(p)) return 'alphabetic';
  return 'group';
}

// Parse a single normalized data-description line: "05 EMP-NAME PIC X(30) VALUE 'X'."
function parseDataItem(t) {
  const m = t.match(/^(\d{1,2})\s+([A-Z0-9][\w-]*)\b\s*(.*)$/i);
  if (!m) return null;
  const level = parseInt(m[1], 10);
  const name = m[2];
  const rest = m[3] || '';
  const picM = rest.match(/\bPIC(?:TURE)?\s+(?:IS\s+)?([X9AVSP()0-9.,/Z$*+\-BCRD]+)/i);
  const pic = picM ? picM[1].replace(/\.$/, '') : '';   // drop trailing statement terminator
  const usageM = rest.match(/\b(COMP-[1-6]|COMPUTATIONAL-?[1-6]?|COMP|BINARY|PACKED-DECIMAL|DISPLAY|INDEX)\b/i);
  const usage = usageM ? usageM[1].toUpperCase().replace('COMPUTATIONAL', 'COMP') : '';
  const valM = rest.match(/\bVALUE\s+(?:IS\s+)?('[^']*'|"[^"]*"|[\w.+-]+)/i);
  const value = valM ? valM[1].replace(/^(?!['"]).*?\.$/, (s) => s.slice(0, -1)) : '';
  const redefines = /\bREDEFINES\b/i.test(rest);
  const occurs = (rest.match(/\bOCCURS\s+(\d+)/i) || [])[1] || '';
  return { level, name, pic, type: picType(pic), usage, value, redefines, occurs };
}

// Parse COBOL source into DOM-free structured facts. Exported (pure) for unit testing.
export function analyzeCobol(text) {
  const rawLines = String(text || '').split(/\r?\n/);

  let programId = null, author = null, dateWritten = null;
  const divisions = [];
  const sections = [];        // PROCEDURE DIVISION sections {name}
  const paragraphs = [];      // PROCEDURE paragraph names
  const dataItems = [];       // {level,name,pic,type,usage,value,...}
  const files = [];           // {name, assign, kind:'SELECT'|'FD'}

  let curDiv = null;          // current DIVISION
  let dataSub = null;         // FILE | WORKING-STORAGE | LINKAGE | LOCAL-STORAGE
  const seenSel = new Set();

  for (const raw of rawLines) {
    const code = stripFixed(raw);
    if (code == null) continue;
    const t = code.trim();
    if (!t) continue;

    // Division boundaries
    let hitDiv = false;
    for (const d of DIVISIONS) {
      if (new RegExp(`^${d}\\s+DIVISION\\b`, 'i').test(t)) {
        if (!divisions.includes(d)) divisions.push(d);
        curDiv = d;
        dataSub = null;
        hitDiv = true;
        break;
      }
    }
    if (hitDiv) continue;

    if (curDiv === 'IDENTIFICATION') {
      const pid = t.match(/^PROGRAM-ID\b[.\s]+([A-Z0-9][\w-]*)/i);
      if (pid && !programId) programId = pid[1];
      const au = t.match(/^AUTHOR\b[.\s]+(.+)/i);
      if (au && !author) author = au[1].replace(/\.\s*$/, '').trim();
      const dw = t.match(/^DATE-WRITTEN\b[.\s]+(.+)/i);
      if (dw && !dateWritten) dateWritten = dw[1].replace(/\.\s*$/, '').trim();
      continue;
    }

    if (curDiv === 'ENVIRONMENT') {
      const sel = t.match(/^SELECT\s+([A-Z0-9][\w-]*)\b(?:.*\bASSIGN\s+(?:TO\s+)?('[^']*'|"[^"]*"|[A-Z0-9][\w-]*))?/i);
      if (sel && !seenSel.has(sel[1].toUpperCase())) {
        seenSel.add(sel[1].toUpperCase());
        files.push({ name: sel[1], assign: (sel[2] || '').replace(/^['"]|['"]$/g, ''), kind: 'SELECT' });
      }
      continue;
    }

    if (curDiv === 'DATA') {
      const sub = t.match(/^(FILE|WORKING-STORAGE|LOCAL-STORAGE|LINKAGE|REPORT|SCREEN)\s+SECTION\b/i);
      if (sub) { dataSub = sub[1].toUpperCase(); continue; }
      const fd = t.match(/^(?:FD|SD)\s+([A-Z0-9][\w-]*)/i);
      if (fd) {
        const ex = files.find((f) => f.name.toUpperCase() === fd[1].toUpperCase() && f.kind === 'FD');
        if (!ex) files.push({ name: fd[1], assign: '', kind: 'FD' });
        continue;
      }
      const item = parseDataItem(t);
      if (item) { item.section = dataSub || 'DATA'; dataItems.push(item); }
      continue;
    }

    if (curDiv === 'PROCEDURE') {
      // Section: "NAME SECTION."
      const secM = t.match(/^([A-Z][A-Z0-9-]*)\s+SECTION\s*\.?\s*$/i);
      if (secM && !RESERVED_PARA.test(secM[1])) { sections.push({ name: secM[1] }); continue; }
      // Paragraph: a label alone on a line ending with a period.
      const paraM = t.match(/^([A-Z][A-Z0-9-]*)\s*\.\s*$/i);
      if (paraM && !RESERVED_PARA.test(paraM[1]) && !/^END-/i.test(paraM[1]) && !/\bSECTION\b/i.test(t)) {
        if (!paragraphs.includes(paraM[1])) paragraphs.push(paraM[1]);
      }
    }
  }

  return { programId, author, dateWritten, divisions, sections, paragraphs, dataItems, files };
}

// ---- rendering helpers (mirror ada-lang) ----
function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'cob-section';
  const hd = document.createElement('div');
  hd.className = 'cob-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'cob-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="cob-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }

function dataItemHtml(d) {
  const lvl = tag('cob-tag-lvl', String(d.level).padStart(2, '0'));
  const isFiller = /^FILLER$/i.test(d.name);
  const name = isFiller ? `<span class="cob-filler">FILLER</span>` : `<span class="cob-name">${esc(d.name)}</span>`;
  const pic = d.pic ? ` <span class="cob-pic">PIC ${esc(d.pic)}</span>` : '';
  const type = d.type && d.type !== 'group' ? ` <span class="cob-type cob-type-${d.type}">${esc(d.type)}</span>` : '';
  const usage = d.usage && d.usage !== 'DISPLAY' ? ` <span class="cob-usage">${esc(d.usage)}</span>` : '';
  const occurs = d.occurs ? ` <span class="cob-muted">OCCURS ${esc(d.occurs)}</span>` : '';
  const value = d.value ? ` <span class="cob-val">= ${esc(d.value)}</span>` : '';
  const redef = d.redefines ? ` <span class="cob-muted">REDEFINES</span>` : '';
  return `${lvl} ${name}${pic}${type}${usage}${occurs}${redef}${value}`;
}

function metaRow(meta, label, value) {
  const r = document.createElement('div');
  r.className = 'cob-meta-row';
  const l = document.createElement('span');
  l.className = 'cob-meta-label';
  l.textContent = label;
  r.appendChild(l);
  r.appendChild(document.createTextNode(value));
  meta.appendChild(r);
}

export async function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
  const isCopybook = filename.endsWith('.cpy');

  if (!/DIVISION/i.test(text.slice(0, 4000)) && !/\bPIC(?:TURE)?\b/i.test(text.slice(0, 4000))) return null;

  const { programId, author, dateWritten, divisions, sections, paragraphs, dataItems, files } = analyzeCobol(text);

  const host = document.createElement('div');
  host.className = 'cob-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'cob-title';
  const badge = document.createElement('span');
  badge.className = 'cob-badge';
  badge.textContent = isCopybook ? 'COBOL Copybook' : 'COBOL Program';
  title.appendChild(badge);
  if (programId) { const n = document.createElement('span'); n.className = 'cob-prog'; n.textContent = programId; title.appendChild(n); }
  host.appendChild(title);

  // Subtitle
  const sub = document.createElement('div');
  sub.className = 'cob-sub';
  sub.textContent = [
    `${divisions.length} division${divisions.length !== 1 ? 's' : ''}`,
    dataItems.length && `${dataItems.length} data item${dataItems.length !== 1 ? 's' : ''}`,
    paragraphs.length && `${paragraphs.length} paragraph${paragraphs.length !== 1 ? 's' : ''}`,
    files.length && `${files.length} file${files.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'cob-cards';
  for (const { value, label } of [
    { value: divisions.length, label: 'Divisions' },
    { value: dataItems.length, label: 'Data Items' },
    { value: paragraphs.length, label: 'Paragraphs' },
    { value: sections.length, label: 'Sections' },
    { value: files.length, label: 'Files' },
  ]) {
    const card = document.createElement('div');
    card.className = 'cob-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  // Program info
  if (programId || author || dateWritten) {
    const sec = makeSection(host, 'Program Information');
    const meta = document.createElement('div');
    meta.className = 'cob-meta';
    if (programId) metaRow(meta, 'PROGRAM-ID', programId);
    if (author) metaRow(meta, 'AUTHOR', author);
    if (dateWritten) metaRow(meta, 'DATE-WRITTEN', dateWritten);
    sec.appendChild(meta);
  }

  // Divisions
  if (divisions.length) {
    const ul = makeList(makeSection(host, `Divisions (${divisions.length})`));
    for (const d of DIVISIONS) {
      const present = divisions.includes(d);
      row(ul, `${tag('cob-tag-div', 'DIVISION')} ${esc(d)}` + (present ? '' : ` <span class="cob-muted">(absent)</span>`));
    }
  }

  // Files (SELECT + FD)
  if (files.length) {
    const ul = makeList(makeSection(host, `Files (${files.length})`));
    for (const f of files) {
      const cls = f.kind === 'FD' ? 'cob-tag-fd' : 'cob-tag-file';
      const assign = f.assign ? ` <span class="cob-val">→ ${esc(f.assign)}</span>` : '';
      row(ul, `${tag(cls, f.kind)} <span class="cob-name">${esc(f.name)}</span>${assign}`);
    }
  }

  // Data items, grouped by data section, capped for very large records.
  if (dataItems.length) {
    const MAX = 40;
    const sec = makeSection(host, `Data Items (${dataItems.length})`);
    const ul = makeList(sec);
    let shownGroup = null;
    for (const d of dataItems.slice(0, MAX)) {
      if (d.section !== shownGroup) {
        shownGroup = d.section;
        row(ul, `<span class="cob-muted">— ${esc(d.section)} SECTION —</span>`);
      }
      row(ul, dataItemHtml(d));
    }
    if (dataItems.length > MAX) row(ul, `<span class="cob-muted">… and ${dataItems.length - MAX} more</span>`);
  }

  // Procedure sections
  if (sections.length) {
    const ul = makeList(makeSection(host, `Procedure Sections (${sections.length})`));
    for (const s of sections) row(ul, `${tag('cob-tag-section', 'SECTION')} <span class="cob-name">${esc(s.name)}</span>`);
  }

  // Paragraphs
  if (paragraphs.length) {
    const ul = makeList(makeSection(host, `Paragraphs (${paragraphs.length})`));
    for (const p of paragraphs) row(ul, `${tag('cob-tag-para', 'PARA')} <span class="cob-name">${esc(p)}</span>`);
  }

  return { parentNode: host };
}
