const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sitemap-doc{padding:16px 18px;max-width:1000px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sitemap-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#059669;color:#fff;vertical-align:middle;margin-right:8px;}
.sitemap-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sitemap-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.sitemap-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.sitemap-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.sitemap-card strong{display:block;font-size:1.2rem;font-weight:700;}
.sitemap-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.sitemap-note{font-size:.82rem;color:var(--fg-2,#5a6678);margin:0 0 10px;}
.sitemap-table{width:100%;border-collapse:collapse;font-size:13px;}
.sitemap-table th{background:var(--bg-2,#f6f8fa);border-bottom:2px solid var(--border,#d9e1ec);padding:7px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);font-weight:600;white-space:nowrap;}
.sitemap-table td{border-bottom:1px solid var(--border,#eaecf0);padding:6px 8px;vertical-align:middle;font-size:12px;}
.sitemap-table tr:last-child td{border-bottom:none;}
.sitemap-url{font-family:ui-monospace,monospace;max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;}
.sitemap-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f1f5f9);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.sitemap-prio-hi{color:#1a7f37;font-weight:700;}
.sitemap-prio-lo{color:var(--fg-2,#888);}
`;

function getTextNS(el, localName) {
  // Works with and without XML namespace prefix
  const candidates = el.getElementsByTagNameNS('*', localName);
  if (candidates.length) return (candidates[0].textContent || '').trim();
  const plain = el.getElementsByTagName(localName);
  if (plain.length) return (plain[0].textContent || '').trim();
  return '';
}

function prioClass(p) {
  const n = parseFloat(p);
  if (Number.isFinite(n) && n >= 0.8) return 'sitemap-prio-hi';
  if (Number.isFinite(n) && n <= 0.3) return 'sitemap-prio-lo';
  return '';
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'sitemap-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  let xmlDoc;
  try {
    xmlDoc = new DOMParser().parseFromString(intake.text || '', 'text/xml');
    if (xmlDoc.getElementsByTagName('parsererror').length) throw new Error('parse error');
  } catch {
    const err = document.createElement('p');
    err.textContent = 'Could not parse XML sitemap.';
    host.appendChild(err);
    return { parentNode: host };
  }

  const root = xmlDoc.documentElement;
  const rootName = root.localName || root.tagName;
  const isIndex = rootName === 'sitemapindex';

  if (isIndex) {
    // Sitemap index: list of sitemaps
    const sitemaps = [...xmlDoc.getElementsByTagNameNS('*', 'sitemap')].length
      ? [...xmlDoc.getElementsByTagNameNS('*', 'sitemap')]
      : [...xmlDoc.getElementsByTagName('sitemap')];

    const total = sitemaps.length;

    const title = document.createElement('div');
    title.className = 'sitemap-title';
    title.innerHTML = '<span class="sitemap-badge">Sitemap Index</span>';
    host.appendChild(title);

    const sub = document.createElement('div');
    sub.className = 'sitemap-sub';
    sub.textContent = `Sitemap index with ${total} sitemap${total !== 1 ? 's' : ''}`;
    host.appendChild(sub);

    const summary = document.createElement('div');
    summary.className = 'sitemap-summary';
    const card = document.createElement('div');
    card.className = 'sitemap-card';
    const strong = document.createElement('strong');
    strong.textContent = total;
    const span = document.createElement('span');
    span.textContent = 'Sitemaps';
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
    host.appendChild(summary);

    const table = document.createElement('table');
    table.className = 'sitemap-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>#</th><th>Sitemap URL</th><th>Last Modified</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    sitemaps.forEach((sm, i) => {
      const loc = getTextNS(sm, 'loc');
      const lastmod = getTextNS(sm, 'lastmod');
      const tr = document.createElement('tr');
      tr.innerHTML = `<td style="color:var(--fg-2,#888);font-family:ui-monospace,monospace;font-size:12px">${i + 1}</td>` +
        `<td><span class="sitemap-url" title="${esc(loc)}">${esc(loc)}</span></td>` +
        `<td><span class="sitemap-chip">${esc(lastmod || '—')}</span></td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    host.appendChild(table);
  } else {
    // URL set: list of URLs
    const urls = [...xmlDoc.getElementsByTagNameNS('*', 'url')].length
      ? [...xmlDoc.getElementsByTagNameNS('*', 'url')]
      : [...xmlDoc.getElementsByTagName('url')];

    const total = urls.length;
    const CAP = 200;
    const truncated = total > CAP;
    const shown = truncated ? urls.slice(0, CAP) : urls;

    const title = document.createElement('div');
    title.className = 'sitemap-title';
    title.innerHTML = '<span class="sitemap-badge">XML Sitemap</span>';
    host.appendChild(title);

    const sub = document.createElement('div');
    sub.className = 'sitemap-sub';
    sub.textContent = `Sitemap with ${total} URL${total !== 1 ? 's' : ''}`;
    host.appendChild(sub);

    const summary = document.createElement('div');
    summary.className = 'sitemap-summary';
    for (const { value, label } of [{ value: total, label: 'URLs' }]) {
      const card = document.createElement('div');
      card.className = 'sitemap-card';
      const strong = document.createElement('strong');
      strong.textContent = value;
      const span = document.createElement('span');
      span.textContent = label;
      card.appendChild(strong);
      card.appendChild(span);
      summary.appendChild(card);
    }
    host.appendChild(summary);

    if (truncated) {
      const note = document.createElement('p');
      note.className = 'sitemap-note';
      note.textContent = `Showing first ${CAP} of ${total} URLs.`;
      host.appendChild(note);
    }

    const table = document.createElement('table');
    table.className = 'sitemap-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>#</th><th>URL</th><th>Last Modified</th><th>Change Frequency</th><th>Priority</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    shown.forEach((url, i) => {
      const loc = getTextNS(url, 'loc');
      const lastmod = getTextNS(url, 'lastmod');
      const changefreq = getTextNS(url, 'changefreq');
      const priority = getTextNS(url, 'priority');
      const pc = prioClass(priority);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td style="color:var(--fg-2,#888);font-family:ui-monospace,monospace;font-size:12px">${i + 1}</td>` +
        `<td><span class="sitemap-url" title="${esc(loc)}">${esc(loc)}</span></td>` +
        `<td><span class="sitemap-chip">${esc(lastmod || '—')}</span></td>` +
        `<td>${esc(changefreq || '—')}</td>` +
        `<td class="${pc}">${esc(priority || '—')}</td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    host.appendChild(table);
  }

  return { parentNode: host };
}
