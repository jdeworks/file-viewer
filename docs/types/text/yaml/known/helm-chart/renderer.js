import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.helmchart-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.helmchart-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0f1689;color:#fff;vertical-align:middle;margin-right:8px;}
.helmchart-title{font-size:18px;font-weight:700;margin:0 0 2px;}
.helmchart-desc{font-size:13px;color:var(--fg,#24292f);margin:8px 0 12px;max-width:600px;}
.helmchart-sec{margin:14px 0;}
.helmchart-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.helmchart-meta{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}
.helmchart-pill{font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg,#24292f);}
.helmchart-pill.type-app{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;}
.helmchart-pill.type-lib{background:#f3f4f6;border-color:#d1d5db;color:#374151;}
.helmchart-table{width:100%;border-collapse:collapse;font-size:13px;}
.helmchart-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.helmchart-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.helmchart-mono{font:12px ui-monospace,monospace;}
.helmchart-dim{font-size:11px;color:var(--fg-2,#888);}
.helmchart-kv{display:grid;grid-template-columns:max-content 1fr;gap:3px 14px;font-size:13px;}
.helmchart-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.helmchart-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = {}; }

  const name = cfg.name || '';
  const version = String(cfg.version || '');
  const appVersion = String(cfg.appVersion || '');
  const description = cfg.description || '';
  const chartType = cfg.type || 'application';
  const apiVersion = cfg.apiVersion || '';
  const kubeVersion = cfg.kubeVersion || '';
  const keywords = Array.isArray(cfg.keywords) ? cfg.keywords : [];
  const maintainers = Array.isArray(cfg.maintainers) ? cfg.maintainers : [];
  const deps = Array.isArray(cfg.dependencies) ? cfg.dependencies : [];
  const annotations = cfg.annotations && typeof cfg.annotations === 'object' ? cfg.annotations : null;

  const host = document.createElement('div');
  host.className = 'helmchart-doc';

  const versionChips = [
    version ? `<span class="helmchart-pill">v${esc(version)}</span>` : '',
    appVersion ? `<span class="helmchart-pill">app v${esc(appVersion)}</span>` : '',
  ].filter(Boolean).join('');

  const identityHtml = `<div class="helmchart-sec"><h3>Identity</h3><div class="helmchart-meta">
    ${chartType === 'library' ? `<span class="helmchart-pill type-lib">library</span>` : `<span class="helmchart-pill type-app">application</span>`}
    ${kubeVersion ? `<span class="helmchart-pill">kube ${esc(kubeVersion)}</span>` : ''}
    ${apiVersion ? `<span class="helmchart-pill"><span class="helmchart-mono">${esc(apiVersion)}</span></span>` : ''}
  </div>${description ? `<div class="helmchart-desc">${esc(description)}</div>` : ''}</div>`;

  const maintainersHtml = maintainers.length
    ? `<div class="helmchart-sec"><h3>Maintainers (${maintainers.length})</h3><div class="helmchart-kv">${maintainers.map((m) => {
        const label = esc(m.name || m.email || '?');
        const email = m.email && m.name ? `<span class="helmchart-dim">&lt;${esc(m.email)}&gt;</span>` : '';
        return `<span class="helmchart-k">${label}</span><span class="helmchart-v">${email || esc(m.email || '')}</span>`;
      }).join('')}</div></div>`
    : '';

  const keywordsHtml = keywords.length
    ? `<div class="helmchart-sec"><h3>Keywords</h3><div class="helmchart-meta">${keywords.map((k) => `<span class="helmchart-pill">${esc(k)}</span>`).join('')}</div></div>`
    : '';

  const shortRepo = (r) => r ? r.replace(/^https?:\/\//, '').replace(/\/$/, '') : '—';

  const depsHtml = deps.length
    ? `<div class="helmchart-sec"><h3>Dependencies (${deps.length})</h3><table class="helmchart-table">
<thead><tr><th>Chart</th><th>Version</th><th>Repository</th><th>Condition</th></tr></thead>
<tbody>${deps.map((d) => `<tr>
  <td><span class="helmchart-mono">${esc(d.name || '')}</span></td>
  <td>${esc(String(d.version || '')) || '—'}</td>
  <td><span class="helmchart-dim">${esc(shortRepo(d.repository))}</span></td>
  <td><span class="helmchart-dim">${esc(d.condition || '')}</span></td>
</tr>`).join('')}</tbody></table></div>`
    : '';

  const annotationsHtml = annotations
    ? `<div class="helmchart-sec"><h3>Annotations</h3><div class="helmchart-kv">${Object.entries(annotations).map(([k, v]) =>
        `<span class="helmchart-k">${esc(k)}</span><span class="helmchart-v">${esc(String(v))}</span>`
      ).join('')}</div></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="helmchart-badge">Helm</span>
  <span class="helmchart-title">${esc(name) || 'Chart'}</span>
  ${versionChips}
</div>
${identityHtml}${maintainersHtml}${keywordsHtml}${depsHtml}${annotationsHtml}`;

  return { parentNode: host };
}
