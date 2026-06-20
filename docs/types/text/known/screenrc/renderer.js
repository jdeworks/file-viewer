const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.screenrc-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.screenrc-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4CAF50;color:#fff;vertical-align:middle;margin-right:8px}
.screenrc-title{font-size:18px;font-weight:700;margin:0 0 4px}
.screenrc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.screenrc-sec{margin:14px 0}
.screenrc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.screenrc-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.screenrc-chip{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.screenrc-chip-key{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8;font-family:ui-monospace,monospace}
.screenrc-table{width:100%;border-collapse:collapse;font-size:13px}
.screenrc-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.screenrc-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.screenrc-key{font:13px/1.4 ui-monospace,monospace;font-weight:600}
.screenrc-val{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#666)}
.screenrc-trunc{display:inline-block;max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom;font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#666)}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const filename = (intake.name || intake.filename || '').split('/').pop() || '.screenrc';
  const lines = text.split('\n');

  let escapeKey = null;
  let startupMessage = null;
  let defScrollback = null;
  let vbell = null;
  let shell = null;
  let hardstatus = null;
  let caption = null;
  let bindCount = 0;
  const startupWindows = [];
  let termcapinfoCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // escape key
    const escMatch = /^escape\s+(\S+)/.exec(trimmed);
    if (escMatch) { escapeKey = escMatch[1]; continue; }

    // startup_message
    const smMatch = /^startup_message\s+(on|off)/.exec(trimmed);
    if (smMatch) { startupMessage = smMatch[1]; continue; }

    // defscrollback
    const sbMatch = /^defscrollback\s+(\d+)/.exec(trimmed);
    if (sbMatch) { defScrollback = sbMatch[1]; continue; }

    // vbell
    const vbMatch = /^vbell\s+(on|off)/.exec(trimmed);
    if (vbMatch) { vbell = vbMatch[1]; continue; }

    // shell
    const shellMatch = /^shell\s+(\S+)/.exec(trimmed);
    if (shellMatch) { shell = shellMatch[1]; continue; }

    // hardstatus
    if (/^hardstatus\s+/.test(trimmed)) {
      const hsMatch = /^hardstatus\s+alwayslastline\s*$/.exec(trimmed);
      if (!hsMatch) {
        const hsValMatch = /^hardstatus\s+(?:alwayslastline\s+)?(.+)$/.exec(trimmed);
        if (hsValMatch && !hardstatus) { hardstatus = hsValMatch[1].replace(/^['"]|['"]$/g, ''); }
      }
      continue;
    }
    if (/^hardstatus\s+string/.test(trimmed)) {
      const hsStrMatch = /^hardstatus\s+string\s+'([^']*)'/.exec(trimmed) ||
                         /^hardstatus\s+string\s+"([^"]*)"/.exec(trimmed) ||
                         /^hardstatus\s+string\s+(.+)$/.exec(trimmed);
      if (hsStrMatch) { hardstatus = hsStrMatch[1]; }
      continue;
    }

    // caption
    if (/^caption\s+/.test(trimmed)) {
      const capMatch = /^caption\s+(?:always|string)\s+"([^"]*)"/.exec(trimmed) ||
                       /^caption\s+(?:always|string)\s+'([^']*)'/.exec(trimmed) ||
                       /^caption\s+(?:always|string)\s+(.+)$/.exec(trimmed);
      if (capMatch && !caption) { caption = capMatch[1]; }
      continue;
    }

    // termcapinfo
    if (/^termcapinfo\s+/.test(trimmed)) { termcapinfoCount++; continue; }

    // bind
    if (/^bind\s+/.test(trimmed)) { bindCount++; continue; }

    // screen N COMMAND (startup windows)
    const screenMatch = /^screen\s+(?:-t\s+"?([^"]+)"?\s+)?(\d+)\s+(.+)$/.exec(trimmed);
    if (screenMatch) {
      const title = screenMatch[1] || null;
      const num = screenMatch[2];
      const cmd = screenMatch[3].trim();
      startupWindows.push({ num, title, cmd });
      continue;
    }
  }

  // Build sections
  const parts = [];

  // Escape key chip
  if (escapeKey) {
    parts.push(`<div class="screenrc-sec"><h3>Escape Key</h3><div class="screenrc-chips"><span class="screenrc-chip screenrc-chip-key">${esc(escapeKey)}</span></div></div>`);
  }

  // Settings card
  const settingRows = [];
  if (defScrollback) settingRows.push(`<tr><td class="screenrc-key">Scrollback</td><td><span class="screenrc-val">${Number(defScrollback).toLocaleString()} lines</span></td></tr>`);
  if (startupMessage) settingRows.push(`<tr><td class="screenrc-key">Startup message</td><td><span class="screenrc-val">${esc(startupMessage)}</span></td></tr>`);
  if (vbell) settingRows.push(`<tr><td class="screenrc-key">Visual bell</td><td><span class="screenrc-val">${esc(vbell)}</span></td></tr>`);
  if (shell) settingRows.push(`<tr><td class="screenrc-key">Shell</td><td><span class="screenrc-val">${esc(shell)}</span></td></tr>`);
  if (termcapinfoCount) settingRows.push(`<tr><td class="screenrc-key">termcapinfo</td><td><span class="screenrc-val">${termcapinfoCount} entr${termcapinfoCount !== 1 ? 'ies' : 'y'}</span></td></tr>`);

  if (settingRows.length) {
    parts.push(`<div class="screenrc-sec"><h3>Settings</h3><table class="screenrc-table"><tbody>${settingRows.join('')}</tbody></table></div>`);
  }

  // Status/caption bar
  const barRows = [];
  if (hardstatus) barRows.push(`<tr><td class="screenrc-key">hardstatus</td><td><span class="screenrc-trunc" title="${esc(hardstatus)}">${esc(hardstatus)}</span></td></tr>`);
  if (caption) barRows.push(`<tr><td class="screenrc-key">caption</td><td><span class="screenrc-trunc" title="${esc(caption)}">${esc(caption)}</span></td></tr>`);
  if (barRows.length) {
    parts.push(`<div class="screenrc-sec"><h3>Status &amp; Caption</h3><table class="screenrc-table"><tbody>${barRows.join('')}</tbody></table></div>`);
  }

  // Keybindings count
  if (bindCount > 0) {
    parts.push(`<div class="screenrc-sec"><h3>Keybindings</h3><div class="screenrc-chips"><span class="screenrc-chip">${bindCount} binding${bindCount !== 1 ? 's' : ''} defined</span></div></div>`);
  }

  // Startup windows
  if (startupWindows.length) {
    const winChips = startupWindows.map((w) => `<span class="screenrc-chip">${esc(w.num)}${w.title ? `: ${esc(w.title)}` : ''} — ${esc(w.cmd)}</span>`).join('');
    parts.push(`<div class="screenrc-sec"><h3>Startup Windows (${startupWindows.length})</h3><div class="screenrc-chips">${winChips}</div></div>`);
  }

  const subParts = [];
  if (escapeKey) subParts.push(`escape ${escapeKey}`);
  if (defScrollback) subParts.push(`scrollback ${Number(defScrollback).toLocaleString()}`);
  if (bindCount) subParts.push(`${bindCount} keybinding${bindCount !== 1 ? 's' : ''}`);
  if (startupWindows.length) subParts.push(`${startupWindows.length} startup window${startupWindows.length !== 1 ? 's' : ''}`);
  const sub = subParts.join(' · ') || 'GNU Screen configuration';

  const host = document.createElement('div');
  host.className = 'screenrc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="screenrc-title"><span class="screenrc-badge">GNU Screen</span>${esc(filename)}</div>
<div class="screenrc-sub">${esc(sub)}</div>
${parts.join('')}`;

  return { parentNode: host };
}
