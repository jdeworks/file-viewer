import { parseTOML } from '../../toml.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.uv-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-uv{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.uv-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.uv-sec{margin:12px 0;}
.uv-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.uv-meta{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 12px;}
.uv-pill{font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.uv-pill.py{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;font-weight:600;}
.uv-list{display:flex;flex-direction:column;gap:3px;}
.uv-item{font:12px ui-monospace,monospace;padding:3px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.uv-flag{font-size:12px;padding:2px 8px;border-radius:6px;border:1px solid var(--border,#e0e0e0);}
.uv-flag.on{background:#f0fdf4;border-color:#bbf7d0;color:#166534;}
.uv-flag.off{background:var(--bg-2,#f6f8fa);color:var(--fg-2,#888);}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }

  const pythonVersion = cfg['python-version'] ?? cfg.python_version ?? cfg.requires_python ?? '';
  const pythonVersions = Array.isArray(cfg['python-versions']) ? cfg['python-versions'] : [];
  const packageIndex = cfg['package-index'] ?? cfg.index ?? '';
  const cache = cfg['cache-dir'] ?? cfg.cache_dir ?? '';
  const nativeTls = cfg['native-tls'];
  const preview = cfg['preview'];
  const managed = cfg['managed'];
  const linkMode = cfg['link-mode'] ?? '';
  const pipSection = cfg.pip || {};
  const extraIndexUrls = Array.isArray(pipSection['extra-index-url']) ? pipSection['extra-index-url'] : [];
  const indexUrl = pipSection['index-url'] ?? '';

  const host = document.createElement('div');
  host.className = 'uv-doc';

  const metaPills = [
    pythonVersion ? `<span class="uv-pill py">Python ${esc(pythonVersion)}</span>` : '',
    ...pythonVersions.map((v) => `<span class="uv-pill py">${esc(v)}</span>`),
    linkMode ? `<span class="uv-pill">link-mode: ${esc(linkMode)}</span>` : '',
  ].filter(Boolean).join('');

  const flags = [
    nativeTls !== undefined ? `<span class="uv-flag ${nativeTls ? 'on' : 'off'}">native-tls: ${nativeTls ? 'yes' : 'no'}</span>` : '',
    preview !== undefined ? `<span class="uv-flag ${preview ? 'on' : 'off'}">preview: ${preview ? 'yes' : 'no'}</span>` : '',
    managed !== undefined ? `<span class="uv-flag ${managed ? 'on' : 'off'}">managed: ${managed ? 'yes' : 'no'}</span>` : '',
  ].filter(Boolean);

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-uv">uv</span>
  <span class="uv-title">Python package manager config</span>
</div>
${metaPills ? `<div class="uv-meta">${metaPills}</div>` : ''}
${flags.length ? `<div class="uv-sec"><h3>Flags</h3><div style="display:flex;flex-wrap:wrap;gap:6px">${flags.join('')}</div></div>` : ''}
${cache ? `<div class="uv-sec"><h3>Cache directory</h3><span class="uv-item" style="display:inline-block">${esc(cache)}</span></div>` : ''}
${indexUrl ? `<div class="uv-sec"><h3>Package index</h3><div class="uv-list"><span class="uv-item">${esc(indexUrl)}</span></div></div>` : ''}
${extraIndexUrls.length ? `<div class="uv-sec"><h3>Extra index URLs (${extraIndexUrls.length})</h3><div class="uv-list">${extraIndexUrls.map((u) => `<span class="uv-item">${esc(u)}</span>`).join('')}</div></div>` : ''}
${packageIndex ? `<div class="uv-sec"><h3>Package index</h3><span class="uv-item" style="display:inline-block">${esc(typeof packageIndex === 'string' ? packageIndex : JSON.stringify(packageIndex))}</span></div>` : ''}`;

  return { parentNode: host };
}
