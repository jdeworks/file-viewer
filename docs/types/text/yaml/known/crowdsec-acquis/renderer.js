import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.caquis-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-caquis{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1e3a5f;color:#fff;vertical-align:middle;margin-right:8px;}
.caquis-title{font-size:18px;font-weight:700;margin:0 0 2px;}
.caquis-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.caquis-table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px;}
.caquis-table th{text-align:left;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);color:var(--fg-2,#888);font-weight:600;background:var(--bg-2,#f6f8fa);}
.caquis-table td{padding:5px 10px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.caquis-table tr:last-child td{border-bottom:none;}
.caquis-type{display:inline-block;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:600;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;font-family:ui-monospace,monospace;}
.caquis-src{font-family:ui-monospace,monospace;word-break:break-all;font-size:12px;}
.caquis-label{display:inline-block;padding:1px 6px;border-radius:3px;font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:1px 2px;font-family:ui-monospace,monospace;}
.caquis-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
`;

function sourceDisplay(doc) {
  const parts = [];
  if (Array.isArray(doc.filenames) && doc.filenames.length) {
    parts.push(...doc.filenames);
  }
  if (doc.journalctl_filter) {
    const f = Array.isArray(doc.journalctl_filter) ? doc.journalctl_filter.join(' ') : String(doc.journalctl_filter);
    parts.push(f);
  }
  if (doc.docker_host) parts.push(doc.docker_host);
  if (doc.syslog_socket) parts.push(doc.syslog_socket);
  if (doc.stream_name) parts.push(doc.stream_name);
  if (doc.k8s_audit_webhook) parts.push(doc.k8s_audit_webhook);
  return parts.map((p) => `<div class="caquis-src">${esc(p)}</div>`).join('') || '<span style="color:var(--fg-2,#888);font-size:12px;">—</span>';
}

function labelsDisplay(doc) {
  const labels = doc.labels || {};
  const entries = Object.entries(labels);
  if (!entries.length) return '<span style="color:var(--fg-2,#888);font-size:12px;">—</span>';
  return entries.map(([k, v]) => `<span class="caquis-label">${esc(k)}:${esc(String(v))}</span>`).join('');
}

function sourceType(doc) {
  return doc.source_type || doc.type || doc.source || '?';
}

export async function render(intake) {
  let docs = [];
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    const all = [];
    jsyaml.loadAll(intake.text || '', (d) => { if (d && typeof d === 'object') all.push(d); });
    docs = all;
  } catch { docs = []; }

  const count = docs.length;
  const rowsHtml = docs.map((doc) => `<tr>
<td><span class="caquis-type">${esc(sourceType(doc))}</span></td>
<td>${sourceDisplay(doc)}</td>
<td>${labelsDisplay(doc)}</td>
</tr>`).join('');

  const tableHtml = count ? `
<div class="caquis-card">
<table class="caquis-table">
<thead><tr><th>Type</th><th>Source / Filter</th><th>Labels</th></tr></thead>
<tbody>${rowsHtml}</tbody>
</table>
</div>` : '<p style="color:var(--fg-2,#888);font-size:13px;">No acquisition sources found.</p>';

  const host = document.createElement('div');
  host.className = 'caquis-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:2px;">
  <span class="badge-caquis">CrowdSec</span>
  <span class="caquis-title">CrowdSec Acquisition Config</span>
</div>
<div class="caquis-sub">${esc(count)} log source${count !== 1 ? 's' : ''}</div>
${tableHtml}`;
  return { parentNode: host };
}
