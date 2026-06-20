const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.truf-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-truf{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5E464D;color:#fff;vertical-align:middle;margin-right:8px}
.truf-title{font-size:18px;font-weight:700;margin:0 0 4px}
.truf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.truf-sec{margin:14px 0}
.truf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.truf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}
.truf-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px}
.truf-card-name{font-size:13px;font-weight:700;margin-bottom:4px;font-family:ui-monospace,monospace}
.truf-card-row{font-size:11px;color:var(--fg-2,#888);display:flex;gap:4px;align-items:baseline;margin:2px 0}
.truf-card-val{color:var(--fg,#24292f);font-family:ui-monospace,monospace;font-weight:600;font-size:11px}
.truf-meta{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0}
.truf-kv{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:5px 12px;font-size:13px;display:flex;gap:8px;align-items:baseline}
.truf-kv-k{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888)}
.truf-kv-v{font-family:ui-monospace,monospace;font-weight:600}
`;

function extractNetworks(text) {
  const networks = [];
  const netBlockM = /\bnetworks\s*[=:]\s*\{/.exec(text);
  if (!netBlockM) return networks;
  let i = netBlockM.index + netBlockM[0].length;
  let depth = 1;
  while (i < text.length && depth > 0) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') depth--;
    i++;
  }
  const block = text.slice(netBlockM.index + netBlockM[0].length, i - 1);

  // Find top-level network entries
  let bdepth = 0;
  const topKeys = [];
  for (let j = 0; j < block.length; j++) {
    if (block[j] === '{' || block[j] === '[') bdepth++;
    else if (block[j] === '}' || block[j] === ']') bdepth--;
    else if (bdepth === 0) {
      const seg = block.slice(j);
      const km = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*:/.exec(seg);
      if (km && !topKeys.includes(km[1])) {
        topKeys.push(km[1]);
        j += km[0].length - 1;
      }
    }
  }

  for (const name of topKeys) {
    const netRe = new RegExp(`\\b${name}\\s*:\\s*\\{`);
    const nm = netRe.exec(block);
    if (!nm) continue;
    let ni = nm.index + nm[0].length;
    let nd = 1;
    while (ni < block.length && nd > 0) {
      if (block[ni] === '{') nd++;
      else if (block[ni] === '}') nd--;
      ni++;
    }
    const sub = block.slice(nm.index + nm[0].length, ni - 1);

    const hostM = /host\s*:\s*['"`]([^'"`]+)['"`]/.exec(sub);
    const portM = /port\s*:\s*(\d+)/.exec(sub);
    const netIdM = /network_id\s*:\s*['"`*]?([^'"`\s,}]+)['"`]?/.exec(sub);
    const gasM = /gas\s*:\s*([\d_]+)/.exec(sub);
    networks.push({
      name,
      host: hostM ? hostM[1] : null,
      port: portM ? portM[1] : null,
      networkId: netIdM ? netIdM[1] : null,
      gas: gasM ? gasM[1].replace(/_/g, '') : null,
    });
  }
  return networks;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = (intake.name || intake.filename || 'truffle-config.js').split('/').pop();

  const networks = extractNetworks(text);

  // Solidity version
  let solcVersion = null;
  const solcM = /compilers\s*:\s*\{[^}]*solc\s*:\s*\{[^}]*version\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (solcM) solcVersion = solcM[1];

  // Optimizer
  let optimizerEnabled = null, optimizerRuns = null;
  const optEnabledM = /optimizer\s*:\s*\{[^}]*enabled\s*:\s*(true|false)/.exec(text);
  if (optEnabledM) optimizerEnabled = optEnabledM[1];
  const optRunsM = /runs\s*:\s*(\d+)/.exec(text);
  if (optRunsM) optimizerRuns = optRunsM[1];

  // Build directory
  let buildDir = null;
  const buildM = /contracts_build_directory\s*:\s*['"`]([^'"`]+)['"`]/.exec(text) ||
    /contract_build_directory\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (buildM) buildDir = buildM[1];

  const networksHtml = networks.length
    ? `<div class="truf-sec"><h3>Networks (${networks.length})</h3><div class="truf-grid">${networks.map((n) => {
        const rows = [
          (n.host || n.port) ? `<div class="truf-card-row"><span>Host</span><span class="truf-card-val">${esc(n.host || 'localhost')}${n.port ? ':' + esc(n.port) : ''}</span></div>` : '',
          n.networkId ? `<div class="truf-card-row"><span>Network ID</span><span class="truf-card-val">${esc(n.networkId)}</span></div>` : '',
          n.gas ? `<div class="truf-card-row"><span>Gas</span><span class="truf-card-val">${esc(n.gas)}</span></div>` : '',
        ].filter(Boolean).join('');
        return `<div class="truf-card"><div class="truf-card-name">${esc(n.name)}</div>${rows}</div>`;
      }).join('')}</div></div>`
    : '';

  const metaItems = [
    solcVersion ? `<div class="truf-kv"><span class="truf-kv-k">Solidity</span><span class="truf-kv-v">${esc(solcVersion)}</span></div>` : '',
    optimizerEnabled !== null ? `<div class="truf-kv"><span class="truf-kv-k">Optimizer</span><span class="truf-kv-v">${esc(optimizerEnabled)}${optimizerRuns ? ` · ${esc(optimizerRuns)} runs` : ''}</span></div>` : '',
    buildDir ? `<div class="truf-kv"><span class="truf-kv-k">Build Dir</span><span class="truf-kv-v">${esc(buildDir)}</span></div>` : '',
  ].filter(Boolean).join('');

  const metaHtml = metaItems
    ? `<div class="truf-sec"><h3>Settings</h3><div class="truf-meta">${metaItems}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'truf-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="truf-title"><span class="badge-truf">Truffle</span>${esc(name)}</div>
<div class="truf-sub">Ethereum smart contract development framework configuration</div>
${networksHtml}
${metaHtml}`;
  return { parentNode: host };
}
