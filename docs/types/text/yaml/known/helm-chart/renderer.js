const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function topScalar(text, key) {
  const m = text.match(new RegExp('^' + key + '\\s*:\\s*(.+)$', 'm'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

function parseDependencies(text) {
  const deps = [];
  const depBlock = text.match(/^dependencies\s*:\s*\n((?:\s{2,}.*\n?)*)/m);
  if (!depBlock) return deps;
  const block = depBlock[1];
  const entries = block.split(/(?=^\s{2}-\s)/m).filter(Boolean);
  for (const entry of entries) {
    const name = (entry.match(/^\s{2,}-?\s*name\s*:\s*(.+)/m) || [])[1]?.trim().replace(/^['"]|['"]$/g, '') || '';
    const version = (entry.match(/^\s{2,}version\s*:\s*(.+)/m) || [])[1]?.trim().replace(/^['"]|['"]$/g, '') || '';
    const repo = (entry.match(/^\s{2,}repository\s*:\s*(.+)/m) || [])[1]?.trim().replace(/^['"]|['"]$/g, '') || '';
    if (name) deps.push({ name, version, repo });
  }
  return deps;
}

const CSS = `
.hc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-hc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0f62fe;color:#fff;vertical-align:middle;margin-right:8px;}
.hc-title{font-size:18px;font-weight:700;margin:0 0 2px;}
.hc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.hc-desc{font-size:13px;color:var(--fg,#24292f);margin:0 0 12px;max-width:600px;}
.hc-sec{margin:12px 0;}
.hc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.hc-meta{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0;}
.hc-pill{font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg,#24292f);}
.hc-pill.type{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;}
.hc-table{width:100%;border-collapse:collapse;font-size:13px;}
.hc-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.hc-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.hc-mono{font:12px ui-monospace,monospace;}
.hc-repo{font-size:11px;color:var(--fg-2,#888);}
`;

export function render(intake) {
  const text = intake.text || '';
  const name = topScalar(text, 'name') || '';
  const version = topScalar(text, 'version') || '';
  const appVersion = topScalar(text, 'appVersion') || '';
  const description = topScalar(text, 'description') || '';
  const chartType = topScalar(text, 'type') || 'application';
  const apiVersion = topScalar(text, 'apiVersion') || '';
  const kubeVersion = topScalar(text, 'kubeVersion') || '';
  const deps = parseDependencies(text);

  const host = document.createElement('div');
  host.className = 'hc-doc';

  const metaPills = [
    version ? `<span class="hc-pill">v${esc(version)}</span>` : '',
    appVersion ? `<span class="hc-pill">app v${esc(appVersion)}</span>` : '',
    chartType !== 'application' ? `<span class="hc-pill type">${esc(chartType)}</span>` : '',
    apiVersion ? `<span class="hc-pill"><span class="hc-mono">${esc(apiVersion)}</span></span>` : '',
    kubeVersion ? `<span class="hc-pill">kube ${esc(kubeVersion)}</span>` : '',
  ].filter(Boolean).join('');

  const depsHtml = deps.length
    ? `<div class="hc-sec"><h3>Dependencies (${deps.length})</h3><table class="hc-table">
<thead><tr><th>Chart</th><th>Version</th><th>Repository</th></tr></thead>
<tbody>${deps.map((d) => `<tr>
  <td><span class="hc-mono">${esc(d.name)}</span></td>
  <td>${esc(d.version) || '—'}</td>
  <td><span class="hc-repo">${esc(d.repo) || '—'}</span></td>
</tr>`).join('')}</tbody></table></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
  <span class="badge-hc">Helm Chart</span>
  <span class="hc-title">${esc(name) || 'Chart'}</span>
</div>
${metaPills ? `<div class="hc-meta">${metaPills}</div>` : ''}
${description ? `<div class="hc-desc">${esc(description)}</div>` : ''}
${depsHtml}`;

  return { parentNode: host };
}
