const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.modprobecfg-doc{padding:16px 18px;max-width:960px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.modprobecfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1F2937;color:#fff;vertical-align:middle;margin-right:8px;}
.modprobecfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.modprobecfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.modprobecfg-section{margin-bottom:14px;}
.modprobecfg-section-title{font-size:13px;font-weight:700;color:var(--fg-2,#666);text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px;}
.modprobecfg-chips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:4px;}
.modprobecfg-chip-bl{display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;background:#fde8e8;color:#b91c1c;border:1px solid #fca5a5;font-family:ui-monospace,monospace;}
.modprobecfg-chip-warn{display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;font-family:ui-monospace,monospace;}
.modprobecfg-table{width:100%;border-collapse:collapse;font-size:12px;margin-top:4px;}
.modprobecfg-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:6px 10px 4px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.modprobecfg-table td{padding:5px 10px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:middle;font-family:ui-monospace,monospace;}
.modprobecfg-mod{font-weight:600;color:var(--fg,#24292f);}
.modprobecfg-params{color:#0969da;word-break:break-all;}
.modprobecfg-arrow{color:var(--fg-2,#888);font-family:system-ui,sans-serif;}
.modprobecfg-cmd{color:#6e7781;font-size:11px;word-break:break-all;}
`;

function parseModprobe(text) {
  const blacklist = [];
  const options = {};   // module -> [param strings]
  const aliases = [];
  const installs = [];
  const removes = [];

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const parts = line.split(/\s+/);
    const directive = parts[0].toLowerCase();

    if (directive === 'blacklist' && parts[1]) {
      blacklist.push(parts[1]);
    } else if (directive === 'options' && parts[1]) {
      const mod = parts[1];
      const params = parts.slice(2).join(' ');
      if (!options[mod]) options[mod] = [];
      if (params) options[mod].push(params);
    } else if (directive === 'alias' && parts[1] && parts[2]) {
      aliases.push({ pattern: parts[1], module: parts[2] });
    } else if (directive === 'install' && parts[1]) {
      installs.push({ module: parts[1], command: parts.slice(2).join(' ') });
    } else if (directive === 'remove' && parts[1]) {
      removes.push({ module: parts[1], command: parts.slice(2).join(' ') });
    }
  }

  return { blacklist, options, aliases, installs, removes };
}

export function render(intake) {
  const { blacklist, options, aliases, installs, removes } = parseModprobe(intake.text || '');

  const optEntries = Object.entries(options);
  const total = blacklist.length + optEntries.length + aliases.length + installs.length + removes.length;

  // Blacklist chips
  let blacklistHtml = '';
  if (blacklist.length > 0) {
    const chips = blacklist.map(m => `<span class="modprobecfg-chip-bl">${esc(m)}</span>`).join('');
    blacklistHtml = `<div class="modprobecfg-section">
  <div class="modprobecfg-section-title">Blacklisted modules (${blacklist.length})</div>
  <div class="modprobecfg-chips">${chips}</div>
</div>`;
  }

  // Options table
  let optionsHtml = '';
  if (optEntries.length > 0) {
    const rows = optEntries.map(([mod, paramList]) => `<tr>
  <td><span class="modprobecfg-mod">${esc(mod)}</span></td>
  <td><span class="modprobecfg-params">${esc(paramList.join(' '))}</span></td>
</tr>`).join('');
    optionsHtml = `<div class="modprobecfg-section">
  <div class="modprobecfg-section-title">Module options (${optEntries.length})</div>
  <table class="modprobecfg-table">
    <thead><tr><th>Module</th><th>Parameters</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
  }

  // Aliases table
  let aliasesHtml = '';
  if (aliases.length > 0) {
    const rows = aliases.map(({ pattern, module }) => `<tr>
  <td><span class="modprobecfg-mod">${esc(pattern)}</span></td>
  <td><span class="modprobecfg-arrow">→</span></td>
  <td><span class="modprobecfg-mod">${esc(module)}</span></td>
</tr>`).join('');
    aliasesHtml = `<div class="modprobecfg-section">
  <div class="modprobecfg-section-title">Aliases (${aliases.length})</div>
  <table class="modprobecfg-table">
    <thead><tr><th>Pattern</th><th></th><th>Module</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
  }

  // Custom install/remove hooks
  let hooksHtml = '';
  const hooks = [
    ...installs.map(h => ({ type: 'install', ...h })),
    ...removes.map(h => ({ type: 'remove', ...h })),
  ];
  if (hooks.length > 0) {
    const chips = hooks.map(h => `<span class="modprobecfg-chip-warn">${esc(h.type)} ${esc(h.module)}</span>`).join('');
    hooksHtml = `<div class="modprobecfg-section">
  <div class="modprobecfg-section-title">Custom hooks (${hooks.length})</div>
  <div class="modprobecfg-chips">${chips}</div>
</div>`;
  }

  const host = document.createElement('div');
  host.className = 'modprobecfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="modprobecfg-title"><span class="modprobecfg-badge">modprobe</span>modprobe config</div>
<div class="modprobecfg-sub">${total} directive${total !== 1 ? 's' : ''}${blacklist.length ? ` · ${blacklist.length} blacklisted module${blacklist.length !== 1 ? 's' : ''}` : ''}</div>
${blacklistHtml}${optionsHtml}${aliasesHtml}${hooksHtml}`;
  return { parentNode: host };
}
