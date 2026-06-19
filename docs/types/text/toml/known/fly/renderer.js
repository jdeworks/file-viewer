import { parseTOML } from '../../toml.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fly-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-fly{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.fly-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.fly-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.fly-sec{margin:12px 0;}
.fly-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.fly-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.fly-pill{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.fly-table{width:100%;border-collapse:collapse;font-size:13px;}
.fly-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.fly-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px;}
.fly-kv{font-size:12px;display:flex;gap:8px;align-items:baseline;margin:3px 0;}
.fly-key{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);}
.fly-val{font:12px/1.4 ui-monospace,monospace;font-weight:600;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }

  const appName = cfg.app || '—';
  const region = cfg.primary_region || '';
  const build = cfg.build || {};
  const envVars = cfg.env && typeof cfg.env === 'object' ? Object.entries(cfg.env) : [];
  const services = Array.isArray(cfg.services) ? cfg.services : [];
  const mounts = Array.isArray(cfg.mounts) ? cfg.mounts : [];

  const host = document.createElement('div');
  host.className = 'fly-doc';

  const buildInfo = build.image
    ? `<div class="fly-kv"><span class="fly-key">image</span><span class="fly-val">${esc(build.image)}</span></div>`
    : build.builder
    ? `<div class="fly-kv"><span class="fly-key">builder</span><span class="fly-val">${esc(build.builder)}</span></div>`
    : '';
  const buildHtml = buildInfo
    ? `<div class="fly-sec"><h3>Build</h3>${buildInfo}</div>` : '';

  const envHtml = envVars.length
    ? `<div class="fly-sec"><h3>Environment (${envVars.length})</h3><div class="fly-pills">${envVars.slice(0, 12).map(([k, v]) => `<span class="fly-pill">${esc(k)}=<span style="color:var(--fg-2,#888)">${esc(String(v).slice(0, 20))}</span></span>`).join('')}${envVars.length > 12 ? `<span class="fly-pill" style="color:var(--fg-2,#888)">+${envVars.length - 12} more</span>` : ''}</div></div>`
    : '';

  const servicesHtml = services.length
    ? `<div class="fly-sec"><h3>Services (${services.length})</h3><table class="fly-table"><thead><tr><th>Port</th><th>Protocol</th><th>Handlers</th></tr></thead><tbody>${services.map((s) => {
        const ports = Array.isArray(s.ports) ? s.ports : [];
        const extPort = ports.map((p) => p.port).join(', ') || '—';
        const handlers = ports.flatMap((p) => Array.isArray(p.handlers) ? p.handlers : []).join(', ') || '—';
        return `<tr><td>${esc(s.internal_port || '—')} → ${esc(extPort)}</td><td>${esc(s.protocol || '—')}</td><td>${esc(handlers)}</td></tr>`;
      }).join('')}</tbody></table></div>`
    : '';

  const mountsHtml = mounts.length
    ? `<div class="fly-sec"><h3>Mounts</h3><div class="fly-pills">${mounts.map((m) => `<span class="fly-pill">${esc(m.source || '?')} → ${esc(m.destination || '?')}</span>`).join('')}</div></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="fly-title"><span class="badge-fly">Fly.io</span>${esc(appName)}</div>
<div class="fly-sub">${region ? `Primary region: ${esc(region)}` : ''}${services.length ? ` · ${services.length} service${services.length !== 1 ? 's' : ''}` : ''}</div>
${buildHtml}
${envHtml}
${servicesHtml}
${mountsHtml}`;

  return { parentNode: host };
}
