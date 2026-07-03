const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pkgb-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pkgb-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1793d1;color:#fff;vertical-align:middle;margin-right:8px;}
.pkgb-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pkgb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pkgb-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.pkgb-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:120px;}
.pkgb-card strong{display:block;font-size:1.1rem;font-weight:700;font-family:ui-monospace,monospace;}
.pkgb-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.pkgb-section{margin:16px 0;}
.pkgb-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.pkgb-list{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px;}
.pkgb-list li{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:3px 10px;font-family:ui-monospace,monospace;font-size:12px;}
.pkgb-source{font-family:ui-monospace,monospace;font-size:11px;word-break:break-all;color:var(--fg,#24292f);}
.pkgb-fn-present{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:#d1fae5;color:#065f46;margin:2px;}
.pkgb-fn-absent{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:var(--bg-2,#f3f4f6);color:var(--fg-2,#9ca3af);margin:2px;}
`;

function parseBashArray(val) {
  // Parse bash array values like ('a' 'b' 'c') or (a b c)
  const inner = val.replace(/^\s*\(|\)\s*$/g, '').trim();
  if (!inner) return [];
  // Split on whitespace not inside quotes
  const items = [];
  let current = '';
  let inQ = false;
  let qChar = '';
  for (const ch of inner) {
    if (!inQ && (ch === '"' || ch === "'")) { inQ = true; qChar = ch; continue; }
    if (inQ && ch === qChar) { inQ = false; continue; }
    if (!inQ && /\s/.test(ch)) {
      if (current) { items.push(current); current = ''; }
    } else {
      current += ch;
    }
  }
  if (current) items.push(current);
  return items;
}

function parsePkgbuild(text) {
  const lines = (text || '').split(/\r?\n/);
  const vars = {};

  // Parse variable assignments (handles multi-line arrays)
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    // Skip comments
    if (t.startsWith('#')) { i++; continue; }

    // Variable assignment (allow optional spaces around `=` for .SRCINFO's `key = value` style)
    const varMatch = t.match(/^([\w.-]+)\s*=\s*(.*)$/);
    if (varMatch) {
      const key = varMatch[1];
      let val = varMatch[2].trim();
      // Multi-line array
      if (val.startsWith('(') && !val.endsWith(')')) {
        while (i < lines.length - 1 && !val.endsWith(')')) {
          i++;
          val += ' ' + lines[i].trim();
        }
      }
      val = val.replace(/^['"]|['"]$/g, '');
      // .SRCINFO repeats a key on separate lines (e.g. multiple `depends = x`) instead of using
      // PKGBUILD's `(a b c)` bash-array syntax — accumulate so parseBashArray still sees them all.
      vars[key] = key in vars ? vars[key] + ' ' + val : val;
    }
    i++;
  }

  // Detect functions
  const hasBuild = /^build\s*\(\s*\)\s*\{/m.test(text);
  const hasPackage = /^package\s*\(\s*\)\s*\{/m.test(text);
  const hasCheck = /^check\s*\(\s*\)\s*\{/m.test(text);
  const hasInstall = !!(vars.install);

  // Parse arrays
  const arch = vars.arch ? parseBashArray(vars.arch) : [];
  const depends = vars.depends ? parseBashArray(vars.depends) : [];
  const makedepends = vars.makedepends ? parseBashArray(vars.makedepends) : [];
  const source = vars.source ? parseBashArray(vars.source) : [];

  return {
    pkgname: vars.pkgname || '',
    pkgver: vars.pkgver || '',
    pkgrel: vars.pkgrel || '',
    pkgdesc: vars.pkgdesc || '',
    arch,
    depends,
    makedepends,
    source,
    hasInstall,
    hasBuild,
    hasPackage,
    hasCheck,
  };
}

export function render(intake) {
  const p = parsePkgbuild(intake.text || '');

  const host = document.createElement('div');
  host.className = 'pkgb-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const title = document.createElement('div');
  title.className = 'pkgb-title';
  title.innerHTML = '<span class="pkgb-badge">PKGBUILD</span>' + esc(p.pkgname || 'Arch Package');
  host.appendChild(title);

  const version = [p.pkgver, p.pkgrel].filter(Boolean).join('-');
  const sub = document.createElement('div');
  sub.className = 'pkgb-sub';
  sub.textContent = [version && `v${version}`, p.pkgdesc].filter(Boolean).join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'pkgb-summary';
  for (const { value, label } of [
    { value: version || '—', label: 'Version' },
    { value: p.arch.join(', ') || '—', label: 'Arch' },
    { value: p.depends.length, label: 'Depends' },
    { value: p.makedepends.length, label: 'Makedepends' },
  ]) {
    const card = document.createElement('div');
    card.className = 'pkgb-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Functions present
  {
    const sec = document.createElement('div');
    sec.className = 'pkgb-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Functions & Hooks';
    sec.appendChild(h3);
    const div = document.createElement('div');
    for (const [label, present] of [
      ['build()', p.hasBuild],
      ['package()', p.hasPackage],
      ['check()', p.hasCheck],
      ['install=', p.hasInstall],
    ]) {
      const span = document.createElement('span');
      span.className = present ? 'pkgb-fn-present' : 'pkgb-fn-absent';
      span.textContent = label;
      div.appendChild(span);
    }
    sec.appendChild(div);
    host.appendChild(sec);
  }

  // Depends
  if (p.depends.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'pkgb-section';
    const h3 = document.createElement('h3');
    h3.textContent = `Depends (${p.depends.length})`;
    sec.appendChild(h3);
    const ul = document.createElement('ul');
    ul.className = 'pkgb-list';
    for (const dep of p.depends) {
      const li = document.createElement('li');
      li.textContent = dep;
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  // Makedepends
  if (p.makedepends.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'pkgb-section';
    const h3 = document.createElement('h3');
    h3.textContent = `Makedepends (${p.makedepends.length})`;
    sec.appendChild(h3);
    const ul = document.createElement('ul');
    ul.className = 'pkgb-list';
    for (const dep of p.makedepends) {
      const li = document.createElement('li');
      li.textContent = dep;
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  // Sources (first 5)
  if (p.source.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'pkgb-section';
    const h3 = document.createElement('h3');
    h3.textContent = `Sources (${p.source.length})`;
    sec.appendChild(h3);
    const ul = document.createElement('ul');
    ul.className = 'pkgb-list';
    for (const src of p.source.slice(0, 5)) {
      const li = document.createElement('li');
      li.className = 'pkgb-source';
      li.textContent = src;
      ul.appendChild(li);
    }
    if (p.source.length > 5) {
      const li = document.createElement('li');
      li.textContent = `+${p.source.length - 5} more`;
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
