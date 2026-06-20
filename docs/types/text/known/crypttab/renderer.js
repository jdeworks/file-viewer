const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.crytab-doc{padding:16px 18px;max-width:960px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.crytab-header{display:flex;align-items:baseline;gap:10px;margin-bottom:4px;}
.crytab-badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#5c0a0a;color:#fff;vertical-align:middle;}
.crytab-title{font-size:18px;font-weight:700;margin:0;}
.crytab-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 10px;}
.crytab-warn{display:flex;align-items:flex-start;gap:8px;margin-bottom:14px;padding:8px 12px;background:#fff8e1;border:1px solid #ffc107;border-radius:6px;font-size:12px;color:#664d03;}
.crytab-table{width:100%;border-collapse:collapse;font-size:13px;}
.crytab-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:6px 10px 6px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.crytab-table td{padding:6px 10px 6px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:middle;font-family:ui-monospace,monospace;font-size:12px;}
.crytab-name{font-weight:600;color:var(--fg,#24292f);}
.crytab-dev{color:var(--fg,#24292f);}
.crytab-key-prompt{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:#dbeafe;border:1px solid #93c5fd;color:#1e3a8a;}
.crytab-key-rand{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:#fce7f3;border:1px solid #f9a8d4;color:#831843;}
.crytab-key-path{display:inline-block;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:600;background:#d1fae5;border:1px solid #6ee7b7;color:#064e3b;}
.crytab-opts{display:flex;flex-wrap:wrap;gap:3px;}
.crytab-opt{display:inline-block;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:1px 5px;font-size:11px;color:var(--fg,#24292f);}
.crytab-opt-luks{background:#dbeafe;border-color:#93c5fd;color:#1e3a8a;}
.crytab-opt-discard{background:#f3e8ff;border-color:#c4b5fd;color:#4c1d95;}
.crytab-opt-header{background:#d1fae5;border-color:#6ee7b7;color:#064e3b;}
.crytab-opt-tries{background:#fff7ed;border-color:#fdba74;color:#7c2d12;}
.crytab-opt-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.crytab-opt-yellow{background:#fef9c3;border-color:#fde047;color:#713f12;}
.crytab-comment-row td{color:var(--fg-2,#888);font-style:italic;font-family:ui-monospace,monospace;font-size:12px;padding:3px 0;border-bottom:none;}
`;

function shortenDevice(dev) {
  const m = dev.match(/^(UUID=)([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  if (m) return `UUID=${m[2]}…`;
  return dev;
}

function keyHtml(keyfile) {
  if (!keyfile || keyfile === 'none' || keyfile === '-') {
    return `<span class="crytab-key-prompt">prompt</span>`;
  }
  if (keyfile === '/dev/urandom' || keyfile === '/dev/random') {
    return `<span class="crytab-key-rand">ephemeral</span>`;
  }
  return `<span class="crytab-key-path">${esc(keyfile)}</span>`;
}

function optChipsHtml(optStr) {
  if (!optStr) return '';
  const opts = optStr.split(',').map(o => o.trim()).filter(Boolean);
  return opts.map(o => {
    const key = o.split('=')[0].toLowerCase();
    if (key === 'luks') return `<span class="crytab-opt crytab-opt-luks">${esc(o)}</span>`;
    if (key === 'discard') return `<span class="crytab-opt crytab-opt-discard">${esc(o)}</span>`;
    if (key === 'header') return `<span class="crytab-opt crytab-opt-header">${esc(o)}</span>`;
    if (key === 'tries') return `<span class="crytab-opt crytab-opt-tries">${esc(o)}</span>`;
    if (key === 'timeout') return `<span class="crytab-opt crytab-opt-tries">${esc(o)}</span>`;
    if (key === 'noearly' || key === 'noauto') return `<span class="crytab-opt crytab-opt-gray">${esc(o)}</span>`;
    if (key === 'keyscript') return `<span class="crytab-opt crytab-opt-yellow">${esc(o)}</span>`;
    return `<span class="crytab-opt">${esc(o)}</span>`;
  }).join('');
}

function parseCrypttab(text) {
  const rows = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      rows.push({ comment: line });
      continue;
    }
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    rows.push({
      name: parts[0],
      device: parts[1] || '',
      keyfile: parts[2] || 'none',
      options: parts[3] || '',
    });
  }
  return rows;
}

export function render(intake) {
  const rows = parseCrypttab(intake.text || '');
  const entries = rows.filter(r => !r.comment);
  const hasDiscard = entries.some(r => r.options.split(',').map(o => o.trim().toLowerCase()).includes('discard'));

  const tableRows = rows.map(r => {
    if (r.comment) {
      return `<tr class="crytab-comment-row"><td colspan="4">${esc(r.comment)}</td></tr>`;
    }
    return `<tr>
  <td><span class="crytab-name">${esc(r.name)}</span></td>
  <td><span class="crytab-dev">${esc(shortenDevice(r.device))}</span></td>
  <td>${keyHtml(r.keyfile)}</td>
  <td><div class="crytab-opts">${optChipsHtml(r.options)}</div></td>
</tr>`;
  }).join('');

  const warnHtml = hasDiscard
    ? `<div class="crytab-warn"><span>&#9888;</span><span><b>discard (TRIM) is enabled</b> — may reveal usage metadata to physical attackers by leaking which sectors are unused.</span></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'crytab-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="crytab-header"><span class="crytab-badge">crypttab</span><span class="crytab-title">Encrypted Devices</span></div>
<div class="crytab-sub">Linux /etc/crypttab · ${entries.length} encrypted device${entries.length !== 1 ? 's' : ''}</div>
${warnHtml}<table class="crytab-table">
  <thead><tr>
    <th>Name</th>
    <th>Device</th>
    <th>Key</th>
    <th>Options</th>
  </tr></thead>
  <tbody>${tableRows}</tbody>
</table>`;
  return { parentNode: host };
}
