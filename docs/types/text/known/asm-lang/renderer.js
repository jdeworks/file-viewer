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
.asm-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.asm-list li:last-child{border-bottom:none;}
.asm-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#fef3c7;color:#92400e;font-weight:700;}
.asm-tag-sec{background:#dbeafe;color:#1e40af;}
.asm-tag-ext{background:#dcfce7;color:#166534;}
.asm-tag-macro{background:#ede9fe;color:#7c3aed;}
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
  'stosd', 'stosl', 'stosq', 'lodsd', 'lodsl', 'lodsq', 'movsd', 'movsl',
  'cdq', 'cdqe', 'cqo', 'cbw', 'cwd', 'cwde',
]);

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

function analyzeAsm(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  const labels = [];
  const macros = [];
  const externs = [];
  const globals = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip pure comment lines
    if (trimmed.startsWith(';') || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;

    // NASM/GAS sections
    const secM = trimmed.match(/^(?:section|SECTION|\.section)\s+([.\w]+)/i);
    if (secM) {
      const s = secM[1];
      if (!sections.includes(s)) sections.push(s);
      continue;
    }

    // extern/extrn declarations
    const extM = trimmed.match(/^(?:extern|extrn|\.extern)\s+(\w+)/i);
    if (extM) {
      externs.push(extM[1]);
      continue;
    }

    // global declarations
    const glbM = trimmed.match(/^(?:global|\.globl|\.global)\s+(\w+)/i);
    if (glbM) {
      globals.push(glbM[1]);
      continue;
    }

    // NASM-style macros
    const macM = trimmed.match(/^%macro\s+(\w+)/i);
    if (macM) {
      macros.push(macM[1]);
      continue;
    }

    // GAS macros
    const gasMacM = trimmed.match(/^\.macro\s+(\w+)/i);
    if (gasMacM) {
      macros.push(gasMacM[1]);
      continue;
    }

    // Labels: non-local labels (not starting with .)
    // A label ends with : and the name doesn't start with .
    const labelM = trimmed.match(/^([A-Za-z_]\w*):/);
    if (labelM) {
      const lname = labelM[1];
      if (lname.toLowerCase() !== 'section' && lname.toLowerCase() !== 'global' && lname.toLowerCase() !== 'extern') {
        if (!labels.includes(lname)) labels.push(lname);
      }
    }
  }

  return { sections, labels, macros, externs, globals };
}

function highlightAsm(text, flavor) {
  const isATT = flavor === 'AT&T Assembly';
  const lines = text.split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Full-line comments
    if (trimmed.startsWith(';') || (trimmed.startsWith('#') && !/^#\s*include/.test(trimmed))) {
      result.push('<span class="asm-comment">' + esc(line) + '</span>');
      continue;
    }

    let out = '';
    let i = 0;
    while (i < line.length) {
      // Comments
      if (line[i] === ';') {
        out += '<span class="asm-comment">' + esc(line.slice(i)) + '</span>';
        break;
      }
      if (line[i] === '#' && (i === 0 || /\s/.test(line[i - 1]))) {
        out += '<span class="asm-comment">' + esc(line.slice(i)) + '</span>';
        break;
      }
      // Registers: %rax, %eax, rax, eax, r0-r15, etc.
      if (isATT && line[i] === '%') {
        let j = i + 1;
        while (j < line.length && /\w/.test(line[j])) j++;
        out += '<span class="asm-reg">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // NASM registers (non-AT&T)
      if (!isATT && /[a-z]/i.test(line[i])) {
        let j = i;
        while (j < line.length && /[\w]/.test(line[j])) j++;
        const word = line.slice(i, j);
        const wl = word.toLowerCase();
        // Common x86 registers
        const regs = new Set(['rax', 'rbx', 'rcx', 'rdx', 'rsi', 'rdi', 'rsp', 'rbp', 'rip',
          'eax', 'ebx', 'ecx', 'edx', 'esi', 'edi', 'esp', 'ebp',
          'ax', 'bx', 'cx', 'dx', 'si', 'di', 'sp', 'bp',
          'al', 'bl', 'cl', 'dl', 'ah', 'bh', 'ch', 'dh',
          'r8', 'r9', 'r10', 'r11', 'r12', 'r13', 'r14', 'r15',
          'r8d', 'r9d', 'r10d', 'r11d', 'r12d', 'r13d', 'r14d', 'r15d',
          'xmm0', 'xmm1', 'xmm2', 'xmm3', 'xmm4', 'xmm5', 'xmm6', 'xmm7',
          'ymm0', 'ymm1', 'cs', 'ds', 'es', 'fs', 'gs', 'ss']);
        if (regs.has(wl)) {
          out += '<span class="asm-reg">' + esc(word) + '</span>';
          i = j;
          continue;
        }
        // Directives (.text, .data, etc.)
        if (word.startsWith('.') || (wl === 'bits' || wl === 'section' || wl === 'global' || wl === 'extern' || wl === 'db' || wl === 'dw' || wl === 'dd' || wl === 'dq' || wl === 'resb' || wl === 'resw' || wl === 'resd' || wl === 'resq' || wl === 'equ' || wl === 'org' || wl === 'align' || wl === 'times')) {
          out += '<span class="asm-dir">' + esc(word) + '</span>';
          i = j;
          continue;
        }
        // Instructions
        if (NASM_INSTRS.has(wl)) {
          out += '<span class="asm-kw">' + esc(word) + '</span>';
          i = j;
          continue;
        }
        out += esc(word);
        i = j;
        continue;
      }
      // Directives starting with .
      if (line[i] === '.') {
        let j = i;
        while (j < line.length && /[\w]/.test(line[j])) j++;
        out += '<span class="asm-dir">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Strings
      if (line[i] === '"' || line[i] === "'") {
        const q = line[i];
        let j = i + 1;
        while (j < line.length && line[j] !== q) {
          if (line[j] === '\\') j++;
          j++;
        }
        j++;
        out += '<span class="asm-str">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Numbers
      if (/[0-9]/.test(line[i]) || (line[i] === '$' && /[0-9]/.test(line[i + 1] || ''))) {
        let j = i;
        while (j < line.length && /[0-9a-fA-FxXbBoOhH_]/.test(line[j])) j++;
        out += '<span class="asm-num">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      out += esc(line[i]);
      i++;
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

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '');
  const flavor = detectFlavor(text);
  const { sections, labels, macros, externs, globals } = analyzeAsm(text);

  const host = document.createElement('div');
  host.className = 'asm-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'asm-title';
  const badge = document.createElement('span');
  badge.className = 'asm-badge';
  badge.textContent = flavor;
  title.appendChild(badge);
  title.appendChild(document.createTextNode(name));
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'asm-sub';
  const parts = [];
  parts.push(`${sections.length} section${sections.length !== 1 ? 's' : ''}`);
  parts.push(`${labels.length} label${labels.length !== 1 ? 's' : ''}`);
  if (globals.length) parts.push(`${globals.length} global${globals.length !== 1 ? 's' : ''}`);
  if (externs.length) parts.push(`${externs.length} extern${externs.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'asm-cards';
  const cardItems = [
    { value: flavor, label: 'Flavor' },
    { value: sections.length, label: 'Sections' },
    { value: labels.length, label: 'Labels' },
    { value: macros.length, label: 'Macros' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'asm-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Sections
  if (sections.length > 0) {
    const sec = makeSection(host, `Sections (${sections.length})`);
    const ul = makeList(sec);
    for (const s of sections) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'asm-tag asm-tag-sec';
      const known = { '.text': 'code', '.data': 'data', '.bss': 'uninit', '.rodata': 'const', 'text': 'code', 'data': 'data', 'bss': 'uninit' };
      tag.textContent = known[s.toLowerCase()] || 'custom';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + s));
      ul.appendChild(li);
    }
  }

  // Globals / externs
  if (globals.length > 0 || externs.length > 0) {
    const sec = makeSection(host, `Symbols (${globals.length + externs.length})`);
    const ul = makeList(sec);
    for (const g of globals) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'asm-tag asm-tag-ext';
      tag.textContent = 'global';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + g));
      ul.appendChild(li);
    }
    for (const e of externs) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'asm-tag';
      tag.textContent = 'extern';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + e));
      ul.appendChild(li);
    }
  }

  // Labels
  if (labels.length > 0) {
    const MAX = 20;
    const shown = labels.slice(0, MAX);
    const sec = makeSection(host, `Labels (${labels.length})`);
    const ul = makeList(sec);
    for (const lbl of shown) {
      const li = document.createElement('li');
      li.textContent = lbl + ':';
      ul.appendChild(li);
    }
    if (labels.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${labels.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Macros
  if (macros.length > 0) {
    const sec = makeSection(host, `Macros (${macros.length})`);
    const ul = makeList(sec);
    for (const m of macros) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'asm-tag asm-tag-macro';
      tag.textContent = 'macro';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + m));
      ul.appendChild(li);
    }
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'asm-pre';
  pre.innerHTML = highlightAsm(text, flavor);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
