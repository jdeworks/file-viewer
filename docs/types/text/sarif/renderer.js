function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const SEVERITY_ORDER = ['error', 'warning', 'note', 'none'];
const SEVERITY_COLORS = {
  error: { bg: '#ffebee', border: '#c62828', text: '#b71c1c', badge: '#c62828' },
  warning: { bg: '#fff8e1', border: '#f57f17', text: '#e65100', badge: '#f57f17' },
  note: { bg: '#e3f2fd', border: '#1565c0', text: '#0d47a1', badge: '#1565c0' },
  none: { bg: '#f5f5f5', border: '#9e9e9e', text: '#616161', badge: '#757575' },
};

export function render(intake) {
  const src = intake.text || intake.textSample || '';
  let sarif;
  try { sarif = JSON.parse(src); } catch { return { bodyHtml: '<p style="color:#c62828">Invalid SARIF JSON</p>', hadUnsafe: false }; }

  const runs = Array.isArray(sarif.runs) ? sarif.runs : [];
  const version = sarif.version || '?';

  const allResults = [];
  const tools = [];
  for (const run of runs) {
    const toolName = run?.tool?.driver?.name || 'Unknown';
    const toolVersion = run?.tool?.driver?.version || '';
    tools.push(toolVersion ? `${toolName} ${toolVersion}` : toolName);
    const rules = {};
    for (const rule of (run?.tool?.driver?.rules || [])) {
      rules[rule.id] = rule;
    }
    for (const result of (run?.results || [])) {
      const loc = result?.locations?.[0]?.physicalLocation;
      const file = loc?.artifactLocation?.uri || '';
      const line = loc?.region?.startLine || null;
      const severity = (result.level || 'warning').toLowerCase();
      const ruleId = result.ruleId || '';
      const msg = result.message?.text || result.message?.markdown || '';
      allResults.push({ severity, ruleId, msg, file, line, toolName });
    }
  }

  // Count by severity
  const counts = {};
  for (const r of allResults) counts[r.severity] = (counts[r.severity] || 0) + 1;

  const summaryBadges = SEVERITY_ORDER
    .filter(s => counts[s])
    .map(s => {
      const c = SEVERITY_COLORS[s] || SEVERITY_COLORS.none;
      return `<span class="sarif-sev-badge" style="background:${c.badge};color:#fff">${counts[s]} ${s}</span>`;
    }).join(' ');

  // Top findings table (first 20)
  const shown = allResults.slice(0, 20);
  const rows = shown.map(r => {
    const c = SEVERITY_COLORS[r.severity] || SEVERITY_COLORS.none;
    const loc = r.file ? `${esc(r.file.split('/').pop())}${r.line ? ':' + r.line : ''}` : '';
    return `<tr style="background:${c.bg}">
      <td><span class="sarif-level" style="background:${c.badge};color:#fff">${esc(r.severity)}</span></td>
      <td><code style="font-size:0.8rem">${esc(r.ruleId)}</code></td>
      <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.msg)}">${esc(r.msg.slice(0, 120))}${r.msg.length > 120 ? '…' : ''}</td>
      <td style="font-size:0.8rem;color:#546e7a">${loc}</td>
    </tr>`;
  }).join('');

  const overviewHtml = `
    <div class="meta-row"><span class="meta-key">SARIF version</span><span class="meta-val">${esc(version)}</span></div>
    <div class="meta-row"><span class="meta-key">Runs</span><span class="meta-val">${runs.length}</span></div>
    <div class="meta-row"><span class="meta-key">Tool(s)</span><span class="meta-val">${tools.map(esc).join(', ') || '—'}</span></div>
    <div class="meta-row"><span class="meta-key">Total findings</span><span class="meta-val">${allResults.length}</span></div>
    <div class="meta-row"><span class="meta-key">By severity</span><span class="meta-val">${summaryBadges || '—'}</span></div>
  `;

  return {
    bodyHtml: `
      <style>
        .badge-sarif { background: #b71c1c; color: #fff; }
        .sarif-sev-badge { display:inline-block; border-radius:3px; padding:2px 8px; font-size:0.82rem; margin:2px; font-weight:bold; }
        .sarif-level { display:inline-block; border-radius:3px; padding:1px 6px; font-size:0.78rem; font-weight:bold; }
        .sarif-table { width:100%; border-collapse:collapse; font-size:0.85rem; }
        .sarif-table th { text-align:left; padding:6px 8px; background:#eceff1; font-weight:600; }
        .sarif-table td { padding:5px 8px; border-bottom:1px solid #f0f0f0; vertical-align:top; }
      </style>
      <div class="badge-row"><span class="badge badge-sarif">SARIF</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">Overview</h4>
        ${overviewHtml}
      </div>
      ${rows ? `<div class="meta-section">
        <h4 class="meta-section-title">Findings${allResults.length > 20 ? ' (first 20 of ' + allResults.length + ')' : ''}</h4>
        <table class="sarif-table">
          <thead><tr><th>Level</th><th>Rule</th><th>Message</th><th>Location</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>` : '<p style="color:#388e3c;padding:8px">No findings — clean scan!</p>'}
    `,
    hadUnsafe: false,
  };
}
