const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.swc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-swc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f7c948;color:#000;vertical-align:middle;margin-right:8px;}
.swc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.swc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.swc-sec{margin:12px 0;}
.swc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.swc-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:8px 0;}
.swc-key{font-size:12px;color:var(--fg-2,#888);}
.swc-val{font:12px ui-monospace,monospace;color:var(--accent,#0969da);}
.swc-tag{display:inline-block;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:2px 8px;font:12px ui-monospace,monospace;margin:2px;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const jsc = cfg.jsc || {};
  const parser = jsc.parser || {};
  const module = cfg.module || {};
  const sourceMaps = cfg.sourceMaps === true || cfg.sourceMaps === 'inline' ? String(cfg.sourceMaps) : null;
  const target = jsc.target || '';
  const syntax = parser.syntax || '';
  const tsx = parser.tsx === true;
  const decorators = parser.decorators === true;
  const moduleType = module.type || '';
  const minify = cfg.minify === true;

  const features = [tsx && 'TSX', decorators && 'decorators', minify && 'minify'].filter(Boolean);

  let featuresHtml = '';
  if (features.length) {
    featuresHtml = `<div class="swc-sec"><h3>Features enabled</h3><div>${features.map((f) => `<span class="swc-tag">${esc(f)}</span>`).join('')}</div></div>`;
  }

  const host = document.createElement('div');
  host.className = 'swc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="swc-title"><span class="badge-swc">SWC</span>.swcrc</div>
<div class="swc-sub">Speedy Web Compiler configuration</div>
<div class="swc-sec"><div class="swc-grid">
${syntax ? `<span class="swc-key">Parser</span><span class="swc-val">${esc(syntax)}</span>` : ''}
${target ? `<span class="swc-key">Target</span><span class="swc-val">${esc(target)}</span>` : ''}
${moduleType ? `<span class="swc-key">Module</span><span class="swc-val">${esc(moduleType)}</span>` : ''}
${sourceMaps ? `<span class="swc-key">Source maps</span><span class="swc-val">${esc(sourceMaps)}</span>` : ''}
</div></div>
${featuresHtml}`;
  return { parentNode: host };
}
