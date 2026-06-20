import { parseTOML } from '../../toml.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SECRET_RE = /secret|token|key|password|api/i;
function maskVal(k, v) {
  return SECRET_RE.test(k) ? '[configured]' : String(v == null ? '' : v).slice(0, 40);
}

const CSS = `
.flytoml-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.flytoml-doc .badge-fly{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7b2ff7;color:#fff;vertical-align:middle;margin-right:8px;}
.flytoml-doc .fly-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.flytoml-doc .fly-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.flytoml-doc .fly-sec{margin:14px 0;}
.flytoml-doc .fly-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.flytoml-doc .fly-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:4px 0;}
.flytoml-doc .fly-key{color:var(--fg-2,#888);font-size:12px;}
.flytoml-doc .fly-val{font:12px/1.4 ui-monospace,monospace;font-weight:600;word-break:break-all;}
.flytoml-doc .fly-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.flytoml-doc .fly-pill{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.flytoml-doc .fly-pill-muted{color:var(--fg-2,#888);}
.flytoml-doc .fly-table{width:100%;border-collapse:collapse;font-size:13px;}
.flytoml-doc .fly-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.flytoml-doc .fly-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px;}
.flytoml-doc .fly-masked{color:var(--fg-2,#888);font-style:italic;}
`;

function kv(key, val) {
  if (val == null || val === '') return '';
  return `<span class="fly-key">${esc(key)}</span><span class="fly-val">${esc(val)}</span>`;
}

export function render(intake) {
  let cfg = {};
  try {
    if (intake.parsed && typeof intake.parsed === 'object') {
      cfg = intake.parsed;
    } else {
      cfg = parseTOML(intake.text || '') || {};
    }
  } catch { cfg = {}; }

  const appName = cfg.app || '—';
  const region = cfg.primary_region || '';
  const build = cfg.build || {};
  const envVars = cfg.env && typeof cfg.env === 'object' ? Object.entries(cfg.env) : [];

  // http_service (modern flat config)
  const httpSvc = cfg.http_service || {};
  // [[services]] (legacy array config)
  const services = Array.isArray(cfg.services) ? cfg.services : [];
  // [[vm]]
  const vms = Array.isArray(cfg.vm) ? cfg.vm : (cfg.vm ? [cfg.vm] : []);
  const mounts = Array.isArray(cfg.mounts) ? cfg.mounts : [];
  const processes = cfg.processes && typeof cfg.processes === 'object' ? Object.entries(cfg.processes) : [];

  const host = document.createElement('div');
  host.className = 'flytoml-doc';

  // Build section
  const buildLines = [
    build.dockerfile ? kv('dockerfile', build.dockerfile) : '',
    build.builder ? kv('builder', build.builder) : '',
    build.image ? kv('image', build.image) : '',
  ].filter(Boolean);
  if (build.args && typeof build.args === 'object') {
    Object.entries(build.args).forEach(([k, v]) => buildLines.push(kv(`arg.${k}`, v)));
  }
  const buildHtml = buildLines.length
    ? `<div class="fly-sec"><h3>Build</h3><div class="fly-grid">${buildLines.join('')}</div></div>`
    : '';

  // http_service section (modern)
  const httpLines = [
    httpSvc.internal_port != null ? kv('internal_port', httpSvc.internal_port) : '',
    httpSvc.force_https != null ? kv('force_https', httpSvc.force_https) : '',
    httpSvc.auto_stop_machines != null ? kv('auto_stop_machines', httpSvc.auto_stop_machines) : '',
    httpSvc.auto_start_machines != null ? kv('auto_start_machines', httpSvc.auto_start_machines) : '',
    httpSvc.min_machines_running != null ? kv('min_machines_running', httpSvc.min_machines_running) : '',
  ].filter(Boolean);
  const httpHtml = httpLines.length
    ? `<div class="fly-sec"><h3>HTTP Service</h3><div class="fly-grid">${httpLines.join('')}</div></div>`
    : '';

  // [[services]] legacy
  const servicesHtml = services.length
    ? `<div class="fly-sec"><h3>Services (${services.length})</h3><table class="fly-table"><thead><tr><th>Port</th><th>Protocol</th><th>Handlers</th></tr></thead><tbody>${services.map((s) => {
        const ports = Array.isArray(s.ports) ? s.ports : [];
        const extPort = ports.map((p) => p.port).join(', ') || '—';
        const handlers = ports.flatMap((p) => Array.isArray(p.handlers) ? p.handlers : []).join(', ') || '—';
        return `<tr><td>${esc(s.internal_port || '—')} → ${esc(extPort)}</td><td>${esc(s.protocol || '—')}</td><td>${esc(handlers)}</td></tr>`;
      }).join('')}</tbody></table></div>`
    : '';

  // [[vm]]
  const vmHtml = vms.length
    ? `<div class="fly-sec"><h3>VM</h3><div class="fly-grid">${vms.flatMap((v) => [
        v.cpu_kind != null ? kv('cpu_kind', v.cpu_kind) : '',
        v.cpus != null ? kv('cpus', v.cpus) : '',
        v.memory_mb != null ? kv('memory_mb', v.memory_mb + ' MB') : '',
        v.size != null ? kv('size', v.size) : '',
      ].filter(Boolean)).join('')}</div></div>`
    : '';

  // env vars with secret masking
  const envHtml = envVars.length
    ? `<div class="fly-sec"><h3>Environment (${envVars.length})</h3><div class="fly-pills">${envVars.slice(0, 16).map(([k, v]) => {
        const masked = SECRET_RE.test(k);
        const display = masked ? `<span class="fly-masked">[configured]</span>` : `<span class="fly-pill-muted">${esc(String(v).slice(0, 20))}</span>`;
        return `<span class="fly-pill">${esc(k)}=${display}</span>`;
      }).join('')}${envVars.length > 16 ? `<span class="fly-pill fly-pill-muted">+${envVars.length - 16} more</span>` : ''}</div></div>`
    : '';

  // mounts
  const mountsHtml = mounts.length
    ? `<div class="fly-sec"><h3>Mounts</h3><div class="fly-pills">${mounts.map((m) => `<span class="fly-pill">${esc(m.source || '?')} → ${esc(m.destination || '?')}</span>`).join('')}</div></div>`
    : '';

  // processes
  const processesHtml = processes.length
    ? `<div class="fly-sec"><h3>Processes</h3><div class="fly-grid">${processes.map(([k, v]) => kv(k, v)).join('')}</div></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="fly-title"><span class="badge-fly">Fly.io</span>${esc(appName)}</div>
<div class="fly-sub">${[
  region ? `Primary region: ${esc(region)}` : '',
  services.length ? `${services.length} service${services.length !== 1 ? 's' : ''}` : '',
  Object.keys(httpSvc).length ? 'http_service configured' : '',
].filter(Boolean).join(' · ')}</div>
${buildHtml}
${httpHtml}
${servicesHtml}
${vmHtml}
${envHtml}
${mountsHtml}
${processesHtml}`;

  return { parentNode: host };
}
