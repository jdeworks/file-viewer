import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.devfile-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-devfile{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#EE0000;color:#fff;vertical-align:middle;margin-right:8px;}
.devfile-title{font-size:18px;font-weight:700;margin:0 0 2px;}
.devfile-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.devfile-sec{margin:14px 0;}
.devfile-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.devfile-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;margin-bottom:8px;}
.devfile-version{font:12px ui-monospace,monospace;padding:2px 8px;border-radius:5px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;}
.devfile-pills{display:flex;flex-wrap:wrap;gap:6px;}
.devfile-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.devfile-pill.tag{background:#f0fdf4;border-color:#86efac;color:#166534;}
.devfile-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.devfile-card-header{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;}
.devfile-card-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;}
.devfile-type{display:inline-block;font-size:11px;padding:1px 7px;border-radius:4px;font-weight:600;vertical-align:middle;}
.devfile-type.container{background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;}
.devfile-type.volume{background:#f3f4f6;border:1px solid #d1d5db;color:#374151;}
.devfile-type.kubernetes{background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;}
.devfile-type.openshift{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;}
.devfile-type.plugin{background:#faf5ff;border:1px solid #e9d5ff;color:#7e22ce;}
.devfile-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.devfile-kv-k{color:var(--fg-2,#888);min-width:110px;flex-shrink:0;}
.devfile-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.devfile-cmd-type{display:inline-block;font-size:11px;padding:1px 7px;border-radius:4px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;}
.devfile-cmdline{font:11px/1.4 ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:3px 8px;margin-top:4px;white-space:pre-wrap;word-break:break-all;}
`;

function truncate(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : s; }

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    const docs = jsyaml.loadAll(intake.text || '') || [];
    cfg = docs[0] || {};
  } catch {
    cfg = intake.parsed || {};
  }

  const schemaVersion = cfg.schemaVersion || '';
  const meta = cfg.metadata || {};
  const components = Array.isArray(cfg.components) ? cfg.components : [];
  const commands = Array.isArray(cfg.commands) ? cfg.commands : [];
  const projects = Array.isArray(cfg.projects) ? cfg.projects : [];
  const starterProjects = Array.isArray(cfg.starterProjects) ? cfg.starterProjects : [];
  const allProjects = [...projects, ...starterProjects];

  const title = meta.displayName || meta.name || 'Devfile';
  const description = meta.description || '';
  const version = meta.version || '';
  const tags = Array.isArray(meta.tags) ? meta.tags : [];

  // Components
  const compCards = components.map((c) => {
    const name = c.name || '';
    let typeKey = 'unknown';
    if (c.container) typeKey = 'container';
    else if (c.volume) typeKey = 'volume';
    else if (c.kubernetes) typeKey = 'kubernetes';
    else if (c.openshift) typeKey = 'openshift';
    else if (c.plugin) typeKey = 'plugin';

    const details = [];
    if (typeKey === 'container' && c.container) {
      const ct = c.container;
      if (ct.image) details.push(`<div class="devfile-kv"><span class="devfile-kv-k">image</span><span class="devfile-kv-v">${esc(truncate(ct.image, 60))}</span></div>`);
      if (ct.memoryLimit) details.push(`<div class="devfile-kv"><span class="devfile-kv-k">memoryLimit</span><span class="devfile-kv-v">${esc(ct.memoryLimit)}</span></div>`);
      if (ct.cpuLimit) details.push(`<div class="devfile-kv"><span class="devfile-kv-k">cpuLimit</span><span class="devfile-kv-v">${esc(ct.cpuLimit)}</span></div>`);
      if (ct.mountSources != null) details.push(`<div class="devfile-kv"><span class="devfile-kv-k">mountSources</span><span class="devfile-kv-v">${esc(String(ct.mountSources))}</span></div>`);
    } else if (typeKey === 'volume' && c.volume) {
      const vol = c.volume;
      if (vol.ephemeral != null) details.push(`<div class="devfile-kv"><span class="devfile-kv-k">ephemeral</span><span class="devfile-kv-v">${esc(String(vol.ephemeral))}</span></div>`);
      if (vol.size) details.push(`<div class="devfile-kv"><span class="devfile-kv-k">size</span><span class="devfile-kv-v">${esc(vol.size)}</span></div>`);
    }

    return `<div class="devfile-card">
  <div class="devfile-card-header">
    <span class="devfile-card-name">${esc(name)}</span>
    <span class="devfile-type ${typeKey}">${esc(typeKey)}</span>
  </div>
  ${details.join('')}
</div>`;
  }).join('');

  // Commands
  const cmdCards = commands.map((c) => {
    const name = c.id || c.name || '';
    let typeKey = 'exec';
    if (c.apply) typeKey = 'apply';
    else if (c.composite) typeKey = 'composite';

    const details = [];
    if (typeKey === 'exec' && c.exec) {
      if (c.exec.component) details.push(`<div class="devfile-kv"><span class="devfile-kv-k">component</span><span class="devfile-kv-v">${esc(c.exec.component)}</span></div>`);
      if (c.exec.commandLine) details.push(`<div class="devfile-cmdline">${esc(truncate(c.exec.commandLine, 80))}</div>`);
    } else if (typeKey === 'composite' && c.composite) {
      const cmds = Array.isArray(c.composite.commands) ? c.composite.commands : [];
      if (cmds.length) details.push(`<div class="devfile-kv"><span class="devfile-kv-k">commands</span><span class="devfile-kv-v">${esc(cmds.join(', '))}</span></div>`);
    }

    return `<div class="devfile-card">
  <div class="devfile-card-header">
    <span class="devfile-card-name">${esc(name)}</span>
    <span class="devfile-cmd-type">${esc(typeKey)}</span>
  </div>
  ${details.join('')}
</div>`;
  }).join('');

  // Projects
  const projHtml = allProjects.length
    ? `<div class="devfile-pills">${allProjects.slice(0, 10).map((p) => {
        const src = p.git ? 'git' : p.zip ? 'zip' : p.github ? 'github' : '';
        return `<span class="devfile-pill">${esc(p.name || '')}${src ? ` <small style="color:var(--fg-2,#888);margin-left:4px">${esc(src)}</small>` : ''}</span>`;
      }).join('')}</div>`
    : '';

  const host = document.createElement('div');
  host.className = 'devfile-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
  <span class="badge-devfile">Devfile</span>
  <span class="devfile-title">${esc(title)}</span>
  ${schemaVersion ? `<span class="devfile-version">v${esc(schemaVersion)}</span>` : ''}
</div>
${description ? `<div class="devfile-sub">${esc(description)}</div>` : ''}
${(version || tags.length) ? `<div class="devfile-meta">
  ${version ? `<span class="devfile-pill">version: ${esc(version)}</span>` : ''}
  ${tags.slice(0, 8).map((t) => `<span class="devfile-pill tag">${esc(t)}</span>`).join('')}
</div>` : ''}
${components.length ? `<div class="devfile-sec"><h3>Components (${components.length})</h3>${compCards}</div>` : ''}
${commands.length ? `<div class="devfile-sec"><h3>Commands (${commands.length})</h3>${cmdCards}</div>` : ''}
${allProjects.length ? `<div class="devfile-sec"><h3>Projects / Starter Projects (${allProjects.length})</h3>${projHtml}</div>` : ''}`;

  return { parentNode: host };
}
