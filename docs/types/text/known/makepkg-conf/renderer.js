const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.makepkgcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.makepkgcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1793d1;color:#fff;vertical-align:middle;margin-right:8px;}
.makepkgcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.makepkgcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.makepkgcfg-card{margin:10px 0;border:1px solid var(--border,#e0e0e0);border-radius:6px;overflow:hidden;}
.makepkgcfg-card-hd{padding:6px 12px;background:var(--bg-2,#f6f8fa);font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:space-between;user-select:none;}
.makepkgcfg-card-hd:hover{background:var(--bg-3,#eaeef2);}
.makepkgcfg-card-body{padding:0;}
.makepkgcfg-table{width:100%;border-collapse:collapse;font-size:12px;}
.makepkgcfg-table td{padding:5px 12px;border-top:1px solid var(--border,#e0e0e0);vertical-align:top;}
.makepkgcfg-table td:first-child{font-family:ui-monospace,monospace;color:var(--fg-2,#888);width:30%;white-space:nowrap;}
.makepkgcfg-table td:last-child{font-family:ui-monospace,monospace;word-break:break-word;}
.makepkgcfg-arrow{font-size:10px;color:var(--fg-2,#888);transition:transform .15s;}
.makepkgcfg-arrow.open{transform:rotate(90deg);}
.makepkgcfg-chip{display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;margin:1px 2px;font-family:ui-monospace,monospace;}
.mpkg-chip-green{background:#e6f4ea;color:#1a7f37;}
.mpkg-chip-blue{background:#e3f2fd;color:#0d47a1;}
.mpkg-chip-orange{background:#fff3e0;color:#e65100;}
.mpkg-chip-gray{background:var(--bg-2,#f6f8fa);color:var(--fg-2,#888);border:1px solid var(--border,#e0e0e0);}
.mpkg-chip-red{background:#fdf0f0;color:#c62828;border:1px solid #f5c6cb;}
.makepkgcfg-val{font-family:ui-monospace,monospace;color:var(--fg,#24292f);}
.makepkgcfg-val-trunc{font-family:ui-monospace,monospace;color:var(--fg,#24292f);word-break:break-all;}
`;

/** Parse bash-style VAR="value" or VAR=value assignments. Handles line continuations with backslash. */
function parseBashVars(text) {
  const vars = {};
  // Collapse line continuations first
  const collapsed = text.replace(/\\\n\s*/g, ' ');
  for (const raw of collapsed.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    // Match VAR="value", VAR='value', or VAR=value
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    // Strip surrounding quotes
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    vars[m[1]] = v;
  }
  return vars;
}

/** Parse a bash array value like (!distcc color ccache check !sign) into items, noting ! prefix. */
function parseBashArray(raw) {
  const inner = raw.replace(/^\(|\)$/g, '').trim();
  return inner.split(/\s+/).filter(Boolean).map(item => {
    if (item.startsWith('!')) return { name: item.slice(1), disabled: true };
    return { name: item, disabled: false };
  });
}

function chip(text, cls) {
  return `<span class="makepkgcfg-chip ${cls}">${esc(text)}</span>`;
}

function valSpan(text, truncate = false) {
  if (truncate && text.length > 120) {
    return `<span class="makepkgcfg-val-trunc" title="${esc(text)}">${esc(text.slice(0, 120))}…</span>`;
  }
  return `<span class="makepkgcfg-val">${esc(text)}</span>`;
}

function row(label, content) {
  return `<tr><td>${esc(label)}</td><td>${content}</td></tr>`;
}

function renderCard(title, bodyHtml, isOpen) {
  const bodyStyle = isOpen ? '' : ' style="display:none"';
  const arrowClass = isOpen ? ' open' : '';
  return `<div class="makepkgcfg-card">
  <div class="makepkgcfg-card-hd" onclick="(function(el){var b=el.nextElementSibling;var a=el.querySelector('.makepkgcfg-arrow');var o=b.style.display==='none';b.style.display=o?'':'none';a.classList.toggle('open',o);})(this)">
    <span>${esc(title)}</span>
    <span class="makepkgcfg-arrow${arrowClass}">▶</span>
  </div>
  <div class="makepkgcfg-card-body"${bodyStyle}>
    <table class="makepkgcfg-table"><tbody>${bodyHtml}</tbody></table>
  </div>
</div>`;
}

export function render(intake) {
  const text = intake.text || '';
  const vars = parseBashVars(text);

  const cards = [];

  // ── Architecture card ──
  {
    const rows = [];
    if (vars.CARCH != null) {
      const arch = vars.CARCH.trim();
      const archCls = arch === 'x86_64' ? 'mpkg-chip-blue' : arch === 'aarch64' ? 'mpkg-chip-green' : arch === 'armv7h' ? 'mpkg-chip-orange' : 'mpkg-chip-gray';
      rows.push(row('CARCH', chip(arch, archCls)));
    }
    if (vars.CHOST != null) rows.push(row('CHOST', valSpan(vars.CHOST)));
    if (rows.length) cards.push(renderCard('Architecture', rows.join(''), true));
  }

  // ── Compiler flags card ──
  {
    const rows = [];
    const flagKeys = ['CFLAGS', 'CXXFLAGS', 'RUSTFLAGS', 'LDFLAGS', 'DEBUG_CFLAGS', 'DEBUG_CXXFLAGS'];
    for (const k of flagKeys) {
      if (vars[k] == null) continue;
      const flagVal = vars[k];
      // Extract notable flags as chips
      const notable = [];
      if (flagVal.includes('-march=native')) notable.push(chip('-march=native', 'mpkg-chip-orange'));
      if (flagVal.includes('-O3')) notable.push(chip('-O3', 'mpkg-chip-blue'));
      else if (flagVal.includes('-O2')) notable.push(chip('-O2', 'mpkg-chip-blue'));
      if (flagVal.includes('-pipe')) notable.push(chip('-pipe', 'mpkg-chip-gray'));
      if (flagVal.includes('-fstack-protector')) notable.push(chip('-fstack-protector', 'mpkg-chip-green'));
      const display = `${valSpan(flagVal, true)}${notable.length ? '<br>' + notable.join(' ') : ''}`;
      rows.push(row(k, display));
    }
    if (rows.length) cards.push(renderCard('Compiler Flags', rows.join(''), true));
  }

  // ── Build settings card ──
  {
    const rows = [];
    if (vars.MAKEFLAGS != null) {
      const mf = vars.MAKEFLAGS;
      const jMatch = mf.match(/-j\s*(\d+|nproc|\$\(nproc\))/);
      const jChip = jMatch ? chip(`-j${jMatch[1]}`, 'mpkg-chip-blue') : '';
      rows.push(row('MAKEFLAGS', `${valSpan(mf)}${jChip ? '<br>' + jChip : ''}`));
    }
    if (vars.BUILDENV != null) {
      const items = parseBashArray(vars.BUILDENV);
      const chips = items.map(({ name, disabled }) => {
        const cls = disabled ? 'mpkg-chip-gray' : (name === 'ccache' ? 'mpkg-chip-green' : name === 'color' ? 'mpkg-chip-blue' : name === 'check' ? 'mpkg-chip-orange' : 'mpkg-chip-gray');
        return chip((disabled ? '!' : '') + name, cls);
      }).join(' ');
      rows.push(row('BUILDENV', chips));
    }
    if (vars.BUILDDIR != null) rows.push(row('BUILDDIR', valSpan(vars.BUILDDIR)));
    if (vars.PKGDEST != null) rows.push(row('PKGDEST', valSpan(vars.PKGDEST)));
    if (vars.SRCDEST != null) rows.push(row('SRCDEST', valSpan(vars.SRCDEST)));
    if (vars.LOGDEST != null) rows.push(row('LOGDEST', valSpan(vars.LOGDEST)));
    if (vars.PACKAGER != null) rows.push(row('PACKAGER', valSpan(vars.PACKAGER)));
    if (rows.length) cards.push(renderCard('Build Settings', rows.join(''), true));
  }

  // ── Package options card ──
  {
    const rows = [];
    if (vars.OPTIONS != null) {
      const items = parseBashArray(vars.OPTIONS);
      const chips = items.map(({ name, disabled }) => {
        const cls = disabled ? 'mpkg-chip-gray' : (name === 'strip' ? 'mpkg-chip-blue' : name === 'lto' ? 'mpkg-chip-green' : name === 'debug' ? 'mpkg-chip-orange' : 'mpkg-chip-gray');
        return chip((disabled ? '!' : '') + name, cls);
      }).join(' ');
      rows.push(row('OPTIONS', chips));
    }
    if (vars.PKGEXT != null) {
      const ext = vars.PKGEXT.trim();
      const extCls = ext === '.pkg.tar.zst' ? 'mpkg-chip-blue' : 'mpkg-chip-gray';
      rows.push(row('PKGEXT', chip(ext, extCls)));
    }
    if (vars.SRCEXT != null) rows.push(row('SRCEXT', valSpan(vars.SRCEXT)));
    if (vars.INTEGRITY_CHECK != null) {
      const items = parseBashArray(vars.INTEGRITY_CHECK);
      rows.push(row('INTEGRITY_CHECK', items.map(({ name }) => chip(name, 'mpkg-chip-blue')).join(' ')));
    }
    if (rows.length) cards.push(renderCard('Package Options', rows.join(''), false));
  }

  // ── Signing card ──
  {
    const rows = [];
    if (vars.GPGKEY != null) rows.push(row('GPGKEY', valSpan(vars.GPGKEY)));
    if (rows.length) cards.push(renderCard('Signing', rows.join(''), false));
  }

  const host = document.createElement('div');
  host.className = 'makepkgcfg-doc';
  const arch = vars.CARCH ? ` · ${esc(vars.CARCH)}` : '';
  host.innerHTML = `<style>${CSS}</style>
<div class="makepkgcfg-title"><span class="makepkgcfg-badge">makepkg</span>makepkg Config</div>
<div class="makepkgcfg-sub">Arch Linux build configuration${arch}</div>
${cards.length ? cards.join('') : '<p style="color:var(--fg-2,#888);font-size:13px;">No configuration found.</p>'}`;
  return { parentNode: host };
}
