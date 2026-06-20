const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.clj-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.clj-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5dade2;color:#fff;vertical-align:middle;margin-right:8px;}
.clj-kind-badge{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#eaf4fb;color:#2e86c1;border:1px solid #5dade2;vertical-align:middle;margin-left:6px;}
.clj-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.clj-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.clj-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.clj-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.clj-card strong{display:block;font-size:1.2rem;font-weight:700;}
.clj-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.clj-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.clj-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.clj-list{margin:0;padding:0;list-style:none;}
.clj-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.clj-list li:last-child{border-bottom:none;}
.clj-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#eaf4fb;color:#2e86c1;font-weight:700;flex-shrink:0;}
.clj-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.clj-kw{color:#7c3aed;font-weight:600;}
.clj-str{color:#0a6640;}
.clj-comment{color:#6e7781;font-style:italic;}
.clj-sym{color:#0369a1;}
.clj-num{color:#b45309;}
.clj-key{color:#c0392b;}
`;

const CLJ_SPECIALS = new Set([
  'def', 'defn', 'defmacro', 'defrecord', 'defprotocol', 'deftype', 'defmulti', 'defmethod',
  'ns', 'let', 'if', 'when', 'cond', 'case', 'do', 'fn', 'quote', 'and', 'or', 'not',
  'loop', 'recur', 'try', 'catch', 'finally', 'throw', 'import', 'use', 'require',
  'defonce', 'binding', 'atom', 'ref', 'agent', 'deref', 'reset!', 'swap!',
  'for', 'doseq', 'dotimes', 'while', 'go',
]);

function analyzeClojureCode(text) {
  // Namespace
  let ns = null;
  const nsM = text.match(/\(\s*ns\s+([\w.\-/]+)/);
  if (nsM) ns = nsM[1];

  // Requires from (ns ... (:require ...))
  const requires = [];
  const reqBlock = text.match(/\(:require\s+([\s\S]*?)\)/);
  if (reqBlock) {
    const reqText = reqBlock[1];
    const rRe = /\[([a-z][\w.\-/]*)/g;
    let m;
    while ((m = rRe.exec(reqText)) !== null) {
      if (!requires.includes(m[1])) requires.push(m[1]);
    }
  }

  // defn
  const defns = [];
  const defnRe = /\(\s*defn-?\s+([\w.\-?!*]+)/gm;
  let m;
  while ((m = defnRe.exec(text)) !== null) {
    if (!defns.includes(m[1])) defns.push(m[1]);
  }

  // def / defonce
  const defs = [];
  const defRe = /\(\s*defonce?\s+([\w.\-?!*]+)/gm;
  while ((m = defRe.exec(text)) !== null) {
    if (!defs.includes(m[1])) defs.push(m[1]);
  }

  // defmacro
  const macros = [];
  const macroRe = /\(\s*defmacro\s+([\w.\-?!*]+)/gm;
  while ((m = macroRe.exec(text)) !== null) {
    if (!macros.includes(m[1])) macros.push(m[1]);
  }

  // defrecord / defprotocol
  const records = [];
  const recRe = /\(\s*(?:defrecord|defprotocol|deftype)\s+([\w.\-?!*]+)/gm;
  while ((m = recRe.exec(text)) !== null) {
    const name = m[1];
    const kind = text.slice(m.index + 1).match(/^(defrecord|defprotocol|deftype)/)[1];
    if (!records.find((r) => r.name === name)) records.push({ name, kind });
  }

  // atom/ref/agent count
  const atomCount = (text.match(/\(\s*atom\s/g) || []).length;
  const refCount = (text.match(/\(\s*ref\s/g) || []).length;
  const agentCount = (text.match(/\(\s*agent\s/g) || []).length;

  return { ns, requires, defns, defs, macros, records, atomCount, refCount, agentCount };
}

function analyzeEdn(text) {
  // Count top-level keys
  let topKeyCount = 0;
  const keyRe = /^\s*:([\w.\-/]+)/gm;
  let m;
  while ((m = keyRe.exec(text)) !== null) topKeyCount++;

  // Count nested maps
  const nestedMaps = (text.match(/\{/g) || []).length;

  // Value type distribution (rough)
  const strings = (text.match(/"[^"]*"/g) || []).length;
  const numbers = (text.match(/\b\d+(?:\.\d+)?\b/g) || []).length;
  const keywords = (text.match(/:[a-z][\w.\-/]*/g) || []).length;

  return { topKeyCount, nestedMaps, strings, numbers, keywords };
}

function highlightClojure(text) {
  return text.split(/\r?\n/).map((line) => highlightCljLine(line)).join('\n');
}

function highlightCljLine(line) {
  // ; line comment
  const semiIdx = line.indexOf(';');
  let code = line;
  let commentSuffix = '';
  if (semiIdx !== -1) {
    const before = line.slice(0, semiIdx);
    const quoteCount = (before.match(/"/g) || []).length;
    if (quoteCount % 2 === 0) {
      code = line.slice(0, semiIdx);
      commentSuffix = '<span class="clj-comment">' + esc(line.slice(semiIdx)) + '</span>';
    }
  }

  let escaped = esc(code);
  // String literals
  escaped = escaped.replace(/(&quot;[^&]*&quot;)/g, '<span class="clj-str">$1</span>');
  // Keywords :foo
  escaped = escaped.replace(/(:[a-z][\w.\-/]*)/g, '<span class="clj-key">$1</span>');
  // Numbers
  escaped = escaped.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="clj-num">$1</span>');
  // Special forms
  escaped = escaped.replace(
    new RegExp(`\\b(${[...CLJ_SPECIALS].join('|')})\\b`, 'g'),
    '<span class="clj-kw">$1</span>',
  );
  return escaped + commentSuffix;
}

function makeSection(title, items, tagFn) {
  if (!items || items.length === 0) return null;
  const sec = document.createElement('div');
  sec.className = 'clj-section';
  const hd = document.createElement('div');
  hd.className = 'clj-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  const ul = document.createElement('ul');
  ul.className = 'clj-list';
  for (const item of items) {
    const li = document.createElement('li');
    if (tagFn) {
      const tag = document.createElement('span');
      tag.className = 'clj-tag';
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
  const isEdn = name.endsWith('.edn');
  const isCljs = name.endsWith('.cljs');
  const isCljc = name.endsWith('.cljc');

  const host = document.createElement('div');
  host.className = 'clj-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  let kindLabel;
  if (isEdn) kindLabel = 'EDN Data (.edn)';
  else if (isCljs) kindLabel = 'ClojureScript (.cljs)';
  else if (isCljc) kindLabel = 'Cross-platform (.cljc)';
  else kindLabel = 'Clojure (.clj)';

  const title = document.createElement('div');
  title.className = 'clj-title';
  let titleHtml = '<span class="clj-badge">Clojure</span>';
  titleHtml += `<span class="clj-kind-badge">${esc(kindLabel)}</span>`;
  title.innerHTML = titleHtml;
  host.appendChild(title);

  if (isEdn) {
    const ednInfo = analyzeEdn(text);

    const sub = document.createElement('div');
    sub.className = 'clj-sub';
    sub.textContent = `${ednInfo.topKeyCount} top-level key${ednInfo.topKeyCount !== 1 ? 's' : ''} · ${ednInfo.nestedMaps} map${ednInfo.nestedMaps !== 1 ? 's' : ''} total`;
    host.appendChild(sub);

    const cards = document.createElement('div');
    cards.className = 'clj-cards';
    for (const { value, label } of [
      { value: ednInfo.topKeyCount, label: 'Keys' },
      { value: ednInfo.nestedMaps, label: 'Maps' },
      { value: ednInfo.strings, label: 'Strings' },
      { value: ednInfo.keywords, label: 'Keywords' },
      { value: ednInfo.numbers, label: 'Numbers' },
    ]) {
      const card = document.createElement('div');
      card.className = 'clj-card';
      const strong = document.createElement('strong');
      strong.textContent = value;
      const span = document.createElement('span');
      span.textContent = label;
      card.appendChild(strong);
      card.appendChild(span);
      cards.appendChild(card);
    }
    host.appendChild(cards);
  } else {
    const info = analyzeClojureCode(text);

    const sub = document.createElement('div');
    sub.className = 'clj-sub';
    const parts = [];
    if (info.ns) parts.push(`ns: ${info.ns}`);
    if (info.requires.length) parts.push(`${info.requires.length} require${info.requires.length !== 1 ? 's' : ''}`);
    if (info.defns.length) parts.push(`${info.defns.length} defn`);
    if (info.macros.length) parts.push(`${info.macros.length} macro${info.macros.length !== 1 ? 's' : ''}`);
    sub.textContent = parts.join(' · ') || 'No declarations found';
    host.appendChild(sub);

    const cards = document.createElement('div');
    cards.className = 'clj-cards';
    for (const { value, label } of [
      { value: info.defns.length, label: 'defn' },
      { value: info.defs.length, label: 'def/defonce' },
      { value: info.macros.length, label: 'defmacro' },
      { value: info.records.length, label: 'defrecord/protocol' },
      { value: info.atomCount + info.refCount + info.agentCount, label: 'atoms/refs/agents' },
    ]) {
      const card = document.createElement('div');
      card.className = 'clj-card';
      const strong = document.createElement('strong');
      strong.textContent = value;
      const span = document.createElement('span');
      span.textContent = label;
      card.appendChild(strong);
      card.appendChild(span);
      cards.appendChild(card);
    }
    host.appendChild(cards);

    if (info.ns) {
      const nsSec = document.createElement('div');
      nsSec.className = 'clj-section';
      const nsHd = document.createElement('div');
      nsHd.className = 'clj-section-hd';
      nsHd.textContent = 'Namespace';
      nsSec.appendChild(nsHd);
      const nsEl = document.createElement('div');
      nsEl.style.cssText = 'padding:8px 14px;font-family:ui-monospace,monospace;font-size:13px;';
      nsEl.textContent = info.ns;
      nsSec.appendChild(nsEl);
      host.appendChild(nsSec);
    }

    const reqEl = makeSection('Requires', info.requires);
    if (reqEl) host.appendChild(reqEl);

    const defnsEl = makeSection('Functions (defn)', info.defns);
    if (defnsEl) host.appendChild(defnsEl);

    const defsEl = makeSection('Vars (def/defonce)', info.defs);
    if (defsEl) host.appendChild(defsEl);

    const macrosEl = makeSection('Macros (defmacro)', info.macros);
    if (macrosEl) host.appendChild(macrosEl);

    const recEl = makeSection('Records & Protocols', info.records, (r) => r.kind);
    if (recEl) host.appendChild(recEl);
  }

  // Source
  const srcSec = document.createElement('div');
  srcSec.className = 'clj-section';
  const srcHd = document.createElement('div');
  srcHd.className = 'clj-section-hd';
  srcHd.textContent = 'Source';
  srcSec.appendChild(srcHd);
  const pre = document.createElement('pre');
  pre.className = 'clj-pre';
  pre.innerHTML = highlightClojure(text);
  srcSec.appendChild(pre);
  host.appendChild(srcSec);

  return { parentNode: host };
}
