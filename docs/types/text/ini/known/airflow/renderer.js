import { parseIni } from '../../renderer.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.airflowcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-airflow{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#017CEE;color:#fff;vertical-align:middle;margin-right:8px;}
.airflow-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.airflow-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.airflow-sec{margin:14px 0;}
.airflow-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.airflow-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.airflow-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.airflow-kv-k{color:var(--fg-2,#888);min-width:200px;flex-shrink:0;font:12px/1.6 ui-monospace,monospace;}
.airflow-kv-v{font:12px/1.6 ui-monospace,monospace;word-break:break-all;}
.airflow-masked{color:var(--fg-2,#888);font-style:italic;}
.airflow-chip{display:inline-block;font-size:11px;padding:2px 9px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
`;

const SECRET_PATTERN = /password|secret|key|token|conn_string|conn\b/i;

function masked() {
  return `<span class="airflow-masked">[configured]</span>`;
}

function kv(label, value, isSecret = false) {
  if (value == null || value === '') return '';
  const display = isSecret ? masked() : `<span class="airflow-kv-v">${esc(value)}</span>`;
  return `<div class="airflow-kv"><span class="airflow-kv-k">${esc(label)}</span>${display}</div>`;
}

function sectionMap(sections) {
  const m = {};
  for (const s of sections) {
    const key = (s.name || '').toLowerCase();
    const pairs = {};
    for (const p of s.pairs) {
      const k = p.key.toLowerCase();
      pairs[k] = p.value;
    }
    m[key] = pairs;
  }
  return m;
}

function isSecret(key) {
  return SECRET_PATTERN.test(key);
}

export function render(intake) {
  const sections = parseIni(intake.text || '');
  const cfg = sectionMap(sections);

  // [core]
  const core = cfg['core'] || {};
  const executor = core['executor'] || '';
  const dagsFolder = core['dags_folder'] || '';
  const parallelism = core['parallelism'] || '';
  const maxActiveRuns = core['max_active_runs_per_dag'] || '';
  const loadExamples = core['load_examples'] || '';
  const coreHtml = (executor || dagsFolder || parallelism || maxActiveRuns || loadExamples) ? `
<div class="airflow-sec"><h3>Core</h3><div class="airflow-card">
${kv('executor', executor)}
${kv('dags_folder', dagsFolder)}
${kv('parallelism', parallelism)}
${kv('max_active_runs_per_dag', maxActiveRuns)}
${kv('load_examples', loadExamples)}
</div></div>` : '';

  // [database]
  const db = cfg['database'] || {};
  const sqlConn = db['sql_alchemy_conn'] || '';
  const poolSize = db['sql_alchemy_pool_size'] || '';
  const dbHtml = (sqlConn || poolSize) ? `
<div class="airflow-sec"><h3>Database</h3><div class="airflow-card">
${sqlConn ? kv('sql_alchemy_conn', sqlConn, true) : ''}
${kv('sql_alchemy_pool_size', poolSize)}
</div></div>` : '';

  // [webserver]
  const web = cfg['webserver'] || {};
  const webHost = web['web_server_host'] || '';
  const webPort = web['web_server_port'] || '';
  const webWorkers = web['workers'] || '';
  const webSecret = web['secret_key'] || '';
  const webHtml = (webHost || webPort || webWorkers || webSecret) ? `
<div class="airflow-sec"><h3>Webserver</h3><div class="airflow-card">
${kv('web_server_host', webHost)}
${kv('web_server_port', webPort)}
${kv('workers', webWorkers)}
${webSecret ? kv('secret_key', webSecret, true) : ''}
</div></div>` : '';

  // [scheduler]
  const sched = cfg['scheduler'] || {};
  const heartbeat = sched['scheduler_heartbeat_sec'] || '';
  const runDuration = sched['run_duration'] || '';
  const maxThreads = sched['max_threads'] || '';
  const schedHtml = (heartbeat || runDuration || maxThreads) ? `
<div class="airflow-sec"><h3>Scheduler</h3><div class="airflow-card">
${kv('scheduler_heartbeat_sec', heartbeat)}
${kv('run_duration', runDuration)}
${kv('max_threads', maxThreads)}
</div></div>` : '';

  // [smtp]
  const smtp = cfg['smtp'] || {};
  const smtpHost = smtp['smtp_host'] || '';
  const smtpPort = smtp['smtp_port'] || '';
  const smtpUser = smtp['smtp_user'] || '';
  const smtpPass = smtp['smtp_password'] || '';
  const smtpHtml = (smtpHost || smtpPort) ? `
<div class="airflow-sec"><h3>SMTP</h3><div class="airflow-card">
${kv('smtp_host', smtpHost)}
${kv('smtp_port', smtpPort)}
${kv('smtp_user', smtpUser)}
${smtpPass ? kv('smtp_password', smtpPass, true) : ''}
</div></div>` : '';

  // [kubernetes]
  const k8s = cfg['kubernetes'] || {};
  const k8sNs = k8s['namespace'] || '';
  const k8sRepo = k8s['worker_container_repository'] || '';
  const k8sHtml = (k8sNs || k8sRepo) ? `
<div class="airflow-sec"><h3>Kubernetes</h3><div class="airflow-card">
${kv('namespace', k8sNs)}
${kv('worker_container_repository', k8sRepo)}
</div></div>` : '';

  // Sub-summary
  const subParts = [];
  if (executor) subParts.push(`executor: ${executor}`);
  if (webPort) subParts.push(`webserver: :${webPort}`);
  if (dagsFolder) subParts.push(`dags: ${dagsFolder}`);
  const sub = subParts.join(' · ');

  const host = document.createElement('div');
  host.className = 'airflowcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-airflow">Airflow</span>
  <span class="airflow-title">Apache Airflow</span>
</div>
<div class="airflow-sub">${esc(sub || 'Apache Airflow configuration')}</div>
${coreHtml}${dbHtml}${webHtml}${schedHtml}${smtpHtml}${k8sHtml}`;

  return { parentNode: host };
}
