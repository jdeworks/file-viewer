const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.apparmor-doc{padding:16px 18px;max-width:960px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.apparmor-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1A237E;color:#fff;vertical-align:middle;margin-right:8px;}
.apparmor-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.apparmor-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.apparmor-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;}
.apparmor-chip{display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;background:var(--bg-2,#f0f4f8);color:var(--fg,#24292f);border:1px solid var(--border,#d0d7de);}
.apparmor-chip-enforce{background:#e8f5e9;color:#2E7D32;border-color:#2E7D32;}
.apparmor-chip-complain{background:#fff3e0;color:#E65100;border-color:#E65100;}
.apparmor-chip-kill{background:#ffebee;color:#c62828;border-color:#c62828;}
.apparmor-chip-abstract{background:#f0f4ff;color:#1565C0;border-color:#1565C0;}
.apparmor-chip-cap{background:#f3e5f5;color:#7B1FA2;border-color:#7B1FA2;}
.apparmor-section{margin-bottom:16px;}
.apparmor-section-hd{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.apparmor-file-summary{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin-bottom:10px;}
.apparmor-file-stat{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 12px;}
.apparmor-file-stat-num{font-size:20px;font-weight:700;color:var(--fg,#24292f);}
.apparmor-file-stat-label{font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;}
.apparmor-path-list{list-style:none;margin:0;padding:0;}
.apparmor-path-list li{font-family:ui-monospace,monospace;font-size:12px;padding:2px 0;color:var(--fg,#24292f);}
.apparmor-deny-list li{color:#c62828;}
.apparmor-write-list li{color:#E65100;}
.apparmor-net-list{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px;}
.apparmor-net-list li{font-family:ui-monospace,monospace;font-size:12px;background:var(--bg-2,#f6f8fa);padding:2px 8px;border-radius:4px;border:1px solid var(--border,#e0e0e0);}
.apparmor-collapsible-toggle{font-size:12px;color:var(--fg-2,#666);cursor:pointer;margin-top:4px;display:inline-block;}
`;

function parseAppArmor(text) {
  const result = {
    profileName: null,
    mode: null,
    abstractions: [],
    capabilities: [],
    networkRules: [],
    writablePaths: [],
    deniedPaths: [],
    executablePaths: [],
    readOnlyCount: 0,
    totalFileRules: 0,
    otherRules: [],
  };

  // Find profile name and flags
  // e.g. "profile /usr/sbin/nginx flags=(enforce) {"
  // or top-level "  /usr/sbin/nginx {"
  const profileRe = /^\s*profile\s+(\S+)(?:\s+flags=\((\w+)\))?\s*\{/m;
  let m = text.match(profileRe);
  if (m) {
    result.profileName = m[1];
    result.mode = m[2] || null;
  } else {
    // fallback: "profile flags=(...) {" without name, or first path pattern
    const topLevelRe = /^\s*(\/[^\s{]+)\s+(?:flags=\((\w+)\)\s*)?\{/m;
    m = text.match(topLevelRe);
    if (m) {
      result.profileName = m[1];
      result.mode = m[2] || null;
    }
  }

  // flags=(mode) if not already captured
  if (!result.mode) {
    const flagsMatch = text.match(/flags=\((\w+)\)/);
    if (flagsMatch) result.mode = flagsMatch[1];
  }

  // #include <abstractions/...> and #include <tunables/...>
  const includeRe = /^\s*#include\s+[<"]([^>"]+)[>"]/gm;
  while ((m = includeRe.exec(text)) !== null) {
    result.abstractions.push(m[1]);
  }

  // capability NAME,
  const capRe = /^\s*capability\s+([^,\n]+),?/gm;
  while ((m = capRe.exec(text)) !== null) {
    const cap = m[1].trim();
    if (cap) result.capabilities.push(cap);
  }

  // network protocol type,
  const netRe = /^\s*network\s+([^,\n]+),?/gm;
  while ((m = netRe.exec(text)) !== null) {
    result.networkRules.push(m[1].trim());
  }

  // signal, ptrace, dbus rules
  const otherRuleRe = /^\s*(signal|ptrace|dbus)\s+[^,\n]+,?/gm;
  while ((m = otherRuleRe.exec(text)) !== null) {
    result.otherRules.push(m[0].trim());
  }

  // File rules: deny /path perms, or /path perms,
  const denyRe = /^\s*deny\s+(\/[^\s,]+)\s+([rwklxima]+),?/gm;
  while ((m = denyRe.exec(text)) !== null) {
    result.deniedPaths.push(m[1]);
    result.totalFileRules++;
  }

  const fileRe = /^\s*(\/[^\s,]+)\s+([rwklximar]+),/gm;
  while ((m = fileRe.exec(text)) !== null) {
    const path = m[1];
    const perms = m[2];
    result.totalFileRules++;
    if (perms.includes('w')) {
      result.writablePaths.push(path);
    } else if (perms.includes('x')) {
      result.executablePaths.push(path);
    } else {
      result.readOnlyCount++;
    }
  }

  return result;
}

export function render(intake) {
  const text = intake.text || '';
  const parsed = parseAppArmor(text);

  const modeChipClass = parsed.mode === 'enforce'
    ? 'apparmor-chip-enforce'
    : parsed.mode === 'complain'
      ? 'apparmor-chip-complain'
      : parsed.mode === 'kill'
        ? 'apparmor-chip-kill'
        : '';

  const profileChip = parsed.profileName
    ? `<span class="apparmor-chip" style="font-family:ui-monospace,monospace;">${esc(parsed.profileName)}</span>`
    : '';

  const modeChip = parsed.mode
    ? `<span class="apparmor-chip ${modeChipClass}">${esc(parsed.mode)}</span>`
    : '';

  const abstractionChips = parsed.abstractions
    .map(a => `<span class="apparmor-chip apparmor-chip-abstract">${esc(a)}</span>`)
    .join('');

  const capChips = parsed.capabilities
    .map(c => `<span class="apparmor-chip apparmor-chip-cap">${esc(c)}</span>`)
    .join('');

  const abstractionsHtml = abstractionChips
    ? `<div class="apparmor-section">
<div class="apparmor-section-hd">Abstractions Included (${parsed.abstractions.length})</div>
<div class="apparmor-chips">${abstractionChips}</div>
</div>`
    : '';

  const capsHtml = capChips
    ? `<div class="apparmor-section">
<div class="apparmor-section-hd">Capabilities Granted (${parsed.capabilities.length})</div>
<div class="apparmor-chips">${capChips}</div>
</div>`
    : '';

  const fileStatsHtml = `<div class="apparmor-section">
<div class="apparmor-section-hd">File Access (${parsed.totalFileRules} rules)</div>
<div class="apparmor-file-summary">
  <div class="apparmor-file-stat">
    <div class="apparmor-file-stat-num">${parsed.readOnlyCount}</div>
    <div class="apparmor-file-stat-label">Read-only</div>
  </div>
  <div class="apparmor-file-stat">
    <div class="apparmor-file-stat-num">${parsed.writablePaths.length}</div>
    <div class="apparmor-file-stat-label">Writable</div>
  </div>
  <div class="apparmor-file-stat">
    <div class="apparmor-file-stat-num">${parsed.executablePaths.length}</div>
    <div class="apparmor-file-stat-label">Executable</div>
  </div>
  <div class="apparmor-file-stat">
    <div class="apparmor-file-stat-num">${parsed.deniedPaths.length}</div>
    <div class="apparmor-file-stat-label">Denied</div>
  </div>
</div>
${parsed.writablePaths.length ? `<div style="margin-bottom:8px;"><div style="font-size:12px;font-weight:600;color:#E65100;margin-bottom:4px;">Writable paths</div><ul class="apparmor-path-list apparmor-write-list">${parsed.writablePaths.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>` : ''}
${parsed.deniedPaths.length ? `<div><div style="font-size:12px;font-weight:600;color:#c62828;margin-bottom:4px;">Denied paths</div><ul class="apparmor-path-list apparmor-deny-list">${parsed.deniedPaths.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>` : ''}
</div>`;

  const netHtml = parsed.networkRules.length
    ? `<div class="apparmor-section">
<div class="apparmor-section-hd">Network Rules (${parsed.networkRules.length})</div>
<ul class="apparmor-net-list">${parsed.networkRules.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
</div>`
    : '';

  const summaryParts = [];
  if (parsed.capabilities.length) summaryParts.push(`${parsed.capabilities.length} capability${parsed.capabilities.length !== 1 ? 's' : ''}`);
  if (parsed.totalFileRules) summaryParts.push(`${parsed.totalFileRules} file rule${parsed.totalFileRules !== 1 ? 's' : ''}`);
  if (parsed.networkRules.length) summaryParts.push(`${parsed.networkRules.length} network rule${parsed.networkRules.length !== 1 ? 's' : ''}`);

  const host = document.createElement('div');
  host.className = 'apparmor-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="apparmor-title"><span class="apparmor-badge">AppArmor</span>AppArmor Security Profile</div>
<div class="apparmor-sub">${summaryParts.join(' · ') || 'No rules detected'}</div>
<div class="apparmor-chips">${profileChip}${modeChip}</div>
${abstractionsHtml}
${capsHtml}
${fileStatsHtml}
${netHtml}`;

  return { parentNode: host };
}
