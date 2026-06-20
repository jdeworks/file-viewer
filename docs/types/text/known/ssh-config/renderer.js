const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ssh-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ssh-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a7f37;color:#fff;vertical-align:middle;margin-right:8px;}
.ssh-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ssh-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.ssh-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:12px 16px;margin-bottom:10px;}
.ssh-card-hd{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.ssh-host-name{font-family:ui-monospace,monospace;font-size:14px;font-weight:700;}
.ssh-tag{display:inline-block;font-size:10px;padding:1px 6px;border-radius:8px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;}
.ssh-tag-wildcard{background:#fff3cd;color:#856404;border:1px solid #ffc107;}
.ssh-tag-specific{background:#d1ecf1;color:#0c5460;border:1px solid #bee5eb;}
.ssh-table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px;}
.ssh-table td{padding:3px 8px 3px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;}
.ssh-table td:first-child{color:var(--fg-2,#888);width:40%;white-space:nowrap;}
.ssh-table tr:last-child td{border-bottom:none;}
.ssh-proxyjump{color:#0969da;}
.ssh-note{font-size:11px;color:var(--fg-2,#888);font-style:italic;font-family:system-ui,sans-serif;}
.ssh-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;}
.ssh-copy-btn{font-size:11px;padding:3px 9px;border-radius:4px;border:1px solid var(--border,#d0d7de);background:var(--bg,#fff);color:var(--fg,#24292f);cursor:pointer;font-family:ui-monospace,monospace;transition:background .1s;}
.ssh-copy-btn:hover{background:var(--bg-2,#f6f8fa);}
.ssh-copy-btn.copied{background:#1a7f37;color:#fff;border-color:#1a7f37;}
.ssh-section-label{font-size:13px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;margin:0 0 8px;}
.ssh-more{font-size:12px;color:var(--fg-2,#888);font-style:italic;padding:4px 0;}
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

function buildSshCmd(opts) {
  const optMap = {};
  for (const [k, v] of opts) optMap[k.toLowerCase()] = v;
  const user = optMap['user'] || '';
  const hostname = optMap['hostname'] || '';
  const port = optMap['port'] || '22';
  const identity = optMap['identityfile'] || '';

  if (!hostname) return null;

  let cmd = 'ssh';
  if (port && port !== '22') cmd += ` -p ${port}`;
  if (identity) cmd += ` -i ${identity}`;
  cmd += user ? ` ${user}@${hostname}` : ` ${hostname}`;
  return cmd;
}

function buildSftpCmd(opts) {
  const optMap = {};
  for (const [k, v] of opts) optMap[k.toLowerCase()] = v;
  const user = optMap['user'] || '';
  const hostname = optMap['hostname'] || '';
  const port = optMap['port'] || '22';
  const identity = optMap['identityfile'] || '';

  if (!hostname) return null;

  let cmd = 'sftp';
  if (port && port !== '22') cmd += ` -P ${port}`;
  if (identity) cmd += ` -i ${identity}`;
  cmd += user ? ` ${user}@${hostname}` : ` ${hostname}`;
  return cmd;
}

export function render(intake) {
  const blocks = parseSshConfig(intake.text || '');

  const specificHosts = blocks.filter((b) => !b.host.includes('*'));
  const wildcardHosts = blocks.filter((b) => b.host.includes('*'));

  const host = document.createElement('div');
  host.className = 'ssh-doc';
  host.innerHTML = `<style>${CSS}</style>`;

  // Title
  const titleEl = document.createElement('div');
  titleEl.className = 'ssh-title';
  titleEl.innerHTML = `<span class="ssh-badge">SSH Config</span>SSH Client Config`;
  host.appendChild(titleEl);

  const subEl = document.createElement('div');
  subEl.className = 'ssh-sub';
  subEl.textContent = `${blocks.length} host block${blocks.length !== 1 ? 's' : ''} · ${specificHosts.length} specific · ${wildcardHosts.length} wildcard`;
  host.appendChild(subEl);

  function renderCard(b) {
    const isWild = b.host.includes('*');
    const card = document.createElement('div');
    card.className = 'ssh-card';

    const tag = isWild
      ? '<span class="ssh-tag ssh-tag-wildcard">wildcard</span>'
      : '<span class="ssh-tag ssh-tag-specific">specific</span>';

    const shownOpts = b.options.filter(([k]) => SHOWN_KEYS.has(k.toLowerCase()));
    const rows = shownOpts.map(([k, v]) => {
      const keyLower = k.toLowerCase();
      let valHtml = esc(v);
      if (keyLower === 'proxyjump') valHtml = `<span class="ssh-proxyjump">${esc(v)}</span>`;
      if (keyLower === 'identityfile') valHtml = `${esc(v)} <span class="ssh-note">(key path)</span>`;
      return `<tr><td>${esc(k)}</td><td>${valHtml}</td></tr>`;
    }).join('');

    card.innerHTML = `<div class="ssh-card-hd"><span class="ssh-host-name">Host ${esc(b.host)}</span>${tag}</div>
${rows ? `<table class="ssh-table"><tbody>${rows}</tbody></table>` : '<p style="margin:0 0 8px;font-size:12px;color:var(--fg-2,#888);">No recognized options.</p>'}
<div class="ssh-actions"></div>`;

    const actionsEl = card.querySelector('.ssh-actions');

    if (!isWild) {
      const sshCmd = buildSshCmd(b.options);
      const sftpCmd = buildSftpCmd(b.options);

      if (sshCmd) {
        const btn = document.createElement('button');
        btn.className = 'ssh-copy-btn';
        btn.textContent = 'ssh';
        btn.title = sshCmd;
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(sshCmd).then(() => {
            btn.classList.add('copied');
            btn.textContent = 'copied!';
            setTimeout(() => { btn.classList.remove('copied'); btn.textContent = 'ssh'; }, 1500);
          });
        });
        actionsEl.appendChild(btn);
      }

      if (sftpCmd) {
        const btn = document.createElement('button');
        btn.className = 'ssh-copy-btn';
        btn.textContent = 'sftp';
        btn.title = sftpCmd;
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(sftpCmd).then(() => {
            btn.classList.add('copied');
            btn.textContent = 'copied!';
            setTimeout(() => { btn.classList.remove('copied'); btn.textContent = 'sftp'; }, 1500);
          });
        });
        actionsEl.appendChild(btn);
      }
    }

    return card;
  }

  if (specificHosts.length) {
    const label = document.createElement('div');
    label.className = 'ssh-section-label';
    label.textContent = `Specific hosts (${specificHosts.length})`;
    host.appendChild(label);

    const shown = specificHosts.slice(0, 8);
    shown.forEach((b) => host.appendChild(renderCard(b)));
    if (specificHosts.length > 8) {
      const more = document.createElement('div');
      more.className = 'ssh-more';
      more.textContent = `…and ${specificHosts.length - 8} more`;
      host.appendChild(more);
    }
  }

  if (wildcardHosts.length) {
    const label = document.createElement('div');
    label.className = 'ssh-section-label';
    label.style.marginTop = '16px';
    label.textContent = `Wildcard / fallback hosts (${wildcardHosts.length})`;
    host.appendChild(label);
    wildcardHosts.forEach((b) => host.appendChild(renderCard(b)));
  }

  if (!blocks.length) {
    const empty = document.createElement('p');
    empty.style.cssText = 'color:var(--fg-2,#888);font-size:13px;';
    empty.textContent = 'No Host blocks found.';
    host.appendChild(empty);
  }

  return { parentNode: host };
}
