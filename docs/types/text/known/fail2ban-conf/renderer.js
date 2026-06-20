const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.f2b-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.f2b-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#CC0000;color:#fff;vertical-align:middle;margin-right:8px;}
.f2b-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.f2b-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.f2b-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:12px 16px;margin-bottom:12px;}
.f2b-card-hd{font-family:ui-monospace,monospace;font-size:13px;font-weight:700;color:var(--fg,#24292f);margin:0 0 8px;padding-bottom:6px;border-bottom:1px solid var(--border,#e0e0e0);display:flex;align-items:center;gap:8px;}
.f2b-table{width:100%;border-collapse:collapse;font-size:13px;}
.f2b-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.f2b-table tr:last-child td{border-bottom:none;}
.f2b-table td:first-child{color:var(--fg-2,#666);width:35%;white-space:nowrap;font-family:ui-monospace,monospace;font-size:12px;}
.f2b-val{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg,#24292f);word-break:break-word;}
.f2b-jails-hd{font-size:14px;font-weight:700;margin:16px 0 8px;color:var(--fg,#24292f);}
.f2b-jail{border:1px solid var(--border,#e0e0e0);border-radius:6px;margin-bottom:8px;overflow:hidden;}
.f2b-jail-hd{padding:8px 12px;background:var(--bg-2,#f6f8fa);font-family:ui-monospace,monospace;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;}
.f2b-status-on{display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:700;background:#d4edda;color:#155724;border:1px solid #c3e6cb;}
.f2b-status-off{display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:700;background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;}
.f2b-jail-body{padding:8px 12px;}
.f2b-jail-table{width:100%;border-collapse:collapse;font-size:12px;}
.f2b-jail-table td{padding:3px 8px 3px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.f2b-jail-table tr:last-child td{border-bottom:none;}
.f2b-jail-table td:first-child{color:var(--fg-2,#666);width:35%;white-space:nowrap;font-family:ui-monospace,monospace;}
.f2b-jail-val{font-family:ui-monospace,monospace;color:var(--fg,#24292f);word-break:break-word;}
.f2b-empty{color:var(--fg-2,#888);font-size:12px;font-style:italic;}
`;

const DEFAULT_KEYS = ['bantime', 'findtime', 'maxretry', 'backend', 'banaction', 'ignoreip'];
const JAIL_KEYS = ['enabled', 'port', 'filter', 'logpath', 'maxretry', 'bantime'];

function parseIni(text) {
  const sections = new Map();
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const secMatch = line.match(/^\[([^\]]+)\]$/);
    if (secMatch) {
      current = secMatch[1];
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    const kvMatch = line.match(/^([^=]+?)\s*=\s*(.*)$/);
    if (kvMatch && current) {
      sections.get(current).push([kvMatch[1].trim(), kvMatch[2].trim()]);
    }
  }
  return sections;
}

function getVal(entries, key) {
  const found = entries.find(([k]) => k.toLowerCase() === key.toLowerCase());
  return found ? found[1] : null;
}

function formatBantime(s) {
  if (!s) return s;
  const n = parseInt(s, 10);
  if (isNaN(n)) return s;
  if (n < 0) return s + ' (permanent)';
  if (n === 0) return s;
  if (n >= 86400) return s + ` (${Math.round(n / 86400)}d)`;
  if (n >= 3600) return s + ` (${Math.round(n / 3600)}h)`;
  if (n >= 60) return s + ` (${Math.round(n / 60)}m)`;
  return s + 's';
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const sections = parseIni(text);

  // DEFAULT section
  const defaultEntries = sections.get('DEFAULT') || [];
  const defaultRows = DEFAULT_KEYS
    .map((k) => {
      const v = getVal(defaultEntries, k);
      if (v == null) return null;
      const display = (k === 'bantime' || k === 'findtime') ? formatBantime(v) : v;
      return `<tr><td>${esc(k)}</td><td><span class="f2b-val">${esc(display)}</span></td></tr>`;
    })
    .filter(Boolean)
    .join('');

  const defaultCard = `<div class="f2b-card">
<div class="f2b-card-hd">[DEFAULT] — Global Defaults</div>
${defaultRows ? `<table class="f2b-table"><tbody>${defaultRows}</tbody></table>` : '<p class="f2b-empty">No default settings.</p>'}
</div>`;

  // Jail sections (everything except DEFAULT)
  const jailNames = [...sections.keys()].filter((s) => s !== 'DEFAULT');
  let enabledCount = 0;
  let disabledCount = 0;

  const jailsHtml = jailNames.map((name) => {
    const entries = sections.get(name);
    const enabledVal = getVal(entries, 'enabled');
    const isEnabled = enabledVal === null || enabledVal === 'true' || enabledVal === '1' || enabledVal === 'yes';
    if (isEnabled) enabledCount++; else disabledCount++;

    const statusChip = isEnabled
      ? '<span class="f2b-status-on">enabled</span>'
      : '<span class="f2b-status-off">disabled</span>';

    const rows = JAIL_KEYS
      .filter((k) => k !== 'enabled')
      .map((k) => {
        const v = getVal(entries, k);
        if (v == null) return null;
        const display = (k === 'bantime') ? formatBantime(v) : v;
        return `<tr><td>${esc(k)}</td><td><span class="f2b-jail-val">${esc(display)}</span></td></tr>`;
      })
      .filter(Boolean)
      .join('');

    return `<div class="f2b-jail">
<div class="f2b-jail-hd"><span>[${esc(name)}]</span>${statusChip}</div>
${rows ? `<div class="f2b-jail-body"><table class="f2b-jail-table"><tbody>${rows}</tbody></table></div>` : ''}
</div>`;
  }).join('');

  const jailsSection = jailNames.length
    ? `<div class="f2b-jails-hd">Jails (${enabledCount} enabled, ${disabledCount} disabled)</div>${jailsHtml}`
    : '<p class="f2b-empty">No jail sections found.</p>';

  const host = document.createElement('div');
  host.className = 'f2b-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="f2b-title"><span class="f2b-badge">Fail2ban</span>Jail Configuration</div>
<div class="f2b-sub">${jailNames.length} jail${jailNames.length !== 1 ? 's' : ''} · ${enabledCount} enabled</div>
${defaultCard}
${jailsSection}`;

  return { parentNode: host };
}
