const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sec-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sec-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#b91c1c;color:#fff;vertical-align:middle;margin-right:8px;}
.sec-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sec-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.sec-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.sec-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.sec-card strong{display:block;font-size:1.2rem;font-weight:700;}
.sec-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.sec-fields{border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;margin-bottom:16px;}
.sec-fields-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.sec-table{width:100%;border-collapse:collapse;font-size:13px;}
.sec-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.sec-table td{padding:6px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;}
.sec-table td:first-child{font-weight:600;font-size:12px;white-space:nowrap;color:var(--fg-2,#555);width:180px;}
.sec-table tr:last-child td{border-bottom:none;}
.sec-link{color:var(--fg,#0969da);word-break:break-all;}
.sec-expired{color:#b91c1c;font-weight:700;}
.sec-comments{margin:16px 0;}
.sec-comments h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.sec-comment{font-size:12px;color:var(--fg-2,#6e7781);padding:2px 0;font-family:ui-monospace,monospace;}
`;

const LINK_FIELDS = new Set(['contact', 'encryption', 'policy', 'acknowledgments', 'canonical', 'csaf', 'hiring']);

function parseSecurityTxt(text) {
  const fields = [];
  const comments = [];
  for (const rawLine of (text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      comments.push(line.slice(1).trim());
      continue;
    }
    const colonIdx = line.indexOf(':');
    if (colonIdx < 0) continue;
    const key = line.slice(0, colonIdx).trim();
    // The value after the first colon — but URLs have colons too, so take the rest
    const value = line.slice(colonIdx + 1).trim();
    if (key && value) fields.push({ key, value });
  }
  return { fields, comments };
}

function isExpired(value) {
  try {
    const d = new Date(value);
    return !isNaN(d.getTime()) && d < new Date();
  } catch {
    return false;
  }
}

function makeLinkEl(value, key) {
  const lower = key.toLowerCase();
  if (!LINK_FIELDS.has(lower)) return null;
  // Must look like a URL or mailto
  if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value)) {
    const a = document.createElement('a');
    a.className = 'sec-link';
    a.href = value;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = value;
    return a;
  }
  return null;
}

export function render(intake) {
  const { fields, comments } = parseSecurityTxt(intake.text || '');

  const host = document.createElement('div');
  host.className = 'sec-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'sec-title';
  title.innerHTML = '<span class="sec-badge">security.txt</span>';
  host.appendChild(title);

  const fieldKeys = fields.map((f) => f.key.toLowerCase());
  const hasContact = fieldKeys.includes('contact');
  const hasExpires = fieldKeys.includes('expires');
  const expiresField = fields.find((f) => f.key.toLowerCase() === 'expires');
  const expired = expiresField ? isExpired(expiresField.value) : false;

  const sub = document.createElement('div');
  sub.className = 'sec-sub';
  sub.textContent = `${fields.length} field${fields.length !== 1 ? 's' : ''}${expired ? ' · EXPIRED' : ''}`;
  host.appendChild(sub);

  // Summary cards
  const cards = document.createElement('div');
  cards.className = 'sec-cards';
  const cardData = [
    { value: fields.length, label: 'Fields' },
    { value: hasContact ? '✓' : '✗', label: 'Contact' },
    { value: hasExpires ? (expired ? 'Expired' : 'Valid') : 'None', label: 'Expiry' },
  ];
  for (const { value, label } of cardData) {
    const card = document.createElement('div');
    card.className = 'sec-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    if (label === 'Expiry' && expired) strong.className = 'sec-expired';
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Fields table
  if (fields.length > 0) {
    const section = document.createElement('div');
    section.className = 'sec-fields';

    const hd = document.createElement('div');
    hd.className = 'sec-fields-hd';
    hd.textContent = 'Fields';
    section.appendChild(hd);

    const table = document.createElement('table');
    table.className = 'sec-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Field</th><th>Value</th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const { key, value } of fields) {
      const tr = document.createElement('tr');
      const tdKey = document.createElement('td');
      tdKey.textContent = key;
      const tdVal = document.createElement('td');

      // Expiry date — highlight if expired
      if (key.toLowerCase() === 'expires') {
        if (expired) {
          const span = document.createElement('span');
          span.className = 'sec-expired';
          span.textContent = value + ' (EXPIRED)';
          tdVal.appendChild(span);
        } else {
          tdVal.textContent = value;
        }
      } else {
        const linkEl = makeLinkEl(value, key);
        if (linkEl) {
          tdVal.appendChild(linkEl);
        } else {
          tdVal.textContent = value;
        }
      }
      tr.appendChild(tdKey);
      tr.appendChild(tdVal);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    section.appendChild(table);
    host.appendChild(section);
  }

  // Comments
  if (comments.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'sec-comments';
    const h3 = document.createElement('h3');
    h3.textContent = 'Comments';
    sec.appendChild(h3);
    for (const c of comments) {
      const div = document.createElement('div');
      div.className = 'sec-comment';
      div.textContent = '# ' + c;
      sec.appendChild(div);
    }
    host.appendChild(sec);
  }

  return { parentNode: host };
}
