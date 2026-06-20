const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.hh-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-hh{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1C1C1C;color:#F0C000;vertical-align:middle;margin-right:8px}
.hh-title{font-size:18px;font-weight:700;margin:0 0 4px}
.hh-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.hh-sec{margin:14px 0}
.hh-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.hh-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}
.hh-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px}
.hh-card-name{font-size:13px;font-weight:700;margin-bottom:4px;font-family:ui-monospace,monospace}
.hh-card-row{font-size:11px;color:var(--fg-2,#888);display:flex;gap:4px;align-items:baseline;margin:2px 0}
.hh-card-val{color:var(--fg,#24292f);font-family:ui-monospace,monospace;font-weight:600;font-size:11px}
.hh-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.hh-pill{display:inline-block;font-size:12px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.hh-meta{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0}
.hh-kv{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:5px 12px;font-size:13px;display:flex;gap:8px;align-items:baseline}
.hh-kv-k{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888)}
.hh-kv-v{font-family:ui-monospace,monospace;font-weight:600}
.hh-note{font-size:12px;color:var(--fg-2,#888);font-style:italic;margin-top:4px}
`;

function extractNetworks(text) {
  const networks = [];
  // Find the networks: { ... } block
  const netBlockM = /\bnetworks\s*:\s*\{/.exec(text);
  if (!netBlockM) return networks;
  let i = netBlockM.index + netBlockM[0].length;
  let depth = 1;
  let start = i;
  while (i < text.length && depth > 0) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') depth--;
    i++;
  }
  const block = text.slice(start, i - 1);

  // Find top-level network names (keys at depth 0 in the block)
  const keyRe = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
  let m;
  const topKeys = [];
  let bdepth = 0;
  let lastEnd = 0;
  for (let j = 0; j < block.length; j++) {
    if (block[j] === '{' || block[j] === '[') bdepth++;
    else if (block[j] === '}' || block[j] === ']') bdepth--;
    else if (bdepth === 0) {
      // Try to match a key at this position
      const seg = block.slice(j);
      const km = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*:/.exec(seg);
      if (km && seg.indexOf('\n') > km[0].length - 1 || km) {
        if (km && !topKeys.includes(km[1])) topKeys.push(km[1]);
        j += (km ? km[0].length - 1 : 0);
      }
    }
  }

  // For each network, extract its sub-block
  for (const name of topKeys) {
    const netRe = new RegExp(`\\b${name}\\s*:\\s*\\{`);
    const nm = netRe.exec(block);
    if (!nm) continue;
    let ni = nm.index + nm[0].length;
    let nd = 1;
    const nstart = ni;
    while (ni < block.length && nd > 0) {
      if (block[ni] === '{') nd++;
      else if (block[ni] === '}') nd--;
      ni++;
    }
    const sub = block.slice(nstart, ni - 1);

    const urlM = /url\s*:\s*['"`]([^'"`]+)['"`]/.exec(sub);
    const portM = /port\s*:\s*(\d+)/.exec(sub);
    const chainIdM = /chainId\s*:\s*(\d+)/.exec(sub);
    const accountsM = /accounts\s*:/.exec(sub);
    networks.push({
      name,
      url: urlM ? urlM[1] : null,
      port: portM ? portM[1] : null,
      chainId: chainIdM ? chainIdM[1] : null,
      hasAccounts: !!accountsM,
    });
  }
  return networks;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = (intake.name || intake.filename || 'hardhat.config.js').split('/').pop();

  // Networks
  const networks = extractNetworks(text);

  // Solidity version
  let solcVersion = null;
  const solcM = /solidity\s*:\s*['"`]([^'"`]+)['"`]/.exec(text) ||
    /version\s*:\s*['"`]([^'"`]{4,12})['"`]/.exec(text);
  if (solcM) solcVersion = solcM[1];

  // Optimizer
  let optimizerEnabled = null;
  let optimizerRuns = null;
  const optEnabledM = /optimizer\s*:\s*\{[^}]*enabled\s*:\s*(true|false)/.exec(text);
  if (optEnabledM) optimizerEnabled = optEnabledM[1];
  const optRunsM = /optimizer\s*:\s*\{[^}]*runs\s*:\s*(\d+)/.exec(text) ||
    /runs\s*:\s*(\d+)/.exec(text);
  if (optRunsM) optimizerRuns = optRunsM[1];

  // Paths
  let sourcesPath = null, artifactsPath = null, cachePath = null;
  const srcM = /sources\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (srcM) sourcesPath = srcM[1];
  const artM = /artifacts\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (artM) artifactsPath = artM[1];
  const cacheM = /cache\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (cacheM) cachePath = cacheM[1];

  // Etherscan
  const hasEtherscan = /etherscan\s*:/i.test(text) && /apiKey\s*:/i.test(text);

  // Gas reporter
  const gasEnabled = /gasReporter\s*:\s*\{[^}]*enabled\s*:\s*true/.exec(text) !== null;

  // Build HTML
  const networksHtml = networks.length
    ? `<div class="hh-sec"><h3>Networks (${networks.length})</h3><div class="hh-grid">${networks.map((n) => {
        const rows = [
          n.url ? `<div class="hh-card-row"><span>URL</span><span class="hh-card-val">${esc(n.url.length > 36 ? n.url.slice(0, 35) + '…' : n.url)}</span></div>` : '',
          n.port ? `<div class="hh-card-row"><span>Port</span><span class="hh-card-val">${esc(n.port)}</span></div>` : '',
          n.chainId ? `<div class="hh-card-row"><span>Chain ID</span><span class="hh-card-val">${esc(n.chainId)}</span></div>` : '',
          n.hasAccounts ? `<div class="hh-card-row"><span class="hh-card-val" style="color:#2e7d32">accounts configured</span></div>` : '',
        ].filter(Boolean).join('');
        return `<div class="hh-card"><div class="hh-card-name">${esc(n.name)}</div>${rows}</div>`;
      }).join('')}</div></div>`
    : '';

  const metaItems = [
    solcVersion ? `<div class="hh-kv"><span class="hh-kv-k">Solidity</span><span class="hh-kv-v">${esc(solcVersion)}</span></div>` : '',
    optimizerEnabled !== null ? `<div class="hh-kv"><span class="hh-kv-k">Optimizer</span><span class="hh-kv-v">${esc(optimizerEnabled)}${optimizerRuns ? ` · ${esc(optimizerRuns)} runs` : ''}</span></div>` : '',
    sourcesPath ? `<div class="hh-kv"><span class="hh-kv-k">Sources</span><span class="hh-kv-v">${esc(sourcesPath)}</span></div>` : '',
    artifactsPath ? `<div class="hh-kv"><span class="hh-kv-k">Artifacts</span><span class="hh-kv-v">${esc(artifactsPath)}</span></div>` : '',
    cachePath ? `<div class="hh-kv"><span class="hh-kv-k">Cache</span><span class="hh-kv-v">${esc(cachePath)}</span></div>` : '',
    hasEtherscan ? `<div class="hh-kv"><span class="hh-kv-k">Etherscan</span><span class="hh-kv-v">configured</span></div>` : '',
    gasEnabled ? `<div class="hh-kv"><span class="hh-kv-k">Gas Reporter</span><span class="hh-kv-v">enabled</span></div>` : '',
  ].filter(Boolean).join('');

  const metaHtml = metaItems
    ? `<div class="hh-sec"><h3>Settings</h3><div class="hh-meta">${metaItems}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'hh-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="hh-title"><span class="badge-hh">Hardhat</span>${esc(name)}</div>
<div class="hh-sub">Ethereum/EVM development framework configuration</div>
${networksHtml}
${metaHtml}`;
  return { parentNode: host };
}
