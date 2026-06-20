const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ps1-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ps1-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#012456;color:#fff;vertical-align:middle;margin-right:8px;}
.ps1-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#e0e7ff;color:#012456;vertical-align:middle;margin-left:6px;}
.ps1-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ps1-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ps1-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.ps1-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.ps1-card strong{display:block;font-size:1.2rem;font-weight:700;}
.ps1-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.ps1-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.ps1-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.ps1-list{margin:0;padding:0;list-style:none;}
.ps1-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.ps1-list li:last-child{border-bottom:none;}
.ps1-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e0e7ff;color:#012456;font-weight:700;}
.ps1-tag-fn{background:#dcfce7;color:#166534;}
.ps1-tag-mod{background:#fef3c7;color:#92400e;}
.ps1-tag-req{background:#fde8e8;color:#cc342d;}
.ps1-tag-export{background:#ede9fe;color:#7f52ff;}
.ps1-tag-param{background:#e0f2fe;color:#075985;}
.ps1-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.ps1-kw{color:#012456;font-weight:600;}
.ps1-str{color:#0a6640;}
.ps1-comment{color:#6e7781;font-style:italic;}
.ps1-var{color:#005cc5;}
.ps1-num{color:#b45309;}
.ps1-cmdlet{color:#7f52ff;}
`;

const PS_KEYWORDS = new Set([
  'function', 'param', 'begin', 'process', 'end', 'return', 'if', 'else',
  'elseif', 'switch', 'foreach', 'for', 'while', 'do', 'until', 'break',
  'continue', 'throw', 'try', 'catch', 'finally', 'trap', 'filter',
  'workflow', 'parallel', 'sequence', 'inlinescript', 'class', 'enum',
  'using', 'namespace', 'module', 'requires', 'exit', 'return', 'in',
  '$true', '$false', '$null', '$_', '$PSScriptRoot', '$PSCommandPath',
  '$PSVersionTable', '$Error', '$args', '$input', '$MyInvocation',
]);

function analyzePs(text, ext) {
  const lines = text.split(/\r?\n/);
  const functions = [];
  const imports = [];
  const requires = [];
  const exports = [];
  const vars = [];
  const cmdlets = new Map();
  const paramLines = [];
  let inParamBlock = false;
  let paramDepth = 0;
  let currentFn = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('#')) {
      // #Requires directives
      const reqM = trimmed.match(/^#Requires\s+(.+)/i);
      if (reqM) requires.push(reqM[1].trim());
      continue;
    }

    // Function definition
    const fnM = trimmed.match(/^function\s+([\w-]+)\s*\{?/i);
    if (fnM) {
      currentFn = fnM[1];
      functions.push({ name: fnM[1], params: [] });
      continue;
    }

    // Import-Module / using module
    const impM = trimmed.match(/^(?:Import-Module|using\s+module)\s+([^\s;-][^\s;]+)/i);
    if (impM) { imports.push(impM[1].replace(/['"]/g, '')); continue; }

    // Export-ModuleMember
    const expM = trimmed.match(/^Export-ModuleMember\s+-Function\s+(.+)/i);
    if (expM) {
      const names = expM[1].match(/[\w-]+/g) || [];
      exports.push(...names);
      continue;
    }

    // param block — collect parameter names
    if (/^param\s*\(/i.test(trimmed)) {
      inParamBlock = true;
      paramDepth = 0;
    }
    if (inParamBlock) {
      for (const ch of line) {
        if (ch === '(') paramDepth++;
        if (ch === ')') paramDepth--;
      }
      const pM = trimmed.match(/^\$(\w+)/);
      if (pM) paramLines.push(pM[1]);
      if (paramDepth <= 0) inParamBlock = false;
    }

    // Variable declarations
    const varM = trimmed.match(/^\$(\w+)\s*=/);
    if (varM && varM[1] !== '_') {
      vars.push('$' + varM[1]);
    }

    // Count cmdlet calls (Verb-Noun pattern)
    const cmdM = line.matchAll(/\b([A-Z][a-z]+-[A-Z][a-zA-Z]+)\b/g);
    for (const m of cmdM) {
      const cmd = m[1];
      cmdlets.set(cmd, (cmdlets.get(cmd) || 0) + 1);
    }
  }

  // Top cmdlets by count
  const topCmdlets = [...cmdlets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([cmd, count]) => ({ cmd, count }));

  return { functions, imports, requires, exports, vars, paramLines, topCmdlets };
}

function highlightPs(text) {
  const lines = text.split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Full-line comments (including #Requires)
    if (trimmed.startsWith('#')) {
      result.push('<span class="ps1-comment">' + esc(line) + '</span>');
      continue;
    }
    // Block comments <# ... #>
    if (trimmed.startsWith('<#')) {
      result.push('<span class="ps1-comment">' + esc(line) + '</span>');
      continue;
    }

    let out = '';
    let i = 0;
    while (i < line.length) {
      // Inline comment
      if (line[i] === '#') {
        out += '<span class="ps1-comment">' + esc(line.slice(i)) + '</span>';
        break;
      }
      // Variable
      if (line[i] === '$' && i + 1 < line.length && /[A-Za-z_]/.test(line[i + 1])) {
        let j = i + 1;
        while (j < line.length && /[\w:?]/.test(line[j])) j++;
        out += '<span class="ps1-var">' + esc(line.slice(i, j)) + '</span>';
        i = j; continue;
      }
      // String double-quoted
      if (line[i] === '"') {
        let j = i + 1;
        while (j < line.length && line[j] !== '"') { if (line[j] === '`') j++; j++; }
        j++;
        out += '<span class="ps1-str">' + esc(line.slice(i, j)) + '</span>';
        i = j; continue;
      }
      // String single-quoted
      if (line[i] === "'") {
        let j = i + 1;
        while (j < line.length && line[j] !== "'") j++;
        j++;
        out += '<span class="ps1-str">' + esc(line.slice(i, j)) + '</span>';
        i = j; continue;
      }
      // Numbers
      if (/[0-9]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[0-9._xXbBKMGB]/.test(line[j])) j++;
        out += '<span class="ps1-num">' + esc(line.slice(i, j)) + '</span>';
        i = j; continue;
      }
      // Cmdlets (Verb-Noun) and keywords
      if (/[A-Za-z_]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[\w-]/.test(line[j])) {
          // Stop before - if next char is not word/alpha (to avoid eating -Parameters)
          if (line[j] === '-' && (j + 1 >= line.length || !/[A-Za-z]/.test(line[j + 1]))) break;
          j++;
        }
        const word = line.slice(i, j);
        if (PS_KEYWORDS.has(word.toLowerCase()) || PS_KEYWORDS.has(word)) {
          out += '<span class="ps1-kw">' + esc(word) + '</span>';
        } else if (/^[A-Z][a-z]+-[A-Z][a-zA-Z]+$/.test(word)) {
          out += '<span class="ps1-cmdlet">' + esc(word) + '</span>';
        } else {
          out += esc(word);
        }
        i = j; continue;
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
  sec.className = 'ps1-section';
  const hd = document.createElement('div');
  hd.className = 'ps1-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'ps1-list';
  sec.appendChild(ul);
  return ul;
}

export async function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
  const ext = filename.split('.').pop();

  // Badge
  let badgeLabel = 'PowerShell Script';
  if (ext === 'psm1') badgeLabel = 'PowerShell Module';
  else if (ext === 'psd1') badgeLabel = 'PowerShell Data';

  const { functions, imports, requires, exports, vars, paramLines, topCmdlets } = analyzePs(text, ext);

  const host = document.createElement('div');
  host.className = 'ps1-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'ps1-title';
  title.innerHTML = '<span class="ps1-badge">PowerShell</span><span class="ps1-badge-sub">' + esc(badgeLabel) + '</span>';
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'ps1-sub';
  const parts = [];
  parts.push(`${functions.length} function${functions.length !== 1 ? 's' : ''}`);
  if (imports.length) parts.push(`${imports.length} import${imports.length !== 1 ? 's' : ''}`);
  if (requires.length) parts.push(`${requires.length} #Requires`);
  if (topCmdlets.length) parts.push(`${topCmdlets.length} unique cmdlets`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'ps1-cards';
  const cardItems = [
    { value: functions.length, label: 'Functions' },
    { value: imports.length || '—', label: 'Imports' },
    { value: paramLines.length || '—', label: 'Params' },
    { value: topCmdlets.length, label: 'Cmdlets' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'ps1-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // #Requires directives
  if (requires.length > 0) {
    const sec = makeSection(host, `#Requires Directives (${requires.length})`);
    const ul = makeList(sec);
    for (const req of requires) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'ps1-tag ps1-tag-req';
      tag.textContent = '#Requires';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + req));
      ul.appendChild(li);
    }
  }

  // Functions
  if (functions.length > 0) {
    const sec = makeSection(host, `Functions (${functions.length})`);
    const ul = makeList(sec);
    for (const { name } of functions) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'ps1-tag ps1-tag-fn';
      tag.textContent = 'function';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Param block
  if (paramLines.length > 0) {
    const sec = makeSection(host, `Parameters (${paramLines.length})`);
    const ul = makeList(sec);
    for (const p of paramLines) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'ps1-tag ps1-tag-param';
      tag.textContent = 'param';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' $' + p));
      ul.appendChild(li);
    }
  }

  // Imports
  if (imports.length > 0) {
    const sec = makeSection(host, `Module Imports (${imports.length})`);
    const ul = makeList(sec);
    for (const imp of imports) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'ps1-tag ps1-tag-mod';
      tag.textContent = 'Import-Module';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + imp));
      ul.appendChild(li);
    }
  }

  // Exported functions
  if (exports.length > 0) {
    const sec = makeSection(host, `Exported Functions (${exports.length})`);
    const ul = makeList(sec);
    for (const name of exports) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'ps1-tag ps1-tag-export';
      tag.textContent = 'export';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Top cmdlets
  if (topCmdlets.length > 0) {
    const sec = makeSection(host, `Cmdlet Usage (top ${topCmdlets.length})`);
    const ul = makeList(sec);
    for (const { cmd, count } of topCmdlets) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'ps1-tag';
      tag.textContent = `×${count}`;
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + cmd));
      ul.appendChild(li);
    }
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'ps1-pre';
  pre.innerHTML = highlightPs(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
