import jsYaml from '../../../../vendor/js-yaml/js-yaml.min.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.stk-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-stk{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5b2d8e;color:#fff;vertical-align:middle;margin-right:8px}
.stk-title{font-size:18px;font-weight:700;margin:0 0 4px}
.stk-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.stk-kv{display:flex;align-items:baseline;gap:8px;margin:4px 0;font-size:13px}
.stk-kv-label{color:var(--fg-2,#888);min-width:140px;flex-shrink:0}
.stk-kv-val{font:13px ui-monospace,monospace;color:var(--fg,#24292f)}
.stk-resolver{font:14px/1.4 ui-monospace,monospace;font-weight:700;color:#5b2d8e;background:var(--bg-2,#f6f8fa);padding:4px 10px;border-radius:6px;display:inline-block;margin:6px 0 12px}
.stk-sec{margin:12px 0}
.stk-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.stk-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:3px}
.stk-item{display:flex;align-items:baseline;gap:8px;padding:3px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.stk-name{font:13px/1 ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da)}
.stk-ver{font:12px ui-monospace,monospace;color:var(--fg-2,#888)}
.stk-note{font-size:12px;color:var(--fg-2,#888);margin:4px 0 0;font-style:italic}
.stk-flag{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  let parsed = {};
  try { parsed = jsYaml.load(text) || {}; } catch { parsed = {}; }

  // Resolver / snapshot
  const resolver = parsed.resolver || parsed.snapshot || null;
  let resolverStr = '';
  if (typeof resolver === 'string') {
    resolverStr = resolver;
  } else if (resolver && typeof resolver === 'object') {
    // snapshot object: { url: '...', name: 'lts-21.25' } or similar
    resolverStr = resolver.name || resolver.url || JSON.stringify(resolver);
  }

  // Packages (local package dirs)
  const packages = Array.isArray(parsed.packages) ? parsed.packages : [];
  const pkgList = packages.map((p) => (typeof p === 'string' ? p : JSON.stringify(p)));

  // Extra deps
  const extraDeps = Array.isArray(parsed['extra-deps']) ? parsed['extra-deps'] : [];
  const extraDepStrs = extraDeps.map((d) => {
    if (typeof d === 'string') return d;
    if (d && typeof d === 'object') {
      if (d.git) return `${d.git}@${d.commit || 'HEAD'}`;
      if (d.hackage) return d.hackage;
      return JSON.stringify(d);
    }
    return String(d);
  });

  // System GHC
  const systemGhc = parsed['system-ghc'];
  const installGhc = parsed['install-ghc'];

  // GHC options
  const ghcOptions = parsed['ghc-options'];
  const ghcOptEntries = ghcOptions && typeof ghcOptions === 'object'
    ? Object.entries(ghcOptions).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
    : [];

  const host = document.createElement('div');
  host.className = 'stk-doc';

  let html = `<style>${CSS}</style>
<div class="stk-title"><span class="badge-stk">Haskell Stack</span>stack.yaml</div>
<div class="stk-sub">Stack build tool configuration</div>`;

  if (resolverStr) {
    html += `<div class="stk-sec"><h3>Resolver / Snapshot</h3><div class="stk-resolver">${esc(resolverStr)}</div></div>`;
  }

  if (pkgList.length) {
    html += `<div class="stk-sec"><h3>Local Packages (${pkgList.length})</h3><ul class="stk-list">${pkgList.map((p) => `<li class="stk-item"><span class="stk-name">${esc(p)}</span></li>`).join('')}</ul></div>`;
  }

  if (extraDepStrs.length) {
    const shown = extraDepStrs.slice(0, 5);
    html += `<div class="stk-sec"><h3>Extra Dependencies (${extraDepStrs.length})</h3><ul class="stk-list">${shown.map((d) => `<li class="stk-item"><span class="stk-name">${esc(d)}</span></li>`).join('')}</ul>`;
    if (extraDepStrs.length > 5) html += `<p class="stk-note">… and ${extraDepStrs.length - 5} more</p>`;
    html += `</div>`;
  }

  const flagsHtml = [
    systemGhc != null ? `system-ghc: ${systemGhc}` : null,
    installGhc != null ? `install-ghc: ${installGhc}` : null,
  ].filter(Boolean);

  if (flagsHtml.length) {
    html += `<div class="stk-sec"><h3>GHC Settings</h3><div>${flagsHtml.map((f) => `<span class="stk-flag">${esc(f)}</span>`).join('')}</div></div>`;
  }

  if (ghcOptEntries.length) {
    html += `<div class="stk-sec"><h3>GHC Options</h3><ul class="stk-list">${ghcOptEntries.map((o) => `<li class="stk-item"><span class="stk-name">${esc(o)}</span></li>`).join('')}</ul></div>`;
  }

  host.innerHTML = html;
  return { parentNode: host };
}
