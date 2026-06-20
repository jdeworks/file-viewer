// Enhanced W&B settings viewer.
// Shows entity, project, mode (online/offline/disabled), base_url, tags.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wb-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-wb{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#FFBE00;color:#000;vertical-align:middle;margin-right:8px}
.wb-title{font-size:18px;font-weight:700;margin:0 0 4px}
.wb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.wb-sec{margin:14px 0}
.wb-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.wb-card{background:var(--bg,#fff);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:8px 0}
.wb-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.wb-row:last-child{border-bottom:none}
.wb-key{color:var(--fg-2,#888);min-width:130px;flex-shrink:0;font-size:12px}
.wb-val{font-family:ui-monospace,monospace;word-break:break-all}
.wb-mode{display:inline-block;font-size:11px;font-weight:700;padding:2px 9px;border-radius:8px}
.wb-mode.online{background:#e8f5e9;border:1px solid #81c784;color:#1b5e20}
.wb-mode.offline{background:#fff3e0;border:1px solid #ffb74d;color:#e65100}
.wb-mode.disabled{background:#fce4ec;border:1px solid #ef9a9a;color:#b71c1c}
.wb-mode.other{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg,#24292f)}
`;

function parseIni(text) {
  const secs = {};
  let cur = null;
  for (const rawLine of (text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const sec = line.match(/^\[([^\]]+)\]/);
    if (sec) { cur = sec[1].trim(); secs[cur] = {}; continue; }
    if (cur) {
      const kv = line.match(/^([^=:]+)[=:](.*)/);
      if (kv) {
        const key = kv[1].trim().toLowerCase();
        const val = kv[2].trim();
        if (!(key in secs[cur])) secs[cur][key] = val;
      }
    }
  }
  return secs;
}

function modeChip(mode) {
  if (!mode) return '';
  const cls = mode === 'online' ? 'online' : mode === 'offline' ? 'offline' : mode === 'disabled' ? 'disabled' : 'other';
  return `<span class="wb-mode ${cls}">${esc(mode)}</span>`;
}

function row(label, value, asHtml = false) {
  if (value == null || value === '') return '';
  return `<div class="wb-row"><span class="wb-key">${esc(label)}</span><span class="wb-val">${asHtml ? value : esc(value)}</span></div>`;
}

export function render(intake) {
  const ini = parseIni(intake.text || '');

  // Try [default] or first section
  const section = ini['default'] || ini[Object.keys(ini)[0]] || {};

  const entity = section['entity'] || section['username'] || '';
  const project = section['project'] || '';
  const mode = section['mode'] || section['run_mode'] || '';
  const baseUrl = section['base_url'] || section['host'] || '';
  const runDir = section['run_dir'] || section['dir'] || '';
  const anonymous = section['anonymous'] || '';
  const tags = section['tags'] || '';
  const group = section['group'] || '';
  const jobType = section['job_type'] || '';

  const rows = [
    entity ? row('entity', entity) : '',
    project ? row('project', project) : '',
    mode ? row('mode', modeChip(mode), true) : '',
    baseUrl ? row('base_url', baseUrl) : '',
    group ? row('group', group) : '',
    jobType ? row('job_type', jobType) : '',
    anonymous ? row('anonymous', anonymous) : '',
    tags ? row('tags', tags) : '',
    runDir ? row('run_dir', runDir) : '',
  ].filter(Boolean).join('');

  const subtitle = [
    entity ? `entity: ${entity}` : '',
    project ? `project: ${project}` : '',
    mode ? `mode: ${mode}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'wb-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="wb-title"><span class="badge-wb">W&amp;B</span>Weights &amp; Biases Config</div>
<div class="wb-sub">W&amp;B client settings${subtitle ? ' — ' + esc(subtitle) : ''}</div>
${rows ? `<div class="wb-sec"><h3>Settings</h3><div class="wb-card">${rows}</div></div>` : '<div class="wb-sub">No settings found in this file.</div>'}`;
  return { parentNode: host };
}
