const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.hf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.hf-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#6e7781;color:#fff;vertical-align:middle;margin-right:8px;}
.hf-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.hf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.hf-stats{display:flex;gap:16px;flex-wrap:wrap;margin:0 0 16px;}
.hf-stat{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 14px;font-size:12px;}
.hf-stat-num{font-size:20px;font-weight:700;display:block;color:var(--fg,#24292f);}
.hf-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;}
.hf-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:4px 10px 4px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.hf-table td{padding:5px 10px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.hf-ip-loop{color:#0969da;font-weight:600;}
.hf-ip-loop6{color:#6639ba;font-weight:600;}
.hf-ip-other{color:var(--fg,#24292f);}
.hf-hosts{display:flex;flex-wrap:wrap;gap:3px;}
.hf-host-chip{display:inline-block;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:1px 6px;font-size:11px;}
.hf-section{margin:16px 0 6px;font-size:13px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;}
`;

function parseHosts(text) {
  const entries = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    // Strip inline comment
    const noComment = line.replace(/#.*$/, '').trim();
    if (!noComment) continue;
    const parts = noComment.split(/\s+/);
    if (parts.length < 2) continue;
    const ip = parts[0];
    const hostnames = parts.slice(1);
    entries.push({ ip, hostnames });
  }
  return entries;
}

export function render(intake) {
  const entries = parseHosts(intake.text || '');

  const loopback = entries.filter((e) => e.ip === '127.0.0.1' || e.ip === '::1' || e.ip.startsWith('127.'));
  const custom = entries.filter((e) => !loopback.includes(e));

  function ipClass(ip) {
    if (ip === '127.0.0.1' || ip.startsWith('127.')) return 'hf-ip-loop';
    if (ip === '::1') return 'hf-ip-loop6';
    return 'hf-ip-other';
  }

  function tableRows(list) {
    return list.map((e) => {
      const cls = ipClass(e.ip);
      const chips = e.hostnames.map((h) => `<span class="hf-host-chip">${esc(h)}</span>`).join('');
      return `<tr>
  <td><span class="${cls}">${esc(e.ip)}</span></td>
  <td><div class="hf-hosts">${chips}</div></td>
</tr>`;
    }).join('');
  }

  const loopbackSection = loopback.length ? `
<div class="hf-section">Loopback entries</div>
<table class="hf-table">
  <thead><tr><th>IP Address</th><th>Hostnames</th></tr></thead>
  <tbody>${tableRows(loopback)}</tbody>
</table>` : '';

  const customSection = custom.length ? `
<div class="hf-section">Custom host entries</div>
<table class="hf-table">
  <thead><tr><th>IP Address</th><th>Hostnames</th></tr></thead>
  <tbody>${tableRows(custom)}</tbody>
</table>` : '<p style="color:var(--fg-2,#888);font-size:13px;margin:16px 0;">No custom host entries found.</p>';

  const host = document.createElement('div');
  host.className = 'hf-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="hf-title"><span class="hf-badge">hosts</span>hosts</div>
<div class="hf-sub">System hosts file — static hostname-to-IP mapping</div>
<div class="hf-stats">
  <div class="hf-stat"><span class="hf-stat-num">${entries.length}</span>total entries</div>
  <div class="hf-stat"><span class="hf-stat-num">${loopback.length}</span>loopback entries</div>
  <div class="hf-stat"><span class="hf-stat-num">${custom.length}</span>custom entries</div>
</div>
${loopbackSection}
${customSection}`;
  return { parentNode: host };
}
