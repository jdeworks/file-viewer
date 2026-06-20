const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.zone-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.zone-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1565C0;color:#fff;vertical-align:middle;margin-right:8px;}
.zone-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.zone-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.zone-sec{margin:14px 0;}
.zone-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.zone-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.zone-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.zone-kv-k{color:var(--fg-2,#888);min-width:140px;flex-shrink:0;font-family:ui-monospace,monospace;}
.zone-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.zone-table{width:100%;border-collapse:collapse;font-size:12px;}
.zone-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.zone-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;}
.zone-table tr:last-child td{border-bottom:none;}
.zone-pills{display:flex;flex-wrap:wrap;gap:5px;}
.zone-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.zone-tag{display:inline-block;font-size:10px;padding:1px 5px;border-radius:4px;margin-left:5px;font-weight:600;vertical-align:middle;}
.zone-tag-spf{background:#e3f2fd;color:#1565C0;border:1px solid #90CAF9;}
.zone-tag-dkim{background:#f3e5f5;color:#6A1B9A;border:1px solid #CE93D8;}
.zone-tag-dmarc{background:#fff8e1;color:#F57F17;border:1px solid #FFE082;}
.zone-count-badge{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg-2,#888);margin-left:6px;}
`;

/**
 * Parse a DNS zone file into structured data.
 */
function parseZone(text) {
  const lines = text.split('\n');
  let origin = null;
  let ttl = null;
  let soaPrimaryNs = null;
  let soaEmail = null;
  let soaSerial = null;
  const nsRecords = [];
  const aRecords = [];
  const aaaaRecords = [];
  const mxRecords = [];
  const cnameRecords = [];
  const txtRecords = [];
  const srvRecords = [];

  // Join continuation lines (parentheses)
  const joined = text.replace(/\([^)]*\)/gs, (m) => m.replace(/\n/g, ' '));

  for (const raw of joined.split('\n')) {
    const line = raw.replace(/;.*$/, '').trim();
    if (!line) continue;

    // $ORIGIN
    const originM = /^\$ORIGIN\s+(\S+)/i.exec(line);
    if (originM) { origin = originM[1].replace(/\.$/, ''); continue; }

    // $TTL
    const ttlM = /^\$TTL\s+(\S+)/i.exec(line);
    if (ttlM) { ttl = ttlM[1]; continue; }

    // SOA record: @ IN SOA primary email ( serial ... )
    const soaM = /\bIN\s+SOA\s+(\S+)\s+(\S+)\s+(\d+)/i.exec(line);
    if (soaM) {
      soaPrimaryNs = soaM[1].replace(/\.$/, '');
      soaEmail = soaM[2].replace(/\.$/, '').replace(/^(\w+)\./, '$1@');
      soaSerial = soaM[3];
      continue;
    }

    // NS record
    const nsM = /\bIN\s+NS\s+(\S+)/i.exec(line);
    if (nsM && !/SOA/.test(line)) {
      nsRecords.push(nsM[1].replace(/\.$/, ''));
      continue;
    }

    // MX record
    const mxM = /\bIN\s+MX\s+(\d+)\s+(\S+)/i.exec(line);
    if (mxM) { mxRecords.push({ priority: mxM[1], host: mxM[2].replace(/\.$/, '') }); continue; }

    // A record
    const aM = /\bIN\s+A\s+([\d.]+)$/i.exec(line);
    if (aM) { aRecords.push({ name: line.split(/\s/)[0], ip: aM[1] }); continue; }

    // AAAA record
    const aaaaM = /\bIN\s+AAAA\s+([0-9a-f:]+)$/i.exec(line);
    if (aaaaM) { aaaaRecords.push({ name: line.split(/\s/)[0], ip: aaaaM[1] }); continue; }

    // CNAME record
    const cnameM = /\bIN\s+CNAME\s+(\S+)/i.exec(line);
    if (cnameM) {
      const parts = line.split(/\s+/);
      cnameRecords.push({ name: parts[0], target: cnameM[1].replace(/\.$/, '') });
      continue;
    }

    // TXT record
    const txtM = /\bIN\s+TXT\s+"([^"]*)"/i.exec(line);
    if (txtM) {
      const namepart = line.split(/\s+/)[0];
      txtRecords.push({ name: namepart, value: txtM[1] });
      continue;
    }

    // SRV record
    const srvM = /\bIN\s+SRV\s+/i.exec(line);
    if (srvM) { srvRecords.push(line); continue; }
  }

  return { origin, ttl, soaPrimaryNs, soaEmail, soaSerial, nsRecords, aRecords, aaaaRecords, mxRecords, cnameRecords, txtRecords, srvRecords };
}

function detectTxtType(name, value) {
  const v = value.toLowerCase();
  const n = (name || '').toLowerCase();
  if (v.startsWith('v=spf1')) return 'SPF';
  if (n.startsWith('_dmarc')) return 'DMARC';
  if (v.startsWith('v=dkim1') || n.includes('._domainkey')) return 'DKIM';
  return null;
}

function truncate(s, max) {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

export function render(intake) {
  const text = intake.text || '';
  const { origin, ttl, soaPrimaryNs, soaEmail, soaSerial, nsRecords, aRecords, aaaaRecords, mxRecords, cnameRecords, txtRecords, srvRecords } = parseZone(text);

  const host = document.createElement('div');
  host.className = 'zone-doc';

  const filename = (intake.name || intake.filename || '').split('/').pop();
  const zoneName = origin || filename.replace(/\.(zone|db)$/i, '') || 'unknown';

  // Summary
  const summaryParts = [];
  if (origin) summaryParts.push(`$ORIGIN ${origin}`);
  if (ttl) summaryParts.push(`$TTL ${ttl}`);
  summaryParts.push(`${aRecords.length + aaaaRecords.length} A/AAAA records`);
  if (mxRecords.length) summaryParts.push(`${mxRecords.length} MX`);
  if (txtRecords.length) summaryParts.push(`${txtRecords.length} TXT`);

  // SOA section
  let soaHtml = '';
  if (soaPrimaryNs || soaEmail || soaSerial) {
    const rows = [
      soaPrimaryNs ? ['primary NS', soaPrimaryNs] : null,
      soaEmail ? ['responsible', soaEmail] : null,
      soaSerial ? ['serial', soaSerial] : null,
    ].filter(Boolean);
    soaHtml = `<div class="zone-sec"><h3>SOA Record</h3><div class="zone-card">${
      rows.map(([k, v]) => `<div class="zone-kv"><span class="zone-kv-k">${esc(k)}</span><span class="zone-kv-v">${esc(v)}</span></div>`).join('')
    }</div></div>`;
  }

  // NS section
  let nsHtml = '';
  if (nsRecords.length) {
    nsHtml = `<div class="zone-sec"><h3>NS Records</h3><div class="zone-card"><div class="zone-pills">${
      nsRecords.map((ns) => `<span class="zone-pill">${esc(ns)}</span>`).join('')
    }</div></div></div>`;
  }

  // A/AAAA counts
  const aCount = aRecords.length;
  const aaaaCount = aaaaRecords.length;
  let aHtml = '';
  if (aCount + aaaaCount > 0) {
    aHtml = `<div class="zone-sec"><h3>A / AAAA Records</h3><div class="zone-card"><div class="zone-kv"><span class="zone-kv-k">A records</span><span class="zone-kv-v">${aCount}</span></div><div class="zone-kv"><span class="zone-kv-k">AAAA records</span><span class="zone-kv-v">${aaaaCount}</span></div></div></div>`;
  }

  // MX section
  let mxHtml = '';
  if (mxRecords.length) {
    mxHtml = `<div class="zone-sec"><h3>MX Records</h3><table class="zone-table"><thead><tr><th>Priority</th><th>Host</th></tr></thead><tbody>${
      mxRecords.map((r) => `<tr><td>${esc(r.priority)}</td><td>${esc(r.host)}</td></tr>`).join('')
    }</tbody></table></div>`;
  }

  // CNAME section
  let cnameHtml = '';
  if (cnameRecords.length) {
    cnameHtml = `<div class="zone-sec"><h3>CNAME Records</h3><table class="zone-table"><thead><tr><th>Name</th><th>Target</th></tr></thead><tbody>${
      cnameRecords.map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.target)}</td></tr>`).join('')
    }</tbody></table></div>`;
  }

  // TXT section
  let txtHtml = '';
  if (txtRecords.length) {
    const rows = txtRecords.map((r) => {
      const type = detectTxtType(r.name, r.value);
      const safeVal = truncate(r.value, 80);
      const tag = type ? `<span class="zone-tag zone-tag-${type.toLowerCase()}">${esc(type)}</span>` : '';
      return `<tr><td>${esc(r.name)}</td><td>${esc(safeVal)}${tag}</td></tr>`;
    }).join('');
    txtHtml = `<div class="zone-sec"><h3>TXT Records</h3><table class="zone-table"><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  // SRV count
  let srvHtml = '';
  if (srvRecords.length) {
    srvHtml = `<div class="zone-sec"><h3>SRV Records</h3><div class="zone-card"><div class="zone-kv"><span class="zone-kv-k">count</span><span class="zone-kv-v">${srvRecords.length}</span></div></div></div>`;
  }

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="zone-badge">DNS Zone</span>
  <span class="zone-title">${esc(zoneName)}</span>
</div>
<div class="zone-sub">${esc(summaryParts.join(' · '))}</div>
${soaHtml}${nsHtml}${aHtml}${mxHtml}${cnameHtml}${txtHtml}${srvHtml}`;

  return { parentNode: host };
}
