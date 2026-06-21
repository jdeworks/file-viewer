const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dhall-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.dhall-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1d4ed8;color:#fff;vertical-align:middle;margin-right:8px;}
.dhall-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.dhall-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.dhall-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.dhall-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.dhall-card strong{display:block;font-size:1.2rem;font-weight:700;}
.dhall-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.dhall-tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;}
.dhall-tag{font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f0f6ff);border:1px solid #bfdbfe;color:#1d4ed8;}
.dhall-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.dhall-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.dhall-list{margin:0;padding:0;list-style:none;}
.dhall-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;}
.dhall-list li:last-child{border-bottom:none;}
.dhall-import-local{color:#1d4ed8;}
.dhall-import-remote{color:#0891b2;}
.dhall-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.dhall-kw{color:#1d4ed8;font-weight:600;}
.dhall-builtin{color:#7c3aed;font-weight:600;}
.dhall-str{color:#0369a1;}
.dhall-comment{color:#6e7781;font-style:italic;}
.dhall-num{color:#b45309;}
.dhall-url{color:#0891b2;}
`;

const KEYWORDS = new Set(['let', 'in', 'if', 'then', 'else', 'merge', 'toMap', 'assert', 'as', 'using', 'missing']);
const BUILTINS = new Set(['Some', 'None', 'True', 'False', 'Natural', 'Integer', 'Double', 'Text', 'List', 'Optional', 'Type', 'Kind', 'Sort', 'Bool']);

function analyzeDhall(text) {
  const lines = (text || '').split(/\r?\n/);
  let letCount = 0;
  let localImports = 0;
  let remoteImports = 0;
  let typeAnnotations = 0;
  const imports = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) continue;

    // let bindings
    if (/^\s*let\s+\w+/.test(line)) letCount++;

    // Local imports: ./something or ../something
    const localMatches = line.match(/\.\.[/\\][\w./\\-]+|\.\/[\w./\\-]+/g);
    if (localMatches) {
      for (const m of localMatches) {
        localImports++;
        imports.push({ kind: 'local', path: m });
      }
    }

    // Remote imports: https://...
    const remoteMatches = line.match(/https?:\/\/[^\s)]+/g);
    if (remoteMatches) {
      for (const m of remoteMatches) {
        remoteImports++;
        // Strip sha256 hash if present
        const path = m.replace(/\s+sha256:[0-9a-f]{64}.*/, '');
        imports.push({ kind: 'remote', path });
      }
    }

    // Type annotations: expr : Type
    if (/:\s*[A-Z][\w.]*/.test(line) && !/^\s*--/.test(line)) typeAnnotations++;
  }

  const firstNonComment = lines.find(l => l.trim() && !l.trim().startsWith('--')) || '';
  const isRecord = firstNonComment.trimStart().startsWith('{');
  const isFunction = /\\\\?\s*\(|λ/.test(firstNonComment);
  const isList = firstNonComment.trimStart().startsWith('[');
  const isLet = /^\s*let\s+/.test(firstNonComment);

  let topLevelKind = 'expression';
  if (isRecord) topLevelKind = 'record';
  else if (isFunction) topLevelKind = 'function';
  else if (isList) topLevelKind = 'list';
  else if (isLet) topLevelKind = 'let-expression';

  return { letCount, localImports, remoteImports, typeAnnotations, imports, topLevelKind };
}

function highlightDhall(text) {
  const lines = (text || '').split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Line comments
    if (trimmed.startsWith('--')) {
      result.push('<span class="dhall-comment">' + esc(line) + '</span>');
      continue;
    }

    let out = '';
    let i = 0;
    const chars = line;
    while (i < chars.length) {
      // Line comment in middle of line
      if (chars[i] === '-' && chars[i + 1] === '-') {
        out += '<span class="dhall-comment">' + esc(chars.slice(i)) + '</span>';
        i = chars.length;
        continue;
      }
      // String literal
      if (chars[i] === '"') {
        let j = i + 1;
        while (j < chars.length && chars[j] !== '"') {
          if (chars[j] === '\\') j++;
          j++;
        }
        j++;
        out += '<span class="dhall-str">' + esc(chars.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // URL (https://)
      if (chars.slice(i, i + 8) === 'https://' || chars.slice(i, i + 7) === 'http://') {
        let j = i;
        while (j < chars.length && !/[\s)},]/.test(chars[j])) j++;
        out += '<span class="dhall-url">' + esc(chars.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Keywords and builtins
      if (/[a-zA-Z_λ\\]/.test(chars[i])) {
        let j = i;
        while (j < chars.length && /[\w/]/.test(chars[j])) j++;
        // Lambda symbols (\ or λ) match the branch but can't extend (they aren't \w), so j===i
        // here. Emit the single char and advance — otherwise i never moves and the line tokenizer
        // spins forever, freezing the page on any Dhall file with a lambda.
        if (j === i) {
          out += '<span class="dhall-kw">' + esc(chars[i]) + '</span>';
          i++;
          continue;
        }
        const word = chars.slice(i, j);
        if (KEYWORDS.has(word)) {
          out += '<span class="dhall-kw">' + esc(word) + '</span>';
        } else if (BUILTINS.has(word)) {
          out += '<span class="dhall-builtin">' + esc(word) + '</span>';
        } else {
          out += esc(word);
        }
        i = j;
        continue;
      }
      // Numbers
      if (/[0-9]/.test(chars[i]) || (chars[i] === '+' && /[0-9]/.test(chars[i + 1]))) {
        let j = i;
        if (chars[j] === '+') j++;
        while (j < chars.length && /[0-9.]/.test(chars[j])) j++;
        out += '<span class="dhall-num">' + esc(chars.slice(i, j)) + '</span>';
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
  const { letCount, localImports, remoteImports, typeAnnotations, imports, topLevelKind } = analyzeDhall(text);

  const host = document.createElement('div');
  host.className = 'dhall-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'dhall-title';
  title.innerHTML = '<span class="dhall-badge">Dhall</span>';
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'dhall-sub';
  sub.textContent = `${letCount} let-binding${letCount !== 1 ? 's' : ''} · ${localImports + remoteImports} import${localImports + remoteImports !== 1 ? 's' : ''} · ${typeAnnotations} type annotation${typeAnnotations !== 1 ? 's' : ''}`;
  host.appendChild(sub);

  // Kind tags
  const tagsEl = document.createElement('div');
  tagsEl.className = 'dhall-tags';
  const kindTag = document.createElement('span');
  kindTag.className = 'dhall-tag';
  kindTag.textContent = 'top-level: ' + topLevelKind;
  tagsEl.appendChild(kindTag);
  if (localImports > 0) {
    const t = document.createElement('span');
    t.className = 'dhall-tag';
    t.textContent = localImports + ' local import' + (localImports !== 1 ? 's' : '');
    tagsEl.appendChild(t);
  }
  if (remoteImports > 0) {
    const t = document.createElement('span');
    t.className = 'dhall-tag';
    t.textContent = remoteImports + ' remote import' + (remoteImports !== 1 ? 's' : '');
    tagsEl.appendChild(t);
  }
  host.appendChild(tagsEl);

  // Summary cards
  const cards = document.createElement('div');
  cards.className = 'dhall-cards';
  for (const { value, label } of [
    { value: letCount, label: 'Let-bindings' },
    { value: localImports, label: 'Local imports' },
    { value: remoteImports, label: 'Remote imports' },
    { value: typeAnnotations, label: 'Type annotations' },
  ]) {
    const card = document.createElement('div');
    card.className = 'dhall-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Imports section
  if (imports.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'dhall-section';
    const hd = document.createElement('div');
    hd.className = 'dhall-section-hd';
    hd.textContent = 'Imports';
    sec.appendChild(hd);
    const ul = document.createElement('ul');
    ul.className = 'dhall-list';
    for (const { kind, path } of imports) {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.className = kind === 'local' ? 'dhall-import-local' : 'dhall-import-remote';
      span.textContent = path;
      li.appendChild(span);
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  // Syntax-highlighted source
  const srcSec = document.createElement('div');
  srcSec.className = 'dhall-section';
  const srcHd = document.createElement('div');
  srcHd.className = 'dhall-section-hd';
  srcHd.textContent = 'Source';
  srcSec.appendChild(srcHd);
  const pre = document.createElement('pre');
  pre.className = 'dhall-pre';
  pre.innerHTML = highlightDhall(text);
  srcSec.appendChild(pre);
  host.appendChild(srcSec);

  return { parentNode: host };
}
