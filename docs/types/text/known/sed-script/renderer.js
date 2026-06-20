const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sed-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sed-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.sed-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sed-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.sed-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.sed-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:100px;}
.sed-card strong{display:block;font-size:1.2rem;font-weight:700;}
.sed-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.sed-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.sed-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.sed-list{margin:0;padding:0;list-style:none;}
.sed-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.sed-list li:last-child{border-bottom:none;}
.sed-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.sed-tag-s{background:#dbeafe;color:#1d4ed8;}
.sed-tag-d{background:#fee2e2;color:#991b1b;}
.sed-tag-y{background:#fef3c7;color:#92400e;}
.sed-tag-b{background:#f3e8ff;color:#6b21a8;}
.sed-tag-addr{background:#d1fae5;color:#065f46;}
.sed-pattern{font-family:ui-monospace,monospace;font-size:11px;color:var(--fg,#374151);max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.sed-flags{font-size:10px;padding:1px 5px;border-radius:4px;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;}
.sed-pill{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f1f5f9);border:1px solid var(--border,#cbd5e1);font-family:ui-monospace,monospace;margin:2px 2px;}
.sed-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
`;

function parseSed(text) {
  const lines = text.split(/\r?\n/);
  const substitutions = [];
  const deletions = [];
  const insertAppendChange = [];
  const transliterations = [];
  const branches = [];
  const addressRanges = [];
  let totalCommands = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // Strip address prefix: optional addr1[,addr2]
    // addr can be: linenum, $, /regex/, \cregexc
    const addrRe = /^(?:(?:\d+|\$|\/[^/]*\/|\\.[^\\]*\.)(?:,(?:\d+|\$|\/[^/]*\/|\\..[^\\]*\.))?)?(!)?/;
    const addrM = addrRe.exec(line);
    const addrStr = addrM ? addrM[0] : '';
    const rest = line.slice(addrStr.length).trim();

    if (!rest) continue;
    const cmd = rest[0];

    // Track address ranges
    if (addrStr && /,/.test(addrStr)) {
      addressRanges.push(addrStr.slice(0, 30));
    }

    // s/pattern/replacement/flags
    if (cmd === 's') {
      totalCommands++;
      const sep = rest[1] || '/';
      // Find the parts by splitting on unescaped sep
      const parts = splitSedParts(rest.slice(2), sep);
      if (parts) {
        const [pattern, , flags] = parts;
        const truncPat = pattern.length > 40 ? pattern.slice(0, 37) + '...' : pattern;
        substitutions.push({ pattern: truncPat, flags: flags || '' });
      }
      continue;
    }

    // d / D — delete
    if (cmd === 'd' || cmd === 'D') {
      totalCommands++;
      const addr = addrStr ? addrStr.slice(0, 20) : '';
      deletions.push(addr || 'unconditional');
      continue;
    }

    // i / a / c — insert, append, change
    if (cmd === 'i' || cmd === 'a' || cmd === 'c') {
      totalCommands++;
      insertAppendChange.push(cmd);
      continue;
    }

    // y/transliteration/
    if (cmd === 'y') {
      totalCommands++;
      const sep2 = rest[1] || '/';
      const parts2 = splitSedParts(rest.slice(2), sep2);
      if (parts2) {
        transliterations.push({ from: parts2[0].slice(0, 20), to: (parts2[1] || '').slice(0, 20) });
      }
      continue;
    }

    // b / t / T — branch, conditional branch
    if (cmd === 'b' || cmd === 't' || cmd === 'T') {
      totalCommands++;
      const label = rest.slice(1).trim();
      branches.push({ cmd, label: label || '(end)' });
      continue;
    }

    // : — label definition
    if (cmd === ':') {
      const label = rest.slice(1).trim();
      branches.push({ cmd: ':', label });
      continue;
    }

    // p / P / q / Q / n / N / l / = / r / w — other commands
    if (/^[pPqQnNl=rw]/.test(cmd)) {
      totalCommands++;
    }
  }

  return { substitutions, deletions, insertAppendChange, transliterations, branches, addressRanges, totalCommands };
}

// Split "part1SEPpart2SEPpart3" on unescaped sep
function splitSedParts(str, sep) {
  const parts = [];
  let current = '';
  let i = 0;
  while (i < str.length) {
    if (str[i] === '\\' && i + 1 < str.length) {
      current += str[i] + str[i + 1];
      i += 2;
      continue;
    }
    if (str[i] === sep) {
      parts.push(current);
      current = '';
      i++;
      if (parts.length === 2) {
        // rest is flags
        parts.push(str.slice(i).replace(/\s*#.*$/, '').trim());
        return parts;
      }
      continue;
    }
    current += str[i];
    i++;
  }
  if (parts.length < 2) return null;
  parts.push(current);
  return parts;
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'sed-section';
  const hd = document.createElement('div');
  hd.className = 'sed-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'sed-list';
  sec.appendChild(ul);
  return ul;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();
  const { substitutions, deletions, insertAppendChange, transliterations, branches, addressRanges, totalCommands } = parseSed(text);

  const host = document.createElement('div');
  host.className = 'sed-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'sed-title';
  title.innerHTML = `<span class="sed-badge">sed Script</span>${esc(name)}`;
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'sed-sub';
  const parts = [];
  parts.push(`${totalCommands} command${totalCommands !== 1 ? 's' : ''}`);
  parts.push(`${substitutions.length} substitution${substitutions.length !== 1 ? 's' : ''}`);
  if (deletions.length) parts.push(`${deletions.length} deletion${deletions.length !== 1 ? 's' : ''}`);
  if (branches.length) parts.push(`${branches.length} branch/label`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'sed-cards';
  const cardItems = [
    { value: totalCommands, label: 'Commands' },
    { value: substitutions.length, label: 'Substitutions' },
    { value: deletions.length, label: 'Deletions' },
    { value: branches.length, label: 'Branches' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'sed-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Substitutions
  if (substitutions.length > 0) {
    const MAX = 15;
    const shown = substitutions.slice(0, MAX);
    const extra = substitutions.length - shown.length;
    const sec = makeSection(host, `Substitutions (${substitutions.length})`);
    const ul = makeList(sec);
    for (const { pattern, flags } of shown) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'sed-tag sed-tag-s';
      tag.textContent = 's';
      li.appendChild(tag);
      const pat = document.createElement('span');
      pat.className = 'sed-pattern';
      pat.textContent = pattern || '(empty)';
      li.appendChild(pat);
      if (flags) {
        const flagSpan = document.createElement('span');
        flagSpan.className = 'sed-flags';
        flagSpan.textContent = flags;
        li.appendChild(flagSpan);
      }
      ul.appendChild(li);
    }
    if (extra > 0) {
      const li = document.createElement('li');
      li.textContent = `… and ${extra} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Address ranges
  if (addressRanges.length > 0) {
    const sec = makeSection(host, `Address Ranges (${addressRanges.length})`);
    const ul = makeList(sec);
    for (const addr of addressRanges.slice(0, 10)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'sed-tag sed-tag-addr';
      tag.textContent = 'range';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + addr));
      ul.appendChild(li);
    }
  }

  // Transliterations
  if (transliterations.length > 0) {
    const sec = makeSection(host, `Transliterations (${transliterations.length})`);
    const ul = makeList(sec);
    for (const { from, to } of transliterations) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'sed-tag sed-tag-y';
      tag.textContent = 'y';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(` ${from} → ${to}`));
      ul.appendChild(li);
    }
  }

  // Insert/Append/Change
  if (insertAppendChange.length > 0) {
    const counts = { i: 0, a: 0, c: 0 };
    for (const c of insertAppendChange) counts[c]++;
    const sec = makeSection(host, 'Insert / Append / Change');
    const wrapper = document.createElement('div');
    wrapper.style.padding = '10px 14px';
    if (counts.i) { const p = document.createElement('span'); p.className = 'sed-pill'; p.textContent = `insert (i) ×${counts.i}`; wrapper.appendChild(p); }
    if (counts.a) { const p = document.createElement('span'); p.className = 'sed-pill'; p.textContent = `append (a) ×${counts.a}`; wrapper.appendChild(p); }
    if (counts.c) { const p = document.createElement('span'); p.className = 'sed-pill'; p.textContent = `change (c) ×${counts.c}`; wrapper.appendChild(p); }
    sec.appendChild(wrapper);
  }

  // Branches and labels
  if (branches.length > 0) {
    const labels = branches.filter((b) => b.cmd === ':');
    const jumps = branches.filter((b) => b.cmd !== ':');
    const sec = makeSection(host, `Branches & Labels (${branches.length})`);
    const ul = makeList(sec);
    for (const { cmd, label } of branches.slice(0, 15)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'sed-tag sed-tag-b';
      tag.textContent = cmd === ':' ? 'label' : cmd;
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + label));
      ul.appendChild(li);
    }
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'sed-pre';
  pre.textContent = text;
  srcSec.appendChild(pre);

  return { parentNode: host };
}
