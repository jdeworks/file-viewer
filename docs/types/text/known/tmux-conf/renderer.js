const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tmuxcfg-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.tmuxcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1D1D1D;color:#fff;vertical-align:middle;margin-right:8px}
.tmuxcfg-title{font-size:18px;font-weight:700;margin:0 0 4px}
.tmuxcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.tmuxcfg-sec{margin:14px 0}
.tmuxcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.tmuxcfg-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.tmuxcfg-chip{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.tmuxcfg-chip-green{background:#dcfce7;border-color:#86efac;color:#15803d}
.tmuxcfg-chip-key{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8;font-family:ui-monospace,monospace}
.tmuxcfg-table{width:100%;border-collapse:collapse;font-size:13px}
.tmuxcfg-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.tmuxcfg-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.tmuxcfg-key{font:13px/1.4 ui-monospace,monospace;font-weight:600}
.tmuxcfg-val{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#666)}
.tmuxcfg-trunc{display:inline-block;max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom;font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#666)}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const filename = (intake.name || intake.filename || '').split('/').pop() || '.tmux.conf';
  const lines = text.split('\n');

  let prefixKey = null;
  let defaultTerminal = null;
  let mouseMode = null;
  let baseIndex = null;
  let historyLimit = null;
  let statusLeft = null;
  let statusRight = null;
  let statusStyle = null;
  let bindCount = 0;
  const plugins = [];
  let tpmEnabled = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // prefix key
    const prefixMatch = /^set(?:-option)?\s+-g\s+prefix\s+(\S+)/.exec(trimmed);
    if (prefixMatch) { prefixKey = prefixMatch[1]; continue; }

    // default-terminal
    const termMatch = /^set(?:-option)?\s+(?:-g|-ga)?\s*default-terminal\s+"?([^"]+)"?/.exec(trimmed);
    if (termMatch) { defaultTerminal = termMatch[1]; continue; }

    // mouse
    const mouseMatch = /^set(?:-option)?\s+-g\s+mouse\s+(on|off)/.exec(trimmed);
    if (mouseMatch) { mouseMode = mouseMatch[1]; continue; }

    // base-index
    const baseMatch = /^set(?:-option)?\s+-g\s+base-index\s+(\d+)/.exec(trimmed);
    if (baseMatch) { baseIndex = baseMatch[1]; continue; }

    // history-limit
    const histMatch = /^set(?:-option)?\s+-g\s+history-limit\s+(\d+)/.exec(trimmed);
    if (histMatch) { historyLimit = histMatch[1]; continue; }

    // status-left
    const slMatch = /^set(?:-option)?\s+-g\s+status-left\s+"(.*)"/.exec(trimmed);
    if (slMatch) { statusLeft = slMatch[1]; continue; }

    // status-right
    const srMatch = /^set(?:-option)?\s+-g\s+status-right\s+"(.*)"/.exec(trimmed);
    if (srMatch) { statusRight = srMatch[1]; continue; }

    // status-style / status-bg / status-fg
    if (/^set(?:-option)?\s+-g\s+status-(?:style|bg|fg)/.test(trimmed)) {
      statusStyle = (statusStyle || '') + trimmed + '\n';
      continue;
    }

    // TPM plugin
    const pluginMatch = /^set\s+-g\s+@plugin\s+'([^']+)'/.exec(trimmed) ||
                        /^set\s+-g\s+@plugin\s+"([^"]+)"/.exec(trimmed);
    if (pluginMatch) { plugins.push(pluginMatch[1]); continue; }

    // TPM run
    if (/run\s+'[^']*\/tpm\/tpm'/.test(trimmed) || /run\s+"[^"]*\/tpm\/tpm"/.test(trimmed)) {
      tpmEnabled = true;
      continue;
    }

    // bind / bind-key
    if (/^bind(?:-key)?\s/.test(trimmed)) { bindCount++; continue; }
  }

  // Build sections
  const parts = [];

  // Prefix chip
  if (prefixKey) {
    parts.push(`<div class="tmuxcfg-sec"><h3>Prefix Key</h3><div class="tmuxcfg-chips"><span class="tmuxcfg-chip tmuxcfg-chip-key">${esc(prefixKey)}</span></div></div>`);
  }

  // Settings card
  const settingRows = [];
  if (defaultTerminal) settingRows.push(`<tr><td class="tmuxcfg-key">Terminal</td><td><span class="tmuxcfg-val">${esc(defaultTerminal)}</span></td></tr>`);
  if (mouseMode) settingRows.push(`<tr><td class="tmuxcfg-key">Mouse</td><td>${mouseMode === 'on' ? '<span class="tmuxcfg-chip tmuxcfg-chip-green" style="font-size:11px;padding:2px 8px;border-radius:8px">enabled</span>' : '<span class="tmuxcfg-val">off</span>'}</td></tr>`);
  if (baseIndex !== null) settingRows.push(`<tr><td class="tmuxcfg-key">Base index</td><td><span class="tmuxcfg-val">${esc(baseIndex)}</span></td></tr>`);
  if (historyLimit) settingRows.push(`<tr><td class="tmuxcfg-key">History limit</td><td><span class="tmuxcfg-val">${Number(historyLimit).toLocaleString()} lines</span></td></tr>`);

  if (settingRows.length) {
    parts.push(`<div class="tmuxcfg-sec"><h3>Settings</h3><table class="tmuxcfg-table"><tbody>${settingRows.join('')}</tbody></table></div>`);
  }

  // Keybindings count
  if (bindCount > 0) {
    parts.push(`<div class="tmuxcfg-sec"><h3>Keybindings</h3><div class="tmuxcfg-chips"><span class="tmuxcfg-chip">${bindCount} binding${bindCount !== 1 ? 's' : ''} defined</span></div></div>`);
  }

  // Status bar
  const statusRows = [];
  if (statusLeft) statusRows.push(`<tr><td class="tmuxcfg-key">Left</td><td><span class="tmuxcfg-trunc" title="${esc(statusLeft)}">${esc(statusLeft)}</span></td></tr>`);
  if (statusRight) statusRows.push(`<tr><td class="tmuxcfg-key">Right</td><td><span class="tmuxcfg-trunc" title="${esc(statusRight)}">${esc(statusRight)}</span></td></tr>`);
  if (statusRows.length) {
    parts.push(`<div class="tmuxcfg-sec"><h3>Status Bar</h3><table class="tmuxcfg-table"><tbody>${statusRows.join('')}</tbody></table></div>`);
  }

  // TPM plugins
  if (plugins.length || tpmEnabled) {
    const pluginChips = plugins.map((p) => `<span class="tmuxcfg-chip">${esc(p)}</span>`).join('');
    const tpmNote = tpmEnabled ? '<span class="tmuxcfg-chip tmuxcfg-chip-green" style="font-size:11px;padding:2px 8px;border-radius:8px">TPM active</span>' : '';
    parts.push(`<div class="tmuxcfg-sec"><h3>TPM Plugins (${plugins.length})</h3><div class="tmuxcfg-chips">${tpmNote}${pluginChips}</div></div>`);
  }

  const subParts = [];
  if (prefixKey) subParts.push(`prefix ${prefixKey}`);
  if (bindCount) subParts.push(`${bindCount} keybinding${bindCount !== 1 ? 's' : ''}`);
  if (plugins.length) subParts.push(`${plugins.length} TPM plugin${plugins.length !== 1 ? 's' : ''}`);
  const sub = subParts.join(' · ') || 'tmux configuration';

  const host = document.createElement('div');
  host.className = 'tmuxcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="tmuxcfg-title"><span class="tmuxcfg-badge">tmux</span>${esc(filename)}</div>
<div class="tmuxcfg-sub">${esc(sub)}</div>
${parts.join('')}`;

  return { parentNode: host };
}
