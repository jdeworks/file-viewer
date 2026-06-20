const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fstab-doc{padding:16px 18px;max-width:960px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.fstab-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#333333;color:#fff;vertical-align:middle;margin-right:8px;}
.fstab-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.fstab-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.fstab-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;}
.fstab-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:6px 10px 6px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.fstab-table td{padding:6px 10px 6px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:middle;font-family:ui-monospace,monospace;font-size:12px;}
.fstab-dev{font-weight:600;color:var(--fg,#24292f);}
.fstab-mp{color:var(--fg,#24292f);}
.fstab-type{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;color:#fff;}
.fstab-type-ext{background:#0969da;}
.fstab-type-xfs{background:#1a7f37;}
.fstab-type-btrfs{background:#0d7377;}
.fstab-type-fat{background:#8250df;}
.fstab-type-tmpfs{background:#6e7781;}
.fstab-type-nfs{background:#e36209;}
.fstab-type-swap{background:#cf222e;}
.fstab-type-other{background:#6e7781;}
.fstab-opts{display:flex;flex-wrap:wrap;gap:3px;}
.fstab-opt{display:inline-block;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:1px 5px;font-size:11px;}
.fstab-pass{color:var(--fg-2,#888);}
.fstab-comment-row td{color:var(--fg-2,#888);font-style:italic;font-family:ui-monospace,monospace;font-size:12px;padding:3px 0;border-bottom:none;}
`;

function fsTypeClass(fstype) {
  const t = fstype.toLowerCase();
  if (t === 'ext4' || t === 'ext3' || t === 'ext2') return 'fstab-type-ext';
  if (t === 'xfs') return 'fstab-type-xfs';
  if (t === 'btrfs') return 'fstab-type-btrfs';
  if (t === 'vfat' || t === 'fat32' || t === 'ntfs' || t === 'ntfs-3g' || t === 'exfat') return 'fstab-type-fat';
  if (t === 'tmpfs' || t === 'sysfs' || t === 'proc' || t === 'devtmpfs') return 'fstab-type-tmpfs';
  if (t.startsWith('nfs')) return 'fstab-type-nfs';
  if (t === 'swap') return 'fstab-type-swap';
  return 'fstab-type-other';
}

function parseFstab(text) {
  const rows = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      rows.push({ comment: line });
      continue;
    }
    const parts = line.split(/\s+/);
    if (parts.length < 5) continue;
    rows.push({
      device: parts[0],
      mountpoint: parts[1] || '',
      fstype: parts[2] || '',
      options: parts[3] || 'defaults',
      dump: parts[4] || '0',
      pass: parts[5] || '0',
    });
  }
  return rows;
}

export function render(intake) {
  const rows = parseFstab(intake.text || '');
  const entries = rows.filter(r => !r.comment);

  const tableRows = rows.map(r => {
    if (r.comment) {
      return `<tr class="fstab-comment-row"><td colspan="5">${esc(r.comment)}</td></tr>`;
    }
    const cls = fsTypeClass(r.fstype);
    const opts = r.options.split(',');
    const optChips = opts.map(o => `<span class="fstab-opt">${esc(o.trim())}</span>`).join('');
    const passNote = r.pass === '0' ? 'skip' : r.pass === '1' ? 'root (1)' : `check (${esc(r.pass)})`;
    return `<tr>
  <td><span class="fstab-dev">${esc(r.device)}</span></td>
  <td><span class="fstab-mp">${esc(r.mountpoint)}</span></td>
  <td><span class="fstab-type ${cls}">${esc(r.fstype)}</span></td>
  <td><div class="fstab-opts">${optChips}</div></td>
  <td><span class="fstab-pass">${esc(passNote)}</span></td>
</tr>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'fstab-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="fstab-title"><span class="fstab-badge">fstab</span>fstab</div>
<div class="fstab-sub">Linux filesystem table · ${entries.length} mount entr${entries.length !== 1 ? 'ies' : 'y'}</div>
<table class="fstab-table">
  <thead><tr>
    <th>Device</th>
    <th>Mount Point</th>
    <th>Type</th>
    <th>Options</th>
    <th>Pass</th>
  </tr></thead>
  <tbody>${tableRows}</tbody>
</table>`;
  return { parentNode: host };
}
