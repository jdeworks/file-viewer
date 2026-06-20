const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nftcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.nftcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1A1A2E;color:#fff;vertical-align:middle;margin-right:8px;}
.nftcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.nftcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.nftcfg-section{margin-bottom:18px;}
.nftcfg-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.nftcfg-table-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:10px;}
.nftcfg-table-hd{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.nftcfg-table-name{font-family:ui-monospace,monospace;font-size:14px;font-weight:700;}
.nftcfg-family{font-size:11px;padding:1px 7px;border-radius:8px;font-weight:600;letter-spacing:.03em;}
.nftcfg-family-inet{background:#f3e8ff;color:#5b21b6;border:1px solid #ddd6fe;}
.nftcfg-family-ip{background:#dbeafe;color:#1e40af;border:1px solid #bfdbfe;}
.nftcfg-family-ip6{background:#cffafe;color:#155e75;border:1px solid #a5f3fc;}
.nftcfg-family-bridge{background:#ffedd5;color:#9a3412;border:1px solid #fdba74;}
.nftcfg-family-other{background:#f3f4f6;color:#374151;border:1px solid #d1d5db;}
.nftcfg-chain{background:var(--bg,#fff);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:6px 10px;margin-bottom:6px;}
.nftcfg-chain-hd{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.nftcfg-chain-name{font-family:ui-monospace,monospace;font-size:13px;font-weight:700;}
.nftcfg-chain-type{font-size:11px;color:var(--fg-2,#888);}
.nftcfg-chain-hook{font-size:11px;font-family:ui-monospace,monospace;color:#5b21b6;}
.nftcfg-policy{font-size:11px;padding:1px 6px;border-radius:6px;font-weight:600;text-transform:uppercase;}
.nftcfg-policy-accept{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}
.nftcfg-policy-drop{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;}
.nftcfg-rule-count{font-size:11px;color:var(--fg-2,#888);margin-left:auto;}
.nftcfg-rule-samples{margin-top:4px;font-size:11px;font-family:ui-monospace,monospace;color:var(--fg-2,#888);padding-left:4px;border-left:2px solid var(--border,#e0e0e0);}
.nftcfg-stats{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px;}
.nftcfg-stat{font-size:12px;}
.nftcfg-stat-label{color:var(--fg-2,#888);}
.nftcfg-stat-val{font-weight:700;font-family:ui-monospace,monospace;}
.nftcfg-define{font-size:12px;font-family:ui-monospace,monospace;margin-bottom:4px;}
.nftcfg-define-name{color:#1e40af;font-weight:600;}
`;

function familyClass(family) {
  switch (family) {
    case 'inet': return 'nftcfg-family-inet';
    case 'ip': return 'nftcfg-family-ip';
    case 'ip6': return 'nftcfg-family-ip6';
    case 'bridge': return 'nftcfg-family-bridge';
    default: return 'nftcfg-family-other';
  }
}

function policyClass(policy) {
  if (!policy) return '';
  const p = policy.toLowerCase();
  if (p === 'accept') return 'nftcfg-policy-accept';
  if (p === 'drop') return 'nftcfg-policy-drop';
  return '';
}

function parseNftables(text) {
  const tables = [];
  const defines = [];
  const sets = [];
  let i = 0;
  const lines = text.split('\n');

  while (i < lines.length) {
    const line = lines[i].trim();

    // define VAR = VALUE
    const defineMatch = line.match(/^define\s+(\w+)\s*=\s*(.+)$/);
    if (defineMatch) {
      defines.push({ name: defineMatch[1], value: defineMatch[2].trim() });
      i++;
      continue;
    }

    // table [family] name {
    const tableMatch = line.match(/^table\s+(?:(inet|ip6?|arp|bridge|netdev)\s+)?(\w+)\s*\{?/);
    if (tableMatch) {
      const family = tableMatch[1] || 'ip';
      const name = tableMatch[2];
      const table = { family, name, chains: [], sets: [] };
      tables.push(table);

      // Scan table body with brace counting
      let depth = line.includes('{') ? 1 : 0;
      i++;
      while (i < lines.length && depth > 0) {
        const tl = lines[i].trim();
        for (const ch of tl) {
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
        }
        if (depth <= 0) { i++; break; }

        // set NAME {
        const setMatch = tl.match(/^set\s+(\w+)\s*\{?/);
        if (setMatch) {
          const setName = setMatch[1];
          let setType = '';
          const setObj = { name: setName, type: '' };
          table.sets.push(setObj);
          sets.push(setObj);
          let sd = tl.includes('{') ? 1 : 0;
          i++;
          while (i < lines.length && sd > 0) {
            const sl = lines[i].trim();
            for (const ch of sl) {
              if (ch === '{') sd++;
              else if (ch === '}') sd--;
            }
            const typeMatch = sl.match(/^type\s+(.+?);?\s*$/);
            if (typeMatch) setObj.type = typeMatch[1];
            i++;
          }
          continue;
        }

        // chain NAME {
        const chainMatch = tl.match(/^chain\s+(\w+)\s*\{?/);
        if (chainMatch) {
          const chainName = chainMatch[1];
          const chain = { name: chainName, type: null, hook: null, policy: null, rules: [] };
          table.chains.push(chain);
          let cd = tl.includes('{') ? 1 : 0;
          i++;
          while (i < lines.length && cd > 0) {
            const cl = lines[i].trim();
            for (const ch of cl) {
              if (ch === '{') cd++;
              else if (ch === '}') cd--;
            }
            if (cd <= 0) { i++; break; }

            // type filter hook input priority 0; policy drop;
            const typeHookMatch = cl.match(/type\s+(\w+)\s+hook\s+(\w+)/);
            if (typeHookMatch) {
              chain.type = typeHookMatch[1];
              chain.hook = typeHookMatch[2];
            }
            const policyMatch = cl.match(/policy\s+(\w+)/);
            if (policyMatch) chain.policy = policyMatch[1];

            // Count as a rule: non-blank, non-type/hook/policy line inside chain
            if (cl && !cl.startsWith('#') && !typeHookMatch && !policyMatch && !cl.startsWith('}') && !cl.startsWith('{')) {
              chain.rules.push(cl);
            }
            i++;
          }
          continue;
        }

        i++;
      }
      continue;
    }

    i++;
  }

  return { tables, defines, sets };
}

export function render(intake) {
  const text = intake.text || '';
  const { tables, defines, sets } = parseNftables(text);

  let totalChains = 0;
  let totalRules = 0;
  for (const t of tables) {
    totalChains += t.chains.length;
    for (const c of t.chains) totalRules += c.rules.length;
  }

  const statsHtml = `<div class="nftcfg-stats">
  <span class="nftcfg-stat"><span class="nftcfg-stat-label">Tables: </span><span class="nftcfg-stat-val">${tables.length}</span></span>
  <span class="nftcfg-stat"><span class="nftcfg-stat-label">Chains: </span><span class="nftcfg-stat-val">${totalChains}</span></span>
  <span class="nftcfg-stat"><span class="nftcfg-stat-label">Rules: </span><span class="nftcfg-stat-val">${totalRules}</span></span>
  ${sets.length ? `<span class="nftcfg-stat"><span class="nftcfg-stat-label">Named sets: </span><span class="nftcfg-stat-val">${sets.length}</span></span>` : ''}
  ${defines.length ? `<span class="nftcfg-stat"><span class="nftcfg-stat-label">Variables: </span><span class="nftcfg-stat-val">${defines.length}</span></span>` : ''}
</div>`;

  const tablesHtml = tables.map((table) => {
    const fc = familyClass(table.family);
    const chainsHtml = table.chains.map((chain) => {
      const pc = policyClass(chain.policy);
      const ruleCount = chain.rules.length;
      const samples = chain.rules.slice(0, 3);
      const samplesHtml = samples.length
        ? `<div class="nftcfg-rule-samples">${samples.map((r) => `<div>${esc(r.length > 80 ? r.slice(0, 80) + '…' : r)}</div>`).join('')}${ruleCount > 3 ? `<div>… +${ruleCount - 3} more</div>` : ''}</div>`
        : '';
      return `<div class="nftcfg-chain">
  <div class="nftcfg-chain-hd">
    <span class="nftcfg-chain-name">${esc(chain.name)}</span>
    ${chain.type ? `<span class="nftcfg-chain-type">${esc(chain.type)}</span>` : ''}
    ${chain.hook ? `<span class="nftcfg-chain-hook">hook ${esc(chain.hook)}</span>` : ''}
    ${chain.policy ? `<span class="nftcfg-policy ${pc}">${esc(chain.policy)}</span>` : ''}
    <span class="nftcfg-rule-count">${ruleCount} rule${ruleCount !== 1 ? 's' : ''}</span>
  </div>
  ${samplesHtml}
</div>`;
    }).join('');

    const tableSets = table.sets;
    const setsHtml = tableSets.length
      ? `<div style="margin-top:6px;font-size:12px;color:var(--fg-2,#888)">Sets: ${tableSets.map((s) => `<span style="font-family:ui-monospace,monospace">${esc(s.name)}${s.type ? ` (${esc(s.type)})` : ''}</span>`).join(', ')}</div>`
      : '';

    return `<div class="nftcfg-table-card">
  <div class="nftcfg-table-hd">
    <span class="nftcfg-table-name">${esc(table.name)}</span>
    <span class="nftcfg-family ${fc}">${esc(table.family)}</span>
  </div>
  ${chainsHtml}
  ${setsHtml}
</div>`;
  }).join('');

  const definesHtml = defines.length
    ? `<div class="nftcfg-section"><h3>Variables</h3><div>${defines.map((d) => `<div class="nftcfg-define"><span class="nftcfg-define-name">$${esc(d.name)}</span> = ${esc(d.value)}</div>`).join('')}</div></div>`
    : '';

  const noTables = !tables.length
    ? '<div style="color:var(--fg-2,#888);font-size:13px">No nftables table blocks found.</div>'
    : '';

  const sub = `${tables.length} table${tables.length !== 1 ? 's' : ''} · ${totalChains} chain${totalChains !== 1 ? 's' : ''} · ${totalRules} rule${totalRules !== 1 ? 's' : ''}`;

  const host = document.createElement('div');
  host.className = 'nftcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="nftcfg-title"><span class="nftcfg-badge">nftables</span>Firewall Rules</div>
<div class="nftcfg-sub">${esc(sub)}</div>
${statsHtml}
${definesHtml}
${tables.length ? `<div class="nftcfg-section"><h3>Tables &amp; Chains</h3>${tablesHtml}${noTables}</div>` : noTables}`;

  return { parentNode: host };
}
