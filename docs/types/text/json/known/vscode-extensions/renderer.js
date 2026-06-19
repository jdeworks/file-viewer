const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vsc-ext-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-vsc-ext{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#007acc;color:#fff;vertical-align:middle;margin-right:8px;}
.vsc-ext-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.vsc-ext-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.vsc-ext-sec{margin:12px 0;}
.vsc-ext-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.vsc-ext-grid{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.vsc-ext-chip{display:inline-flex;align-items:center;gap:0;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.vsc-ext-pub{color:var(--fg-2,#888);}
.vsc-ext-name{color:var(--fg,#24292f);font-weight:600;}
.vsc-ext-unwanted{background:#fff0f0;border-color:#f87171;color:#991b1b;}
`;

export function render(intake) {
  let cfg;
  try { cfg = JSON.parse(intake.text || '{}'); } catch { return { parentNode: Object.assign(document.createElement('div'), { textContent: 'Invalid VS Code extensions JSON.' }) }; }

  const recommendations = Array.isArray(cfg.recommendations) ? cfg.recommendations : [];
  const unwanted = Array.isArray(cfg.unwantedRecommendations) ? cfg.unwantedRecommendations : [];

  function extChip(id, cls = '') {
    const dot = id.indexOf('.');
    const pub = dot >= 0 ? id.slice(0, dot + 1) : '';
    const name = dot >= 0 ? id.slice(dot + 1) : id;
    return `<span class="vsc-ext-chip${cls ? ' ' + cls : ''}"><span class="vsc-ext-pub">${esc(pub)}</span><span class="vsc-ext-name">${esc(name)}</span></span>`;
  }

  const host = document.createElement('div');
  host.className = 'vsc-ext-doc';

  host.innerHTML = `<style>${CSS}</style>
<div class="vsc-ext-title"><span class="badge-vsc-ext">VS Code</span>Extension recommendations</div>
<div class="vsc-ext-sub">${recommendations.length} recommended${unwanted.length ? ` · ${unwanted.length} unwanted` : ''}</div>
${recommendations.length ? `<div class="vsc-ext-sec"><h3>Recommendations (${recommendations.length})</h3><div class="vsc-ext-grid">${recommendations.map((id) => extChip(id)).join('')}</div></div>` : ''}
${unwanted.length ? `<div class="vsc-ext-sec"><h3>Unwanted</h3><div class="vsc-ext-grid">${unwanted.map((id) => extChip(id, 'vsc-ext-unwanted')).join('')}</div></div>` : ''}
${!recommendations.length && !unwanted.length ? '<div style="color:var(--fg-2,#888);font-size:13px">No extension recommendations found.</div>' : ''}`;

  return { parentNode: host };
}
