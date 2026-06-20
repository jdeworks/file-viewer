const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.avhi-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.avhi-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2563eb;color:#fff;vertical-align:middle;margin-right:8px;}
.avhi-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.avhi-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.avhi-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.avhi-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.avhi-card strong{display:block;font-size:1.2rem;font-weight:700;}
.avhi-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.avhi-section{margin:14px 0;}
.avhi-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.avhi-table{width:100%;border-collapse:collapse;font-size:13px;}
.avhi-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.avhi-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;}
.avhi-table tr:last-child td{border-bottom:none;}
.avhi-kv{font-family:ui-monospace,monospace;font-size:12px;}
.avhi-yes{color:#16a34a;font-weight:600;}
.avhi-no{color:#dc2626;font-weight:600;}
.avhi-tag{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600;background:var(--bg-2,#f0f4f8);border:1px solid var(--border,#d1d5db);margin:1px 2px;}
`;

function parseIni(text) {
  const sections = {};
  let current = null;
  for (const rawLine of (text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const sectionMatch = line.match(/^\[([^\]]+)\]/);
    if (sectionMatch) {
      current = sectionMatch[1].toLowerCase();
      if (!sections[current]) sections[current] = {};
      continue;
    }
    if (current && line.includes('=')) {
      const eq = line.indexOf('=');
      const key = line.slice(0, eq).trim().toLowerCase();
      const val = line.slice(eq + 1).trim();
      sections[current][key] = val;
    }
  }
  return sections;
}

function countPublishSections(text) {
  const lines = (text || '').split(/\r?\n/);
  let count = 0;
  for (const line of lines) {
    const t = line.trim();
    if (/^\[service\]/i.test(t) || /^\[publish(-\w+)?\]/i.test(t)) count++;
  }
  return count;
}

function yesNo(val) {
  if (val == null || val === '') return null;
  return val.toLowerCase() === 'yes' ? 'yes' : val.toLowerCase() === 'no' ? 'no' : val;
}

export function render(intake) {
  const text = intake.text || '';
  const sections = parseIni(text);
  const server = sections['server'] || {};
  const wideArea = sections['wide-area'] || {};
  const publish = sections['publish'] || {};
  const reflector = sections['reflector'] || {};

  const hostname = server['host-name'] || '';
  const domain = server['domain-name'] || 'local';
  const useIpv4 = yesNo(server['use-ipv4']);
  const useIpv6 = yesNo(server['use-ipv6']);
  const allowIfaces = server['allow-interfaces'] || '';
  const denyIfaces = server['deny-interfaces'] || '';
  const enableDbus = yesNo(server['enable-dbus']);
  const browseDomains = server['browse-domains'] || '';
  const publishCount = countPublishSections(text);

  const host = document.createElement('div');
  host.className = 'avhi-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'avhi-title';
  title.innerHTML = '<span class="avhi-badge">Avahi</span>mDNS/Zeroconf Daemon Config';
  host.appendChild(title);

  const parts = [];
  if (hostname) parts.push(`host: ${hostname}`);
  if (domain) parts.push(`domain: ${domain}`);
  if (allowIfaces) parts.push(`interfaces: ${allowIfaces}`);
  const sub = document.createElement('div');
  sub.className = 'avhi-sub';
  sub.textContent = parts.join(' · ') || 'Avahi daemon configuration';
  host.appendChild(sub);

  // Summary cards
  const cards = document.createElement('div');
  cards.className = 'avhi-cards';
  const cardData = [
    { value: hostname || '(default)', label: 'Hostname' },
    { value: domain || 'local', label: 'Domain' },
    { value: publishCount > 0 ? publishCount : '—', label: 'Publish sections' },
    { value: enableDbus || '—', label: 'D-Bus' },
  ];
  for (const { value, label } of cardData) {
    const card = document.createElement('div');
    card.className = 'avhi-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Server settings
  {
    const sec = document.createElement('div');
    sec.className = 'avhi-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Server Settings';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'avhi-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Key</th><th>Value</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    const rows = [
      ['host-name', hostname || '(not set)'],
      ['domain-name', domain || 'local'],
      ['use-ipv4', useIpv4 || '—'],
      ['use-ipv6', useIpv6 || '—'],
      ['allow-interfaces', allowIfaces || '(all)'],
      ['deny-interfaces', denyIfaces || '(none)'],
      ['enable-dbus', enableDbus || '—'],
      ['browse-domains', browseDomains || '—'],
    ];
    for (const [k, v] of rows) {
      const tr = document.createElement('tr');
      const isYes = v === 'yes';
      const isNo = v === 'no';
      tr.innerHTML = `<td class="avhi-kv">${esc(k)}</td><td class="avhi-kv${isYes ? ' avhi-yes' : isNo ? ' avhi-no' : ''}">${esc(v)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Network interfaces
  if (allowIfaces) {
    const sec = document.createElement('div');
    sec.className = 'avhi-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Allowed Interfaces';
    sec.appendChild(h3);
    const tagWrap = document.createElement('div');
    for (const iface of allowIfaces.split(',').map((s) => s.trim()).filter(Boolean)) {
      const tag = document.createElement('span');
      tag.className = 'avhi-tag';
      tag.textContent = iface;
      tagWrap.appendChild(tag);
    }
    sec.appendChild(tagWrap);
    host.appendChild(sec);
  }

  // Wide-area settings
  const wideAreaEnable = wideArea['enable-wide-area'];
  if (wideAreaEnable) {
    const sec = document.createElement('div');
    sec.className = 'avhi-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Wide-Area Settings';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'avhi-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Key</th><th>Value</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const [k, v] of Object.entries(wideArea).slice(0, 10)) {
      const tr = document.createElement('tr');
      const yn = yesNo(v);
      const cls = yn === 'yes' ? ' avhi-yes' : yn === 'no' ? ' avhi-no' : '';
      tr.innerHTML = `<td class="avhi-kv">${esc(k)}</td><td class="avhi-kv${cls}">${esc(v)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Publish settings
  const publishEntries = Object.entries(publish);
  if (publishEntries.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'avhi-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Publish Settings';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'avhi-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Key</th><th>Value</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const [k, v] of publishEntries.slice(0, 20)) {
      const tr = document.createElement('tr');
      const yn = yesNo(v);
      const cls = yn === 'yes' ? ' avhi-yes' : yn === 'no' ? ' avhi-no' : '';
      tr.innerHTML = `<td class="avhi-kv">${esc(k)}</td><td class="avhi-kv${cls}">${esc(v)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
