const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ion-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-ionic{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3880ff;color:#fff;vertical-align:middle;margin-right:8px;}
.ion-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ion-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ion-sec{margin:12px 0;}
.ion-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.ion-kv{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0;}
.ion-kv-item{display:flex;gap:6px;align-items:baseline;font-size:13px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);}
.ion-kv-item span:first-child{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em;}
.ion-kv-item span:last-child{font-family:ui-monospace,monospace;font-weight:600;}
.ion-pill{display:inline-block;font-size:12px;padding:2px 8px;border-radius:10px;background:#e3f0ff;border:1px solid #90b8ff;color:#1a3a8c;margin:2px;font-family:ui-monospace,monospace;}
.ion-type-tag{display:inline-block;padding:3px 10px;border-radius:6px;background:#3880ff;color:#fff;font-size:12px;font-weight:600;margin-top:4px;}
`;

const TYPE_LABELS = {
  react: 'React',
  angular: 'Angular',
  vue: 'Vue',
  'ionic-react': 'Ionic React',
  'ionic-angular': 'Ionic Angular',
  custom: 'Custom',
};

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const name = cfg.name || '';
  const appId = cfg.appId || '';
  const type = cfg.type || '';
  const integrations = cfg.integrations && typeof cfg.integrations === 'object' ? Object.keys(cfg.integrations) : [];
  const defaultProject = cfg.defaultProject || '';

  const host = document.createElement('div');
  host.className = 'ion-doc';

  const kvItems = [
    name ? `<div class="ion-kv-item"><span>Name</span><span>${esc(name)}</span></div>` : '',
    appId ? `<div class="ion-kv-item"><span>App ID</span><span>${esc(appId)}</span></div>` : '',
    defaultProject ? `<div class="ion-kv-item"><span>Default Project</span><span>${esc(defaultProject)}</span></div>` : '',
  ].filter(Boolean).join('');

  const typeLabel = TYPE_LABELS[type] || (type ? esc(type) : '');

  host.innerHTML = `<style>${CSS}</style>
<div class="ion-title"><span class="badge-ionic">Ionic</span>${esc(name || 'ionic.config.json')}</div>
<div class="ion-sub">Ionic framework project configuration</div>
${kvItems ? `<div class="ion-sec"><div class="ion-kv">${kvItems}</div></div>` : ''}
${typeLabel ? `<div class="ion-sec"><h3>Project Type</h3><span class="ion-type-tag">${typeLabel}</span></div>` : ''}
${integrations.length ? `<div class="ion-sec"><h3>Integrations</h3><div>${integrations.map((i) => `<span class="ion-pill">${esc(i)}</span>`).join('')}</div></div>` : ''}`;

  return { parentNode: host };
}
