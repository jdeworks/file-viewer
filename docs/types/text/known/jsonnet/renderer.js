const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.jnet-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.jnet-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.jnet-lib-badge{background:#0891b2;}
.jnet-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.jnet-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.jnet-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.jnet-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.jnet-card strong{display:block;font-size:1.2rem;font-weight:700;}
.jnet-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.jnet-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.jnet-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.jnet-list{margin:0;padding:0;list-style:none;}
.jnet-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;}
.jnet-list li:last-child{border-bottom:none;}
.jnet-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.jnet-kw{color:#7c3aed;font-weight:600;}
.jnet-str{color:#0369a1;}
.jnet-comment{color:#6e7781;font-style:italic;}
.jnet-num{color:#b45309;}
.jnet-std{color:#0891b2;}
`;

const KEYWORDS = ['local', 'function', 'import', 'importstr', 'if', 'then', 'else', 'error', 'null', 'true', 'false', 'self', 'super', 'assert', 'in'];

function analyzeJsonnet(text) {
  const lines = (text || '').split(/\r?\n/);
  let imports = 0;
  let locals = 0;
  const functions = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip comment lines
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
    // Count imports
    if (/^\s*(local\s+\w+\s*=\s*)?import\s+/.test(line)) imports++;
    // Count locals
    if (/^\s*local\s+/.test(line)) locals++;
    // Top-level function signatures: local name = function(params) or name(params)::
    const fnMatch = line.match(/^\s*local\s+(\w+)\s*=\s*function\s*(\([^)]*\))/);
    if (fnMatch) functions.push(fnMatch[1] + fnMatch[2]);
    const fnMatch2 = line.match(/^\s*(\w+)\s*(\([^)]*\))\s*::/);
    if (fnMatch2) functions.push(fnMatch2[1] + fnMatch2[2]);
  }

  return { imports, locals, functions };
}

function highlightJsonnet(text) {
  const lines = (text || '').split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    // Detect comment lines
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
      result.push('<span class="jnet-comment">' + esc(line) + '</span>');
      continue;
    }

    // Simple token-based highlighting
    let out = '';
    let i = 0;
    const escaped = esc(line);
    // We work on the original line and build escaped output token by token
    const chars = line;
    while (i < chars.length) {
      // String literals
      if (chars[i] === '"' || chars[i] === "'") {
        const quote = chars[i];
        let j = i + 1;
        while (j < chars.length && chars[j] !== quote) {
          if (chars[j] === '\\') j++;
          j++;
        }
        j++; // include closing quote
        out += '<span class="jnet-str">' + esc(chars.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // std. prefix
      if (chars.slice(i, i + 4) === 'std.') {
        let j = i + 4;
        while (j < chars.length && /\w/.test(chars[j])) j++;
        out += '<span class="jnet-std">' + esc(chars.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Keywords
      if (/[a-z$]/.test(chars[i])) {
        let j = i;
        while (j < chars.length && /[\w$]/.test(chars[j])) j++;
        const word = chars.slice(i, j);
        if (KEYWORDS.includes(word)) {
          out += '<span class="jnet-kw">' + esc(word) + '</span>';
        } else {
          out += esc(word);
        }
        i = j;
        continue;
      }
      // Numbers
      if (/[0-9]/.test(chars[i])) {
        let j = i;
        while (j < chars.length && /[0-9.]/.test(chars[j])) j++;
        out += '<span class="jnet-num">' + esc(chars.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      out += esc(chars[i]);
      i++;
    }
    result.push(out);
  }
  return result.join('\n');
}

export function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').toLowerCase();
  const isLib = filename.endsWith('.libsonnet');
  const { imports, locals, functions } = analyzeJsonnet(text);

  const host = document.createElement('div');
  host.className = 'jnet-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'jnet-title';
  const badgeClass = isLib ? 'jnet-badge jnet-lib-badge' : 'jnet-badge';
  title.innerHTML = `<span class="${badgeClass}">${isLib ? 'Jsonnet Library' : 'Jsonnet'}</span>`;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'jnet-sub';
  sub.textContent = `${imports} import${imports !== 1 ? 's' : ''} · ${locals} local${locals !== 1 ? 's' : ''} · ${functions.length} function${functions.length !== 1 ? 's' : ''}`;
  host.appendChild(sub);

  // Summary cards
  const cards = document.createElement('div');
  cards.className = 'jnet-cards';
  const lineCount = text.split('\n').length;
  for (const { value, label } of [
    { value: imports, label: 'Imports' },
    { value: locals, label: 'Locals' },
    { value: functions.length, label: 'Functions' },
    { value: lineCount, label: 'Lines' },
  ]) {
    const card = document.createElement('div');
    card.className = 'jnet-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Function signatures
  if (functions.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'jnet-section';
    const hd = document.createElement('div');
    hd.className = 'jnet-section-hd';
    hd.textContent = 'Function Signatures';
    sec.appendChild(hd);
    const ul = document.createElement('ul');
    ul.className = 'jnet-list';
    for (const fn of functions) {
      const li = document.createElement('li');
      li.textContent = fn;
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  // Syntax-highlighted source
  const srcSec = document.createElement('div');
  srcSec.className = 'jnet-section';
  const srcHd = document.createElement('div');
  srcHd.className = 'jnet-section-hd';
  srcHd.textContent = 'Source';
  srcSec.appendChild(srcHd);
  const pre = document.createElement('pre');
  pre.className = 'jnet-pre';
  pre.innerHTML = highlightJsonnet(text);
  srcSec.appendChild(pre);
  host.appendChild(srcSec);

  return { parentNode: host };
}
