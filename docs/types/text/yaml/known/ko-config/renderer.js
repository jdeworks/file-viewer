import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ko-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-ko{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00ACD7;color:#fff;vertical-align:middle;margin-right:8px;}
.ko-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ko-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ko-sec{margin:12px 0;}
.ko-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.ko-pills{display:flex;flex-wrap:wrap;gap:6px;}
.ko-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.ko-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;}
.ko-kv-k{font-size:12px;color:var(--fg-2,#888);min-width:130px;}
.ko-kv-v{font-size:13px;font-family:ui-monospace,monospace;}
.ko-flag{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:2px 8px;border-radius:10px;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa);}
.ko-flag.on{background:#e6f4ea;border-color:#a8d5b5;color:#1a7f37;}
.ko-flag.off{background:#fff0f0;border-color:#f5c6c6;color:#cf222e;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  // --- Base image ---
  const baseImage = cfg.defaultBaseImage || cfg.baseImage || cfg['base-image'] || '';

  // --- Platforms ---
  const platforms = Array.isArray(cfg.defaultPlatforms)
    ? cfg.defaultPlatforms
    : (cfg.defaultPlatforms ? [cfg.defaultPlatforms] : []);

  // --- Tags ---
  const tags = Array.isArray(cfg.defaultTags)
    ? cfg.defaultTags
    : (cfg.defaultTags ? [cfg.defaultTags] : []);

  // --- SBOM ---
  const sbom = cfg.defaultSBOM || cfg.sbom || '';

  // --- Push ---
  const push = cfg.defaultPush != null ? cfg.defaultPush : null;

  // --- Base image overrides ---
  const baseImageOverrides = cfg.baseImageOverrides && typeof cfg.baseImageOverrides === 'object'
    ? Object.entries(cfg.baseImageOverrides)
    : [];

  const parts = [];
  if (platforms.length) parts.push(platforms.join(', '));
  if (tags.length) parts.push(`${tags.length} tag${tags.length !== 1 ? 's' : ''}`);

  const host = document.createElement('div');
  host.className = 'ko-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="ko-title"><span class="badge-ko">ko</span>Container build config</div>
<div class="ko-sub">${esc(parts.join(' · ')) || 'Go container image builder'}</div>

${baseImage ? `<div class="ko-sec"><h3>Base Image</h3>
  <div class="ko-kv-v" style="font-size:13px;font-family:ui-monospace,monospace;">${esc(baseImage)}</div>
</div>` : ''}

${platforms.length ? `<div class="ko-sec"><h3>Platforms</h3><div class="ko-pills">${platforms.map((p) => `<span class="ko-pill">${esc(p)}</span>`).join('')}</div></div>` : ''}

${tags.length ? `<div class="ko-sec"><h3>Default Tags</h3><div class="ko-pills">${tags.map((t) => `<span class="ko-pill">${esc(t)}</span>`).join('')}</div></div>` : ''}

${sbom || push !== null ? `<div class="ko-sec"><h3>Settings</h3><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;">
  ${sbom ? `<span class="ko-kv"><span class="ko-kv-k">sbom</span><span class="ko-kv-v">${esc(sbom)}</span></span>` : ''}
  ${push !== null ? `<span class="ko-flag ${push ? 'on' : 'off'}">${push ? '✓' : '✗'} push</span>` : ''}
</div></div>` : ''}

${baseImageOverrides.length ? `<div class="ko-sec"><h3>Base Image Overrides</h3><div class="ko-pills">${baseImageOverrides.slice(0, 6).map(([k, v]) => `<span class="ko-pill">${esc(k.split('/').pop())} → ${esc(String(v).split('/').pop())}</span>`).join('')}${baseImageOverrides.length > 6 ? `<span class="ko-pill">+${baseImageOverrides.length - 6}</span>` : ''}</div></div>` : ''}
`;
  return { parentNode: host };
}
