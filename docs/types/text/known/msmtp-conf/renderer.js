const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.msmtp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.msmtp-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0891b2;color:#fff;vertical-align:middle;margin-right:8px;}
.msmtp-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.msmtp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.msmtp-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.msmtp-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.msmtp-card strong{display:block;font-size:1.2rem;font-weight:700;}
.msmtp-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.msmtp-section{margin:14px 0;}
.msmtp-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.msmtp-account{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:10px 14px;margin-bottom:10px;}
.msmtp-account-title{font-weight:700;font-size:14px;margin-bottom:6px;}
.msmtp-table{width:100%;border-collapse:collapse;font-size:13px;}
.msmtp-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:4px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.msmtp-table td{padding:4px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;}
.msmtp-table tr:last-child td{border-bottom:none;}
.msmtp-kv{font-family:ui-monospace,monospace;font-size:12px;}
.msmtp-redacted{color:var(--fg-2,#888);font-style:italic;font-size:12px;}
.msmtp-yes{color:#16a34a;font-weight:600;}
.msmtp-no{color:#dc2626;font-weight:600;}
`;

function parseAccounts(text) {
  const lines = (text || '').split(/\r?\n/);
  const defaults = {};
  const accounts = [];
  let current = null; // null=defaults, else account object

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const accountMatch = line.match(/^account\s+(\S+)/);
    if (accountMatch) {
      const name = accountMatch[1];
      // "account default : <other>" is an alias, not a real account
      if (name === 'default' && line.includes(':')) {
        const aliasMatch = line.match(/:\s*(\S+)/);
        if (aliasMatch) {
          // record default alias
          const last = accounts[accounts.length - 1];
          if (last) last.isDefault = true;
        }
        continue;
      }
      current = { name, host: '', port: '', from: '', auth: '', tls: '', tls_starttls: '', user: '' };
      accounts.push(current);
      continue;
    }

    const kv = line.match(/^(\w+)\s+(.*)/);
    if (!kv) continue;
    const key = kv[1].toLowerCase();
    const val = kv[2].trim();

    if (key === 'password') {
      // Always redact passwords
      if (current) current._passwordSet = true;
      else defaults._passwordSet = true;
      continue;
    }

    if (current) {
      current[key] = val;
    } else {
      defaults[key] = val;
    }
  }

  // Merge defaults into accounts (account-level overrides defaults)
  for (const acc of accounts) {
    for (const [k, v] of Object.entries(defaults)) {
      if (k === '_passwordSet') {
        if (!acc._passwordSet) acc._passwordSet = true;
        continue;
      }
      if (!(k in acc) || acc[k] === '') acc[k] = v;
    }
  }

  return { accounts, defaults };
}

export function render(intake) {
  const text = intake.text || '';
  const { accounts, defaults } = parseAccounts(text);

  const host = document.createElement('div');
  host.className = 'msmtp-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'msmtp-title';
  title.innerHTML = '<span class="msmtp-badge">msmtp</span>SMTP Sender Config';
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'msmtp-sub';
  sub.textContent = `${accounts.length} account${accounts.length !== 1 ? 's' : ''} configured`;
  host.appendChild(sub);

  // Summary cards
  const cards = document.createElement('div');
  cards.className = 'msmtp-cards';
  const tlsAccounts = accounts.filter((a) => a.tls === 'on' || a.tls_starttls === 'on');
  const authAccounts = accounts.filter((a) => a.auth && a.auth !== 'off');
  const cardData = [
    { value: accounts.length, label: 'Accounts' },
    { value: tlsAccounts.length, label: 'TLS enabled' },
    { value: authAccounts.length, label: 'Auth enabled' },
    { value: defaults.logfile ? 'yes' : 'no', label: 'Logging' },
  ];
  for (const { value, label } of cardData) {
    const card = document.createElement('div');
    card.className = 'msmtp-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Defaults section (if any non-trivial settings)
  const defaultEntries = Object.entries(defaults).filter(([k]) => k !== '_passwordSet');
  if (defaultEntries.length > 0 || defaults._passwordSet) {
    const sec = document.createElement('div');
    sec.className = 'msmtp-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Defaults';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'msmtp-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Setting</th><th>Value</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const [k, v] of defaultEntries.slice(0, 15)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="msmtp-kv">${esc(k)}</td><td class="msmtp-kv">${esc(v)}</td>`;
      tbody.appendChild(tr);
    }
    if (defaults._passwordSet) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="msmtp-kv">password</td><td class="msmtp-redacted">[configured]</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Per-account sections
  if (accounts.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'msmtp-section';
    const h3 = document.createElement('h3');
    h3.textContent = `Accounts (${accounts.length})`;
    sec.appendChild(h3);

    for (const acc of accounts) {
      const block = document.createElement('div');
      block.className = 'msmtp-account';

      const accTitle = document.createElement('div');
      accTitle.className = 'msmtp-account-title';
      accTitle.textContent = acc.name + (acc.isDefault ? ' (default)' : '');
      block.appendChild(accTitle);

      const table = document.createElement('table');
      table.className = 'msmtp-table';
      const thead = document.createElement('thead');
      thead.innerHTML = '<tr><th>Setting</th><th>Value</th></tr>';
      table.appendChild(thead);
      const tbody = document.createElement('tbody');

      const fields = [
        ['host', acc.host],
        ['port', acc.port],
        ['from', acc.from],
        ['user', acc.user],
        ['auth', acc.auth],
        ['tls', acc.tls],
        ['tls_starttls', acc.tls_starttls],
        ['tls_trust_file', acc.tls_trust_file || ''],
      ];
      for (const [k, v] of fields) {
        if (!v && k !== 'host' && k !== 'port' && k !== 'from') continue;
        const tr = document.createElement('tr');
        const isYes = v === 'on' || v === 'yes';
        const isNo = v === 'off' || v === 'no';
        tr.innerHTML = `<td class="msmtp-kv">${esc(k)}</td><td class="msmtp-kv${isYes ? ' msmtp-yes' : isNo ? ' msmtp-no' : ''}">${esc(v || '—')}</td>`;
        tbody.appendChild(tr);
      }
      // Password always redacted
      if (acc._passwordSet) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="msmtp-kv">password</td><td class="msmtp-redacted">[configured]</td>`;
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      block.appendChild(table);
      sec.appendChild(block);
    }
    host.appendChild(sec);
  }

  return { parentNode: host };
}
