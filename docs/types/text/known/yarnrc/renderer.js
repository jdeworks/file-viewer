const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const AUTH_KEYS = /authtoken|npmAuthToken/i;

const CSS = `
.yarnrc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-yarn{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2C8EBB;color:#fff;vertical-align:middle;margin-right:8px;}
.yarnrc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.yarnrc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
.chip-version{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:#dbeafe;color:#1e40af;}
.chip-pnp{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:#ede9fe;color:#5b21b6;}
.chip-node-modules{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:#dbeafe;color:#1e40af;}
.chip-pnpm{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:#ffedd5;color:#9a3412;}
.yarnrc-sec{margin:12px 0;}
.yarnrc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.yarnrc-card{padding:10px 14px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin-bottom:8px;}
.yarnrc-row{display:flex;gap:8px;align-items:baseline;padding:3px 0;font-size:13px;border-bottom:1px solid var(--border,#e0e0e0);}
.yarnrc-row:last-child{border-bottom:none;}
.yarnrc-key{color:var(--fg-2,#888);min-width:200px;font-size:12px;}
.yarnrc-val{font:12px/1.4 ui-monospace,monospace;color:var(--fg,#24292f);word-break:break-all;}
.yarnrc-redacted{font-size:11px;background:var(--bg-3,#eee);padding:1px 6px;border-radius:4px;color:var(--fg-2,#888);}
.yarnrc-scope-chip{font-size:11px;padding:1px 6px;border-radius:4px;background:#fee2e2;color:#991b1b;font-family:ui-monospace,monospace;}
.yarnrc-scope-row{display:flex;align-items:baseline;gap:8px;padding:3px 0;border-bottom:1px solid var(--border,#e0e0e0);font-size:13px;}
.yarnrc-scope-row:last-child{border-bottom:none;}
`;

function row(label, val) {
  if (val == null) return '';
  return `<div class="yarnrc-row"><span class="yarnrc-key">${esc(label)}</span><span class="yarnrc-val">${esc(val)}</span></div>`;
}

