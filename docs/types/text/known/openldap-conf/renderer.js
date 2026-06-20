const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ldap-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ldap-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#c2410c;color:#fff;vertical-align:middle;margin-right:8px;}
.ldap-type-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:600;background:var(--bg-2,#f0f4f8);border:1px solid var(--border,#d1d5db);vertical-align:middle;margin-right:8px;}
.ldap-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ldap-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ldap-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.ldap-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.ldap-card strong{display:block;font-size:1.2rem;font-weight:700;word-break:break-all;}
.ldap-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.ldap-section{margin:14px 0;}
.ldap-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.ldap-table{width:100%;border-collapse:collapse;font-size:13px;}
.ldap-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.ldap-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;}
.ldap-table tr:last-child td{border-bottom:none;}
.ldap-kv{font-family:ui-monospace,monospace;font-size:12px;}
.ldap-redacted{color:var(--fg-2,#888);font-style:italic;font-size:12px;}
.ldap-tag{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600;background:var(--bg-2,#f0f4f8);border:1px solid var(--border,#d1d5db);margin:1px 3px;}
`;

function parseSlapd(text) {
  const lines = (text || '').split(/\r?\n/);
  const includes = [];
  const overlays = [];
  let database = '';
  let suffix = '';
  let rootdn = '';
  let rootpwSet = false;
  let directory = '';
  let loglevel = '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const m = line.match(/^(\S+)\s*(.*)/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim().replace(/^["']|["']$/g, '');

    if (key === 'include') includes.push(val);
    else if (key === 'overlay') overlays.push(val);
    else if (key === 'database' && !database) database = val;
    else if (key === 'suffix' && !suffix) suffix = val;
    else if (key === 'rootdn' && !rootdn) rootdn = val;
    else if (key === 'rootpw') rootpwSet = true;
    else if (key === 'directory' && !directory) directory = val;
    else if (key === 'loglevel' && !loglevel) loglevel = val;
  }

  return { includes, overlays, database, suffix, rootdn, rootpwSet, directory, loglevel };
}

function parseLdapClient(text) {
  const lines = (text || '').split(/\r?\n/);
  const result = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(\S+)\s+(.*)/);
    if (!m) continue;
    const key = m[1].toUpperCase();
    const val = m[2].trim();
    result[key] = val;
  }
  return result;
}

function isSlapdConf(text, filename) {
  const name = (filename || '').split('/').pop().toLowerCase();
  if (name === 'slapd.conf') return true;
  if (name === 'ldap.conf') return false;
  // Content-based: slapd has database/suffix/rootdn
  return /^database /m.test(text) && /^suffix /m.test(text);
}

export function render(intake) {
  const text = intake.text || '';
  const filename = intake.name || intake.filename || '';
  const isServer = isSlapdConf(text, filename);

  const host = document.createElement('div');
  host.className = 'ldap-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'ldap-title';
  title.innerHTML = `<span class="ldap-badge">OpenLDAP</span><span class="ldap-type-badge">${isServer ? 'slapd.conf — Server' : 'ldap.conf — Client'}</span>`;
  host.appendChild(title);

  if (isServer) {
    const { includes, overlays, database, suffix, rootdn, rootpwSet, directory, loglevel } = parseSlapd(text);

    const sub = document.createElement('div');
    sub.className = 'ldap-sub';
    sub.textContent = suffix ? `Suffix: ${suffix}` : 'OpenLDAP server configuration';
    host.appendChild(sub);

    // Summary cards
    const cards = document.createElement('div');
    cards.className = 'ldap-cards';
    const cardData = [
      { value: database || '—', label: 'Database type' },
      { value: suffix || '—', label: 'Suffix' },
      { value: includes.length, label: 'Schemas' },
      { value: overlays.length, label: 'Overlays' },
    ];
    for (const { value, label } of cardData) {
      const card = document.createElement('div');
      card.className = 'ldap-card';
      const strong = document.createElement('strong');
      strong.textContent = value;
      const span = document.createElement('span');
      span.textContent = label;
      card.appendChild(strong);
      card.appendChild(span);
      cards.appendChild(card);
    }
    host.appendChild(cards);

    // Core settings
    {
      const sec = document.createElement('div');
      sec.className = 'ldap-section';
      const h3 = document.createElement('h3');
      h3.textContent = 'Database Settings';
      sec.appendChild(h3);
      const table = document.createElement('table');
      table.className = 'ldap-table';
      const thead = document.createElement('thead');
      thead.innerHTML = '<tr><th>Directive</th><th>Value</th></tr>';
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      const rows = [
        ['database', database || '—'],
        ['suffix', suffix || '—'],
        ['rootdn', rootdn || '—'],
        ['rootpw', null], // special
        ['directory', directory || '—'],
        ['loglevel', loglevel || '—'],
      ];
      for (const [k, v] of rows) {
        const tr = document.createElement('tr');
        if (k === 'rootpw') {
          tr.innerHTML = `<td class="ldap-kv">rootpw</td><td class="ldap-redacted">${rootpwSet ? '[configured]' : '(not set)'}</td>`;
        } else {
          tr.innerHTML = `<td class="ldap-kv">${esc(k)}</td><td class="ldap-kv">${esc(v)}</td>`;
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      sec.appendChild(table);
      host.appendChild(sec);
    }

    // Schema includes
    if (includes.length > 0) {
      const sec = document.createElement('div');
      sec.className = 'ldap-section';
      const h3 = document.createElement('h3');
      h3.textContent = `Schema Includes (${includes.length})`;
      sec.appendChild(h3);
      const tagWrap = document.createElement('div');
      for (const inc of includes.slice(0, 30)) {
        const tag = document.createElement('span');
        tag.className = 'ldap-tag';
        tag.textContent = inc.split('/').pop();
        tag.title = inc;
        tagWrap.appendChild(tag);
      }
      sec.appendChild(tagWrap);
      host.appendChild(sec);
    }

    // Overlays
    if (overlays.length > 0) {
      const sec = document.createElement('div');
      sec.className = 'ldap-section';
      const h3 = document.createElement('h3');
      h3.textContent = `Overlays (${overlays.length})`;
      sec.appendChild(h3);
      const tagWrap = document.createElement('div');
      for (const ov of overlays) {
        const tag = document.createElement('span');
        tag.className = 'ldap-tag';
        tag.textContent = ov;
        tagWrap.appendChild(tag);
      }
      sec.appendChild(tagWrap);
      host.appendChild(sec);
    }
  } else {
    // Client config (ldap.conf)
    const cfg = parseLdapClient(text);

    const sub = document.createElement('div');
    sub.className = 'ldap-sub';
    sub.textContent = cfg['URI'] ? `URI: ${cfg['URI']}` : 'OpenLDAP client configuration';
    host.appendChild(sub);

    // Summary cards
    const cards = document.createElement('div');
    cards.className = 'ldap-cards';
    const cardData = [
      { value: cfg['URI'] || '—', label: 'LDAP URI' },
      { value: cfg['BASE'] || '—', label: 'Search base' },
      { value: cfg['TLS_REQCERT'] || '—', label: 'TLS req cert' },
      { value: cfg['BINDDN'] || '—', label: 'Bind DN' },
    ];
    for (const { value, label } of cardData) {
      const card = document.createElement('div');
      card.className = 'ldap-card';
      const strong = document.createElement('strong');
      strong.textContent = value;
      const span = document.createElement('span');
      span.textContent = label;
      card.appendChild(strong);
      card.appendChild(span);
      cards.appendChild(card);
    }
    host.appendChild(cards);

    // All settings table
    const entries = Object.entries(cfg);
    if (entries.length > 0) {
      const sec = document.createElement('div');
      sec.className = 'ldap-section';
      const h3 = document.createElement('h3');
      h3.textContent = 'Client Settings';
      sec.appendChild(h3);
      const table = document.createElement('table');
      table.className = 'ldap-table';
      const thead = document.createElement('thead');
      thead.innerHTML = '<tr><th>Directive</th><th>Value</th></tr>';
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      for (const [k, v] of entries.slice(0, 30)) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="ldap-kv">${esc(k)}</td><td class="ldap-kv">${esc(v)}</td>`;
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      sec.appendChild(table);
      host.appendChild(sec);
    }
  }

  return { parentNode: host };
}
