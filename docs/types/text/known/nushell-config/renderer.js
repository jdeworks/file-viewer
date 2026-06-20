const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nushell-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.nushell-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4E9A06;color:#fff;vertical-align:middle;margin-right:8px}
.nushell-title{font-size:18px;font-weight:700;margin:0 0 4px}
.nushell-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.nushell-sec{margin:14px 0}
.nushell-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.nushell-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px}
.nushell-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px}
.nushell-kv-key{color:var(--fg-2,#888);min-width:150px;flex-shrink:0}
.nushell-kv-val{font-family:ui-monospace,monospace;word-break:break-all}
.nushell-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.nushell-chip{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.nushell-chip-green{background:#dcfce7;border-color:#86efac;color:#15803d}
.nushell-count{display:inline-flex;align-items:center;font-size:13px;padding:4px 12px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:2px 4px 2px 0}
.nushell-count-n{font-weight:700;font-size:15px;margin-right:5px;font-family:ui-monospace,monospace;color:var(--fg,#24292f)}
.nushell-count-l{font-size:11px;color:var(--fg-2,#888)}
.nushell-table{width:100%;border-collapse:collapse;font-size:13px}
.nushell-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:4px 8px 4px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.nushell-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-size:12px}
.nushell-cmd{font-family:ui-monospace,monospace;font-weight:600}
`;

function countPattern(text, regex) {
  return (text.match(regex) || []).length;
}

// Extract a value from $env.config = { ... } block for a given key path
function extractConfigValue(text, key) {
  // Match simple key: value or key: "value" patterns
  const patterns = [
    new RegExp(key + '\\s*:\\s*"([^"]+)"'),
    new RegExp(key + '\\s*:\\s*\'([^\']+)\''),
    new RegExp(key + '\\s*:\\s*(\\S+)'),
  ];
  for (const p of patterns) {
    const m = p.exec(text);
    if (m) return m[1].trim().replace(/,$/, '');
  }
  return null;
}

// Find the $env.config = { ... } block
function extractConfigBlock(text) {
  const startM = /\$env\.config\s*=\s*\{/.exec(text);
  if (!startM) return null;
  let depth = 1, i = startM.index + startM[0].length;
  while (i < text.length && depth > 0) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') depth--;
    i++;
  }
  return text.slice(startM.index, i);
}

// Extract keybindings array count from $env.config
function countArrayItems(text, key) {
  const keyM = new RegExp(key + '\\s*:\\s*\\[').exec(text);
  if (!keyM) return 0;
  let depth = 1, i = keyM.index + keyM[0].length;
  let count = 0;
  const slice = text.slice(i);
  // Count top-level { objects in the array
  let inDepth = 0;
  for (let j = 0; j < slice.length && depth > 0; j++) {
    if (slice[j] === '[') depth++;
    else if (slice[j] === ']') { depth--; if (depth === 0) break; }
    else if (slice[j] === '{') { inDepth++; if (inDepth === 1) count++; }
    else if (slice[j] === '}') inDepth--;
  }
  return count;
}

// Extract alias definitions: alias foo = ...
function extractAliases(text) {
  const aliases = [];
  const re = /^alias\s+(\S+)\s*=\s*(.+)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    aliases.push({ name: m[1], value: m[2].trim() });
  }
  return aliases;
}

// Extract custom command definitions: def "foo" [params] { ... }
function extractDefs(text) {
  const defs = [];
  const re = /^def\s+(?:"([^"]+)"|'([^']+)'|(\S+))\s*\[/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1] || m[2] || m[3];
    defs.push(name);
  }
  return defs;
}

export function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop() || 'config.nu';

  const configBlock = extractConfigBlock(text);

  // Extract settings from $env.config block
  const showBanner = configBlock ? extractConfigValue(configBlock, 'show_banner') : null;
  const editMode = configBlock ? extractConfigValue(configBlock, 'edit_mode') : null;
  const histMaxSize = configBlock ? extractConfigValue(configBlock, 'max_size') : null;
  const completionsAlgo = configBlock ? extractConfigValue(configBlock, 'algorithm') : null;
  const tableMode = configBlock ? extractConfigValue(configBlock, 'mode') : null;

  const keybindingsCount = configBlock ? countArrayItems(configBlock, 'keybindings') : 0;
  const menusCount = configBlock ? countArrayItems(configBlock, 'menus') : 0;

  const defs = extractDefs(text);
  const aliases = extractAliases(text);

  // Count use/source statements
  const useCount = countPattern(text, /^use\s+/gm);
  const sourceCount = countPattern(text, /^source\s+/gm);

  const parts = [];

  // Settings card
  if (configBlock) {
    const rows = [];
    if (showBanner !== null) {
      const isOff = showBanner === 'false' || showBanner === 'off';
      rows.push(`<div class="nushell-kv"><span class="nushell-kv-key">show_banner</span><span class="nushell-chip ${isOff ? '' : 'nushell-chip-green'}" style="${isOff ? 'background:#fee2e2;color:#991b1b;border-color:#fca5a5;font-size:11px;padding:2px 8px;border-radius:8px' : 'font-size:11px;padding:2px 8px;border-radius:8px'}">${esc(showBanner)}</span></div>`);
    }
    if (editMode) rows.push(`<div class="nushell-kv"><span class="nushell-kv-key">edit_mode</span><span class="nushell-kv-val">${esc(editMode)}</span></div>`);
    if (tableMode) rows.push(`<div class="nushell-kv"><span class="nushell-kv-key">table.mode</span><span class="nushell-kv-val">${esc(tableMode)}</span></div>`);
    if (completionsAlgo) rows.push(`<div class="nushell-kv"><span class="nushell-kv-key">completions.algorithm</span><span class="nushell-kv-val">${esc(completionsAlgo)}</span></div>`);
    if (histMaxSize) rows.push(`<div class="nushell-kv"><span class="nushell-kv-key">history.max_size</span><span class="nushell-kv-val">${Number(histMaxSize.replace(/[^0-9]/g, '') || 0).toLocaleString()}</span></div>`);
    if (keybindingsCount) rows.push(`<div class="nushell-kv"><span class="nushell-kv-key">keybindings</span><span class="nushell-kv-val">${keybindingsCount} defined</span></div>`);
    if (menusCount) rows.push(`<div class="nushell-kv"><span class="nushell-kv-key">menus</span><span class="nushell-kv-val">${menusCount} defined</span></div>`);
    if (rows.length) {
      parts.push(`<div class="nushell-sec"><h3>$env.config Settings</h3><div class="nushell-card">${rows.join('')}</div></div>`);
    }
  }

  // Summary counts
  const countItems = [];
  if (defs.length) countItems.push(`<span class="nushell-count"><span class="nushell-count-n">${defs.length}</span><span class="nushell-count-l">custom command${defs.length !== 1 ? 's' : ''}</span></span>`);
  if (aliases.length) countItems.push(`<span class="nushell-count"><span class="nushell-count-n">${aliases.length}</span><span class="nushell-count-l">alias${aliases.length !== 1 ? 'es' : ''}</span></span>`);
  if (useCount) countItems.push(`<span class="nushell-count"><span class="nushell-count-n">${useCount}</span><span class="nushell-count-l">use statement${useCount !== 1 ? 's' : ''}</span></span>`);
  if (sourceCount) countItems.push(`<span class="nushell-count"><span class="nushell-count-n">${sourceCount}</span><span class="nushell-count-l">source${sourceCount !== 1 ? 's' : ''}</span></span>`);
  if (countItems.length) {
    parts.push(`<div class="nushell-sec"><h3>Definitions</h3><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">${countItems.join('')}</div></div>`);
  }

  // Custom commands list
  if (defs.length) {
    const shown = defs.slice(0, 20);
    const chips = shown.map((d) => `<span class="nushell-chip">${esc(d)}</span>`).join('');
    const more = defs.length > 20 ? `<span class="nushell-chip" style="color:var(--fg-2,#888)">+${defs.length - 20} more</span>` : '';
    parts.push(`<div class="nushell-sec"><h3>Custom Commands (${defs.length})</h3><div class="nushell-chips">${chips}${more}</div></div>`);
  }

  // Aliases list
  if (aliases.length) {
    const shown = aliases.slice(0, 15);
    const tableRows = shown.map((a) => `<tr><td class="nushell-cmd">${esc(a.name)}</td><td style="font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#666)">${esc(a.value.length > 60 ? a.value.slice(0, 60) + '…' : a.value)}</td></tr>`).join('');
    const more = aliases.length > 15 ? `<tr><td colspan="2" style="font-size:11px;color:var(--fg-2,#888);padding:4px 0">…and ${aliases.length - 15} more</td></tr>` : '';
    parts.push(`<div class="nushell-sec"><h3>Aliases (${aliases.length})</h3>
<table class="nushell-table"><thead><tr><th>Alias</th><th>Command</th></tr></thead>
<tbody>${tableRows}${more}</tbody></table></div>`);
  }

  const subParts = [];
  if (editMode) subParts.push(`${editMode} mode`);
  if (defs.length) subParts.push(`${defs.length} command${defs.length !== 1 ? 's' : ''}`);
  if (aliases.length) subParts.push(`${aliases.length} alias${aliases.length !== 1 ? 'es' : ''}`);
  const sub = subParts.join(' · ') || 'Nushell configuration';

  const host = document.createElement('div');
  host.className = 'nushell-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="nushell-badge">Nushell</span>
  <span class="nushell-title">${esc(filename)}</span>
</div>
<div class="nushell-sub">${esc(sub)}</div>
${parts.join('')}`;

  return { parentNode: host };
}
