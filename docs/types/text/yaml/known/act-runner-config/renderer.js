import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.actrunner-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.actrunner-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#16a34a;color:#fff;vertical-align:middle;margin-right:8px}
.actrunner-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline}
.actrunner-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px}
.actrunner-sec{margin:12px 0}
.actrunner-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.actrunner-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px}
.actrunner-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap}
.actrunner-key{color:var(--fg-2,#888);font-size:12px;min-width:160px;flex-shrink:0}
.actrunner-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all}
.actrunner-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f)}
.actrunner-chip-green{background:#dcfce7;border-color:#86efac;color:#166534}
.actrunner-chip-red{background:#fef2f2;border-color:#fca5a5;color:#991b1b}
.actrunner-chip-blue{background:#eff6ff;border-color:#93c5fd;color:#1e40af}
.actrunner-chip-yellow{background:#fefce8;border-color:#fde047;color:#854d0e}
.actrunner-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888)}
`;

function chip(val, cls) {
  if (val == null || val === '') return '';
  return `<span class="actrunner-chip${cls ? ' actrunner-chip-' + cls : ''}">${esc(val)}</span>`;
}

function row(label, html) {
  if (!html) return '';
  return `<div class="actrunner-row"><span class="actrunner-key">${esc(label)}</span><span class="actrunner-val">${html}</span></div>`;
}

function boolChip(v, trueLabel, trueColor, falseLabel, falseColor) {
  const s = String(v ?? '').toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes') return chip(trueLabel || 'true', trueColor || 'green');
  if (s === 'false' || s === '0' || s === 'no') return chip(falseLabel || 'false', falseColor || 'gray');
  return chip(String(v), 'gray');
}

function levelChip(level) {
  if (!level) return '';
  const lower = String(level).toLowerCase();
  const cls = lower === 'debug' ? 'yellow' : lower === 'info' ? 'blue' : lower === 'warn' ? 'yellow' : lower === 'error' ? 'red' : 'gray';
  return chip(level, cls);
}

function labelsHtml(labels) {
  if (!labels) return '';
  const arr = Array.isArray(labels) ? labels : typeof labels === 'string' ? labels.split(',').map(s => s.trim()) : [];
  return arr.filter(Boolean).map(l => chip(l)).join(' ');
}

function envsHtml(envs) {
  if (!envs || typeof envs !== 'object') return '';
  return Object.entries(envs).map(([k, v]) => chip(`${k}=${v}`, 'gray')).join(' ');
}

function volumesHtml(vols) {
  if (!vols) return '';
  const arr = Array.isArray(vols) ? vols : [vols];
  return arr.map(v => chip(String(v))).join(' ');
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const log = cfg.log || {};
  const runner = cfg.runner || {};
  const cache = cfg.cache || {};
  const container = cfg.container || {};
  const host = cfg.host || {};

  const logLevel = log.level || cfg.level;
  const runnerName = runner.file || runner.name || '';

  const hostEl = document.createElement('div');
  hostEl.className = 'actrunner-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  hostEl.appendChild(style);

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px">
      <span class="actrunner-badge">Act Runner</span>
      <span class="actrunner-title">Gitea Act Runner</span>
    </div>
    <div class="actrunner-sub">Gitea GitHub Actions-compatible CI runner configuration</div>
  `;
  hostEl.appendChild(header);

  let body = '';

  // Log section
  const logRows = [
    logLevel != null ? row('level', levelChip(logLevel)) : '',
    log.filename ? row('filename', chip(log.filename)) : '',
  ].filter(Boolean).join('');
  if (logRows) body += `<div class="actrunner-sec"><h3>Log</h3><div class="actrunner-card">${logRows}</div></div>`;

  // Runner section
  const labHtml = labelsHtml(runner.labels);
  const envHtml = envsHtml(runner.envs);
  const runnerRows = [
    runner.file ? row('file', chip(runner.file)) : '',
    runner.capacity != null ? row('capacity', chip(String(runner.capacity), 'blue') + ' parallel job(s)') : '',
    labHtml ? row('labels', labHtml) : '',
    envHtml ? row('envs', envHtml) : '',
  ].filter(Boolean).join('');
  if (runnerRows) body += `<div class="actrunner-sec"><h3>Runner</h3><div class="actrunner-card">${runnerRows}</div></div>`;

  // Cache section
  const cacheEnabled = cache.enabled;
  const cacheRows = [
    cacheEnabled != null ? row('enabled', boolChip(cacheEnabled, 'enabled', 'green', 'disabled', 'gray')) : '',
    cache.dir ? row('dir', chip(cache.dir)) : '',
    cache.host ? row('host', chip(cache.host)) : '',
    cache.port != null ? row('port', chip(String(cache.port), 'blue')) : '',
    cache.external_server ? row('external-server', chip(cache.external_server)) : '',
  ].filter(Boolean).join('');
  if (cacheRows) body += `<div class="actrunner-sec"><h3>Cache</h3><div class="actrunner-card">${cacheRows}</div></div>`;

  // Container section
  const privileged = container.privileged;
  const validVols = volumesHtml(container.valid_volumes);
  const addCaps = (Array.isArray(container.docker_host) ? container.docker_host : null);
  const addCapacitiesHtml = (() => {
    const caps = container.add_capacities || container.docker_host;
    if (!caps) return '';
    const arr = Array.isArray(caps) ? caps : [caps];
    return arr.map(c => chip(String(c))).join(' ');
  })();
  const containerRows = [
    container.network ? row('network', chip(container.network)) : '',
    privileged != null ? row('privileged', boolChip(privileged, 'yes', 'red', 'no', 'gray')) : '',
    validVols ? row('valid-volumes', validVols) : '',
    addCapacitiesHtml ? row('add-capacities', addCapacitiesHtml) : '',
  ].filter(Boolean).join('');
  if (containerRows) body += `<div class="actrunner-sec"><h3>Container</h3><div class="actrunner-card">${containerRows}</div></div>`;

  // Host section
  const hostRows = [
    host.workdir_parent ? row('workdir-parent', chip(host.workdir_parent)) : '',
  ].filter(Boolean).join('');
  if (hostRows) body += `<div class="actrunner-sec"><h3>Host</h3><div class="actrunner-card">${hostRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Act Runner configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  hostEl.appendChild(bodyDiv);

  return { parentNode: hostEl };
}
