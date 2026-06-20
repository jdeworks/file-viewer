const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sftpgo-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sftpgo-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1565c0;color:#fff;vertical-align:middle;margin-right:8px;}
.sftpgo-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.sftpgo-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.sftpgo-sec{margin:12px 0;}
.sftpgo-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.sftpgo-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.sftpgo-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.sftpgo-key{color:var(--fg-2,#888);font-size:12px;min-width:220px;flex-shrink:0;}
.sftpgo-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.sftpgo-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.sftpgo-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.sftpgo-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.sftpgo-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.sftpgo-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="sftpgo-chip${cls ? ' sftpgo-chip-' + cls : ''}">${esc(String(val))}</span>`;
}

function masked() {
  return '<span class="sftpgo-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="sftpgo-row"><span class="sftpgo-key">${esc(label)}</span><span class="sftpgo-val">${html}</span></div>`;
}

function boolChip(v) {
  if (v === true || v === 'true' || v === 1) return chip('true', 'green');
  if (v === false || v === 'false' || v === 0) return chip('false', 'gray');
  return chip(String(v), 'gray');
}

function isSensitive(key) {
  return /secret|password|passwd|token|api[_-]?key|private/i.test(key);
}

function bindingsSummary(bindings) {
  if (!Array.isArray(bindings) || !bindings.length) return '';
  return bindings.map((b) => {
    const addr = b.address != null ? String(b.address) : '';
    const port = b.port != null ? String(b.port) : '';
    return addr || port ? `${addr}:${port}` : null;
  }).filter(Boolean).join(', ');
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'sftpgo-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  let cfg = {};
  try { cfg = intake.parsed || JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const dp = cfg.data_provider || {};
  const sftpd = cfg.sftpd || {};
  const httpd = cfg.httpd || {};
  const ftpd = cfg.ftpd || {};
  const webdavd = cfg.webdavd || {};
  const telemetry = cfg.telemetry || {};
  const common = cfg.common || {};

  // Build subtitle
  const dpDriver = dp.driver || '';
  const sftpdSummary = bindingsSummary(sftpd.bindings);
  const httpdSummary = bindingsSummary(httpd.bindings);
  const subParts = [dpDriver && `db:${dpDriver}`, sftpdSummary && `sftp:${sftpdSummary}`, httpdSummary && `http:${httpdSummary}`].filter(Boolean);

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="sftpgo-badge">SFTPGo</span>
      <span class="sftpgo-title">SFTPGo Config</span>
    </div>
    <div class="sftpgo-sub">${esc(subParts.join(' · ') || 'SFTP/FTP/WebDAV server configuration')}</div>
  `;
  host.appendChild(header);

  let body = '';

  // Data Provider
  const dpRows = [
    dpDriver ? row('data_provider.driver', chip(dpDriver, 'blue')) : '',
    dp.host ? row('data_provider.host', esc(String(dp.host))) : '',
    dp.port != null ? row('data_provider.port', chip(String(dp.port), 'blue')) : '',
    dp.name ? row('data_provider.name', esc(String(dp.name))) : '',
    dp.username ? row('data_provider.username', esc(String(dp.username))) : '',
    dp.password != null && dp.password !== '' ? row('data_provider.password', masked()) : '',
  ].filter(Boolean).join('');
  if (dpRows) body += `<div class="sftpgo-sec"><h3>Data Provider</h3><div class="sftpgo-card">${dpRows}</div></div>`;

  // SFTP
  if (sftpd.bindings && sftpd.bindings.length) {
    let sftpRows = '';
    for (let i = 0; i < sftpd.bindings.length; i++) {
      const b = sftpd.bindings[i];
      const prefix = sftpd.bindings.length > 1 ? `sftpd.bindings[${i}].` : 'sftpd.bindings[0].';
      if (b.address != null) sftpRows += row(prefix + 'address', esc(String(b.address)));
      if (b.port != null) sftpRows += row(prefix + 'port', chip(String(b.port), 'blue'));
      if (b.apply_proxy_config != null) sftpRows += row(prefix + 'apply_proxy_config', boolChip(b.apply_proxy_config));
    }
    const kexAlgos = Array.isArray(sftpd.key_exchange_algorithms) ? sftpd.key_exchange_algorithms : [];
    if (kexAlgos.length) {
      sftpRows += row('key_exchange_algorithms', kexAlgos.map((a) => chip(a)).join(''));
    }
    if (sftpRows) body += `<div class="sftpgo-sec"><h3>SFTP</h3><div class="sftpgo-card">${sftpRows}</div></div>`;
  }

  // FTP
  if (ftpd.bindings && ftpd.bindings.length) {
    let ftpRows = '';
    for (let i = 0; i < ftpd.bindings.length; i++) {
      const b = ftpd.bindings[i];
      const prefix = ftpd.bindings.length > 1 ? `ftpd.bindings[${i}].` : 'ftpd.bindings[0].';
      if (b.address != null) ftpRows += row(prefix + 'address', esc(String(b.address)));
      if (b.port != null) ftpRows += row(prefix + 'port', chip(String(b.port), 'blue'));
    }
    if (ftpd.banner) ftpRows += row('ftpd.banner', esc(String(ftpd.banner)));
    if (ftpRows) body += `<div class="sftpgo-sec"><h3>FTP</h3><div class="sftpgo-card">${ftpRows}</div></div>`;
  }

  // HTTP
  if (httpd.bindings && httpd.bindings.length) {
    let httpRows = '';
    for (let i = 0; i < httpd.bindings.length; i++) {
      const b = httpd.bindings[i];
      const prefix = httpd.bindings.length > 1 ? `httpd.bindings[${i}].` : 'httpd.bindings[0].';
      if (b.address != null) httpRows += row(prefix + 'address', esc(String(b.address)));
      if (b.port != null) httpRows += row(prefix + 'port', chip(String(b.port), 'blue'));
      if (b.enable_web_admin != null) httpRows += row(prefix + 'enable_web_admin', boolChip(b.enable_web_admin));
      if (b.enable_web_client != null) httpRows += row(prefix + 'enable_web_client', boolChip(b.enable_web_client));
    }
    if (httpRows) body += `<div class="sftpgo-sec"><h3>HTTP</h3><div class="sftpgo-card">${httpRows}</div></div>`;
  }

  // WebDAV
  if (webdavd.bindings && webdavd.bindings.length) {
    let webdavRows = '';
    for (let i = 0; i < webdavd.bindings.length; i++) {
      const b = webdavd.bindings[i];
      const prefix = webdavd.bindings.length > 1 ? `webdavd.bindings[${i}].` : 'webdavd.bindings[0].';
      if (b.address != null) webdavRows += row(prefix + 'address', esc(String(b.address)));
      if (b.port != null) webdavRows += row(prefix + 'port', chip(String(b.port), 'blue'));
    }
    if (webdavRows) body += `<div class="sftpgo-sec"><h3>WebDAV</h3><div class="sftpgo-card">${webdavRows}</div></div>`;
  }

  // Telemetry
  const telRows = [
    telemetry.bind_address != null ? row('telemetry.bind_address', esc(String(telemetry.bind_address))) : '',
    telemetry.bind_port != null ? row('telemetry.bind_port', chip(String(telemetry.bind_port), 'blue')) : '',
  ].filter(Boolean).join('');
  if (telRows) body += `<div class="sftpgo-sec"><h3>Telemetry</h3><div class="sftpgo-card">${telRows}</div></div>`;

  // Common
  const commonRows = [
    common.max_total_connections != null ? row('common.max_total_connections', chip(String(common.max_total_connections), 'gray')) : '',
    common.max_per_host_connections != null ? row('common.max_per_host_connections', chip(String(common.max_per_host_connections), 'gray')) : '',
  ].filter(Boolean).join('');
  if (commonRows) body += `<div class="sftpgo-sec"><h3>Common</h3><div class="sftpgo-card">${commonRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No SFTPGo configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
