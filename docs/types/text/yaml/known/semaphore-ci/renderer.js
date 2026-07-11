import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
import { describeCollectionCap } from '../../../../../core/collection-cap.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SECRET_RE = /secret|token|key|password|api/i;
const maskVal = (k, v) => SECRET_RE.test(k) ? '[configured]' : String(v == null ? '' : v);

const CSS = `
.semaphorecfg-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.semaphorecfg-doc .smc-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#28BE61;color:#111;vertical-align:middle;margin-right:8px;}
.semaphorecfg-doc .smc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.semaphorecfg-doc .smc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.semaphorecfg-doc .smc-sec{margin:14px 0;}
.semaphorecfg-doc .smc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.semaphorecfg-doc .smc-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:0 0 8px;}
.semaphorecfg-doc .smc-block-name{font-weight:700;font-size:14px;margin:0 0 6px;}
.semaphorecfg-doc .smc-job{padding:4px 10px;border-radius:6px;background:var(--bg-3,#f0f2f4);border:1px solid var(--border,#e0e0e0);margin:3px 0;font-size:13px;}
.semaphorecfg-doc .smc-job-name{font-weight:600;}
.semaphorecfg-doc .smc-cmd{font:11px/1.5 ui-monospace,monospace;color:var(--fg-2,#777);display:block;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.semaphorecfg-doc .smc-chip{display:inline-flex;align-items:center;font-size:11px;padding:2px 9px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.semaphorecfg-doc .smc-chip.machine{background:#e8f5e9;border-color:#a5d6a7;color:#1b5e20;}
.semaphorecfg-doc .smc-chip.promo{background:#fff8e1;border-color:#ffe082;color:#7a4f00;}
.semaphorecfg-doc .smc-env-row{display:grid;grid-template-columns:max-content 1fr;gap:3px 14px;font-size:12px;font-family:ui-monospace,monospace;margin:2px 0;}
.semaphorecfg-doc .smc-env-k{color:var(--fg-2,#888);}
.semaphorecfg-doc .smc-env-v{color:var(--fg,#24292f);font-weight:600;}
.semaphorecfg-doc .smc-more{font-size:11px;color:var(--fg-2,#888);margin-top:4px;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const version = cfg.version || null;
  const name = cfg.name || null;

  // Agent
  const agent = cfg.agent || {};
  const machineType = agent?.machine?.type || null;

  // Global job config
  const globalJob = cfg.global_job_config || {};
  const globalEnvVars = globalJob.env_vars || [];
  const globalSecrets = globalJob.secrets || [];

  // Blocks
  const allBlocks = Array.isArray(cfg.blocks) ? cfg.blocks : [];
  const blocks = allBlocks.slice(0, 8);
  const blockCap = describeCollectionCap(allBlocks, blocks);

  // Promotions
  const promotions = Array.isArray(cfg.promotions) ? cfg.promotions : [];

  // --- Agent section ---
  const agentHtml = machineType
    ? `<div class="smc-sec"><h3>Agent</h3><span class="smc-chip machine">${esc(machineType)}</span></div>`
    : '';

  // --- Global job config ---
  let globalHtml = '';
  if (globalEnvVars.length || globalSecrets.length) {
    const envRows = globalEnvVars.slice(0, 10).map((ev) => {
      const k = ev.name || '';
      const v = maskVal(k, ev.value);
      return `<div class="smc-env-row"><span class="smc-env-k">${esc(k)}</span><span class="smc-env-v">${esc(v)}</span></div>`;
    }).join('');
    const moreEnv = globalEnvVars.length > 10
      ? `<div class="smc-more">+${globalEnvVars.length - 10} more variables</div>` : '';
    const shownGlobalSecrets = globalSecrets.slice(0, 6);
    const secretCap = describeCollectionCap(globalSecrets, shownGlobalSecrets);
    const secretChips = shownGlobalSecrets.map((s) =>
      `<span class="smc-chip">${esc(typeof s === 'string' ? s : (s.name || JSON.stringify(s)))}</span>`
    ).join('');
    globalHtml = `<div class="smc-sec"><h3>Global Job Config</h3>
      <div class="smc-card">
        ${envRows}${moreEnv}
        ${secretChips ? `<div style="margin-top:6px;">${secretChips}<div class="smc-more">${secretCap.label}</div></div>` : ''}
      </div></div>`;
  }

  // --- Blocks ---
  const blocksHtml = blocks.length
    ? `<div class="smc-sec"><h3>Blocks (${blockCap.label})</h3>
        ${blocks.map((block) => {
          const blockName = block.name || '(unnamed block)';
          const task = block.task || {};
          const jobs = Array.isArray(task.jobs) ? task.jobs.slice(0, 3) : [];
          const moreJobs = (task.jobs || []).length > 3
            ? `<div class="smc-more">+${task.jobs.length - 3} more jobs</div>` : '';
          const agentOverride = task.agent?.machine?.type;
          const agentOverrideHtml = agentOverride
            ? `<span class="smc-chip machine" style="font-size:10px;">${esc(agentOverride)}</span>` : '';
          const jobsHtml = jobs.map((job) => {
            const jName = job.name || '(job)';
            const cmds = Array.isArray(job.commands) ? job.commands : [];
            const firstCmd = cmds[0] ? String(cmds[0]).slice(0, 50) + (cmds[0].length > 50 ? '…' : '') : '';
            return `<div class="smc-job">
              <span class="smc-job-name">${esc(jName)}</span>
              ${firstCmd ? `<span class="smc-cmd">$ ${esc(firstCmd)}</span>` : ''}
            </div>`;
          }).join('');
          return `<div class="smc-card">
            <div class="smc-block-name">${esc(blockName)} ${agentOverrideHtml}</div>
            ${jobsHtml}${moreJobs}
          </div>`;
        }).join('')}
      </div>`
    : '';

  // --- Promotions ---
  const promotionsHtml = promotions.length
    ? `<div class="smc-sec"><h3>Promotions (${promotions.length})</h3>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${promotions.map((p) => {
            const pName = p.name || '(promotion)';
            const pWhen = p.auto_promote_on ? 'auto' : (p.when || '');
            return `<div class="smc-chip promo">${esc(pName)}${pWhen ? ` · <em>${esc(pWhen)}</em>` : ''}</div>`;
          }).join('')}
        </div>
      </div>`
    : '';

  // --- Summary subtitle ---
  const subParts = [
    version ? `v${version.replace(/^v/, '')}` : null,
    allBlocks.length ? `${allBlocks.length} block${allBlocks.length !== 1 ? 's' : ''}` : null,
    promotions.length ? `${promotions.length} promotion${promotions.length !== 1 ? 's' : ''}` : null,
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'semaphorecfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="smc-title"><span class="smc-badge">Semaphore</span>${esc(name || 'Semaphore CI Pipeline')}</div>
<div class="smc-sub">${esc(subParts.join(' · ') || 'Semaphore CI configuration')}</div>
${agentHtml}${globalHtml}${blocksHtml}${promotionsHtml}`;

  return { parentNode: host };
}
