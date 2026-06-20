import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function pill(text, variant = 'neutral') {
  return `<span class="ds-pill ds-pill-${variant}">${esc(text)}</span>`;
}

function kvRow(label, value) {
  if (value == null || value === '') return '';
  return `<tr><td class="ds-kv-label">${esc(label)}</td><td class="ds-kv-val">${esc(value)}</td></tr>`;
}

function renderService(name, svc) {
  const deploy = svc.deploy || {};
  const image = svc.image || '';
  const mode = deploy.mode || 'replicated';
  const replicas = deploy.replicas != null ? deploy.replicas : (mode === 'global' ? null : 1);
  const rp = deploy.restart_policy || {};
  const uc = deploy.update_config || {};
  const placement = deploy.placement || {};
  const constraints = Array.isArray(placement.constraints) ? placement.constraints : [];
  const preferences = Array.isArray(placement.preferences) ? placement.preferences : [];

  const svcSecrets = Array.isArray(svc.secrets)
    ? svc.secrets.map((s) => (typeof s === 'string' ? s : s.source || s.target || JSON.stringify(s)))
    : [];
  const svcConfigs = Array.isArray(svc.configs)
    ? svc.configs.map((c) => (typeof c === 'string' ? c : c.source || c.target || JSON.stringify(c)))
    : [];

  const replicaLabel = mode === 'global' ? 'global (all nodes)' : String(replicas);
  const modeVariant = mode === 'global' ? 'info' : 'neutral';

  return `<div class="ds-service">
  <div class="ds-service-header">
    <span class="ds-service-name">${esc(name)}</span>
    ${image ? `<span class="ds-service-image">${esc(image)}</span>` : ''}
  </div>
  <div class="ds-service-pills">
    <span class="ds-pill ds-pill-${modeVariant}">mode: ${esc(mode)}</span>
    ${mode !== 'global' ? `<span class="ds-pill ds-pill-replicas">${esc(replicaLabel)} replica${replicas !== 1 ? 's' : ''}</span>` : `<span class="ds-pill ds-pill-${modeVariant}">${esc(replicaLabel)}</span>`}
    ${rp.condition ? pill(`restart: ${rp.condition}`) : ''}
    ${uc.parallelism != null ? pill(`update: ${uc.parallelism} parallel`) : ''}
    ${uc.delay ? pill(`delay: ${uc.delay}`) : ''}
  </div>
  ${constraints.length || preferences.length ? `<div class="ds-service-placement">
    <span class="ds-sec-label">Placement</span>
    <div class="ds-pills-wrap">
      ${constraints.map((c) => `<span class="ds-pill ds-pill-constraint">${esc(c)}</span>`).join('')}
      ${preferences.map((p) => {
        const spread = p.spread || '';
        return spread ? `<span class="ds-pill ds-pill-neutral">spread: ${esc(spread)}</span>` : '';
      }).join('')}
    </div>
  </div>` : ''}
  ${svcSecrets.length ? `<div class="ds-service-secrets">
    <span class="ds-sec-label">Secrets</span>
    <div class="ds-pills-wrap">
      ${svcSecrets.map((s) => `<span class="ds-pill ds-pill-secret">${esc(s)}</span>`).join('')}
    </div>
  </div>` : ''}
  ${svcConfigs.length ? `<div class="ds-service-configs">
    <span class="ds-sec-label">Configs</span>
    <div class="ds-pills-wrap">
      ${svcConfigs.map((c) => `<span class="ds-pill ds-pill-config">${esc(c)}</span>`).join('')}
    </div>
  </div>` : ''}
</div>`;
}

