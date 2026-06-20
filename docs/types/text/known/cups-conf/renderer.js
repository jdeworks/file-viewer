const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cups-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.cups-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0277bd;color:#fff;vertical-align:middle;margin-right:8px;}
.cups-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cups-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.cups-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.cups-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.cups-card strong{display:block;font-size:1.2rem;font-weight:700;}
.cups-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.cups-section{margin:16px 0;}
.cups-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.cups-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.cups-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.cups-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-size:13px;}
.cups-table tr:last-child td{border-bottom:none;}
.cups-mono{font-family:ui-monospace,monospace;font-size:12px;}
.cups-listen-badge{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:500;background:var(--bg-2,#eef2f7);border:1px solid var(--border,#d0d7de);margin:2px;}
.cups-ssl-badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7;}
`;

function parseCups(text) {
  const lines = (text || '').split(/\r?\n/);
  const info = {
    serverName: null,
    listenAddresses: [],
    logLevel: null,
    maxLogSize: null,
    sslPort: null,
    serverCertificate: null,
    defaultAuthType: null,
    maxJobs: null,
    maxJobsPerUser: null,
    maxJobsPerPrinter: null,
  };
  const locationBlocks = [];
  let currentLocation = null;

  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;

    const locStart = t.match(/^<Location\s+([^>]+)>/i);
    if (locStart) {
      currentLocation = { path: locStart[1].trim(), order: null, authType: null, requireUser: null };
      continue;
    }
    if (/^<\/Location>/i.test(t)) {
      if (currentLocation) locationBlocks.push(currentLocation);
      currentLocation = null;
      continue;
    }

    if (currentLocation) {
      const orderM = t.match(/^Order\s+(.+)$/i);
      if (orderM) currentLocation.order = orderM[1].trim();
      const authM = t.match(/^AuthType\s+(.+)$/i);
      if (authM) currentLocation.authType = authM[1].trim();
      const reqM = t.match(/^Require\s+(.+)$/i);
      if (reqM) currentLocation.requireUser = reqM[1].trim();
      continue;
    }

    const m = t.match(/^(\w+)\s+(.+)$/);
    if (!m) continue;
    const [, key, val] = m;
    const k = key.toLowerCase();

    if (k === 'servername') info.serverName = val.trim();
    else if (k === 'listen') info.listenAddresses.push(val.trim());
    else if (k === 'loglevel') info.logLevel = val.trim();
    else if (k === 'maxlogsize') info.maxLogSize = val.trim();
    else if (k === 'sslport') info.sslPort = val.trim();
    else if (k === 'servercertificate') info.serverCertificate = val.trim();
    else if (k === 'defaultauthtype') info.defaultAuthType = val.trim();
    else if (k === 'maxjobs') info.maxJobs = val.trim();
    else if (k === 'maxjobsperuser') info.maxJobsPerUser = val.trim();
    else if (k === 'maxjobsperprinter') info.maxJobsPerPrinter = val.trim();
  }

  return { info, locationBlocks };
}

export function render(intake) {
  const { info, locationBlocks } = parseCups(intake.text || '');

  const host = document.createElement('div');
  host.className = 'cups-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'cups-title';
  title.innerHTML = `<span class="cups-badge">CUPS</span>${esc(info.serverName || 'cupsd.conf')}`;
  host.appendChild(title);

  const subParts = [];
  if (info.logLevel) subParts.push(`LogLevel: ${info.logLevel}`);
  if (info.sslPort) subParts.push(`SSL: port ${info.sslPort}`);
  if (info.listenAddresses.length) subParts.push(`${info.listenAddresses.length} listen address${info.listenAddresses.length !== 1 ? 'es' : ''}`);

  const sub = document.createElement('div');
  sub.className = 'cups-sub';
  sub.textContent = subParts.join(' · ') || 'CUPS Printing Service Configuration';
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'cups-summary';
  const cards = [
    { value: info.listenAddresses.length, label: 'Listen addrs' },
    { value: locationBlocks.length, label: 'Location blocks' },
    { value: info.sslPort ? info.sslPort : '—', label: 'SSL Port' },
    { value: info.logLevel || '—', label: 'Log Level' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'cups-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // General settings table
  const settingsSec = document.createElement('div');
  settingsSec.className = 'cups-section';
  const settingsH3 = document.createElement('h3');
  settingsH3.textContent = 'Server Settings';
  settingsSec.appendChild(settingsH3);
  const settingsTable = document.createElement('table');
  settingsTable.className = 'cups-table';
  const settingsRows = [
    ['ServerName', info.serverName],
    ['LogLevel', info.logLevel],
    ['MaxLogSize', info.maxLogSize],
    ['DefaultAuthType', info.defaultAuthType],
    ['MaxJobs', info.maxJobs],
    ['MaxJobsPerUser', info.maxJobsPerUser],
    ['MaxJobsPerPrinter', info.maxJobsPerPrinter],
    ['SSLPort', info.sslPort],
    ['ServerCertificate', info.serverCertificate],
  ].filter(([, v]) => v != null);
  const settingsTbody = document.createElement('tbody');
  for (const [label, value] of settingsRows) {
    const tr = document.createElement('tr');
    const tdL = document.createElement('td');
    tdL.style.cssText = 'font-weight:600;width:170px;color:var(--fg-2,#666);';
    tdL.textContent = label;
    const tdV = document.createElement('td');
    tdV.className = 'cups-mono';
    tdV.textContent = value;
    tr.appendChild(tdL);
    tr.appendChild(tdV);
    settingsTbody.appendChild(tr);
  }
  settingsTable.appendChild(settingsTbody);
  settingsSec.appendChild(settingsTable);
  host.appendChild(settingsSec);

  // Listen addresses
  if (info.listenAddresses.length > 0) {
    const listenSec = document.createElement('div');
    listenSec.className = 'cups-section';
    const listenH3 = document.createElement('h3');
    listenH3.textContent = 'Listen Addresses';
    listenSec.appendChild(listenH3);
    const listenDiv = document.createElement('div');
    for (const addr of info.listenAddresses) {
      const span = document.createElement('span');
      span.className = 'cups-listen-badge cups-mono';
      span.textContent = addr;
      listenDiv.appendChild(span);
    }
    listenSec.appendChild(listenDiv);
    host.appendChild(listenSec);
  }

  // Location blocks (access control)
  if (locationBlocks.length > 0) {
    const locSec = document.createElement('div');
    locSec.className = 'cups-section';
    const locH3 = document.createElement('h3');
    locH3.textContent = 'Access Control (Location Blocks)';
    locSec.appendChild(locH3);
    const table = document.createElement('table');
    table.className = 'cups-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Path</th><th>Order</th><th>AuthType</th><th>Require</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const loc of locationBlocks) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="cups-mono">${esc(loc.path)}</td><td>${esc(loc.order || '—')}</td><td>${esc(loc.authType || '—')}</td><td>${esc(loc.requireUser || '—')}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    locSec.appendChild(table);
    host.appendChild(locSec);
  }

  // SSL/TLS info
  if (info.sslPort || info.serverCertificate) {
    const sslSec = document.createElement('div');
    sslSec.className = 'cups-section';
    const sslH3 = document.createElement('h3');
    sslH3.textContent = 'SSL/TLS';
    sslSec.appendChild(sslH3);
    const sslDiv = document.createElement('div');
    if (info.sslPort) {
      const badge = document.createElement('span');
      badge.className = 'cups-ssl-badge';
      badge.textContent = `SSL Port: ${info.sslPort}`;
      sslDiv.appendChild(badge);
    }
    if (info.serverCertificate) {
      const certP = document.createElement('p');
      certP.style.cssText = 'margin:8px 0 0;font-size:12px;';
      certP.innerHTML = `Certificate: <span class="cups-mono">${esc(info.serverCertificate)}</span>`;
      sslDiv.appendChild(certP);
    }
    sslSec.appendChild(sslDiv);
    host.appendChild(sslSec);
  }

  return { parentNode: host };
}
