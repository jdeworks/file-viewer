const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ino-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ino-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00979d;color:#fff;vertical-align:middle;margin-right:6px;}
.ino-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ino-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ino-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.ino-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.ino-card strong{display:block;font-size:1.2rem;font-weight:700;}
.ino-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.ino-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.ino-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.ino-list{margin:0;padding:0;list-style:none;}
.ino-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.ino-list li:last-child{border-bottom:none;}
.ino-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.ino-tag-lib{background:#e0f2fe;color:#0369a1;}
.ino-tag-fn{background:#dcfce7;color:#166534;}
.ino-tag-def{background:#fef9c3;color:#854d0e;}
.ino-tag-var{background:#f3e8ff;color:#7e22ce;}
.ino-tag-setup{background:#00979d;color:#fff;}
.ino-tag-loop{background:#005c5f;color:#fff;}
.ino-body{padding:8px 14px;font-size:12px;font-family:ui-monospace,monospace;color:var(--fg-2,#555);line-height:1.5;white-space:pre-wrap;word-break:break-word;max-height:200px;overflow-y:auto;}
`;

function parseArduino(text) {
  const lines = text.split(/\r?\n/);

  const includes = [];
  const functions = [];
  const defines = [];
  const constVars = [];
  const globalVars = [];
  let setupBody = '';
  let loopBody = '';

  let inSetup = false;
  let inLoop = false;
  let braceDepth = 0;
  let captureBody = null;
  const capturedSetup = [];
  const capturedLoop = [];

  for (const line of lines) {
    const t = line.trim();

    // Skip comments
    if (t.startsWith('//') || t.startsWith('*')) continue;

    // Includes
    const incM = t.match(/^#include\s+[<"]([\w./]+)[>"]/) ;
    if (incM) { includes.push(incM[1]); continue; }

    // Defines
    const defM = t.match(/^#define\s+(\w+)\s+(.+)/);
    if (defM) { defines.push({ name: defM[1], value: defM[2].trim() }); continue; }

    // Const variables
    const constM = t.match(/^const\s+\w+\s+(\w+)\s*=/);
    if (constM) { constVars.push(constM[1]); continue; }

    // Global variable declarations (int, long, float, bool, String, byte, char, etc.)
    const gvarM = t.match(/^(?:int|long|float|double|bool|String|byte|char|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t)\s+(\w+)\s*(?:=|;)/);
    if (gvarM) { globalVars.push(gvarM[1]); continue; }

    // Function declarations (not setup/loop)
    const fnM = t.match(/^(?:\w+\s+)+(\w+)\s*\([^)]*\)\s*\{?$/);
    if (fnM) {
      const name = fnM[1];
      if (name !== 'setup' && name !== 'loop' && name !== 'if' && name !== 'for' && name !== 'while') {
        functions.push(name);
      }
    }

    // Track setup() and loop() body capture
    if (/^void\s+setup\s*\(\s*\)/.test(t)) {
      inSetup = true;
      braceDepth = 0;
      captureBody = capturedSetup;
    }
    if (/^void\s+loop\s*\(\s*\)/.test(t)) {
      inLoop = true;
      braceDepth = 0;
      captureBody = capturedLoop;
    }

    if (captureBody !== null) {
      for (const ch of line) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }
      if (braceDepth > 0 || captureBody.length === 0) {
        captureBody.push(line);
      } else {
        captureBody = null;
        inSetup = false;
        inLoop = false;
      }
    }
  }

  // Summarize setup/loop bodies
  const summarizeBody = (bodyLines) => {
    const content = bodyLines.map((l) => l.trim()).filter((l) => l && !l.startsWith('//') && l !== '{' && l !== '}');
    return content.slice(0, 6).join('\n');
  };

  setupBody = summarizeBody(capturedSetup);
  loopBody = summarizeBody(capturedLoop);

  return { includes, functions, defines, constVars, globalVars, setupBody, loopBody };
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

export async function render(intake) {
  const text = intake.text || '';
  const { includes, functions, defines, constVars, globalVars, setupBody, loopBody } = parseArduino(text);

  const host = document.createElement('div');
  host.className = 'ino-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'ino-title';
  const badgeEl = document.createElement('span');
  badgeEl.className = 'ino-badge';
  badgeEl.textContent = 'Arduino Sketch';
  title.appendChild(badgeEl);
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'ino-sub';
  const parts = [];
  parts.push(`${includes.length} include${includes.length !== 1 ? 's' : ''}`);
  parts.push(`${functions.length} function${functions.length !== 1 ? 's' : ''}`);
  if (defines.length) parts.push(`${defines.length} #define${defines.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'ino-cards';
  const cardItems = [
    { value: includes.length, label: 'Libraries' },
    { value: functions.length, label: 'Functions' },
    { value: defines.length + constVars.length, label: 'Constants' },
    { value: globalVars.length, label: 'Globals' },
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

  // Includes
  if (includes.length > 0) {
    const sec = makeSection(host, `Included Libraries (${includes.length})`);
    const ul = makeList(sec);
    for (const lib of includes) {
      const li = document.createElement('li');
      li.appendChild(makeTag('ino-tag-lib', '#include'));
      li.appendChild(document.createTextNode(' ' + lib));
      ul.appendChild(li);
    }
  }

  // #define constants
  if (defines.length > 0) {
    const sec = makeSection(host, `#define Constants (${defines.length})`);
    const ul = makeList(sec);
    for (const { name, value } of defines) {
      const li = document.createElement('li');
      li.appendChild(makeTag('ino-tag-def', '#define'));
      li.appendChild(document.createTextNode(' ' + name + ' = ' + value));
      ul.appendChild(li);
    }
  }

  // Const variables
  if (constVars.length > 0) {
    const sec = makeSection(host, `Const Variables (${constVars.length})`);
    const ul = makeList(sec);
    for (const name of constVars) {
      const li = document.createElement('li');
      li.appendChild(makeTag('ino-tag-var', 'const'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Global variables
  if (globalVars.length > 0) {
    const sec = makeSection(host, `Global Variables (${globalVars.length})`);
    const ul = makeList(sec);
    for (const name of globalVars) {
      const li = document.createElement('li');
      li.appendChild(makeTag('ino-tag-var', 'global'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Functions
  if (functions.length > 0) {
    const sec = makeSection(host, `Functions (${functions.length})`);
    const ul = makeList(sec);
    for (const name of functions) {
      const li = document.createElement('li');
      li.appendChild(makeTag('ino-tag-fn', 'fn'));
      li.appendChild(document.createTextNode(' ' + name + '()'));
      ul.appendChild(li);
    }
  }

  // setup() summary
  if (setupBody) {
    const sec = makeSection(host, 'setup() — Initialization');
    const body = document.createElement('div');
    body.className = 'ino-body';
    body.textContent = setupBody;
    sec.appendChild(body);
  }

  // loop() summary
  if (loopBody) {
    const sec = makeSection(host, 'loop() — Main Loop');
    const body = document.createElement('div');
    body.className = 'ino-body';
    body.textContent = loopBody;
    sec.appendChild(body);
  }

  return { parentNode: host };
}
