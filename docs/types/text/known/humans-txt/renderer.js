const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.hum-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.hum-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0d9488;color:#fff;vertical-align:middle;margin-right:8px;}
.hum-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.hum-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.hum-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.hum-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:700;border-bottom:1px solid var(--border,#e0e0e0);letter-spacing:.03em;color:var(--fg,#24292f);}
.hum-table{width:100%;border-collapse:collapse;font-size:13px;}
.hum-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;}
.hum-table td:first-child{font-weight:600;font-size:12px;color:var(--fg-2,#555);white-space:nowrap;width:150px;}
.hum-table tr:last-child td{border-bottom:none;}
.hum-link{color:var(--fg,#0969da);word-break:break-all;}
`;

const URL_FIELDS = new Set(['twitter', 'github', 'url', 'site', 'blog', 'linkedin', 'mastodon', 'website']);

function parseHumans(text) {
  const sections = [];
  let current = null;

  for (const rawLine of (text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    // Section header: /* SECTION NAME */
    const sectionMatch = line.match(/^\/\*\s*(.+?)\s*\*\/$/);
    if (sectionMatch) {
      current = { name: sectionMatch[1], fields: [] };
      sections.push(current);
      continue;
    }
    if (!line || !current) continue;
    // Field: Key: Value
    const colonIdx = line.indexOf(':');
    if (colonIdx < 0) {
      // Plain line without a colon — treat as continuation or free text
      current.fields.push({ key: '', value: line });
      continue;
    }
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    current.fields.push({ key, value });
  }

  return sections;
}

function makeValueEl(key, value) {
  const lower = key.toLowerCase();
  // URL-like value
  if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value)) {
    const a = document.createElement('a');
    a.className = 'hum-link';
    a.href = value;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = value;
    return a;
  }
  // Twitter/GitHub handles @foo
  if ((lower === 'twitter' || lower === 'github') && /^@/.test(value)) {
    const a = document.createElement('a');
    a.className = 'hum-link';
    if (lower === 'twitter') a.href = 'https://twitter.com/' + encodeURIComponent(value.slice(1));
    else a.href = 'https://github.com/' + encodeURIComponent(value.slice(1));
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = value;
    return a;
  }
  const span = document.createElement('span');
  span.textContent = value;
  return span;
}

export function render(intake) {
  const sections = parseHumans(intake.text || '');

  const host = document.createElement('div');
  host.className = 'hum-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'hum-title';
  title.innerHTML = '<span class="hum-badge">humans.txt</span>';
  host.appendChild(title);

  const totalFields = sections.reduce((n, s) => n + s.fields.filter((f) => f.key).length, 0);
  const sub = document.createElement('div');
  sub.className = 'hum-sub';
  sub.textContent = `${sections.length} section${sections.length !== 1 ? 's' : ''} · ${totalFields} field${totalFields !== 1 ? 's' : ''}`;
  host.appendChild(sub);

  for (const section of sections) {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'hum-section';

    const hd = document.createElement('div');
    hd.className = 'hum-section-hd';
    hd.textContent = section.name;
    sectionEl.appendChild(hd);

    if (section.fields.length > 0) {
      const table = document.createElement('table');
      table.className = 'hum-table';
      const tbody = document.createElement('tbody');
      for (const { key, value } of section.fields) {
        const tr = document.createElement('tr');
        const tdKey = document.createElement('td');
        tdKey.textContent = key;
        const tdVal = document.createElement('td');
        tdVal.appendChild(makeValueEl(key, value));
        tr.appendChild(tdKey);
        tr.appendChild(tdVal);
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      sectionEl.appendChild(table);
    }

    host.appendChild(sectionEl);
  }

  return { parentNode: host };
}
