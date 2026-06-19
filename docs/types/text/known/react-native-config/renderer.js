const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rnc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-rnc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0ea5e9;color:#fff;vertical-align:middle;margin-right:8px;}
.rnc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rnc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.rnc-sec{margin:12px 0;}
.rnc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.rnc-pill{display:inline-block;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:2px;font-family:ui-monospace,monospace;}
.rnc-dep{padding:8px 12px;border-radius:6px;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa);margin:4px 0;}
.rnc-dep-name{font-weight:600;font-size:13px;font-family:ui-monospace,monospace;}
.rnc-dep-root{font-size:11px;color:var(--fg-2,#888);margin-top:2px;}
`;

// Extract top-level object keys from a JS object literal block
function extractObjKeys(text, key) {
  // Find the key's object block
  const re = new RegExp(`\\b${key}\\s*:\\s*\\{`, 'g');
  const m = re.exec(text);
  if (!m) return [];
  let depth = 1;
  let i = m.index + m[0].length;
  const keys = [];
  while (i < text.length && depth > 0) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) break; }
    else if (depth === 1) {
      // Look for a key at depth 1
      const km = /^\s*(['"`]?)(\w[\w.-]*)(\1)\s*:/.exec(text.slice(i));
      if (km) { keys.push(km[2]); i += km.index + km[0].length; continue; }
    }
    i++;
  }
  return keys;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = (intake.name || intake.filename || 'react-native.config.js').split('/').pop();

  // Dependencies (native modules with native code)
  const depKeys = extractObjKeys(text, 'dependencies');

  // Platforms
  const platformKeys = extractObjKeys(text, 'platforms');

  // Assets
  const assets = [];
  const assetsM = /assets\s*:\s*\[([^\]]+)\]/s.exec(text);
  if (assetsM) {
    const re = /['"`]([^'"`]+)['"`]/g;
    let m;
    while ((m = re.exec(assetsM[1])) !== null) assets.push(m[1]);
  }

  // Project config keys (root level non-array, non-function entries)
  const hasProject = /\bproject\s*:/.test(text);
  const hasCommands = /\bcommands\s*:/.test(text);
  const hasReactNativePath = /\breactNativePath\s*:/.test(text);

  // Look for root property in dependencies entries
  const depDetails = [];
  if (depKeys.length > 0) {
    for (const dk of depKeys.slice(0, 10)) {
      // Try to find root: '...' for this dep
      const rootRe = new RegExp(`['"\`]${dk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]\\s*:\\s*\\{[^}]*root\\s*:\\s*(['"\`])([^'"\`]+)\\1`);
      const rm = rootRe.exec(text);
      depDetails.push({ name: dk, root: rm ? rm[2] : null });
    }
  }

  const host = document.createElement('div');
  host.className = 'rnc-doc';

  const metaItems = [
    hasProject ? `<span class="rnc-pill">project config</span>` : '',
    hasCommands ? `<span class="rnc-pill">custom commands</span>` : '',
    hasReactNativePath ? `<span class="rnc-pill">reactNativePath</span>` : '',
  ].filter(Boolean).join('');

  host.innerHTML = `<style>${CSS}</style>
<div class="rnc-title"><span class="badge-rnc">React Native CLI</span>${esc(name)}</div>
<div class="rnc-sub">React Native CLI configuration</div>
${metaItems ? `<div class="rnc-sec"><h3>Project Settings</h3><div>${metaItems}</div></div>` : ''}
${depDetails.length ? `<div class="rnc-sec"><h3>Dependencies (${depDetails.length})</h3>${depDetails.map((d) => `<div class="rnc-dep"><div class="rnc-dep-name">${esc(d.name)}</div>${d.root ? `<div class="rnc-dep-root">root: ${esc(d.root)}</div>` : ''}</div>`).join('')}</div>` : ''}
${platformKeys.length ? `<div class="rnc-sec"><h3>Platforms</h3><div>${platformKeys.map((p) => `<span class="rnc-pill">${esc(p)}</span>`).join('')}</div></div>` : ''}
${assets.length ? `<div class="rnc-sec"><h3>Assets</h3><div>${assets.map((a) => `<span class="rnc-pill">${esc(a)}</span>`).join('')}</div></div>` : ''}`;

  return { parentNode: host };
}
