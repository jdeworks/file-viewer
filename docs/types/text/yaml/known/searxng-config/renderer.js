import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sxng-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-sxng{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1565c0;color:#fff;vertical-align:middle;margin-right:8px;}
.sxng-title{font-size:20px;font-weight:700;margin:0 0 2px;font-family:ui-monospace,monospace;}
.sxng-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.sxng-sec{margin:14px 0;}
.sxng-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.sxng-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.sxng-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.sxng-kv-k{color:var(--fg-2,#888);min-width:180px;flex-shrink:0;}
.sxng-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.sxng-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);font-style:italic;}
.sxng-chip{display:inline-flex;align-items:center;font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.sxng-enabled{color:#1b5e20;font-weight:600;}
.sxng-disabled{color:#b71c1c;font-weight:600;}
`;

function kv(label, value, masked) {
  if (value == null || value === '') return '';
  const valHtml = masked
    ? `<span class="sxng-masked">[configured]</span>`
    : `<span class="sxng-kv-v">${esc(String(value))}</span>`;
  return `<div class="sxng-kv"><span class="sxng-kv-k">${esc(label)}</span>${valHtml}</div>`;
}

function bool(label, value) {
  if (value == null) return '';
  const on = value === true || value === 'true';
  return `<div class="sxng-kv"><span class="sxng-kv-k">${esc(label)}</span><span class="${on ? 'sxng-enabled' : 'sxng-disabled'}">${on ? 'yes' : 'no'}</span></div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = intake.parsed || {}; }

  const general = cfg.general || {};
  const server = cfg.server || {};
  const search = cfg.search || {};
  const ui = cfg.ui || {};
  const outgoing = cfg.outgoing || {};

  const title = general.instance_name || 'SearXNG Config';
  const engines = Array.isArray(cfg.engines) ? cfg.engines : [];
  const enabledEngines = engines.filter((e) => e && e.disabled !== true);
  const subParts = [
    server.port ? `port: ${server.port}` : null,
    search.default_lang ? `lang: ${search.default_lang}` : null,
    engines.length ? `${engines.length} engines` : null,
  ].filter(Boolean).join(' · ');

  // General section
  const generalHtml = `<div class="sxng-sec"><h3>General</h3><div class="sxng-card">
${kv('instance_name', general.instance_name)}
${bool('debug', general.debug)}
</div></div>`;

  // Server section
  const serverHtml = `<div class="sxng-sec"><h3>Server</h3><div class="sxng-card">
${kv('port', server.port)}
${kv('bind_address', server.bind_address)}
${kv('base_url', server.base_url)}
${server.secret_key != null ? kv('secret_key', '***', true) : ''}
</div></div>`;

  // Search section
  const searchHtml = (search.default_lang || search.ban_time_on_fail != null || search.max_ban_time_on_fail != null || search.safe_search != null) ? `<div class="sxng-sec"><h3>Search</h3><div class="sxng-card">
${kv('default_lang', search.default_lang)}
${kv('ban_time_on_fail', search.ban_time_on_fail)}
${kv('max_ban_time_on_fail', search.max_ban_time_on_fail)}
${kv('safe_search', search.safe_search)}
</div></div>` : '';

  // Engines section
  const first8 = enabledEngines.slice(0, 8).map((e) => e.name || String(e)).filter(Boolean);
  const more = enabledEngines.length > 8 ? ` +${enabledEngines.length - 8} more` : '';
  const enginesHtml = engines.length ? `<div class="sxng-sec"><h3>Engines (${enabledEngines.length} enabled of ${engines.length} total)</h3><div class="sxng-card">
<div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:4px;">
${first8.map((n) => `<span class="sxng-chip">${esc(n)}</span>`).join('')}
${more ? `<span class="sxng-chip" style="color:var(--fg-2,#888)">${esc(more)}</span>` : ''}
</div>
</div></div>` : '';

  // UI section
  const uiHtml = (ui.center_alignment != null || ui.default_theme || ui.query_in_title != null) ? `<div class="sxng-sec"><h3>UI</h3><div class="sxng-card">
${bool('center_alignment', ui.center_alignment)}
${kv('default_theme', ui.default_theme)}
${bool('query_in_title', ui.query_in_title)}
</div></div>` : '';

  // Outgoing section
  const outgoingHtml = (outgoing.request_timeout != null || outgoing.max_request_timeout != null || outgoing.useragent_suffix) ? `<div class="sxng-sec"><h3>Outgoing</h3><div class="sxng-card">
${kv('request_timeout', outgoing.request_timeout)}
${kv('max_request_timeout', outgoing.max_request_timeout)}
${kv('useragent_suffix', outgoing.useragent_suffix)}
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'sxng-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-sxng">SearXNG</span>
  <span class="sxng-title">${esc(title)}</span>
</div>
<div class="sxng-sub">${esc(subParts)}</div>
${generalHtml}${serverHtml}${searchHtml}${enginesHtml}${uiHtml}${outgoingHtml}`;
  return { parentNode: host };
}
