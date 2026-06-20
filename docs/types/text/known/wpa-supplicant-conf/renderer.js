const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wpas-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.wpas-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2563eb;color:#fff;vertical-align:middle;margin-right:8px;}
.wpas-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.wpas-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.wpas-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.wpas-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.wpas-card strong{display:block;font-size:1.2rem;font-weight:700;}
.wpas-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.wpas-section{margin:16px 0;}
.wpas-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.wpas-network{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:12px 16px;margin-bottom:10px;}
.wpas-network-name{font-size:15px;font-weight:600;margin:0 0 8px;font-family:ui-monospace,monospace;}
.wpas-kv{display:grid;grid-template-columns:max-content 1fr;gap:2px 14px;font-size:12px;}
.wpas-kv dt{color:var(--fg-2,#888);white-space:nowrap;font-weight:500;}
.wpas-kv dd{margin:0;font-family:ui-monospace,monospace;color:var(--fg,#24292f);}
.wpas-masked{color:var(--fg-2,#aaa);font-style:italic;}
.wpas-global{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;font-family:ui-monospace,monospace;}
`;

function parseWpaSupplicant(text) {
  const lines = (text || '').split(/\r?\n/);
  const globals = [];
  const networks = [];
  let inNetwork = false;
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    // Skip comments and empty lines
    if (!line || line.startsWith('#')) continue;

    if (/^network\s*=\s*\{/i.test(line)) {
      inNetwork = true;
      current = {};
      continue;
    }

    if (inNetwork) {
      if (line === '}') {
        inNetwork = false;
        if (current) networks.push(current);
        current = null;
        continue;
      }
      const eq = line.indexOf('=');
      if (eq !== -1) {
        const key = line.slice(0, eq).trim().toLowerCase();
        const val = line.slice(eq + 1).trim();
        // Mask PSK — both quoted string and raw hex forms
        if (key === 'psk') {
          current[key] = '[configured]';
        } else {
          // Strip surrounding quotes
          current[key] = val.replace(/^"(.*)"$/, '$1');
        }
      }
    } else {
      const eq = line.indexOf('=');
      if (eq !== -1) {
        const key = line.slice(0, eq).trim();
        const val = line.slice(eq + 1).trim();
        globals.push({ key, val });
      }
    }
  }

  return { globals, networks };
}

export function render(intake) {
  const { globals, networks } = parseWpaSupplicant(intake.text || '');

  const host = document.createElement('div');
  host.className = 'wpas-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'wpas-title';
  title.innerHTML = `<span class="wpas-badge">wpa_supplicant</span>Wireless Configuration`;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'wpas-sub';
  sub.textContent = `${networks.length} network block${networks.length !== 1 ? 's' : ''}`;
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'wpas-summary';
  const cards = [
    { value: networks.length, label: 'Networks' },
    { value: globals.length, label: 'Global settings' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'wpas-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Global settings
  if (globals.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'wpas-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Global Settings';
    sec.appendChild(h3);
    const div = document.createElement('div');
    div.className = 'wpas-global';
    for (const { key, val } of globals) {
      const row = document.createElement('div');
      row.innerHTML = `<span style="color:var(--fg-2,#888);font-weight:500">${esc(key)}</span> = <span>${esc(val)}</span>`;
      div.appendChild(row);
    }
    sec.appendChild(div);
    host.appendChild(sec);
  }

  // Network blocks
  if (networks.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'wpas-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Networks';
    sec.appendChild(h3);

    for (const net of networks) {
      const block = document.createElement('div');
      block.className = 'wpas-network';

      const nameEl = document.createElement('div');
      nameEl.className = 'wpas-network-name';
      nameEl.textContent = net.ssid ? `"${net.ssid}"` : '(unnamed network)';
      block.appendChild(nameEl);

      const dl = document.createElement('dl');
      dl.className = 'wpas-kv';

      const fields = [
        ['key_mgmt', net.key_mgmt],
        ['psk', net.psk],
        ['priority', net.priority],
        ['bssid', net.bssid],
        ['id_str', net.id_str],
        ['scan_ssid', net.scan_ssid],
      ];

      for (const [k, v] of fields) {
        if (v == null) continue;
        const dt = document.createElement('dt');
        dt.textContent = k;
        const dd = document.createElement('dd');
        if (k === 'psk') {
          dd.innerHTML = `<span class="wpas-masked">${esc(v)}</span>`;
        } else {
          dd.textContent = v;
        }
        dl.appendChild(dt);
        dl.appendChild(dd);
      }
      block.appendChild(dl);
      sec.appendChild(block);
    }
    host.appendChild(sec);
  }

  return { parentNode: host };
}
