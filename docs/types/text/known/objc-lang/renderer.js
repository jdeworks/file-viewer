const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.objc-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.objc-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0a7ea4;color:#fff;vertical-align:middle;margin-right:8px;}
.objc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.objc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.objc-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.objc-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.objc-card strong{display:block;font-size:1.2rem;font-weight:700;}
.objc-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.objc-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.objc-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.objc-list{margin:0;padding:0;list-style:none;}
.objc-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.objc-list li:last-child{border-bottom:none;}
.objc-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#dbeafe;color:#1e40af;font-weight:700;}
.objc-tag-fw{background:#dcfce7;color:#166534;}
.objc-tag-proj{background:#fef3c7;color:#92400e;}
.objc-tag-inst{background:#ede9fe;color:#7c3aed;}
.objc-tag-class{background:#dbeafe;color:#1e40af;}
.objc-tag-proto{background:#fce7f3;color:#9d174d;}
.objc-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.objc-kw{color:#0a7ea4;font-weight:600;}
.objc-dir{color:#7c3aed;}
.objc-comment{color:#6e7781;font-style:italic;}
.objc-str{color:#0a6640;}
.objc-num{color:#b45309;}
.objc-at{color:#d1242f;font-weight:700;}
`;

const OBJC_KEYWORDS = new Set([
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
  'return', 'void', 'int', 'long', 'short', 'char', 'float', 'double',
  'unsigned', 'signed', 'const', 'static', 'extern', 'typedef', 'struct', 'union', 'enum',
  'sizeof', 'NULL', 'YES', 'NO', 'true', 'false', 'nil', 'Nil', 'BOOL',
  'NSInteger', 'NSUInteger', 'CGFloat', 'NSString', 'NSArray', 'NSDictionary',
  'NSObject', 'id', 'SEL', 'Class', 'IMP', 'IBOutlet', 'IBAction',
  'NS_ASSUME_NONNULL_BEGIN', 'NS_ASSUME_NONNULL_END',
]);

function analyzeObjC(text) {
  const lines = text.split(/\r?\n/);
  const imports = { framework: [], project: [] };
  const interfaces = [];
  const implementations = [];
  const protocols = [];
  const properties = [];
  const methods = [];
  const synthesize = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // #import
    const impM = trimmed.match(/^#import\s+[<"](.+?)[>"]/);
    if (impM) {
      const mod = impM[1];
      const isFramework = /^(Foundation|UIKit|AppKit|CoreData|CoreLocation|CoreGraphics|QuartzCore|AVFoundation|MapKit|StoreKit|WebKit|UserNotifications|Combine|SwiftUI)\b/.test(mod);
      if (isFramework) imports.framework.push(mod);
      else imports.project.push(mod);
      continue;
    }

    // @interface
    const ifaceM = trimmed.match(/^@interface\s+(\w+)(?:\s*:\s*(\w+))?(?:\s*<([^>]+)>)?/);
    if (ifaceM) {
      interfaces.push({ name: ifaceM[1], superclass: ifaceM[2] || null, protocols: ifaceM[3] ? ifaceM[3].split(',').map((s) => s.trim()) : [] });
      continue;
    }

    // @implementation
    const implM = trimmed.match(/^@implementation\s+(\w+)/);
    if (implM) {
      implementations.push(implM[1]);
      continue;
    }

    // @protocol
    const protoM = trimmed.match(/^@protocol\s+(\w+)/);
    if (protoM) {
      protocols.push(protoM[1]);
      continue;
    }

    // @property
    const propM = trimmed.match(/^@property\s*(?:\([^)]*\)\s*)?(.+?)\s+(\w+)\s*;/);
    if (propM) {
      properties.push({ type: propM[1].trim(), name: propM[2] });
      continue;
    }

    // @synthesize / @dynamic
    const synthM = trimmed.match(/^@(synthesize|dynamic)\s+(\w+)/);
    if (synthM) {
      synthesize.push({ kind: synthM[1], name: synthM[2] });
      continue;
    }

    // Method declarations: - (type)methodName or + (type)methodName
    const methM = trimmed.match(/^([-+])\s*\(\s*([^)]+)\s*\)\s*(\w+)/);
    if (methM) {
      methods.push({ kind: methM[1] === '+' ? 'class' : 'instance', returnType: methM[2].trim(), name: methM[3] });
    }
  }

  return { imports, interfaces, implementations, protocols, properties, methods, synthesize };
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

    if (trimmed.startsWith('//')) {
      result.push('<span class="objc-comment">' + esc(line) + '</span>');
      continue;
    }

    let out = '';
    let i = 0;
    while (i < line.length) {
      // Block comment start
      if (line[i] === '/' && line[i + 1] === '*') {
        const end = line.indexOf('*/', i + 2);
        if (end === -1) {
          out += '<span class="objc-comment">' + esc(line.slice(i)) + '</span>';
          inBlockComment = true;
          break;
        }
        out += '<span class="objc-comment">' + esc(line.slice(i, end + 2)) + '</span>';
        i = end + 2;
        continue;
      }
      // Inline comment
      if (line[i] === '/' && line[i + 1] === '/') {
        out += '<span class="objc-comment">' + esc(line.slice(i)) + '</span>';
        break;
      }
      // @ directives
      if (line[i] === '@') {
        let j = i + 1;
        while (j < line.length && /\w/.test(line[j])) j++;
        out += '<span class="objc-at">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // # directives
      if (line[i] === '#' && (i === 0 || /\s/.test(line[i - 1]))) {
        let j = i;
        while (j < line.length && /\S/.test(line[j])) j++;
        out += '<span class="objc-dir">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Strings
      if (line[i] === '"' || (line[i] === '@' && line[i + 1] === '"')) {
        const start = i;
        if (line[i] === '@') i++;
        i++; // skip "
        while (i < line.length && line[i] !== '"') {
          if (line[i] === '\\') i++;
          i++;
        }
        i++; // closing "
        out += '<span class="objc-str">' + esc(line.slice(start, i)) + '</span>';
        continue;
      }
      // Numbers
      if (/[0-9]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[0-9._xXeEfFlLuU]/.test(line[j])) j++;
        out += '<span class="objc-num">' + esc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Identifiers / keywords
      if (/[A-Za-z_]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[\w]/.test(line[j])) j++;
        const word = line.slice(i, j);
        if (OBJC_KEYWORDS.has(word)) {
          out += '<span class="objc-kw">' + esc(word) + '</span>';
        } else {
          out += esc(word);
        }
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
  sec.className = 'objc-section';
  const hd = document.createElement('div');
  hd.className = 'objc-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'objc-list';
  sec.appendChild(ul);
  return ul;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '');
  const lower = name.toLowerCase();

  let badgeText = 'Objective-C';
  if (lower.endsWith('.mm')) badgeText = 'Objective-C++';
  else if (lower.endsWith('.h')) badgeText = 'ObjC Header';

  const { imports, interfaces, implementations, protocols, properties, methods, synthesize } = analyzeObjC(text);
  const allImports = [...imports.framework, ...imports.project];

  const host = document.createElement('div');
  host.className = 'objc-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'objc-title';
  const badge = document.createElement('span');
  badge.className = 'objc-badge';
  badge.textContent = badgeText;
  title.appendChild(badge);
  title.appendChild(document.createTextNode(name));
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'objc-sub';
  const parts = [];
  if (allImports.length) parts.push(`${allImports.length} import${allImports.length !== 1 ? 's' : ''}`);
  if (interfaces.length) parts.push(`${interfaces.length} interface${interfaces.length !== 1 ? 's' : ''}`);
  if (implementations.length) parts.push(`${implementations.length} implementation${implementations.length !== 1 ? 's' : ''}`);
  if (protocols.length) parts.push(`${protocols.length} protocol${protocols.length !== 1 ? 's' : ''}`);
  if (methods.length) parts.push(`${methods.length} method${methods.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ') || name;
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'objc-cards';
  const cardItems = [
    { value: allImports.length, label: 'Imports' },
    { value: interfaces.length + implementations.length, label: 'Classes' },
    { value: protocols.length, label: 'Protocols' },
    { value: methods.length, label: 'Methods' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'objc-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Imports — grouped
  if (allImports.length > 0) {
    const sec = makeSection(host, `Imports (${allImports.length})`);
    const ul = makeList(sec);
    for (const imp of imports.framework) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'objc-tag objc-tag-fw';
      tag.textContent = 'framework';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + imp));
      ul.appendChild(li);
    }
    for (const imp of imports.project) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'objc-tag objc-tag-proj';
      tag.textContent = 'project';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + imp));
      ul.appendChild(li);
    }
  }

  // Interfaces
  if (interfaces.length > 0) {
    const sec = makeSection(host, `Interfaces (${interfaces.length})`);
    const ul = makeList(sec);
    for (const { name: iname, superclass, protocols: protos } of interfaces) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'objc-tag objc-tag-class';
      tag.textContent = '@interface';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + iname));
      if (superclass) li.appendChild(document.createTextNode(' : ' + superclass));
      if (protos.length) li.appendChild(document.createTextNode(' <' + protos.join(', ') + '>'));
      ul.appendChild(li);
    }
  }

  // Implementations
  if (implementations.length > 0) {
    const sec = makeSection(host, `Implementations (${implementations.length})`);
    const ul = makeList(sec);
    for (const impl of implementations) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'objc-tag';
      tag.textContent = '@implementation';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + impl));
      ul.appendChild(li);
    }
  }

  // Protocols
  if (protocols.length > 0) {
    const sec = makeSection(host, `Protocols (${protocols.length})`);
    const ul = makeList(sec);
    for (const proto of protocols) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'objc-tag objc-tag-proto';
      tag.textContent = '@protocol';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + proto));
      ul.appendChild(li);
    }
  }

  // Methods
  if (methods.length > 0) {
    const MAX = 15;
    const sec = makeSection(host, `Methods (${methods.length})`);
    const ul = makeList(sec);
    for (const { kind, returnType, name: mname } of methods.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = kind === 'class' ? 'objc-tag' : 'objc-tag objc-tag-inst';
      tag.textContent = kind === 'class' ? '+class' : '-inst';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' (' + returnType + ') ' + mname));
      ul.appendChild(li);
    }
    if (methods.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${methods.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Properties
  if (properties.length > 0) {
    const MAX = 10;
    const sec = makeSection(host, `Properties (${properties.length})`);
    const ul = makeList(sec);
    for (const { type, name: pname } of properties.slice(0, MAX)) {
      const li = document.createElement('li');
      li.textContent = `(${type}) ${pname}`;
      ul.appendChild(li);
    }
    if (properties.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${properties.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'objc-pre';
  pre.innerHTML = highlightObjC(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
