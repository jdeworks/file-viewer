const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fish-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.fish-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0ea5e9;color:#fff;vertical-align:middle;margin-right:8px;}
.fish-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.fish-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.fish-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.fish-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:100px;}
.fish-card strong{display:block;font-size:1.2rem;font-weight:700;}
.fish-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.fish-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.fish-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.fish-list{margin:0;padding:0;list-style:none;}
.fish-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.fish-list li:last-child{border-bottom:none;}
.fish-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e0f2fe;color:#0369a1;font-weight:700;}
.fish-tag-fn{background:#ede9fe;color:#6d28d9;}
.fish-tag-alias{background:#dcfce7;color:#166534;}
.fish-tag-event{background:#fef3c7;color:#92400e;}
.fish-tag-abbr{background:#fce7f3;color:#9d174d;}
.fish-tag-global{background:#f0fdf4;color:#166534;}
.fish-tag-local{background:#f8fafc;color:#334155;}
.fish-tag-export{background:#fff7ed;color:#9a3412;}
.fish-pill{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f1f5f9);border:1px solid var(--border,#cbd5e1);font-family:ui-monospace,monospace;margin:2px 2px;}
.fish-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
`;

function analyzeFish(text) {
  const lines = text.split(/\r?\n/);
  const functions = [];
  const setVars = [];
  const sources = [];
  const aliases = [];
  const eventHandlers = [];
  const abbrs = [];
  let hasArgparse = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // function definition
    const fnM = trimmed.match(/^function\s+(\S+)(.*)/);
    if (fnM) {
      const name = fnM[1];
      const rest = fnM[2] || '';
      const evM = rest.match(/--on-event\s+(\S+)/);
      if (evM) {
        eventHandlers.push({ name, event: evM[1] });
      } else {
        functions.push(name);
      }
      continue;
    }

    // set variables: set -l, set -g, set -x, set -gx, etc.
    const setM = trimmed.match(/^set\s+((?:-[lgxeU]+\s+)*)([\w_]+)/);
    if (setM) {
      const flags = setM[1].trim();
      const varName = setM[2];
      let scope = 'local';
      if (/-g/.test(flags)) scope = 'global';
      if (/-x/.test(flags)) scope = 'export';
      if (/-l/.test(flags)) scope = 'local';
      setVars.push({ name: varName, scope });
      continue;
    }

    // source
    const srcM = trimmed.match(/^source\s+(\S+)/);
    if (srcM) { sources.push(srcM[1]); continue; }

    // alias
    const aliasM = trimmed.match(/^alias\s+([\w-]+)(?:\s*=?\s*['"]?(.+?)['"]?)?$/);
    if (aliasM) { aliases.push(aliasM[1]); continue; }

    // abbr
    const abbrM = trimmed.match(/^abbr\s+(?:-a\s+)?(?:--add\s+)?([\w-]+)/);
    if (abbrM) { abbrs.push(abbrM[1]); continue; }

    // argparse
    if (/\bargparse\b/.test(trimmed)) hasArgparse = true;
  }

  return { functions, setVars, sources, aliases, eventHandlers, abbrs, hasArgparse };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'fish-section';
  const hd = document.createElement('div');
  hd.className = 'fish-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'fish-list';
  sec.appendChild(ul);
  return ul;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();
  const isConfig = name.toLowerCase() === 'config.fish';
  const { functions, setVars, sources, aliases, eventHandlers, abbrs, hasArgparse } = analyzeFish(text);

  const host = document.createElement('div');
  host.className = 'fish-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'fish-title';
  const badgeLabel = isConfig ? 'Fish Config' : 'Fish Script';
  title.innerHTML = `<span class="fish-badge">${esc(badgeLabel)}</span>${esc(name)}`;
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'fish-sub';
  const parts = [];
  parts.push(`${functions.length} function${functions.length !== 1 ? 's' : ''}`);
  if (aliases.length) parts.push(`${aliases.length} alias${aliases.length !== 1 ? 'es' : ''}`);
  if (abbrs.length) parts.push(`${abbrs.length} abbr${abbrs.length !== 1 ? 's' : ''}`);
  if (eventHandlers.length) parts.push(`${eventHandlers.length} event handler${eventHandlers.length !== 1 ? 's' : ''}`);
  if (setVars.length) parts.push(`${setVars.length} variable${setVars.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'fish-cards';
  for (const { value, label } of [
    { value: functions.length, label: 'Functions' },
    { value: aliases.length, label: 'Aliases' },
    { value: abbrs.length, label: 'Abbrevs' },
    { value: setVars.length, label: 'Variables' },
  ]) {
    const card = document.createElement('div');
    card.className = 'fish-card';
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
      tag.className = 'fish-tag fish-tag-fn';
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

  // Variables
  if (setVars.length > 0) {
    const MAX = 10;
    const sec = makeSection(host, `Variables (${setVars.length})`);
    const ul = makeList(sec);
    for (const { name: vname, scope } of setVars.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = `fish-tag fish-tag-${scope === 'global' ? 'global' : scope === 'export' ? 'export' : 'local'}`;
      tag.textContent = scope;
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + vname));
      ul.appendChild(li);
    }
    if (setVars.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${setVars.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Aliases
  if (aliases.length > 0) {
    const sec = makeSection(host, `Aliases (${aliases.length})`);
    const ul = makeList(sec);
    for (const a of aliases) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'fish-tag fish-tag-alias';
      tag.textContent = 'alias';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + a));
      ul.appendChild(li);
    }
  }

  // Abbreviations
  if (abbrs.length > 0) {
    const sec = makeSection(host, `Abbreviations (${abbrs.length})`);
    const ul = makeList(sec);
    for (const a of abbrs) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'fish-tag fish-tag-abbr';
      tag.textContent = 'abbr';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + a));
      ul.appendChild(li);
    }
  }

  // Event handlers
  if (eventHandlers.length > 0) {
    const sec = makeSection(host, `Event Handlers (${eventHandlers.length})`);
    const ul = makeList(sec);
    for (const { name: fn, event } of eventHandlers) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'fish-tag fish-tag-event';
      tag.textContent = event;
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + fn));
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

  // Features
  if (hasArgparse) {
    const sec = makeSection(host, 'Features');
    const wrapper = document.createElement('div');
    wrapper.style.padding = '10px 14px';
    const pill = document.createElement('span');
    pill.className = 'fish-pill';
    pill.textContent = 'argparse';
    wrapper.appendChild(pill);
    sec.appendChild(wrapper);
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'fish-pre';
  pre.textContent = text;
  srcSec.appendChild(pre);

  return { parentNode: host };
}
