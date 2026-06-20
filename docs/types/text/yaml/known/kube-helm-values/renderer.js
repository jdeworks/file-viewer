import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SECRET_RE = /secret|token|key|password|api[_-]?key|auth|credential|passwd/i;

function maskValue(k, v) {
  if (SECRET_RE.test(String(k))) return '••••••••';
  return String(v == null ? '' : v);
}

const CSS = `
.helmvalues-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.helmvalues-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0f1689;color:#fff;vertical-align:middle;margin-right:8px;}
.helmvalues-title{font-size:18px;font-weight:700;margin:0 0 12px;}
.helmvalues-sec{margin:14px 0;}
.helmvalues-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.helmvalues-pills{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:4px;}
.helmvalues-pill{font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg,#24292f);}
.helmvalues-pill.svc-clusterip{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;}
.helmvalues-pill.svc-nodeport{background:#fef9c3;border-color:#fde047;color:#713f12;}
.helmvalues-pill.svc-lb{background:#f0fdf4;border-color:#86efac;color:#14532d;}
.helmvalues-pill.enabled{background:#f0fdf4;border-color:#86efac;color:#14532d;}
.helmvalues-pill.disabled{background:#f9fafb;border-color:#d1d5db;color:#6b7280;}
.helmvalues-table{width:100%;border-collapse:collapse;font-size:13px;}
.helmvalues-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.helmvalues-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.helmvalues-mono{font:12px ui-monospace,monospace;}
.helmvalues-kv{display:grid;grid-template-columns:max-content 1fr;gap:3px 14px;font-size:13px;}
.helmvalues-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.helmvalues-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
.helmvalues-dim{font-size:11px;color:var(--fg-2,#888);}
`;

function svcPillClass(type) {
  if (!type) return 'helmvalues-pill';
  const t = String(type).toLowerCase();
  if (t === 'clusterip') return 'helmvalues-pill svc-clusterip';
  if (t === 'nodeport') return 'helmvalues-pill svc-nodeport';
  if (t === 'loadbalancer') return 'helmvalues-pill svc-lb';
  return 'helmvalues-pill';
}

