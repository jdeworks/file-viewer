const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rwj-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-rwj{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0B0D0E;color:#fff;vertical-align:middle;margin-right:8px}
.rwj-title{font-size:18px;font-weight:700;margin:0 0 4px}
.rwj-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.rwj-sec{margin:12px 0}
.rwj-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.rwj-kv{display:grid;grid-template-columns:max-content 1fr;gap:6px 16px;align-items:start;font-size:13px}
.rwj-key{color:var(--fg-2,#888);font-size:12px;white-space:nowrap;padding-top:1px}
.rwj-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all}
.rwj-badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0)}
.rwj-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { /* malformed */ }

  const schema = cfg.$schema || '';
  const build = cfg.build || {};
  const deploy = cfg.deploy || {};

  const builder = build.builder || '—';
  const buildCmd = build.buildCommand || build.nixpacksBuildCmd || null;
  const startCmd = deploy.startCommand || '—';
  const restartPolicy = deploy.restartPolicyType || '—';
  const cronSchedule = deploy.cronSchedule || null;
  const healthcheck = deploy.healthcheckPath || null;
  const numReplicas = deploy.numReplicas != null ? deploy.numReplicas : null;

  const isRailway = schema.includes('railway') || cfg.$schema != null;
  const subParts = [];
  if (builder !== '—') subParts.push(builder);
  if (cronSchedule) subParts.push('cron');
  if (numReplicas != null) subParts.push(`${numReplicas} replica${numReplicas !== 1 ? 's' : ''}`);
  const sub = subParts.join(' · ') || 'Railway deployment';

  const buildHtml = `<div class="rwj-sec"><h3>Build</h3><div class="rwj-card"><div class="rwj-kv">
    <span class="rwj-key">builder</span><span class="rwj-val"><span class="rwj-badge">${esc(builder)}</span></span>
    ${buildCmd ? `<span class="rwj-key">build cmd</span><span class="rwj-val">${esc(buildCmd)}</span>` : ''}
  </div></div></div>`;

  const deployRows = [
    startCmd !== '—' ? `<span class="rwj-key">start cmd</span><span class="rwj-val">${esc(startCmd)}</span>` : '',
    restartPolicy !== '—' ? `<span class="rwj-key">restart policy</span><span class="rwj-val">${esc(restartPolicy)}</span>` : '',
    healthcheck ? `<span class="rwj-key">healthcheck</span><span class="rwj-val">${esc(healthcheck)}</span>` : '',
    cronSchedule ? `<span class="rwj-key">cron schedule</span><span class="rwj-val">${esc(cronSchedule)}</span>` : '',
    numReplicas != null ? `<span class="rwj-key">replicas</span><span class="rwj-val">${esc(numReplicas)}</span>` : '',
  ].filter(Boolean).join('');

  const deployHtml = deployRows
    ? `<div class="rwj-sec"><h3>Deploy</h3><div class="rwj-card"><div class="rwj-kv">${deployRows}</div></div></div>`
    : '';

  const schemaHtml = schema
    ? `<div class="rwj-sec"><h3>Schema</h3><div style="font:11px/1.4 ui-monospace,monospace;color:var(--fg-2,#888)">${esc(schema)}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'rwj-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="rwj-title"><span class="badge-rwj">Railway</span>railway.json</div>
<div class="rwj-sub">${esc(sub)}</div>
${buildHtml}${deployHtml}${schemaHtml}`;
  return { parentNode: host };
}
