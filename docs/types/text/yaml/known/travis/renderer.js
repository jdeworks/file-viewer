import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.trv-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-trv{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3eaaaf;color:#fff;vertical-align:middle;margin-right:8px;}
.trv-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.trv-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.trv-sec{margin:12px 0;}
.trv-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.trv-pills{display:flex;flex-wrap:wrap;gap:6px;}
.trv-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.trv-pill.lang{background:#e8f5e9;border-color:#a5d6a7;color:#1b5e20;}
.trv-pill.branch{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.trv-cmd{font:12px/1.5 ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:6px 10px;margin:4px 0;white-space:pre-wrap;word-break:break-all;}
`;

function normArr(v) {
  if (!v) return [];
  return Array.isArray(v) ? v.map(String) : [String(v)];
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const lang = cfg.language || 'unknown';
  const versions = normArr(cfg[lang] || cfg.node_js || cfg.python || cfg.ruby || cfg.go);
  const os = normArr(cfg.os);
  const services = normArr(cfg.services);
  const scripts = normArr(cfg.script);
  const stages = Array.isArray(cfg.stages) ? cfg.stages : [];
  const branchesInclude = normArr(cfg.branches?.only || cfg.branches?.include || []);

  const langHtml = `<div class="trv-sec"><h3>Language</h3><div class="trv-pills">
    <span class="trv-pill lang">${esc(lang)}</span>
    ${versions.slice(0, 6).map((v) => `<span class="trv-pill">${esc(v)}</span>`).join('')}
    ${os.map((o) => `<span class="trv-pill">${esc(o)}</span>`).join('')}
  </div></div>`;

  const servicesHtml = services.length
    ? `<div class="trv-sec"><h3>Services</h3><div class="trv-pills">${services.map((s) => `<span class="trv-pill">${esc(s)}</span>`).join('')}</div></div>`
    : '';

  const stagesHtml = stages.length
    ? `<div class="trv-sec"><h3>Stages (${stages.length})</h3><div class="trv-pills">${stages.map((s) => `<span class="trv-pill">${esc(typeof s === 'object' ? Object.keys(s)[0] : s)}</span>`).join('')}</div></div>`
    : '';

  const scriptHtml = scripts.length
    ? `<div class="trv-sec"><h3>Script</h3>${scripts.slice(0, 5).map((s) => `<div class="trv-cmd">${esc(s)}</div>`).join('')}${scripts.length > 5 ? `<div style="font-size:12px;color:var(--fg-2,#888)">…and ${scripts.length - 5} more</div>` : ''}</div>`
    : '';

  const branchHtml = branchesInclude.length
    ? `<div class="trv-sec"><h3>Branches</h3><div class="trv-pills">${branchesInclude.map((b) => `<span class="trv-pill branch">${esc(b)}</span>`).join('')}</div></div>`
    : '';

  const sub = [lang !== 'unknown' ? lang : '', versions.length ? `${versions.length} version${versions.length !== 1 ? 's' : ''}` : '', services.length ? `${services.length} service${services.length !== 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'trv-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="trv-title"><span class="badge-trv">Travis CI</span>Build config</div>
<div class="trv-sub">${esc(sub)}</div>
${langHtml}${stagesHtml}${servicesHtml}${scriptHtml}${branchHtml}`;
  return { parentNode: host };
}
