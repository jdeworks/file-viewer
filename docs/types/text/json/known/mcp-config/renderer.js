const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mcp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.mcp-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.mcp-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.mcp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.mcp-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:12px 16px;margin-bottom:10px;}
.mcp-card-hd{display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;}
.mcp-server-name{font-family:ui-monospace,monospace;font-size:14px;font-weight:700;}
.mcp-chip{display:inline-block;font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;}
.mcp-chip-stdio{background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;}
.mcp-chip-http{background:#dbeafe;color:#1e3a8a;border:1px solid #93c5fd;}
.mcp-chip-sse{background:#fef3c7;color:#92400e;border:1px solid #fcd34d;}
.mcp-cmd{font-family:ui-monospace,monospace;font-size:12px;background:var(--bg,#fff);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:6px 10px;margin-bottom:10px;word-break:break-all;color:var(--fg,#24292f);}
.mcp-url{font-family:ui-monospace,monospace;font-size:12px;background:var(--bg,#fff);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:6px 10px;margin-bottom:10px;word-break:break-all;color:#0969da;}
.mcp-env-table{width:100%;border-collapse:collapse;font-size:12px;margin-top:4px;}
.mcp-env-table td{padding:3px 8px 3px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:middle;font-family:ui-monospace,monospace;}
.mcp-env-table td:first-child{color:var(--fg-2,#888);width:45%;}
.mcp-env-table tr:last-child td{border-bottom:none;}
.mcp-env-label{font-size:11px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;}
.mcp-redacted{color:var(--fg-2,#888);font-style:italic;}
.mcp-reveal-btn{font-size:10px;padding:1px 7px;border-radius:3px;border:1px solid var(--border,#d0d7de);background:var(--bg,#fff);color:var(--fg,#24292f);cursor:pointer;margin-left:6px;font-family:system-ui,sans-serif;}
.mcp-reveal-btn:hover{background:var(--bg-2,#f6f8fa);}
`;

export function render(intake) {
  const cfg = intake.parsed || {};
  const servers = cfg.mcpServers && typeof cfg.mcpServers === 'object' ? cfg.mcpServers : {};
  const serverNames = Object.keys(servers);

  const host = document.createElement('div');
  host.className = 'mcp-doc';
  host.innerHTML = `<style>${CSS}</style>`;

  const titleEl = document.createElement('div');
  titleEl.className = 'mcp-title';
  titleEl.innerHTML = `<span class="mcp-badge">MCP</span>MCP Config`;
  host.appendChild(titleEl);

  const subEl = document.createElement('div');
  subEl.className = 'mcp-sub';
  subEl.textContent = `${serverNames.length} MCP server${serverNames.length !== 1 ? 's' : ''} configured`;
  host.appendChild(subEl);

  if (!serverNames.length) {
    const empty = document.createElement('p');
    empty.style.cssText = 'color:var(--fg-2,#888);font-size:13px;';
    empty.textContent = 'No mcpServers entries found.';
    host.appendChild(empty);
    return { parentNode: host };
  }

  for (const name of serverNames) {
    const srv = servers[name] || {};
    const card = document.createElement('div');
    card.className = 'mcp-card';

    // Determine transport
    let transport = 'stdio';
    if (!srv.command && srv.url) {
      transport = (srv.type === 'http') ? 'http' : 'sse';
    }

    const chipClass = transport === 'stdio' ? 'mcp-chip-stdio' : transport === 'http' ? 'mcp-chip-http' : 'mcp-chip-sse';

    const hd = document.createElement('div');
    hd.className = 'mcp-card-hd';
    hd.innerHTML = `<span class="mcp-server-name">${esc(name)}</span><span class="mcp-chip ${chipClass}">${esc(transport)}</span>`;
    card.appendChild(hd);

    // Command or URL
    if (transport === 'stdio' && srv.command) {
      const parts = [srv.command, ...(Array.isArray(srv.args) ? srv.args : [])];
      const cmdEl = document.createElement('div');
      cmdEl.className = 'mcp-cmd';
      cmdEl.textContent = parts.join(' ');
      card.appendChild(cmdEl);
    } else if (srv.url) {
      const urlEl = document.createElement('div');
      urlEl.className = 'mcp-url';
      urlEl.textContent = srv.url;
      card.appendChild(urlEl);
    }

    // Env vars
    const env = srv.env && typeof srv.env === 'object' ? srv.env : {};
    const envKeys = Object.keys(env);
    if (envKeys.length) {
      const envLabel = document.createElement('div');
      envLabel.className = 'mcp-env-label';
      envLabel.textContent = `Environment (${envKeys.length})`;
      card.appendChild(envLabel);

      const table = document.createElement('table');
      table.className = 'mcp-env-table';
      const tbody = document.createElement('tbody');
      table.appendChild(tbody);

      for (const key of envKeys) {
        const rawVal = String(env[key] == null ? '' : env[key]);
        const tr = document.createElement('tr');

        const tdKey = document.createElement('td');
        tdKey.textContent = key;
        tr.appendChild(tdKey);

        const tdVal = document.createElement('td');
        const redacted = document.createElement('span');
        redacted.className = 'mcp-redacted';
        redacted.textContent = '[configured]';

        const revealBtn = document.createElement('button');
        revealBtn.className = 'mcp-reveal-btn';
        revealBtn.textContent = 'show';

        let revealed = false;
        revealBtn.addEventListener('click', () => {
          revealed = !revealed;
          if (revealed) {
            redacted.textContent = rawVal;
            redacted.classList.remove('mcp-redacted');
            revealBtn.textContent = 'hide';
          } else {
            redacted.textContent = '[configured]';
            redacted.classList.add('mcp-redacted');
            revealBtn.textContent = 'show';
          }
        });

        tdVal.appendChild(redacted);
        tdVal.appendChild(revealBtn);
        tr.appendChild(tdVal);
        tbody.appendChild(tr);
      }

      card.appendChild(table);
    }

    host.appendChild(card);
  }

  return { parentNode: host };
}
