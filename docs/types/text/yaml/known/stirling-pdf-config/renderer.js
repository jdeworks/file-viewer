// Stirling PDF settings.yml viewer
// Shows UI, Security, System, Endpoints, and Metrics sections.
import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.strpdf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.strpdf-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#d32f2f;color:#fff;vertical-align:middle;margin-right:8px;}
.strpdf-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.strpdf-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.strpdf-sec{margin:12px 0;}
.strpdf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.strpdf-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.strpdf-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.strpdf-key{color:var(--fg-2,#888);font-size:12px;min-width:200px;flex-shrink:0;}
.strpdf-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.strpdf-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
.strpdf-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.strpdf-chip-on{background:#d1fae5;border-color:#6ee7b7;color:#065f46;}
.strpdf-chip-off{background:#fee2e2;border-color:#fca5a5;color:#991b1b;}
.strpdf-chip-neutral{background:#e0f2fe;border-color:#7dd3fc;color:#075985;}
`;

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="strpdf-chip${cls ? ' ' + cls : ''}">${esc(String(val))}</span>`;
}

function masked() {
  return '<span class="strpdf-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="strpdf-row"><span class="strpdf-key">${esc(label)}</span><span class="strpdf-val">${html}</span></div>`;
}

function boolChip(val) {
  if (val === true || val === 'true') return chip('enabled', 'strpdf-chip-on');
  if (val === false || val === 'false') return chip('disabled', 'strpdf-chip-off');
  if (val == null) return '';
  return chip(String(val), 'strpdf-chip-neutral');
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
  const endpoints = cfg.endpoints || {};
  const metrics = cfg.metrics || {};

  const title = ui.appName || 'Stirling PDF Config';

  // UI section
  const uiRows = [
    ui.appName != null ? row('appName', chip(String(ui.appName), 'strpdf-chip-neutral')) : '',
    ui.homeDescription != null ? row('homeDescription', chip(String(ui.homeDescription))) : '',
    ui.appNavbarName != null ? row('appNavbarName', chip(String(ui.appNavbarName))) : '',
  ].filter(Boolean).join('');

  // Security section
  const secRows = [
    security.enableLogin != null ? row('enableLogin', boolChip(security.enableLogin)) : '',
    security.initialLogin != null ? row('initialLogin', boolChip(security.initialLogin)) : '',
    security.username != null ? row('username', chip(String(security.username))) : '',
    security.password != null ? row('password', masked()) : '',
  ].filter(Boolean).join('');

  // System section
  const sysRows = [
    system.defaultLocale != null ? row('defaultLocale', chip(String(system.defaultLocale), 'strpdf-chip-neutral')) : '',
    system.googlevisibility != null ? row('googlevisibility', boolChip(system.googlevisibility)) : '',
    system.customStaticFilePath != null ? row('customStaticFilePath', chip(String(system.customStaticFilePath))) : '',
  ].filter(Boolean).join('');

  // Endpoints section — list items in toRemove array
  let endpointsHtml = '';
  const toRemove = Array.isArray(endpoints.toRemove) ? endpoints.toRemove : [];
  if (toRemove.length > 0) {
    const chips = toRemove.map((ep) => chip(String(ep), 'strpdf-chip-off')).join(' ');
    endpointsHtml = `<div class="strpdf-row"><span class="strpdf-key">toRemove</span><span class="strpdf-val">${chips}</span></div>`;
  }

  // Metrics section
  const metricsRows = [
    metrics.enabled != null ? row('enabled', boolChip(metrics.enabled)) : '',
  ].filter(Boolean).join('');

  let body = '';
  if (uiRows) body += `<div class="strpdf-sec"><h3>UI</h3><div class="strpdf-card">${uiRows}</div></div>`;
  if (secRows) body += `<div class="strpdf-sec"><h3>Security</h3><div class="strpdf-card">${secRows}</div></div>`;
  if (sysRows) body += `<div class="strpdf-sec"><h3>System</h3><div class="strpdf-card">${sysRows}</div></div>`;
  if (endpointsHtml) body += `<div class="strpdf-sec"><h3>Endpoints</h3><div class="strpdf-card">${endpointsHtml}</div></div>`;
  if (metricsRows) body += `<div class="strpdf-sec"><h3>Metrics</h3><div class="strpdf-card">${metricsRows}</div></div>`;

  const host = document.createElement('div');
  host.className = 'strpdf-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="margin-bottom:4px;"><span class="strpdf-badge">Stirling PDF</span><span class="strpdf-title">${esc(title)}</span></div>
<div class="strpdf-sub">Stirling PDF self-hosted PDF tools configuration</div>
${body || '<div style="color:var(--fg-2,#888);font-size:13px;">No configuration found.</div>'}`;

  return { parentNode: host };
}
