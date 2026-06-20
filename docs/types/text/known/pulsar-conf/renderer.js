// Enhanced Apache Pulsar standalone.conf / broker.conf viewer.
// Parses Java properties format (key=value, # comments) and shows:
// cluster, ports, BookKeeper settings, auth, TLS, and offload config.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SECRET_RE = /password|secret|credential|token|key(?:store)?(?:pass)?$/i;

const CSS = `
.pulsarconf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-pulsar{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#188FFF;color:#fff;vertical-align:middle;margin-right:8px;}
.pulsarconf-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pulsarconf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pulsarconf-tags{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px;}
.pulsarconf-tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg-2,#888);}
.pulsarconf-sec{margin:14px 0;}
.pulsarconf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.pulsarconf-kv{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0;}
.pulsarconf-kv-item{display:flex;gap:6px;align-items:baseline;font-size:12px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.pulsarconf-kv-item span:first-child{color:var(--fg-2,#888);}
.pulsarconf-kv-item span:last-child{font-family:ui-monospace,monospace;font-weight:600;}
.pulsarconf-kv-item.secret span:last-child{color:var(--fg-2,#888);font-style:italic;font-weight:400;}
.pulsarconf-port{color:var(--accent,#0969da);font-weight:700;}
.pulsarconf-list{list-style:none;margin:4px 0;padding:0;display:flex;flex-wrap:wrap;gap:6px;}
.pulsarconf-list li{font-family:ui-monospace,monospace;font-size:12px;padding:3px 8px;border-radius:5px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.pulsarconf-empty{color:var(--fg-2,#888);font-style:italic;font-size:13px;}
`;

function parseProps(text) {
  const props = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim();
    props[k] = v;
  }
  return props;
}

function get(props, key) {
  return props[key] ?? null;
}

