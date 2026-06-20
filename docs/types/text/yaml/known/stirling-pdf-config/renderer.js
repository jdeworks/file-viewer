// Stirling-PDF settings.yml viewer
// Shows UI, Security, System, Premium, and Metrics sections.
import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.spdf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.spdf-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#dc2626;color:#fff;vertical-align:middle;margin-right:8px;}
.spdf-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.spdf-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.spdf-sec{margin:12px 0;}
.spdf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.spdf-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.spdf-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.spdf-key{color:var(--fg-2,#888);font-size:12px;min-width:200px;flex-shrink:0;}
.spdf-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.spdf-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
.spdf-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.spdf-chip-on{background:#d1fae5;border-color:#6ee7b7;color:#065f46;}
.spdf-chip-off{background:#fee2e2;border-color:#fca5a5;color:#991b1b;}
.spdf-chip-neutral{background:#e0f2fe;border-color:#7dd3fc;color:#075985;}
`;

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="spdf-chip${cls ? ' ' + cls : ''}">${esc(String(val))}</span>`;
}

function masked() {
  return '<span class="spdf-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="spdf-row"><span class="spdf-key">${esc(label)}</span><span class="spdf-val">${html}</span></div>`;
}

function boolChip(val) {
  if (val === true || val === 'true') return chip('enabled', ' spdf-chip-on');
  if (val === false || val === 'false') return chip('disabled', ' spdf-chip-off');
  if (val == null) return '';
  return chip(String(val), ' spdf-chip-neutral');
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch {
    cfg = intake.parsed || {};
  }

  const ui = cfg.ui || {};
  const security = cfg.security || {};
  const system = cfg.system || {};
  const premium = cfg.premium || {};
  const metrics = cfg.metrics || {};

  const appName = ui.appName || ui['app-name'] || 'Stirling-PDF';

  // UI section
  const uiRows = [
    (ui.appName || ui['app-name']) != null ? row('appName', chip(String(ui.appName || ui['app-name']), ' spdf-chip-neutral')) : '',
    ui.homeDescription != null ? row('homeDescription', chip(String(ui.homeDescription))) : '',
    ui.appNavbarName != null ? row('appNavbarName', chip(String(ui.appNavbarName))) : '',
  ].filter(Boolean).join('');

  // Security section
  const secRows = [
    security.enableLogin != null ? row('enableLogin', boolChip(security.enableLogin)) : '',
    security.initialUsername != null ? row('initialUsername', chip(String(security.initialUsername))) : '',
    security.initialPassword != null ? row('initialPassword', masked()) : '',
    security.csrfDisabled != null ? row('csrfDisabled', boolChip(security.csrfDisabled)) : '',
  ].filter(Boolean).join('');

  // System section
  const sysRows = [
    system.defaultLocale != null ? row('defaultLocale', chip(String(system.defaultLocale), ' spdf-chip-neutral')) : '',
    system.googlevisibility != null ? row('googlevisibility', boolChip(system.googlevisibility)) : '',
    system.customStaticFilePath != null ? row('customStaticFilePath', chip(String(system.customStaticFilePath))) : '',
    system.maxFileSize != null ? row('maxFileSize', chip(String(system.maxFileSize), ' spdf-chip-neutral')) : '',
  ].filter(Boolean).join('');

  // Premium section
  const premiumRows = [
    premium.key != null ? row('key', masked()) : '',
    premium.enabled != null ? row('enabled', boolChip(premium.enabled)) : '',
  ].filter(Boolean).join('');

  // Metrics section
  const metricsRows = [
    metrics.enabled != null ? row('enabled', boolChip(metrics.enabled)) : '',
  ].filter(Boolean).join('');

  let body = '';
  if (uiRows) body += `<div class="spdf-sec"><h3>UI</h3><div class="spdf-card">${uiRows}</div></div>`;
  if (secRows) body += `<div class="spdf-sec"><h3>Security</h3><div class="spdf-card">${secRows}</div></div>`;
  if (sysRows) body += `<div class="spdf-sec"><h3>System</h3><div class="spdf-card">${sysRows}</div></div>`;
  if (premiumRows) body += `<div class="spdf-sec"><h3>Premium</h3><div class="spdf-card">${premiumRows}</div></div>`;
  if (metricsRows) body += `<div class="spdf-sec"><h3>Metrics</h3><div class="spdf-card">${metricsRows}</div></div>`;

  const host = document.createElement('div');
  host.className = 'spdf-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="margin-bottom:4px;"><span class="spdf-badge">Stirling-PDF</span><span class="spdf-title">${esc(appName)}</span></div>
<div class="spdf-sub">Stirling-PDF self-hosted PDF tools configuration</div>
${body || '<div style="color:var(--fg-2,#888);font-size:13px;">No configuration found.</div>'}`;

  return { parentNode: host };
}
