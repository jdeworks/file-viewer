const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pghba-doc{padding:16px 18px;max-width:960px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-pghba{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#336791;color:#fff;vertical-align:middle;margin-right:8px}
.pghba-title{font-size:18px;font-weight:700;margin:0 0 4px;display:flex;align-items:center}
.pghba-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.pghba-sec{margin:14px 0}
.pghba-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.pghba-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;background:var(--bg,#fff);overflow:hidden}
.pghba-table{width:100%;border-collapse:collapse;font-size:12px}
.pghba-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:6px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa)}
.pghba-table td{padding:5px 10px;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;vertical-align:top}
.pghba-table tr:last-child td{border-bottom:none}
.pghba-method{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px}
.pghba-method.trust{background:#fef9c3;border:1px solid #fde047;color:#854d0e}
.pghba-method.reject{background:#fee2e2;border:1px solid #fca5a5;color:#991b1b}
.pghba-method.scram{background:#dcfce7;border:1px solid #86efac;color:#166534}
.pghba-method.md5{background:#dcfce7;border:1px solid #86efac;color:#166534}
.pghba-method.peer{background:#dbeafe;border:1px solid #93c5fd;color:#1e40af}
.pghba-method.ident{background:#dbeafe;border:1px solid #93c5fd;color:#1e40af}
.pghba-method.password{background:#fef9c3;border:1px solid #fde047;color:#854d0e}
.pghba-method.other{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg,#24292f)}
.pghba-type-local{color:var(--fg-2,#888)}
.pghba-summary{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.pghba-stat{font-size:12px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0)}
`;

/**
 * Parse a pg_hba.conf line into its fields.
 * Format: TYPE DATABASE USER ADDRESS METHOD [options]
 * local connections have no ADDRESS field.
 */
function parseLine(line) {
  // Strip inline comments (after the method field)
  const noComment = line.replace(/#.*$/, '').trim();
  if (!noComment) return null;
  const parts = noComment.split(/\s+/);
  if (parts.length < 4) return null;
  const type = parts[0].toLowerCase();
  const database = parts[1];
  const user = parts[2];
  let address = '';
  let method = '';
  let options = '';
  if (type === 'local') {
    // local: TYPE DATABASE USER METHOD [options]
    method = parts[3].toLowerCase();
    options = parts.slice(4).join(' ');
  } else {
    // host/hostssl/hostnossl/hostgssenc/hostnogssenc: TYPE DATABASE USER ADDRESS METHOD [options]
    if (parts.length < 5) return null;
    address = parts[3];
    method = parts[4].toLowerCase();
    options = parts.slice(5).join(' ');
  }
  return { type, database, user, address, method, options };
}

function methodClass(method) {
  if (method === 'trust') return 'trust';
  if (method === 'reject') return 'reject';
  if (method === 'scram-sha-256') return 'scram';
  if (method === 'md5') return 'md5';
  if (method === 'peer') return 'peer';
  if (method === 'ident') return 'ident';
  if (method === 'password') return 'password';
  return 'other';
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const lines = (text || '').split('\n');

  const entries = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const entry = parseLine(line);
    if (entry) entries.push(entry);
  }

  // Summary stats
  const methodCounts = {};
  for (const e of entries) {
    methodCounts[e.method] = (methodCounts[e.method] || 0) + 1;
  }

  const summaryHtml = entries.length
    ? `<div class="pghba-summary">
<span class="pghba-stat">${entries.length} rule${entries.length !== 1 ? 's' : ''}</span>
${Object.entries(methodCounts).sort((a, b) => b[1] - a[1]).map(([m, n]) => `<span class="pghba-stat pghba-method ${methodClass(m)}" style="border-radius:6px">${esc(m)}: ${n}</span>`).join('')}
</div>`
    : '';

  const tableHtml = entries.length
    ? `<div class="pghba-sec"><h3>Rules (${entries.length})</h3><div class="pghba-card">
<table class="pghba-table"><thead><tr>
<th>Type</th><th>Database</th><th>User</th><th>Address</th><th>Method</th>
</tr></thead><tbody>
${entries.map((e) => `<tr>
<td class="${e.type === 'local' ? 'pghba-type-local' : ''}">${esc(e.type)}</td>
<td>${esc(e.database)}</td>
<td>${esc(e.user)}</td>
<td>${esc(e.address || '—')}</td>
<td><span class="pghba-method ${methodClass(e.method)}">${esc(e.method)}</span>${e.options ? ` <span style="color:var(--fg-2,#888);font-size:11px">${esc(e.options)}</span>` : ''}</td>
</tr>`).join('')}
</tbody></table>
</div></div>`
    : '<div style="color:var(--fg-2,#888);font-size:13px;padding:8px 0">No authentication rules found.</div>';

  const host = document.createElement('div');
  host.className = 'pghba-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="pghba-title"><span class="badge-pghba">PostgreSQL Auth</span>pg_hba.conf</div>
<div class="pghba-sub">Host-based authentication configuration</div>
${summaryHtml}
${tableHtml}`;

  return { parentNode: host };
}