export function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop() || 'standalone.conf';
  const props = parseProps(text);

  const maskSecret = (key, val) => (val && SECRET_RE.test(key)) ? '[configured]' : val;
  const kvItem = (label, val, key = '') => {
    if (val == null || val === '') return '';
    const masked = maskSecret(key, val);
    const isSecret = masked === '[configured]';
    return `<div class="pulsarconf-kv-item${isSecret ? ' secret' : ''}"><span>${esc(label)}</span><span>${esc(masked)}</span></div>`;
  };

  // Cluster
  const clusterName = get(props, 'clusterName');
  const zookeeperServers = get(props, 'zookeeperServers');
  const metadataStoreUrl = get(props, 'pulsarMetadataStoreUrl');

  // Ports
  const brokerPort = get(props, 'brokerServicePort');
  const webPort = get(props, 'webServicePort');
  const webPortTls = get(props, 'webServicePortTls');
  const brokerPortTls = get(props, 'brokerServicePortTls');

  // BookKeeper / storage
  const ensembleSize = get(props, 'managedLedgerDefaultEnsembleSize');
  const writeQuorum = get(props, 'managedLedgerDefaultWriteQuorum');
  const ackQuorum = get(props, 'managedLedgerDefaultAckQuorum');
  const journalDir = get(props, 'journalDirectory');
  const ledgerClass = get(props, 'ledgerStorageClass');

  // Auth
  const authEnabled = get(props, 'authenticationEnabled');
  const authzEnabled = get(props, 'authorizationEnabled');
  const authProviders = get(props, 'authenticationProviders');

  // TLS
  const tlsEnabled = get(props, 'tlsEnabled');
  const tlsCert = get(props, 'tlsCertificateFilePath');
  const tlsKey = get(props, 'tlsKeyFilePath');

  // Offload
  const offloadDriver = get(props, 'managedLedgerOffloadDriver');

  const hasTls = tlsEnabled === 'true' || tlsCert || tlsKey;
  const hasAuth = authEnabled || authzEnabled || authProviders;

  // Summary tags
  const tags = [];
  if (clusterName) tags.push(`cluster: ${clusterName}`);
  if (brokerPort) tags.push(`port ${brokerPort}`);
  if (authEnabled === 'true') tags.push('auth enabled');
  if (hasTls) tags.push('TLS');
  if (offloadDriver) tags.push(`offload: ${offloadDriver}`);

  let html = `<style>${CSS}</style>
<div class="pulsarconf-title"><span class="badge-pulsar">Apache Pulsar</span>${esc(filename)}</div>
<div class="pulsarconf-sub">Apache Pulsar broker configuration</div>`;

  if (tags.length) {
    html += `<div class="pulsarconf-tags">${tags.map((t) => `<span class="pulsarconf-tag">${esc(t)}</span>`).join('')}</div>`;
  }

  // Cluster section
  const hasCluster = clusterName || zookeeperServers || metadataStoreUrl;
  if (hasCluster) {
    html += `<div class="pulsarconf-sec"><h3>Cluster</h3><div class="pulsarconf-kv">
      ${kvItem('Cluster name', clusterName)}
      ${kvItem('ZooKeeper', zookeeperServers)}
      ${kvItem('Metadata store', metadataStoreUrl)}
    </div></div>`;
  }

  // Ports section
  const hasPorts = brokerPort || webPort || webPortTls || brokerPortTls;
  if (hasPorts) {
    html += `<div class="pulsarconf-sec"><h3>Ports</h3><div class="pulsarconf-kv">
      ${brokerPort ? `<div class="pulsarconf-kv-item"><span>Binary (broker)</span><span class="pulsarconf-port">${esc(brokerPort)}</span></div>` : ''}
      ${brokerPortTls ? `<div class="pulsarconf-kv-item"><span>Binary TLS</span><span class="pulsarconf-port">${esc(brokerPortTls)}</span></div>` : ''}
      ${webPort ? `<div class="pulsarconf-kv-item"><span>HTTP (web)</span><span class="pulsarconf-port">${esc(webPort)}</span></div>` : ''}
      ${webPortTls ? `<div class="pulsarconf-kv-item"><span>HTTPS (web TLS)</span><span class="pulsarconf-port">${esc(webPortTls)}</span></div>` : ''}
    </div></div>`;
  }

  // BookKeeper / storage
  const hasStorage = ensembleSize || writeQuorum || ackQuorum || journalDir || ledgerClass;
  if (hasStorage) {
    html += `<div class="pulsarconf-sec"><h3>Storage (BookKeeper)</h3><div class="pulsarconf-kv">
      ${kvItem('Ensemble size', ensembleSize)}
      ${kvItem('Write quorum', writeQuorum)}
      ${kvItem('Ack quorum', ackQuorum)}
      ${kvItem('Journal dir', journalDir)}
      ${kvItem('Ledger class', ledgerClass)}
    </div></div>`;
  }

  // Authentication
  if (hasAuth) {
    const providers = authProviders ? authProviders.split(',').map((p) => p.trim()).filter(Boolean) : [];
    html += `<div class="pulsarconf-sec"><h3>Authentication</h3><div class="pulsarconf-kv">
      ${kvItem('Authentication', authEnabled)}
      ${kvItem('Authorization', authzEnabled)}
    </div>`;
    if (providers.length) {
      html += `<ul class="pulsarconf-list" style="margin-top:6px;">${providers.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`;
    }
    html += '</div>';
  }

  // TLS
  if (hasTls) {
    html += `<div class="pulsarconf-sec"><h3>TLS</h3><div class="pulsarconf-kv">
      ${kvItem('Enabled', tlsEnabled)}
      ${kvItem('Certificate', tlsCert)}
      ${kvItem('Key', tlsKey)}
    </div></div>`;
  }

  // Offload
  if (offloadDriver) {
    html += `<div class="pulsarconf-sec"><h3>Tiered Storage Offload</h3><div class="pulsarconf-kv">
      ${kvItem('Driver', offloadDriver)}
    </div></div>`;
  }

  if (!hasCluster && !hasPorts && !hasStorage && !hasAuth && !hasTls && !offloadDriver) {
    html += '<p class="pulsarconf-empty">No recognized Pulsar configuration keys found.</p>';
  }

  const host = document.createElement('div');
  host.className = 'pulsarconf-doc';
  host.innerHTML = html;
  return { parentNode: host };
}
