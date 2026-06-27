const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.objc-doc{padding:16px 18px;max-width:920px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.objc-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0a7ea4;color:#fff;vertical-align:middle;margin-right:8px;}
.objc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.objc-name-main{font-family:ui-monospace,monospace;font-size:15px;color:#0a7ea4;font-weight:700;}
.objc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.objc-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.objc-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.objc-card strong{display:block;font-size:1.2rem;font-weight:700;}
.objc-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.objc-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.objc-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.objc-list{margin:0;padding:0;list-style:none;}
.objc-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.objc-list li:last-child{border-bottom:none;}
.objc-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;background:#dbeafe;color:#1e40af;}
.objc-tag-fw{background:#dcfce7;color:#166534;}
.objc-tag-proj{background:#fef3c7;color:#92400e;}
.objc-tag-inst{background:#ede9fe;color:#7c3aed;}
.objc-tag-class{background:#dbeafe;color:#1e40af;}
.objc-tag-impl{background:#e0f2fe;color:#0369a1;}
.objc-tag-proto{background:#fce7f3;color:#9d174d;}
.objc-tag-cat{background:#f3e8ff;color:#7e22ce;}
.objc-tag-prop{background:#fef9c3;color:#854d0e;}
.objc-tag-fn{background:#dcfce7;color:#166534;}
.objc-name{font-weight:600;}
.objc-type{color:#0e7490;}
.objc-ret{color:#1d4ed8;}
.objc-sel{color:#7c3aed;font-weight:600;}
.objc-attr{color:#9f1239;font-style:italic;}
.objc-owner{color:var(--fg-2,#8a93a0);}
.objc-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.objc-kw{color:#0a7ea4;font-weight:600;}
.objc-dir{color:#7c3aed;}
.objc-comment{color:#6e7781;font-style:italic;}
.objc-str{color:#0a6640;}
.objc-num{color:#b45309;}
.objc-at{color:#d1242f;font-weight:700;}
`;

const FRAMEWORK_RE = /^(Foundation|UIKit|AppKit|CoreData|CoreLocation|CoreGraphics|CoreFoundation|QuartzCore|AVFoundation|MapKit|StoreKit|WebKit|UserNotifications|Combine|SwiftUI|Metal|SceneKit|SpriteKit|GameKit|HealthKit|Photos|Contacts|EventKit|MessageUI|Security|Accelerate|CloudKit|Network)\b/;
const isFramework = (m) => FRAMEWORK_RE.test(m);
const splitList = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

const OBJC_KEYWORDS = new Set([
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
  'return', 'void', 'int', 'long', 'short', 'char', 'float', 'double',
  'unsigned', 'signed', 'const', 'static', 'extern', 'typedef', 'struct', 'union', 'enum',
  'sizeof', 'NULL', 'YES', 'NO', 'true', 'false', 'nil', 'Nil', 'BOOL', 'self', 'super',
  'NSInteger', 'NSUInteger', 'CGFloat', 'NSString', 'NSArray', 'NSDictionary', 'instancetype',
  'NSObject', 'id', 'SEL', 'Class', 'IMP', 'IBOutlet', 'IBAction',
  'NS_ASSUME_NONNULL_BEGIN', 'NS_ASSUME_NONNULL_END',
]);

// Remove comments and blank the interior of string/char literals so braces, semicolons and parens
// inside them never confuse the structural scan. Newlines are preserved.
function preprocess(text) {
  const s = String(text || '');
  let out = '', i = 0, lineHasContent = false;
  const n = s.length;
  while (i < n) {
    const c = s[i], d = s[i + 1];
    if (c === '\n') { lineHasContent = false; out += c; i++; continue; }
    if (c === '#' && !lineHasContent) { while (i < n && s[i] !== '\n') { out += s[i]; i++; } continue; }
    if (!/\s/.test(c)) lineHasContent = true;
    if (c === '/' && d === '/') { while (i < n && s[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(s[i] === '*' && s[i + 1] === '/')) { if (s[i] === '\n') out += '\n'; i++; } i += 2; continue; }
    if (c === '@' && d === '"') { out += '@""'; i += 2; while (i < n && s[i] !== '"') { if (s[i] === '\\') i++; i++; } i++; continue; }
    if (c === '"') { out += '""'; i++; while (i < n && s[i] !== '"') { if (s[i] === '\\') i++; i++; } i++; continue; }
    if (c === "'") { out += "''"; i++; while (i < n && s[i] !== "'") { if (s[i] === '\\') i++; i++; } i++; continue; }
    out += c; i++;
  }
  return out;
}

// Split top-level (brace-depth 0) text into declaration units. Method/function bodies and ivar
// blocks (`{ … }`) are skipped wholesale. Units terminate at `;` or `{`; `@interface`/
// `@implementation`/`@protocol`/`@end` and `#` lines terminate at newline (they have no `;`).
function topLevelUnits(code) {
  const units = [];
  let depth = 0, buf = '';
  const flush = (term) => { const t = buf.trim(); if (t) units.push({ text: t, terminator: term }); buf = ''; };
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (depth > 0) { if (c === '{') depth++; else if (c === '}') depth--; continue; }
    if (c === '{') { flush('{'); depth++; continue; }
    if (c === '}') { continue; }
    if (c === ';') { flush(';'); continue; }
    if (c === '\n') {
      const tb = buf.trim();
      if (/^#/.test(tb) || /^@(interface|implementation|protocol|end)\b/.test(tb)) flush('nl');
      else buf += ' ';
      continue;
    }
    buf += c;
  }
  flush('');
  return units;
}

// `- (RET)key:(Type)arg key2:(Type2)arg2` → { selector, returns, params:[{type,name}], class }
function parseMethod(text) {
  const m = text.replace(/\s+/g, ' ').trim().match(/^([-+])\s*\(([^)]*)\)\s*(.*)$/);
  if (!m) return null;
  const returns = m[2].trim();
  const rest = m[3].trim();
  const params = [];
  let selector = '';
  const partRe = /([A-Za-z_]\w*)\s*:\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*([A-Za-z_]\w*)/g;
  let mm, matched = false;
  while ((mm = partRe.exec(rest))) {
    matched = true;
    selector += mm[1] + ':';
    params.push({ type: mm[2].replace(/\s+/g, ' ').trim(), name: mm[3] });
  }
  if (!matched) { const idm = rest.match(/^([A-Za-z_]\w*)/); selector = idm ? idm[1] : rest; }
  return { selector, returns, params, class: m[1] === '+' };
}

// `@property (attrs) Type *name` → { name, type, attributes:[…] }
function parseProperty(text) {
  const m = text.match(/^@property\s*(?:\(([^)]*)\))?\s*([\s\S]+)$/);
  if (!m) return null;
  const attributes = m[1] ? splitList(m[1]) : [];
  const decl = m[2].trim().replace(/;$/, '').trim();
  const dm = decl.match(/^([\s\S]*?)([A-Za-z_]\w*)$/);
  if (!dm) return null;
  return { name: dm[2], type: dm[1].trim() || dm[2], attributes };
}

function parseCParams(s) {
  s = s.trim();
  if (!s || s === 'void') return [];
  return splitList(s).map((p) => {
    const m = p.match(/^([\s\S]*?[\s\*])([A-Za-z_]\w*)$/);
    return m ? { type: m[1].trim(), name: m[2] } : { type: p, name: '' };
  });
}

// Top-level C function definition/declaration: `RET name(params)`.
function parseFunction(text) {
  const s = text.replace(/\s+/g, ' ').trim();
  if (/^(typedef|struct|union|enum|return|if|for|while|switch|else|do|case|sizeof)\b/.test(s)) return null;
  const m = s.match(/^([\s\S]+?[\s\*])([A-Za-z_]\w*)\s*\(([\s\S]*)\)$/);
  if (!m || !m[1].trim()) return null;
  if (['if', 'for', 'while', 'switch', 'return', 'sizeof', 'catch'].includes(m[2])) return null;
  return { name: m[2], returns: m[1].replace(/\s+/g, ' ').trim(), params: parseCParams(m[3]) };
}

// Parse Objective-C into structured facts. Exported, pure (DOM-free) for unit testing.
export function analyzeObjC(text) {
  const code = preprocess(text);
  const imports = { framework: [], project: [] };
  const interfaces = [], methods = [], properties = [], functions = [], synthesize = [];
  let owner = null;

  for (const { text: t, terminator } of topLevelUnits(code)) {
    if (!t) continue;
    let m;
    if ((m = t.match(/^#\s*(?:import|include)\s+[<"](.+?)[>"]/))) {
      const mod = m[1];
      (isFramework(mod) ? imports.framework : imports.project).push(mod);
      continue;
    }
    if ((m = t.match(/^@interface\s+(\w+)\s*(\([^)]*\))?\s*(?::\s*(\w+))?\s*(?:<([^>]*)>)?/))) {
      const cat = m[2] ? m[2].replace(/[()]/g, '').trim() : null;
      interfaces.push({ name: m[1], super: m[3] || null, protocols: m[4] ? splitList(m[4]) : [], kind: m[2] ? 'category' : 'interface', category: cat });
      owner = m[1]; continue;
    }
    if ((m = t.match(/^@implementation\s+(\w+)\s*(\([^)]*\))?/))) {
      const cat = m[2] ? m[2].replace(/[()]/g, '').trim() : null;
      interfaces.push({ name: m[1], super: null, protocols: [], kind: m[2] ? 'category-impl' : 'implementation', category: cat });
      owner = m[1]; continue;
    }
    if (/^@protocol\b/.test(t)) {
      if (terminator === ';') continue; // forward declaration
      m = t.match(/^@protocol\s+(\w+)\s*(?:<([^>]*)>)?/);
      if (m) { interfaces.push({ name: m[1], super: null, protocols: m[2] ? splitList(m[2]) : [], kind: 'protocol', category: null }); owner = m[1]; }
      continue;
    }
    if (/^@end\b/.test(t)) { owner = null; continue; }
    if (/^@property\b/.test(t)) { const p = parseProperty(t); if (p) { p.owner = owner; properties.push(p); } continue; }
    if ((m = t.match(/^@(synthesize|dynamic)\s+([\s\S]+)/))) {
      for (const part of splitList(m[2])) { const nm = part.split('=')[0].trim(); if (nm) synthesize.push({ kind: m[1], name: nm }); }
      continue;
    }
    if (/^[-+]\s*\(/.test(t)) { const meth = parseMethod(t); if (meth) { meth.owner = owner; methods.push(meth); } continue; }
    if (/^@/.test(t)) continue; // @class, @compatibility_alias, …
    const fn = parseFunction(t);
    if (fn) functions.push(fn);
  }
  return { imports, interfaces, methods, properties, functions, synthesize };
}

function highlightObjC(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  let inBlockComment = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (inBlockComment) {
      result.push('<span class="objc-comment">' + esc(line) + '</span>');
      if (line.includes('*/')) inBlockComment = false;
      continue;
    }
    if (trimmed.startsWith('//')) { result.push('<span class="objc-comment">' + esc(line) + '</span>'); continue; }
    let out = '', i = 0;
    while (i < line.length) {
      if (line[i] === '/' && line[i + 1] === '*') {
        const end = line.indexOf('*/', i + 2);
        if (end === -1) { out += '<span class="objc-comment">' + esc(line.slice(i)) + '</span>'; inBlockComment = true; break; }
        out += '<span class="objc-comment">' + esc(line.slice(i, end + 2)) + '</span>'; i = end + 2; continue;
      }
      if (line[i] === '/' && line[i + 1] === '/') { out += '<span class="objc-comment">' + esc(line.slice(i)) + '</span>'; break; }
      if (line[i] === '@' && line[i + 1] !== '"') {
        let j = i + 1; while (j < line.length && /\w/.test(line[j])) j++;
        out += '<span class="objc-at">' + esc(line.slice(i, j)) + '</span>'; i = j; continue;
      }
      if (line[i] === '#' && (i === 0 || /\s/.test(line[i - 1]))) {
        let j = i; while (j < line.length && /\S/.test(line[j])) j++;
        out += '<span class="objc-dir">' + esc(line.slice(i, j)) + '</span>'; i = j; continue;
      }
      if (line[i] === '"' || (line[i] === '@' && line[i + 1] === '"')) {
        const start = i; if (line[i] === '@') i++; i++;
        while (i < line.length && line[i] !== '"') { if (line[i] === '\\') i++; i++; }
        i++; out += '<span class="objc-str">' + esc(line.slice(start, i)) + '</span>'; continue;
      }
      if (/[0-9]/.test(line[i])) {
        let j = i; while (j < line.length && /[0-9._xXeEfFlLuU]/.test(line[j])) j++;
        out += '<span class="objc-num">' + esc(line.slice(i, j)) + '</span>'; i = j; continue;
      }
      if (/[A-Za-z_]/.test(line[i])) {
        let j = i; while (j < line.length && /\w/.test(line[j])) j++;
        const word = line.slice(i, j);
        out += OBJC_KEYWORDS.has(word) ? '<span class="objc-kw">' + esc(word) + '</span>' : esc(word);
        i = j; continue;
      }
      out += esc(line[i]); i++;
    }
    result.push(out);
  }
  return result.join('\n');
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'objc-section';
  const hd = document.createElement('div');
  hd.className = 'objc-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'objc-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="objc-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }
function ownerHtml(owner) { return owner ? ` <span class="objc-owner">@${esc(owner)}</span>` : ''; }

function methodHtml(meth) {
  const sign = meth.class ? tag('objc-tag-class', '+ class') : tag('objc-tag-inst', '- inst');
  const ret = `(<span class="objc-ret">${esc(meth.returns)}</span>)`;
  let sel;
  if (meth.params.length) {
    sel = meth.selector.split(':').slice(0, -1).map((kw, idx) => {
      const p = meth.params[idx];
      return `<span class="objc-sel">${esc(kw)}:</span>(<span class="objc-type">${esc(p.type)}</span>)${esc(p.name)}`;
    }).join(' ');
  } else {
    sel = `<span class="objc-sel">${esc(meth.selector)}</span>`;
  }
  return `${sign} ${ret} ${sel}${ownerHtml(meth.owner)}`;
}

export async function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '');
  const lower = name.toLowerCase();
  if (!/[@#]/.test(text.slice(0, 4000))) return null;

  let badgeText = 'Objective-C';
  if (lower.endsWith('.mm')) badgeText = 'Objective-C++';
  else if (lower.endsWith('.h')) badgeText = 'ObjC Header';

  const { imports, interfaces, methods, properties, functions } = analyzeObjC(text);
  const allImports = [...imports.framework, ...imports.project];
  const types = interfaces.filter((i) => i.kind === 'interface');
  const impls = interfaces.filter((i) => i.kind === 'implementation' || i.kind === 'category-impl');
  const protos = interfaces.filter((i) => i.kind === 'protocol');
  const cats = interfaces.filter((i) => i.kind === 'category');
  const classCount = new Set(interfaces.filter((i) => i.kind !== 'protocol').map((i) => i.name)).size;
  const primary = (types[0] || impls[0] || protos[0] || {}).name || '';

  const host = document.createElement('div');
  host.className = 'objc-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'objc-title';
  const badge = document.createElement('span');
  badge.className = 'objc-badge';
  badge.textContent = badgeText;
  title.appendChild(badge);
  if (primary) { const n = document.createElement('span'); n.className = 'objc-name-main'; n.textContent = primary; title.appendChild(n); }
  else title.appendChild(document.createTextNode(name));
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'objc-sub';
  sub.textContent = [
    allImports.length && `${allImports.length} import${allImports.length !== 1 ? 's' : ''}`,
    classCount && `${classCount} class${classCount !== 1 ? 'es' : ''}`,
    protos.length && `${protos.length} protocol${protos.length !== 1 ? 's' : ''}`,
    methods.length && `${methods.length} method${methods.length !== 1 ? 's' : ''}`,
    properties.length && `${properties.length} propert${properties.length !== 1 ? 'ies' : 'y'}`,
  ].filter(Boolean).join(' · ') || name;
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'objc-cards';
  for (const { value, label } of [
    { value: allImports.length, label: 'Imports' },
    { value: classCount, label: 'Classes' },
    { value: protos.length, label: 'Protocols' },
    { value: methods.length, label: 'Methods' },
    { value: properties.length, label: 'Properties' },
  ]) {
    const card = document.createElement('div');
    card.className = 'objc-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (allImports.length) {
    const ul = makeList(makeSection(host, `Imports (${allImports.length})`));
    for (const imp of imports.framework) row(ul, `${tag('objc-tag-fw', 'framework')} ${esc(imp)}`);
    for (const imp of imports.project) row(ul, `${tag('objc-tag-proj', 'project')} ${esc(imp)}`);
  }

  if (types.length || impls.length || cats.length) {
    const all = [...types, ...impls, ...cats];
    const ul = makeList(makeSection(host, `Interfaces & Implementations (${all.length})`));
    for (const it of all) {
      const cls = it.kind === 'interface' ? 'objc-tag-class' : it.kind === 'category' ? 'objc-tag-cat' : 'objc-tag-impl';
      const lbl = it.kind === 'category' ? '@interface ()' : it.kind === 'category-impl' ? '@implementation ()' : '@' + it.kind;
      let h = `${tag(cls, lbl)} <span class="objc-name">${esc(it.name)}</span>`;
      if (it.category) h += `<span class="objc-owner"> (${esc(it.category)})</span>`;
      if (it.super) h += ` : <span class="objc-ret">${esc(it.super)}</span>`;
      if (it.protocols.length) h += ` &lt;<span class="objc-type">${esc(it.protocols.join(', '))}</span>&gt;`;
      row(ul, h);
    }
  }

  if (protos.length) {
    const ul = makeList(makeSection(host, `Protocols (${protos.length})`));
    for (const p of protos) {
      let h = `${tag('objc-tag-proto', '@protocol')} <span class="objc-name">${esc(p.name)}</span>`;
      if (p.protocols.length) h += ` &lt;<span class="objc-type">${esc(p.protocols.join(', '))}</span>&gt;`;
      row(ul, h);
    }
  }

  if (properties.length) {
    const ul = makeList(makeSection(host, `Properties (${properties.length})`));
    for (const p of properties) {
      const attrs = p.attributes.length ? `<span class="objc-attr">(${esc(p.attributes.join(', '))})</span> ` : '';
      row(ul, `${tag('objc-tag-prop', '@property')} ${attrs}<span class="objc-type">${esc(p.type)}</span> <span class="objc-name">${esc(p.name)}</span>${ownerHtml(p.owner)}`);
    }
  }

  if (methods.length) {
    const MAX = 40;
    const ul = makeList(makeSection(host, `Methods (${methods.length})`));
    for (const meth of methods.slice(0, MAX)) row(ul, methodHtml(meth));
    if (methods.length > MAX) row(ul, `<span class="objc-owner">… and ${methods.length - MAX} more</span>`);
  }

  if (functions.length) {
    const ul = makeList(makeSection(host, `C Functions (${functions.length})`));
    for (const fn of functions) {
      const ps = fn.params.map((p) => `<span class="objc-type">${esc(p.type)}</span>${p.name ? ' ' + esc(p.name) : ''}`).join(', ');
      row(ul, `${tag('objc-tag-fn', 'func')} <span class="objc-ret">${esc(fn.returns)}</span> <span class="objc-name">${esc(fn.name)}</span>(${ps})`);
    }
  }

  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'objc-pre';
  pre.innerHTML = highlightObjC(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
