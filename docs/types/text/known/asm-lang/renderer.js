const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.asm-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.asm-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#b45309;color:#fff;vertical-align:middle;margin-right:8px;}
.asm-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.asm-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.asm-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.asm-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.asm-card strong{display:block;font-size:1.2rem;font-weight:700;}
.asm-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.asm-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.asm-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.asm-list{margin:0;padding:0;list-style:none;}
.asm-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.asm-list li:last-child{border-bottom:none;}
.asm-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fef3c7;color:#92400e;font-weight:700;}
.asm-tag-sec{background:#dbeafe;color:#1e40af;}
.asm-tag-ext{background:#dcfce7;color:#166534;}
.asm-tag-glb{background:#dcfce7;color:#166534;}
.asm-tag-macro{background:#ede9fe;color:#7c3aed;}
.asm-tag-dir{background:#fce7f3;color:#9d174d;}
.asm-tag-data{background:#cffafe;color:#155e75;}
.asm-name{font-weight:600;}
.asm-dirk{color:#7c3aed;}
.asm-val{color:#9333ea;}
.asm-mn{display:flex;align-items:center;gap:8px;width:100%;}
.asm-mn-op{font-weight:700;color:#b45309;min-width:64px;}
.asm-mn-bar{flex:1;height:10px;background:#fde68a;border-radius:5px;min-width:6px;}
.asm-mn-ct{color:var(--fg-2,#5a6678);min-width:34px;text-align:right;}
.asm-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.asm-kw{color:#b45309;font-weight:600;}
.asm-dir{color:#7c3aed;}
.asm-comment{color:#6e7781;font-style:italic;}
.asm-str{color:#0a6640;}
.asm-reg{color:#d1242f;}
.asm-num{color:#1e40af;}
.asm-label{color:#b45309;font-weight:700;}
`;

const NASM_INSTRS = new Set([
  'mov', 'add', 'sub', 'mul', 'div', 'imul', 'idiv', 'inc', 'dec', 'neg',
  'and', 'or', 'xor', 'not', 'shl', 'shr', 'sal', 'sar', 'rol', 'ror',
  'push', 'pop', 'call', 'ret', 'jmp', 'je', 'jne', 'jz', 'jnz', 'jg', 'jge',
  'jl', 'jle', 'ja', 'jae', 'jb', 'jbe', 'js', 'jns', 'jo', 'jno',
  'cmp', 'test', 'lea', 'nop', 'hlt', 'int', 'syscall', 'sysret',
  'movq', 'movl', 'movw', 'movb', 'addl', 'subl', 'cmpl', 'pushl', 'popl',
  'xchg', 'xchgl', 'lock', 'rep', 'repe', 'repz', 'repne', 'repnz',
  'stosd', 'stosl', 'stosq', 'stosb', 'lodsd', 'lodsl', 'lodsq', 'movsd', 'movsl',
  'cdq', 'cdqe', 'cqo', 'cbw', 'cwd', 'cwde',
]);

// NASM data/reserve/define pseudo-ops and GAS dot data directives (for data-definition detection).
const DATA_NASM = /^(\w+)\s+(db|dw|dd|dq|dt|do|dy|ddq|resb|resw|resd|resq|rest|equ|times|incbin)\b\s*(.*)$/i;
const DATA_GAS = /^(\.(?:byte|2byte|4byte|8byte|word|short|hword|long|int|quad|octa|ascii|asciz|string|space|skip|zero|fill|float|double|single|comm|lcomm))\b\s*(.*)$/i;
// NASM non-data directives that are not sections/symbols/macros.
const NASM_DIR = /^(bits|default|cpu|org|align|alignb|use16|use32|use64|struc|endstruc|istruc|absolute)\b\s*(.*)$/i;

function detectFlavor(text) {
  const head = text.slice(0, 3000);
  if (/^\s*BITS\s+\d+/m.test(head) || /^\s*bits\s+\d+/m.test(head)) return 'NASM';
  if (/%include\b/i.test(head) || /^\s*%macro\b/m.test(head)) return 'NASM';
  if (/\.intel_syntax/i.test(head)) return 'Intel Assembly';
  if (/movl?\s+%\w+,/m.test(head) || /mov[bwlq]\s+\$/m.test(head)) return 'AT&T Assembly';
  if (/^\s*section\b/im.test(head) && !head.includes('.section')) return 'NASM';
  if (head.includes('.section') || head.includes('.globl') || head.includes('.global')) return 'AT&T Assembly';
  return 'Assembly';
}

// Strip a trailing line comment (`;`, `//`, or `@`) that is not inside a string literal.
function stripComment(line) {
  let inStr = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inStr) { if (c === '\\') i++; else if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === ';' || c === '@') return line.slice(0, i);
    if (c === '/' && line[i + 1] === '/') return line.slice(0, i);
  }
  return line;
}

// Parse assembly into structured facts. Pure (no DOM) so it is unit-testable.
// Returns sections, labels (code "functions"), dataDefs [{name,directive,value}], directives,
// macros, externs, globals, and topMnemonics [{op,count}] (the opcode histogram).
export function analyzeAsm(text) {
  const lines = String(text || '').split(/\r?\n/);
  const flavor = detectFlavor(text);
  const sections = [], labels = [], macros = [], externs = [], globals = [], dataDefs = [], directives = [];
  const mnem = new Map();
  let instrCount = 0, lastLabel = '';
  const pushUniq = (arr, v) => { if (v && !arr.includes(v)) arr.push(v); };

  for (const raw of lines) {
    let t = stripComment(raw).trim();
    if (!t) continue;
    if (t.startsWith('#') || t.startsWith('*')) continue; // GAS `#` comment / banner star

    let m;
    // NASM macro definition
    if ((m = t.match(/^%macro\s+(\w+)/i))) { pushUniq(macros, m[1]); continue; }
    if (/^%/.test(t)) continue; // other NASM preprocessor lines
    // GAS macro definition
    if ((m = t.match(/^\.macro\s+(\w+)/i))) { pushUniq(macros, m[1]); continue; }
    // sections / segments
    if ((m = t.match(/^(?:section|segment|\.section)\s+([.\w$]+)/i))) { pushUniq(sections, m[1]); continue; }
    // global / extern symbol declarations (may list several)
    if ((m = t.match(/^(?:global|\.globl|\.global)\b\s*(.*)$/i))) {
      for (const g of m[1].split(/[\s,]+/).filter(Boolean)) pushUniq(globals, g);
      continue;
    }
    if ((m = t.match(/^(?:extern|extrn|\.extern)\b\s*(.*)$/i))) {
      for (const e of m[1].split(/[\s,]+/).filter(Boolean)) pushUniq(externs, e);
      continue;
    }
    // NASM data definitions (label has no colon): `name db "x", 10`
    if ((m = t.match(DATA_NASM))) { dataDefs.push({ name: m[1], directive: m[2].toLowerCase(), value: m[3].trim() }); continue; }

    // Leading label `name:` (NASM/GAS). Local labels start with `.` and are not counted as procedures.
    const lm = t.match(/^([A-Za-z_.$][\w$.]*):\s*(.*)$/);
    if (lm) {
      if (!lm[1].startsWith('.')) { pushUniq(labels, lm[1]); lastLabel = lm[1]; }
      t = lm[2].trim();
      if (!t) continue;
    }
    // GAS data definition following a label (same or prior line): `msg: .asciz "x"`
    if ((m = t.match(DATA_GAS))) {
      dataDefs.push({ name: lm ? lm[1] : lastLabel, directive: m[1].toLowerCase(), value: m[2].trim() });
      continue;
    }
    // Other directives
    if (t.startsWith('.')) { const dm = t.match(/^(\.[\w$.]+)\s*(.*)$/); directives.push({ name: dm[1], value: (dm[2] || '').trim() }); continue; }
    if ((m = t.match(NASM_DIR))) { directives.push({ name: m[1].toLowerCase(), value: (m[2] || '').trim() }); continue; }

    // Anything else with a leading mnemonic token is an instruction (skip macro invocations).
    const im = t.match(/^([A-Za-z][\w.]*)/);
    if (im && !macros.includes(im[1]) && !macros.includes(im[1].toLowerCase())) {
      const op = im[1].toLowerCase();
      mnem.set(op, (mnem.get(op) || 0) + 1);
      instrCount++;
    }
  }

  const topMnemonics = [...mnem.entries()]
    .map(([op, count]) => ({ op, count }))
    .sort((a, b) => b.count - a.count || a.op.localeCompare(b.op))
    .slice(0, 12);

  return { flavor, sections, labels, dataDefs, directives, macros, externs, globals, topMnemonics, instrCount };
}

function highlightAsm(text, flavor) {
  const isATT = flavor === 'AT&T Assembly';
  const lines = text.split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(';') || (trimmed.startsWith('#') && !/^#\s*include/.test(trimmed))) {
      result.push('<span class="asm-comment">' + esc(line) + '</span>');
      continue;
    }
    let out = '';
    let i = 0;
    while (i < line.length) {
      if (line[i] === ';') { out += '<span class="asm-comment">' + esc(line.slice(i)) + '</span>'; break; }
      if (line[i] === '#' && (i === 0 || /\s/.test(line[i - 1]))) { out += '<span class="asm-comment">' + esc(line.slice(i)) + '</span>'; break; }
      if (isATT && line[i] === '%') {
        let j = i + 1;
        while (j < line.length && /\w/.test(line[j])) j++;
        out += '<span class="asm-reg">' + esc(line.slice(i, j)) + '</span>'; i = j; continue;
      }
      if (!isATT && /[a-z]/i.test(line[i])) {
        let j = i;
        while (j < line.length && /[\w]/.test(line[j])) j++;
        const word = line.slice(i, j);
        const wl = word.toLowerCase();
        const regs = new Set(['rax', 'rbx', 'rcx', 'rdx', 'rsi', 'rdi', 'rsp', 'rbp', 'rip',
          'eax', 'ebx', 'ecx', 'edx', 'esi', 'edi', 'esp', 'ebp',
          'ax', 'bx', 'cx', 'dx', 'si', 'di', 'sp', 'bp',
          'al', 'bl', 'cl', 'dl', 'ah', 'bh', 'ch', 'dh',
          'r8', 'r9', 'r10', 'r11', 'r12', 'r13', 'r14', 'r15',
          'r8d', 'r9d', 'r10d', 'r11d', 'r12d', 'r13d', 'r14d', 'r15d',
          'xmm0', 'xmm1', 'xmm2', 'xmm3', 'xmm4', 'xmm5', 'xmm6', 'xmm7',
          'ymm0', 'ymm1', 'cs', 'ds', 'es', 'fs', 'gs', 'ss']);
        if (regs.has(wl)) { out += '<span class="asm-reg">' + esc(word) + '</span>'; i = j; continue; }
        if (word.startsWith('.') || ['bits', 'section', 'global', 'extern', 'db', 'dw', 'dd', 'dq', 'resb', 'resw', 'resd', 'resq', 'equ', 'org', 'align', 'times'].includes(wl)) {
          out += '<span class="asm-dir">' + esc(word) + '</span>'; i = j; continue;
        }
        if (NASM_INSTRS.has(wl)) { out += '<span class="asm-kw">' + esc(word) + '</span>'; i = j; continue; }
        out += esc(word); i = j; continue;
      }
      if (line[i] === '.') {
        let j = i + 1;
        while (j < line.length && /[\w]/.test(line[j])) j++;
        out += '<span class="asm-dir">' + esc(line.slice(i, j)) + '</span>'; i = j; continue;
      }
      if (line[i] === '"' || line[i] === "'") {
        const q = line[i];
        let j = i + 1;
        while (j < line.length && line[j] !== q) { if (line[j] === '\\') j++; j++; }
        j++;
        out += '<span class="asm-str">' + esc(line.slice(i, j)) + '</span>'; i = j; continue;
      }
      if (/[0-9]/.test(line[i]) || (line[i] === '$' && /[0-9]/.test(line[i + 1] || ''))) {
        let j = line[i] === '$' ? i + 1 : i;
        while (j < line.length && /[0-9a-fA-FxXbBoOhH_]/.test(line[j])) j++;
        out += '<span class="asm-num">' + esc(line.slice(i, j)) + '</span>'; i = j; continue;
      }
      out += esc(line[i]); i++;
    }
    result.push(out);
  }
  return result.join('\n');
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'asm-section';
  const hd = document.createElement('div');
  hd.className = 'asm-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'asm-list';
  sec.appendChild(ul);
  return ul;
}

function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function tag(cls, t) { return `<span class="asm-tag ${cls}">${esc(t)}</span>`; }

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '');
  const { flavor, sections, labels, dataDefs, directives, macros, externs, globals, topMnemonics, instrCount } = analyzeAsm(text);

  const host = document.createElement('div');
  host.className = 'asm-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'asm-title';
  const badge = document.createElement('span');
  badge.className = 'asm-badge';
  badge.textContent = flavor;
  title.appendChild(badge);
  title.appendChild(document.createTextNode(name));
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'asm-sub';
  sub.textContent = [
    `${sections.length} section${sections.length !== 1 ? 's' : ''}`,
    `${labels.length} label${labels.length !== 1 ? 's' : ''}`,
    `${instrCount} instruction${instrCount !== 1 ? 's' : ''}`,
    globals.length && `${globals.length} global${globals.length !== 1 ? 's' : ''}`,
    externs.length && `${externs.length} extern${externs.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'asm-cards';
  for (const { value, label } of [
    { value: sections.length, label: 'Sections' },
    { value: labels.length, label: 'Labels' },
    { value: dataDefs.length, label: 'Data Defs' },
    { value: instrCount, label: 'Instructions' },
    { value: macros.length, label: 'Macros' },
  ]) {
    const card = document.createElement('div');
    card.className = 'asm-card';
    const strong = document.createElement('strong'); strong.textContent = value;
    const span = document.createElement('span'); span.textContent = label;
    card.appendChild(strong); card.appendChild(span); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (sections.length) {
    const ul = makeList(makeSection(host, `Sections (${sections.length})`));
    const known = { '.text': 'code', '.data': 'data', '.bss': 'uninit', '.rodata': 'const', 'text': 'code', 'data': 'data', 'bss': 'uninit', 'rodata': 'const' };
    for (const s of sections) row(ul, `${tag('asm-tag-sec', known[s.toLowerCase()] || 'custom')} <span class="asm-name">${esc(s)}</span>`);
  }

  if (globals.length || externs.length) {
    const ul = makeList(makeSection(host, `Symbols (${globals.length + externs.length})`));
    for (const g of globals) row(ul, `${tag('asm-tag-glb', 'global')} <span class="asm-name">${esc(g)}</span>`);
    for (const e of externs) row(ul, `${tag('asm-tag-ext', 'extern')} <span class="asm-name">${esc(e)}</span>`);
  }

  if (labels.length) {
    const MAX = 30;
    const ul = makeList(makeSection(host, `Labels / Procedures (${labels.length})`));
    for (const lbl of labels.slice(0, MAX)) row(ul, `<span class="asm-label">${esc(lbl)}</span>:`);
    if (labels.length > MAX) row(ul, `<span style="color:var(--fg-2,#888)">… and ${labels.length - MAX} more</span>`);
  }

  if (dataDefs.length) {
    const MAX = 40;
    const ul = makeList(makeSection(host, `Data Definitions (${dataDefs.length})`));
    for (const { name: dn, directive, value } of dataDefs.slice(0, MAX)) {
      row(ul, `${tag('asm-tag-data', directive)} <span class="asm-name">${esc(dn)}</span>`
        + (value ? ` = <span class="asm-val">${esc(value)}</span>` : ''));
    }
    if (dataDefs.length > MAX) row(ul, `<span style="color:var(--fg-2,#888)">… and ${dataDefs.length - MAX} more</span>`);
  }

  if (macros.length) {
    const ul = makeList(makeSection(host, `Macros (${macros.length})`));
    for (const mc of macros) row(ul, `${tag('asm-tag-macro', 'macro')} <span class="asm-name">${esc(mc)}</span>`);
  }

  if (directives.length) {
    const MAX = 30;
    const ul = makeList(makeSection(host, `Directives (${directives.length})`));
    for (const { name: dn, value } of directives.slice(0, MAX)) {
      row(ul, `${tag('asm-tag-dir', 'dir')} <span class="asm-dirk">${esc(dn)}</span>` + (value ? ` <span class="asm-val">${esc(value)}</span>` : ''));
    }
    if (directives.length > MAX) row(ul, `<span style="color:var(--fg-2,#888)">… and ${directives.length - MAX} more</span>`);
  }

  if (topMnemonics.length) {
    const max = topMnemonics[0].count || 1;
    const ul = makeList(makeSection(host, `Top Instructions (${topMnemonics.length} of ${instrCount})`));
    for (const { op, count } of topMnemonics) {
      const w = Math.max(6, Math.round((count / max) * 100));
      row(ul, `<span class="asm-mn"><span class="asm-mn-op">${esc(op)}</span>`
        + `<span class="asm-mn-bar" style="width:${w}%"></span>`
        + `<span class="asm-mn-ct">${count}</span></span>`);
    }
  }

  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'asm-pre';
  pre.innerHTML = highlightAsm(text, flavor);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
