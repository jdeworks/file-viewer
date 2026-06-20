const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sysd-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sysd-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5F4B8B;color:#fff;vertical-align:middle;margin-right:8px;}
.sysd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sysd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.sysd-chip{display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;background:var(--bg-2,#f3f0f9);color:#5F4B8B;border:1px solid #c9b8e8;}
.sysd-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:12px 16px;margin-bottom:10px;}
.sysd-card-hd{font-family:ui-monospace,monospace;font-size:13px;font-weight:700;color:var(--fg,#24292f);margin:0 0 8px;padding-bottom:6px;border-bottom:1px solid var(--border,#e0e0e0);}
.sysd-table{width:100%;border-collapse:collapse;font-size:13px;}
.sysd-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.sysd-table tr:last-child td{border-bottom:none;}
.sysd-table td:first-child{color:var(--fg-2,#666);width:30%;white-space:nowrap;font-family:ui-monospace,monospace;font-size:12px;}
.sysd-val{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg,#24292f);word-break:break-all;}
.sysd-val-env{font-family:ui-monospace,monospace;font-size:12px;color:#6f42c1;word-break:break-all;}
.sysd-empty{color:var(--fg-2,#888);font-size:12px;font-style:italic;}
`;

// Fields to show per section
const SECTION_FIELDS = {
  Unit: ['Description', 'Documentation', 'After', 'Requires', 'Wants', 'ConditionPathExists'],
  Service: ['Type', 'ExecStart', 'ExecReload', 'ExecStop', 'User', 'Group', 'WorkingDirectory', 'Restart', 'RestartSec', 'Environment', 'EnvironmentFile'],
  Timer: ['OnCalendar', 'OnBootSec', 'OnUnitActiveSec', 'Persistent'],
  Socket: ['ListenStream', 'ListenDatagram', 'ListenSequentialPacket', 'Accept', 'SocketUser', 'SocketGroup'],
  Install: ['WantedBy', 'RequiredBy'],
};

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

function detectUnitType(sections) {
  if (sections.has('Service')) return 'service';
  if (sections.has('Timer')) return 'timer';
  if (sections.has('Socket')) return 'socket';
  if (sections.has('Mount')) return 'mount';
  if (sections.has('Target')) return 'target';
  if (sections.has('Path')) return 'path';
  if (sections.has('Scope')) return 'scope';
  if (sections.has('Slice')) return 'slice';
  return 'unit';
}

function renderSection(name, entries) {
  const allowedFields = SECTION_FIELDS[name];
  // If we have an allowlist, filter to it; otherwise show all
  const rows = (allowedFields
    ? entries.filter(([k]) => allowedFields.includes(k))
    : entries
  );

  if (!rows.length) return '';

  const isEnvKey = (k) => k === 'Environment' || k === 'EnvironmentFile';
  const trs = rows.map(([k, v]) => {
    const valClass = isEnvKey(k) ? 'sysd-val-env' : 'sysd-val';
    return `<tr><td>${esc(k)}</td><td><span class="${valClass}">${esc(v)}</span></td></tr>`;
  }).join('');

  return `<div class="sysd-card">
<div class="sysd-card-hd">[${esc(name)}]</div>
<table class="sysd-table"><tbody>${trs}</tbody></table>
</div>`;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const sections = parseIni(text);
  const unitType = detectUnitType(sections);

  const description = (sections.get('Unit') || []).find(([k]) => k === 'Description');
  const descText = description ? description[1] : '';

  // Render known sections in order
  const sectionOrder = ['Unit', 'Service', 'Timer', 'Socket', 'Mount', 'Target', 'Path', 'Scope', 'Slice', 'Install'];
  const cardsHtml = sectionOrder
    .filter((s) => sections.has(s))
    .map((s) => renderSection(s, sections.get(s)))
    .filter(Boolean)
    .join('');

  const host = document.createElement('div');
  host.className = 'sysd-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="sysd-title"><span class="sysd-badge">systemd</span>${esc(descText) || 'systemd Unit'}</div>
<div class="sysd-sub">
  <span class="sysd-chip">${esc(unitType)}</span>
  <span>${sections.size} section${sections.size !== 1 ? 's' : ''}</span>
</div>
${cardsHtml || '<p class="sysd-empty">No recognized sections found.</p>'}`;

  return { parentNode: host };
}
