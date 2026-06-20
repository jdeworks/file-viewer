import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nfpm-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-nfpm{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#E94560;color:#fff;vertical-align:middle;margin-right:8px;}
.nfpm-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.nfpm-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.nfpm-sec{margin:12px 0;}
.nfpm-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.nfpm-pills{display:flex;flex-wrap:wrap;gap:6px;}
.nfpm-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.nfpm-pill.fmt-deb{background:#e8f0fe;border-color:#b3c8f7;color:#1a73e8;}
.nfpm-pill.fmt-rpm{background:#fce8e6;border-color:#f5c6c0;color:#d93025;}
.nfpm-pill.fmt-apk{background:#e6f4ea;border-color:#a8d5b5;color:#1a7f37;}
.nfpm-pill.fmt-ipk{background:#fef7e0;border-color:#f5e0a8;color:#b06000;}
.nfpm-pill.fmt-archlinux{background:#f3e8fd;border-color:#d3a8f5;color:#7b1fa2;}
.nfpm-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;}
.nfpm-kv-k{font-size:12px;color:var(--fg-2,#888);min-width:130px;}
.nfpm-kv-v{font-size:13px;font-family:ui-monospace,monospace;}
.nfpm-file{font-size:12px;padding:3px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 0;}
`;

const FORMAT_CLASSES = { deb: 'fmt-deb', rpm: 'fmt-rpm', apk: 'fmt-apk', ipk: 'fmt-ipk', archlinux: 'fmt-archlinux' };

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const name = cfg.name || '';
  const version = cfg.version || '';
  const arch = cfg.arch || '';
  const maintainer = cfg.maintainer || '';
  const description = cfg.description || '';
  const homepage = cfg.homepage || '';
  const license = cfg.license || '';

  // --- Formats ---
  const formatsRaw = cfg.formats || cfg.packagers || [];
  const formats = Array.isArray(formatsRaw) ? formatsRaw : [formatsRaw];

  // --- Contents (file mappings) ---
  const contents = Array.isArray(cfg.contents) ? cfg.contents : [];
  const fileContents = contents.filter((c) => !c.type || c.type === 'file');
  const dirContents = contents.filter((c) => c.type === 'dir');
  const symlinkContents = contents.filter((c) => c.type === 'symlink');

  // --- Scripts ---
  const scripts = cfg.scripts || {};
  const scriptKeys = Object.keys(scripts).filter((k) => scripts[k]);

  // --- Dependencies ---
  const deps = cfg.dependencies || [];
  const recommends = cfg.recommends || [];

  const subtitle = [
    name && version ? `${name} ${version}` : (name || ''),
    arch ? `arch: ${arch}` : '',
    formats.length ? formats.join(', ') : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'nfpm-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="nfpm-title"><span class="badge-nfpm">nfpm</span>${esc(name || 'Package config')}</div>
<div class="nfpm-sub">${esc(subtitle)}</div>

${description ? `<div class="nfpm-sec" style="font-size:13px;color:var(--fg-2,#666);padding:8px 12px;background:var(--bg-2,#f6f8fa);border-radius:6px;border-left:3px solid var(--border,#e0e0e0)">${esc(description)}</div>` : ''}

${formats.length ? `<div class="nfpm-sec"><h3>Package Formats</h3><div class="nfpm-pills">${formats.map((f) => `<span class="nfpm-pill ${FORMAT_CLASSES[f] || ''}">${esc(f)}</span>`).join('')}</div></div>` : ''}

${maintainer || license || homepage ? `<div class="nfpm-sec"><h3>Metadata</h3>
  ${maintainer ? `<div class="nfpm-kv"><span class="nfpm-kv-k">maintainer</span><span class="nfpm-kv-v">${esc(maintainer)}</span></div>` : ''}
  ${license ? `<div class="nfpm-kv"><span class="nfpm-kv-k">license</span><span class="nfpm-kv-v">${esc(license)}</span></div>` : ''}
  ${homepage ? `<div class="nfpm-kv"><span class="nfpm-kv-k">homepage</span><span class="nfpm-kv-v">${esc(homepage)}</span></div>` : ''}
</div>` : ''}

${contents.length ? `<div class="nfpm-sec"><h3>Contents</h3>
  ${fileContents.length ? `<div class="nfpm-kv"><span class="nfpm-kv-k">files</span><span class="nfpm-kv-v">${fileContents.length}</span></div>` : ''}
  ${dirContents.length ? `<div class="nfpm-kv"><span class="nfpm-kv-k">directories</span><span class="nfpm-kv-v">${dirContents.length}</span></div>` : ''}
  ${symlinkContents.length ? `<div class="nfpm-kv"><span class="nfpm-kv-k">symlinks</span><span class="nfpm-kv-v">${symlinkContents.length}</span></div>` : ''}
  <div style="margin-top:6px;">${fileContents.slice(0, 4).map((c) => `<div class="nfpm-file">${esc(c.src || '')} → ${esc(c.dst || '')}</div>`).join('')}${fileContents.length > 4 ? `<div style="font-size:11px;color:var(--fg-2,#888);margin-top:2px">…and ${fileContents.length - 4} more files</div>` : ''}</div>
</div>` : ''}

${deps.length ? `<div class="nfpm-sec"><h3>Dependencies</h3><div class="nfpm-pills">${deps.slice(0, 8).map((d) => `<span class="nfpm-pill">${esc(d)}</span>`).join('')}${deps.length > 8 ? `<span class="nfpm-pill">+${deps.length - 8}</span>` : ''}</div></div>` : ''}

${scriptKeys.length ? `<div class="nfpm-sec"><h3>Install Scripts</h3><div class="nfpm-pills">${scriptKeys.map((k) => `<span class="nfpm-pill">${esc(k)}</span>`).join('')}</div></div>` : ''}
`;
  return { parentNode: host };
}
