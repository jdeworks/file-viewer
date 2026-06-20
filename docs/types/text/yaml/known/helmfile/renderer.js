import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.helmfile-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.helmfile-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:linear-gradient(135deg,#6c2eb9,#3b82f6);color:#fff;vertical-align:middle;margin-right:8px;}
.helmfile-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.helmfile-sec{margin:14px 0;}
.helmfile-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.helmfile-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.helmfile-table{width:100%;border-collapse:collapse;font-size:13px;}
.helmfile-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:4px 8px 4px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.helmfile-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.helmfile-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.helmfile-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.helmfile-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
.helmfile-dim{font-size:11px;color:var(--fg-2,#888);}
.helmfile-mono{font-family:ui-monospace,monospace;font-size:12px;}
.helmfile-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

function maskSecret(val) {
  if (!val) return '';
  const s = String(val);
  if (s.length <= 4) return '****';
  return s.slice(0, 2) + '****';
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const repos = Array.isArray(cfg.repositories) ? cfg.repositories : [];
  const releases = Array.isArray(cfg.releases) ? cfg.releases : [];
  const envs = cfg.environments ? Object.keys(cfg.environments) : [];
  const helmfiles = Array.isArray(cfg.helmfiles) ? cfg.helmfiles : [];
  const defaults = cfg.helmDefaults || null;

  // Repositories section
  const reposHtml = repos.length
    ? `<div class="helmfile-sec"><h3>Repositories (${repos.length})</h3>
<table class="helmfile-table">
<thead><tr><th>Name</th><th>URL</th><th>Auth</th></tr></thead>
<tbody>${repos.map((r) => {
  const hasAuth = r.username || r.password || r.certFile || r.keyFile || r.caFile;
  return `<tr>
    <td><span class="helmfile-mono">${esc(r.name || '')}</span></td>
    <td><span class="helmfile-dim">${esc(r.url || '')}</span></td>
    <td>${hasAuth ? `<span class="helmfile-masked">${r.username ? esc(maskSecret(r.username)) + '@…' : ''}${r.certFile ? 'cert' : ''}${r.password ? '●●●●' : ''}</span>` : '<span class="helmfile-dim">—</span>'}</td>
  </tr>`;
}).join('')}</tbody></table></div>`
    : '';

  // Releases section
  const releasesHtml = releases.length
    ? `<div class="helmfile-sec"><h3>Releases (${releases.length})</h3>
<table class="helmfile-table">
<thead><tr><th>Name</th><th>Chart</th><th>Version</th><th>Namespace</th><th>Values</th></tr></thead>
<tbody>${releases.slice(0, 12).map((r) => {
  const chart = r.chart || '';
  const version = r.version || r.chart?.split('@')[1] || '';
  const ns = r.namespace || '';
  const vals = Array.isArray(r.values) ? r.values : [];
  const valNames = vals.map((v) => {
    if (typeof v === 'string') return v.split('/').pop();
    if (v && typeof v === 'object') return Object.keys(v).join(',');
    return String(v);
  }).join(', ');
  return `<tr>
    <td><span class="helmfile-mono">${esc(r.name || '')}</span></td>
    <td><span class="helmfile-dim">${esc(chart)}</span></td>
    <td><span class="helmfile-dim">${esc(version)}</span></td>
    <td><span class="helmfile-dim">${esc(ns)}</span></td>
    <td><span class="helmfile-dim">${esc(valNames)}</span></td>
  </tr>`;
}).join('')}${releases.length > 12 ? `<tr><td colspan="5" class="helmfile-dim">…and ${releases.length - 12} more</td></tr>` : ''}
</tbody></table></div>`
    : '';

  // Environments section
  const envsHtml = envs.length
    ? `<div class="helmfile-sec"><h3>Environments (${envs.length})</h3>
<div style="display:flex;flex-wrap:wrap;gap:4px;">${envs.map((e) => `<span class="helmfile-pill">${esc(e)}</span>`).join('')}</div></div>`
    : '';

  // Sub-helmfiles section
  const helmfilesHtml = helmfiles.length
    ? `<div class="helmfile-sec"><h3>Helmfiles (${helmfiles.length})</h3>
<div style="display:flex;flex-wrap:wrap;gap:4px;">${helmfiles.map((h) => {
  const path = typeof h === 'string' ? h : (h.path || JSON.stringify(h));
  return `<span class="helmfile-pill">${esc(path)}</span>`;
}).join('')}</div></div>`
    : '';

  // Defaults section
  const defaultsHtml = defaults
    ? `<div class="helmfile-sec"><h3>Helm Defaults</h3><div class="helmfile-kv">
${defaults.createNamespace != null ? `<span class="helmfile-k">createNamespace</span><span class="helmfile-v">${esc(String(defaults.createNamespace))}</span>` : ''}
${defaults.wait != null ? `<span class="helmfile-k">wait</span><span class="helmfile-v">${esc(String(defaults.wait))}</span>` : ''}
${defaults.atomic != null ? `<span class="helmfile-k">atomic</span><span class="helmfile-v">${esc(String(defaults.atomic))}</span>` : ''}
${defaults.timeout != null ? `<span class="helmfile-k">timeout</span><span class="helmfile-v">${esc(String(defaults.timeout))}</span>` : ''}
${defaults.recreatePods != null ? `<span class="helmfile-k">recreatePods</span><span class="helmfile-v">${esc(String(defaults.recreatePods))}</span>` : ''}
${defaults.cleanupOnFail != null ? `<span class="helmfile-k">cleanupOnFail</span><span class="helmfile-v">${esc(String(defaults.cleanupOnFail))}</span>` : ''}
</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'helmfile-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="helmfile-badge">Helmfile</span>
  <span class="helmfile-title">Helmfile</span>
  ${repos.length ? `<span class="helmfile-pill">${repos.length} repo${repos.length !== 1 ? 's' : ''}</span>` : ''}
  ${releases.length ? `<span class="helmfile-pill">${releases.length} release${releases.length !== 1 ? 's' : ''}</span>` : ''}
</div>
${defaultsHtml}${reposHtml}${releasesHtml}${envsHtml}${helmfilesHtml}`;

  return { parentNode: host };
}
