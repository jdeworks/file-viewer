const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.elv-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.elv-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.elv-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.elv-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.elv-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.elv-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:100px;}
.elv-card strong{display:block;font-size:1.2rem;font-weight:700;}
.elv-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.elv-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.elv-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.elv-list{margin:0;padding:0;list-style:none;}
.elv-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.elv-list li:last-child{border-bottom:none;}
.elv-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#ede9fe;color:#6d28d9;font-weight:700;}
.elv-tag-use{background:#e0f2fe;color:#0369a1;}
.elv-tag-var{background:#fef3c7;color:#92400e;}
.elv-tag-ext{background:#dcfce7;color:#166534;}
.elv-pill{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f1f5f9);border:1px solid var(--border,#cbd5e1);font-family:ui-monospace,monospace;margin:2px 2px;}
.elv-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
`;

function analyzeElvish(text) {
  const lines = text.split(/\r?\n/);
  const uses = [];
  const fns = [];
  const vars = [];
  const sets = [];
  const externalCmds = new Set();
  let ifCount = 0;
  let forCount = 0;
  let whileCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // use module
    const useM = trimmed.match(/^use\s+(\S+)/);
    if (useM) { uses.push(useM[1]); continue; }

    // fn definition: fn name { or fn name [params] {
    const fnM = trimmed.match(/^fn\s+(\S+)(?:\s+\[([^\]]*)\])?/);
    if (fnM) {
      const params = fnM[2] ? fnM[2].trim().split(/\s+/).filter(Boolean) : [];
      fns.push({ name: fnM[1], params });
      continue;
    }

    // var declaration
    const varM = trimmed.match(/^var\s+([\w-]+)/);
    if (varM) { vars.push(varM[1]); continue; }

    // set assignment
    const setM = trimmed.match(/^set\s+([\w:-]+)/);
    if (setM) { sets.push(setM[1]); continue; }

    // Control flow
    if (/^\s*if\s/.test(line)) ifCount++;
    if (/^\s*for\s/.test(line)) forCount++;
    if (/^\s*while\s/.test(line)) whileCount++;

    // External commands (lines starting with a bare word that isn't a keyword)
    const extM = trimmed.match(/^([a-z][a-z0-9_-]*)\s/);
    if (extM) {
      const kw = new Set(['fn', 'var', 'set', 'use', 'if', 'elif', 'else', 'for', 'while', 'try', 'catch', 'finally', 'return', 'break', 'continue', 'del', 'and', 'or', 'not', 'nop', 'put', 'echo', 'print', 'pprint', 'fail', 'source', 'eval', 'peach', 'each', 'all', 'take', 'drop', 'count', 'keys', 'has-key', 'has-value', 'str', 'num', 'float64', 'int', 'bool', 'list', 'map', 'ns', 'make-map', 'from-json', 'to-json', 'from-lines', 'to-lines', 'slurp', 'splits', 'joins', 'order']);
      if (!kw.has(extM[1])) externalCmds.add(extM[1]);
    }
  }

  return { uses, fns, vars, sets, externalCmds: [...externalCmds], ifCount, forCount, whileCount };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'elv-section';
  const hd = document.createElement('div');
  hd.className = 'elv-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'elv-list';
  sec.appendChild(ul);
  return ul;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();
  const { uses, fns, vars, sets, externalCmds, ifCount, forCount, whileCount } = analyzeElvish(text);

  const host = document.createElement('div');
  host.className = 'elv-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'elv-title';
  title.innerHTML = `<span class="elv-badge">Elvish Script</span>${esc(name)}`;
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'elv-sub';
  const parts = [];
  if (uses.length) parts.push(`${uses.length} module${uses.length !== 1 ? 's' : ''}`);
  parts.push(`${fns.length} fn${fns.length !== 1 ? 's' : ''}`);
  if (vars.length) parts.push(`${vars.length} var${vars.length !== 1 ? 's' : ''}`);
  const blocks = ifCount + forCount + whileCount;
  if (blocks) parts.push(`${blocks} control block${blocks !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'elv-cards';
  for (const { value, label } of [
    { value: uses.length, label: 'Modules' },
    { value: fns.length, label: 'Functions' },
    { value: vars.length, label: 'Variables' },
    { value: sets.length, label: 'set calls' },
  ]) {
    const card = document.createElement('div');
    card.className = 'elv-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // use modules
  if (uses.length > 0) {
    const sec = makeSection(host, `Modules (${uses.length})`);
    const ul = makeList(sec);
    for (const mod of uses) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'elv-tag elv-tag-use';
      tag.textContent = 'use';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + mod));
      ul.appendChild(li);
    }
  }

  // fn definitions
  if (fns.length > 0) {
    const sec = makeSection(host, `Functions (${fns.length})`);
    const ul = makeList(sec);
    for (const { name: fname, params } of fns) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'elv-tag';
      tag.textContent = 'fn';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + fname));
      if (params.length > 0) {
        const paramSpan = document.createElement('span');
        paramSpan.style.color = 'var(--fg-2,#888)';
        paramSpan.style.fontSize = '11px';
        paramSpan.textContent = '[' + params.join(' ') + ']';
        li.appendChild(paramSpan);
      }
      ul.appendChild(li);
    }
  }

  // var declarations
  if (vars.length > 0) {
    const MAX = 8;
    const sec = makeSection(host, `Variables (${vars.length})`);
    const ul = makeList(sec);
    for (const v of vars.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'elv-tag elv-tag-var';
      tag.textContent = 'var';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + v));
      ul.appendChild(li);
    }
    if (vars.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${vars.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // set assignments
  if (sets.length > 0) {
    const MAX = 8;
    const sec = makeSection(host, `Set Assignments (${sets.length})`);
    const ul = makeList(sec);
    for (const s of sets.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'elv-tag';
      tag.textContent = 'set';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + s));
      ul.appendChild(li);
    }
    if (sets.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${sets.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // External commands
  if (externalCmds.length > 0) {
    const MAX = 12;
    const sec = makeSection(host, `External Commands (${externalCmds.length})`);
    const wrapper = document.createElement('div');
    wrapper.style.padding = '10px 14px';
    for (const cmd of externalCmds.slice(0, MAX)) {
      const pill = document.createElement('span');
      pill.className = 'elv-pill';
      pill.textContent = cmd;
      wrapper.appendChild(pill);
    }
    if (externalCmds.length > MAX) {
      const more = document.createElement('span');
      more.style.cssText = 'font-size:11px;color:var(--fg-2,#888);margin-left:4px;';
      more.textContent = `+${externalCmds.length - MAX} more`;
      wrapper.appendChild(more);
    }
    sec.appendChild(wrapper);
  }

  // Control flow summary
  const ctrlParts = [];
  if (ifCount) ctrlParts.push(`if ×${ifCount}`);
  if (forCount) ctrlParts.push(`for ×${forCount}`);
  if (whileCount) ctrlParts.push(`while ×${whileCount}`);
  if (ctrlParts.length > 0) {
    const sec = makeSection(host, 'Control Flow');
    const wrapper = document.createElement('div');
    wrapper.style.padding = '10px 14px';
    for (const p of ctrlParts) {
      const pill = document.createElement('span');
      pill.className = 'elv-pill';
      pill.textContent = p;
      wrapper.appendChild(pill);
    }
    sec.appendChild(wrapper);
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'elv-pre';
  pre.textContent = text;
  srcSec.appendChild(pre);

  return { parentNode: host };
}
