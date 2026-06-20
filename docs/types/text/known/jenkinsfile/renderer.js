const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.jenkinsfile-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-jkf{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#d24939;color:#fff;vertical-align:middle;margin-right:8px}
.jkf-title{font-size:18px;font-weight:700;margin:0 0 4px}
.jkf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.jkf-sec{margin:12px 0}
.jkf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.jkf-pills{display:flex;flex-wrap:wrap;gap:6px}
.jkf-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0)}
.jkf-pill.stage{background:#fff7ed;border-color:#fed7aa;color:#9a3412}
.jkf-pill.env{background:#f0fdf4;border-color:#86efac;color:#14532d;font-family:ui-monospace,monospace}
.jkf-pill.agent{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
.jkf-stage{padding:6px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:4px 0;font-size:13px;display:flex;align-items:center;gap:8px}
.jkf-kind{font-size:11px;color:var(--fg-2,#888);margin-left:auto}
`;

/**
 * Parse a Jenkinsfile (declarative or scripted Groovy DSL) using regex heuristics.
 * Returns { pipelineType, agent, stages, envVars, postConditions }.
 */
function parseJenkinsfile(text) {
  const lines = text.split('\n');

  // Determine pipeline type
  const isDeclarative = /^\s*pipeline\s*\{/m.test(text);

  // Agent — declarative: agent { ... } or agent any/none
  let agent = null;
  const agentMatch = text.match(/^\s*agent\s+([^\n{]+)/m);
  if (agentMatch) {
    const raw = agentMatch[1].trim();
    if (raw === 'any' || raw === 'none') {
      agent = raw;
    } else {
      // agent { docker 'image' } or agent { label '...' }
      const dockerM = text.match(/docker\s+['"]([^'"]+)['"]/);
      const labelM = text.match(/label\s+['"]([^'"]+)['"]/);
      if (dockerM) agent = `docker: ${dockerM[1]}`;
      else if (labelM) agent = `label: ${labelM[1]}`;
      else agent = 'custom';
    }
  }

  // Stage names — both declarative `stage('Name')` and scripted `stage 'Name'`
  const stageSet = new Set();
  const stageRe = /\bstage\s*\(\s*['"]([^'"]+)['"]\s*\)|\bstage\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = stageRe.exec(text)) !== null) {
    stageSet.add(m[1] || m[2]);
  }
  const stages = [...stageSet];

  // Environment variables — env block keys
  const envVars = [];
  const envBlockMatch = text.match(/\benv(?:ironment)?\s*\{([^}]*)\}/s);
  if (envBlockMatch) {
    const envContent = envBlockMatch[1];
    const envLineRe = /^\s*([A-Z_][A-Z0-9_]*)\s*=/gm;
    let em;
    while ((em = envLineRe.exec(envContent)) !== null) {
      envVars.push(em[1]);
    }
  }

  // Post conditions
  const postConditions = [];
  const postRe = /\b(always|success|failure|unstable|aborted|changed|cleanup|regression|fixed)\s*\{/g;
  while ((m = postRe.exec(text)) !== null) {
    if (!postConditions.includes(m[1])) postConditions.push(m[1]);
  }

  return { isDeclarative, agent, stages, envVars, postConditions };
}

export function render(intake) {
  const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
  const { isDeclarative, agent, stages, envVars, postConditions } = parseJenkinsfile(text);

  const pipelineKind = isDeclarative ? 'Declarative' : 'Scripted';

  const subParts = [
    pipelineKind,
    stages.length ? `${stages.length} stage${stages.length !== 1 ? 's' : ''}` : '',
    agent ? `agent: ${agent}` : '',
  ].filter(Boolean);

  const agentHtml = agent
    ? `<div class="jkf-sec"><h3>Agent</h3><div class="jkf-pills"><span class="jkf-pill agent">${esc(agent)}</span></div></div>`
    : '';

  const stagesHtml = stages.length
    ? `<div class="jkf-sec"><h3>Stages (${stages.length})</h3>
        ${stages.slice(0, 12).map((s) => `<div class="jkf-stage"><span class="jkf-pill stage">${esc(s)}</span></div>`).join('')}
        ${stages.length > 12 ? `<div style="font-size:12px;color:var(--fg-2,#888)">…and ${stages.length - 12} more</div>` : ''}
      </div>`
    : '';

  const envHtml = envVars.length
    ? `<div class="jkf-sec"><h3>Environment Variables (${envVars.length})</h3><div class="jkf-pills">${envVars.slice(0, 8).map((v) => `<span class="jkf-pill env">${esc(v)}</span>`).join('')}${envVars.length > 8 ? `<span class="jkf-pill">+${envVars.length - 8}</span>` : ''}</div></div>`
    : '';

  const postHtml = postConditions.length
    ? `<div class="jkf-sec"><h3>Post Conditions</h3><div class="jkf-pills">${postConditions.map((c) => `<span class="jkf-pill">${esc(c)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'jenkinsfile-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="jkf-title"><span class="badge-jkf">Jenkins</span>Jenkinsfile</div>
<div class="jkf-sub">${esc(subParts.join(' · ')) || 'Jenkins pipeline'}</div>
${agentHtml}${stagesHtml}${envHtml}${postHtml}`;
  return { parentNode: host };
}
