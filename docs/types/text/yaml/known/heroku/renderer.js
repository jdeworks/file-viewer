import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.hku-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-hku{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#79589F;color:#fff;vertical-align:middle;margin-right:8px;}
.hku-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.hku-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.hku-sec{margin:12px 0;}
.hku-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.hku-pills{display:flex;flex-wrap:wrap;gap:6px;}
.hku-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.hku-proc{border:1px solid var(--border,#e0e0e0);border-radius:6px;margin:6px 0;padding:8px 12px;background:var(--bg,#fff);}
.hku-proc-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;}
.hku-proc-cmd{font-size:12px;color:var(--fg-2,#666);margin-top:2px;font-family:ui-monospace,monospace;}
.hku-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;}
.hku-kv-k{font-size:12px;color:var(--fg-2,#888);min-width:120px;}
.hku-kv-v{font-size:13px;font-family:ui-monospace,monospace;word-break:break-all;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = {}; }

  // Build section: docker images
  const buildSection = cfg.build || {};
  const dockerImages = buildSection.docker || {};
  const dockerEntries = typeof dockerImages === 'object' && dockerImages !== null
    ? Object.entries(dockerImages)
    : [];

  // Release section
  const releaseSection = cfg.release || {};
  const releaseCmd = releaseSection.command || '';
  const releaseImage = releaseSection.image || '';

  // Run section: process types
  const runSection = cfg.run || {};
  const processes = typeof runSection === 'object' && runSection !== null
    ? Object.entries(runSection)
    : [];

  // Setup section: config vars / addons
  const setupSection = cfg.setup || {};
  const configVars = setupSection.config || {};
  const addons = Array.isArray(setupSection.addons) ? setupSection.addons : [];
  const configKeys = typeof configVars === 'object' ? Object.keys(configVars) : [];

  // Summary
  const parts = [];
  if (dockerEntries.length) parts.push(`${dockerEntries.length} docker image${dockerEntries.length !== 1 ? 's' : ''}`);
  if (processes.length) parts.push(`${processes.length} process type${processes.length !== 1 ? 's' : ''}`);
  if (addons.length) parts.push(`${addons.length} addon${addons.length !== 1 ? 's' : ''}`);

  const dockerHtml = dockerEntries.map(([name, dockerfile]) => {
    const df = typeof dockerfile === 'object' ? (dockerfile.dockerfile || dockerfile.path || 'Dockerfile') : String(dockerfile || 'Dockerfile');
    return `<div class="hku-proc">
      <div class="hku-proc-name">${esc(name)}</div>
      <div class="hku-proc-cmd">${esc(df)}</div>
    </div>`;
  }).join('');

  const procsHtml = processes.map(([name, val]) => {
    const cmd = typeof val === 'object' ? (val.command || JSON.stringify(val)) : String(val || '');
    return `<div class="hku-proc">
      <div class="hku-proc-name">${esc(name)}</div>
      ${cmd ? `<div class="hku-proc-cmd">${esc(cmd.slice(0, 80))}${cmd.length > 80 ? '…' : ''}</div>` : ''}
    </div>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'hku-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="hku-title"><span class="badge-hku">Heroku</span>Deployment config</div>
<div class="hku-sub">${parts.join(' · ') || 'heroku.yml'}</div>

${dockerEntries.length ? `<div class="hku-sec"><h3>Docker Images (build)</h3>${dockerHtml}</div>` : ''}

${releaseCmd || releaseImage ? `<div class="hku-sec"><h3>Release</h3>
  ${releaseImage ? `<div class="hku-kv"><span class="hku-kv-k">Image</span><span class="hku-kv-v">${esc(releaseImage)}</span></div>` : ''}
  ${releaseCmd ? `<div class="hku-kv"><span class="hku-kv-k">Command</span><span class="hku-kv-v">${esc(releaseCmd)}</span></div>` : ''}
</div>` : ''}

${processes.length ? `<div class="hku-sec"><h3>Process Types (run)</h3>${procsHtml}</div>` : ''}

${configKeys.length ? `<div class="hku-sec"><h3>Config Vars</h3><div class="hku-pills">${configKeys.slice(0, 8).map((k) => `<span class="hku-pill">${esc(k)}</span>`).join('')}${configKeys.length > 8 ? `<span class="hku-pill">+${configKeys.length - 8}</span>` : ''}</div></div>` : ''}

${addons.length ? `<div class="hku-sec"><h3>Addons</h3><div class="hku-pills">${addons.slice(0, 6).map((a) => `<span class="hku-pill">${esc(typeof a === 'object' ? (a.plan || JSON.stringify(a)) : String(a))}</span>`).join('')}</div></div>` : ''}
`;
  return { parentNode: host };
}
