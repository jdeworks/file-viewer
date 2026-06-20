import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.avy-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-avy{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00B3E0;color:#fff;vertical-align:middle;margin-right:8px;}
.avy-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.avy-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.avy-sec{margin:12px 0;}
.avy-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.avy-pills{display:flex;flex-wrap:wrap;gap:6px;}
.avy-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.avy-pill.img{background:#e0f7fa;border-color:#80deea;color:#006064;}
.avy-pill.branch{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.avy-pill.artifact{background:#fdf4ff;border-color:#d8b4fe;color:#6b21a8;}
.avy-cmd{font:12px/1.5 ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:6px 10px;margin:4px 0;white-space:pre-wrap;word-break:break-all;}
.avy-envkey{font:12px/1.5 ui-monospace,monospace;background:var(--bg-2,#f6f8fa);padding:2px 6px;border-radius:3px;color:var(--fg,#24292f);}
`;

function normArr(v) {
  if (!v) return [];
  return Array.isArray(v) ? v.map(String) : [String(v)];
}

function extractEnvKeys(env) {
  if (!env) return [];
  const keys = new Set();
  const sources = Array.isArray(env) ? env : [env];
  for (const block of sources) {
    if (typeof block === 'object' && block !== null) {
      for (const key of Object.keys(block)) {
        if (key !== 'global' && key !== 'matrix') keys.add(key);
      }
      if (block.global) {
        const globs = Array.isArray(block.global) ? block.global : [block.global];
        for (const g of globs) {
          if (typeof g === 'string') keys.add(g.split('=')[0].trim());
          else if (typeof g === 'object') Object.keys(g).forEach((k) => keys.add(k));
        }
      }
    }
  }
  return [...keys];
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = {}; }

  const image = normArr(cfg.image);
  const buildScript = normArr(cfg.build_script);
  const testScript = normArr(cfg.test_script);
  const branchesOnly = normArr(cfg.branches?.only);
  const branchesExcept = normArr(cfg.branches?.except);
  const envKeys = extractEnvKeys(cfg.environment);
  const artifacts = normArr(cfg.artifacts?.path || (Array.isArray(cfg.artifacts) ? cfg.artifacts.map((a) => a?.path || a).filter(Boolean) : []));

  const imageHtml = image.length
    ? `<div class="avy-sec"><h3>Build Image</h3><div class="avy-pills">${image.map((i) => `<span class="avy-pill img">${esc(i)}</span>`).join('')}</div></div>`
    : '';

  const buildHtml = buildScript.length
    ? `<div class="avy-sec"><h3>Build Script</h3>${buildScript.slice(0, 5).map((s) => `<div class="avy-cmd">${esc(s)}</div>`).join('')}${buildScript.length > 5 ? `<div style="font-size:12px;color:var(--fg-2,#888)">…and ${buildScript.length - 5} more</div>` : ''}</div>`
    : '';

  const testHtml = testScript.length
    ? `<div class="avy-sec"><h3>Test Script</h3>${testScript.slice(0, 5).map((s) => `<div class="avy-cmd">${esc(s)}</div>`).join('')}${testScript.length > 5 ? `<div style="font-size:12px;color:var(--fg-2,#888)">…and ${testScript.length - 5} more</div>` : ''}</div>`
    : '';

  const branchHtml = (branchesOnly.length || branchesExcept.length)
    ? `<div class="avy-sec"><h3>Branches</h3><div class="avy-pills">
        ${branchesOnly.map((b) => `<span class="avy-pill branch">only: ${esc(b)}</span>`).join('')}
        ${branchesExcept.map((b) => `<span class="avy-pill">except: ${esc(b)}</span>`).join('')}
      </div></div>`
    : '';

  const envHtml = envKeys.length
    ? `<div class="avy-sec"><h3>Environment Variables (${envKeys.length} keys)</h3><div class="avy-pills">${envKeys.slice(0, 12).map((k) => `<span class="avy-pill"><code class="avy-envkey">${esc(k)}</code></span>`).join('')}${envKeys.length > 12 ? `<span class="avy-pill" style="color:var(--fg-2,#888)">+${envKeys.length - 12} more</span>` : ''}</div></div>`
    : '';

  const artifactHtml = artifacts.length
    ? `<div class="avy-sec"><h3>Artifacts</h3><div class="avy-pills">${artifacts.slice(0, 8).map((a) => `<span class="avy-pill artifact">${esc(a)}</span>`).join('')}</div></div>`
    : '';

  const sub = [image.length ? image[0] : '', buildScript.length ? `${buildScript.length} build step${buildScript.length !== 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'avy-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="avy-title"><span class="badge-avy">AppVeyor</span>CI config</div>
<div class="avy-sub">${esc(sub)}</div>
${imageHtml}${buildHtml}${testHtml}${branchHtml}${envHtml}${artifactHtml}`;
  return { parentNode: host };
}