function enabledPillClass(val) {
  return val ? 'helmvalues-pill enabled' : 'helmvalues-pill disabled';
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const host = document.createElement('div');
  host.className = 'helmvalues-doc';

  const sections = [];

  // ── Overview pills ──
  const overviewPills = [];
  if (cfg.replicaCount != null) overviewPills.push(`<span class="helmvalues-pill">replicas: ${esc(cfg.replicaCount)}</span>`);
  if (overviewPills.length) {
    sections.push(`<div class="helmvalues-sec"><h3>Overview</h3><div class="helmvalues-pills">${overviewPills.join('')}</div></div>`);
  }

  // ── Image ──
  const img = cfg.image;
  if (img && typeof img === 'object') {
    const repo = img.repository || img.name || '';
    const tag = img.tag || img.imageTag || 'latest';
    const pull = img.pullPolicy || '';
    sections.push(`<div class="helmvalues-sec"><h3>Image</h3><div class="helmvalues-kv">
      ${repo ? `<span class="helmvalues-k">repository</span><span class="helmvalues-v">${esc(repo)}</span>` : ''}
      <span class="helmvalues-k">tag</span><span class="helmvalues-v">${esc(tag)}</span>
      ${pull ? `<span class="helmvalues-k">pullPolicy</span><span class="helmvalues-v">${esc(pull)}</span>` : ''}
    </div></div>`);
  }

  // ── Service ──
  const svc = cfg.service;
  if (svc && typeof svc === 'object') {
    const type = svc.type || '';
    const port = svc.port != null ? svc.port : '';
    const targetPort = svc.targetPort != null ? svc.targetPort : '';
    sections.push(`<div class="helmvalues-sec"><h3>Service</h3><div class="helmvalues-pills" style="margin-bottom:6px;">
      ${type ? `<span class="${svcPillClass(type)}">${esc(type)}</span>` : ''}
      ${port ? `<span class="helmvalues-pill">port: ${esc(port)}</span>` : ''}
      ${targetPort ? `<span class="helmvalues-pill">targetPort: ${esc(targetPort)}</span>` : ''}
    </div></div>`);
  }

  // ── Ingress ──
  const ing = cfg.ingress;
  if (ing && typeof ing === 'object') {
    const enabled = ing.enabled;
    const className = ing.className || ing.ingressClassName || '';
    // Collect hosts
    const hostList = [];
    if (ing.host) hostList.push(String(ing.host));
    if (Array.isArray(ing.hosts)) {
      for (const h of ing.hosts) {
        if (typeof h === 'string') hostList.push(h);
        else if (h && h.host) hostList.push(String(h.host));
      }
    }
    const tls = ing.tls === true || (Array.isArray(ing.tls) && ing.tls.length > 0);
    sections.push(`<div class="helmvalues-sec"><h3>Ingress</h3>
      <div class="helmvalues-pills" style="margin-bottom:6px;">
        <span class="${enabledPillClass(enabled)}">${enabled ? 'enabled' : 'disabled'}</span>
        ${tls ? `<span class="helmvalues-pill enabled">TLS</span>` : ''}
        ${className ? `<span class="helmvalues-pill"><span class="helmvalues-mono">${esc(className)}</span></span>` : ''}
      </div>
      ${hostList.length ? `<div class="helmvalues-dim">${hostList.map(h => esc(h)).join(', ')}</div>` : ''}
    </div>`);
  }

  // ── Resources ──
  const res = cfg.resources;
  if (res && typeof res === 'object') {
    const lim = res.limits || {};
    const req = res.requests || {};
    const rows = [];
    const keys = new Set([...Object.keys(lim), ...Object.keys(req)]);
    for (const k of keys) {
      rows.push(`<tr>
        <td><span class="helmvalues-mono">${esc(k)}</span></td>
        <td>${lim[k] != null ? `<span class="helmvalues-mono">${esc(lim[k])}</span>` : '<span class="helmvalues-dim">—</span>'}</td>
        <td>${req[k] != null ? `<span class="helmvalues-mono">${esc(req[k])}</span>` : '<span class="helmvalues-dim">—</span>'}</td>
      </tr>`);
    }
    if (rows.length) {
      sections.push(`<div class="helmvalues-sec"><h3>Resources</h3>
        <table class="helmvalues-table">
          <thead><tr><th>Resource</th><th>Limit</th><th>Request</th></tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>`);
    }
  }

  // ── Autoscaling ──
  const hpa = cfg.autoscaling;
  if (hpa && typeof hpa === 'object') {
    const enabled = hpa.enabled;
    const pills = [];
    pills.push(`<span class="${enabledPillClass(enabled)}">${enabled ? 'enabled' : 'disabled'}</span>`);
    if (hpa.minReplicas != null) pills.push(`<span class="helmvalues-pill">min: ${esc(hpa.minReplicas)}</span>`);
    if (hpa.maxReplicas != null) pills.push(`<span class="helmvalues-pill">max: ${esc(hpa.maxReplicas)}</span>`);
    if (hpa.targetCPUUtilizationPercentage != null) pills.push(`<span class="helmvalues-pill">CPU target: ${esc(hpa.targetCPUUtilizationPercentage)}%</span>`);
    if (hpa.targetMemoryUtilizationPercentage != null) pills.push(`<span class="helmvalues-pill">Mem target: ${esc(hpa.targetMemoryUtilizationPercentage)}%</span>`);
    sections.push(`<div class="helmvalues-sec"><h3>Autoscaling</h3><div class="helmvalues-pills">${pills.join('')}</div></div>`);
  }

  // ── Env vars (mask secrets) ──
  const envVal = cfg.env;
  if (envVal && typeof envVal === 'object' && !Array.isArray(envVal)) {
    const envKeys = Object.keys(envVal);
    if (envKeys.length) {
      const rows = envKeys.map(k => {
        const v = maskValue(k, envVal[k]);
        return `<tr><td><span class="helmvalues-mono">${esc(k)}</span></td><td><span class="helmvalues-mono">${esc(v)}</span></td></tr>`;
      });
      sections.push(`<div class="helmvalues-sec"><h3>Env Vars (${envKeys.length})</h3>
        <table class="helmvalues-table">
          <thead><tr><th>Name</th><th>Value</th></tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>`);
    }
  } else if (Array.isArray(envVal) && envVal.length) {
    const rows = envVal.map(e => {
      const k = e.name || '';
      const v = e.valueFrom ? '<span class="helmvalues-dim">valueFrom</span>' : maskValue(k, e.value);
      return `<tr><td><span class="helmvalues-mono">${esc(k)}</span></td><td><span class="helmvalues-mono">${esc(v)}</span></td></tr>`;
    });
    sections.push(`<div class="helmvalues-sec"><h3>Env Vars (${envVal.length})</h3>
      <table class="helmvalues-table">
        <thead><tr><th>Name</th><th>Value</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>`);
  }

  // ── Persistence ──
  const pers = cfg.persistence;
  if (pers && typeof pers === 'object') {
    const enabled = pers.enabled;
    const pills = [];
    pills.push(`<span class="${enabledPillClass(enabled)}">${enabled ? 'enabled' : 'disabled'}</span>`);
    if (pers.size) pills.push(`<span class="helmvalues-pill">size: ${esc(pers.size)}</span>`);
    if (pers.storageClass) pills.push(`<span class="helmvalues-pill">class: ${esc(pers.storageClass)}</span>`);
    if (pers.accessMode || pers.accessModes) {
      const mode = pers.accessMode || (Array.isArray(pers.accessModes) ? pers.accessModes[0] : '');
      if (mode) pills.push(`<span class="helmvalues-pill">${esc(mode)}</span>`);
    }
    sections.push(`<div class="helmvalues-sec"><h3>Persistence</h3><div class="helmvalues-pills">${pills.join('')}</div></div>`);
  }

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
  <span class="helmvalues-badge">Helm Values</span>
  <span class="helmvalues-title">values.yaml</span>
</div>
${sections.join('')}`;

  return { parentNode: host };
}
