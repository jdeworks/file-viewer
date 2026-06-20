import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const CSS = `
.zitadel-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-zitadel{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a1a2e;color:#fff;vertical-align:middle;margin-right:8px}
.zitadel-title{font-size:18px;font-weight:700;margin:0 0 4px}
.zitadel-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.zitadel-sec{margin:14px 0}
.zitadel-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.zitadel-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff)}
.zitadel-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.zitadel-kv-k{color:var(--fg-2,#888);min-width:200px;flex-shrink:0}
.zitadel-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.zitadel-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);letter-spacing:2px}
.zitadel-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;font-family:ui-monospace,monospace;font-weight:600;margin:1px}
.zitadel-chip.on{background:#dcfce7;border:1px solid #86efac;color:#166534}
.zitadel-chip.off{background:#fef2f2;border:1px solid #fca5a5;color:#991b1b}
.zitadel-chip.info{background:#eff6ff;border:1px solid #93c5fd;color:#1e40af}
`;

function chip(val, cls) {
  return `<span class="zitadel-chip ${cls}">${esc(val)}</span>`;
}

function boolChip(val, labelOn, labelOff) {
  return chip(val ? labelOn : labelOff, val ? 'on' : 'off');
}

function isSensitiveKey(k) {
  return /secret|password|token|key|api|private/i.test(String(k));
}

