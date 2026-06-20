import { parseTOML } from '../../toml.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fndry-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-fndry{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1C1C1C;color:#E8B84B;vertical-align:middle;margin-right:8px}
.fndry-title{font-size:18px;font-weight:700;margin:0 0 4px}
.fndry-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.fndry-sec{margin:14px 0}
.fndry-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.fndry-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.fndry-pill{display:inline-block;font-size:12px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.fndry-meta{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0}
.fndry-kv{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:5px 12px;font-size:13px;display:flex;gap:8px;align-items:baseline}
.fndry-kv-k{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888)}
.fndry-kv-v{font-family:ui-monospace,monospace;font-weight:600}
.fndry-flag{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;font-family:ui-monospace,monospace;font-weight:700}
.fndry-flag.on{background:#e8f5e9;color:#2e7d32}
.fndry-flag.off{background:#fbe9e7;color:#bf360c}
.fndry-table{width:100%;border-collapse:collapse;font-size:12px;margin-top:4px}
.fndry-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.fndry-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:11px}
`;

function maskEnvVar(val) {
  if (typeof val !== 'string') return String(val);
  // If it's ${ENV_VAR} pattern, show as-is (it's already a reference)
  if (/^\$\{[A-Z_][A-Z0-9_]*\}$/.test(val.trim())) return val.trim();
  // If it looks like a real API key (long alphanumeric), mask it
  if (/^[A-Za-z0-9_-]{20,}$/.test(val.trim())) return '***';
  return val;
}

export function render(intake) {
  let cfg = {};
  try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }

  const profiles = cfg.profile && typeof cfg.profile === 'object' ? Object.keys(cfg.profile) : [];
  const defaultProfile = (cfg.profile && cfg.profile.default) ? cfg.profile.default : {};

  // Paths
  const src = defaultProfile.src || null;
  const test = defaultProfile.test || null;
  const script = defaultProfile.script || null;
  const out = defaultProfile.out || null;

  // Compiler
  const solcVersion = defaultProfile.solc || defaultProfile['solc-version'] || null;
  const optimizerRuns = defaultProfile.optimizer_runs != null ? String(defaultProfile.optimizer_runs) : null;
  const viaIr = defaultProfile.via_ir != null ? defaultProfile.via_ir : null;
  const ffi = defaultProfile.ffi != null ? defaultProfile.ffi : null;

  // fs_permissions
  const fsPerms = defaultProfile.fs_permissions;
  const fsPermsStr = Array.isArray(fsPerms)
    ? fsPerms.map((p) => (p.access || '?') + ':' + (p.path || '?')).join(', ')
    : (fsPerms != null ? String(fsPerms) : null);

  // rpc_endpoints
  const rpcEndpoints = cfg.rpc_endpoints && typeof cfg.rpc_endpoints === 'object'
    ? Object.keys(cfg.rpc_endpoints) : [];

  // etherscan
  const etherscanEntries = cfg.etherscan && typeof cfg.etherscan === 'object'
    ? Object.entries(cfg.etherscan) : [];

  // remappings
  const remappings = Array.isArray(defaultProfile.remappings) ? defaultProfile.remappings : [];

  const profilesHtml = profiles.length > 1
    ? `<div class="fndry-sec"><h3>Profiles (${profiles.length})</h3><div class="fndry-pills">${profiles.map((p) => `<span class="fndry-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const pathItems = [
    src ? `<div class="fndry-kv"><span class="fndry-kv-k">src</span><span class="fndry-kv-v">${esc(src)}</span></div>` : '',
    test ? `<div class="fndry-kv"><span class="fndry-kv-k">test</span><span class="fndry-kv-v">${esc(test)}</span></div>` : '',
    script ? `<div class="fndry-kv"><span class="fndry-kv-k">script</span><span class="fndry-kv-v">${esc(script)}</span></div>` : '',
    out ? `<div class="fndry-kv"><span class="fndry-kv-k">out</span><span class="fndry-kv-v">${esc(out)}</span></div>` : '',
  ].filter(Boolean).join('');

  const compilerItems = [
    solcVersion ? `<div class="fndry-kv"><span class="fndry-kv-k">solc</span><span class="fndry-kv-v">${esc(solcVersion)}</span></div>` : '',
    optimizerRuns !== null ? `<div class="fndry-kv"><span class="fndry-kv-k">optimizer_runs</span><span class="fndry-kv-v">${esc(optimizerRuns)}</span></div>` : '',
    viaIr !== null ? `<div class="fndry-kv"><span class="fndry-kv-k">via_ir</span><span class="fndry-kv-v"><span class="fndry-flag ${viaIr ? 'on' : 'off'}">${viaIr ? 'true' : 'false'}</span></span></div>` : '',
    ffi !== null ? `<div class="fndry-kv"><span class="fndry-kv-k">ffi</span><span class="fndry-kv-v"><span class="fndry-flag ${ffi ? 'on' : 'off'}">${ffi ? 'enabled' : 'disabled'}</span></span></div>` : '',
    fsPermsStr ? `<div class="fndry-kv"><span class="fndry-kv-k">fs_permissions</span><span class="fndry-kv-v">${esc(fsPermsStr.length > 40 ? fsPermsStr.slice(0, 40) + '…' : fsPermsStr)}</span></div>` : '',
  ].filter(Boolean).join('');

  const settingsHtml = (pathItems || compilerItems)
    ? `<div class="fndry-sec"><h3>Default Profile</h3><div class="fndry-meta">${pathItems}${compilerItems}</div></div>`
    : '';

  const remappingsHtml = remappings.length
    ? `<div class="fndry-sec"><h3>Remappings (${remappings.length})</h3><div class="fndry-pills">${remappings.slice(0, 12).map((r) => `<span class="fndry-pill">${esc(r)}</span>`).join('')}${remappings.length > 12 ? `<span class="fndry-pill" style="color:var(--fg-2,#888)">+${remappings.length - 12} more</span>` : ''}</div></div>`
    : '';

  const rpcHtml = rpcEndpoints.length
    ? `<div class="fndry-sec"><h3>RPC Endpoints (${rpcEndpoints.length})</h3><div class="fndry-pills">${rpcEndpoints.map((k) => `<span class="fndry-pill">${esc(k)}</span>`).join('')}</div><p style="font-size:11px;color:var(--fg-2,#888);margin:4px 0 0">URLs hidden — may contain secrets.</p></div>`
    : '';

  const etherscanHtml = etherscanEntries.length
    ? `<div class="fndry-sec"><h3>Etherscan (${etherscanEntries.length})</h3><table class="fndry-table"><thead><tr><th>Chain</th><th>Key</th><th>URL</th></tr></thead><tbody>${etherscanEntries.map(([chain, entry]) => {
        const key = typeof entry === 'object' ? maskEnvVar(entry.key || '') : maskEnvVar(String(entry));
        const url = typeof entry === 'object' && entry.url ? esc(entry.url) : '—';
        return `<tr><td>${esc(chain)}</td><td>${esc(key)}</td><td>${url}</td></tr>`;
      }).join('')}</tbody></table></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'fndry-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="fndry-title"><span class="badge-fndry">Foundry</span>foundry.toml</div>
<div class="fndry-sub">Solidity testing and deployment framework configuration</div>
${profilesHtml}
${settingsHtml}
${remappingsHtml}
${rpcHtml}
${etherscanHtml}`;
  return { parentNode: host };
}
