const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sed-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sed-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.sed-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sed-name{font-family:ui-monospace,monospace;font-size:14px;color:#6d28d9;font-weight:700;}
.sed-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.sed-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.sed-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.sed-card strong{display:block;font-size:1.2rem;font-weight:700;}
.sed-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.sed-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.sed-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.sed-list{margin:0;padding:0;list-style:none;}
.sed-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.sed-list li:last-child{border-bottom:none;}
.sed-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;background:#ede9fe;color:#6d28d9;}
.sed-tag-s{background:#dbeafe;color:#1d4ed8;}
.sed-tag-d{background:#fee2e2;color:#991b1b;}
.sed-tag-y{background:#fef3c7;color:#92400e;}
.sed-tag-b{background:#f3e8ff;color:#6b21a8;}
.sed-tag-hold{background:#cffafe;color:#155e75;}
.sed-tag-addr{background:#d1fae5;color:#065f46;font-family:ui-monospace,monospace;}
.sed-arrow{color:#9ca3af;}
.sed-pat{font-family:ui-monospace,monospace;font-size:11px;color:#374151;}
.sed-repl{font-family:ui-monospace,monospace;font-size:11px;color:#0e7490;}
.sed-flags{font-size:10px;padding:1px 5px;border-radius:4px;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;}
.sed-desc{color:var(--fg-2,#6b7280);font-family:system-ui,sans-serif;}
.sed-bang{font-size:10px;padding:0 4px;border-radius:4px;background:#fee2e2;color:#991b1b;font-weight:700;}
.sed-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
`;

// command letter → { meaning, tag class, family }
const CMD_INFO = {
  s: { meaning: 'substitute', cls: 'sed-tag-s' },
  y: { meaning: 'transliterate characters', cls: 'sed-tag-y' },
  d: { meaning: 'delete pattern space', cls: 'sed-tag-d' },
  D: { meaning: 'delete first line of pattern space, restart cycle', cls: 'sed-tag-d' },
  p: { meaning: 'print pattern space', cls: 'sed-tag' },
  P: { meaning: 'print first line of pattern space', cls: 'sed-tag' },
  a: { meaning: 'append text after line', cls: 'sed-tag' },
  i: { meaning: 'insert text before line', cls: 'sed-tag' },
  c: { meaning: 'change (replace) line with text', cls: 'sed-tag' },
  n: { meaning: 'print then read next line into pattern space', cls: 'sed-tag' },
  N: { meaning: 'append next input line to pattern space', cls: 'sed-tag' },
  h: { meaning: 'copy pattern space to hold space', cls: 'sed-tag-hold' },
  H: { meaning: 'append pattern space to hold space', cls: 'sed-tag-hold' },
  g: { meaning: 'copy hold space to pattern space', cls: 'sed-tag-hold' },
  G: { meaning: 'append hold space to pattern space', cls: 'sed-tag-hold' },
  x: { meaning: 'exchange pattern and hold space', cls: 'sed-tag-hold' },
  b: { meaning: 'branch (unconditional)', cls: 'sed-tag-b' },
  t: { meaning: 'branch if a substitution was made', cls: 'sed-tag-b' },
  T: { meaning: 'branch if no substitution was made', cls: 'sed-tag-b' },
  ':': { meaning: 'define label', cls: 'sed-tag-b' },
  '{': { meaning: 'begin block', cls: 'sed-tag' },
  '}': { meaning: 'end block', cls: 'sed-tag' },
  q: { meaning: 'quit (auto-print pattern space)', cls: 'sed-tag-d' },
  Q: { meaning: 'quit immediately (no auto-print)', cls: 'sed-tag-d' },
  l: { meaning: 'list pattern space unambiguously', cls: 'sed-tag' },
  '=': { meaning: 'print current line number', cls: 'sed-tag' },
  r: { meaning: 'read entire file', cls: 'sed-tag' },
  R: { meaning: 'read one line from file', cls: 'sed-tag' },
  w: { meaning: 'write pattern space to file', cls: 'sed-tag' },
  W: { meaning: 'write first line of pattern space to file', cls: 'sed-tag' },
  e: { meaning: 'execute command', cls: 'sed-tag-d' },
  F: { meaning: 'print current input filename', cls: 'sed-tag' },
  z: { meaning: 'zap (clear) pattern space', cls: 'sed-tag' },
};

// Consume one address (line#, $, /regex/, \cregexc, n~step) from the front of s starting at i.
// Returns { token, next } or null.
function readAddr(s, i) {
  const ch = s[i];
  if (ch === '/' || ch === '\\') {
    const delim = ch === '\\' ? s[i + 1] : '/';
    let j = ch === '\\' ? i + 2 : i + 1;
    while (j < s.length && !(s[j] === delim && s[j - 1] !== '\\')) j++;
    let tok = s.slice(i, j + 1);
    j++;
    while (j < s.length && (s[j] === 'I' || s[j] === 'M')) { tok += s[j]; j++; }
    return { token: tok, next: j };
  }
  if (ch === '$') return { token: '$', next: i + 1 };
  const m = /^\d+(~\d+)?/.exec(s.slice(i));
  if (m) return { token: m[0], next: i + m[0].length };
  return null;
}

// Pull optional addr1[,addr2] + optional `!` off the front of a trimmed line.
function parseAddress(line) {
  const a1 = readAddr(line, 0);
  if (!a1) return { address: '', negate: false, rest: line };
  let address = a1.token;
  let i = a1.next;
  if (line[i] === ',') {
    i++;
    const rel = /^[+~]\d+/.exec(line.slice(i));
    if (rel) { address += ',' + rel[0]; i += rel[0].length; }
    else {
      const a2 = readAddr(line, i);
      if (a2) { address += ',' + a2.token; i = a2.next; }
      else address += ',';
    }
  }
  while (line[i] === ' ' || line[i] === '\t') i++;
  let negate = false;
  if (line[i] === '!') { negate = true; i++; while (line[i] === ' ' || line[i] === '\t') i++; }
  return { address, negate, rest: line.slice(i) };
}

// Split "<pat><sep><repl><sep><flags>" on the unescaped separator. Returns [pat, repl, flags] or null.
function splitSedParts(str, sep) {
  const parts = [];
  let current = '', i = 0;
  while (i < str.length) {
    if (str[i] === '\\' && i + 1 < str.length) { current += str[i] + str[i + 1]; i += 2; continue; }
    if (str[i] === sep) {
      parts.push(current); current = ''; i++;
      if (parts.length === 2) { parts.push(str.slice(i).replace(/\s*[#;].*$/, '').trim()); return parts; }
      continue;
    }
    current += str[i]; i++;
  }
  if (parts.length < 2) return null;
  parts.push(current);
  return parts;
}

const FLAG_DESC = { g: 'global', p: 'print', i: 'ignore-case', I: 'ignore-case', m: 'multiline', M: 'multiline', e: 'execute' };
function describeFlags(flags) {
  if (!flags) return '';
  const out = [];
  const num = flags.match(/\d+/);
  if (num) out.push(`replace match #${num[0]}`);
  const wm = flags.match(/w\s*(\S+)/);
  if (wm) out.push(`write to ${wm[1]}`);
  for (const ch of flags.replace(/\d+/g, '').replace(/w\s*\S+/, '')) {
    if (FLAG_DESC[ch] && !out.includes(FLAG_DESC[ch])) out.push(FLAG_DESC[ch]);
  }
  return out.join(', ');
}

function describeAddress(addr) {
  if (!addr) return 'every line';
  if (addr.includes(',')) {
    const [a, b] = addr.split(',');
    return `range from ${describeAddress(a)} to ${b.startsWith('+') ? `+${b.slice(1)} more lines` : b.startsWith('~') ? `next multiple of ${b.slice(1)}` : describeAddress(b)}`;
  }
  if (addr === '$') return 'last line';
  if (addr.includes('~')) { const [f, s] = addr.split('~'); return `every ${s}th line from line ${f}`; }
  if (/^\d+$/.test(addr)) return `line ${addr}`;
  if (addr[0] === '/' || addr[0] === '\\') return `lines matching ${addr}`;
  return addr;
}

// Parse a sed script into structured facts. Pure, DOM-free — exported for unit testing.
export function analyzeSed(text) {
  const lines = String(text || '').split(/\r?\n/);
  const commands = [];
  const substitutions = [];
  const transliterations = [];
  const labels = [];
  const branches = [];
  let blocks = 0, comments = 0, addressed = 0;
  let autoprint = true, seenCommand = false;

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li].trim();
    if (!line) continue;
    if (li === 0 && line.startsWith('#!')) { comments++; if (/\s-\w*n/.test(line)) autoprint = false; continue; }
    if (line === '#n' && !seenCommand) { autoprint = false; comments++; continue; }
    if (line[0] === '#') { comments++; continue; }

    const { address, negate, rest } = parseAddress(line);
    if (!rest) continue;
    const cmd = rest[0];
    const info = CMD_INFO[cmd];
    seenCommand = true;
    if (address) addressed++;

    const base = { address, negate, cmd, raw: line };

    if (cmd === 's') {
      const sep = rest[1] || '/';
      const parts = splitSedParts(rest.slice(2), sep);
      const pattern = parts ? parts[0] : '';
      const replacement = parts ? parts[1] : '';
      const flags = parts ? (parts[2] || '') : '';
      const fd = describeFlags(flags);
      const entry = {
        ...base, pattern, replacement, flags,
        desc: `substitute ${pattern ? `/${pattern}/` : ''} → "${replacement}"${fd ? ` (${fd})` : ''} on ${describeAddress(address)}`,
      };
      commands.push(entry);
      substitutions.push(entry);
      continue;
    }

    if (cmd === 'y') {
      const sep = rest[1] || '/';
      const parts = splitSedParts(rest.slice(2), sep);
      const from = parts ? parts[0] : '', to = parts ? (parts[1] || '') : '';
      const entry = { ...base, from, to, desc: `transliterate ${from} → ${to}` };
      commands.push(entry);
      transliterations.push(entry);
      continue;
    }

    if (cmd === 'b' || cmd === 't' || cmd === 'T') {
      const label = rest.slice(1).trim();
      const entry = { ...base, label, desc: `${info.meaning}${label ? ` to label "${label}"` : ' to end of script'}` };
      commands.push(entry);
      branches.push(entry);
      continue;
    }

    if (cmd === ':') {
      const label = rest.slice(1).trim();
      labels.push(label);
      commands.push({ ...base, label, desc: `define label "${label}"` });
      continue;
    }

    if (cmd === '{') { blocks++; commands.push({ ...base, desc: `begin block on ${describeAddress(address)}` }); continue; }
    if (cmd === '}') { commands.push({ ...base, desc: 'end block' }); continue; }

    if (cmd === 'a' || cmd === 'i' || cmd === 'c') {
      let body = rest.slice(1);
      const lead = body.startsWith('\\');
      if (lead) body = body.slice(1);
      const textLines = [];
      let more = body.endsWith('\\') || (lead && body === '');
      if (body) textLines.push(body.replace(/\\$/, ''));
      while (more && li + 1 < lines.length) {
        li++;
        const t = lines[li];
        more = t.endsWith('\\');
        textLines.push(t.replace(/\\$/, ''));
      }
      const txt = textLines.join('\n');
      commands.push({ ...base, text: txt, desc: `${info.meaning}${txt ? `: "${txt.replace(/\n/g, '\\n')}"` : ''}` });
      continue;
    }

    if (info) {
      const fileM = /^[rRwWe]\s*(\S.*)$/.exec(rest);
      const extra = fileM ? ` (${fileM[1]})` : '';
      commands.push({ ...base, desc: `${info.meaning}${extra} on ${describeAddress(address)}` });
      continue;
    }

    // Unknown command letter — still record raw so nothing is silently dropped.
    commands.push({ ...base, desc: `command '${cmd}'` });
  }

  return { autoprint, commands, substitutions, transliterations, labels, branches, blocks, comments, addressed };
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
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'sed-list'; sec.appendChild(ul); return ul; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function tag(cls, t) { return `<span class="sed-tag ${cls}">${esc(t)}</span>`; }
function addrTag(addr, negate) {
  if (!addr && !negate) return '';
  return `<span class="sed-tag-addr">${esc(addr || 'every')}</span>${negate ? '<span class="sed-bang">!</span>' : ''}`;
}
function trunc(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();

  const facts = analyzeSed(text);
  const { autoprint, commands, substitutions, transliterations, labels, branches, blocks } = facts;

  // Reject content that produced no recognizable sed commands at all.
  if (!commands.length) return null;

  const host = document.createElement('div');
  host.className = 'sed-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'sed-title';
  const badge = document.createElement('span');
  badge.className = 'sed-badge';
  badge.textContent = 'sed Script';
  title.appendChild(badge);
  if (name) { const n = document.createElement('span'); n.className = 'sed-name'; n.textContent = name; title.appendChild(n); }
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'sed-sub';
  sub.textContent = [
    `${commands.length} command${commands.length !== 1 ? 's' : ''}`,
    substitutions.length && `${substitutions.length} substitution${substitutions.length !== 1 ? 's' : ''}`,
    labels.length && `${labels.length} label${labels.length !== 1 ? 's' : ''}`,
    `auto-print ${autoprint ? 'on' : 'off (-n)'}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'sed-cards';
  for (const { value, label } of [
    { value: commands.length, label: 'Commands' },
    { value: substitutions.length, label: 'Substitutions' },
    { value: transliterations.length, label: 'Transliterations' },
    { value: labels.length + branches.length, label: 'Labels/Branches' },
    { value: blocks, label: 'Blocks' },
  ]) {
    const card = document.createElement('div');
    card.className = 'sed-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (substitutions.length) {
    const ul = makeList(makeSection(host, `Substitutions (${substitutions.length})`));
    for (const s of substitutions) {
      const ad = addrTag(s.address, s.negate);
      const fl = s.flags ? `<span class="sed-flags">${esc(s.flags)}</span>` : '';
      row(ul, `${ad ? ad + ' ' : ''}${tag('sed-tag-s', 's')} <span class="sed-pat">/${esc(trunc(s.pattern, 48))}/</span> <span class="sed-arrow">→</span> <span class="sed-repl">${esc(trunc(s.replacement, 32)) || '(delete)'}</span> ${fl}`);
    }
  }

  if (transliterations.length) {
    const ul = makeList(makeSection(host, `Transliterations (${transliterations.length})`));
    for (const y of transliterations) {
      const ad = addrTag(y.address, y.negate);
      row(ul, `${ad ? ad + ' ' : ''}${tag('sed-tag-y', 'y')} <span class="sed-pat">${esc(trunc(y.from, 28))}</span> <span class="sed-arrow">→</span> <span class="sed-repl">${esc(trunc(y.to, 28))}</span>`);
    }
  }

  if (labels.length || branches.length) {
    const ul = makeList(makeSection(host, `Labels & Branches (${labels.length + branches.length})`));
    for (const name2 of labels) row(ul, `${tag('sed-tag-b', 'label')} <span class="sed-pat">:${esc(name2)}</span>`);
    for (const b of branches) row(ul, `${tag('sed-tag-b', b.cmd)} <span class="sed-desc">${esc(b.desc)}</span>`);
  }

  // All commands in script order, with parsed address + human description.
  const ul = makeList(makeSection(host, `Commands (${commands.length})`));
  for (const c of commands) {
    const info = CMD_INFO[c.cmd] || { cls: 'sed-tag' };
    const ad = addrTag(c.address, c.negate);
    row(ul, `${ad ? ad + ' ' : ''}${tag(info.cls, c.cmd)} <span class="sed-desc">${esc(c.desc)}</span>`);
  }

  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'sed-pre';
  pre.textContent = text;
  srcSec.appendChild(pre);

  return { parentNode: host };
}
