const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nixcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.nixcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5277c3;color:#fff;vertical-align:middle;margin-right:8px}
.nixcfg-title{font-size:18px;font-weight:700;margin:0 0 4px}
.nixcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.nixcfg-sec{margin:14px 0}
.nixcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.nixcfg-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff)}
.nixcfg-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}
.nixcfg-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.nixcfg-pill.on{background:#dcfce7;border-color:#86efac;color:#166534}
.nixcfg-pill.off{background:#fee2e2;border-color:#fca5a5;color:#991b1b}
.nixcfg-pill.relaxed{background:#fef9c3;border-color:#fde047;color:#713f12}
.nixcfg-pill.warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c}
.nixcfg-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px}
.nixcfg-kv-k{color:var(--fg-2,#888);min-width:200px;font-family:ui-monospace,monospace}
.nixcfg-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.nixcfg-url{font-family:ui-monospace,monospace;font-size:12px;color:#5277c3;word-break:break-all}
`;

/**
 * Parse nix.conf: key = value or key value lines; # comments stripped.
 */
function parseNixConf(text) {
  const cfg = {};
  for (const rawLine of (text || '').split('\n')) {
    // Strip inline comments (but not inside URLs)
    const trimmed = rawLine.replace(/#.*$/, '').trim();
    if (!trimmed) continue;
    // nix.conf allows: key = value  OR  key value  (both forms)
    const m = trimmed.match(/^([a-z][a-z0-9-]*)(?:\s*=\s*|\s+)(.+)$/);
    if (m) cfg[m[1]] = m[2].trim();
  }
  return cfg;
}

function splitSpaces(v) {
  return (v || '').trim().split(/\s+/).filter(Boolean);
}

function pill(text, cls = '') {
  return `<span class="nixcfg-pill${cls ? ' ' + cls : ''}">${esc(text)}</span>`;
}

function boolPill(val) {
  if (val === 'true') return pill('true', 'on');
  if (val === 'false') return pill('false', 'off');
  return pill(val);
}

export function render(intake) {
  const cfg = parseNixConf(intake.text || '');

  // Experimental features
  const expFeatures = splitSpaces(cfg['experimental-features'] || cfg['extra-experimental-features']);

  // Substituters
  const substituters = splitSpaces(cfg['substituters'] || cfg['extra-substituters']);
  const trustedSubs = splitSpaces(cfg['trusted-substituters']);

  // Trusted users
  const trustedUsers = splitSpaces(cfg['trusted-users'] || cfg['extra-trusted-users']);
  const allowedUsers = splitSpaces(cfg['allowed-users']);

  // Build settings
  const maxJobs = cfg['max-jobs'];
  const cores = cfg['cores'];
  const sandbox = cfg['sandbox'];
  const autoOptimise = cfg['auto-optimise-store'];
  const keepOutputs = cfg['keep-outputs'];
  const keepDerivations = cfg['keep-derivations'];
  const extraPlatforms = splitSpaces(cfg['extra-platforms']);

  // Build summary
  const parts = [];
  if (expFeatures.length) parts.push(`${expFeatures.length} experimental feature${expFeatures.length !== 1 ? 's' : ''}`);
  if (substituters.length) parts.push(`${substituters.length} substituter${substituters.length !== 1 ? 's' : ''}`);
  if (trustedUsers.length) parts.push(`${trustedUsers.length} trusted user${trustedUsers.length !== 1 ? 's' : ''}`);
  if (maxJobs) parts.push(`max-jobs: ${maxJobs}`);

  let sectionsHtml = '';

  // Experimental features
  if (expFeatures.length) {
    const pills = expFeatures.map((f) => pill(f)).join('');
    sectionsHtml += `<div class="nixcfg-sec"><h3>Experimental Features</h3><div class="nixcfg-pills">${pills}</div></div>`;
  }

  // Substituters (binary caches)
  if (substituters.length) {
    const items = substituters.map((u) => `<div class="nixcfg-kv"><span class="nixcfg-url">${esc(u)}</span></div>`).join('');
    sectionsHtml += `<div class="nixcfg-sec"><h3>Substituters (${substituters.length})</h3><div class="nixcfg-card">${items}</div></div>`;
  }

  // Trusted substituters
  if (trustedSubs.length) {
    const items = trustedSubs.map((u) => `<div class="nixcfg-kv"><span class="nixcfg-url">${esc(u)}</span></div>`).join('');
    sectionsHtml += `<div class="nixcfg-sec"><h3>Trusted Substituters</h3><div class="nixcfg-card">${items}</div></div>`;
  }

  // Trusted users
  if (trustedUsers.length) {
    const pills = trustedUsers.map((u) => {
      const cls = u === 'root' || u.startsWith('@') ? 'warn' : '';
      return pill(u, cls);
    }).join('');
    sectionsHtml += `<div class="nixcfg-sec"><h3>Trusted Users</h3><div class="nixcfg-pills">${pills}</div></div>`;
  }

  // Allowed users
  if (allowedUsers.length) {
    const pills = allowedUsers.map((u) => pill(u)).join('');
    sectionsHtml += `<div class="nixcfg-sec"><h3>Allowed Users</h3><div class="nixcfg-pills">${pills}</div></div>`;
  }

  // Build settings
  const buildRows = [];
  if (maxJobs) buildRows.push(`<div class="nixcfg-kv"><span class="nixcfg-kv-k">max-jobs</span><span class="nixcfg-kv-v">${esc(maxJobs)}</span></div>`);
  if (cores) buildRows.push(`<div class="nixcfg-kv"><span class="nixcfg-kv-k">cores</span><span class="nixcfg-kv-v">${esc(cores)}</span></div>`);
  if (sandbox != null) {
    const cls = sandbox === 'true' ? 'on' : sandbox === 'false' ? 'off' : 'relaxed';
    buildRows.push(`<div class="nixcfg-kv"><span class="nixcfg-kv-k">sandbox</span><span class="nixcfg-pill ${cls}" style="font-size:12px;padding:1px 8px">${esc(sandbox)}</span></div>`);
  }
  if (autoOptimise) buildRows.push(`<div class="nixcfg-kv"><span class="nixcfg-kv-k">auto-optimise-store</span>${boolPill(autoOptimise)}</div>`);
  if (keepOutputs) buildRows.push(`<div class="nixcfg-kv"><span class="nixcfg-kv-k">keep-outputs</span>${boolPill(keepOutputs)}</div>`);
  if (keepDerivations) buildRows.push(`<div class="nixcfg-kv"><span class="nixcfg-kv-k">keep-derivations</span>${boolPill(keepDerivations)}</div>`);

  if (buildRows.length) {
    sectionsHtml += `<div class="nixcfg-sec"><h3>Build Settings</h3><div class="nixcfg-card">${buildRows.join('')}</div></div>`;
  }

  // Extra platforms
  if (extraPlatforms.length) {
    const pills = extraPlatforms.map((p) => pill(p)).join('');
    sectionsHtml += `<div class="nixcfg-sec"><h3>Extra Platforms</h3><div class="nixcfg-pills">${pills}</div></div>`;
  }

  const sub = parts.length ? parts.join(' · ') : 'Nix daemon configuration';

  const host = document.createElement('div');
  host.className = 'nixcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="nixcfg-title"><span class="nixcfg-badge">Nix</span>Nix Configuration</div>
<div class="nixcfg-sub">${esc(sub)}</div>
${sectionsHtml}`;
  return { parentNode: host };
}
