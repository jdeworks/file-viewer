import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.buf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-buf{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0C5CF5;color:#fff;vertical-align:middle;margin-right:8px;}
.buf-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.buf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.buf-sec{margin:12px 0;}
.buf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.buf-pills{display:flex;flex-wrap:wrap;gap:6px;}
.buf-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.buf-plugin{border:1px solid var(--border,#e0e0e0);border-radius:6px;margin:6px 0;padding:8px 12px;background:var(--bg,#fff);}
.buf-plugin-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;}
.buf-plugin-out{font-size:12px;color:var(--fg-2,#666);margin-top:2px;}
.buf-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;}
.buf-kv-k{font-size:12px;color:var(--fg-2,#888);min-width:130px;}
.buf-kv-v{font-size:13px;font-family:ui-monospace,monospace;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = {}; }

  const filename = (intake.filename || '').split('/').pop().toLowerCase();
  const isGen = filename === 'buf.gen.yaml';
  const version = cfg.version ? String(cfg.version) : '';

  if (isGen) {
    // buf.gen.yaml: show plugins
    const plugins = Array.isArray(cfg.plugins) ? cfg.plugins : [];
    const managed = cfg.managed;

    const pluginsHtml = plugins.slice(0, 8).map((p) => {
      const name = p.plugin || p.name || p.remote || '(unknown)';
      const out = p.out ? `out: ${p.out}` : '';
      const opts = p.opt ? (Array.isArray(p.opt) ? `opts: ${p.opt.slice(0, 2).join(', ')}` : `opt: ${String(p.opt).slice(0, 40)}`) : '';
      return `<div class="buf-plugin">
        <div class="buf-plugin-name">${esc(name)}</div>
        ${out || opts ? `<div class="buf-plugin-out">${[out, opts].filter(Boolean).map(esc).join(' · ')}</div>` : ''}
      </div>`;
    }).join('');

    const host = document.createElement('div');
    host.className = 'buf-doc';
    host.innerHTML = `<style>${CSS}</style>
<div class="buf-title"><span class="badge-buf">Buf</span>Code generation config</div>
<div class="buf-sub">${version ? `version ${esc(version)} · ` : ''}${plugins.length} plugin${plugins.length !== 1 ? 's' : ''}</div>

${plugins.length ? `<div class="buf-sec"><h3>Plugins</h3>${pluginsHtml}${plugins.length > 8 ? `<div style="font-size:12px;color:var(--fg-2,#888)">…and ${plugins.length - 8} more</div>` : ''}</div>` : ''}

${managed ? `<div class="buf-sec"><h3>Managed Mode</h3><div class="buf-pills"><span class="buf-pill">${managed.enabled !== false ? 'enabled' : 'disabled'}</span>${managed['go_package_prefix']?.default ? `<span class="buf-pill">go_package: ${esc(managed['go_package_prefix'].default)}</span>` : ''}</div></div>` : ''}
`;
    return { parentNode: host };
  }

  // buf.yaml: show modules, lint, breaking
  const modules = Array.isArray(cfg.modules) ? cfg.modules : [];
  // v1: deps at top level; v2: under each module or workspace deps
  const deps = Array.isArray(cfg.deps) ? cfg.deps
    : modules.flatMap((m) => Array.isArray(m.deps) ? m.deps : []);

  const lintSection = cfg.lint || {};
  const lintUse = Array.isArray(lintSection.use) ? lintSection.use : [];
  const lintExcept = Array.isArray(lintSection.except) ? lintSection.except : [];
  const lintIgnore = Array.isArray(lintSection.ignore) ? lintSection.ignore : [];

  const breakingSection = cfg.breaking || {};
  const breakingUse = Array.isArray(breakingSection.use) ? breakingSection.use : [];

  const parts = [];
  if (version) parts.push(`version ${version}`);
  if (modules.length > 0) parts.push(`${modules.length} module${modules.length !== 1 ? 's' : ''}`);
  if (deps.length) parts.push(`${deps.length} dep${deps.length !== 1 ? 's' : ''}`);

  const host = document.createElement('div');
  host.className = 'buf-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="buf-title"><span class="badge-buf">Buf</span>Protobuf config</div>
<div class="buf-sub">${parts.join(' · ')}</div>

${modules.length ? `<div class="buf-sec"><h3>Modules</h3><div class="buf-pills">${modules.slice(0, 6).map((m) => `<span class="buf-pill">${esc(m.path || m.directory || '(root)')}</span>`).join('')}${modules.length > 6 ? `<span class="buf-pill">+${modules.length - 6}</span>` : ''}</div></div>` : ''}

${deps.length ? `<div class="buf-sec"><h3>Dependencies</h3><div class="buf-pills">${deps.slice(0, 6).map((d) => `<span class="buf-pill">${esc(d)}</span>`).join('')}${deps.length > 6 ? `<span class="buf-pill">+${deps.length - 6}</span>` : ''}</div></div>` : ''}

${lintUse.length || lintExcept.length || lintIgnore.length ? `<div class="buf-sec"><h3>Lint Rules</h3>
  ${lintUse.length ? `<div class="buf-kv"><span class="buf-kv-k">Use</span><span class="buf-kv-v">${esc(lintUse.join(', '))}</span></div>` : ''}
  ${lintExcept.length ? `<div class="buf-kv"><span class="buf-kv-k">Except</span><span class="buf-kv-v">${esc(lintExcept.join(', '))}</span></div>` : ''}
  ${lintIgnore.length ? `<div class="buf-kv"><span class="buf-kv-k">Ignore paths</span><span class="buf-kv-v">${lintIgnore.length} path${lintIgnore.length !== 1 ? 's' : ''}</span></div>` : ''}
</div>` : ''}

${breakingUse.length ? `<div class="buf-sec"><h3>Breaking Change Rules</h3><div class="buf-pills">${breakingUse.map((r) => `<span class="buf-pill">${esc(r)}</span>`).join('')}</div></div>` : ''}
`;
  return { parentNode: host };
}
