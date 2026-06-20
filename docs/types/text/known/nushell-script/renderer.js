const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nu-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.nu-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#059669;color:#fff;vertical-align:middle;margin-right:8px;}
.nu-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.nu-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.nu-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.nu-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:100px;}
.nu-card strong{display:block;font-size:1.2rem;font-weight:700;}
.nu-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.nu-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.nu-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.nu-list{margin:0;padding:0;list-style:none;}
.nu-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.nu-list li:last-child{border-bottom:none;}
.nu-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#d1fae5;color:#065f46;font-weight:700;}
.nu-tag-export{background:#dcfce7;color:#166534;}
.nu-tag-use{background:#e0f2fe;color:#0369a1;}
.nu-tag-alias{background:#ede9fe;color:#6d28d9;}
.nu-tag-let{background:#fef3c7;color:#92400e;}
.nu-tag-mut{background:#fce7f3;color:#9d174d;}
.nu-pill{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f1f5f9);border:1px solid var(--border,#cbd5e1);font-family:ui-monospace,monospace;margin:2px 2px;}
.nu-param{font-size:11px;color:var(--fg-2,#888);}
.nu-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
`;

function analyzeNu(text) {
  const lines = text.split(/\r?\n/);
  const defs = [];
  const exportDefs = [];
  const uses = [];
  const aliases = [];
  const lets = [];
  const muts = [];
  let pipeCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // export def
    const exportDefM = trimmed.match(/^export\s+def\s+([\w-]+)\s*\[([^\]]*)\]/);
    if (exportDefM) {
      const params = exportDefM[2].trim().split(/\s*,\s*|\s+/).filter(Boolean);
      exportDefs.push({ name: exportDefM[1], params });
      continue;
    }

    // def
    const defM = trimmed.match(/^def\s+([\w-]+)\s*\[([^\]]*)\]/);
    if (defM) {
      const params = defM[2].trim().split(/\s*,\s*|\s+/).filter(Boolean);
      defs.push({ name: defM[1], params });
      continue;
    }

    // use
    const useM = trimmed.match(/^use\s+(\S+)/);
    if (useM) { uses.push(useM[1]); continue; }

    // alias
    const aliasM = trimmed.match(/^(?:export\s+)?alias\s+([\w-]+)/);
    if (aliasM) { aliases.push(aliasM[1]); continue; }

    // let binding
    const letM = trimmed.match(/^let\s+([\w_]+)/);
    if (letM) { lets.push(letM[1]); continue; }

    // mut binding
    const mutM = trimmed.match(/^mut\s+([\w_]+)/);
    if (mutM) { muts.push(mutM[1]); continue; }

    // pipe count (| that isn't part of | to close a string etc.)
    const pipes = (trimmed.match(/(?<!['"\\])\|(?!['"\\])/g) || []).length;
    pipeCount += pipes;
  }

  return { defs, exportDefs, uses, aliases, lets, muts, pipeCount };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'nu-section';
  const hd = document.createElement('div');
  hd.className = 'nu-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'nu-list';
  sec.appendChild(ul);
  return ul;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();
  const { defs, exportDefs, uses, aliases, lets, muts, pipeCount } = analyzeNu(text);

  const allDefs = [...exportDefs, ...defs];

  const host = document.createElement('div');
  host.className = 'nu-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'nu-title';
  title.innerHTML = `<span class="nu-badge">Nushell Script</span>${esc(name)}`;
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'nu-sub';
  const parts = [];
  parts.push(`${allDefs.length} command${allDefs.length !== 1 ? 's' : ''}`);
  if (exportDefs.length) parts.push(`${exportDefs.length} public`);
  if (uses.length) parts.push(`${uses.length} import${uses.length !== 1 ? 's' : ''}`);
  if (aliases.length) parts.push(`${aliases.length} alias${aliases.length !== 1 ? 'es' : ''}`);
  parts.push(`${pipeCount} pipe${pipeCount !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'nu-cards';
  for (const { value, label } of [
    { value: allDefs.length, label: 'Commands' },
    { value: exportDefs.length, label: 'Exported' },
    { value: lets.length + muts.length, label: 'Bindings' },
    { value: pipeCount, label: 'Pipes' },
  ]) {
    const card = document.createElement('div');
    card.className = 'nu-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Exported commands
  if (exportDefs.length > 0) {
    const sec = makeSection(host, `Exported Commands (${exportDefs.length})`);
    const ul = makeList(sec);
    for (const { name: dname, params } of exportDefs) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'nu-tag nu-tag-export';
      tag.textContent = 'export def';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + dname));
      if (params.length > 0) {
        const paramSpan = document.createElement('span');
        paramSpan.className = 'nu-param';
        paramSpan.textContent = '[' + params.join(', ') + ']';
        li.appendChild(paramSpan);
      }
      ul.appendChild(li);
    }
  }

  // Private commands
  if (defs.length > 0) {
    const MAX = 12;
    const sec = makeSection(host, `Commands (${defs.length})`);
    const ul = makeList(sec);
    for (const { name: dname, params } of defs.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'nu-tag';
      tag.textContent = 'def';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + dname));
      if (params.length > 0) {
        const paramSpan = document.createElement('span');
        paramSpan.className = 'nu-param';
        paramSpan.textContent = '[' + params.join(', ') + ']';
        li.appendChild(paramSpan);
      }
      ul.appendChild(li);
    }
    if (defs.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${defs.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Use imports
  if (uses.length > 0) {
    const sec = makeSection(host, `Imports (${uses.length})`);
    const ul = makeList(sec);
    for (const u of uses) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'nu-tag nu-tag-use';
      tag.textContent = 'use';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + u));
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
      tag.className = 'nu-tag nu-tag-alias';
      tag.textContent = 'alias';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + a));
      ul.appendChild(li);
    }
  }

  // let/mut bindings
  const bindings = [
    ...lets.map((n) => ({ name: n, kind: 'let' })),
    ...muts.map((n) => ({ name: n, kind: 'mut' })),
  ];
  if (bindings.length > 0) {
    const MAX = 10;
    const sec = makeSection(host, `Bindings (${bindings.length})`);
    const ul = makeList(sec);
    for (const { name: bname, kind } of bindings.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = `nu-tag nu-tag-${kind}`;
      tag.textContent = kind;
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + bname));
      ul.appendChild(li);
    }
    if (bindings.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${bindings.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'nu-pre';
  pre.textContent = text;
  srcSec.appendChild(pre);

  return { parentNode: host };
}
