const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sssd-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sssd-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.sssd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sssd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.sssd-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.sssd-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.sssd-card strong{display:block;font-size:1.2rem;font-weight:700;}
.sssd-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.sssd-section{margin:16px 0;}
.sssd-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.sssd-domain{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:12px 16px;margin-bottom:10px;}
.sssd-domain-name{font-size:15px;font-weight:600;margin:0 0 8px;font-family:ui-monospace,monospace;}
.sssd-kv{display:grid;grid-template-columns:max-content 1fr;gap:2px 14px;font-size:12px;}
.sssd-kv dt{color:var(--fg-2,#888);white-space:nowrap;font-weight:500;}
.sssd-kv dd{margin:0;font-family:ui-monospace,monospace;color:var(--fg,#24292f);}
.sssd-masked{color:var(--fg-2,#aaa);font-style:italic;}
.sssd-global{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;font-family:ui-monospace,monospace;}
.sssd-tag{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600;background:var(--bg-3,#e5e7eb);color:var(--fg-2,#555);margin:0 3px 3px 0;}
`;

const SENSITIVE_KEYS = /password|secret|token|authtok|credential|passphrase/i;

function parseSssd(text) {
  const lines = (text || '').split(/\r?\n/);
  let currentSection = null;
  const sections = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;

    const sectionMatch = line.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      if (!sections[currentSection]) sections[currentSection] = {};
      continue;
    }

    if (currentSection) {
      const eq = line.indexOf('=');
      if (eq !== -1) {
        const key = line.slice(0, eq).trim().toLowerCase();
        const val = line.slice(eq + 1).trim();
        // Mask sensitive keys
        if (key === 'ldap_default_authtok' || SENSITIVE_KEYS.test(key)) {
          sections[currentSection][key] = '[configured]';
        } else {
          sections[currentSection][key] = val;
        }
      }
    }
  }

  // Extract sssd global section
  const sssdSection = sections['sssd'] || {};
  const services = (sssdSection['services'] || '').split(',').map((s) => s.trim()).filter(Boolean);
  const domainNames = (sssdSection['domains'] || '').split(',').map((s) => s.trim()).filter(Boolean);

  // Extract domain sections
  const domains = [];
  for (const [name, data] of Object.entries(sections)) {
    if (!name.startsWith('domain/')) continue;
    const domainName = name.slice('domain/'.length);
    domains.push({ name: domainName, data });
  }

  return { sssdSection, services, domainNames, domains, sections };
}

export function render(intake) {
  const { services, domainNames, domains } = parseSssd(intake.text || '');

  const host = document.createElement('div');
  host.className = 'sssd-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'sssd-title';
  title.innerHTML = `<span class="sssd-badge">SSSD</span>System Security Services Daemon`;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'sssd-sub';
  const parts = [];
  if (services.length) parts.push(`${services.length} service${services.length !== 1 ? 's' : ''}`);
  if (domainNames.length) parts.push(`${domainNames.length} domain${domainNames.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ') || 'SSSD configuration';
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'sssd-summary';
  const cards = [
    { value: services.length, label: 'Services' },
    { value: domainNames.length, label: 'Domains' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'sssd-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Services
  if (services.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'sssd-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Services';
    sec.appendChild(h3);
    const div = document.createElement('div');
    for (const svc of services) {
      const tag = document.createElement('span');
      tag.className = 'sssd-tag';
      tag.textContent = svc;
      div.appendChild(tag);
    }
    sec.appendChild(div);
    host.appendChild(sec);
  }

  // Domains
  if (domains.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'sssd-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Domains';
    sec.appendChild(h3);

    for (const domain of domains) {
      const block = document.createElement('div');
      block.className = 'sssd-domain';

      const nameEl = document.createElement('div');
      nameEl.className = 'sssd-domain-name';
      nameEl.textContent = domain.name;
      block.appendChild(nameEl);

      const dl = document.createElement('dl');
      dl.className = 'sssd-kv';

      const fields = [
        ['id_provider', domain.data['id_provider']],
        ['auth_provider', domain.data['auth_provider']],
        ['ldap_uri', domain.data['ldap_uri']],
        ['ad_domain', domain.data['ad_domain']],
        ['krb5_realm', domain.data['krb5_realm']],
        ['ldap_search_base', domain.data['ldap_search_base']],
        ['ldap_default_bind_dn', domain.data['ldap_default_bind_dn']],
        ['ldap_default_authtok', domain.data['ldap_default_authtok']],
      ];

      for (const [k, v] of fields) {
        if (v == null) continue;
        const dt = document.createElement('dt');
        dt.textContent = k;
        const dd = document.createElement('dd');
        if (v === '[configured]') {
          dd.innerHTML = `<span class="sssd-masked">[configured]</span>`;
        } else {
          dd.textContent = v;
        }
        dl.appendChild(dt);
        dl.appendChild(dd);
      }

      // Show any other sensitive keys
      for (const [k, v] of Object.entries(domain.data)) {
        if (fields.some(([fk]) => fk === k)) continue;
        if (v === '[configured]') {
          const dt = document.createElement('dt');
          dt.textContent = k;
          const dd = document.createElement('dd');
          dd.innerHTML = `<span class="sssd-masked">[configured]</span>`;
          dl.appendChild(dt);
          dl.appendChild(dd);
        }
      }

      block.appendChild(dl);
      sec.appendChild(block);
    }
    host.appendChild(sec);
  }

  return { parentNode: host };
}
