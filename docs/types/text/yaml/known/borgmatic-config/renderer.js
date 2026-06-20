import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.borgmatic-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.borg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2196F3;color:#fff;vertical-align:middle;margin-right:8px}
.borg-title{font-size:18px;font-weight:700;margin:0 0 4px}
.borg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.borg-sec{margin:12px 0}
.borg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.borg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.borg-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.borg-row:last-child{border-bottom:none}
.borg-key{color:var(--fg-2,#888);min-width:160px;flex-shrink:0;font-size:12px}
.borg-val{font-family:ui-monospace,monospace;word-break:break-all}
.borg-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 3px 2px 0}
.borg-pill.repo{background:#e3f2fd;border-color:#90caf9;color:#1565c0}
.borg-pill.dir{background:#f3e5f5;border-color:#ce93d8;color:#6a1b9a}
.borg-tag{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;font-weight:600;margin-left:6px;background:#e3f2fd;border:1px solid #90caf9;color:#1565c0}
`;

const row = (k, v) => v != null && v !== '' ? `<div class="borg-row"><span class="borg-key">${esc(k)}</span><span class="borg-val">${esc(String(v))}</span></div>` : '';
const masked = (k) => `<div class="borg-row"><span class="borg-key">${esc(k)}</span><span class="borg-val" style="color:var(--fg-2,#888);font-style:italic">[configured]</span></div>`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  // Source directories
  const sourceDirs = Array.isArray(cfg.source_directories) ? cfg.source_directories : [];
  const sourceDirsHtml = sourceDirs.length ? `
<div class="borg-sec"><h3>Source Directories (${sourceDirs.length})</h3>
<div class="borg-card">${sourceDirs.map((d) => `<span class="borg-pill dir">${esc(d)}</span>`).join('')}</div>
</div>` : '';

  // Repositories
  const repos = Array.isArray(cfg.repositories) ? cfg.repositories : [];
  const reposHtml = repos.length ? `
<div class="borg-sec"><h3>Repositories (${repos.length})</h3>
${repos.map((r) => {
    const path = typeof r === 'string' ? r : (r.path || '');
    const label = typeof r === 'object' ? (r.label || '') : '';
    return `<div class="borg-card">
${row('path', path)}
${label ? row('label', label) : ''}
</div>`;
  }).join('')}
</div>` : '';

  // Retention
  const retention = cfg.retention || {};
  const retentionRows = [
    row('keep_hourly', retention.keep_hourly),
    row('keep_daily', retention.keep_daily),
    row('keep_weekly', retention.keep_weekly),
    row('keep_monthly', retention.keep_monthly),
    row('keep_yearly', retention.keep_yearly),
    row('archive_name_format', cfg.archive_name_format || retention.archive_name_format),
    row('prefix', retention.prefix),
  ].filter(Boolean).join('');
  const retentionHtml = retentionRows ? `
<div class="borg-sec"><h3>Retention Policy</h3>
<div class="borg-card">${retentionRows}</div>
</div>` : '';

  // Archive name format (top-level)
  const archiveFmt = cfg.archive_name_format;
  const archiveFmtHtml = archiveFmt && !retention.archive_name_format ? `
<div class="borg-sec"><h3>Archive Name Format</h3>
<div class="borg-card">${row('archive_name_format', archiveFmt)}</div>
</div>` : '';

  // Consistency checks
  const checks = Array.isArray(cfg.consistency?.checks) ? cfg.consistency.checks
    : Array.isArray(cfg.checks) ? cfg.checks : [];
  const checksHtml = checks.length ? `
<div class="borg-sec"><h3>Consistency Checks</h3>
<div class="borg-card">${checks.map((c) => {
    const name = typeof c === 'string' ? c : (c.name || c.type || JSON.stringify(c));
    return `<span class="borg-pill">${esc(name)}</span>`;
  }).join('')}</div>
</div>` : '';

  // Security — mask encryption passphrases
  const enc = cfg.encryption_passphrase || cfg.passphrase;
  const encHtml = enc != null ? `
<div class="borg-sec"><h3>Encryption</h3>
<div class="borg-card">${masked('encryption_passphrase')}</div>
</div>` : '';

  // Also check storage/encryption block
  const storageEnc = cfg.storage?.encryption_passphrase || cfg.storage?.passphrase;
  const storageEncHtml = storageEnc != null ? `
<div class="borg-sec"><h3>Storage / Encryption</h3>
<div class="borg-card">${masked('encryption_passphrase')}</div>
</div>` : '';

  // Hooks
  const hooks = cfg.hooks || {};
  const beforeBackup = Array.isArray(hooks.before_backup) ? hooks.before_backup : [];
  const afterBackup = Array.isArray(hooks.after_backup) ? hooks.after_backup : [];
  const onError = Array.isArray(hooks.on_error) ? hooks.on_error : [];
  const hooksHtml = (beforeBackup.length || afterBackup.length || onError.length) ? `
<div class="borg-sec"><h3>Hooks</h3>
<div class="borg-card">
${beforeBackup.length ? row('before_backup', `${beforeBackup.length} command${beforeBackup.length !== 1 ? 's' : ''}`) : ''}
${afterBackup.length ? row('after_backup', `${afterBackup.length} command${afterBackup.length !== 1 ? 's' : ''}`) : ''}
${onError.length ? row('on_error', `${onError.length} command${onError.length !== 1 ? 's' : ''}`) : ''}
</div></div>` : '';

  const subParts = [
    sourceDirs.length ? `${sourceDirs.length} source dir${sourceDirs.length !== 1 ? 's' : ''}` : '',
    repos.length ? `${repos.length} repo${repos.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'borgmatic-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px">
  <span class="borg-badge">borgmatic</span>
  <span class="borg-title">Backup Configuration</span>
  ${repos.length ? `<span class="borg-tag">${repos.length} repo${repos.length !== 1 ? 's' : ''}</span>` : ''}
</div>
<div class="borg-sub">${esc(subParts.join(' · '))}</div>
${sourceDirsHtml}${reposHtml}${retentionHtml}${archiveFmtHtml}${checksHtml}${encHtml}${storageEncHtml}${hooksHtml}`;
  return { parentNode: host };
}
