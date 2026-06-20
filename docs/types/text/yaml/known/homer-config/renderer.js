import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.homer-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-homer{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f97316;color:#fff;vertical-align:middle;margin-right:8px;}
.homer-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.homer-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.homer-sec{margin:14px 0;}
.homer-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.homer-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.homer-card-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:4px;}
.homer-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.homer-kv-k{color:var(--fg-2,#888);min-width:110px;}
.homer-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.homer-item{font-size:12px;padding:3px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.homer-item:last-child{border-bottom:none;}
.homer-item-name{font-weight:600;}
.homer-item-sub{color:var(--fg-2,#888);font-size:11px;margin-left:6px;}
.homer-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.homer-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.homer-group-header{font-size:13px;font-weight:700;margin:0 0 4px;color:var(--fg,#24292f);}
.homer-group-count{font-size:11px;color:var(--fg-2,#888);margin-left:6px;font-weight:normal;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="homer-kv"><span class="homer-kv-k">${esc(label)}</span><span class="homer-kv-v">${esc(String(value))}</span></div>`;
}

function truncate(s, max = 60) {
  if (!s) return '';
  s = String(s);
  return s.length > max ? s.slice(0, max) + '…' : s;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const title = cfg.title || 'Homer Dashboard';
  const subtitle = cfg.subtitle || '';

  // Dashboard settings section
  const colors = cfg.colors || {};
  const settingsItems = [
    cfg.theme ? kv('Theme', cfg.theme) : '',
    colors.light ? kv('Light color', colors.light) : '',
    colors.dark ? kv('Dark color', colors.dark) : '',
    cfg.logo ? kv('Logo', truncate(cfg.logo, 50)) : '',
    cfg.icon ? kv('Icon', cfg.icon) : '',
    (cfg.header != null) ? kv('Header', String(cfg.header)) : '',
    (cfg.footer != null) ? kv('Footer', String(cfg.footer)) : '',
  ].filter(Boolean).join('');

  const settingsHtml = settingsItems ? `<div class="homer-sec"><h3>Dashboard Settings</h3><div class="homer-card">${settingsItems}</div></div>` : '';

  // Services section
  const services = Array.isArray(cfg.services) ? cfg.services : [];
  const servicesHtml = services.length ? `<div class="homer-sec"><h3>Services (${services.length} group${services.length !== 1 ? 's' : ''})</h3>
${services.map((group) => {
  const items = Array.isArray(group.items) ? group.items : [];
  const itemsHtml = items.map((item) => {
    const sub = item.subtitle || item.url || '';
    return `<div class="homer-item"><span class="homer-item-name">${esc(item.name || '(unnamed)')}</span>${sub ? `<span class="homer-item-sub">${esc(truncate(sub, 50))}</span>` : ''}</div>`;
  }).join('');
  return `<div class="homer-card">
<div class="homer-group-header">${esc(group.name || '(group)')}<span class="homer-group-count">${items.length} item${items.length !== 1 ? 's' : ''}</span></div>
${itemsHtml}
</div>`;
}).join('')}
</div>` : '';

  // Links section
  const links = Array.isArray(cfg.links) ? cfg.links : [];
  const linksHtml = links.length ? `<div class="homer-sec"><h3>Links</h3>
<div class="homer-pills">${links.map((l) => `<span class="homer-pill">${esc(l.name || l.text || l.url || '(link)')}</span>`).join('')}</div>
</div>` : '';

  const subParts = [
    services.length ? `${services.length} service group${services.length !== 1 ? 's' : ''}` : '',
    links.length ? `${links.length} link${links.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'homer-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-homer">Homer</span>
  <span class="homer-title">${esc(title)}</span>
</div>
${subtitle ? `<div class="homer-sub">${esc(subtitle)}</div>` : `<div class="homer-sub">${esc(subParts)}</div>`}
${settingsHtml}${servicesHtml}${linksHtml}`;
  return { parentNode: host };
}
