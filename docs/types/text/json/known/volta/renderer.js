const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vlt-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-vlt{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1565C0;color:#fff;vertical-align:middle;margin-right:8px;}
.vlt-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.vlt-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.vlt-table{width:100%;border-collapse:collapse;font-size:13px;margin:8px 0;}
.vlt-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0);}
.vlt-table td{padding:6px 8px;border-bottom:1px solid var(--border,#e0e0e0);}
.vlt-tool{font:13px/1.4 ui-monospace,monospace;font-weight:600;}
.vlt-ver{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);}
.vlt-tag{display:inline-block;font-size:10px;padding:1px 6px;border-radius:6px;background:#1565C0;color:#fff;font-weight:700;margin-left:6px;vertical-align:middle;}
.vlt-sec{margin:12px 0;}
.vlt-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
`;

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'vlt-doc';

  let raw;
  try {
    raw = JSON.parse(intake.text || new TextDecoder().decode(intake.bytes));
  } catch {
    host.innerHTML = `<style>${CSS}</style><div class="vlt-title"><span class="badge-vlt">Volta</span>Invalid JSON</div>`;
    return { parentNode: host };
  }

  // Support both volta.json (top-level) and package.json (nested under "volta")
  const pins = raw.volta || raw;
  const node = pins.node || null;
  const npm = pins.npm || null;
  const yarn = pins.yarn || null;
  const pnpm = pins.pnpm || null;
  const extendsField = pins.extends || null;

  const tools = [
    { name: 'node', version: node },
    { name: 'npm', version: npm },
    { name: 'yarn', version: yarn },
    { name: 'pnpm', version: pnpm },
  ].filter((t) => t.version != null);

  const rows = tools.map((t) => `<tr>
    <td><span class="vlt-tool">${esc(t.name)}</span></td>
    <td><span class="vlt-ver">${esc(t.version)}</span></td>
  </tr>`).join('');

  const tableHtml = tools.length
    ? `<table class="vlt-table"><thead><tr><th>Tool</th><th>Pinned version</th></tr></thead><tbody>${rows}</tbody></table>`
    : '<div style="color:var(--fg-2,#888);font-size:13px">No version pins found</div>';

  const extendsHtml = extendsField
    ? `<div class="vlt-sec"><h3>Extends</h3><div style="font:12px/1.4 ui-monospace,monospace">${esc(extendsField)}</div></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="vlt-title"><span class="badge-vlt">Volta</span>Volta version pins</div>
<div class="vlt-sub">${tools.length} tool${tools.length !== 1 ? 's' : ''} pinned${node ? ` · node ${esc(node)}` : ''}</div>
${tableHtml}${extendsHtml}`;

  return { parentNode: host };
}
