import jsYaml from '../../../../vendor/js-yaml/js-yaml.min.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ansr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-ansr{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e00;color:#fff;vertical-align:middle;margin-right:8px;}
.ansr-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ansr-meta{font-size:12px;color:var(--fg-2,#888);margin-bottom:16px;}
.ansr-section{margin:0 0 20px;}
.ansr-section-title{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;display:flex;align-items:center;gap:6px;}
.ansr-count{font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:10px;padding:1px 7px;font-weight:600;color:var(--fg,#24292f);text-transform:none;letter-spacing:0;}
.ansr-table{width:100%;border-collapse:collapse;font-size:13px;}
.ansr-table th{text-align:left;padding:5px 10px;background:var(--bg-2,#f6f8fa);border-bottom:2px solid var(--border,#e0e0e0);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:var(--fg-2,#888);}
.ansr-table td{padding:5px 10px;border-bottom:1px solid var(--border,#e8e8e8);vertical-align:top;}
.ansr-table tr:last-child td{border-bottom:none;}
.ansr-name{font-family:ui-monospace,monospace;font-weight:600;color:#0550ae;}
.ansr-version{font-family:ui-monospace,monospace;font-size:12px;padding:1px 6px;border-radius:4px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;}
.ansr-src{font-family:ui-monospace,monospace;font-size:11px;color:var(--fg-2,#888);word-break:break-all;}
`;

export function render(intake) {
  const text = intake.text || '';
  const host = document.createElement('div');
  host.className = 'ansr-doc';

  let data = null;
  try {
    data = jsYaml.load(text);
  } catch (e) {
    host.innerHTML = `<style>${CSS}</style><p style="color:#c00">YAML parse error: ${esc(e.message)}</p>`;
    return { parentNode: host };
  }

  if (!data || typeof data !== 'object') {
    host.innerHTML = `<style>${CSS}</style><p style="color:var(--fg-2,#888)">No requirements found.</p>`;
    return { parentNode: host };
  }

  const roles = Array.isArray(data.roles) ? data.roles : [];
  const collections = Array.isArray(data.collections) ? data.collections : [];

  const rolesHtml = roles.length ? `<div class="ansr-section">
<div class="ansr-section-title">Roles <span class="ansr-count">${roles.length}</span></div>
<table class="ansr-table">
<thead><tr><th>Name</th><th>Version</th><th>Source</th></tr></thead>
<tbody>
${roles.map((r) => {
  const name = r.name || r.src || '';
  const version = r.version || '';
  const src = r.src && r.src !== name ? r.src : '';
  return `<tr>
  <td class="ansr-name">${esc(name)}</td>
  <td>${version ? `<span class="ansr-version">${esc(version)}</span>` : '<span style="color:var(--fg-2,#888)">—</span>'}</td>
  <td class="ansr-src">${src ? esc(src) : '<span style="color:var(--fg-2,#888)">Galaxy</span>'}</td>
</tr>`;
}).join('')}
</tbody>
</table>
</div>` : '';

  const collectionsHtml = collections.length ? `<div class="ansr-section">
<div class="ansr-section-title">Collections <span class="ansr-count">${collections.length}</span></div>
<table class="ansr-table">
<thead><tr><th>Name</th><th>Version</th></tr></thead>
<tbody>
${collections.map((c) => {
  const name = c.name || '';
  const version = c.version || '';
  return `<tr>
  <td class="ansr-name">${esc(name)}</td>
  <td>${version ? `<span class="ansr-version">${esc(version)}</span>` : '<span style="color:var(--fg-2,#888)">—</span>'}</td>
</tr>`;
}).join('')}
</tbody>
</table>
</div>` : '';

  const totalCount = roles.length + collections.length;

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-ansr">Ansible</span>
  <span class="ansr-title">Requirements</span>
</div>
<div class="ansr-meta">${roles.length} role${roles.length !== 1 ? 's' : ''} · ${collections.length} collection${collections.length !== 1 ? 's' : ''} · ${totalCount} total</div>
${rolesHtml}
${collectionsHtml}
${!rolesHtml && !collectionsHtml ? '<p style="color:var(--fg-2,#888);font-size:13px">No roles or collections found.</p>' : ''}`;

  return { parentNode: host };
}
