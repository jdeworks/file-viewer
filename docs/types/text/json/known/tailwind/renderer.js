const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.twl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-twl{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#06b6d4;color:#fff;vertical-align:middle;margin-right:8px;}
.twl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.twl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.twl-sec{margin:12px 0;}
.twl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.twl-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:8px 0;}
.twl-key{font-size:12px;color:var(--fg-2,#888);}
.twl-val{font:12px ui-monospace,monospace;color:var(--accent,#0969da);}
.twl-pill{display:inline-block;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:2px 8px;font:12px ui-monospace,monospace;margin:2px;}
.twl-pill.extend{background:#ecfeff;border-color:#67e8f9;color:#0e7490;}
.twl-pill.plugin{background:#f0fdf4;border-color:#86efac;color:#166534;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const content = Array.isArray(cfg.content) ? cfg.content : [];
  const darkMode = cfg.darkMode || null;
  const extendKeys = cfg.theme?.extend ? Object.keys(cfg.theme.extend) : [];
  const plugins = Array.isArray(cfg.plugins) ? cfg.plugins : [];

  const sub = [
    content.length ? `${content.length} content path${content.length !== 1 ? 's' : ''}` : '',
    extendKeys.length ? `${extendKeys.length} theme extension${extendKeys.length !== 1 ? 's' : ''}` : '',
    plugins.length ? `${plugins.length} plugin${plugins.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'twl-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="twl-title"><span class="badge-twl">Tailwind CSS</span>tailwind.config.json</div>
<div class="twl-sub">${esc(sub) || 'Tailwind CSS configuration'}</div>
${darkMode ? `<div class="twl-sec"><div class="twl-grid"><span class="twl-key">Dark mode</span><span class="twl-val">${esc(darkMode)}</span></div></div>` : ''}
${content.length ? `<div class="twl-sec"><h3>Content paths (${content.length})</h3><div>${content.slice(0, 8).map((c) => `<span class="twl-pill">${esc(c)}</span>`).join('')}</div></div>` : ''}
${extendKeys.length ? `<div class="twl-sec"><h3>Theme extensions</h3><div>${extendKeys.map((k) => `<span class="twl-pill extend">${esc(k)}</span>`).join('')}</div></div>` : ''}
${plugins.length ? `<div class="twl-sec"><h3>Plugins</h3><div>${plugins.map((p) => `<span class="twl-pill plugin">${esc(typeof p === 'string' ? p : JSON.stringify(p))}</span>`).join('')}</div></div>` : ''}`;
  return { parentNode: host };
}
