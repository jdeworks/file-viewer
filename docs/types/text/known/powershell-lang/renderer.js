const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ps1-doc{padding:16px 18px;max-width:980px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
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
.ps1-list li{padding:6px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.ps1-list li:last-child{border-bottom:none;}
.ps1-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.ps1-link:hover{color:#012456;}
.ps1-note{color:var(--fg-2,#5a6678);font-family:system-ui,sans-serif;font-size:12px;flex-basis:100%;margin-left:0;}
.ps1-param-meta{display:inline-flex;gap:4px;align-items:center;flex-wrap:wrap;}
.ps1-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e0e7ff;color:#012456;font-weight:700;}
.ps1-tag-fn{background:#dcfce7;color:#166534;}
.ps1-tag-mod{background:#fef3c7;color:#92400e;}
.ps1-tag-req{background:#fde8e8;color:#cc342d;}
.ps1-tag-export{background:#ede9fe;color:#7f52ff;}
.ps1-tag-param{background:#e0f2fe;color:#075985;}
.ps1-details{border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;background:var(--bg,#fff);}
.ps1-details summary{cursor:pointer;background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.ps1-source{margin:0;max-height:70vh;overflow:auto;background:var(--bg,#fff);font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;}
.ps1-line{display:grid;grid-template-columns:4.2em minmax(0,1fr);align-items:start;}
.ps1-line:target,.ps1-line.ps1-line-hit{background:#fff7cc;}
.ps1-ln{position:sticky;left:0;background:var(--bg-2,#f6f8fa);color:var(--fg-2,#6e7781);text-align:right;padding:0 10px;border-right:1px solid var(--border,#e0e0e0);user-select:none;}
.ps1-code{white-space:pre-wrap;overflow-wrap:anywhere;padding:0 12px;}
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
  const scriptParams = [];

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
      const range = findFunctionRange(lines, i);
      const help = helpBefore(lines, i);
      const params = collectParams(lines, i + 1, range.endLine, help.params);
      functions.push({
        name: fnM[1],
        line: i + 1,
        id: `ps1-fn-${functions.length}-${slug(fnM[1])}`,
        params,
        summary: help.summary,
        description: help.description,
      });
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

  const firstFunctionLine = functions[0]?.line || lines.length + 1;
  const scriptParamLine = lines.findIndex((line, idx) => idx < firstFunctionLine - 1 && /^\s*param\s*\(/i.test(line));
  const scriptHelp = scriptParamLine >= 0 ? helpBefore(lines, scriptParamLine) : { params: new Map() };
  const topLevelEnd = Math.max(0, firstFunctionLine - 2);
  scriptParams.push(...collectParams(lines, 0, topLevelEnd, scriptHelp.params));

  return { functions, imports, requires, exports, vars, scriptParams, topCmdlets };
}

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
}

function findFunctionRange(lines, start) {
  let depth = 0;
  let opened = false;
  for (let i = start; i < lines.length; i++) {
    const line = stripStringsAndComments(lines[i]);
    for (const ch of line) {
      if (ch === '{') { depth++; opened = true; }
      else if (ch === '}') depth--;
    }
    if (opened && depth <= 0) return { startLine: start, endLine: i };
  }
  return { startLine: start, endLine: lines.length - 1 };
}

function stripStringsAndComments(line) {
  let out = '';
  let quote = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (!quote && ch === '#') break;
    if ((ch === '"' || ch === "'") && line[i - 1] !== '`') {
      quote = quote === ch ? '' : quote || ch;
      out += ' ';
      continue;
    }
    out += quote ? ' ' : ch;
  }
  return out;
}

function helpBefore(lines, lineIndex) {
  let i = lineIndex - 1;
  while (i >= 0 && !lines[i].trim()) i--;
  if (i < 0 || !lines[i].trim().endsWith('#>')) return { summary: '', description: '', params: new Map() };
  const end = i;
  while (i >= 0 && !lines[i].trim().startsWith('<#')) i--;
  if (i < 0) return { summary: '', description: '', params: new Map() };
  return parseCommentHelp(lines.slice(i + 1, end));
}

function parseCommentHelp(lines) {
  const sections = new Map();
  let current = '';
  for (const raw of lines) {
    const line = raw.replace(/^\s*#?\s?/, '').trimEnd();
    const marker = line.match(/^\.(\w+)(?:\s+(.+))?/);
    if (marker) {
      current = marker[1].toUpperCase() + (marker[2] ? ` ${marker[2].trim()}` : '');
      sections.set(current, []);
    } else if (current) {
      sections.get(current).push(line.trim());
    }
  }
  const params = new Map();
  for (const [key, value] of sections.entries()) {
    if (!key.startsWith('PARAMETER ')) continue;
    const name = key.slice('PARAMETER '.length).trim().toLowerCase();
    const note = value.join(' ').replace(/\s+/g, ' ').trim();
    if (name && note) params.set(name, note);
  }
  const textOf = (key) => (sections.get(key) || []).join(' ').replace(/\s+/g, ' ').trim();
  return { summary: textOf('SYNOPSIS'), description: textOf('DESCRIPTION'), params };
}

function collectParams(lines, start, end, help = new Map()) {
  const params = [];
  for (let i = start; i <= end && i < lines.length; i++) {
    if (!/^\s*param\s*\(/i.test(lines[i])) continue;
    const block = collectParenBlock(lines, i);
    for (const param of parseParams(block.lines, block.startLine, help)) params.push(param);
    i = block.endLine;
  }
  return params;
}

function collectParenBlock(lines, start) {
  const out = [];
  let depth = 0;
  let opened = false;
  for (let i = start; i < lines.length; i++) {
    out.push(lines[i]);
    const line = stripStringsAndComments(lines[i]);
    for (const ch of line) {
      if (ch === '(') { depth++; opened = true; }
      else if (ch === ')') depth--;
    }
    if (opened && depth <= 0) return { lines: out, startLine: start, endLine: i };
  }
  return { lines: out, startLine: start, endLine: lines.length - 1 };
}

function parseParams(blockLines, startLine, help) {
  const params = [];
  let pendingAttrs = [];
  for (let i = 0; i < blockLines.length; i++) {
    const line = blockLines[i].trim();
    const attrMatches = [...line.matchAll(/\[([A-Za-z][\w.]*)(?:\(([^]*?)\))?\]/g)];
    const bareLine = line.replace(/\[[^\]]+\]/g, ' ');
    const varM = bareLine.match(/\$(\w+)\b/);
    if (!varM) {
      pendingAttrs.push(...attrMatches.map((m) => ({ name: m[1], args: m[2] || '' })));
      continue;
    }
    const varIndex = line.lastIndexOf('$' + varM[1]);
    const beforeVar = varIndex >= 0 ? line.slice(0, varIndex) : line;
    const attrs = [
      ...pendingAttrs,
      ...[...beforeVar.matchAll(/\[([A-Za-z][\w.]*)(?:\(([^]*?)\))?\]/g)].map((m) => ({ name: m[1], args: m[2] || '' })),
    ];
    const typeAttr = [...attrs].reverse().find((attr) => !/^(Parameter|Alias|Validate\w+|CmdletBinding)$/i.test(attr.name));
    const param = {
      name: varM[1],
      line: startLine + i + 1,
      type: typeAttr ? typeAttr.name : '',
      mandatory: attrs.some((attr) => /^Parameter$/i.test(attr.name) && /Mandatory\s*=\s*\$true/i.test(attr.args)),
      aliases: attrs.filter((attr) => /^Alias$/i.test(attr.name)).flatMap((attr) => quotedArgs(attr.args)),
      validates: attrs.filter((attr) => /^Validate/i.test(attr.name)).map((attr) => ({
        name: attr.name,
        values: quotedArgs(attr.args),
        raw: attr.args,
      })),
      defaultValue: defaultValue(line),
      note: help.get(varM[1].toLowerCase()) || '',
    };
    params.push(param);
    pendingAttrs = [];
  }
  return params;
}

function quotedArgs(s) {
  const quoted = [...String(s).matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
  if (quoted.length) return quoted;
  return String(s).split(',').map((v) => v.trim()).filter(Boolean);
}

function defaultValue(line) {
  const idx = line.indexOf('=');
  if (idx < 0) return '';
  return line.slice(idx + 1).replace(/,\s*$/, '').trim();
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

function tag(text, className = '') {
  const el = document.createElement('span');
  el.className = `ps1-tag ${className}`.trim();
  el.textContent = text;
  return el;
}

function describeFunction(fn) {
  const parts = [`Line ${fn.line}`];
  if (fn.params.length) parts.push(`${fn.params.length} parameter${fn.params.length === 1 ? '' : 's'}`);
  if (fn.summary) parts.push(fn.summary);
  return parts.join(' · ');
}

function paramMeta(param) {
  const out = [];
  if (param.mandatory) out.push('mandatory');
  if (param.type) out.push(param.type);
  if (param.aliases.length) out.push(`aliases: ${param.aliases.join(', ')}`);
  for (const rule of param.validates) {
    out.push(rule.values.length ? `${rule.name}: ${rule.values.join(', ')}` : rule.raw ? `${rule.name}: ${rule.raw}` : rule.name);
  }
  if (param.defaultValue) out.push(`default: ${param.defaultValue}`);
  return out;
}

function appendParamList(host, params) {
  for (const p of params) {
    const li = document.createElement('li');
    li.appendChild(tag('param', 'ps1-tag-param'));
    li.appendChild(document.createTextNode(' $' + p.name));
    const meta = paramMeta(p);
    if (meta.length) {
      const box = document.createElement('span');
      box.className = 'ps1-param-meta';
      for (const item of meta) box.appendChild(tag(item));
      li.appendChild(box);
    }
    if (p.note) {
      const note = document.createElement('div');
      note.className = 'ps1-note';
      note.textContent = p.note;
      li.appendChild(note);
    }
    host.appendChild(li);
  }
}

function sourceHtml(text) {
  return text.split(/\r?\n/).map((line, idx) => (
    `<div class="ps1-line" id="ps1-line-${idx + 1}"><span class="ps1-ln">${idx + 1}</span><span class="ps1-code">${highlightPs(line)}</span></div>`
  )).join('');
}

export async function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
  const ext = filename.split('.').pop();

  // Badge
  let badgeLabel = 'PowerShell Script';
  if (ext === 'psm1') badgeLabel = 'PowerShell Module';
  else if (ext === 'psd1') badgeLabel = 'PowerShell Data';

  const { functions, imports, requires, exports, vars, scriptParams, topCmdlets } = analyzePs(text, ext);

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
    { value: (scriptParams.length + functions.reduce((sum, fn) => sum + fn.params.length, 0)) || '—', label: 'Params' },
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
    for (const fn of functions) {
      const li = document.createElement('li');
      li.appendChild(tag('function', 'ps1-tag-fn'));
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ps1-link';
      btn.textContent = fn.name;
      btn.title = describeFunction(fn);
      btn.addEventListener('click', () => scrollToSource(host, fn.line));
      li.appendChild(btn);
      const meta = [];
      if (fn.params.length) meta.push(`${fn.params.length} param${fn.params.length === 1 ? '' : 's'}`);
      meta.push(`line ${fn.line}`);
      for (const item of meta) li.appendChild(tag(item));
      if (fn.summary || fn.description) {
        const note = document.createElement('div');
        note.className = 'ps1-note';
        note.textContent = fn.summary || fn.description;
        li.appendChild(note);
      }
      ul.appendChild(li);
    }
  }

  // Param blocks
  if (scriptParams.length > 0) {
    const sec = makeSection(host, `Script Parameters (${scriptParams.length})`);
    const ul = makeList(sec);
    appendParamList(ul, scriptParams);
  }

  const functionParamCount = functions.reduce((sum, fn) => sum + fn.params.length, 0);
  if (functionParamCount > 0) {
    const sec = makeSection(host, `Function Parameters (${functionParamCount})`);
    const ul = makeList(sec);
    for (const fn of functions) appendParamList(ul, fn.params.map((p) => ({ ...p, note: p.note || `Declared by ${fn.name} on line ${fn.line}.` })));
  }

  // Imports
  if (imports.length > 0) {
    const sec = makeSection(host, `Module Imports (${imports.length})`);
    const ul = makeList(sec);
    for (const imp of imports) {
      const li = document.createElement('li');
      li.appendChild(tag('Import-Module', 'ps1-tag-mod'));
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
      li.appendChild(tag('export', 'ps1-tag-export'));
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
      li.appendChild(tag(`×${count}`));
      li.appendChild(document.createTextNode(' ' + cmd));
      ul.appendChild(li);
    }
  }

  // Source is collapsed because the primary editor pane already provides the full code.
  const details = document.createElement('details');
  details.className = 'ps1-details';
  const summary = document.createElement('summary');
  summary.textContent = 'Source';
  details.appendChild(summary);
  const source = document.createElement('pre');
  source.className = 'ps1-source';
  source.innerHTML = sourceHtml(text);
  details.appendChild(source);
  host.appendChild(details);

  return { parentNode: host };
}

function scrollToSource(host, line) {
  const details = host.querySelector('.ps1-details');
  if (details) details.open = true;
  const row = host.querySelector(`#ps1-line-${line}`);
  if (!row) return;
  row.classList.add('ps1-line-hit');
  row.scrollIntoView({ block: 'center', behavior: 'smooth' });
  window.setTimeout(() => row.classList.remove('ps1-line-hit'), 1500);
}
