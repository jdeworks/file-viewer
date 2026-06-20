const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sdbcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sdbcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a1a2e;color:#e0e0ff;vertical-align:middle;margin-right:8px;}
.sdbcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sdbcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.sdbcfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:12px 16px;margin-bottom:12px;}
.sdbcfg-card-hd{font-family:ui-monospace,monospace;font-size:13px;font-weight:700;color:var(--fg,#24292f);margin:0 0 8px;padding-bottom:6px;border-bottom:1px solid var(--border,#e0e0e0);}
.sdbcfg-table{width:100%;border-collapse:collapse;font-size:13px;}
.sdbcfg-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:middle;}
.sdbcfg-table tr:last-child td{border-bottom:none;}
.sdbcfg-table td:first-child{color:var(--fg-2,#666);width:32%;white-space:nowrap;font-family:ui-monospace,monospace;font-size:12px;}
.sdbcfg-val{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg,#24292f);word-break:break-word;}
.sdbcfg-chip{display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;margin-right:4px;}
.sdbcfg-chip-green{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}
.sdbcfg-chip-blue{background:#d1ecf1;color:#0c5460;border:1px solid #bee5eb;}
.sdbcfg-chip-orange{background:#fff3cd;color:#856404;border:1px solid #ffc107;}
.sdbcfg-chip-gray{background:#e2e3e5;color:#383d41;border:1px solid #d6d8db;}
.sdbcfg-chip-neutral{background:#f0f0f0;color:#333;border:1px solid #ccc;}
.sdbcfg-cmdline{font-family:ui-monospace,monospace;font-size:11px;background:var(--bg-3,#eef);padding:4px 8px;border-radius:4px;word-break:break-all;display:block;margin-top:2px;}
.sdbcfg-initrd-list{list-style:none;margin:0;padding:0;}
.sdbcfg-initrd-list li{font-family:ui-monospace,monospace;font-size:12px;padding:1px 0;}
.sdbcfg-initrd-list li::before{content:"▸ ";color:var(--fg-2,#888);}
.sdbcfg-empty{color:var(--fg-2,#888);font-size:12px;font-style:italic;}
`;

function parseSpaceSep(text) {
  // systemd-boot format: key<whitespace>value (no = sign)
  const result = new Map();
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    // key followed by one or more spaces/tabs, then value
    const m = line.match(/^(\S+)\s+(.+)$/);
    if (m) {
      const key = m[1].toLowerCase();
      const val = m[2].trim();
      if (!result.has(key)) result.set(key, []);
      result.get(key).push(val);
    }
  }
  return result;
}

function chip(label, cls) {
  return `<span class="sdbcfg-chip sdbcfg-chip-${cls}">${esc(label)}</span>`;
}

function row(label, content) {
  return `<tr><td>${esc(label)}</td><td>${content}</td></tr>`;
}

function shortenUuid(s) {
  // UUID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx → UUID=xxxxxxxx…
  return s.replace(/UUID=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, (m) => {
    const uuid = m.slice(5);
    return `UUID=${uuid.slice(0, 8)}…`;
  });
}

function renderCmdlineChips(options) {
  const chips = [];
  if (/\brw\b/.test(options)) chips.push(chip('rw', 'blue'));
  else if (/\bro\b/.test(options)) chips.push(chip('ro', 'gray'));
  if (/\bquiet\b/.test(options)) chips.push(chip('quiet', 'green'));
  if (/\bsplash\b/.test(options)) chips.push(chip('splash', 'neutral'));
  const lvMatch = options.match(/\bloglevel=(\d+)\b/);
  if (lvMatch) chips.push(chip(`loglevel=${lvMatch[1]}`, 'neutral'));
  const resumeMatch = options.match(/\bresume=\S+/);
  if (resumeMatch) chips.push(chip(shortenUuid(resumeMatch[0]), 'neutral'));
  return chips.join('');
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const kv = parseSpaceSep(text);

  const get = (k) => (kv.get(k) || [])[0] || null;
  const getAll = (k) => kv.get(k) || [];

  // Detect type
  const hasLoaderKeys = kv.has('default') || kv.has('timeout') || kv.has('console-mode');
  const hasEntryKeys = kv.has('linux') || kv.has('efi');
  const isBootEntry = hasEntryKeys && !hasLoaderKeys;

  let titleText, subText;
  const cards = [];

  if (!isBootEntry) {
    // loader.conf view
    titleText = 'Boot Loader Config';
    const defVal = get('default');
    const timeoutVal = get('timeout');
    const consoleMode = get('console-mode');
    const editor = get('editor');
    const autoEntries = get('auto-entries');
    const autoFirmware = get('auto-firmware');

    const subParts = [];
    if (defVal) subParts.push(`default: ${defVal}`);
    if (timeoutVal != null) subParts.push(`timeout: ${timeoutVal}s`);
    subText = subParts.join(' · ') || 'systemd-boot loader configuration';

    const rows = [];
    if (defVal != null) rows.push(row('default', chip(defVal, 'neutral')));
    if (timeoutVal != null) {
      const t = parseInt(timeoutVal, 10);
      rows.push(row('timeout', chip(
        t === 0 ? '0 — menu hidden' : `${timeoutVal}s`,
        t === 0 ? 'orange' : 'blue'
      )));
    }
    if (consoleMode != null) {
      const modeChip = consoleMode === 'max' ? chip('max', 'green')
        : consoleMode === 'auto' ? chip('auto', 'blue')
        : consoleMode === 'keep' ? chip('keep', 'gray')
        : chip(consoleMode, 'neutral');
      rows.push(row('console-mode', modeChip));
    }
    if (editor != null) {
      const isEnabled = editor === 'yes' || editor === '1' || editor === 'true';
      rows.push(row('editor', isEnabled
        ? chip('boot entry editor enabled', 'orange')
        : chip('editor disabled', 'green')));
    }
    if (autoEntries != null) rows.push(row('auto-entries', chip(autoEntries === '1' ? 'on' : autoEntries, autoEntries === '1' ? 'green' : 'gray')));
    if (autoFirmware != null) rows.push(row('auto-firmware', chip(autoFirmware === '1' ? 'on' : autoFirmware, autoFirmware === '1' ? 'green' : 'gray')));

    // extra keys
    for (const [k, vals] of kv) {
      if (['default', 'timeout', 'console-mode', 'editor', 'auto-entries', 'auto-firmware'].includes(k)) continue;
      rows.push(row(k, `<span class="sdbcfg-val">${esc(vals[0])}</span>`));
    }

    cards.push(`<div class="sdbcfg-card">
<div class="sdbcfg-card-hd">Loader Settings</div>
${rows.length ? `<table class="sdbcfg-table"><tbody>${rows.join('')}</tbody></table>` : '<p class="sdbcfg-empty">No settings found.</p>'}
</div>`);

  } else {
    // Boot entry view
    const entryTitle = get('title') || 'Boot Entry';
    titleText = entryTitle;

    const linux = get('linux') || get('efi');
    const initrds = getAll('initrd');
    const options = get('options') || '';
    const machineId = get('machine-id');

    const subParts = [];
    if (linux) subParts.push(`kernel: ${linux}`);
    subText = subParts.join(' · ') || 'systemd-boot boot entry';

    const rows = [];
    if (get('title')) rows.push(row('title', `<span class="sdbcfg-val">${esc(get('title'))}</span>`));
    if (linux) rows.push(row('linux', `<span class="sdbcfg-val">${esc(linux)}</span>`));

    if (initrds.length) {
      const listItems = initrds.map((v) => `<li>${esc(v)}</li>`).join('');
      rows.push(row('initrd', `<ul class="sdbcfg-initrd-list">${listItems}</ul>`));
    }

    if (options) {
      const chipsHtml = renderCmdlineChips(options);
      const shortened = shortenUuid(options);
      rows.push(row('options',
        `${chipsHtml ? `<div style="margin-bottom:4px">${chipsHtml}</div>` : ''}<code class="sdbcfg-cmdline">${esc(shortened)}</code>`));
    }

    if (machineId) rows.push(row('machine-id', `<span class="sdbcfg-val">${esc(machineId)}</span>`));

    // extra keys
    const known = new Set(['title', 'linux', 'efi', 'initrd', 'options', 'machine-id']);
    for (const [k, vals] of kv) {
      if (known.has(k)) continue;
      rows.push(row(k, `<span class="sdbcfg-val">${esc(vals[0])}</span>`));
    }

    cards.push(`<div class="sdbcfg-card">
<div class="sdbcfg-card-hd">Boot Entry</div>
${rows.length ? `<table class="sdbcfg-table"><tbody>${rows.join('')}</tbody></table>` : '<p class="sdbcfg-empty">No fields found.</p>'}
</div>`);
  }

  const host = document.createElement('div');
  host.className = 'sdbcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="sdbcfg-title"><span class="sdbcfg-badge">systemd-boot</span>${esc(titleText)}</div>
<div class="sdbcfg-sub">${esc(subText)}</div>
${cards.join('')}`;

  return { parentNode: host };
}
