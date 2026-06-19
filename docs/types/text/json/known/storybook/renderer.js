const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sb-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-sb{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ff4785;color:#fff;vertical-align:middle;margin-right:8px;}
.sb-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.sb-sec{margin:12px 0;}
.sb-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.sb-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 3px 1px 0;}
.sb-chip-list{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;}
.sb-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.sb-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.sb-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;word-break:break-all;}
`;

function normAddon(a) {
  if (typeof a === 'string') return a;
  if (a && typeof a === 'object') return a.name || JSON.stringify(a);
  return String(a);
}

export function render(intake) {
  let cfg;
  try { cfg = JSON.parse(intake.text || '{}'); } catch {
    const host = document.createElement('div');
    host.className = 'sb-doc';
    host.innerHTML = `<style>${CSS}</style><div class="sb-title"><span class="badge-sb">Storybook</span>Invalid JSON</div>`;
    return { parentNode: host };
  }

  const stories = Array.isArray(cfg.stories) ? cfg.stories : (cfg.stories ? [cfg.stories] : []);
  const addons = Array.isArray(cfg.addons) ? cfg.addons : [];
  const framework = cfg.framework ? (typeof cfg.framework === 'string' ? cfg.framework : cfg.framework.name || JSON.stringify(cfg.framework)) : null;
  const staticDirs = Array.isArray(cfg.staticDirs) ? cfg.staticDirs : [];
  const docs = cfg.docs || null;
  const core = cfg.core || {};
  const builder = core.builder || null;

  const storiesHtml = stories.length
    ? `<div class="sb-sec"><h3>Stories glob (${stories.length})</h3><div class="sb-chip-list">${stories.map((s) => `<span class="sb-chip">${esc(typeof s === 'string' ? s : JSON.stringify(s))}</span>`).join('')}</div></div>`
    : '';

  const addonsHtml = addons.length
    ? `<div class="sb-sec"><h3>Addons (${addons.length})</h3><div class="sb-chip-list">${addons.slice(0, 10).map((a) => `<span class="sb-chip">${esc(normAddon(a))}</span>`).join('')}${addons.length > 10 ? `<span style="font-size:11px;color:var(--fg-2,#888)">+${addons.length - 10} more</span>` : ''}</div></div>`
    : '';

  const settingsHtml = (framework || builder || staticDirs.length || docs)
    ? `<div class="sb-sec"><h3>Settings</h3><div class="sb-kv">
        ${framework ? `<span class="sb-k">framework</span><span class="sb-v">${esc(framework)}</span>` : ''}
        ${builder ? `<span class="sb-k">builder</span><span class="sb-v">${esc(builder)}</span>` : ''}
        ${staticDirs.length ? `<span class="sb-k">staticDirs</span><span class="sb-v">${staticDirs.map(esc).join(', ')}</span>` : ''}
        ${docs ? `<span class="sb-k">docs</span><span class="sb-v">configured</span>` : ''}
      </div></div>`
    : '';

  const sub = [
    framework ? `framework: ${framework}` : '',
    addons.length ? `${addons.length} addon${addons.length !== 1 ? 's' : ''}` : '',
    stories.length ? `${stories.length} stories pattern${stories.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ') || 'Storybook main config';

  const host = document.createElement('div');
  host.className = 'sb-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="sb-title"><span class="badge-sb">Storybook</span>Storybook config</div>
<div class="sb-sub">${esc(sub)}</div>
${settingsHtml}${storiesHtml}${addonsHtml}`;

  return { parentNode: host };
}
