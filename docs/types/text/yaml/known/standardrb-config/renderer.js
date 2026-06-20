import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.srb-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-srb{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#CC0000;color:#fff;vertical-align:middle;margin-right:8px;}
.srb-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.srb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.srb-sec{margin:12px 0;}
.srb-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.srb-kv{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:12px;margin:4px 0;}
.srb-kv dt{font-weight:600;white-space:nowrap;}
.srb-kv dd{margin:0;color:var(--fg-2,#555);}
.srb-pills{display:flex;flex-wrap:wrap;gap:6px;}
.srb-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const rubyVersion = cfg.ruby_version;
  const ignorePatterns = Array.isArray(cfg.ignore) ? cfg.ignore : (cfg.ignore != null ? [cfg.ignore] : null);
  const extendsRaw = cfg.extend ?? cfg.extends;
  const extendsArr = extendsRaw != null ? (Array.isArray(extendsRaw) ? extendsRaw : [extendsRaw]) : null;
  const pluginsRaw = cfg.plugins;
  const pluginsArr = pluginsRaw != null ? (Array.isArray(pluginsRaw) ? pluginsRaw : [pluginsRaw]) : null;

  const subParts = [
    rubyVersion ? `Ruby ${rubyVersion}` : '',
    ignorePatterns ? `${ignorePatterns.length} ignore pattern${ignorePatterns.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);
  const sub = subParts.join(' · ');

  const versionHtml = rubyVersion != null
    ? `<div class="srb-sec"><h3>Ruby Version</h3><dl class="srb-kv"><dt>ruby_version</dt><dd>${esc(rubyVersion)}</dd></dl></div>`
    : '';

  const ignoreHtml = ignorePatterns
    ? `<div class="srb-sec"><h3>Ignore Patterns</h3><div class="srb-pills">${ignorePatterns.map((p) => `<span class="srb-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const extendsHtml = extendsArr
    ? `<div class="srb-sec"><h3>Extends</h3><div class="srb-pills">${extendsArr.map((e) => `<span class="srb-pill">${esc(e)}</span>`).join('')}</div></div>`
    : '';

  const pluginsHtml = pluginsArr
    ? `<div class="srb-sec"><h3>Plugins</h3><div class="srb-pills">${pluginsArr.map((p) => `<span class="srb-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'srb-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="srb-title"><span class="badge-srb">Standard Ruby</span>Standard Ruby config</div>
<div class="srb-sub">${esc(sub)}</div>
${versionHtml}${ignoreHtml}${extendsHtml}${pluginsHtml}`;
  return { parentNode: host };
}
