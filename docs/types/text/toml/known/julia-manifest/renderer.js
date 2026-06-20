const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Extract top-level scalar: key = "value"
function scalar(text, key) {
  const m = new RegExp('^' + key + '\\s*=\\s*"([^"]*)"', 'm').exec(text);
  return m ? m[1].trim() : null;
}

// Parse all [[deps.PackageName]] sections
function parsePackages(text) {
  const pkgs = [];
  // Split on [[deps.<Name>]] headers
  const parts = text.split(/^(?=\[\[deps\.)/m);
  for (const part of parts) {
    const header = /^\[\[deps\.([^\]]+)\]\]/.exec(part);
    if (!header) continue;
    const name = header[1].trim();
    const uuid = (/^uuid\s*=\s*"([^"]+)"/m.exec(part) || [])[1] || null;
    const version = (/^version\s*=\s*"([^"]+)"/m.exec(part) || [])[1] || null;
    const sha = (/^git-tree-sha1\s*=\s*"([^"]+)"/m.exec(part) || [])[1] || null;
    // deps line can be a TOML array: deps = ["A", "B", ...]
    const depsLine = /^deps\s*=\s*\[([^\]]*)\]/m.exec(part);
    const hasDeps = !!(depsLine && depsLine[1].trim());
    pkgs.push({ name, uuid, version, sha, hasDeps });
  }
  return pkgs;
}

const CSS = `
.julia-mani-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-julia-mani{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#9558B2;color:#fff;vertical-align:middle;margin-right:8px;}
.julia-mani-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.julia-mani-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 4px;}
.julia-mani-note{font-size:12px;color:var(--fg-2,#888);background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:6px 10px;margin:0 0 14px;display:inline-block;}
.julia-mani-stats{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 14px;}
.julia-mani-stat{display:flex;flex-direction:column;align-items:center;padding:8px 16px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);min-width:80px;}
.julia-mani-stat-n{font-size:22px;font-weight:700;color:var(--fg,#24292f);}
.julia-mani-stat-l{font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;}
.julia-mani-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.julia-mani-table{width:100%;border-collapse:collapse;font-size:13px;}
.julia-mani-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0);}
.julia-mani-table td{padding:4px 8px;border-bottom:1px solid var(--border,#e5e7eb);vertical-align:middle;}
.julia-mani-name{font:13px ui-monospace,monospace;color:var(--accent,#0969da);}
.julia-mani-ver{font:12px ui-monospace,monospace;color:var(--fg,#24292f);}
.julia-mani-uuid{font:11px ui-monospace,monospace;color:var(--fg-2,#888);}
.julia-mani-yes{color:#1a7f37;font-size:11px;}
.julia-mani-no{color:var(--fg-2,#888);font-size:11px;}
.julia-mani-more{font-size:12px;color:var(--fg-2,#888);margin:6px 0 0;}
`;

export function render(intake) {
  const t = intake.text || '';

  const juliaVersion = scalar(t, 'julia_version');
  const manifestFormat = scalar(t, 'manifest_format');
  const pkgs = parsePackages(t);
  const total = pkgs.length;

  const statsHtml = `<div class="julia-mani-stats">
    <div class="julia-mani-stat"><span class="julia-mani-stat-n">${esc(total)}</span><span class="julia-mani-stat-l">Packages</span></div>
    ${juliaVersion ? `<div class="julia-mani-stat"><span class="julia-mani-stat-n">${esc(juliaVersion)}</span><span class="julia-mani-stat-l">Julia</span></div>` : ''}
    ${manifestFormat ? `<div class="julia-mani-stat"><span class="julia-mani-stat-n">${esc(manifestFormat)}</span><span class="julia-mani-stat-l">Format</span></div>` : ''}
  </div>`;

  const SHOW = 60;
  const shown = pkgs.slice(0, SHOW);
  const rows = shown.map((p) => `<tr>
    <td><span class="julia-mani-name">${esc(p.name)}</span></td>
    <td><span class="julia-mani-ver">${p.version ? esc(p.version) : '<span class="julia-mani-no">stdlib</span>'}</span></td>
    <td><span class="julia-mani-uuid">${p.uuid ? esc(p.uuid.slice(0, 8)) + '…' : '—'}</span></td>
    <td>${p.hasDeps ? '<span class="julia-mani-yes">yes</span>' : '<span class="julia-mani-no">—</span>'}</td>
  </tr>`).join('');

  const tableHtml = `<div class="julia-mani-sec">
    <h3>Resolved packages (${total})</h3>
    <table class="julia-mani-table">
      <thead><tr><th>Name</th><th>Version</th><th>UUID</th><th>Has deps</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${total > SHOW ? `<p class="julia-mani-more">… and ${total - SHOW} more packages</p>` : ''}
  </div>`;

  const host = document.createElement('div');
  host.className = 'julia-mani-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="julia-mani-title"><span class="badge-julia-mani">Julia Manifest</span>Manifest.toml</div>
<div class="julia-mani-sub">${total} package${total !== 1 ? 's' : ''} locked${juliaVersion ? ` · Julia ${esc(juliaVersion)}` : ''}</div>
<div class="julia-mani-note">Lockfile — do not edit manually</div>
${statsHtml}
${tableHtml}`;

  return { parentNode: host };
}
