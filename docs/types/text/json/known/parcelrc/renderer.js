const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.prc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-prc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ca9000;color:#fff;vertical-align:middle;margin-right:8px}
.prc-title{font-size:18px;font-weight:700;margin:0 0 4px}
.prc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.prc-sec{margin:12px 0}
.prc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.prc-pills{display:flex;flex-wrap:wrap;gap:6px}
.prc-pill{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.prc-pill.ext{color:var(--fg-2,#888);font-size:10px;margin-right:2px}
.prc-pill.xf{background:#fef9c3;border-color:#fde68a;color:#854d0e}
.prc-pill.opt{background:#fdf4ff;border-color:#e9d5ff;color:#6b21a8}
.prc-kv{display:flex;gap:6px;align-items:baseline;font-size:13px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);margin:3px 0}
.prc-kv span:first-child{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em;min-width:90px}
.prc-kv span:last-child{font-family:ui-monospace,monospace;font-weight:600;color:#ca9000}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = (intake.name || intake.filename || '.parcelrc').split('/').pop();

  let cfg = {};
  try { cfg = JSON.parse(text); } catch { cfg = {}; }

  const ext = cfg.extends || null;
  const transformers = cfg.transformers || {};
  const resolvers = Array.isArray(cfg.resolvers) ? cfg.resolvers : [];
  const namers = Array.isArray(cfg.namers) ? cfg.namers : [];
  const packagers = cfg.packagers || {};
  const optimizers = cfg.optimizers || {};
  const reporters = Array.isArray(cfg.reporters) ? cfg.reporters : [];

  // Count transformers per extension
  const xfEntries = Object.entries(transformers);
  // Count optimizer extensions
  const optEntries = Object.entries(optimizers);

  const extendsHtml = ext
    ? `<div class="prc-sec"><h3>Extends</h3><div class="prc-kv"><span>Config</span><span>${esc(ext)}</span></div></div>`
    : '';

  const xfHtml = xfEntries.length
    ? `<div class="prc-sec"><h3>Transformers (${xfEntries.length} patterns)</h3><div class="prc-pills">${xfEntries.slice(0, 12).map(([ext, plugins]) => {
        const plugList = (Array.isArray(plugins) ? plugins : [plugins]).join(', ');
        return `<span class="prc-pill xf"><span class="prc-pill ext">${esc(ext)}</span>${esc(plugList)}</span>`;
      }).join('')}</div></div>`
    : '';

  const packHtml = Object.keys(packagers).length
    ? `<div class="prc-sec"><h3>Packagers (${Object.keys(packagers).length})</h3><div class="prc-pills">${Object.entries(packagers).slice(0, 8).map(([ext, p]) => `<span class="prc-pill">${esc(ext)} → ${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const optHtml = optEntries.length
    ? `<div class="prc-sec"><h3>Optimizers (${optEntries.length})</h3><div class="prc-pills">${optEntries.slice(0, 8).map(([ext, plugins]) => {
        const plugList = (Array.isArray(plugins) ? plugins : [plugins]).join(', ');
        return `<span class="prc-pill opt"><span class="prc-pill ext">${esc(ext)}</span>${esc(plugList)}</span>`;
      }).join('')}</div></div>`
    : '';

  const resolversHtml = resolvers.length
    ? `<div class="prc-sec"><h3>Resolvers</h3><div class="prc-pills">${resolvers.map((r) => `<span class="prc-pill">${esc(r)}</span>`).join('')}</div></div>`
    : '';

  const reportersHtml = reporters.length
    ? `<div class="prc-sec"><h3>Reporters</h3><div class="prc-pills">${reporters.map((r) => `<span class="prc-pill">${esc(r)}</span>`).join('')}</div></div>`
    : '';

  const parts = [
    xfEntries.length ? `${xfEntries.length} transformer pattern${xfEntries.length !== 1 ? 's' : ''}` : null,
    ext ? `extends ${ext}` : null,
  ].filter(Boolean);
  const sub = parts.join(' · ') || 'Parcel bundler configuration';

  const host = document.createElement('div');
  host.className = 'prc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="prc-title"><span class="badge-prc">Parcel</span>${esc(name)}</div>
<div class="prc-sub">${esc(sub)}</div>
${extendsHtml}${xfHtml}${packHtml}${optHtml}${resolversHtml}${reportersHtml}`;
  return { parentNode: host };
}
