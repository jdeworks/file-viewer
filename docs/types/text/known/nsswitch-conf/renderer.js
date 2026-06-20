const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nsswitch-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.nsswitch-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0891b2;color:#fff;vertical-align:middle;margin-right:8px;}
.nsswitch-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.nsswitch-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.nsswitch-section{margin:16px 0;}
.nsswitch-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.nsswitch-table{width:100%;border-collapse:collapse;font-size:13px;}
.nsswitch-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);}
.nsswitch-table td{padding:6px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:middle;}
.nsswitch-table td:first-child{font-family:ui-monospace,monospace;font-size:12px;font-weight:600;}
.nsswitch-table tr:last-child td{border-bottom:none;}
.nsswitch-table tr.hosts-row{background:var(--bg-2,#f0f9ff);}
.nsswitch-resolver{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600;background:var(--bg-2,#e8f0fe);color:#1e40af;margin:2px 3px 2px 0;font-family:ui-monospace,monospace;}
.nsswitch-resolver.dns{background:#dcfce7;color:#166534;}
.nsswitch-resolver.files{background:#f1f5f9;color:#475569;}
.nsswitch-resolver.myhostname{background:#fef9c3;color:#713f12;}
.nsswitch-resolver.mdns{background:#ede9fe;color:#5b21b6;}
.nsswitch-resolver.sss{background:#ffedd5;color:#9a3412;}
.nsswitch-resolver.ldap{background:#fce7f3;color:#9d174d;}
.nsswitch-resolver.nis{background:#fee2e2;color:#991b1b;}
.nsswitch-action{display:inline-block;padding:1px 5px;border-radius:4px;font-size:10px;color:#6b7280;background:#f3f4f6;margin:2px;font-family:ui-monospace,monospace;}
.nsswitch-note{font-size:12px;color:var(--fg-2,#555);background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:6px;padding:8px 12px;margin-top:10px;}
`;

const RESOLVER_CLASS = {
  dns: 'dns', files: 'files', myhostname: 'myhostname', resolve: 'dns',
  mdns4_minimal: 'mdns', mdns4: 'mdns', mdns6_minimal: 'mdns', mdns: 'mdns',
  sss: 'sss', ldap: 'ldap', nis: 'nis', nisplus: 'nis',
};

function parseNsswitchLine(line) {
  // Parse "files myhostname resolve [!UNAVAIL=return] dns"
  const resolvers = [];
  const actions = [];
  const tokens = line.trim().split(/\s+/);
  for (const tok of tokens) {
    if (tok.startsWith('[') && tok.endsWith(']')) {
      actions.push(tok);
    } else {
      resolvers.push(tok);
    }
  }
  return { resolvers, actions };
}

function parseNsswitch(text) {
  const entries = [];
  for (const rawLine of (text || '').split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (!m) continue;
    const db = m[1];
    const { resolvers, actions } = parseNsswitchLine(m[2]);
    entries.push({ db, resolvers, actions, raw: m[2] });
  }
  return entries;
}

export function render(intake) {
  const entries = parseNsswitch(intake.text || '');

  const host = document.createElement('div');
  host.className = 'nsswitch-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const title = document.createElement('div');
  title.className = 'nsswitch-title';
  title.innerHTML = '<span class="nsswitch-badge">nsswitch.conf</span>Name Service Switch';
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'nsswitch-sub';
  sub.textContent = `${entries.length} database${entries.length !== 1 ? 's' : ''} configured`;
  host.appendChild(sub);

  // hosts entry highlighted separately if present
  const hostsEntry = entries.find((e) => e.db === 'hosts');

  if (hostsEntry) {
    const sec = document.createElement('div');
    sec.className = 'nsswitch-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Host Resolution Chain (hosts)';
    sec.appendChild(h3);

    const row = document.createElement('div');
    const pills = buildResolverPills(hostsEntry.resolvers, hostsEntry.actions);
    row.appendChild(pills);

    const notes = [];
    if (hostsEntry.resolvers.includes('myhostname')) notes.push('myhostname resolver is active — the local machine hostname resolves without DNS');
    if (hostsEntry.resolvers.some((r) => r.startsWith('mdns'))) notes.push('mDNS (Avahi/Bonjour) resolver is in the chain');
    if (notes.length > 0) {
      const noteEl = document.createElement('div');
      noteEl.className = 'nsswitch-note';
      noteEl.textContent = notes.join(' · ');
      row.appendChild(noteEl);
    }
    sec.appendChild(row);
    host.appendChild(sec);
  }

  // Full table
  const sec = document.createElement('div');
  sec.className = 'nsswitch-section';
  const h3 = document.createElement('h3');
  h3.textContent = 'All Databases';
  sec.appendChild(h3);

  const table = document.createElement('table');
  table.className = 'nsswitch-table';
  table.innerHTML = '<thead><tr><th>Database</th><th>Resolver chain</th></tr></thead>';
  const tbody = document.createElement('tbody');
  for (const e of entries) {
    const tr = document.createElement('tr');
    if (e.db === 'hosts') tr.className = 'hosts-row';
    const tdDb = document.createElement('td');
    tdDb.textContent = e.db;
    const tdChain = document.createElement('td');
    tdChain.appendChild(buildResolverPills(e.resolvers, e.actions));
    tr.appendChild(tdDb);
    tr.appendChild(tdChain);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  sec.appendChild(table);
  host.appendChild(sec);

  return { parentNode: host };
}

function buildResolverPills(resolvers, actions) {
  const wrap = document.createElement('span');
  for (const r of resolvers) {
    const cls = RESOLVER_CLASS[r] || '';
    const span = document.createElement('span');
    span.className = 'nsswitch-resolver ' + cls;
    span.textContent = r;
    wrap.appendChild(span);
  }
  for (const a of actions) {
    const span = document.createElement('span');
    span.className = 'nsswitch-action';
    span.textContent = a;
    wrap.appendChild(span);
  }
  return wrap;
}
