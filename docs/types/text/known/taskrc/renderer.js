// Taskwarrior .taskrc renderer.
// Parses key=value config, #comments, and include directives.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.taskrccfg-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.taskrccfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#c0a000;color:#fff;vertical-align:middle;margin-right:8px}
.taskrccfg-title{font-size:18px;font-weight:700;margin:0 0 4px}
.taskrccfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.taskrccfg-sec{margin:14px 0}
.taskrccfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.taskrccfg-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.taskrccfg-chip{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.taskrccfg-chip-green{background:#dcfce7;border-color:#86efac;color:#15803d}
.taskrccfg-chip-blue{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
.taskrccfg-chip-gray{background:#f3f4f6;border-color:#d1d5db;color:#4b5563}
.taskrccfg-chip-gold{background:#fef9c3;border-color:#fde047;color:#854d0e}
.taskrccfg-chip-red{background:#fee2e2;border-color:#fca5a5;color:#b91c1c}
.taskrccfg-table{width:100%;border-collapse:collapse;font-size:13px}
.taskrccfg-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.taskrccfg-table td{padding:5px 8px;border-bottom:1px solid var(--border,#f0f0f0);vertical-align:top}
.taskrccfg-table tr:last-child td{border-bottom:none}
.taskrccfg-key{font:13px/1.4 ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f)}
.taskrccfg-val{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#666);word-break:break-all}
.taskrccfg-redacted{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);font-style:italic}
`;

function parseTaskrc(text) {
  const lines = text.split(/\r?\n/);
  const keys = new Map();
  const includes = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('include ')) {
      includes.push(line.slice(8).trim());
      continue;
    }

    const eq = line.indexOf('=');
    if (eq !== -1) {
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim();
      if (k && !keys.has(k)) keys.set(k, v);
    }
  }

  return { keys, includes };
}

export function render(intake) {
  const text = intake.text || '';
  const { keys, includes } = parseTaskrc(text);

  const parts = [];

  // Data card
  const dataRows = [];
  const dataLoc = keys.get('data.location');
  if (dataLoc) dataRows.push(`<tr><td class="taskrccfg-key">data.location</td><td><span class="taskrccfg-val">${esc(dataLoc)}</span></td></tr>`);
  const taskdServer = keys.get('taskd.server');
  if (taskdServer) dataRows.push(`<tr><td class="taskrccfg-key">taskd.server</td><td><span class="taskrccfg-val">${esc(taskdServer)}</span></td></tr>`);
  const taskdCert = keys.get('taskd.certificate');
  if (taskdCert) dataRows.push(`<tr><td class="taskrccfg-key">taskd.certificate</td><td><span class="taskrccfg-val">${esc(taskdCert)}</span></td></tr>`);
  const taskdKey = keys.get('taskd.key');
  if (taskdKey) dataRows.push(`<tr><td class="taskrccfg-key">taskd.key</td><td><span class="taskrccfg-val">${esc(taskdKey)}</span></td></tr>`);
  const taskdCa = keys.get('taskd.ca');
  if (taskdCa) dataRows.push(`<tr><td class="taskrccfg-key">taskd.ca</td><td><span class="taskrccfg-val">${esc(taskdCa)}</span></td></tr>`);
  if (keys.has('taskd.credentials')) dataRows.push(`<tr><td class="taskrccfg-key">taskd.credentials</td><td><span class="taskrccfg-redacted">[configured]</span></td></tr>`);
  if (dataRows.length) {
    parts.push(`<div class="taskrccfg-sec"><h3>Data &amp; Sync</h3><table class="taskrccfg-table"><tbody>${dataRows.join('')}</tbody></table></div>`);
  }

  // Date & Time card
  const dateChips = [];
  const dfmt = keys.get('dateformat');
  if (dfmt) dateChips.push(`<span class="taskrccfg-chip taskrccfg-chip-blue">dateformat: ${esc(dfmt)}</span>`);
  const dfmtR = keys.get('dateformat.report');
  if (dfmtR) dateChips.push(`<span class="taskrccfg-chip taskrccfg-chip-gray">dateformat.report: ${esc(dfmtR)}</span>`);
  const wkStart = keys.get('weekstart');
  if (wkStart) dateChips.push(`<span class="taskrccfg-chip taskrccfg-chip-gold">weekstart: ${esc(wkStart)}</span>`);
  const due = keys.get('due');
  if (due) dateChips.push(`<span class="taskrccfg-chip taskrccfg-chip-gray">due: ${esc(due)} days</span>`);
  if (dateChips.length) {
    parts.push(`<div class="taskrccfg-sec"><h3>Date &amp; Time</h3><div class="taskrccfg-chips">${dateChips.join('')}</div></div>`);
  }

  // Reports card
  const reportNames = new Set();
  for (const [k] of keys) {
    const m = k.match(/^report\.([^.]+)\.columns$/);
    if (m) reportNames.add(m[1]);
  }
  if (reportNames.size) {
    const reportChips = [...reportNames].map((n) => `<span class="taskrccfg-chip taskrccfg-chip-blue">${esc(n)}</span>`).join('');
    parts.push(`<div class="taskrccfg-sec"><h3>Custom Reports</h3><div class="taskrccfg-chips">${reportChips}</div></div>`);
  }

  // Urgency coefficients card
  const urgencyRows = [];
  for (const [k, v] of keys) {
    const m = k.match(/^urgency\.(.+)\.coefficient$/);
    if (m) {
      const factor = m[1];
      const num = parseFloat(v);
      const cls = num > 0 ? 'taskrccfg-chip-green' : num < 0 ? 'taskrccfg-chip-red' : 'taskrccfg-chip-gray';
      urgencyRows.push(`<tr><td class="taskrccfg-key">${esc(factor)}</td><td><span class="taskrccfg-chip ${cls}">${esc(v)}</span></td></tr>`);
    }
  }
  if (urgencyRows.length) {
    parts.push(`<div class="taskrccfg-sec"><h3>Urgency Coefficients</h3><table class="taskrccfg-table"><tbody>${urgencyRows.join('')}</tbody></table></div>`);
  }

  // Theme / Colors card
  const colorChips = [];
  const colorVal = keys.get('color');
  if (colorVal) {
    const on = colorVal.toLowerCase() === 'on';
    colorChips.push(`<span class="taskrccfg-chip ${on ? 'taskrccfg-chip-green' : 'taskrccfg-chip-gray'}">color: ${esc(colorVal)}</span>`);
  }
  const includeChips = includes.map((f) => `<span class="taskrccfg-chip taskrccfg-chip-gold">include: ${esc(f)}</span>`);
  const themeChips = [...colorChips, ...includeChips];
  if (themeChips.length) {
    parts.push(`<div class="taskrccfg-sec"><h3>Theme &amp; Colors</h3><div class="taskrccfg-chips">${themeChips.join('')}</div></div>`);
  }

  // Build subtitle
  const subParts = [];
  if (dataLoc) subParts.push(`data: ${dataLoc}`);
  if (urgencyRows.length) subParts.push(`${urgencyRows.length} urgency factor${urgencyRows.length !== 1 ? 's' : ''}`);
  if (reportNames.size) subParts.push(`${reportNames.size} custom report${reportNames.size !== 1 ? 's' : ''}`);
  const sub = subParts.join(' · ') || 'Taskwarrior configuration';

  const host = document.createElement('div');
  host.className = 'taskrccfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="taskrccfg-title"><span class="taskrccfg-badge">Taskwarrior</span>Taskwarrior Config</div>
<div class="taskrccfg-sub">${esc(sub)}</div>
${parts.join('')}`;

  return { parentNode: host };
}
