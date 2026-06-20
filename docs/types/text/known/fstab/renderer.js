const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fstab-doc{padding:16px 18px;max-width:1020px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.fstab-header{display:flex;align-items:baseline;gap:10px;margin-bottom:4px;}
.fstab-badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#2d3436;color:#fff;vertical-align:middle;}
.fstab-title{font-size:18px;font-weight:700;margin:0;}
.fstab-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.fstab-stats{display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap;}
.fstab-stat{font-size:12px;color:var(--fg-2,#888);}
.fstab-stat b{color:var(--fg,#24292f);}
.fstab-table{width:100%;border-collapse:collapse;font-size:13px;}
.fstab-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:6px 10px 6px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.fstab-table td{padding:6px 10px 6px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:middle;font-family:ui-monospace,monospace;font-size:12px;}
.fstab-dev{font-weight:600;color:var(--fg,#24292f);}
.fstab-mp{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;color:#fff;}
.fstab-mp-root{background:#cf222e;}
.fstab-mp-boot{background:#e36209;}
.fstab-mp-home{background:#0969da;}
.fstab-mp-swap{background:#8250df;}
.fstab-mp-tmp{background:#9a6700;}
.fstab-mp-mnt{background:#1a7f37;}
.fstab-mp-other{background:#6e7781;}
.fstab-type{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;color:#fff;}
.fstab-type-ext4{background:#0969da;}
.fstab-type-xfs{background:#e36209;}
.fstab-type-btrfs{background:#1a7f37;}
.fstab-type-vfat{background:#9a6700;}
.fstab-type-ntfs{background:#6e7781;}
.fstab-type-tmpfs{background:#0284c7;}
.fstab-type-swap{background:#8250df;}
.fstab-type-nfs{background:#0f766e;}
.fstab-type-overlay{background:#4338ca;}
.fstab-type-other{background:#6e7781;}
.fstab-opts{display:flex;flex-wrap:wrap;gap:3px;}
.fstab-opt{display:inline-block;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:1px 5px;font-size:11px;color:var(--fg,#24292f);}
.fstab-pass{color:var(--fg-2,#888);font-size:11px;}
.fstab-comment-row td{color:var(--fg-2,#888);font-style:italic;font-family:ui-monospace,monospace;font-size:12px;padding:3px 0;border-bottom:none;}
`;

const NOTABLE_OPTS = ['noatime', 'defaults', 'ro', 'nosuid', 'nodev', 'nofail', 'x-systemd.automount'];

function shortenDevice(dev) {
  // Shorten full UUIDs (8-4-4-4-12): show UUID= + first 8 chars + ...
  const m = dev.match(/^(UUID=)([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  if (m) return `UUID=${m[2]}…`;
  // Short UUIDs (FAT/VFAT style 4 or 8 hex chars like ABCD-1234) — show as-is
  return dev;
}

function mountPointClass(mp) {
  if (!mp || mp === 'none') return 'fstab-mp-swap';
  if (mp === '/') return 'fstab-mp-root';
  if (mp === '/boot' || mp === '/boot/efi' || mp === '/efi') return 'fstab-mp-boot';
  if (mp === '/home') return 'fstab-mp-home';
  if (mp === '/tmp') return 'fstab-mp-tmp';
  if (mp.startsWith('/mnt/')) return 'fstab-mp-mnt';
  return 'fstab-mp-other';
}

function mountPointLabel(mp, fstype) {
  if (!mp || mp === 'none') return fstype === 'swap' ? 'swap' : mp || 'none';
  return mp;
}

function fsTypeClass(fstype) {
  const t = (fstype || '').toLowerCase();
  if (t === 'ext4' || t === 'ext3' || t === 'ext2') return 'fstab-type-ext4';
  if (t === 'xfs') return 'fstab-type-xfs';
  if (t === 'btrfs') return 'fstab-type-btrfs';
  if (t === 'vfat' || t === 'fat32' || t === 'fat16' || t === 'exfat') return 'fstab-type-vfat';
  if (t === 'ntfs' || t === 'ntfs-3g') return 'fstab-type-ntfs';
  if (t === 'tmpfs' || t === 'sysfs' || t === 'proc' || t === 'devtmpfs') return 'fstab-type-tmpfs';
  if (t === 'swap') return 'fstab-type-swap';
  if (t.startsWith('nfs') || t === 'cifs') return 'fstab-type-nfs';
  if (t === 'overlay') return 'fstab-type-overlay';
  return 'fstab-type-other';
}

function optChips(optStr) {
  if (!optStr || optStr === 'defaults') {
    return `<span class="fstab-opt">defaults</span>`;
  }
  const opts = optStr.split(',').map(o => o.trim()).filter(Boolean);
  return opts.map(o => {
    // Show notable options and compress= / subvol= / x-systemd.* prefixes
    const key = o.split('=')[0];
    if (NOTABLE_OPTS.includes(key) || o.startsWith('compress=') || o.startsWith('subvol=') || o.startsWith('x-systemd.')) {
      return `<span class="fstab-opt">${esc(o)}</span>`;
    }
    return `<span class="fstab-opt">${esc(o)}</span>`;
  }).join('');
}

function passLabel(pass) {
  if (pass === '0') return 'skip';
  if (pass === '1') return 'root (1st)';
  return `other (${esc(pass)})`;
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
    if (parts.length < 4) continue;
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
  const swapCount = entries.filter(r => r.fstype === 'swap').length;
  const netCount = entries.filter(r => r.fstype.startsWith('nfs') || r.fstype === 'cifs').length;

  const tableRows = rows.map(r => {
    if (r.comment) {
      return `<tr class="fstab-comment-row"><td colspan="5">${esc(r.comment)}</td></tr>`;
    }
    const mpClass = mountPointClass(r.mountpoint);
    const mpLabel = mountPointLabel(r.mountpoint, r.fstype);
    const typeClass = fsTypeClass(r.fstype);
    const passNote = passLabel(r.pass);
    return `<tr>
  <td><span class="fstab-dev">${esc(shortenDevice(r.device))}</span></td>
  <td><span class="fstab-mp ${mpClass}">${esc(mpLabel)}</span></td>
  <td><span class="fstab-type ${typeClass}">${esc(r.fstype)}</span></td>
  <td><div class="fstab-opts">${optChips(r.options)}</div></td>
  <td><span class="fstab-pass">${esc(passNote)}</span></td>
</tr>`;
  }).join('');

  const statsHtml = [
    `<span class="fstab-stat"><b>${entries.length}</b> entr${entries.length !== 1 ? 'ies' : 'y'}</span>`,
    swapCount ? `<span class="fstab-stat"><b>${swapCount}</b> swap</span>` : '',
    netCount ? `<span class="fstab-stat"><b>${netCount}</b> network</span>` : '',
  ].filter(Boolean).join('');

  const host = document.createElement('div');
  host.className = 'fstab-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="fstab-header"><span class="fstab-badge">fstab</span><span class="fstab-title">Filesystem Table</span></div>
<div class="fstab-sub">Linux /etc/fstab — filesystem mount configuration</div>
<div class="fstab-stats">${statsHtml}</div>
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
