const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.renovate-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-renovate{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0a4af5;color:#fff;vertical-align:middle;margin-right:8px;}
.renovate-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.renovate-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.renovate-sec{margin:12px 0;}
.renovate-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.renovate-pills{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}
.renovate-pill{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.renovate-pkg-table{width:100%;border-collapse:collapse;font-size:13px;}
.renovate-pkg-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.renovate-pkg-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.renovate-mono{font:12px/1.4 ui-monospace,monospace;}
.renovate-sched{font-size:12px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.renovate-kv{font-size:12px;color:var(--fg-2,#888);}
.renovate-chip{display:inline-flex;align-items:center;font-size:11px;padding:2px 8px;border-radius:10px;background:#e8f4f8;border:1px solid #93c5d4;color:#1a6070;margin:2px;}
`;

export function render(intake) {
  let cfg;
  try {
    cfg = intake.parsed || JSON.parse(intake.text || '{}');
  } catch {
    return { parentNode: Object.assign(document.createElement('div'), { textContent: 'Invalid Renovate JSON.' }) };
  }

  const extends_ = Array.isArray(cfg.extends) ? cfg.extends : (cfg.extends ? [cfg.extends] : []);
  const packageRules = Array.isArray(cfg.packageRules) ? cfg.packageRules : [];
  const schedule = Array.isArray(cfg.schedule) ? cfg.schedule : (cfg.schedule ? [cfg.schedule] : []);
  const labels = Array.isArray(cfg.labels) ? cfg.labels : [];
  const automerge = cfg.automerge;
  const automergeType = cfg.automergeType;
  const prHourlyLimit = cfg.prHourlyLimit;
  const prConcurrentLimit = cfg.prConcurrentLimit;
  const baseBranches = Array.isArray(cfg.baseBranches) ? cfg.baseBranches : [];
  const ignoreDeps = Array.isArray(cfg.ignoreDeps) ? cfg.ignoreDeps : [];
  const vulnerabilityAlerts = cfg.vulnerabilityAlerts || null;
  const assignees = Array.isArray(cfg.assignees) ? cfg.assignees : [];
  const reviewers = Array.isArray(cfg.reviewers) ? cfg.reviewers : [];

  const host = document.createElement('div');
  host.className = 'renovate-doc';

  const extendsHtml = extends_.length
    ? `<div class="renovate-sec"><h3>Extends presets (${extends_.length})</h3><div class="renovate-pills">${extends_.map((e) => `<span class="renovate-pill">${esc(e)}</span>`).join('')}</div></div>`
    : '';

  const scheduleHtml = schedule.length
    ? `<div class="renovate-sec"><h3>Update schedule</h3>${schedule.map((s) => `<div class="renovate-sched">${esc(s)}</div>`).join('')}</div>`
    : '';

  const labelsHtml = labels.length
    ? `<div class="renovate-sec"><h3>PR labels</h3><div class="renovate-pills">${labels.map((l) => `<span class="renovate-pill">${esc(l)}</span>`).join('')}</div></div>`
    : '';

  const rulesHtml = packageRules.length
    ? `<div class="renovate-sec"><h3>Package rules (${packageRules.length})</h3><table class="renovate-pkg-table"><thead><tr><th>Match</th><th>Automerge</th><th>Group / Action</th></tr></thead><tbody>${packageRules.slice(0, 15).map((r) => {
        const matchParts = [
          r.matchDepTypes && `${[].concat(r.matchDepTypes).join(', ')}`,
          r.matchPackagePatterns && `patterns: ${[].concat(r.matchPackagePatterns).join(', ')}`,
          r.matchPackageNames && `names: ${[].concat(r.matchPackageNames).join(', ')}`,
          r.matchUpdateTypes && `update: ${[].concat(r.matchUpdateTypes).join(', ')}`,
          r.matchManagers && `managers: ${[].concat(r.matchManagers).join(', ')}`,
        ].filter(Boolean).join('; ');
        const automergeChip = r.automerge !== undefined
          ? `<span class="renovate-chip">${r.automerge ? 'automerge' : 'no-automerge'}</span>`
          : '—';
        const action = [
          r.enabled === false && 'disabled',
          r.groupName && `group: ${r.groupName}`,
          r.schedule && 'schedule override',
          r.labels && `labels: ${[].concat(r.labels).join(', ')}`,
          r.minimumReleaseAge && `min-age: ${r.minimumReleaseAge}`,
          r.automergeType && `type: ${r.automergeType}`,
        ].filter(Boolean).join('; ') || '—';
        return `<tr><td><span class="renovate-mono">${esc(matchParts || '(all)')}</span></td><td>${automergeChip}</td><td><span class="renovate-kv">${esc(action)}</span></td></tr>`;
      }).join('')}${packageRules.length > 15 ? `<tr><td colspan="3" class="renovate-kv">…and ${packageRules.length - 15} more rules</td></tr>` : ''}</tbody></table></div>`
    : '';

  const limitsHtml = (prHourlyLimit != null || prConcurrentLimit != null || automerge != null || baseBranches.length || ignoreDeps.length || assignees.length || reviewers.length)
    ? `<div class="renovate-sec"><h3>PR limits &amp; settings</h3><div class="renovate-pills">
        ${automerge != null ? `<span class="renovate-pill">automerge: ${automerge ? 'yes' : 'no'}</span>` : ''}
        ${automergeType ? `<span class="renovate-pill">automerge type: ${esc(automergeType)}</span>` : ''}
        ${prHourlyLimit != null ? `<span class="renovate-pill">PR/hour: ${esc(prHourlyLimit)}</span>` : ''}
        ${prConcurrentLimit != null ? `<span class="renovate-pill">max concurrent PRs: ${esc(prConcurrentLimit)}</span>` : ''}
        ${baseBranches.length ? `<span class="renovate-pill">branches: ${baseBranches.map(esc).join(', ')}</span>` : ''}
        ${ignoreDeps.length ? `<span class="renovate-pill">ignored: ${ignoreDeps.length} deps</span>` : ''}
        ${assignees.length ? `<span class="renovate-pill">assignees: ${assignees.map(esc).join(', ')}</span>` : ''}
        ${reviewers.length ? `<span class="renovate-pill">reviewers: ${reviewers.map(esc).join(', ')}</span>` : ''}
      </div></div>`
    : '';

  const vulnHtml = vulnerabilityAlerts
    ? `<div class="renovate-sec"><h3>Vulnerability alerts</h3><div class="renovate-pills">
        ${vulnerabilityAlerts.enabled !== undefined ? `<span class="renovate-pill">enabled: ${vulnerabilityAlerts.enabled ? 'yes' : 'no'}</span>` : ''}
        ${vulnerabilityAlerts.automerge !== undefined ? `<span class="renovate-pill">automerge: ${vulnerabilityAlerts.automerge ? 'yes' : 'no'}</span>` : ''}
        ${Array.isArray(vulnerabilityAlerts.labels) && vulnerabilityAlerts.labels.length ? `<span class="renovate-pill">labels: ${vulnerabilityAlerts.labels.map(esc).join(', ')}</span>` : ''}
      </div></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="renovate-title"><span class="badge-renovate">Renovate</span>renovate.json</div>
<div class="renovate-sub">Automated dependency updates${packageRules.length ? ` · ${packageRules.length} package rule${packageRules.length !== 1 ? 's' : ''}` : ''}${schedule.length ? ' · scheduled' : ''}${automerge ? ' · automerge on' : ''}</div>
${extendsHtml}
${limitsHtml}
${rulesHtml}
${vulnHtml}
${scheduleHtml}
${labelsHtml}`;

  return { parentNode: host };
}
