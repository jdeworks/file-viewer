import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.art-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-art{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e05d00;color:#fff;vertical-align:middle;margin-right:8px}
.art-title{font-size:18px;font-weight:700;margin:0 0 4px}
.art-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.art-sec{margin:12px 0}
.art-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.art-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0}
.art-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888)}
.art-v{font:12px/1.6 ui-monospace,monospace;font-weight:600}
.art-table{width:100%;border-collapse:collapse;font-size:13px;margin:4px 0}
.art-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.art-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px}
.art-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.art-pill{display:inline-flex;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const config = cfg.config || {};
  const target = config.target || null;
  const phases = Array.isArray(config.phases) ? config.phases : [];
  const scenarios = Array.isArray(cfg.scenarios) ? cfg.scenarios : [];
  const plugins = config.plugins ? Object.keys(config.plugins) : [];
  const environments = config.environments ? Object.keys(config.environments) : [];

  const kvRows = [];
  if (target) kvRows.push(`<div class="art-k">target</div><div class="art-v">${esc(target)}</div>`);
  if (config.http?.timeout) kvRows.push(`<div class="art-k">http timeout</div><div class="art-v">${esc(config.http.timeout)}s</div>`);
  if (config.http?.maxSockets) kvRows.push(`<div class="art-k">maxSockets</div><div class="art-v">${esc(config.http.maxSockets)}</div>`);

  const settingsHtml = kvRows.length
    ? `<div class="art-sec"><h3>Config</h3><div class="art-kv">${kvRows.join('')}</div></div>`
    : '';

  const phasesHtml = phases.length
    ? `<div class="art-sec"><h3>Phases (${phases.length})</h3>
<table class="art-table"><thead><tr><th>#</th><th>Duration (s)</th><th>Arrival Rate</th><th>Ramp To</th></tr></thead>
<tbody>${phases.map((p, i) => {
    const dur = p.duration != null ? p.duration : '?';
    const arr = p.arrivalRate != null ? p.arrivalRate : (p.arrivalCount != null ? `${p.arrivalCount} total` : '—');
    const ramp = p.rampTo != null ? p.rampTo : '—';
    return `<tr><td>${i + 1}</td><td>${esc(dur)}</td><td>${esc(arr)}</td><td>${esc(ramp)}</td></tr>`;
  }).join('')}</tbody></table></div>`
    : '';

  const scenariosHtml = scenarios.length
    ? `<div class="art-sec"><h3>Scenarios (${scenarios.length})</h3>
<div class="art-pills">${scenarios.map((s) => {
    const name = s.name || s.flow?.[0]?.get?.url || '(unnamed)';
    const steps = Array.isArray(s.flow) ? s.flow.length : 0;
    return `<span class="art-pill">${esc(name)}${steps ? ` · ${steps} steps` : ''}</span>`;
  }).join('')}</div></div>`
    : '';

  const pluginsHtml = plugins.length
    ? `<div class="art-sec"><h3>Plugins</h3><div class="art-pills">${plugins.map((p) => `<span class="art-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const envsHtml = environments.length
    ? `<div class="art-sec"><h3>Environments</h3><div class="art-pills">${environments.map((e) => `<span class="art-pill">${esc(e)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'art-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="art-title"><span class="badge-art">Artillery</span>artillery.yml</div>
<div class="art-sub">Load testing configuration</div>
${settingsHtml}${phasesHtml}${scenariosHtml}${pluginsHtml}${envsHtml}`;
  return { parentNode: host };
}
