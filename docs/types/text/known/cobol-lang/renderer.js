const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cob-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.cob-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1e3a5f;color:#fff;vertical-align:middle;margin-right:6px;}
.cob-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cob-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.cob-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.cob-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
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
.cob-tag-pic{background:#e0f2fe;color:#0369a1;}
.cob-tag-ws{background:#fce7f3;color:#9d174d;}
.cob-meta{padding:10px 14px;font-size:13px;}
.cob-meta-row{display:flex;gap:8px;margin-bottom:4px;}
.cob-meta-label{color:var(--fg-2,#888);min-width:100px;font-size:12px;}
`;

function parseCOBOL(text) {
  // COBOL is case-insensitive
  const lines = text.split(/\r?\n/);

  let programId = null;
  let author = null;
  let dateWritten = null;
  const divisions = [];
  const sections = [];
  let paragraphCount = 0;
  const workingStorageVars = [];
  const fileAssignments = [];

  const divisionNames = ['IDENTIFICATION', 'ENVIRONMENT', 'DATA', 'PROCEDURE'];

  let inWorkingStorage = false;
  let inProcedure = false;
  let inIdentification = false;

  for (const line of lines) {
    // Fixed-format COBOL: columns 7-72 contain code; column 7 is indicator
    // Free-format: no column restrictions
    // We handle both by stripping sequence numbers and processing the rest
    let codePart = line;
    // If line is long enough and columns 1-6 look like sequence numbers (digits or spaces), skip them
    if (line.length >= 7) {
      const prefix = line.slice(0, 6);
      if (/^[\d\s]{6}$/.test(prefix)) {
        codePart = line.slice(6);
      }
    }
    const t = codePart.trim();

    // Skip comments (* or / in column 7)
    if (codePart.length > 0 && (codePart[0] === '*' || codePart[0] === '/')) continue;
    if (t.startsWith('*')) continue;

    // Division detection
    for (const div of divisionNames) {
      if (new RegExp(`\\b${div}\\s+DIVISION\\b`, 'i').test(t)) {
        if (!divisions.includes(div)) divisions.push(div);
        inWorkingStorage = false;
        inProcedure = div === 'PROCEDURE';
        inIdentification = div === 'IDENTIFICATION';
        break;
      }
    }

    // PROGRAM-ID
    const progM = t.match(/PROGRAM-ID[.\s]+(\S+)/i);
    if (progM && !programId) {
      programId = progM[1].replace(/\.$/, '').trim();
    }

    // AUTHOR
    const authM = t.match(/^\s*AUTHOR[.\s]+(.+)/i);
    if (authM && !author) author = authM[1].trim().replace(/\.$/, '');

    // DATE-WRITTEN
    const dateM = t.match(/^\s*DATE-WRITTEN[.\s]+(.+)/i);
    if (dateM && !dateWritten) dateWritten = dateM[1].trim().replace(/\.$/, '');

    // WORKING-STORAGE SECTION
    if (/WORKING-STORAGE\s+SECTION/i.test(t)) {
      inWorkingStorage = true;
    }

    // Working storage variables (01, 05, 10, 77 level numbers)
    if (inWorkingStorage) {
      const wsM = t.match(/^\s*(\d{1,2})\s+(\S+)\s+PIC/i);
      if (wsM) {
        const level = parseInt(wsM[1]);
        const name = wsM[2];
        const picM = t.match(/PIC(?:TURE)?\s+(?:IS\s+)?([\w()]+)/i);
        const pic = picM ? picM[1] : '';
        workingStorageVars.push({ level, name, pic });
      }
    }

    // FILE SECTION SELECT assignments
    const selectM = t.match(/^\s*SELECT\s+(\S+)\s+ASSIGN/i);
    if (selectM) fileAssignments.push(selectM[1]);

    // PROCEDURE DIVISION sections
    if (inProcedure) {
      const secM = t.match(/^\s*(\S+(?:\s+\S+)?)\s+SECTION\s*\./i);
      if (secM && !/WORKING-STORAGE|FILE|LINKAGE|LOCAL-STORAGE/i.test(secM[1])) {
        sections.push(secM[1].trim());
      }
      // Paragraphs: lines ending with a period that look like paragraph names
      const paraM = t.match(/^([A-Z][A-Z0-9-]*)\s*\.\s*$/i);
      if (paraM && !sections.includes(paraM[1])) {
        paragraphCount++;
      }
    }
  }

  // Determine type
  const filename = (text.__filename || '');

  return { programId, author, dateWritten, divisions, sections, paragraphCount, workingStorageVars, fileAssignments };
}

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

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'cob-list';
  sec.appendChild(ul);
  return ul;
}

function makeTag(cls, text) {
  const span = document.createElement('span');
  span.className = 'cob-tag ' + cls;
  span.textContent = text;
  return span;
}

export async function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
  const isCopybook = filename.endsWith('.cpy');

  const { programId, author, dateWritten, divisions, sections, paragraphCount, workingStorageVars, fileAssignments } = parseCOBOL(text);

  const host = document.createElement('div');
  host.className = 'cob-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'cob-title';
  const badgeEl = document.createElement('span');
  badgeEl.className = 'cob-badge';
  badgeEl.textContent = isCopybook ? 'COBOL Copybook' : 'COBOL Program';
  title.appendChild(badgeEl);
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'cob-sub';
  const parts = [];
  if (programId) parts.push('PROGRAM-ID: ' + programId);
  parts.push(`${divisions.length} division${divisions.length !== 1 ? 's' : ''}`);
  if (workingStorageVars.length) parts.push(`${workingStorageVars.length} WS variable${workingStorageVars.length !== 1 ? 's' : ''}`);
  if (paragraphCount) parts.push(`${paragraphCount} paragraph${paragraphCount !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'cob-cards';
  const cardItems = [
    { value: programId || '—', label: 'Program-ID' },
    { value: divisions.length, label: 'Divisions' },
    { value: workingStorageVars.length, label: 'WS Vars' },
    { value: paragraphCount, label: 'Paragraphs' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'cob-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Metadata (author / date)
  if (author || dateWritten) {
    const sec = makeSection(host, 'Program Information');
    const meta = document.createElement('div');
    meta.className = 'cob-meta';
    if (programId) {
      const row = document.createElement('div');
      row.className = 'cob-meta-row';
      const label = document.createElement('span');
      label.className = 'cob-meta-label';
      label.textContent = 'PROGRAM-ID';
      row.appendChild(label);
      row.appendChild(document.createTextNode(programId));
      meta.appendChild(row);
    }
    if (author) {
      const row = document.createElement('div');
      row.className = 'cob-meta-row';
      const label = document.createElement('span');
      label.className = 'cob-meta-label';
      label.textContent = 'AUTHOR';
      row.appendChild(label);
      row.appendChild(document.createTextNode(author));
      meta.appendChild(row);
    }
    if (dateWritten) {
      const row = document.createElement('div');
      row.className = 'cob-meta-row';
      const label = document.createElement('span');
      label.className = 'cob-meta-label';
      label.textContent = 'DATE-WRITTEN';
      row.appendChild(label);
      row.appendChild(document.createTextNode(dateWritten));
      meta.appendChild(row);
    }
    sec.appendChild(meta);
  }

  // Divisions detected
  if (divisions.length > 0) {
    const sec = makeSection(host, `Divisions (${divisions.length})`);
    const ul = makeList(sec);
    for (const div of divisions) {
      const li = document.createElement('li');
      li.appendChild(makeTag('cob-tag-div', 'DIVISION'));
      li.appendChild(document.createTextNode(' ' + div));
      ul.appendChild(li);
    }
  }

  // File assignments
  if (fileAssignments.length > 0) {
    const sec = makeSection(host, `File Assignments (${fileAssignments.length})`);
    const ul = makeList(sec);
    for (const name of fileAssignments) {
      const li = document.createElement('li');
      li.appendChild(makeTag('cob-tag-file', 'SELECT'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Working Storage variables
  if (workingStorageVars.length > 0) {
    const MAX = 15;
    const shown = workingStorageVars.slice(0, MAX);
    const sec = makeSection(host, `WORKING-STORAGE Variables (${workingStorageVars.length})`);
    const ul = makeList(sec);
    for (const { level, name, pic } of shown) {
      const li = document.createElement('li');
      const lvlTag = document.createElement('span');
      lvlTag.className = 'cob-tag cob-tag-ws';
      lvlTag.textContent = String(level).padStart(2, '0');
      li.appendChild(lvlTag);
      li.appendChild(document.createTextNode(' ' + name));
      if (pic) {
        const picTag = document.createElement('span');
        picTag.className = 'cob-tag cob-tag-pic';
        picTag.textContent = 'PIC ' + pic;
        li.appendChild(document.createTextNode(' '));
        li.appendChild(picTag);
      }
      ul.appendChild(li);
    }
    if (workingStorageVars.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${workingStorageVars.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // PROCEDURE DIVISION sections
  if (sections.length > 0) {
    const sec = makeSection(host, `PROCEDURE Sections (${sections.length})`);
    const ul = makeList(sec);
    for (const name of sections) {
      const li = document.createElement('li');
      li.appendChild(makeTag('cob-tag-section', 'SECTION'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Paragraph count
  if (paragraphCount > 0) {
    const sec = makeSection(host, `Paragraphs (${paragraphCount})`);
    const info = document.createElement('div');
    info.style.padding = '8px 14px';
    info.style.fontSize = '13px';
    info.style.color = 'var(--fg-2,#666)';
    info.textContent = `${paragraphCount} paragraph${paragraphCount !== 1 ? 's' : ''} found in PROCEDURE DIVISION`;
    sec.appendChild(info);
  }

  return { parentNode: host };
}
