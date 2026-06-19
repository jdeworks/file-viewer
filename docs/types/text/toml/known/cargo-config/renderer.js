import { parseTOML } from '../../toml.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cco-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-cco{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ce4a00;color:#fff3e0;vertical-align:middle;margin-right:8px;}
.cco-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cco-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.cco-sec{margin:12px 0;}
.cco-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.cco-table{width:100%;border-collapse:collapse;font-size:13px;}
.cco-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.cco-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.cco-mono{font:12px/1.4 ui-monospace,monospace;background:var(--bg-2,#f6f8fa);padding:1px 5px;border-radius:3px;}
.cco-pills{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0;}
.cco-pill{font-size:12px;padding:2px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.cco-kv{display:flex;align-items:baseline;gap:8px;margin:3px 0;font-size:13px;}
.cco-key{color:var(--fg-2,#888);min-width:120px;flex-shrink:0;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }

  const build = cfg.build || {};
  const net = cfg.net || {};
  const registry = cfg.registry || {};
  const patch = cfg.patch || {};
  const env = cfg.env || {};

  // [target.*] sections
  const targetEntries = [];
  for (const [key, val] of Object.entries(cfg)) {
    if (key === 'target' && typeof val === 'object' && val !== null) {
      for (const [triple, tcfg] of Object.entries(val)) {
        targetEntries.push({ triple, linker: tcfg?.linker, rustflags: tcfg?.rustflags });
      }
    }
  }

  const host = document.createElement('div');
  host.className = 'cco-doc';

  const kvRow = (key, val) => val !== undefined && val !== null
    ? `<div class="cco-kv"><span class="cco-key">${esc(key)}</span><span class="cco-mono">${esc(String(val))}</span></div>` : '';

  const buildTarget = build.target;
  const buildRustflags = Array.isArray(build.rustflags)
    ? build.rustflags.join(' ') : (build.rustflags || '');
  const buildJobs = build.jobs;

  const buildHtml = (buildTarget || buildRustflags || buildJobs !== undefined)
    ? `<div class="cco-sec"><h3>Build settings</h3>
${kvRow('target', buildTarget)}
${buildRustflags ? `<div class="cco-kv"><span class="cco-key">rustflags</span><span class="cco-mono">${esc(buildRustflags)}</span></div>` : ''}
${kvRow('jobs', buildJobs)}
</div>` : '';

  const targetHtml = targetEntries.length
    ? `<div class="cco-sec"><h3>Target overrides (${targetEntries.length})</h3><table class="cco-table"><thead><tr><th>Triple</th><th>Linker</th><th>rustflags</th></tr></thead><tbody>${
        targetEntries.slice(0, 10).map(({ triple, linker, rustflags }) => {
          const flags = Array.isArray(rustflags) ? rustflags.join(' ') : (rustflags || '');
          return `<tr><td><span class="cco-mono">${esc(triple)}</span></td><td>${linker ? `<span class="cco-mono">${esc(linker)}</span>` : '—'}</td><td>${flags ? `<span class="cco-mono">${esc(flags)}</span>` : '—'}</td></tr>`;
        }).join('')
      }</tbody></table></div>`
    : '';

  const registryDefault = registry.default;
  const registryHtml = registryDefault
    ? `<div class="cco-sec"><h3>Registry</h3>${kvRow('default', registryDefault)}</div>` : '';

  const patchKeys = Object.keys(patch);
  const patchHtml = patchKeys.length
    ? `<div class="cco-sec"><h3>Patch sources (${patchKeys.length})</h3><div class="cco-pills">${patchKeys.map((k) => `<span class="cco-pill">${esc(k)}</span>`).join('')}</div></div>`
    : '';

  const netHtml = Object.keys(net).length
    ? `<div class="cco-sec"><h3>Network</h3>${Object.entries(net).slice(0, 6).map(([k, v]) => kvRow(k, v)).join('')}</div>`
    : '';

  const envKeys = Object.keys(env);
  const envHtml = envKeys.length
    ? `<div class="cco-sec"><h3>Environment (${envKeys.length})</h3><div class="cco-pills">${envKeys.slice(0, 12).map((k) => `<span class="cco-pill">${esc(k)}</span>`).join('')}${envKeys.length > 12 ? `<span style="font-size:11px;color:var(--fg-2,#888)">+${envKeys.length - 12} more</span>` : ''}</div></div>`
    : '';

  const summary = [
    buildTarget ? `target: ${buildTarget}` : '',
    targetEntries.length ? `${targetEntries.length} target override${targetEntries.length !== 1 ? 's' : ''}` : '',
    patchKeys.length ? `${patchKeys.length} patch source${patchKeys.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-cco">Cargo</span>
  <span class="cco-title">Workspace config</span>
</div>
<div class="cco-sub">${esc(summary) || '.cargo/config.toml — build, target, and registry settings'}</div>
${buildHtml}
${targetHtml}
${registryHtml}
${patchHtml}
${netHtml}
${envHtml}`;

  return { parentNode: host };
}
