const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sysctlcfg-doc{padding:16px 18px;max-width:960px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sysctlcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#374151;color:#fff;vertical-align:middle;margin-right:8px;}
.sysctlcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sysctlcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.sysctlcfg-ns-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;margin-bottom:10px;overflow:hidden;}
.sysctlcfg-ns-header{display:flex;align-items:center;gap:8px;padding:8px 14px;background:var(--bg-3,#eaeef2);cursor:pointer;user-select:none;border:none;width:100%;text-align:left;font:inherit;color:inherit;}
.sysctlcfg-ns-header:hover{background:var(--border,#e0e0e0);}
.sysctlcfg-ns-label{font-size:13px;font-weight:700;font-family:ui-monospace,monospace;}
.sysctlcfg-ns-count{font-size:11px;color:var(--fg-2,#888);}
.sysctlcfg-ns-body{padding:0 14px 8px;}
.sysctlcfg-table{width:100%;border-collapse:collapse;font-size:12px;}
.sysctlcfg-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:6px 10px 4px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.sysctlcfg-table td{padding:5px 10px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:middle;font-family:ui-monospace,monospace;}
.sysctlcfg-key{color:var(--fg,#24292f);font-weight:600;}
.sysctlcfg-val{color:#0969da;}
.sysctlcfg-note{display:inline-block;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:600;background:#e8f4fd;color:#0969da;border:1px solid #b6d9f7;font-family:system-ui,sans-serif;white-space:nowrap;}
.sysctlcfg-ns-toggle{margin-left:auto;font-size:11px;color:var(--fg-2,#888);}
`;

const NS_LABELS = {
  net: 'net (networking)',
  vm: 'vm (virtual memory)',
  kernel: 'kernel',
  fs: 'fs (filesystem)',
  dev: 'dev (devices)',
  other: 'other',
};

const ANNOTATIONS = {
  'net.ipv4.ip_forward': (v) => v === '1' ? 'IP forwarding enabled (routing/NAT)' : 'IP forwarding disabled',
  'net.ipv4.conf.all.rp_filter': () => 'Reverse path filtering',
  'net.ipv4.conf.default.rp_filter': () => 'Reverse path filtering',
  'vm.swappiness': (v) => `Swap aggressiveness (0=avoid, 100=aggressive) — currently ${v}`,
  'kernel.sysrq': (v) => v === '0' ? 'Magic SysRq key disabled' : `Magic SysRq key (bitmask ${v})`,
  'net.core.somaxconn': () => 'Max TCP connection backlog',
  'fs.file-max': () => 'Max open file descriptors',
  'net.ipv4.conf.all.accept_redirects': (v) => v === '0' ? 'ICMP redirects ignored' : 'ICMP redirects accepted',
  'net.ipv4.conf.all.send_redirects': (v) => v === '0' ? 'ICMP redirect sending disabled' : 'ICMP redirect sending enabled',
  'net.ipv4.icmp_echo_ignore_broadcasts': (v) => v === '1' ? 'Broadcast ping ignored' : 'Broadcast ping allowed',
  'kernel.randomize_va_space': (v) => v === '2' ? 'ASLR full randomization' : v === '1' ? 'ASLR partial' : 'ASLR disabled',
  'kernel.panic': (v) => `Auto-reboot after kernel panic in ${v}s`,
  'vm.overcommit_memory': (v) => v === '0' ? 'Heuristic overcommit' : v === '1' ? 'Always overcommit' : 'Strict overcommit',
};

function parseSysctl(text) {
  const groups = { net: [], vm: [], kernel: [], fs: [], dev: [], other: [] };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!key) continue;
    const ns = key.split('.')[0];
    const group = groups[ns] ?? groups.other;
    (groups[ns] ? groups[ns] : groups.other).push({ key, value });
  }
  return groups;
}

export function render(intake) {
  const groups = parseSysctl(intake.text || '');
  const totalParams = Object.values(groups).reduce((s, g) => s + g.length, 0);
  const nsWithParams = Object.entries(groups).filter(([, g]) => g.length > 0);
  const nsCount = nsWithParams.length;

  const nsSections = nsWithParams.map(([ns, params]) => {
    const rows = params.map(({ key, value }) => {
      const shortKey = ns !== 'other' ? key.slice(ns.length + 1) : key;
      const annotation = ANNOTATIONS[key] ? ANNOTATIONS[key](value) : null;
      const noteHtml = annotation ? `<span class="sysctlcfg-note">${esc(annotation)}</span>` : '';
      return `<tr>
  <td><span class="sysctlcfg-key">${esc(shortKey)}</span></td>
  <td><span class="sysctlcfg-val">${esc(value)}</span></td>
  <td>${noteHtml}</td>
</tr>`;
    }).join('');

    const sectionId = `sysctlcfg-ns-${ns}`;
    return `<div class="sysctlcfg-ns-card">
  <button class="sysctlcfg-ns-header" onclick="(function(btn){const b=btn.closest('.sysctlcfg-ns-card').querySelector('.sysctlcfg-ns-body');b.hidden=!b.hidden;btn.querySelector('.sysctlcfg-ns-toggle').textContent=b.hidden?'▶ show':'▼ hide';})(this)">
    <span class="sysctlcfg-ns-label">${esc(NS_LABELS[ns] || ns)}</span>
    <span class="sysctlcfg-ns-count">${params.length} parameter${params.length !== 1 ? 's' : ''}</span>
    <span class="sysctlcfg-ns-toggle">▼ hide</span>
  </button>
  <div class="sysctlcfg-ns-body">
    <table class="sysctlcfg-table">
      <thead><tr><th>Key</th><th>Value</th><th>Note</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</div>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'sysctlcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="sysctlcfg-title"><span class="sysctlcfg-badge">sysctl</span>sysctl.conf</div>
<div class="sysctlcfg-sub">${totalParams} parameter${totalParams !== 1 ? 's' : ''} across ${nsCount} namespace${nsCount !== 1 ? 's' : ''}</div>
${nsSections}`;
  return { parentNode: host };
}
