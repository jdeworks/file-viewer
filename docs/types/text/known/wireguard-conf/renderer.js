const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.wg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#88b04b;color:#fff;vertical-align:middle;margin-right:8px;}
.wg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.wg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.wg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:12px 16px;margin-bottom:10px;}
.wg-card-hd{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.wg-section-name{font-family:ui-monospace,monospace;font-size:14px;font-weight:700;}
.wg-tag{display:inline-block;font-size:10px;padding:1px 6px;border-radius:8px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;}
.wg-tag-interface{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}
.wg-tag-peer{background:#cce5ff;color:#004085;border:1px solid #b8daff;}
.wg-table{width:100%;border-collapse:collapse;font-size:12px;}
.wg-table td{padding:3px 8px 3px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;}
.wg-table td:first-child{color:var(--fg-2,#888);width:40%;white-space:nowrap;}
.wg-table tr:last-child td{border-bottom:none;}
.wg-redacted{color:#856404;background:#fff3cd;border:1px solid #ffc107;border-radius:3px;padding:0 4px;font-family:system-ui,sans-serif;font-size:11px;font-style:italic;}
.wg-pubkey{color:#0969da;}
.wg-endpoint{color:#6f42c1;}
`;

function parseWgConf(text) {
  const sections = [];
  let current = null;

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const sectionMatch = line.match(/^\[(\w+)\]$/);
    if (sectionMatch) {
      current = { type: sectionMatch[1], entries: [] };
      sections.push(current);
      continue;
    }

    const kvMatch = line.match(/^([^=]+?)\s*=\s*(.*)$/);
    if (kvMatch && current) {
      current.entries.push([kvMatch[1].trim(), kvMatch[2].trim()]);
    }
  }

  return sections;
}

// Keys to show for [Interface] (PrivateKey is always redacted, so excluded from this set)
const INTERFACE_SHOW = new Set(['address', 'dns', 'listenport', 'mtu', 'table', 'preup', 'postup', 'predown', 'postdown']);
// Keys to show for [Peer]
const PEER_SHOW = new Set(['publickey', 'endpoint', 'allowedips', 'persistentkeepalive', 'presharedkey']);

export function render(intake) {
  const sections = parseWgConf(intake.text || '');

  const interfaceSections = sections.filter((s) => s.type === 'Interface');
  const peerSections = sections.filter((s) => s.type === 'Peer');

  function renderInterfaceCard(sec) {
    const rows = [];
    for (const [k, v] of sec.entries) {
      const kLow = k.toLowerCase();
      if (kLow === 'privatekey') {
        rows.push(`<tr><td>${esc(k)}</td><td><span class="wg-redacted">[redacted - private key]</span></td></tr>`);
      } else if (INTERFACE_SHOW.has(kLow)) {
        rows.push(`<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`);
      }
    }
    return `<div class="wg-card">
  <div class="wg-card-hd">
    <span class="wg-section-name">[Interface]</span>
    <span class="wg-tag wg-tag-interface">interface</span>
  </div>
  ${rows.length ? `<table class="wg-table"><tbody>${rows.join('')}</tbody></table>` : '<p style="margin:0;font-size:12px;color:var(--fg-2,#888);">No recognized options.</p>'}
</div>`;
  }

  function renderPeerCard(sec, idx) {
    const rows = [];
    for (const [k, v] of sec.entries) {
      const kLow = k.toLowerCase();
      if (kLow === 'presharedkey') {
        rows.push(`<tr><td>${esc(k)}</td><td><span class="wg-redacted">[redacted - preshared key]</span></td></tr>`);
      } else if (kLow === 'publickey') {
        rows.push(`<tr><td>${esc(k)}</td><td><span class="wg-pubkey">${esc(v)}</span></td></tr>`);
      } else if (kLow === 'endpoint') {
        rows.push(`<tr><td>${esc(k)}</td><td><span class="wg-endpoint">${esc(v)}</span></td></tr>`);
      } else if (PEER_SHOW.has(kLow)) {
        rows.push(`<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`);
      }
    }
    // Extract endpoint for subtitle
    const endpointEntry = sec.entries.find(([k]) => k.toLowerCase() === 'endpoint');
    const subtitle = endpointEntry ? esc(endpointEntry[1]) : `Peer ${idx + 1}`;
    return `<div class="wg-card">
  <div class="wg-card-hd">
    <span class="wg-section-name">[Peer ${idx + 1}]</span>
    <span class="wg-tag wg-tag-peer">peer</span>
    <span style="font-size:12px;color:var(--fg-2,#888);font-family:ui-monospace,monospace;">${subtitle}</span>
  </div>
  ${rows.length ? `<table class="wg-table"><tbody>${rows.join('')}</tbody></table>` : '<p style="margin:0;font-size:12px;color:var(--fg-2,#888);">No recognized options.</p>'}
</div>`;
  }

  const peerCount = peerSections.length;
  const subLine = `${peerCount} peer${peerCount !== 1 ? 's' : ''}`;

  const host = document.createElement('div');
  host.className = 'wg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="wg-title"><span class="wg-badge">WireGuard VPN</span>WireGuard Configuration</div>
<div class="wg-sub">${subLine}</div>
${interfaceSections.map(renderInterfaceCard).join('')}
${peerSections.map((s, i) => renderPeerCard(s, i)).join('')}
${!sections.length ? '<p style="color:var(--fg-2,#888);font-size:13px;">No WireGuard sections found.</p>' : ''}`;

  return { parentNode: host };
}
