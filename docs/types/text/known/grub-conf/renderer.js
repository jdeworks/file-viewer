const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.grubcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.grubcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#E67E22;color:#fff;vertical-align:middle;margin-right:8px;}
.grubcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.grubcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.grubcfg-section{margin-bottom:18px;}
.grubcfg-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.grubcfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.grubcfg-row{display:flex;gap:8px;align-items:baseline;margin-bottom:4px;flex-wrap:wrap;}
.grubcfg-key{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);min-width:160px;}
.grubcfg-val{font-family:ui-monospace,monospace;font-size:13px;font-weight:600;}
.grubcfg-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;}
.grubcfg-chip{font-size:11px;padding:2px 8px;border-radius:8px;background:#fef3e2;border:1px solid #f5cba7;color:#784212;font-family:ui-monospace,monospace;}
.grubcfg-entry{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 12px;margin-bottom:6px;}
.grubcfg-entry-name{font-weight:600;font-size:13px;margin-bottom:4px;}
.grubcfg-entry-meta{font-size:12px;color:var(--fg-2,#888);font-family:ui-monospace,monospace;}
.grubcfg-theme{font-size:12px;font-family:ui-monospace,monospace;color:#636e72;margin-top:4px;}
`;

function parseDefaultGrub(text) {
  const settings = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    settings[key] = val;
  }
  return settings;
}

function parseGrubCfg(text) {
  const global = { default: null, timeout: null };
  const entries = [];
  let inEntry = false;
  let depth = 0;
  let currentEntry = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // Global set commands
    if (!inEntry) {
      const setDefault = line.match(/^set\s+default=["']?(\S+?)["']?$/);
      if (setDefault) { global.default = setDefault[1]; continue; }
      const setTimeout = line.match(/^set\s+timeout=["']?(\S+?)["']?$/);
      if (setTimeout) { global.timeout = setTimeout[1]; continue; }
    }

    // menuentry "Name" { ...
    const menuMatch = line.match(/^menuentry\s+["'](.+?)["']/);
    if (menuMatch && !inEntry) {
      inEntry = true;
      depth = 0;
      currentEntry = { name: menuMatch[1], kernel: null, initrd: null, args: '' };
    }

    if (inEntry) {
      // Count braces
      for (const ch of line) {
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
      }

      // linux / linuxefi line
      const linuxMatch = line.match(/^(?:linux|linuxefi)\s+(\S+)(.*)?$/);
      if (linuxMatch && currentEntry) {
        currentEntry.kernel = linuxMatch[1];
        currentEntry.args = (linuxMatch[2] || '').trim();
      }

      // initrd line
      const initrdMatch = line.match(/^(?:initrd|initrdefi)\s+(\S+)/);
      if (initrdMatch && currentEntry) {
        currentEntry.initrd = initrdMatch[1];
      }

      if (depth <= 0 && inEntry) {
        inEntry = false;
        if (currentEntry) entries.push(currentEntry);
        currentEntry = null;
      }
    }
  }

  return { global, entries };
}

export function render(intake) {
  const text = intake.text || '';

  // Detect format: /etc/default/grub uses KEY=VALUE lines, grub.cfg uses set/menuentry
  const isDefaultFormat =
    /GRUB_DEFAULT=|GRUB_TIMEOUT=|GRUB_CMDLINE_LINUX/.test(text);

  const host = document.createElement('div');
  host.className = 'grubcfg-doc';

  if (isDefaultFormat) {
    const s = parseDefaultGrub(text);

    const defaultEntry = s['GRUB_DEFAULT'] ?? '—';
    const timeout = s['GRUB_TIMEOUT'] ?? '—';
    const timeoutStyle = s['GRUB_TIMEOUT_STYLE'] ?? '—';
    const gfxMode = s['GRUB_GFXMODE'] ?? '—';
    const cmdlineDefault = s['GRUB_CMDLINE_LINUX_DEFAULT'] ?? '';
    const cmdline = s['GRUB_CMDLINE_LINUX'] ?? '';
    const theme = s['GRUB_THEME'];

    const allArgs = [...new Set([...cmdlineDefault.split(/\s+/), ...cmdline.split(/\s+/)].filter(Boolean))];
    const chipsHtml = allArgs.length
      ? `<div class="grubcfg-chips">${allArgs.map((a) => `<span class="grubcfg-chip">${esc(a)}</span>`).join('')}</div>`
      : '';

    const themeHtml = theme
      ? `<div class="grubcfg-row"><span class="grubcfg-key">GRUB_THEME</span><span class="grubcfg-val">${esc(theme)}</span></div>`
      : '';

    host.innerHTML = `<style>${CSS}</style>
<div class="grubcfg-title"><span class="grubcfg-badge">GRUB</span>Bootloader Configuration</div>
<div class="grubcfg-sub">/etc/default/grub — key/value settings</div>
<div class="grubcfg-section">
  <h3>Boot settings</h3>
  <div class="grubcfg-card">
    <div class="grubcfg-row"><span class="grubcfg-key">Default entry</span><span class="grubcfg-val">${esc(defaultEntry)}</span></div>
    <div class="grubcfg-row"><span class="grubcfg-key">Timeout</span><span class="grubcfg-val">${esc(timeout)}s</span></div>
    <div class="grubcfg-row"><span class="grubcfg-key">Timeout style</span><span class="grubcfg-val">${esc(timeoutStyle)}</span></div>
    <div class="grubcfg-row"><span class="grubcfg-key">GFX mode</span><span class="grubcfg-val">${esc(gfxMode)}</span></div>
    ${themeHtml}
  </div>
</div>
${allArgs.length ? `<div class="grubcfg-section"><h3>Kernel cmdline parameters</h3><div class="grubcfg-card">${chipsHtml}</div></div>` : ''}`;
  } else {
    // grub.cfg script format
    const { global, entries } = parseGrubCfg(text);

    const entriesHtml = entries.map((e, i) => {
      const argCount = e.args ? e.args.split(/\s+/).filter(Boolean).length : 0;
      return `<div class="grubcfg-entry">
  <div class="grubcfg-entry-name">${i === Number(global.default) ? '<span style="color:#E67E22">&#9654;</span> ' : ''}${esc(e.name)}</div>
  ${e.kernel ? `<div class="grubcfg-entry-meta">kernel: ${esc(e.kernel)} &nbsp;·&nbsp; ${argCount} cmdline arg${argCount !== 1 ? 's' : ''}</div>` : ''}
  ${e.initrd ? `<div class="grubcfg-entry-meta">initrd: ${esc(e.initrd)}</div>` : ''}
</div>`;
    }).join('');

    const defaultLabel = global.default != null ? `entry ${global.default}` : '—';
    const timeoutLabel = global.timeout != null ? `${global.timeout}s` : '—';

    host.innerHTML = `<style>${CSS}</style>
<div class="grubcfg-title"><span class="grubcfg-badge">GRUB</span>Boot Configuration Script</div>
<div class="grubcfg-sub">grub.cfg — generated bootloader script · ${entries.length} menu entr${entries.length !== 1 ? 'ies' : 'y'}</div>
<div class="grubcfg-section">
  <h3>Global settings</h3>
  <div class="grubcfg-card">
    <div class="grubcfg-row"><span class="grubcfg-key">Default entry</span><span class="grubcfg-val">${esc(defaultLabel)}</span></div>
    <div class="grubcfg-row"><span class="grubcfg-key">Timeout</span><span class="grubcfg-val">${esc(timeoutLabel)}</span></div>
  </div>
</div>
${entries.length ? `<div class="grubcfg-section"><h3>Boot entries</h3>${entriesHtml}</div>` : ''}`;
  }

  return { parentNode: host };
}
