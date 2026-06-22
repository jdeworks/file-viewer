import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ansi-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-ansi{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e00;color:#fff;vertical-align:middle;margin-right:8px;}
.ansi-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ansi-meta{font-size:12px;color:var(--fg-2,#888);margin-bottom:14px;}
.ansi-groups{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;}
.ansi-group-chip{font-size:12px;padding:2px 10px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;font-weight:600;}
.ansi-group{margin:10px 0;border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px 14px;}
.ansi-group-name{font-size:15px;font-weight:600;margin-bottom:8px;}
.ansi-section-label{font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:var(--fg-2,#888);margin:8px 0 4px;}
.ansi-hosts-table{width:100%;border-collapse:collapse;font-size:12px;}
.ansi-hosts-table th{text-align:left;padding:3px 8px;background:var(--bg-2,#f6f8fa);border-bottom:1px solid var(--border,#e0e0e0);font-weight:600;}
.ansi-hosts-table td{padding:3px 8px;border-bottom:1px solid var(--border,#e8e8e8);font-family:ui-monospace,monospace;}
.ansi-hosts-table tr:last-child td{border-bottom:none;}
.ansi-vars-list{display:flex;flex-direction:column;gap:2px;margin-top:4px;}
.ansi-var-row{font:12px ui-monospace,monospace;display:flex;gap:8px;}
.ansi-var-key{color:#0550ae;font-weight:600;}
.ansi-var-val{color:var(--fg,#24292f);}
.ansi-global-vars{margin-top:12px;border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px 14px;background:var(--bg-2,#f6f8fa);}
`;

function collectHosts(node, depth) {
  if (!node || typeof node !== 'object') return [];
  const hosts = [];
  if (node.hosts && typeof node.hosts === 'object') {
    for (const [hostname, vars] of Object.entries(node.hosts)) {
      hosts.push({ hostname, vars: vars || {} });
    }
  }
  return hosts;
}

function renderGroupSection(groupName, groupData) {
  const hosts = collectHosts(groupData, 0);
  const groupVars = groupData.vars || {};

  const hostsHtml = hosts.length
    ? `<div class="ansi-section-label">Hosts (${hosts.length})</div>
<table class="ansi-hosts-table">
<thead><tr><th>Hostname</th><th>ansible_host</th><th>ansible_user</th></tr></thead>
<tbody>
${hosts.map((h) => `<tr>
  <td>${esc(h.hostname)}</td>
  <td>${h.vars.ansible_host != null ? esc(h.vars.ansible_host) : '<span style="color:var(--fg-2,#888)">—</span>'}</td>
  <td>${h.vars.ansible_user != null ? esc(h.vars.ansible_user) : '<span style="color:var(--fg-2,#888)">—</span>'}</td>
</tr>`).join('')}
</tbody>
</table>` : '';

  const groupVarEntries = Object.entries(groupVars);
  const varsHtml = groupVarEntries.length
    ? `<div class="ansi-section-label">Group Vars (${groupVarEntries.length})</div>
<div class="ansi-vars-list">
${groupVarEntries.map(([k, v]) => `<div class="ansi-var-row"><span class="ansi-var-key">${esc(k)}</span><span style="color:var(--fg-2,#888)">:</span><span class="ansi-var-val">${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</span></div>`).join('')}
</div>` : '';

  if (!hostsHtml && !varsHtml) return '';

  return `<div class="ansi-group">
<div class="ansi-group-name">${esc(groupName)}</div>
${hostsHtml}
${varsHtml}
</div>`;
}

export async function render(intake) {
  const text = intake.text || '';
  const host = document.createElement('div');
  host.className = 'ansi-doc';

  let data = null;
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    data = jsyaml.load(text);
  } catch (e) {
    host.innerHTML = `<style>${CSS}</style><p style="color:#c00">YAML parse error: ${esc(e.message)}</p>`;
    return { parentNode: host };
  }

  if (!data || typeof data !== 'object') {
    host.innerHTML = `<style>${CSS}</style><p style="color:var(--fg-2,#888)">No inventory data found.</p>`;
    return { parentNode: host };
  }

  // Count all hosts recursively
  let totalHosts = 0;
  const countHosts = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.hosts && typeof node.hosts === 'object') totalHosts += Object.keys(node.hosts).length;
    if (node.children && typeof node.children === 'object') {
      for (const child of Object.values(node.children)) countHosts(child);
    }
  };
  countHosts(data);

  // Top-level groups
  const allData = data.all || data;
  const children = allData.children || {};
  const globalVars = allData.vars || {};
  const groupNames = Object.keys(children);

  const groupChips = groupNames.length
    ? `<div class="ansi-groups">${groupNames.map((g) => `<span class="ansi-group-chip">${esc(g)}</span>`).join('')}</div>` : '';

  const groupSections = groupNames.map((g) => renderGroupSection(g, children[g])).join('');

  const globalVarEntries = Object.entries(globalVars);
  const globalVarsHtml = globalVarEntries.length
    ? `<div class="ansi-global-vars">
<div class="ansi-section-label">Global Vars (${globalVarEntries.length})</div>
<div class="ansi-vars-list">
${globalVarEntries.map(([k, v]) => `<div class="ansi-var-row"><span class="ansi-var-key">${esc(k)}</span><span style="color:var(--fg-2,#888)">:</span><span class="ansi-var-val">${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</span></div>`).join('')}
</div>
</div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-ansi">Ansible</span>
  <span class="ansi-title">Inventory</span>
</div>
<div class="ansi-meta">${groupNames.length} group${groupNames.length !== 1 ? 's' : ''} · ${totalHosts} host${totalHosts !== 1 ? 's' : ''}</div>
${groupChips}
${groupSections}
${globalVarsHtml}`;

  return { parentNode: host };
}
