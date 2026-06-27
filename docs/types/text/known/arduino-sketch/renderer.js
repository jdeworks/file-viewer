const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ino-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ino-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00979d;color:#fff;vertical-align:middle;margin-right:6px;}
.ino-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ino-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ino-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.ino-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.ino-card strong{display:block;font-size:1.2rem;font-weight:700;}
.ino-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.ino-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.ino-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.ino-list{margin:0;padding:0;list-style:none;}
.ino-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.ino-list li:last-child{border-bottom:none;}
.ino-type{color:#0e7490;}
.ino-name{font-weight:600;}
.ino-val{color:#9333ea;}
.ino-params{color:var(--fg-2,#555);}
.ino-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.ino-tag-lib{background:#e0f2fe;color:#0369a1;}
.ino-tag-fn{background:#dcfce7;color:#166534;}
.ino-tag-def{background:#fef9c3;color:#854d0e;}
.ino-tag-var{background:#f3e8ff;color:#7e22ce;}
.ino-tag-obj{background:#ffe4e6;color:#be123c;}
.ino-body{padding:8px 14px;font-size:12px;font-family:ui-monospace,monospace;color:var(--fg-2,#555);line-height:1.5;white-space:pre-wrap;word-break:break-word;max-height:200px;overflow-y:auto;}
`;

// Primitive/built-in scalar types Arduino sketches use (also matches `unsigned long`, `uint16_t`, etc.).
const PRIMS = 'void|int|long|float|double|bool|boolean|String|byte|char|word|size_t|unsigned|signed|u?int(?:8|16|32|64)_t';
const isPrim = (s) => new RegExp('^(?:' + PRIMS + ')$').test(String(s).trim());

// "float temp" / "const char* name" / "int times" -> { type, name }.
function splitParams(raw) {
  return raw.split(',').map((p) => p.trim()).filter(Boolean).map((p) => {
    const m = p.match(/^(.*[\s*&])\s*(\w+)$/);
    return m ? { type: m[1].trim(), name: m[2] } : { type: '', name: p };
  });
}

// Parse a sketch into structured facts. Pure (no DOM) so it is unit-testable. Declarations are only
// read at top level (brace depth 0) so locals inside function bodies aren't mistaken for globals.
export function parseArduino(text) {
  const lines = String(text || '').split(/\r?\n/);
  const includes = [], functions = [], defines = [], constVars = [], globalVars = [], objects = [];
  const cap = { setup: [], loop: [] };
  let depth = 0, capturing = null;

  for (const line of lines) {
    const t = line.trim();
    if (depth === 0 && t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')) {
      let m;
      if ((m = t.match(/^#include\s+[<"]([\w./]+)[>"]/))) {
        includes.push(m[1]);
      } else if ((m = t.match(/^#define\s+(\w+)(?:\s+(.+))?/))) {
        defines.push({ name: m[1], value: (m[2] || '').trim() });
      } else if ((m = t.match(/^const\s+([\w:]+\s*[*&]?)\s+(\w+)\s*=\s*([^;]+);/))) {
        constVars.push({ type: m[1].trim(), name: m[2], value: m[3].trim() });
      } else if ((m = t.match(/^((?:unsigned\s+|signed\s+)?[\w:]+(?:\s*[*&])?)\s+(\w+)\s*\(([^)]*)\)\s*\{?\s*$/))
                 && !/^(if|for|while|switch|return|else)$/.test(m[2])) {
        const name = m[2];
        if (name === 'setup' || name === 'loop') { if (t.includes('{')) capturing = name; }
        else functions.push({ returnType: m[1].trim(), name, params: splitParams(m[3]), signature: t.replace(/\s*\{\s*$/, '') });
      } else if ((m = t.match(/^([A-Z]\w+)\s+(\w+)\s*\(([^)]*)\)\s*;/)) && !isPrim(m[1])) {
        objects.push({ className: m[1], name: m[2], args: m[3].trim() });
      } else if ((m = t.match(new RegExp('^((?:' + PRIMS + ')(?:\\s+\\w+)?(?:\\s*[*&])?)\\s+(\\w+)\\s*(?:=\\s*([^;]+))?;')))) {
        globalVars.push({ type: m[1].trim(), name: m[2], value: (m[3] || '').trim() });
      }
    } else if (capturing && depth >= 1) {
      cap[capturing].push(line);
    }
    for (const ch of line) { if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth <= 0) { depth = 0; capturing = null; } } }
  }

  const summarize = (b) => b.map((l) => l.trim()).filter((l) => l && !l.startsWith('//') && l !== '{' && l !== '}').slice(0, 6).join('\n');
  return { includes, functions, defines, constVars, globalVars, objects, setupBody: summarize(cap.setup), loopBody: summarize(cap.loop) };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'ino-section';
  const hd = document.createElement('div');
  hd.className = 'ino-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'ino-list';
  sec.appendChild(ul);
  return ul;
}

function makeTag(cls, text) {
  const span = document.createElement('span');
  span.className = 'ino-tag ' + cls;
  span.textContent = text;
  return span;
}

// Append an <li> with a tag plus rich HTML (type/name/value spans already escaped).
function addRow(ul, tagCls, tagText, html) {
  const li = document.createElement('li');
  li.appendChild(makeTag(tagCls, tagText));
  const body = document.createElement('span');
  body.innerHTML = ' ' + html;
  li.appendChild(body);
  ul.appendChild(li);
}

export async function render(intake) {
  const text = intake.text || '';
  const { includes, functions, defines, constVars, globalVars, objects, setupBody, loopBody } = parseArduino(text);

  const host = document.createElement('div');
  host.className = 'ino-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'ino-title';
  const badgeEl = document.createElement('span');
  badgeEl.className = 'ino-badge';
  badgeEl.textContent = 'Arduino Sketch';
  title.appendChild(badgeEl);
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'ino-sub';
  const parts = [
    `${includes.length} include${includes.length !== 1 ? 's' : ''}`,
    `${functions.length} function${functions.length !== 1 ? 's' : ''}`,
  ];
  if (defines.length + constVars.length) parts.push(`${defines.length + constVars.length} constant${defines.length + constVars.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'ino-cards';
  const cardItems = [
    { value: includes.length, label: 'Libraries' },
    { value: functions.length, label: 'Functions' },
    { value: defines.length + constVars.length, label: 'Constants' },
    { value: globalVars.length, label: 'Globals' },
    { value: objects.length, label: 'Peripherals' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'ino-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  if (includes.length) {
    const ul = makeList(makeSection(host, `Included Libraries (${includes.length})`));
    for (const lib of includes) addRow(ul, 'ino-tag-lib', '#include', esc(lib));
  }

  if (defines.length) {
    const ul = makeList(makeSection(host, `#define Constants (${defines.length})`));
    for (const { name, value } of defines) {
      addRow(ul, 'ino-tag-def', '#define', `<span class="ino-name">${esc(name)}</span>` + (value ? ` = <span class="ino-val">${esc(value)}</span>` : ''));
    }
  }

  if (constVars.length) {
    const ul = makeList(makeSection(host, `Const Variables (${constVars.length})`));
    for (const { type, name, value } of constVars) {
      addRow(ul, 'ino-tag-var', 'const', `<span class="ino-type">${esc(type)}</span> <span class="ino-name">${esc(name)}</span> = <span class="ino-val">${esc(value)}</span>`);
    }
  }

  if (globalVars.length) {
    const ul = makeList(makeSection(host, `Global Variables (${globalVars.length})`));
    for (const { type, name, value } of globalVars) {
      addRow(ul, 'ino-tag-var', 'global', `<span class="ino-type">${esc(type)}</span> <span class="ino-name">${esc(name)}</span>` + (value ? ` = <span class="ino-val">${esc(value)}</span>` : ''));
    }
  }

  if (objects.length) {
    const ul = makeList(makeSection(host, `Hardware / Objects (${objects.length})`));
    for (const { className, name, args } of objects) {
      addRow(ul, 'ino-tag-obj', 'obj', `<span class="ino-type">${esc(className)}</span> <span class="ino-name">${esc(name)}</span>(<span class="ino-params">${esc(args)}</span>)`);
    }
  }

  if (functions.length) {
    const ul = makeList(makeSection(host, `Functions (${functions.length})`));
    for (const { returnType, name, params } of functions) {
      const sig = `<span class="ino-type">${esc(returnType)}</span> <span class="ino-name">${esc(name)}</span>(<span class="ino-params">`
        + params.map((p) => (p.type ? `${esc(p.type)} ${esc(p.name)}` : esc(p.name))).join(', ') + '</span>)';
      addRow(ul, 'ino-tag-fn', 'fn', sig);
    }
  }

  if (setupBody) {
    const body = document.createElement('div');
    body.className = 'ino-body';
    body.textContent = setupBody;
    makeSection(host, 'setup() — Initialization').appendChild(body);
  }

  if (loopBody) {
    const body = document.createElement('div');
    body.className = 'ino-body';
    body.textContent = loopBody;
    makeSection(host, 'loop() — Main Loop').appendChild(body);
  }

  return { parentNode: host };
}
