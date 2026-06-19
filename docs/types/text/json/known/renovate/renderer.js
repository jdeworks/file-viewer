const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rnv-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-renovate{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#17a2b8;color:#fff;vertical-align:middle;margin-right:8px;}
.rnv-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rnv-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.rnv-sec{margin:12px 0;}
.rnv-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.rnv-pills{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}
.rnv-pill{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.rnv-pkg-table{width:100%;border-collapse:collapse;font-size:13px;}
.rnv-pkg-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.rnv-pkg-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.rnv-mono{font:12px/1.4 ui-monospace,monospace;}
.rnv-sched{font-size:12px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.rnv-kv{font-size:12px;color:var(--fg-2,#888);}
`;

export function render(intake) {
  let cfg;
  try { cfg = JSON.parse(intake.text || '{}'); } catch { return { parentNode: Object.assign(document.createElement('div'), { textContent: 'Invalid Renovate JSON.' }) }; }

  const extends_ = Array.isArray(cfg.extends) ? cfg.extends : (cfg.extends ? [cfg.extends] : []);
  const packageRules = Array.isArray(cfg.packageRules) ? cfg.packageRules : [];
  const schedule = Array.isArray(cfg.schedule) ? cfg.schedule : (cfg.schedule ? [cfg.schedule] : []);
  const labels = Array.isArray(cfg.labels) ? cfg.labels : [];
  const automerge = cfg.automerge;
  const prHourlyLimit = cfg.prHourlyLimit;
  const prConcurrentLimit = cfg.prConcurrentLimit;
  const baseBranches = Array.isArray(cfg.baseBranches) ? cfg.baseBranches : [];
  const ignoreDeps = Array.isArray(cfg.ignoreDeps) ? cfg.ignoreDeps : [];

  const host = document.createElement('div');
  host.className = 'rnv-doc';

  const extendsHtml = extends_.length
    ? `<div class="rnv-sec"><h3>Extends presets (${extends_.length})</h3><div class="rnv-pills">${extends_.map((e) => `<span class="rnv-pill">${esc(e)}</span>`).join('')}</div></div>`
    : '';

  const scheduleHtml = schedule.length
    ? `<div class="rnv-sec"><h3>Update schedule</h3>${schedule.map((s) => `<div class="rnv-sched">${esc(s)}</div>`).join('')}</div>`
    : '';

  const labelsHtml = labels.length
    ? `<div class="rnv-sec"><h3>PR labels</h3><div class="rnv-pills">${labels.map((l) => `<span class="rnv-pill">${esc(l)}</span>`).join('')}</div></div>`
    : '';

  const rulesHtml = packageRules.length
    ? `<div class="rnv-sec"><h3>Package rules (${packageRules.length})</h3><table class="rnv-pkg-table"><thead><tr><th>Match</th><th>Action</th></tr></thead><tbody>${packageRules.slice(0, 15).map((r) => {
        const match = [
          r.matchPackageNames && `names: ${[].concat(r.matchPackageNames).join(', ')}`,
          r.matchPackagePatterns && `patterns: ${[].concat(r.matchPackagePatterns).join(', ')}`,
          r.matchDepTypes && `types: ${[].concat(r.matchDepTypes).join(', ')}`,
          r.matchUpdateTypes && `update: ${[].concat(r.matchUpdateTypes).join(', ')}`,
          r.matchManagers && `managers: ${[].concat(r.matchManagers).join(', ')}`,
        ].filter(Boolean).join('; ');
        const action = [
          r.automerge !== undefined && (r.automerge ? 'automerge' : 'no-automerge'),
          r.enabled === false && 'disabled',
          r.groupName && `group: ${r.groupName}`,
          r.schedule && `schedule override`,
          r.labels && `labels: ${[].concat(r.labels).join(', ')}`,
          r.minimumReleaseAge && `min-age: ${r.minimumReleaseAge}`,
        ].filter(Boolean).join('; ') || '—';
        return `<tr><td><span class="rnv-mono">${esc(match || '(all)')}</span></td><td><span class="rnv-kv">${esc(action)}</span></td></tr>`;
      }).join('')}${packageRules.length > 15 ? `<tr><td colspan="2" class="rnv-kv">…and ${packageRules.length - 15} more rules</td></tr>` : ''}</tbody></table></div>`
    : '';

  const limitsHtml = (prHourlyLimit != null || prConcurrentLimit != null || automerge != null || baseBranches.length || ignoreDeps.length)
    ? `<div class="rnv-sec"><h3>Settings</h3><div class="rnv-pills">
        ${automerge != null ? `<span class="rnv-pill">automerge: ${automerge ? 'yes' : 'no'}</span>` : ''}
        ${prHourlyLimit != null ? `<span class="rnv-pill">PR/hour: ${esc(prHourlyLimit)}</span>` : ''}
        ${prConcurrentLimit != null ? `<span class="rnv-pill">max concurrent PRs: ${esc(prConcurrentLimit)}</span>` : ''}
        ${baseBranches.length ? `<span class="rnv-pill">branches: ${baseBranches.map(esc).join(', ')}</span>` : ''}
        ${ignoreDeps.length ? `<span class="rnv-pill">ignored: ${ignoreDeps.length} deps</span>` : ''}
      </div></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="rnv-title"><span class="badge-renovate">Renovate</span>Dependency update config</div>
<div class="rnv-sub">${packageRules.length} package rule${packageRules.length !== 1 ? 's' : ''}${schedule.length ? ' · scheduled' : ''}${automerge ? ' · automerge on' : ''}</div>
${extendsHtml}
${scheduleHtml}
${labelsHtml}
${limitsHtml}
${rulesHtml}`;

  return { parentNode: host };
}
