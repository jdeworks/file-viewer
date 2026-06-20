const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gd-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.gd-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#478cbf;color:#fff;vertical-align:middle;margin-right:8px;}
.gd-badge-tool{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#fde68a;color:#92400e;vertical-align:middle;margin-left:6px;}
.gd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.gd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.gd-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.gd-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.gd-card strong{display:block;font-size:1.2rem;font-weight:700;}
.gd-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.gd-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.gd-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.gd-list{margin:0;padding:0;list-style:none;}
.gd-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.gd-list li:last-child{border-bottom:none;}
.gd-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e0f2fe;color:#0369a1;font-weight:700;}
.gd-tag-export{background:#dcfce7;color:#166534;}
.gd-tag-signal{background:#fce7f3;color:#9d174d;}
.gd-tag-rpc{background:#fef3c7;color:#92400e;}
.gd-tag-static{background:#ede9fe;color:#7f52ff;}
.gd-tag-const{background:#f0fdf4;color:#15803d;}
.gd-tag-enum{background:#fff7ed;color:#c2410c;}
`;

function analyzeGDScript(text) {
  const lines = text.split(/\r?\n/);
  let className = null;
  let extendsClass = null;
  let isTool = false;
  let iconAnnotation = null;
  const exports = [];
  const signals = [];
  const funcs = [];
  const constants = [];
  const enums = [];
  const innerClasses = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;

    if (trimmed === '@tool') { isTool = true; continue; }

    const iconM = trimmed.match(/^@icon\s*\(\s*["'](.+?)["']\s*\)/);
    if (iconM) { iconAnnotation = iconM[1]; continue; }

    const classM = trimmed.match(/^class_name\s+(\w+)/);
    if (classM && !className) { className = classM[1]; continue; }

    const extendsM = trimmed.match(/^extends\s+(.+)/);
    if (extendsM && !extendsClass) { extendsClass = extendsM[1].trim(); continue; }

    // @export var
    const exportM = trimmed.match(/^@export(?:\s+\w+)?\s+var\s+(\w+)(?:\s*:\s*(\w+))?/);
    if (exportM) { exports.push({ name: exportM[1], type: exportM[2] || null }); continue; }

    // signal
    const sigM = trimmed.match(/^signal\s+(\w+)(?:\s*\(([^)]*)\))?/);
    if (sigM) { signals.push({ name: sigM[1], params: sigM[2] || '' }); continue; }

    // const
    const constM = trimmed.match(/^const\s+(\w+)\s*(?::\s*\w+)?\s*=/);
    if (constM) { constants.push(constM[1]); continue; }

    // enum
    const enumM = trimmed.match(/^enum\s+(\w+)/);
    if (enumM) { enums.push(enumM[1]); continue; }

    // inner class
    const innerM = trimmed.match(/^class\s+(\w+)/);
    if (innerM) { innerClasses.push(innerM[1]); continue; }

    // func (possibly with @rpc or @static annotation on prior line)
    const funcM = trimmed.match(/^(?:(static)\s+)?func\s+(\w+)\s*\(([^)]*)\)/);
    if (funcM) {
      const isStatic = Boolean(funcM[1]);
      const name = funcM[2];
      const params = funcM[3].trim();
      // check previous non-empty line for @rpc
      let isRpc = false;
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        const prev = lines[j].trim();
        if (prev === '') continue;
        if (prev.startsWith('@rpc')) { isRpc = true; }
        break;
      }
      funcs.push({ name, params, isStatic, isRpc });
      continue;
    }
  }

  return { className, extendsClass, isTool, iconAnnotation, exports, signals, funcs, constants, enums, innerClasses };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'gd-section';
  const hd = document.createElement('div');
  hd.className = 'gd-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'gd-list';
  sec.appendChild(ul);
  return ul;
}

function makeTag(cls, text) {
  const tag = document.createElement('span');
  tag.className = `gd-tag ${cls}`;
  tag.textContent = text;
  return tag;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const { className, extendsClass, isTool, iconAnnotation, exports, signals, funcs, constants, enums, innerClasses } = analyzeGDScript(text);

  const host = document.createElement('div');
  host.className = 'gd-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'gd-title';
  const badgeLabel = isTool ? 'Godot Tool Script' : 'GDScript';
  title.innerHTML = `<span class="gd-badge">${esc(badgeLabel)}</span>`;
  if (isTool) title.innerHTML += '<span class="gd-badge-tool">@tool</span>';
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'gd-sub';
  const parts = [];
  if (className) parts.push('class ' + className);
  if (extendsClass) parts.push('extends ' + extendsClass);
  if (iconAnnotation) parts.push('@icon ' + iconAnnotation);
  parts.push(`${funcs.length} func${funcs.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'gd-cards';
  const cardItems = [
    { value: extendsClass || '—', label: 'Extends' },
    { value: exports.length, label: 'Exports' },
    { value: signals.length, label: 'Signals' },
    { value: funcs.length, label: 'Functions' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'gd-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Class info
  if (className || extendsClass) {
    const sec = makeSection(host, 'Class Declaration');
    const ul = makeList(sec);
    if (className) {
      const li = document.createElement('li');
      li.appendChild(makeTag('gd-tag', 'class_name'));
      li.appendChild(document.createTextNode(' ' + className));
      ul.appendChild(li);
    }
    if (extendsClass) {
      const li = document.createElement('li');
      li.appendChild(makeTag('gd-tag', 'extends'));
      li.appendChild(document.createTextNode(' ' + extendsClass));
      ul.appendChild(li);
    }
  }

  // Exports
  if (exports.length > 0) {
    const sec = makeSection(host, `Exported Variables (${exports.length})`);
    const ul = makeList(sec);
    for (const { name, type } of exports) {
      const li = document.createElement('li');
      li.appendChild(makeTag('gd-tag-export', '@export'));
      li.appendChild(document.createTextNode(' ' + name));
      if (type) {
        li.appendChild(document.createTextNode(': '));
        const typeSpan = document.createElement('span');
        typeSpan.style.color = 'var(--fg-2,#888)';
        typeSpan.textContent = type;
        li.appendChild(typeSpan);
      }
      ul.appendChild(li);
    }
  }

  // Signals
  if (signals.length > 0) {
    const sec = makeSection(host, `Signals (${signals.length})`);
    const ul = makeList(sec);
    for (const { name, params } of signals) {
      const li = document.createElement('li');
      li.appendChild(makeTag('gd-tag-signal', 'signal'));
      li.appendChild(document.createTextNode(' ' + name + (params ? `(${params})` : '')));
      ul.appendChild(li);
    }
  }

  // Functions
  if (funcs.length > 0) {
    const sec = makeSection(host, `Functions (${funcs.length})`);
    const ul = makeList(sec);
    for (const { name, params, isStatic, isRpc } of funcs) {
      const li = document.createElement('li');
      if (isRpc) li.appendChild(makeTag('gd-tag-rpc', '@rpc'));
      if (isStatic) li.appendChild(makeTag('gd-tag-static', 'static'));
      li.appendChild(document.createTextNode(` ${name}(${params})`));
      ul.appendChild(li);
    }
  }

  // Constants
  if (constants.length > 0) {
    const sec = makeSection(host, `Constants (${constants.length})`);
    const ul = makeList(sec);
    for (const name of constants) {
      const li = document.createElement('li');
      li.appendChild(makeTag('gd-tag-const', 'const'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Enums
  if (enums.length > 0) {
    const sec = makeSection(host, `Enums (${enums.length})`);
    const ul = makeList(sec);
    for (const name of enums) {
      const li = document.createElement('li');
      li.appendChild(makeTag('gd-tag-enum', 'enum'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Inner Classes
  if (innerClasses.length > 0) {
    const sec = makeSection(host, `Inner Classes (${innerClasses.length})`);
    const ul = makeList(sec);
    for (const name of innerClasses) {
      const li = document.createElement('li');
      li.appendChild(makeTag('gd-tag', 'class'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  return { parentNode: host };
}
