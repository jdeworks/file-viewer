const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Extract a top-level scalar value from YAML text. Returns the string after `key:` on the same line.
function topScalar(text, key) {
  const m = text.match(new RegExp('^' + key + '\\s*:\\s*(.+)$', 'm'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

// Extract a top-level block (indented lines) under a key. Returns the raw indented block as string.
function topBlock(text, key) {
  const re = new RegExp('^' + key + '\\s*:\\s*(?:\\n|$)((?: {2,}.*\\n?)*)', 'm');
  const m = text.match(re);
  return m ? m[1] : '';
}

function parseTriggers(text) {
  const block = topBlock(text, 'on');
  if (!block) {
    // inline form: on: push  or  on: [push, pull_request]
    const inline = topScalar(text, 'on');
    if (inline) return [{ event: inline.replace(/[\[\]]/g, '').split(',').map(s => s.trim()).join(', '), detail: '' }];
    return [];
  }
  const triggers = [];
  // Each trigger starts at 2-space indent
  const triggerRe = /^ {2}(\w[\w_-]*):/gm;
  let m;
  while ((m = triggerRe.exec(block)) !== null) {
    const event = m[1];
    const detail = [];
    // Look for branches/tags/paths under this trigger
    const afterEvent = block.slice(m.index + m[0].length);
    const branchMatch = afterEvent.match(/^ {4}branches\s*:\s*\[([^\]]+)\]/m) || afterEvent.match(/^ {6}-\s+(.+)/m);
    if (branchMatch) detail.push('branches: ' + branchMatch[1].trim());
    const schedMatch = afterEvent.match(/^ {4}cron\s*:\s*['"]?([^'"\\n]+)['"]?/m);
    if (schedMatch) detail.push('cron: ' + schedMatch[1].trim());
    triggers.push({ event, detail: detail.join(', ') });
  }
  return triggers;
}

function parseJobs(text) {
  const block = topBlock(text, 'jobs');
  if (!block) return [];
  const jobs = [];
  const jobRe = /^ {2}([\w-]+)\s*:/gm;
  let m;
  while ((m = jobRe.exec(block)) !== null) {
    const id = m[1];
    if (id === 'needs' || id === 'if') continue;
    const after = block.slice(m.index + m[0].length);
    const runsOn = (after.match(/^ {4}runs-on\s*:\s*(.+)/m) || [])[1]?.trim().replace(/^['"]|['"]$/g, '') || '';
    const stepCount = (after.match(/^ {6}-\s/gm) || []).length;
    const needs = (after.match(/^ {4}needs\s*:\s*(.+)/m) || [])[1]?.trim() || '';
    jobs.push({ id, runsOn, stepCount, needs });
  }
  return jobs;
}

function parseEnvKeys(text) {
  const block = topBlock(text, 'env');
  if (!block) return [];
  return [...block.matchAll(/^ {2}(\w+)\s*:/gm)].map(m => m[1]);
}

const TRIGGER_ICON = { push: '⬆', pull_request: '⤵', workflow_dispatch: '▶', schedule: '⏰', release: '🏷', workflow_call: '↗' };

export async function render(intake) {
  const text = intake.text || '';
  const name = topScalar(text, 'name') || (intake.filename || '').split('/').pop() || 'Workflow';
  const triggers = parseTriggers(text);
  const jobs = parseJobs(text);
  const envKeys = parseEnvKeys(text);

  const host = document.createElement('div');
  host.className = 'gha-doc';
  host.innerHTML = `<style>
.gha-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;}
.badge-gha{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a7f37;color:#fff;margin-right:8px;vertical-align:middle;}
.gha-title{font-size:19px;font-weight:700;margin:0 0 4px;}
.gha-sec{margin:14px 0;}
.gha-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.gha-triggers{display:flex;flex-wrap:wrap;gap:6px;}
.gha-trigger{display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f5f5f5);border:1px solid var(--border,#e0e0e0);font-size:12.5px;}
.gha-trigger .icon{font-size:14px;}
.gha-trigger .det{color:var(--fg-2,#888);font-size:11px;margin-left:4px;}
.gha-table{width:100%;border-collapse:collapse;font-size:13px;}
.gha-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.03em;border-bottom:1px solid var(--border,#e0e0e0);padding:4px 10px 4px 0;}
.gha-table td{padding:5px 10px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.gha-job-id{font:12px ui-monospace,monospace;color:var(--accent,#0969da);}
.gha-runner{font-size:12px;background:var(--bg-3,#eee);padding:1px 6px;border-radius:4px;}
.gha-needs{font-size:11px;color:var(--fg-2,#888);}
.gha-env{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;}
.gha-env-key{font:12px ui-monospace,monospace;padding:1px 7px;border-radius:4px;background:var(--bg-3,#eee);color:var(--fg,#333);}
</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
  <span class="badge-gha">GitHub Actions</span>
  <span class="gha-title">${esc(name)}</span>
</div>
${triggers.length ? `<div class="gha-sec"><h3>Triggers</h3><div class="gha-triggers">
${triggers.map(t => `<div class="gha-trigger"><span class="icon">${TRIGGER_ICON[t.event] || '⚡'}</span><span>${esc(t.event)}</span>${t.detail ? `<span class="det">${esc(t.detail)}</span>` : ''}</div>`).join('')}
</div></div>` : ''}
${jobs.length ? `<div class="gha-sec"><h3>Jobs (${jobs.length})</h3><table class="gha-table">
<thead><tr><th>Job</th><th>Runs on</th><th>Steps</th><th>Needs</th></tr></thead>
<tbody>${jobs.map(j => `<tr>
  <td><span class="gha-job-id">${esc(j.id)}</span></td>
  <td><span class="gha-runner">${esc(j.runsOn)}</span></td>
  <td>${j.stepCount || '—'}</td>
  <td><span class="gha-needs">${esc(j.needs)}</span></td>
</tr>`).join('')}</tbody></table></div>` : ''}
${envKeys.length ? `<div class="gha-sec"><h3>Environment variables</h3><div class="gha-env">${envKeys.map(k => `<span class="gha-env-key">${esc(k)}</span>`).join('')}</div></div>` : ''}`;

  return { parentNode: host };
}
