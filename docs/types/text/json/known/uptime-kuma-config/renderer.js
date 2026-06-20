const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ukuma-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-ukuma{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3ba55d;color:#fff;vertical-align:middle;margin-right:8px;}
.ukuma-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ukuma-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ukuma-sec{margin:14px 0;}
.ukuma-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.ukuma-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.ukuma-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.ukuma-kv-k{color:var(--fg-2,#888);min-width:140px;flex-shrink:0;}
.ukuma-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.ukuma-badge{display:inline-block;font-size:11px;padding:2px 8px;border-radius:5px;font-weight:600;vertical-align:middle;}
.ukuma-badge-on{background:#dcfce7;border:1px solid #86efac;color:#166534;}
.ukuma-badge-off{background:#f1f5f9;border:1px solid var(--border,#e0e0e0);color:var(--fg-2,#888);}
.ukuma-badge-warn{background:#fef9c3;border:1px solid #fde047;color:#854d0e;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="ukuma-kv"><span class="ukuma-kv-k">${esc(label)}</span><span class="ukuma-kv-v">${esc(String(value))}</span></div>`;
}

function boolBadge(value, trueLabel = 'Yes', falseLabel = 'No', trueClass = 'ukuma-badge-on', falseClass = 'ukuma-badge-off') {
  const on = value === true || value === 'true' || value === 1;
  return `<span class="ukuma-badge ${on ? trueClass : falseClass}">${on ? trueLabel : falseLabel}</span>`;
}

function kvBadge(label, value, trueLabel, falseLabel, trueClass, falseClass) {
  if (value == null) return '';
  return `<div class="ukuma-kv"><span class="ukuma-kv-k">${esc(label)}</span><span class="ukuma-kv-v">${boolBadge(value, trueLabel, falseLabel, trueClass, falseClass)}</span></div>`;
}

export function render(intake) {
  let cfg;
  try { cfg = typeof intake.parsed === 'object' && intake.parsed ? intake.parsed : JSON.parse(intake.text || '{}'); } catch {
    return { parentNode: Object.assign(document.createElement('div'), { textContent: 'Invalid Uptime Kuma config JSON.' }) };
  }

  // Server section
  const serverHtml = `<div class="ukuma-sec"><h3>Server</h3><div class="ukuma-card">
${kv('Port', cfg.port)}
${kv('Hostname', cfg.hostname)}
${cfg.rateLimitCheck != null ? kvBadge('Rate limit check', cfg.rateLimitCheck, 'Enabled', 'Disabled') : ''}
${cfg.maxInputLength != null ? kv('Max input length', cfg.maxInputLength) : ''}
</div></div>`;

  // Auth section
  const authHtml = `<div class="ukuma-sec"><h3>Auth</h3><div class="ukuma-card">
${cfg.disableAuth != null ? kvBadge('Auth disabled', cfg.disableAuth, 'Yes (auth off)', 'No (auth enabled)', 'ukuma-badge-warn', 'ukuma-badge-on') : ''}
</div></div>`;

  // Features section
  const featuresItems = [
    cfg.demoMode != null ? kvBadge('Demo mode', cfg.demoMode, 'On', 'Off', 'ukuma-badge-warn', 'ukuma-badge-off') : '',
    cfg.trustProxy != null ? kvBadge('Trust proxy', cfg.trustProxy, 'Enabled', 'Disabled') : '',
    cfg.disableAutoUpdate != null ? kvBadge('Auto update', cfg.disableAutoUpdate, 'Disabled', 'Enabled', 'ukuma-badge-warn', 'ukuma-badge-on') : '',
    cfg.allowAllChromeAgents != null ? kvBadge('Allow all Chrome agents', cfg.allowAllChromeAgents, 'Yes', 'No') : '',
  ].filter(Boolean).join('');

  const featuresHtml = featuresItems ? `<div class="ukuma-sec"><h3>Features</h3><div class="ukuma-card">${featuresItems}</div></div>` : '';

  // Extra unknown keys
  const knownKeys = new Set(['port', 'hostname', 'rateLimitCheck', 'maxInputLength', 'disableAuth', 'demoMode', 'trustProxy', 'disableAutoUpdate', 'allowAllChromeAgents']);
  const extraEntries = Object.entries(cfg).filter(([k]) => !knownKeys.has(k));
  const extraHtml = extraEntries.length ? `<div class="ukuma-sec"><h3>Other Settings</h3><div class="ukuma-card">
${extraEntries.map(([k, v]) => kv(k, typeof v === 'object' ? JSON.stringify(v) : v)).join('')}
</div></div>` : '';

  const subParts = [
    cfg.port ? `port ${cfg.port}` : '',
    cfg.hostname ? cfg.hostname : '',
    cfg.demoMode ? 'demo mode' : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'ukuma-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-ukuma">Uptime Kuma</span>
  <span class="ukuma-title">Uptime Kuma Monitor Config</span>
</div>
<div class="ukuma-sub">${esc(subParts)}</div>
${serverHtml}${authHtml}${featuresHtml}${extraHtml}`;
  return { parentNode: host };
}