function parseYarnV1(text) {
  const result = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sp = line.indexOf(' ');
    if (sp === -1) continue;
    const key = line.slice(0, sp).trim();
    const val = line.slice(sp + 1).trim().replace(/^["']|["']$/g, '');
    result[key] = val;
  }
  return result;
}

function parseYarnBerry(text) {
  // Minimal YAML-like parser for the flat keys and npmScopes block
  const result = {};
  const scopes = {};
  let inNpmScopes = false;
  let inPackageExtensions = false;
  let currentScope = null;
  let scopeIndent = 0;

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    if (!line || line.trimStart().startsWith('#')) continue;

    const indent = line.length - line.trimStart().length;
    const content = line.trimStart();

    if (inPackageExtensions) {
      if (indent === 0 && !content.startsWith(' ')) inPackageExtensions = false;
      else { result.__packageExtensionsCount = (result.__packageExtensionsCount || 0) + 1; continue; }
    }

    if (content.startsWith('packageExtensions:')) { inPackageExtensions = true; continue; }

    if (content.startsWith('npmScopes:')) { inNpmScopes = true; scopeIndent = indent; currentScope = null; continue; }

    if (inNpmScopes) {
      if (indent <= scopeIndent && !content.match(/^\s/)) { inNpmScopes = false; currentScope = null; }
      else {
        const scopeMatch = content.match(/^(\w[\w-]*):\s*$/);
        if (scopeMatch && indent === scopeIndent + 2) { currentScope = scopeMatch[1]; scopes[currentScope] = {}; continue; }
        if (currentScope) {
          const kvMatch = content.match(/^(\w[\w.]*):\s*(.+)$/);
          if (kvMatch) {
            const k = kvMatch[1];
            const v = kvMatch[2].replace(/^["']|["']$/g, '');
            scopes[currentScope][k] = AUTH_KEYS.test(k) ? '[configured]' : v;
          }
        }
        continue;
      }
    }

    const kvMatch = content.match(/^([\w.]+):\s*(.+)$/);
    if (kvMatch && indent === 0) {
      result[kvMatch[1]] = kvMatch[2].replace(/^["']|["']$/g, '');
    }
  }

  result.__scopes = scopes;
  return result;
}

export function render(intake) {
  const text = intake.text || '';

  // Detect version
  const isBerry = text.includes('nodeLinker:') || text.includes('yarnPath:') || text.includes('npmRegistryServer:');

  const host = document.createElement('div');
  host.className = 'yarnrc-doc';

  if (isBerry) {
    const cfg = parseYarnBerry(text);
    const linker = cfg['nodeLinker'] || '';
    let linkerChip = '';
    if (linker === 'pnp') linkerChip = `<span class="chip-pnp">PnP</span>`;
    else if (linker === 'pnpm') linkerChip = `<span class="chip-pnpm">pnpm</span>`;
    else if (linker === 'node-modules' || linker) linkerChip = `<span class="chip-node-modules">${esc(linker || 'node-modules')}</span>`;

    const mainRows = [
      cfg['yarnPath'] ? row('yarnPath', cfg['yarnPath']) : '',
      cfg['npmRegistryServer'] ? row('registry', cfg['npmRegistryServer']) : '',
      cfg['enableGlobalCache'] != null ? row('enableGlobalCache', cfg['enableGlobalCache']) : '',
      cfg['compressionLevel'] != null ? row('compressionLevel', cfg['compressionLevel']) : '',
      cfg['defaultSemverRangePrefix'] != null ? row('defaultSemverRangePrefix', cfg['defaultSemverRangePrefix']) : '',
      cfg['__packageExtensionsCount'] ? row('packageExtensions entries', String(cfg['__packageExtensionsCount'])) : '',
    ].filter(Boolean).join('');

    const mainHtml = mainRows
      ? `<div class="yarnrc-sec"><h3>Settings</h3><div class="yarnrc-card">${mainRows}</div></div>`
      : '';

    const scopes = cfg['__scopes'] || {};
    const scopeEntries = Object.entries(scopes);
    let scopesHtml = '';
    if (scopeEntries.length) {
      const rows = scopeEntries.map(([scope, info]) => {
        const registry = info['npmRegistryServer'] || '';
        const auth = info['npmAuthToken'] ? ' · auth: <span class="yarnrc-redacted">[configured]</span>' : '';
        return `<div class="yarnrc-scope-row"><span class="yarnrc-scope-chip">@${esc(scope)}</span><span class="yarnrc-val">${esc(registry)}${auth}</span></div>`;
      }).join('');
      scopesHtml = `<div class="yarnrc-sec"><h3>Scoped Registries (${scopeEntries.length})</h3><div class="yarnrc-card">${rows}</div></div>`;
    }

    host.innerHTML = `<style>${CSS}</style>
<div class="yarnrc-title"><span class="badge-yarn">Yarn</span>.yarnrc.yml</div>
<div class="yarnrc-sub"><span class="chip-version">v2+ Berry</span>${linkerChip}</div>
${mainHtml}
${scopesHtml}`;
  } else {
    const cfg = parseYarnV1(text);
    const mainRows = [
      cfg['registry'] ? row('registry', cfg['registry']) : '',
      cfg['yarn-path'] ? row('yarn-path', cfg['yarn-path']) : '',
      cfg['cache-folder'] ? row('cache-folder', cfg['cache-folder']) : '',
      cfg['network-timeout'] ? row('network-timeout', cfg['network-timeout']) : '',
      cfg['proxy'] ? row('proxy', cfg['proxy']) : '',
      cfg['strict-ssl'] != null ? row('strict-ssl', cfg['strict-ssl']) : '',
    ].filter(Boolean).join('');

    const settingsHtml = mainRows
      ? `<div class="yarnrc-sec"><h3>Settings</h3><div class="yarnrc-card">${mainRows}</div></div>`
      : '';

    host.innerHTML = `<style>${CSS}</style>
<div class="yarnrc-title"><span class="badge-yarn">Yarn</span>.yarnrc</div>
<div class="yarnrc-sub"><span class="chip-version">v1 Classic</span></div>
${settingsHtml}`;
  }

  return { parentNode: host };
}
