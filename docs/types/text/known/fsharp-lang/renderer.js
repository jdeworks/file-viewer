const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fs-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.fs-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#378bbd;color:#fff;vertical-align:middle;margin-right:8px;}
.fs-kind-badge{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#e8f4fb;color:#378bbd;border:1px solid #378bbd;vertical-align:middle;margin-left:6px;}
.fs-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.fs-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.fs-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.fs-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.fs-card strong{display:block;font-size:1.2rem;font-weight:700;}
.fs-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.fs-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.fs-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.fs-list{margin:0;padding:0;list-style:none;}
.fs-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.fs-list li:last-child{border-bottom:none;}
.fs-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e8f4fb;color:#378bbd;font-weight:700;flex-shrink:0;}
.fs-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.fs-kw{color:#7c3aed;font-weight:600;}
.fs-str{color:#0a6640;}
.fs-comment{color:#6e7781;font-style:italic;}
.fs-type{color:#0369a1;font-weight:600;}
.fs-attr{color:#b45309;font-weight:600;}
.fs-num{color:#b45309;}
`;

const FS_KEYWORDS = new Set([
  'let', 'rec', 'in', 'fun', 'match', 'with', 'type', 'of', 'module', 'open',
  'if', 'then', 'else', 'begin', 'end', 'exception', 'try', 'raise', 'member',
  'interface', 'abstract', 'override', 'inherit', 'when', 'as', 'for', 'while',
  'do', 'yield', 'async', 'return', 'and', 'or', 'not', 'true', 'false',
  'mutable', 'struct', 'new', 'null', 'void', 'namespace', 'val', 'inline',
  'static', 'private', 'public', 'internal', 'class', 'with',
]);

function analyzeFSharp(text, ext) {
  // Module name
  let moduleName = null;
  const modM = text.match(/^(?:module|namespace)\s+([\w.]+)/m);
  if (modM) moduleName = modM[1];

  // Opens
  const opens = [];
  const openRe = /^open\s+([\w.]+)/gm;
  let m;
  while ((m = openRe.exec(text)) !== null) {
    if (!opens.includes(m[1])) opens.push(m[1]);
  }

  // Type definitions
  const types = [];
  const typeRe = /^type\s+(\w+)/gm;
  while ((m = typeRe.exec(text)) !== null) {
    const name = m[1];
    // Determine kind: record, DU, alias
    const afterType = text.slice(m.index + m[0].length, m.index + m[0].length + 60);
    let kind = 'alias';
    if (/^\s*=\s*\{/.test(afterType)) kind = 'record';
    else if (/^\s*=\s*\n?\s*\|/.test(afterType)) kind = 'DU';
    if (!types.find((t) => t.name === name)) types.push({ name, kind });
  }

  // Let bindings (top-level)
  const bindings = [];
  const letRe = /^let\s+(?:rec\s+)?(\w+)/gm;
  while ((m = letRe.exec(text)) !== null) {
    const name = m[1];
    if (name !== '_' && !bindings.find((b) => b === name)) bindings.push(name);
    if (bindings.length >= 12) break;
  }

  // Members
  const members = [];
  const memberRe = /^\s+(?:member|abstract|override)\s+\w+\.(\w+)/gm;
  while ((m = memberRe.exec(text)) !== null) {
    if (!members.includes(m[1])) members.push(m[1]);
    if (members.length >= 8) break;
  }

  // Attributes: count [< ... >] occurrences
  const attrCount = (text.match(/\[</g) || []).length;

  // Async/task blocks
  const asyncCount = (text.match(/\basync\s*\{/g) || []).length;
  const taskCount = (text.match(/\btask\s*\{/g) || []).length;

  return { moduleName, opens, types, bindings, members, attrCount, asyncCount, taskCount };
}

function highlightFSharp(text) {
  return text.split(/\r?\n/).map((line) => highlightFsLine(line)).join('\n');
}

function highlightFsLine(line) {
  // Line comments //
  const slashIdx = line.indexOf('//');
  let code = line;
  let commentSuffix = '';
  if (slashIdx !== -1) {
    const before = line.slice(0, slashIdx);
    const quoteCount = (before.match(/"/g) || []).length;
    if (quoteCount % 2 === 0) {
      code = line.slice(0, slashIdx);
      commentSuffix = '<span class="fs-comment">' + esc(line.slice(slashIdx)) + '</span>';
    }
  }

  let escaped = esc(code);
  // String literals
  escaped = escaped.replace(/(&quot;[^&]*&quot;)/g, '<span class="fs-str">$1</span>');
  // Attributes [< >]
  escaped = escaped.replace(/(\[&lt;[^&]*&gt;\])/g, '<span class="fs-attr">$1</span>');
  // Numbers
  escaped = escaped.replace(/\b(\d+(?:\.\d+)?(?:[mMLuUy])?)\b/g, '<span class="fs-num">$1</span>');
  // Type names
  escaped = escaped.replace(/\b([A-Z][a-zA-Z0-9_']*)/g, '<span class="fs-type">$1</span>');
  // Keywords
  escaped = escaped.replace(
    new RegExp(`\\b(${[...FS_KEYWORDS].join('|')})\\b`, 'g'),
    '<span class="fs-kw">$1</span>',
  );
  return escaped + commentSuffix;
}

function makeSection(title, items, tagFn) {
  if (!items || items.length === 0) return null;
  const sec = document.createElement('div');
  sec.className = 'fs-section';
  const hd = document.createElement('div');
  hd.className = 'fs-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  const ul = document.createElement('ul');
  ul.className = 'fs-list';
  for (const item of items) {
    const li = document.createElement('li');
    if (tagFn) {
      const tag = document.createElement('span');
      tag.className = 'fs-tag';
      tag.textContent = tagFn(item);
      li.appendChild(tag);
    }
    const nameSpan = document.createElement('span');
    nameSpan.textContent = typeof item === 'string' ? item : (item.name || String(item));
    li.appendChild(nameSpan);
    ul.appendChild(li);
  }
  sec.appendChild(ul);
  return sec;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').toLowerCase();
  const ext = name.endsWith('.fsi') ? '.fsi' : name.endsWith('.fsx') ? '.fsx' : '.fs';
  const info = analyzeFSharp(text, ext);

  const host = document.createElement('div');
  host.className = 'fs-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'fs-title';
  const kindLabel = ext === '.fsi' ? 'Signature (.fsi)' : ext === '.fsx' ? 'Script (.fsx)' : 'Source (.fs)';
  let titleHtml = '<span class="fs-badge">F#</span>';
  titleHtml += `<span class="fs-kind-badge">${esc(kindLabel)}</span>`;
  if (info.moduleName) titleHtml += ` <span style="font-size:13px;font-weight:400;">${esc(info.moduleName)}</span>`;
  title.innerHTML = titleHtml;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'fs-sub';
  const parts = [];
  if (info.opens.length) parts.push(`${info.opens.length} open${info.opens.length !== 1 ? 's' : ''}`);
  if (info.types.length) parts.push(`${info.types.length} type${info.types.length !== 1 ? 's' : ''}`);
  if (info.bindings.length) parts.push(`${info.bindings.length} let binding${info.bindings.length !== 1 ? 's' : ''}`);
  if (info.attrCount) parts.push(`${info.attrCount} attribute${info.attrCount !== 1 ? 's' : ''}`);
  if (info.asyncCount + info.taskCount) parts.push(`${info.asyncCount + info.taskCount} async/task block${info.asyncCount + info.taskCount !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ') || 'No declarations found';
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'fs-cards';
  for (const { value, label } of [
    { value: info.opens.length, label: 'Opens' },
    { value: info.types.length, label: 'Types' },
    { value: info.bindings.length, label: 'Let bindings' },
    { value: info.members.length, label: 'Members' },
    { value: info.attrCount, label: 'Attributes' },
  ]) {
    const card = document.createElement('div');
    card.className = 'fs-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  const opensEl = makeSection('Opens', info.opens);
  if (opensEl) host.appendChild(opensEl);

  const typesEl = makeSection('Type Definitions', info.types, (t) => t.kind);
  if (typesEl) host.appendChild(typesEl);

  const bindingsEl = makeSection('Let Bindings', info.bindings);
  if (bindingsEl) host.appendChild(bindingsEl);

  const membersEl = makeSection('Members', info.members);
  if (membersEl) host.appendChild(membersEl);

  // Source
  const srcSec = document.createElement('div');
  srcSec.className = 'fs-section';
  const srcHd = document.createElement('div');
  srcHd.className = 'fs-section-hd';
  srcHd.textContent = 'Source';
  srcSec.appendChild(srcHd);
  const pre = document.createElement('pre');
  pre.className = 'fs-pre';
  pre.innerHTML = highlightFSharp(text);
  srcSec.appendChild(pre);
  host.appendChild(srcSec);

  return { parentNode: host };
}