export async function render(intake) {
  const text = intake.text || '';
  let doc = {};
  try { doc = (jsYaml.loadAll(text) || [])[0] || {}; } catch { /* ignore parse errors */ }

  const version = doc.version || '';
  const services = doc.services && typeof doc.services === 'object' ? doc.services : {};
  const networks = doc.networks && typeof doc.networks === 'object' ? Object.keys(doc.networks) : [];
  const volumes = doc.volumes && typeof doc.volumes === 'object' ? Object.keys(doc.volumes) : [];
  const secrets = doc.secrets && typeof doc.secrets === 'object' ? Object.keys(doc.secrets) : [];
  const configs = doc.configs && typeof doc.configs === 'object' ? Object.keys(doc.configs) : [];

  const serviceNames = Object.keys(services);
  const totalReplicas = serviceNames.reduce((sum, name) => {
    const deploy = services[name]?.deploy || {};
    if (deploy.mode === 'global') return sum;
    return sum + (deploy.replicas != null ? Number(deploy.replicas) : 1);
  }, 0);

  const host = document.createElement('div');
  host.className = 'ds-doc';
  host.innerHTML = `<style>
.ds-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;}
.ds-header{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:8px;}
.ds-badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#1D63ED;color:#fff;vertical-align:middle;}
.ds-title{font-size:19px;font-weight:700;margin:0;}
.ds-meta{font-size:12px;color:var(--fg-2,#888);margin:2px 0 12px;}
.ds-summary{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;}
.ds-pill{display:inline-block;padding:2px 9px;border-radius:10px;font-size:12px;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f5f5f5);color:var(--fg,#333);}
.ds-pill-neutral{background:var(--bg-2,#f5f5f5);border-color:var(--border,#e0e0e0);color:var(--fg,#333);}
.ds-pill-replicas{background:#dbeafe;border-color:#93c5fd;color:#1e40af;font-weight:600;}
.ds-pill-info{background:#e0f2fe;border-color:#7dd3fc;color:#0369a1;font-weight:600;}
.ds-pill-constraint{background:#f3e8ff;border-color:#d8b4fe;color:#6b21a8;}
.ds-pill-secret{background:#fef3c7;border-color:#fcd34d;color:#92400e;}
.ds-pill-config{background:#d1fae5;border-color:#6ee7b7;color:#065f46;}
.ds-services{display:flex;flex-direction:column;gap:10px;}
.ds-service{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px 14px;background:var(--bg,#fff);}
.ds-service-header{display:flex;align-items:baseline;gap:10px;margin-bottom:8px;flex-wrap:wrap;}
.ds-service-name{font-size:15px;font-weight:700;color:var(--fg,#333);}
.ds-service-image{font:12px ui-monospace,monospace;color:var(--fg-2,#666);background:var(--bg-2,#f5f5f5);padding:1px 7px;border-radius:4px;border:1px solid var(--border,#e0e0e0);}
.ds-service-pills{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px;}
.ds-service-placement,.ds-service-secrets,.ds-service-configs{display:flex;align-items:flex-start;gap:8px;margin-top:6px;}
.ds-sec-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);white-space:nowrap;padding-top:3px;min-width:52px;}
.ds-pills-wrap{display:flex;flex-wrap:wrap;gap:4px;}
.ds-section{margin-top:16px;}
.ds-section h3{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.ds-resource-pills{display:flex;flex-wrap:wrap;gap:5px;}
</style>
<div class="ds-header">
  <span class="ds-badge">Docker Stack</span>
  <span class="ds-title">Swarm Stack</span>
</div>
${version || serviceNames.length ? `<div class="ds-meta">${version ? `version: ${esc(version)}` : ''}${version && serviceNames.length ? ' · ' : ''}${serviceNames.length ? `${serviceNames.length} service${serviceNames.length !== 1 ? 's' : ''}, ${totalReplicas} replica${totalReplicas !== 1 ? 's' : ''} (scheduled)` : ''}</div>` : ''}
<div class="ds-summary">
  ${networks.length ? pill(`${networks.length} network${networks.length !== 1 ? 's' : ''}`) : ''}
  ${volumes.length ? pill(`${volumes.length} volume${volumes.length !== 1 ? 's' : ''}`) : ''}
  ${secrets.length ? `<span class="ds-pill ds-pill-secret">${secrets.length} secret${secrets.length !== 1 ? 's' : ''}</span>` : ''}
  ${configs.length ? `<span class="ds-pill ds-pill-config">${configs.length} config${configs.length !== 1 ? 's' : ''}</span>` : ''}
</div>
${serviceNames.length ? `<div class="ds-services">${serviceNames.map((n) => renderService(n, services[n])).join('')}</div>` : ''}
${networks.length ? `<div class="ds-section"><h3>Networks</h3><div class="ds-resource-pills">${networks.map((n) => pill(n)).join('')}</div></div>` : ''}
${volumes.length ? `<div class="ds-section"><h3>Volumes</h3><div class="ds-resource-pills">${volumes.map((v) => pill(v)).join('')}</div></div>` : ''}
${secrets.length ? `<div class="ds-section"><h3>Secrets</h3><div class="ds-resource-pills">${secrets.map((s) => `<span class="ds-pill ds-pill-secret">${esc(s)}</span>`).join('')}</div></div>` : ''}
${configs.length ? `<div class="ds-section"><h3>Configs</h3><div class="ds-resource-pills">${configs.map((c) => `<span class="ds-pill ds-pill-config">${esc(c)}</span>`).join('')}</div></div>` : ''}`;

  return { parentNode: host };
}
