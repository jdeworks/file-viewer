const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-fg{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2563eb;color:#fff;vertical-align:middle;margin-right:8px;}
.fg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.fg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.fg-sec{margin:14px 0;}
.fg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.fg-cards{display:grid;gap:6px;}
.fg-card{padding:8px 12px;border-radius:6px;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa);}
.fg-card-name{font-weight:600;font-size:13px;}
.fg-card-meta{font-size:11px;color:var(--fg-2,#888);margin-top:2px;}
.fg-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:#eff6ff;border:1px solid #93c5fd;color:#1d4ed8;margin:2px 3px 2px 0;}
.fg-chips{display:flex;flex-wrap:wrap;gap:2px;margin-top:3px;}
.fg-kv{display:flex;gap:8px;font-size:13px;margin:4px 0;}
.fg-kv span:first-child{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em;min-width:90px;}
.fg-mono{font:12px/1.4 ui-monospace,monospace;}
`;

// Extract string value from JS source using regex
function extractStr(text, key) {
  const m = new RegExp(`\\b${key}\\s*:\\s*['"\`]([^'"\`]+)['"\`]`).exec(text);
  return m ? m[1] : null;
}

// Extract array items from JS source (simple: look for array literal after key)
function extractArrayItems(text, key) {
  const m = new RegExp(`\\b${key}\\s*:\\s*\\[([^\\]]{0,2000})\\]`, 's').exec(text);
  if (!m) return [];
  const block = m[1];
  // Pull out string literals
  const items = [];
  const strRe = /['"`]([^'"`]+)['"`]/g;
  let sm;
  while ((sm = strRe.exec(block)) !== null) items.push(sm[1]);
  return items;
}

// Extract maker/plugin objects: { name: '...', config: {...}, platforms: [...] }
function extractObjects(text, key) {
  const m = new RegExp(`\\b${key}\\s*:\\s*\\[([\\s\\S]{0,4000})\\]`).exec(text);
  if (!m) return [];
  const block = m[1];
  // Find each object-like {...} block
  const objs = [];
  let depth = 0, start = -1;
  for (let i = 0; i < block.length; i++) {
    if (block[i] === '{') { if (depth === 0) start = i; depth++; }
    else if (block[i] === '}') {
      depth--;
      if (depth === 0 && start >= 0) { objs.push(block.slice(start, i + 1)); start = -1; }
    }
  }
  return objs.map((obj) => {
    const name = extractStr(obj, 'name') || extractStr(obj, 'type') || '(unknown)';
    const platforms = extractArrayItems(obj, 'platforms');
    return { name, platforms };
  });
}

export function render(intake) {
  const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
  const filename = (intake.name || intake.filename || 'forge.config.js').split('/').pop();

  // packagerConfig
  const appName = extractStr(text, 'name') || '';
  const appId = extractStr(text, 'appBundleId') || extractStr(text, 'appCategoryType') || '';
  const icon = extractStr(text, 'icon') || '';
  const outDir = extractStr(text, 'outDir') || '';

  const makers = extractObjects(text, 'makers');
  const plugins = extractObjects(text, 'plugins');
  const publishers = extractObjects(text, 'publishers');

  const metaItems = [
    appName ? `<div class="fg-kv"><span>App Name</span><span>${esc(appName)}</span></div>` : '',
    appId ? `<div class="fg-kv"><span>Bundle ID</span><span class="fg-mono">${esc(appId)}</span></div>` : '',
    icon ? `<div class="fg-kv"><span>Icon</span><span class="fg-mono">${esc(icon)}</span></div>` : '',
    outDir ? `<div class="fg-kv"><span>Out Dir</span><span class="fg-mono">${esc(outDir)}</span></div>` : '',
  ].filter(Boolean).join('');

  function renderCards(items, label) {
    if (!items.length) return '';
    return `<div class="fg-sec"><h3>${label} (${items.length})</h3><div class="fg-cards">${items.map((item) => {
      const plats = item.platforms.length ? `<div class="fg-chips">${item.platforms.map((p) => `<span class="fg-chip">${esc(p)}</span>`).join('')}</div>` : '';
      return `<div class="fg-card"><div class="fg-card-name">${esc(item.name)}</div>${plats ? `<div class="fg-card-meta">${plats}</div>` : ''}</div>`;
    }).join('')}</div></div>`;
  }

  const host = document.createElement('div');
  host.className = 'fg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="fg-title"><span class="badge-fg">Electron Forge</span>${esc(appName || filename)}</div>
<div class="fg-sub">Electron Forge build configuration</div>
${metaItems ? `<div class="fg-sec"><h3>Packager Config</h3>${metaItems}</div>` : ''}
${renderCards(makers, 'Makers')}
${renderCards(plugins, 'Plugins')}
${renderCards(publishers, 'Publishers')}`;
  return { parentNode: host };
}
