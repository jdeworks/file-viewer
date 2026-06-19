const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pcs-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-pcs{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#dd3a0a;color:#fff;vertical-align:middle;margin-right:8px;}
.pcs-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pcs-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.pcs-sec{margin:12px 0;}
.pcs-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.pcs-row{display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.pcs-num{font-size:11px;color:var(--fg-2,#888);min-width:18px;}
.pcs-name{font:13px ui-monospace,monospace;color:var(--accent,#0969da);}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  let plugins = [];
  if (cfg.plugins && typeof cfg.plugins === 'object' && !Array.isArray(cfg.plugins)) {
    plugins = Object.keys(cfg.plugins);
  } else if (Array.isArray(cfg.plugins)) {
    plugins = cfg.plugins.map((p) => (typeof p === 'string' ? p : JSON.stringify(p)));
  }

  let pluginsHtml = '';
  if (plugins.length) {
    pluginsHtml = '<div class="pcs-sec"><h3>Plugin pipeline</h3>';
    plugins.forEach((p, i) => {
      pluginsHtml += `<div class="pcs-row"><span class="pcs-num">${i + 1}</span><span class="pcs-name">${esc(p)}</span></div>`;
    });
    pluginsHtml += '</div>';
  }

  const host = document.createElement('div');
  host.className = 'pcs-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="pcs-title"><span class="badge-pcs">PostCSS</span>postcss.config.json</div>
<div class="pcs-sub">${plugins.length ? `${plugins.length} plugin${plugins.length !== 1 ? 's' : ''} in pipeline` : 'PostCSS CSS transformation pipeline'}</div>
${pluginsHtml}`;
  return { parentNode: host };
}
