// Enhanced packages.config view. Rendered in the parent pane (trusted DOM).
// Shows all <package> entries with id, version, targetFramework.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pc-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pc-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.badge-pc{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#0078d4;color:#fff;vertical-align:middle;}
.pc-title{font-size:18px;font-weight:700;margin:0;}
.pc-count{font-size:13px;color:var(--fg-2,#888);margin-bottom:12px;}
.pc-table{width:100%;border-collapse:collapse;font-size:13px;}
.pc-table th{text-align:left;font-size:11px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.05em;padding:4px 8px 4px 0;border-bottom:2px solid var(--border,#e8eaed);}
.pc-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e8eaed);vertical-align:middle;}
.pc-table tr:last-child td{border-bottom:none;}
.pc-id{font-family:ui-monospace,monospace;font-weight:600;color:#0078d4;}
.pc-ver{font-family:ui-monospace,monospace;color:var(--fg,#24292f);}
.pc-tf{font-family:ui-monospace,monospace;font-size:11px;color:var(--fg-2,#888);}
.pc-dev{display:inline-block;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:600;background:#fff3cd;color:#7a5c00;border:1px solid #ffe082;}
.pc-empty{color:var(--fg-2,#888);font-size:13px;font-style:italic;}
.pc-err{color:#c62828;font-size:13px;}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const host = document.createElement('div');
  host.className = 'pc-doc';

  let doc = null;
  try { doc = new DOMParser().parseFromString(text, 'text/xml'); } catch (e) {
    host.innerHTML = `<style>${CSS}</style><p class="pc-err">Failed to parse XML: ${esc(e.message)}</p>`;
    return { parentNode: host };
  }
  if (doc.getElementsByTagName('parsererror').length) {
    host.innerHTML = `<style>${CSS}</style><p class="pc-err">Could not parse packages.config as XML.</p>`;
    return { parentNode: host };
  }

  const packages = Array.from(doc.getElementsByTagName('package')).map((el) => ({
    id: el.getAttribute('id') || el.getAttribute('Id') || '',
    version: el.getAttribute('version') || el.getAttribute('Version') || '',
    targetFramework: el.getAttribute('targetFramework') || el.getAttribute('TargetFramework') || '',
    developmentDependency: (el.getAttribute('developmentDependency') || '').toLowerCase() === 'true',
  }));

  if (!packages.length) {
    host.innerHTML = `<style>${CSS}</style>
<div class="pc-head"><span class="badge-pc">NuGet</span><div class="pc-title">packages.config</div></div>
<p class="pc-empty">No packages found.</p>`;
    return { parentNode: host };
  }

  // Group unique target frameworks
  const frameworks = [...new Set(packages.map((p) => p.targetFramework).filter(Boolean))];
  const devCount = packages.filter((p) => p.developmentDependency).length;

  const rows = packages.map((p) =>
    `<tr>
      <td class="pc-id">${esc(p.id)}${p.developmentDependency ? ' <span class="pc-dev">dev</span>' : ''}</td>
      <td class="pc-ver">${esc(p.version)}</td>
      <td class="pc-tf">${esc(p.targetFramework)}</td>
    </tr>`
  ).join('');

  const frameworkNote = frameworks.length
    ? `<span style="color:var(--fg-2,#888);font-size:12px;margin-left:8px;">target: ${frameworks.map(esc).join(', ')}</span>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="pc-head">
  <span class="badge-pc">NuGet</span>
  <div class="pc-title">packages.config</div>
</div>
<div class="pc-count">${packages.length} package${packages.length !== 1 ? 's' : ''}${devCount ? ` (${devCount} dev-only)` : ''}${frameworkNote}</div>
<table class="pc-table">
  <thead><tr><th>Package ID</th><th>Version</th><th>Target Framework</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;

  return { parentNode: host };
}
