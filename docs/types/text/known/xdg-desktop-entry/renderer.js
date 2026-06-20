const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.de-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.de-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4a86e8;color:#fff;vertical-align:middle;margin-right:8px;}
.de-type-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:600;background:var(--bg-2,#f0f4fa);color:var(--fg,#24292f);border:1px solid var(--border,#d0d7de);vertical-align:middle;}
.de-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.de-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.de-section{margin:14px 0;}
.de-section h3{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 6px;}
.de-table{width:100%;border-collapse:collapse;font-size:13px;}
.de-table td{padding:6px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;}
.de-table td:first-child{width:160px;font-weight:600;color:var(--fg-2,#5a6678);font-size:12px;}
.de-table tr:last-child td{border-bottom:none;}
.de-pills{display:flex;flex-wrap:wrap;gap:5px;margin:0;}
.de-pill{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;background:var(--bg-2,#f0f4fa);border:1px solid var(--border,#d0d7de);color:var(--fg,#374151);}
.de-exec{font-family:ui-monospace,monospace;font-size:12px;background:var(--bg-2,#f6f8fa);padding:4px 8px;border-radius:6px;word-break:break-all;}
.de-flag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;margin-right:4px;}
.de-flag-on{background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;}
.de-flag-off{background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;}
.de-flag-warn{background:#fef3c7;color:#92400e;border:1px solid #fcd34d;}
`;

function parseDesktopEntry(text) {
  const lines = (text || '').split(/\r?\n/);
  const result = {};
  let inDesktopEntry = false;
  for (const line of lines) {
    const t = line.trim();
    if (t === '[Desktop Entry]') { inDesktopEntry = true; continue; }
    if (t.startsWith('[') && t !== '[Desktop Entry]') { inDesktopEntry = false; continue; }
    if (!inDesktopEntry) continue;
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    result[key] = val;
  }
  return result;
}

function makePills(str) {
  if (!str) return null;
  const parts = str.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return null;
  return parts;
}

export function render(intake) {
  const entry = parseDesktopEntry(intake.text || '');

  const host = document.createElement('div');
  host.className = 'de-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title row
  const title = document.createElement('div');
  title.className = 'de-title';
  const badge = document.createElement('span');
  badge.className = 'de-badge';
  badge.textContent = 'Desktop Entry';
  title.appendChild(badge);
  if (entry.Type) {
    const tb = document.createElement('span');
    tb.className = 'de-type-badge';
    tb.textContent = entry.Type;
    title.appendChild(tb);
  }
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'de-sub';
  const parts = [];
  if (entry.Name) parts.push(entry.Name);
  if (entry.GenericName) parts.push(entry.GenericName);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Main info table
  const sec = document.createElement('div');
  sec.className = 'de-section';
  const h3 = document.createElement('h3');
  h3.textContent = 'Entry Details';
  sec.appendChild(h3);

  const table = document.createElement('table');
  table.className = 'de-table';
  const tbody = document.createElement('tbody');

  const rows = [];

  if (entry.Name) rows.push(['Name', entry.Name]);
  if (entry.GenericName) rows.push(['Generic Name', entry.GenericName]);
  if (entry.Comment) rows.push(['Comment', entry.Comment]);
  if (entry.Icon) rows.push(['Icon', entry.Icon]);
  if (entry.StartupWMClass) rows.push(['Startup WM Class', entry.StartupWMClass]);

  if (entry.Exec) {
    rows.push(['Exec', { exec: entry.Exec }]);
  }

  // Terminal flag
  if (entry.Terminal !== undefined) {
    rows.push(['Terminal', { flag: entry.Terminal.toLowerCase() === 'true' }]);
  }

  // NoDisplay / Hidden
  if (entry.NoDisplay !== undefined) {
    rows.push(['NoDisplay', { warn: entry.NoDisplay.toLowerCase() === 'true', label: entry.NoDisplay }]);
  }
  if (entry.Hidden !== undefined) {
    rows.push(['Hidden', { warn: entry.Hidden.toLowerCase() === 'true', label: entry.Hidden }]);
  }

  if (entry.OnlyShowIn) rows.push(['OnlyShowIn', entry.OnlyShowIn]);
  if (entry.NotShowIn) rows.push(['NotShowIn', entry.NotShowIn]);

  for (const [key, val] of rows) {
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    td1.textContent = key;
    const td2 = document.createElement('td');

    if (val && typeof val === 'object' && 'exec' in val) {
      const span = document.createElement('code');
      span.className = 'de-exec';
      span.textContent = val.exec;
      td2.appendChild(span);
    } else if (val && typeof val === 'object' && 'flag' in val) {
      const span = document.createElement('span');
      span.className = val.flag ? 'de-flag de-flag-on' : 'de-flag de-flag-off';
      span.textContent = val.flag ? 'true' : 'false';
      td2.appendChild(span);
    } else if (val && typeof val === 'object' && 'warn' in val) {
      const span = document.createElement('span');
      span.className = val.warn ? 'de-flag de-flag-warn' : 'de-flag de-flag-off';
      span.textContent = val.label;
      td2.appendChild(span);
    } else {
      td2.textContent = String(val);
    }

    tr.appendChild(td1);
    tr.appendChild(td2);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  sec.appendChild(table);
  host.appendChild(sec);

  // Categories pills
  const cats = makePills(entry.Categories);
  if (cats) {
    const csec = document.createElement('div');
    csec.className = 'de-section';
    const ch3 = document.createElement('h3');
    ch3.textContent = 'Categories';
    csec.appendChild(ch3);
    const pills = document.createElement('div');
    pills.className = 'de-pills';
    for (const c of cats) {
      const p = document.createElement('span');
      p.className = 'de-pill';
      p.textContent = c;
      pills.appendChild(p);
    }
    csec.appendChild(pills);
    host.appendChild(csec);
  }

  // MimeType pills
  const mimes = makePills(entry.MimeType);
  if (mimes) {
    const msec = document.createElement('div');
    msec.className = 'de-section';
    const mh3 = document.createElement('h3');
    mh3.textContent = 'MIME Types';
    msec.appendChild(mh3);
    const pills = document.createElement('div');
    pills.className = 'de-pills';
    for (const m of mimes) {
      const p = document.createElement('span');
      p.className = 'de-pill';
      p.textContent = m;
      pills.appendChild(p);
    }
    msec.appendChild(pills);
    host.appendChild(msec);
  }

  // Keywords pills
  const kws = makePills(entry.Keywords);
  if (kws) {
    const ksec = document.createElement('div');
    ksec.className = 'de-section';
    const kh3 = document.createElement('h3');
    kh3.textContent = 'Keywords';
    ksec.appendChild(kh3);
    const pills = document.createElement('div');
    pills.className = 'de-pills';
    for (const k of kws) {
      const p = document.createElement('span');
      p.className = 'de-pill';
      p.textContent = k;
      pills.appendChild(p);
    }
    ksec.appendChild(pills);
    host.appendChild(ksec);
  }

  return { parentNode: host };
}
