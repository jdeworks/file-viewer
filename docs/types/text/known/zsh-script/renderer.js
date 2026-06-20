const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.zsh-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.zsh-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1d4ed8;color:#fff;vertical-align:middle;margin-right:8px;}
.zsh-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.zsh-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.zsh-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.zsh-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:100px;}
.zsh-card strong{display:block;font-size:1.2rem;font-weight:700;}
.zsh-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.zsh-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.zsh-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.zsh-list{margin:0;padding:0;list-style:none;}
.zsh-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.zsh-list li:last-child{border-bottom:none;}
.zsh-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#dbeafe;color:#1e40af;font-weight:700;}
.zsh-tag-fn{background:#ede9fe;color:#6d28d9;}
.zsh-tag-autoload{background:#d1fae5;color:#065f46;}
.zsh-tag-zstyle{background:#fef3c7;color:#92400e;}
.zsh-tag-bindkey{background:#fce7f3;color:#9d174d;}
.zsh-tag-compdef{background:#e0f2fe;color:#0369a1;}
.zsh-tag-local{background:#f8fafc;color:#334155;}
.zsh-tag-zle{background:#fff7ed;color:#9a3412;}
.zsh-pill{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f1f5f9);border:1px solid var(--border,#cbd5e1);font-family:ui-monospace,monospace;margin:2px 2px;}
.zsh-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
`;

function analyzeZsh(text) {
  const lines = text.split(/\r?\n/);
  const functions = [];
  const locals = [];
  const autoloads = [];
  const zstyles = [];
  const bindkeys = [];
  const compdefs = [];
  const sources = [];
  const arrays = [];
  const zleWidgets = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // function definitions: function name { or name() {
    const fnM = trimmed.match(/^(?:function\s+)?([\w:-]+)\s*\(\s*\)\s*\{?/) ||
                trimmed.match(/^function\s+([\w:-]+)\s*(?:\(\s*\))?\s*\{?/);
    if (fnM && !trimmed.startsWith('if ') && !trimmed.startsWith('while ') && !trimmed.startsWith('for ')) {
      functions.push(fnM[1]);
      continue;
    }

    // local/typeset variables
    const localM = trimmed.match(/^(?:local|typeset(?:\s+-[A-Za-z]+)*)\s+([\w_]+)/);
    if (localM) { locals.push(localM[1]); continue; }

    // autoload
    const autoM = trimmed.match(/^autoload\s+(?:-[A-Za-z]+\s+)*([\w/ ]+)/);
    if (autoM) {
      autoM[1].trim().split(/\s+/).filter(Boolean).forEach((a) => autoloads.push(a));
      continue;
    }

    // zstyle
    const zsM = trimmed.match(/^zstyle\s+'?:([^'"\s]+)/);
    if (zsM) { zstyles.push(zsM[1]); continue; }

    // bindkey
    const bkM = trimmed.match(/^bindkey\s+/);
    if (bkM) { bindkeys.push(trimmed.replace(/^bindkey\s+/, '')); continue; }

    // compdef
    const cdM = trimmed.match(/^compdef\s+(\S+)/);
    if (cdM) { compdefs.push(cdM[1]); continue; }

    // source / .
    const srcM = trimmed.match(/^(?:source|\.)\s+(\S+)/);
    if (srcM) { sources.push(srcM[1]); continue; }

    // array declarations: varname=( ...
    const arrM = trimmed.match(/^([\w_]+)=\s*\(/);
    if (arrM) { arrays.push(arrM[1]); continue; }

    // zle widget registration
    const zleM = trimmed.match(/^zle\s+-N\s+(\S+)/);
    if (zleM) { zleWidgets.push(zleM[1]); continue; }
  }

  return { functions, locals, autoloads, zstyles, bindkeys, compdefs, sources, arrays, zleWidgets };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'zsh-section';
  const hd = document.createElement('div');
  hd.className = 'zsh-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'zsh-list';
  sec.appendChild(ul);
  return ul;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();
  const { functions, locals, autoloads, zstyles, bindkeys, compdefs, sources, arrays, zleWidgets } = analyzeZsh(text);

  const host = document.createElement('div');
  host.className = 'zsh-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'zsh-title';
  title.innerHTML = `<span class="zsh-badge">Zsh Script</span>${esc(name)}`;
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'zsh-sub';
  const parts = [];
  parts.push(`${functions.length} function${functions.length !== 1 ? 's' : ''}`);
  if (autoloads.length) parts.push(`${autoloads.length} autoload${autoloads.length !== 1 ? 's' : ''}`);
  if (zstyles.length) parts.push(`${zstyles.length} zstyle${zstyles.length !== 1 ? 's' : ''}`);
  if (bindkeys.length) parts.push(`${bindkeys.length} binding${bindkeys.length !== 1 ? 's' : ''}`);
  if (compdefs.length) parts.push(`${compdefs.length} compdef${compdefs.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'zsh-cards';
  for (const { value, label } of [
    { value: functions.length, label: 'Functions' },
    { value: autoloads.length, label: 'Autoloads' },
    { value: bindkeys.length, label: 'Bindings' },
    { value: compdefs.length, label: 'Completions' },
  ]) {
    const card = document.createElement('div');
    card.className = 'zsh-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Functions
  if (functions.length > 0) {
    const MAX = 12;
    const sec = makeSection(host, `Functions (${functions.length})`);
    const ul = makeList(sec);
    for (const fn of functions.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'zsh-tag zsh-tag-fn';
      tag.textContent = 'function';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + fn));
      ul.appendChild(li);
    }
    if (functions.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${functions.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Autoloads
  if (autoloads.length > 0) {
    const MAX = 10;
    const sec = makeSection(host, `Autoloads (${autoloads.length})`);
    const ul = makeList(sec);
    for (const a of autoloads.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'zsh-tag zsh-tag-autoload';
      tag.textContent = 'autoload';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + a));
      ul.appendChild(li);
    }
    if (autoloads.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${autoloads.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Zstyle settings
  if (zstyles.length > 0) {
    const MAX = 8;
    const sec = makeSection(host, `Zstyle Settings (${zstyles.length})`);
    const ul = makeList(sec);
    for (const z of zstyles.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'zsh-tag zsh-tag-zstyle';
      tag.textContent = 'zstyle';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' :' + z));
      ul.appendChild(li);
    }
    if (zstyles.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${zstyles.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Bindkey mappings
  if (bindkeys.length > 0) {
    const MAX = 8;
    const sec = makeSection(host, `Key Bindings (${bindkeys.length})`);
    const ul = makeList(sec);
    for (const b of bindkeys.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'zsh-tag zsh-tag-bindkey';
      tag.textContent = 'bindkey';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + b));
      ul.appendChild(li);
    }
    if (bindkeys.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${bindkeys.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Compdef completions
  if (compdefs.length > 0) {
    const sec = makeSection(host, `Completion Definitions (${compdefs.length})`);
    const ul = makeList(sec);
    for (const c of compdefs) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'zsh-tag zsh-tag-compdef';
      tag.textContent = 'compdef';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + c));
      ul.appendChild(li);
    }
  }

  // ZLE widget registrations
  if (zleWidgets.length > 0) {
    const sec = makeSection(host, `ZLE Widgets (${zleWidgets.length})`);
    const ul = makeList(sec);
    for (const w of zleWidgets) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'zsh-tag zsh-tag-zle';
      tag.textContent = 'zle -N';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + w));
      ul.appendChild(li);
    }
  }

  // Source inclusions
  if (sources.length > 0) {
    const sec = makeSection(host, `Source Inclusions (${sources.length})`);
    const ul = makeList(sec);
    for (const s of sources) {
      const li = document.createElement('li');
      li.textContent = s;
      ul.appendChild(li);
    }
  }

  // Arrays
  if (arrays.length > 0) {
    const sec = makeSection(host, `Array Declarations (${arrays.length})`);
    const wrapper = document.createElement('div');
    wrapper.style.padding = '10px 14px';
    for (const a of arrays) {
      const pill = document.createElement('span');
      pill.className = 'zsh-pill';
      pill.textContent = a;
      wrapper.appendChild(pill);
    }
    sec.appendChild(wrapper);
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'zsh-pre';
  pre.textContent = text;
  srcSec.appendChild(pre);

  return { parentNode: host };
}
