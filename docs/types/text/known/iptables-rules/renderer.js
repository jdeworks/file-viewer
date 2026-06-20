const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.iptr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.iptr-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#FF6600;color:#fff;vertical-align:middle;margin-right:8px;}
.iptr-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.iptr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.iptr-section{margin-bottom:18px;}
.iptr-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.iptr-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.iptr-chain-hd{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
.iptr-chain-name{font-family:ui-monospace,monospace;font-size:14px;font-weight:700;}
.iptr-policy{font-size:11px;padding:1px 7px;border-radius:8px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;}
.iptr-policy-accept{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}
.iptr-policy-drop{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;}
.iptr-policy-reject{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;}
.iptr-policy-other{background:#e2e3e5;color:#383d41;border:1px solid #d6d8db;}
.iptr-rule-count{font-size:12px;color:var(--fg-2,#888);}
.iptr-stats{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:6px;}
.iptr-stat{font-size:12px;}
.iptr-stat-label{color:var(--fg-2,#888);}
.iptr-stat-val{font-weight:700;font-family:ui-monospace,monospace;}
.iptr-ports{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;}
.iptr-port{font-size:11px;padding:2px 8px;border-radius:8px;background:#e8f4f8;border:1px solid #bee3f8;color:#1a5276;font-family:ui-monospace,monospace;}
.iptr-table-label{font-size:11px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;color:#FF6600;margin:0 0 6px;}
`;

function parseIptables(text) {
  const tables = [];
  let currentTable = null;
  let chainPolicies = {};

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // Table header: *filter, *nat, *mangle, *raw, *security
    if (line.startsWith('*')) {
      const name = line.slice(1).trim();
      currentTable = { name, chains: {}, rules: [] };
      tables.push(currentTable);
      chainPolicies = {};
      continue;
    }

    if (!currentTable) continue;

    // Chain policy line: :INPUT DROP [0:0]
    if (line.startsWith(':')) {
      const parts = line.slice(1).split(/\s+/);
      const chainName = parts[0];
      const policy = parts[1] || 'ACCEPT';
      if (!currentTable.chains[chainName]) {
        currentTable.chains[chainName] = { policy, rules: [] };
      } else {
        currentTable.chains[chainName].policy = policy;
      }
      continue;
    }

    // Rule: -A chain ...
    if (line.startsWith('-A ')) {
      const rest = line.slice(3).trim();
      const spaceIdx = rest.indexOf(' ');
      const chainName = spaceIdx === -1 ? rest : rest.slice(0, spaceIdx);
      const ruleText = spaceIdx === -1 ? '' : rest.slice(spaceIdx + 1);

      if (!currentTable.chains[chainName]) {
        currentTable.chains[chainName] = { policy: '-', rules: [] };
      }
      currentTable.chains[chainName].rules.push(ruleText);

      // Extract target
      const targetMatch = ruleText.match(/-j\s+(\S+)/);
      const target = targetMatch ? targetMatch[1] : '';

      // Extract port for ACCEPT rules
      const dportMatch = ruleText.match(/--dport\s+(\S+)/);
      const port = dportMatch ? dportMatch[1] : null;

      currentTable.rules.push({ chain: chainName, text: ruleText, target, port });
      continue;
    }

    // COMMIT ends the table
    if (line === 'COMMIT') {
      continue;
    }
  }

  return tables;
}

function policyClass(policy) {
  const p = (policy || '').toUpperCase();
  if (p === 'ACCEPT') return 'iptr-policy-accept';
  if (p === 'DROP') return 'iptr-policy-drop';
  if (p === 'REJECT') return 'iptr-policy-reject';
  return 'iptr-policy-other';
}

export function render(intake) {
  const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
  const tables = parseIptables(text);

  // Overall stats
  let totalRules = 0;
  let acceptCount = 0;
  let dropCount = 0;
  const allowedPorts = new Set();

  for (const table of tables) {
    for (const rule of table.rules) {
      totalRules++;
      if (rule.target === 'ACCEPT') {
        acceptCount++;
        if (rule.port) allowedPorts.add(rule.port);
      } else if (rule.target === 'DROP' || rule.target === 'REJECT') {
        dropCount++;
      }
    }
  }

  const portsHtml = allowedPorts.size
    ? `<div class="iptr-section">
        <h3>Allowed ports (--dport … -j ACCEPT)</h3>
        <div class="iptr-ports">${[...allowedPorts].map((p) => `<span class="iptr-port">${esc(p)}</span>`).join('')}</div>
      </div>`
    : '';

  const tablesHtml = tables.map((table) => {
    const chains = Object.entries(table.chains);
    const chainCards = chains.map(([name, chain]) => {
      const pc = policyClass(chain.policy);
      const ruleCount = chain.rules.length;
      return `<div class="iptr-card">
  <div class="iptr-chain-hd">
    <span class="iptr-chain-name">${esc(name)}</span>
    <span class="iptr-policy ${pc}">${esc(chain.policy)}</span>
    <span class="iptr-rule-count">${ruleCount} rule${ruleCount !== 1 ? 's' : ''}</span>
  </div>
</div>`;
    }).join('');

    return `<div class="iptr-section">
  <div class="iptr-table-label">*${esc(table.name)}</div>
  ${chainCards}
</div>`;
  }).join('');

  const noTables = !tables.length
    ? '<div style="color:var(--fg-2,#888);font-size:13px">No iptables table blocks found.</div>'
    : '';

  const statsHtml = `<div class="iptr-stats">
  <span class="iptr-stat"><span class="iptr-stat-label">Total rules: </span><span class="iptr-stat-val">${totalRules}</span></span>
  <span class="iptr-stat"><span class="iptr-stat-label">ACCEPT: </span><span class="iptr-stat-val" style="color:#155724">${acceptCount}</span></span>
  <span class="iptr-stat"><span class="iptr-stat-label">DROP/REJECT: </span><span class="iptr-stat-val" style="color:#721c24">${dropCount}</span></span>
</div>`;

  const sub = `${tables.length} table${tables.length !== 1 ? 's' : ''} · ${totalRules} rule${totalRules !== 1 ? 's' : ''}`;

  const host = document.createElement('div');
  host.className = 'iptr-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="iptr-title"><span class="iptr-badge">iptables</span>Firewall Rules</div>
<div class="iptr-sub">${esc(sub)}</div>
${statsHtml}
${portsHtml}
<div class="iptr-section"><h3>Tables &amp; Chains</h3>${tablesHtml}${noTables}</div>`;
  return { parentNode: host };
}
