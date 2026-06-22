// Enhanced dagster.yaml / workspace.yaml viewer.
// dagster.yaml: shows storage, run/event log storage, compute log manager config.
// workspace.yaml: shows load_from entries (python_package, python_file, grpc_server).
import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dagster-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-dagster{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e040c1;color:#fff;vertical-align:middle;margin-right:8px}
.dagster-title{font-size:18px;font-weight:700;margin:0 0 4px}
.dagster-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.dagster-sec{margin:14px 0}
.dagster-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.dagster-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.dagster-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.dagster-row:last-child{border-bottom:none}
.dagster-key{color:var(--fg-2,#888);min-width:180px;flex-shrink:0;font-size:12px}
.dagster-val{font-family:ui-monospace,monospace;word-break:break-all}
.dagster-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:#fdf0fa;border:1px solid #e040c1;color:#c2185b;margin:2px 3px 2px 0;font-weight:600}
.dagster-loc{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px;background:var(--bg,#fff)}
.dagster-loc-title{font-size:13px;font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:8px}
.dagster-loc-type{font-size:10px;padding:1px 7px;border-radius:8px;background:#fdf0fa;border:1px solid #e040c1;color:#c2185b;font-weight:600;text-transform:uppercase;letter-spacing:.04em}
.dagster-loc-row{display:flex;gap:8px;font-size:12px;padding:2px 0;color:var(--fg-2,#888)}
.dagster-loc-key{min-width:140px;flex-shrink:0}
.dagster-loc-val{font-family:ui-monospace,monospace;color:var(--fg,#24292f);word-break:break-all}
.dagster-mod{font-family:ui-monospace,monospace;font-size:12px;background:#fdf0fa;border:1px solid #f8bbd9;border-radius:4px;padding:1px 6px;color:#c2185b}
.dagster-storage-key{font-size:12px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.03em;font-weight:600;margin-bottom:4px}
.dagster-storage-class{font-family:ui-monospace,monospace;font-size:13px;font-weight:700;color:#e040c1}
`;

function storageBlock(label, storageObj) {
  if (!storageObj || typeof storageObj !== 'object') return '';
  const keys = Object.keys(storageObj);
  if (!keys.length) return '';
  const mainKey = keys[0];
  const config = storageObj[mainKey] || {};
  const configRows = Object.entries(config).slice(0, 8).map(([k, v]) =>
    `<div class="dagster-row"><span class="dagster-key">${esc(k)}</span><span class="dagster-val">${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</span></div>`
  ).join('');
  return `<div class="dagster-sec"><h3>${esc(label)}</h3><div class="dagster-card">
    <div class="dagster-storage-key">module</div>
    <div class="dagster-storage-class">${esc(mainKey)}</div>
    ${configRows ? `<div style="margin-top:8px">${configRows}</div>` : ''}
  </div></div>`;
}

function codeLocationCard(entry) {
  if (!entry || typeof entry !== 'object') return '';
  const keys = Object.keys(entry);
  const locType = keys.find((k) => ['python_package', 'python_file', 'grpc_server', 'python_module'].includes(k)) || keys[0];
  const locCfg = entry[locType] || {};
  const packageName = locCfg.package_name || locCfg.module_name || '';
  const location = locCfg.location_name || locCfg.attribute || '';
  const workingDir = locCfg.working_directory || '';
  const host = locCfg.host || '';
  const port = locCfg.port;
  const fileName = locCfg.python_file || locCfg.file || '';

  const titleLabel = packageName || fileName || host || locType;

  const rows = [
    packageName ? `<div class="dagster-loc-row"><span class="dagster-loc-key">package / module</span><span class="dagster-loc-val dagster-mod">${esc(packageName)}</span></div>` : '',
    fileName ? `<div class="dagster-loc-row"><span class="dagster-loc-key">file</span><span class="dagster-loc-val dagster-mod">${esc(fileName)}</span></div>` : '',
    location ? `<div class="dagster-loc-row"><span class="dagster-loc-key">location name</span><span class="dagster-loc-val">${esc(location)}</span></div>` : '',
    workingDir ? `<div class="dagster-loc-row"><span class="dagster-loc-key">working_directory</span><span class="dagster-loc-val">${esc(workingDir)}</span></div>` : '',
    host ? `<div class="dagster-loc-row"><span class="dagster-loc-key">host</span><span class="dagster-loc-val">${esc(host)}</span></div>` : '',
    port != null ? `<div class="dagster-loc-row"><span class="dagster-loc-key">port</span><span class="dagster-loc-val">${esc(port)}</span></div>` : '',
  ].filter(Boolean).join('');

  return `<div class="dagster-loc">
    <div class="dagster-loc-title"><span class="dagster-mod">${esc(titleLabel)}</span><span class="dagster-loc-type">${esc(locType.replace(/_/g, ' '))}</span></div>
    ${rows}
  </div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch {
    cfg = intake.parsed || {};
  }

  const filename = (intake.filename || intake.name || 'dagster.yaml').split('/').pop().toLowerCase();
  // `load_from` (code locations) can live in workspace.yaml OR a dagster.yaml — drive the view by the
  // content, not just the filename, so a dagster.yaml that lists code locations still renders them.
  const loadFrom = Array.isArray(cfg.load_from) ? cfg.load_from : [];
  const showLocations = filename === 'workspace.yaml' || loadFrom.length > 0;

  const host = document.createElement('div');
  host.className = 'dagster-doc';

  if (showLocations) {
    // code-locations mode: show load_from entries
    const locationCards = loadFrom.map(codeLocationCard).join('');

    host.innerHTML = `<style>${CSS}</style>
<div class="dagster-title"><span class="badge-dagster">Dagster</span>${esc(filename)}</div>
<div class="dagster-sub">Dagster workspace — ${loadFrom.length} code location${loadFrom.length !== 1 ? 's' : ''}</div>
${loadFrom.length ? `<div class="dagster-sec"><h3>Code Locations (${loadFrom.length})</h3>${locationCards}</div>` : '<div class="dagster-sec"><div class="dagster-card"><em style="color:var(--fg-2,#888)">No load_from entries found</em></div></div>'}`;
  } else {
    // dagster.yaml mode: show instance configuration sections
    const storage = cfg.storage;
    const runStorage = cfg.run_storage;
    const eventLogStorage = cfg.event_log_storage;
    const scheduleStorage = cfg.schedule_storage;
    const computeLogManager = cfg.compute_log_manager;
    const runLauncher = cfg.run_launcher;
    const runCoordinator = cfg.run_coordinator;
    const telemetry = cfg.telemetry;

    const configuredSections = [
      storage && 'storage',
      runStorage && 'run_storage',
      eventLogStorage && 'event_log_storage',
      scheduleStorage && 'schedule_storage',
      computeLogManager && 'compute_log_manager',
      runLauncher && 'run_launcher',
      runCoordinator && 'run_coordinator',
    ].filter(Boolean);

    const sectionChips = configuredSections.map((s) => `<span class="dagster-chip">${esc(s)}</span>`).join('');

    const sectionsHtml = [
      storageBlock('Storage', storage),
      storageBlock('Run Storage', runStorage),
      storageBlock('Event Log Storage', eventLogStorage),
      storageBlock('Schedule Storage', scheduleStorage),
      storageBlock('Compute Log Manager', computeLogManager),
      storageBlock('Run Launcher', runLauncher),
      storageBlock('Run Coordinator', runCoordinator),
    ].filter(Boolean).join('');

    const telemetryRow = telemetry && typeof telemetry === 'object' && 'enabled' in telemetry
      ? `<div class="dagster-sec"><h3>Telemetry</h3><div class="dagster-card"><div class="dagster-row"><span class="dagster-key">enabled</span><span class="dagster-val">${esc(telemetry.enabled)}</span></div></div></div>`
      : '';

    host.innerHTML = `<style>${CSS}</style>
<div class="dagster-title"><span class="badge-dagster">Dagster</span>dagster.yaml</div>
<div class="dagster-sub">Dagster instance configuration</div>
${sectionChips ? `<div class="dagster-sec"><h3>Configured Sections</h3><div class="dagster-card">${sectionChips}</div></div>` : ''}
${sectionsHtml}
${telemetryRow}`;
  }

  return { parentNode: host };
}
