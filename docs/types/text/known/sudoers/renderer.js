const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sudoers-doc{padding:16px 18px;max-width:960px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sudoers-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#B91C1C;color:#fff;vertical-align:middle;margin-right:8px;}
.sudoers-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sudoers-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.sudoers-section-hd{font-size:13px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;margin:16px 0 6px;}
.sudoers-defaults{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:12px;}
.sudoers-defaults-row{font-family:ui-monospace,monospace;font-size:12px;padding:2px 0;}
.sudoers-alias-block{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.sudoers-alias-name{font-family:ui-monospace,monospace;font-size:13px;font-weight:700;margin-bottom:4px;}
.sudoers-alias-members{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);}
.sudoers-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:4px;}
.sudoers-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:6px 10px 6px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.sudoers-table td{padding:6px 10px 6px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:middle;font-family:ui-monospace,monospace;font-size:12px;}
.sudoers-principal{font-weight:700;}
.sudoers-group{color:#6e40c9;}
.sudoers-chip{display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:700;background:#FEE2E2;color:#991B1B;border:1px solid #FECACA;}
.sudoers-note{margin-top:16px;padding:10px 14px;background:#FEF2F2;border:1px solid #FECACA;border-radius:6px;font-size:12px;color:#991B1B;}
`;

function parseSudoers(text) {
  const defaults = [];
  const userAliases = [];
  const cmndAliases = [];
  const hostAliases = [];
  const rules = [];

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // Alias lines
    const userAlias = line.match(/^User_Alias\s+(\w+)\s*=\s*(.+)/);
    if (userAlias) { userAliases.push({ name: userAlias[1], members: userAlias[2].trim() }); continue; }

    const cmndAlias = line.match(/^Cmnd_Alias\s+(\w+)\s*=\s*(.+)/);
    if (cmndAlias) { cmndAliases.push({ name: cmndAlias[1], members: cmndAlias[2].trim() }); continue; }

    const hostAlias = line.match(/^Host_Alias\s+(\w+)\s*=\s*(.+)/);
    if (hostAlias) { hostAliases.push({ name: hostAlias[1], members: hostAlias[2].trim() }); continue; }

    // Defaults lines
    if (line.startsWith('Defaults')) {
      defaults.push(line);
      continue;
    }

    // User/group privilege rules: principal HOST=(RUNAS) [NOPASSWD:] commands
    // e.g.  root ALL=(ALL:ALL) ALL
    //       %sudo ALL=(ALL:ALL) ALL
    //       deploy ALL=(root) NOPASSWD: /usr/bin/docker
    const ruleMatch = line.match(/^(%?\S+)\s+(\S+)\s*=\s*\(([^)]*)\)\s*(NOPASSWD:\s*)?(.+)/);
    if (ruleMatch) {
      const who = ruleMatch[1];
      const runas = ruleMatch[3].trim();
      const nopasswd = !!(ruleMatch[4] && ruleMatch[4].includes('NOPASSWD'));
      const cmds = ruleMatch[5].trim();
      rules.push({ who, runas, nopasswd, cmds });
    }
  }

  return { defaults, userAliases, cmndAliases, hostAliases, rules };
}

export function render(intake) {
  const { defaults, userAliases, cmndAliases, hostAliases, rules } = parseSudoers(intake.text || '');

  const allAliases = [
    ...userAliases.map(a => ({ kind: 'User', ...a })),
    ...cmndAliases.map(a => ({ kind: 'Cmnd', ...a })),
    ...hostAliases.map(a => ({ kind: 'Host', ...a })),
  ];

  const defaultsHtml = defaults.length ? `
<div class="sudoers-section-hd">Defaults (${defaults.length})</div>
<div class="sudoers-defaults">
  ${defaults.map(d => `<div class="sudoers-defaults-row">${esc(d)}</div>`).join('')}
</div>` : '';

  const aliasesHtml = allAliases.length ? `
<div class="sudoers-section-hd">Aliases (${allAliases.length})</div>
${allAliases.map(a => `<div class="sudoers-alias-block">
  <div class="sudoers-alias-name">${esc(a.kind)}_Alias ${esc(a.name)}</div>
  <div class="sudoers-alias-members">${esc(a.members)}</div>
</div>`).join('')}` : '';

  const tableRows = rules.map(r => {
    const isGroup = r.who.startsWith('%');
    const principalClass = isGroup ? 'sudoers-principal sudoers-group' : 'sudoers-principal';
    const nopasswdChip = r.nopasswd ? ' <span class="sudoers-chip">NOPASSWD</span>' : '';
    return `<tr>
  <td><span class="${esc(principalClass)}">${esc(r.who)}</span></td>
  <td>${esc(r.runas)}</td>
  <td>${nopasswdChip}</td>
  <td>${esc(r.cmds)}</td>
</tr>`;
  }).join('');

  const rulesHtml = rules.length ? `
<div class="sudoers-section-hd">Access Rules (${rules.length})</div>
<table class="sudoers-table">
  <thead><tr>
    <th>Principal</th>
    <th>Run-As</th>
    <th>Flags</th>
    <th>Command(s)</th>
  </tr></thead>
  <tbody>${tableRows}</tbody>
</table>` : '';

  const host = document.createElement('div');
  host.className = 'sudoers-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="sudoers-title"><span class="sudoers-badge">sudoers</span>sudoers</div>
<div class="sudoers-sub">${rules.length} access rule${rules.length !== 1 ? 's' : ''} · ${allAliases.length} alias${allAliases.length !== 1 ? 'es' : ''} · ${defaults.length} default${defaults.length !== 1 ? 's' : ''}</div>
${defaultsHtml}
${aliasesHtml}
${rulesHtml}
<div class="sudoers-note">Review carefully — misconfigured sudoers can grant full root access</div>`;
  return { parentNode: host };
}
