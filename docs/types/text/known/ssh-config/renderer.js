const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sshcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sshcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#6e7781;color:#fff;vertical-align:middle;margin-right:8px;}
.sshcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sshcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.sshcfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:12px 16px;margin-bottom:10px;}
.sshcfg-card-hd{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.sshcfg-host-name{font-family:ui-monospace,monospace;font-size:14px;font-weight:700;}
.sshcfg-tag{display:inline-block;font-size:10px;padding:1px 6px;border-radius:8px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;}
.sshcfg-tag-wildcard{background:#fff3cd;color:#856404;border:1px solid #ffc107;}
.sshcfg-tag-specific{background:#d1ecf1;color:#0c5460;border:1px solid #bee5eb;}
.sshcfg-table{width:100%;border-collapse:collapse;font-size:12px;}
.sshcfg-table td{padding:3px 8px 3px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;}
.sshcfg-table td:first-child{color:var(--fg-2,#888);width:40%;white-space:nowrap;}
.sshcfg-table tr:last-child td{border-bottom:none;}
.sshcfg-proxyjump{color:#0969da;}
.sshcfg-note{font-size:11px;color:var(--fg-2,#888);font-style:italic;font-family:system-ui,sans-serif;}
`;

function parseSshConfig(text) {
  const blocks = [];
  let current = null;

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(\S+)\s+(.*)/);
    if (!m) continue;
    const [, key, value] = m;
    const keyLower = key.toLowerCase();

    if (keyLower === 'host') {
      current = { host: value.trim(), options: [] };
      blocks.push(current);
    } else if (current) {
      current.options.push([key, value.trim()]);
    }
  }

  return blocks;
}

const SHOWN_KEYS = new Set(['hostname', 'user', 'port', 'identityfile', 'proxyjump', 'forwardagent', 'serveraliveinterval', 'serveralivecountmax', 'addkeystoagent', 'stricthostkeychecking']);

export function render(intake) {
  const blocks = parseSshConfig(intake.text || '');

  const specificHosts = blocks.filter((b) => !b.host.includes('*'));
  const wildcardHosts = blocks.filter((b) => b.host.includes('*'));

  function renderCard(b) {
    const isWild = b.host.includes('*');
    const tag = isWild
      ? '<span class="sshcfg-tag sshcfg-tag-wildcard">wildcard</span>'
      : '<span class="sshcfg-tag sshcfg-tag-specific">specific</span>';

    const shownOpts = b.options.filter(([k]) => SHOWN_KEYS.has(k.toLowerCase()));
    const rows = shownOpts.map(([k, v]) => {
      const keyLower = k.toLowerCase();
      let valHtml = esc(v);
      if (keyLower === 'proxyjump') valHtml = `<span class="sshcfg-proxyjump">${esc(v)}</span>`;
      if (keyLower === 'identityfile') valHtml = `${esc(v)} <span class="sshcfg-note">(path only — key content not shown)</span>`;
      return `<tr><td>${esc(k)}</td><td>${valHtml}</td></tr>`;
    }).join('');

    return `<div class="sshcfg-card">
  <div class="sshcfg-card-hd">
    <span class="sshcfg-host-name">Host ${esc(b.host)}</span>${tag}
  </div>
  ${rows ? `<table class="sshcfg-table"><tbody>${rows}</tbody></table>` : '<p style="margin:0;font-size:12px;color:var(--fg-2,#888);">No recognized options.</p>'}
</div>`;
  }

  const specificSection = specificHosts.length ? `
<div style="font-size:13px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;margin:0 0 8px;">Specific hosts (${specificHosts.length})</div>
${specificHosts.map(renderCard).join('')}` : '';

  const wildcardSection = wildcardHosts.length ? `
<div style="font-size:13px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;margin:16px 0 8px;">Wildcard / fallback hosts (${wildcardHosts.length})</div>
${wildcardHosts.map(renderCard).join('')}` : '';

  const host = document.createElement('div');
  host.className = 'sshcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="sshcfg-title"><span class="sshcfg-badge">SSH Config</span>SSH Client Config</div>
<div class="sshcfg-sub">${blocks.length} host block${blocks.length !== 1 ? 's' : ''} · ${specificHosts.length} specific · ${wildcardHosts.length} wildcard</div>
${specificSection}${wildcardSection}
${!blocks.length ? '<p style="color:var(--fg-2,#888);font-size:13px;">No Host blocks found.</p>' : ''}`;
  return { parentNode: host };
}
