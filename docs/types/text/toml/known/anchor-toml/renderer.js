import { parseTOML } from '../../toml.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.anc-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-anc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1C1C1C;color:#9945FF;vertical-align:middle;margin-right:8px}
.anc-title{font-size:18px;font-weight:700;margin:0 0 4px}
.anc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.anc-sec{margin:14px 0}
.anc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.anc-cluster-block{margin-bottom:12px}
.anc-cluster-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--fg-2,#888);margin-bottom:6px}
.anc-table{width:100%;border-collapse:collapse;font-size:12px}
.anc-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.anc-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:11px}
.anc-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.anc-pill{display:inline-block;font-size:12px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.anc-meta{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0}
.anc-kv{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:5px 12px;font-size:13px;display:flex;gap:8px;align-items:baseline}
.anc-kv-k{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888)}
.anc-kv-v{font-family:ui-monospace,monospace;font-weight:600}
.anc-addr{font-family:ui-monospace,monospace;font-size:11px;color:var(--fg,#24292f);word-break:break-all}
`;

const CLUSTER_LABELS = { localnet: 'Localnet', devnet: 'Devnet', testnet: 'Testnet', mainnet: 'Mainnet', 'mainnet-beta': 'Mainnet Beta' };

export function render(intake) {
  let cfg = {};
  try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }

  // programs per cluster
  const programs = cfg.programs && typeof cfg.programs === 'object' ? cfg.programs : {};
  const clusters = Object.keys(programs);

  // provider
  const provider = cfg.provider || {};
  const cluster = provider.cluster || null;
  const wallet = provider.wallet || null;

  // workspace
  const workspace = cfg.workspace || {};
  const members = Array.isArray(workspace.members) ? workspace.members : [];
  const types = workspace.types || null;
  const idl = workspace.idl || null;

  // scripts
  const scripts = cfg.scripts && typeof cfg.scripts === 'object' ? Object.keys(cfg.scripts) : [];

  // test
  const testCfg = cfg.test || {};
  const testValidator = testCfg.validator || null;

  const programsHtml = clusters.length
    ? `<div class="anc-sec"><h3>Programs</h3>${clusters.map((c) => {
        const progs = programs[c];
        if (typeof progs !== 'object') return '';
        const entries = Object.entries(progs);
        return `<div class="anc-cluster-block"><div class="anc-cluster-label">${esc(CLUSTER_LABELS[c] || c)}</div><table class="anc-table"><thead><tr><th>Program</th><th>Address</th></tr></thead><tbody>${entries.map(([prog, addr]) =>
          `<tr><td>${esc(prog)}</td><td><span class="anc-addr">${esc(String(addr))}</span></td></tr>`
        ).join('')}</tbody></table></div>`;
      }).join('')}</div>`
    : '';

  const providerHtml = (cluster || wallet)
    ? `<div class="anc-sec"><h3>Provider</h3><div class="anc-meta">${cluster ? `<div class="anc-kv"><span class="anc-kv-k">Cluster</span><span class="anc-kv-v">${esc(cluster)}</span></div>` : ''}${wallet ? `<div class="anc-kv"><span class="anc-kv-k">Wallet</span><span class="anc-kv-v">${esc(wallet)}</span></div>` : ''}</div></div>`
    : '';

  const workspaceHtml = members.length
    ? `<div class="anc-sec"><h3>Workspace Members (${members.length})</h3><div class="anc-pills">${members.map((m) => `<span class="anc-pill">${esc(m)}</span>`).join('')}</div>${types ? `<div style="font-size:11px;color:var(--fg-2,#888);margin-top:4px">types: ${esc(types)}</div>` : ''}${idl ? `<div style="font-size:11px;color:var(--fg-2,#888)">idl: ${esc(idl)}</div>` : ''}</div>`
    : '';

  const scriptsHtml = scripts.length
    ? `<div class="anc-sec"><h3>Scripts</h3><div class="anc-pills">${scripts.map((s) => `<span class="anc-pill">${esc(s)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'anc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="anc-title"><span class="badge-anc">Anchor</span>Anchor.toml</div>
<div class="anc-sub">Solana smart contract framework configuration${cluster ? ' · cluster: ' + esc(cluster) : ''}</div>
${programsHtml}
${providerHtml}
${workspaceHtml}
${scriptsHtml}`;
  return { parentNode: host };
}
