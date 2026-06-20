const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SENSITIVE = /SECRET|TOKEN|KEY|PASSWORD|API/i;

const CSS = `
.railwayjson-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-railwayjson{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px}
.rwj2-title{font-size:18px;font-weight:700;margin:0 0 4px}
.rwj2-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.rwj2-sec{margin:12px 0}
.rwj2-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.rwj2-schema{font:11px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);margin-bottom:10px;word-break:break-all}
.rwj2-table{width:100%;border-collapse:collapse;font-size:13px}
.rwj2-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.rwj2-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-size:12px}
.rwj2-name{font-family:ui-monospace,monospace;font-weight:600}
.rwj2-source{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600;background:#f5f3ff;border:1px solid #c4b5fd;color:#5b21b6}
.rwj2-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 14px;align-items:start;font-size:12px}
.rwj2-kk{color:var(--fg-2,#888);white-space:nowrap;padding-top:1px}
.rwj2-vv{font-family:ui-monospace,monospace;word-break:break-all}
.rwj2-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px}
.rwj2-masked{color:var(--fg-2,#888);font-style:italic}
.rwj2-pill{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:2px 2px 2px 0;font-family:ui-monospace,monospace}
`;

function maskEnv(key, val) {
  if (SENSITIVE.test(key)) return '<span class="rwj2-masked">[configured]</span>';
  return `<span class="rwj2-vv">${esc(val)}</span>`;
}

function renderEnvVars(envObj) {
  if (!envObj || typeof envObj !== 'object') return '';
  const entries = Array.isArray(envObj)
    ? envObj.map((e) => [e.name || e.key || '', e.value ?? ''])
    : Object.entries(envObj);
  if (!entries.length) return '';
  const rows = entries.map(([k, v]) =>
    `<div class="rwj2-kv"><span class="rwj2-kk">${esc(k)}</span>${maskEnv(k, v)}</div>`
  ).join('');
  return `<div class="rwj2-sec"><h3>Environment Variables</h3>${rows}</div>`;
}

function renderService(svc, idx) {
  const name = svc.name || `Service ${idx + 1}`;
  const source = svc.source?.image
    ? `docker:${svc.source.image}`
    : svc.source?.repo
    ? `repo:${svc.source.repo}`
    : svc.build?.builder || 'nixpacks';
  const healthcheck = svc.deploy?.healthcheckPath || null;
  const startCmd = svc.deploy?.startCommand || null;
  const envVars = svc.variables || svc.envVars || null;
  const volumes = Array.isArray(svc.mounts) ? svc.mounts : [];

  let inner = `<div class="rwj2-kv">
    <span class="rwj2-kk">source</span><span><span class="rwj2-source">${esc(source)}</span></span>
    ${healthcheck ? `<span class="rwj2-kk">healthcheck</span><span class="rwj2-vv">${esc(healthcheck)}</span>` : ''}
    ${startCmd ? `<span class="rwj2-kk">start cmd</span><span class="rwj2-vv">${esc(startCmd)}</span>` : ''}
  </div>`;

  if (envVars) {
    const entries = Array.isArray(envVars)
      ? envVars.map((e) => [e.name || e.key || '', e.value ?? ''])
      : Object.entries(envVars);
    if (entries.length) {
      inner += `<div style="margin-top:8px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin-bottom:4px">Env (${entries.length})</div>`;
      inner += entries.map(([k, v]) =>
        `<div class="rwj2-kv"><span class="rwj2-kk">${esc(k)}</span>${maskEnv(k, String(v))}</div>`
      ).join('');
    }
  }

  if (volumes.length) {
    inner += `<div style="margin-top:8px"><span style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888)">Volumes</span><div style="margin-top:4px">${
      volumes.map((m) => `<span class="rwj2-pill">${esc(m.mountPath || m)}</span>`).join('')
    }</div></div>`;
  }

  return `<div class="rwj2-card"><div style="font-weight:600;font-size:13px;margin-bottom:6px">${esc(name)}</div>${inner}</div>`;
}

