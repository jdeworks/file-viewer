const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.apts-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.apts-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e95420;color:#fff;vertical-align:middle;margin-right:8px;}
.apts-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.apts-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.apts-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.apts-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.apts-card strong{display:block;font-size:1.2rem;font-weight:700;}
.apts-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.apts-section{margin:16px 0;}
.apts-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.apts-list{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px;}
.apts-list li{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:3px 10px;font-family:ui-monospace,monospace;font-size:12px;}
.apts-disabled{opacity:.55;}
`;

function parseAptSources(text) {
  const lines = (text || '').split(/\r?\n/);
  let enabled = 0;
  let disabled = 0;
  const urls = new Set();
  const suites = new Set();
  const components = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Disabled repo: starts with # deb
    const disabledMatch = trimmed.match(/^#\s*(deb(?:-src)?)\s+/);
    if (disabledMatch) {
      disabled++;
      continue;
    }

    // Enabled repo: starts with deb or deb-src
    const enabledMatch = trimmed.match(/^(deb(?:-src)?)\s+(\S+)\s+(\S+)(?:\s+(.+))?/);
    if (enabledMatch) {
      enabled++;
      const rawUrl = enabledMatch[2];
      // Handle [options] prefix (e.g. [arch=amd64])
      const urlPart = rawUrl.startsWith('[') ? enabledMatch[3] : rawUrl;
      const suiteRaw = rawUrl.startsWith('[') ? enabledMatch[3] : enabledMatch[3];
      const compsRaw = rawUrl.startsWith('[') ? enabledMatch[4] : enabledMatch[4];

      // Extract host from URL
      try {
        const u = new URL(urlPart.startsWith('[') ? suiteRaw : urlPart);
        urls.add(u.host);
      } catch {
        // Not a URL (e.g. cdrom:), just use as-is
        const host = (urlPart.startsWith('[') ? suiteRaw : urlPart).split('/')[0];
        if (host) urls.add(host);
      }

      const suite = urlPart.startsWith('[') ? suiteRaw : suiteRaw;
      if (suite) suites.add(suite);

      if (compsRaw) {
        for (const comp of compsRaw.trim().split(/\s+/)) {
          if (comp) components.add(comp);
        }
      }
    }
  }

  return { enabled, disabled, urls: [...urls], suites: [...suites], components: [...components] };
}

export function render(intake) {
  const { enabled, disabled, urls, suites, components } = parseAptSources(intake.text || '');

  const host = document.createElement('div');
  host.className = 'apts-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const title = document.createElement('div');
  title.className = 'apts-title';
  title.innerHTML = '<span class="apts-badge">APT Sources</span>Package Repositories';
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'apts-sub';
  sub.textContent = `${enabled} enabled repo${enabled !== 1 ? 's' : ''} · ${disabled} disabled`;
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'apts-summary';
  for (const { value, label } of [
    { value: enabled, label: 'Enabled' },
    { value: disabled, label: 'Disabled' },
    { value: urls.length, label: 'Unique hosts' },
    { value: suites.length, label: 'Suites' },
  ]) {
    const card = document.createElement('div');
    card.className = 'apts-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Repository URLs
  if (urls.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'apts-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Repository Hosts';
    sec.appendChild(h3);
    const ul = document.createElement('ul');
    ul.className = 'apts-list';
    for (const url of urls) {
      const li = document.createElement('li');
      li.textContent = url;
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  // Suites/distributions
  if (suites.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'apts-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Suites / Distributions';
    sec.appendChild(h3);
    const ul = document.createElement('ul');
    ul.className = 'apts-list';
    for (const suite of suites) {
      const li = document.createElement('li');
      li.textContent = suite;
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  // Components
  if (components.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'apts-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Components';
    sec.appendChild(h3);
    const ul = document.createElement('ul');
    ul.className = 'apts-list';
    for (const comp of components) {
      const li = document.createElement('li');
      li.textContent = comp;
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  return { parentNode: host };
}