function dbSection(prefix, db, label) {
  if (!db || typeof db !== 'object') return '';
  const user = db.User || {};
  const admin = db.Admin || {};
  const rows = [
    db.Host != null ? `<div class="zitadel-kv"><span class="zitadel-kv-k">${esc(label)}.Host</span><span class="zitadel-kv-v">${esc(db.Host)}</span></div>` : '',
    db.Port != null ? `<div class="zitadel-kv"><span class="zitadel-kv-k">${esc(label)}.Port</span><span class="zitadel-kv-v">${esc(db.Port)}</span></div>` : '',
    db.Database != null ? `<div class="zitadel-kv"><span class="zitadel-kv-k">${esc(label)}.Database</span><span class="zitadel-kv-v">${esc(db.Database)}</span></div>` : '',
    user.Username != null ? `<div class="zitadel-kv"><span class="zitadel-kv-k">${esc(label)}.User.Username</span><span class="zitadel-kv-v">${esc(user.Username)}</span></div>` : '',
    user.Password != null ? `<div class="zitadel-kv"><span class="zitadel-kv-k">${esc(label)}.User.Password</span><span class="zitadel-masked">[configured]</span></div>` : '',
    admin.Username != null ? `<div class="zitadel-kv"><span class="zitadel-kv-k">${esc(label)}.Admin.Username</span><span class="zitadel-kv-v">${esc(admin.Username)}</span></div>` : '',
    admin.Password != null ? `<div class="zitadel-kv"><span class="zitadel-kv-k">${esc(label)}.Admin.Password</span><span class="zitadel-masked">[configured]</span></div>` : '',
  ].filter(Boolean).join('');
  return rows ? `<div class="zitadel-sec"><h3>Database — ${esc(label)}</h3><div class="zitadel-card">${rows}</div></div>` : '';
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const tls = cfg.TLS || {};
  const log = cfg.Log || {};
  const db = cfg.Database || {};
  const firstInstance = cfg.FirstInstance || null;
  const firstOrg = (firstInstance && firstInstance.Org) ? firstInstance.Org : null;
  const firstHuman = (firstOrg && firstOrg.Human) ? firstOrg.Human : null;

  const subParts = [
    cfg.ExternalDomain ? cfg.ExternalDomain : null,
    cfg.ExternalPort ? `:${cfg.ExternalPort}` : null,
    cfg.ExternalSecure === false ? 'HTTP' : cfg.ExternalSecure === true ? 'HTTPS' : null,
    log.Level ? `log: ${log.Level}` : null,
  ].filter(Boolean).join(' · ');

  // External section
  const extRows = [
    cfg.ExternalDomain != null ? `<div class="zitadel-kv"><span class="zitadel-kv-k">ExternalDomain</span><span class="zitadel-kv-v">${esc(cfg.ExternalDomain)}</span></div>` : '',
    cfg.ExternalPort != null ? `<div class="zitadel-kv"><span class="zitadel-kv-k">ExternalPort</span><span class="zitadel-kv-v">${esc(cfg.ExternalPort)}</span></div>` : '',
    cfg.ExternalSecure != null ? `<div class="zitadel-kv"><span class="zitadel-kv-k">ExternalSecure</span><span class="zitadel-kv-v">${boolChip(cfg.ExternalSecure, 'HTTPS', 'HTTP')}</span></div>` : '',
  ].filter(Boolean).join('');
  const extHtml = extRows ? `<div class="zitadel-sec"><h3>External</h3><div class="zitadel-card">${extRows}</div></div>` : '';

  // TLS section
  const tlsRows = [
    tls.Enabled != null ? `<div class="zitadel-kv"><span class="zitadel-kv-k">TLS.Enabled</span><span class="zitadel-kv-v">${boolChip(tls.Enabled, 'enabled', 'disabled')}</span></div>` : '',
    tls.Domain != null ? `<div class="zitadel-kv"><span class="zitadel-kv-k">TLS.Domain</span><span class="zitadel-kv-v">${esc(tls.Domain)}</span></div>` : '',
    tls.CertPath != null ? `<div class="zitadel-kv"><span class="zitadel-kv-k">TLS.CertPath</span><span class="zitadel-kv-v">${esc(tls.CertPath)}</span></div>` : '',
    tls.KeyPath != null ? `<div class="zitadel-kv"><span class="zitadel-kv-k">TLS.KeyPath</span><span class="zitadel-kv-v">${esc(tls.KeyPath)}</span></div>` : '',
  ].filter(Boolean).join('');
  const tlsHtml = tlsRows ? `<div class="zitadel-sec"><h3>TLS</h3><div class="zitadel-card">${tlsRows}</div></div>` : '';

  // Database sections
  const pgHtml = dbSection('postgres', db.postgres, 'PostgreSQL');
  const crHtml = dbSection('cockroach', db.cockroach, 'CockroachDB');

  // Machine Key section
  const mkHtml = cfg.MachineKeyPath != null ? `<div class="zitadel-sec"><h3>Machine Key</h3><div class="zitadel-card">
<div class="zitadel-kv"><span class="zitadel-kv-k">MachineKeyPath</span><span class="zitadel-kv-v">${esc(cfg.MachineKeyPath)}</span></div>
</div></div>` : '';

  // Log section
  const logHtml = log.Level != null ? `<div class="zitadel-sec"><h3>Log</h3><div class="zitadel-card">
<div class="zitadel-kv"><span class="zitadel-kv-k">Log.Level</span><span class="zitadel-kv-v">${chip(log.Level, 'info')}</span></div>
</div></div>` : '';

  // Port section
  const portHtml = cfg.Port != null ? `<div class="zitadel-sec"><h3>Port</h3><div class="zitadel-card">
<div class="zitadel-kv"><span class="zitadel-kv-k">Port</span><span class="zitadel-kv-v">${esc(cfg.Port)}</span></div>
</div></div>` : '';

  // FirstInstance section
  let fiHtml = '';
  if (firstInstance) {
    const fiRows = [
      firstOrg && firstOrg.Name != null ? `<div class="zitadel-kv"><span class="zitadel-kv-k">Org.Name</span><span class="zitadel-kv-v">${esc(firstOrg.Name)}</span></div>` : '',
      firstHuman && firstHuman.UserName != null ? `<div class="zitadel-kv"><span class="zitadel-kv-k">Org.Human.UserName</span><span class="zitadel-kv-v">${esc(firstHuman.UserName)}</span></div>` : '',
      firstHuman && firstHuman.Password != null ? `<div class="zitadel-kv"><span class="zitadel-kv-k">Org.Human.Password</span><span class="zitadel-masked">[configured]</span></div>` : '',
    ].filter(Boolean).join('');
    fiHtml = fiRows ? `<div class="zitadel-sec"><h3>FirstInstance</h3><div class="zitadel-card">${fiRows}</div></div>` : '';
  }

  const host = document.createElement('div');
  host.className = 'zitadel-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px">
  <span class="badge-zitadel">ZITADEL</span>
  <span class="zitadel-title">${esc(cfg.ExternalDomain || 'ZITADEL Config')}</span>
</div>
<div class="zitadel-sub">${esc(subParts)}</div>
${extHtml}${tlsHtml}${pgHtml}${crHtml}${mkHtml}${logHtml}${portHtml}${fiHtml}`;
  return { parentNode: host };
}
