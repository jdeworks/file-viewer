import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.drn-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-drn{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2196f3;color:#fff;vertical-align:middle;margin-right:8px;}
.drn-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.drn-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.drn-sec{margin:12px 0;}
.drn-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.drn-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.drn-step{padding:6px 12px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:4px 0;font-size:13px;display:flex;align-items:baseline;gap:10px;}
.drn-step-name{font-weight:600;}
.drn-step-img{font:11px ui-monospace,monospace;color:var(--fg-2,#888);}
.drn-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.drn-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.drn-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = {}; }

  const kind = cfg.kind || 'pipeline';
  const name = cfg.name || (intake.filename || '').split('/').pop() || 'Pipeline';
  const type = cfg.type || null;
  const steps = Array.isArray(cfg.steps) ? cfg.steps : [];
  const services = Array.isArray(cfg.services) ? cfg.services : [];
  const trigger = cfg.trigger || {};
  const volumes = Array.isArray(cfg.volumes) ? cfg.volumes : [];
  const platform = cfg.platform || null;

  const stepsHtml = steps.length
    ? `<div class="drn-sec"><h3>Steps (${steps.length})</h3>${steps.slice(0, 8).map((s) => {
        const sname = s.name || '?';
        const img = s.image || '';
        const cmds = Array.isArray(s.commands) ? s.commands.length : 0;
        return `<div class="drn-step"><span class="drn-step-name">${esc(sname)}</span>${img ? `<span class="drn-step-img">${esc(img)}</span>` : ''}${cmds ? `<span style="font-size:11px;color:var(--fg-2,#888)">${cmds} cmd${cmds !== 1 ? 's' : ''}</span>` : ''}</div>`;
      }).join('')}${steps.length > 8 ? `<div style="font-size:12px;color:var(--fg-2,#888)">…and ${steps.length - 8} more</div>` : ''}</div>`
    : '';

  const servicesHtml = services.length
    ? `<div class="drn-sec"><h3>Services (${services.length})</h3><div style="display:flex;flex-wrap:wrap;gap:4px;">${services.map((s) => `<span class="drn-pill">${esc(s.name || s.image || '?')}</span>`).join('')}</div></div>`
    : '';

  const triggerKeys = Object.keys(trigger);
  const triggerHtml = triggerKeys.length
    ? `<div class="drn-sec"><h3>Triggers</h3><div class="drn-kv">${triggerKeys.map((k) => {
        const v = trigger[k];
        const inc = Array.isArray(v?.include) ? v.include.join(', ') : (Array.isArray(v) ? v.join(', ') : String(v || ''));
        return `<span class="drn-k">${esc(k)}</span><span class="drn-v">${esc(inc) || '—'}</span>`;
      }).join('')}</div></div>`
    : '';

  const settingsHtml = `<div class="drn-sec"><h3>Pipeline info</h3><div class="drn-kv">
    <span class="drn-k">kind</span><span class="drn-v">${esc(kind)}</span>
    ${type ? `<span class="drn-k">type</span><span class="drn-v">${esc(type)}</span>` : ''}
    ${platform ? `<span class="drn-k">platform</span><span class="drn-v">${esc(typeof platform === 'object' ? (platform.os || '') + '/' + (platform.arch || '') : platform)}</span>` : ''}
    ${volumes.length ? `<span class="drn-k">volumes</span><span class="drn-v">${volumes.length}</span>` : ''}
  </div></div>`;

  const sub = [
    `kind: ${kind}`,
    steps.length ? `${steps.length} step${steps.length !== 1 ? 's' : ''}` : '',
    services.length ? `${services.length} service${services.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'drn-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="drn-title"><span class="badge-drn">Drone CI</span>${esc(name)}</div>
<div class="drn-sub">${esc(sub)}</div>
${settingsHtml}${stepsHtml}${servicesHtml}${triggerHtml}`;

  return { parentNode: host };
}
