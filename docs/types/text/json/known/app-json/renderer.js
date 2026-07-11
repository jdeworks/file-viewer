// Enhanced Heroku app.json viewer.
import { describeCollectionCap } from '../../../../../core/collection-cap.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SENSITIVE = /SECRET|TOKEN|KEY|PASSWORD|API/i;

const CSS = `
.appjson-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.appjson-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#430098;color:#fff;vertical-align:middle;margin-right:8px}
.apj-title{font-size:18px;font-weight:700;margin:0 0 4px}
.apj-desc{font-size:13px;color:var(--fg-2,#888);margin:0 0 4px}
.apj-links{font-size:12px;margin:0 0 14px;display:flex;flex-wrap:wrap;gap:8px}
.apj-link{color:#430098;text-decoration:none}
.apj-link:hover{text-decoration:underline}
.apj-sec{margin:12px 0}
.apj-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;font-weight:600}
.apj-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:6px}
.apj-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 14px;align-items:start;font-size:12px}
.apj-kk{color:var(--fg-2,#888);white-space:nowrap;padding-top:1px}
.apj-vv{font-family:ui-monospace,monospace;word-break:break-all}
.apj-pill{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:2px 2px 2px 0;font-family:ui-monospace,monospace}
.apj-stack{display:inline-block;padding:2px 9px;border-radius:8px;font-size:11px;font-weight:600;background:#f5f0ff;border:1px solid #c4b5fd;color:#430098;margin-left:6px}
.apj-masked{color:var(--fg-2,#888);font-style:italic}
.apj-envdesc{font-size:11px;color:var(--fg-2,#888);font-style:italic;margin-top:1px}
.apj-row{display:grid;grid-template-columns:max-content 1fr;gap:2px 10px;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border,#eee)}
.apj-row:last-child{border-bottom:none}
.apj-note{color:var(--fg-2,#888);font-size:12px;font-style:italic}
`;

function maskValue(key, val) {
  if (SENSITIVE.test(key)) return '<span class="apj-masked">[configured]</span>';
  return '<span class="apj-vv">' + esc(val) + '</span>';
}

export function render(intake) {
  const cfg = intake.parsed ?? (() => { try { return JSON.parse(intake.text || '{}'); } catch { return {}; } })();

  // Header
  const name = cfg.name || 'app.json';
  const description = cfg.description || '';
  const website = cfg.website || '';
  const repository = cfg.repository || '';
  const stack = cfg.stack || '';

  // Buildpacks
  const allBuildpacks = Array.isArray(cfg.buildpacks) ? cfg.buildpacks : [];
  const buildpacks = allBuildpacks.slice(0, 8);
  const buildpackCap = describeCollectionCap(allBuildpacks, buildpacks);

  // Formation (dyno types)
  const formation = cfg.formation ? Object.entries(cfg.formation) : [];

  // Addons
  const allAddons = Array.isArray(cfg.addons) ? cfg.addons : [];
  const addons = allAddons.slice(0, 10);
  const addonCap = describeCollectionCap(allAddons, addons);

  // Env vars
  const envEntries = cfg.env ? Object.entries(cfg.env) : [];

  // Scripts
  const scripts = cfg.scripts || {};

  // Environments
  const environments = cfg.environments ? Object.keys(cfg.environments) : [];

  let body = '';

  // Buildpacks section
  if (buildpacks.length) {
    const pills = buildpacks.map((bp) => {
      const url = typeof bp === 'string' ? bp : (bp.url || bp.id || JSON.stringify(bp));
      return '<span class="apj-pill">' + esc(url) + '</span>';
    }).join('');
    body += '<div class="apj-sec"><h3>Buildpacks (' + buildpackCap.label + ')</h3><div>' + pills + '</div></div>';
  }

  // Formation section
  if (formation.length) {
    const cards = formation.map(([proc, config]) => {
      const qty = typeof config === 'object' ? (config.quantity ?? 1) : 1;
      const size = typeof config === 'object' ? (config.size || '') : '';
      return '<div class="apj-card"><div class="apj-kv">'
        + '<span class="apj-kk">process</span><span class="apj-vv">' + esc(proc) + '</span>'
        + '<span class="apj-kk">quantity</span><span class="apj-vv">' + esc(qty) + '</span>'
        + (size ? '<span class="apj-kk">size</span><span class="apj-vv">' + esc(size) + '</span>' : '')
        + '</div></div>';
    }).join('');
    body += '<div class="apj-sec"><h3>Formation</h3>' + cards + '</div>';
  }

  // Addons section
  if (addons.length) {
    const pills = addons.map((a) => {
      if (typeof a === 'string') return '<span class="apj-pill">' + esc(a) + '</span>';
      const plan = a.plan || a.id || JSON.stringify(a);
      return '<span class="apj-pill">' + esc(plan) + '</span>';
    }).join('');
    body += '<div class="apj-sec"><h3>Add-ons (' + addonCap.label + ')</h3><div>' + pills + '</div></div>';
  }

  // Env vars section
  if (envEntries.length) {
    const rows = envEntries.map(([k, v]) => {
      const val = typeof v === 'object' ? (v.value ?? '') : v;
      const desc = typeof v === 'object' ? (v.description || '') : '';
      return '<div class="apj-row">'
        + '<span class="apj-kk">' + esc(k) + '</span>'
        + '<div>' + maskValue(k, String(val))
        + (desc ? '<div class="apj-envdesc">' + esc(desc) + '</div>' : '')
        + '</div>'
        + '</div>';
    }).join('');
    body += '<div class="apj-sec"><h3>Environment Variables (' + envEntries.length + ')</h3><div class="apj-card" style="padding:6px 14px">' + rows + '</div></div>';
  }

  // Scripts section
  const scriptEntries = Object.entries(scripts).filter(([, v]) => v);
  if (scriptEntries.length) {
    const rows = scriptEntries.map(([k, v]) =>
      '<div class="apj-kv"><span class="apj-kk">' + esc(k) + '</span><span class="apj-vv">' + esc(v) + '</span></div>'
    ).join('');
    body += '<div class="apj-sec"><h3>Scripts</h3><div class="apj-card">' + rows + '</div></div>';
  }

  // Environments section
  if (environments.length) {
    body += '<div class="apj-sec"><h3>Environments</h3><div>'
      + environments.map((e) => '<span class="apj-pill">' + esc(e) + '</span>').join('')
      + '</div></div>';
  }

  const linksHtml = [
    website ? '<a class="apj-link" href="' + esc(website) + '" target="_blank" rel="noopener">website</a>' : '',
    repository ? '<a class="apj-link" href="' + esc(repository) + '" target="_blank" rel="noopener">repository</a>' : '',
  ].filter(Boolean).join('');

  const el = document.createElement('div');
  el.className = 'appjson-doc';
  el.innerHTML = '<style>' + CSS + '</style>'
    + '<div class="apj-title"><span class="appjson-badge">Heroku</span>' + esc(name)
    + (stack ? '<span class="apj-stack">' + esc(stack) + '</span>' : '')
    + '</div>'
    + (description ? '<div class="apj-desc">' + esc(description) + '</div>' : '')
    + (linksHtml ? '<div class="apj-links">' + linksHtml + '</div>' : '')
    + (body || '<p class="apj-note">No deployment configuration found.</p>');
  return { parentNode: el };
}
