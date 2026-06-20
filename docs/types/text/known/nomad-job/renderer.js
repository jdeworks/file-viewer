const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nj-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.nj-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00BC7D;color:#fff;vertical-align:middle;margin-right:8px}
.nj-title{font-size:18px;font-weight:700;margin:0 0 4px}
.nj-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.nj-sec{margin:14px 0}
.nj-sec h3{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;font-weight:600}
.nj-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.nj-card-title{font-size:13px;font-weight:600;margin:0 0 8px;color:var(--fg,#24292f);display:flex;align-items:center;gap:6px}
.nj-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.nj-row:last-child{border-bottom:none}
.nj-key{color:var(--fg-2,#888);min-width:120px;flex-shrink:0;font-size:12px}
.nj-val{font-family:ui-monospace,monospace;word-break:break-all}
.nj-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:var(--bg-2,#f0f0f0);border:1px solid var(--border,#e0e0e0);color:var(--fg,#333);margin:1px 2px 1px 0}
.nj-type-service{background:#dbeafe;border-color:#93c5fd;color:#1d4ed8}
.nj-type-batch{background:#ffedd5;border-color:#fdba74;color:#c2410c}
.nj-type-system{background:#ede9fe;border-color:#c4b5fd;color:#6d28d9}
.nj-dc-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 3px 2px 0}
.nj-svc-chip{display:inline-block;font-size:12px;padding:2px 9px;border-radius:6px;background:#dcfce7;border:1px solid #86efac;color:#15803d;font-family:ui-monospace,monospace;margin:2px 3px 2px 0}
.nj-tbl{width:100%;border-collapse:collapse;font-size:13px}
.nj-tbl td{padding:5px 12px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.nj-tbl tr:last-child td{border-bottom:none}
.nj-label{color:var(--fg-2,#888);font-size:12px;white-space:nowrap;min-width:120px}
`;

function extract(text, pattern) {
  const m = text.match(pattern);
  return m ? m[1] : null;
}

export async function render(intake) {
  const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');

  // Job name
  const jobName = extract(text, /job\s+"([^"]+)"/);

  // Job type
  const jobType = extract(text, /type\s*=\s*"([^"]+)"/);

  // Datacenters
  const dcMatch = text.match(/datacenters\s*=\s*\[([^\]]+)\]/);
  const datacenters = dcMatch
    ? dcMatch[1].match(/"([^"]+)"/g)?.map((s) => s.replace(/"/g, '')) || []
    : [];

  // Resources (first occurrence)
  const cpu = extract(text, /cpu\s*=\s*(\d+)/);
  const memory = extract(text, /memory\s*=\s*(\d+)/);

  // Task groups: find each `group "name" {` block
  const groupRe = /group\s+"([^"]+)"\s*\{/g;
  const groups = [];
  let gm;
  while ((gm = groupRe.exec(text)) !== null) {
    const groupName = gm[1];
    // Extract a reasonable slice after the group opening brace to find count and driver
    const slice = text.slice(gm.index, gm.index + 2000);
    const count = extract(slice, /count\s*=\s*(\d+)/);
    const driver = extract(slice, /driver\s*=\s*"([^"]+)"/);
    groups.push({ name: groupName, count: count || '1', driver: driver || null });
  }

  // Services: find all `service { ... name = "..." }` patterns
  const svcRe = /service\s*\{[^}]*name\s*=\s*"([^"]+)"/gs;
  const services = [];
  let sm;
  while ((sm = svcRe.exec(text)) !== null) {
    services.push(sm[1]);
  }

  // Build type badge class
  const typeBadgeClass = jobType === 'service'
    ? 'nj-chip nj-type-service'
    : jobType === 'batch'
      ? 'nj-chip nj-type-batch'
      : jobType === 'system'
        ? 'nj-chip nj-type-system'
        : 'nj-chip';

  // Datacenters section
  const dcsHtml = datacenters.length
    ? `<div class="nj-sec"><h3>Datacenters (${datacenters.length})</h3><div>${datacenters.map((dc) => `<span class="nj-dc-chip">${esc(dc)}</span>`).join('')}</div></div>`
    : '';

  // Task groups section
  const groupsHtml = groups.length
    ? `<div class="nj-sec"><h3>Task Groups (${groups.length})</h3>${groups.map((g) => `
<div class="nj-card">
  <div class="nj-card-title">${esc(g.name)}</div>
  <table class="nj-tbl">
    <tr><td class="nj-label">count</td><td class="nj-val">${esc(g.count)}</td></tr>
    ${g.driver ? `<tr><td class="nj-label">driver</td><td class="nj-val">${esc(g.driver)}</td></tr>` : ''}
  </table>
</div>`).join('')}</div>`
    : '';

  // Resources section
  const resourcesHtml = (cpu || memory)
    ? `<div class="nj-sec"><h3>Resources</h3><div class="nj-card"><table class="nj-tbl">
    ${cpu ? `<tr><td class="nj-label">CPU</td><td class="nj-val">${esc(cpu)} MHz</td></tr>` : ''}
    ${memory ? `<tr><td class="nj-label">Memory</td><td class="nj-val">${esc(memory)} MB</td></tr>` : ''}
  </table></div></div>`
    : '';

  // Services section
  const servicesHtml = services.length
    ? `<div class="nj-sec"><h3>Services (${services.length})</h3><div>${services.map((s) => `<span class="nj-svc-chip">${esc(s)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'nj-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="nj-title"><span class="nj-badge">Nomad Job</span>${esc(jobName || 'Nomad Job')}</div>
<div class="nj-sub">${jobType ? `<span class="${typeBadgeClass}">${esc(jobType)}</span>` : ''}HashiCorp Nomad job specification</div>
${dcsHtml}
${groupsHtml}
${resourcesHtml}
${servicesHtml}`;

  return { parentNode: host };
}
