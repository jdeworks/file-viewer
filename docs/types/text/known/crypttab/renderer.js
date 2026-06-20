const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.crytab-doc{padding:16px 18px;max-width:960px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.crytab-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#333333;color:#fff;vertical-align:middle;margin-right:8px;}
.crytab-lock{display:inline-block;margin-right:4px;vertical-align:middle;}
.crytab-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.crytab-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.crytab-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;}
.crytab-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:6px 10px 6px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.crytab-table td{padding:6px 10px 6px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:middle;font-family:ui-monospace,monospace;font-size:12px;}
.crytab-name{font-weight:600;color:var(--fg,#24292f);}
.crytab-dev{color:var(--fg,#24292f);}
.crytab-key-interactive{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:#fff3cd;border:1px solid #ffc107;color:#664d03;}
.crytab-key-path{display:inline-block;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:600;background:#d1e7dd;border:1px solid #a3cfbb;color:#0a3622;}
.crytab-opts{display:flex;flex-wrap:wrap;gap:3px;margin-top:2px;}
.crytab-opt{display:inline-block;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:1px 5px;font-size:11px;}
.crytab-opt-luks{background:#fff0f0;border-color:#f5a9a9;color:#b91c1c;}
.crytab-comment-row td{color:var(--fg-2,#888);font-style:italic;font-family:ui-monospace,monospace;font-size:12px;padding:3px 0;border-bottom:none;}
`;

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

function keySourceHtml(keyfile) {
  if (!keyfile || keyfile === 'none') {
    return `<span class="crytab-key-interactive">⌨ interactive (passphrase)</span>`;
  }
  return `<span class="crytab-key-path">${esc(keyfile)}</span>`;
}

function optChipsHtml(optStr) {
  if (!optStr) return '';
  const opts = optStr.split(',').map(o => o.trim()).filter(Boolean);
  return opts.map(o => {
    const isLuks = o.toLowerCase() === 'luks';
    return `<span class="crytab-opt${isLuks ? ' crytab-opt-luks' : ''}">${esc(o)}</span>`;
  }).join('');
}

export function render(intake) {
  const rows = parseCrypttab(intake.text || '');
  const entries = rows.filter(r => !r.comment);

  const tableRows = rows.map(r => {
    if (r.comment) {
      return `<tr class="crytab-comment-row"><td colspan="4">${esc(r.comment)}</td></tr>`;
    }
    const chips = optChipsHtml(r.options);
    return `<tr>
  <td><span class="crytab-name">${esc(r.name)}</span></td>
  <td><span class="crytab-dev">${esc(r.device)}</span></td>
  <td>${keySourceHtml(r.keyfile)}</td>
  <td><div class="crytab-opts">${chips}</div></td>
</tr>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'crytab-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="crytab-title"><span class="crytab-badge">🔒 crypttab</span>crypttab</div>
<div class="crytab-sub">Linux encrypted device table · ${entries.length} encrypted device${entries.length !== 1 ? 's' : ''}</div>
<table class="crytab-table">
  <thead><tr>
    <th>Name</th>
    <th>Encrypted Device</th>
    <th>Key Source</th>
    <th>Options</th>
  </tr></thead>
  <tbody>${tableRows}</tbody>
</table>`;
  return { parentNode: host };
}