export function render(intake) {
  const cfg = intake.parsed ?? (() => { try { return JSON.parse(intake.text || '{}'); } catch { return {}; } })();

  // Multi-service format (services array) or legacy single-service format
  const services = Array.isArray(cfg.services) ? cfg.services : null;
  const networks = Array.isArray(cfg.networks) ? cfg.networks : (cfg.networks ? Object.keys(cfg.networks) : []);

  const schema = cfg.$schema || '';

  let subParts = [];
  if (services) {
    subParts.push(`${services.length} service${services.length !== 1 ? 's' : ''}`);
  } else {
    const builder = (cfg.build || {}).builder;
    if (builder) subParts.push(builder);
    if ((cfg.deploy || {}).cronSchedule) subParts.push('cron');
    const replicas = (cfg.deploy || {}).numReplicas;
    if (replicas != null) subParts.push(`${replicas} replica${replicas !== 1 ? 's' : ''}`);
  }
  const sub = subParts.join(' · ') || 'Railway deployment';

  let body = '';

  if (schema) {
    body += `<div class="rwj2-schema">${esc(schema)}</div>`;
  }

  if (services) {
    body += `<div class="rwj2-sec"><h3>Services (${services.length})</h3>${services.map((s, i) => renderService(s, i)).join('')}</div>`;
  } else {
    // Legacy single-service layout
    const build = cfg.build || {};
    const deploy = cfg.deploy || {};
    const builder = build.builder || '—';
    const buildCmd = build.buildCommand || build.nixpacksBuildCmd || null;
    const startCmd = deploy.startCommand || null;
    const restartPolicy = deploy.restartPolicyType || null;
    const healthcheck = deploy.healthcheckPath || null;
    const cronSchedule = deploy.cronSchedule || null;
    const numReplicas = deploy.numReplicas != null ? deploy.numReplicas : null;

    const rows = [
      `<span class="rwj2-kk">builder</span><span class="rwj2-vv">${esc(builder)}</span>`,
      buildCmd ? `<span class="rwj2-kk">build cmd</span><span class="rwj2-vv">${esc(buildCmd)}</span>` : '',
      startCmd ? `<span class="rwj2-kk">start cmd</span><span class="rwj2-vv">${esc(startCmd)}</span>` : '',
      restartPolicy ? `<span class="rwj2-kk">restart policy</span><span class="rwj2-vv">${esc(restartPolicy)}</span>` : '',
      healthcheck ? `<span class="rwj2-kk">healthcheck</span><span class="rwj2-vv">${esc(healthcheck)}</span>` : '',
      cronSchedule ? `<span class="rwj2-kk">cron schedule</span><span class="rwj2-vv">${esc(cronSchedule)}</span>` : '',
      numReplicas != null ? `<span class="rwj2-kk">replicas</span><span class="rwj2-vv">${esc(numReplicas)}</span>` : '',
    ].filter(Boolean).join('');

    if (rows) {
      body += `<div class="rwj2-sec"><h3>Deployment</h3><div class="rwj2-card"><div class="rwj2-kv">${rows}</div></div></div>`;
    }

    if (cfg.variables || cfg.envVars) {
      body += renderEnvVars(cfg.variables || cfg.envVars);
    }
  }

  if (networks.length) {
    body += `<div class="rwj2-sec"><h3>Networks</h3><div>${networks.map((n) => `<span class="rwj2-pill">${esc(typeof n === 'string' ? n : n.name || JSON.stringify(n))}</span>`).join('')}</div></div>`;
  }

  const host = document.createElement('div');
  host.className = 'railwayjson-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="rwj2-title"><span class="badge-railwayjson">Railway</span>railway.json</div>
<div class="rwj2-sub">${esc(sub)}</div>
${body}`;
  return { parentNode: host };
}
