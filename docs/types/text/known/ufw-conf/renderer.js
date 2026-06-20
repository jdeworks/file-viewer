const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ufwcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ufwcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#EE7700;color:#fff;vertical-align:middle;margin-right:8px;}
.ufwcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ufwcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.ufwcfg-section{margin-bottom:18px;}
.ufwcfg-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.ufwcfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.ufwcfg-status{display:inline-block;font-size:13px;font-weight:700;padding:3px 12px;border-radius:10px;margin-bottom:12px;}
.ufwcfg-status-enabled{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}
.ufwcfg-status-disabled{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;}
.ufwcfg-status-unknown{background:#e2e3e5;color:#383d41;border:1px solid #d6d8db;}
.ufwcfg-table{width:100%;border-collapse:collapse;font-size:13px;}
.ufwcfg-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.ufwcfg-table td:first-child{color:var(--fg-2,#888);width:44%;white-space:nowrap;font-size:12px;}
.ufwcfg-table tr:last-child td{border-bottom:none;}
.ufwcfg-policy{font-size:11px;padding:1px 7px;border-radius:8px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;font-family:ui-monospace,monospace;}
.ufwcfg-policy-accept{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}
.ufwcfg-policy-drop{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;}
.ufwcfg-policy-reject{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;}
.ufwcfg-policy-skip{background:#e2e3e5;color:#383d41;border:1px solid #d6d8db;}
.ufwcfg-rule{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border,#e0e0e0);font-size:13px;font-family:ui-monospace,monospace;}
.ufwcfg-rule:last-child{border-bottom:none;}
.ufwcfg-action{font-size:11px;padding:1px 7px;border-radius:8px;font-weight:600;text-transform:uppercase;}
.ufwcfg-action-allow{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}
.ufwcfg-action-deny{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;}
.ufwcfg-action-reject{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;}
.ufwcfg-action-limit{background:#fff3cd;color:#856404;border:1px solid #ffc107;}
.ufwcfg-action-other{background:#e2e3e5;color:#383d41;border:1px solid #d6d8db;}
`;

function parseUfw(text) {
  const result = {
    enabled: null,         // true / false / null (unknown)
    ipv6: null,
    loglevel: null,
    policies: {},          // input/output/forward/application
    settings: {},          // other key=value pairs
    tupleRules: [],        // parsed from ### tuple ### lines
    isTupleFile: false,
  };

  const lines = text.split('\n');
  for (const raw of lines) {
    const line = raw.trim();

    // UFW tuple rules (user.rules format)
    if (line.startsWith('### tuple ###')) {
      result.isTupleFile = true;
      // Format: ### tuple ### allow tcp 22 0.0.0.0/0 any 0.0.0.0/0 in
      const parts = line.replace('### tuple ###', '').trim().split(/\s+/);
      if (parts.length >= 2) {
        result.tupleRules.push({
          action: parts[0] || '',
          proto: parts[1] || '',
          port: parts[2] || '',
          dst: parts[3] || '',
          srcPort: parts[4] || '',
          src: parts[5] || '',
          dir: parts[6] || '',
        });
      }
      continue;
    }

    if (!line || line.startsWith('#')) continue;

    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;

    const key = line.slice(0, eqIdx).trim().toUpperCase();
    const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');

    if (key === 'ENABLED') {
      result.enabled = val.toLowerCase() === 'yes';
    } else if (key === 'IPV6') {
      result.ipv6 = val.toLowerCase() === 'yes';
    } else if (key === 'LOGLEVEL') {
      result.loglevel = val;
    } else if (key === 'DEFAULT_INPUT_POLICY') {
      result.policies.input = val;
    } else if (key === 'DEFAULT_OUTPUT_POLICY') {
      result.policies.output = val;
    } else if (key === 'DEFAULT_FORWARD_POLICY') {
      result.policies.forward = val;
    } else if (key === 'DEFAULT_APPLICATION_POLICY') {
      result.policies.application = val;
    } else {
      result.settings[key] = val;
    }
  }

  return result;
}

function policyChip(p) {
  if (!p) return '';
  const cls = { DROP: 'drop', REJECT: 'reject', ACCEPT: 'accept', SKIP: 'skip' }[p.toUpperCase()] || 'skip';
  return `<span class="ufwcfg-policy ufwcfg-policy-${cls}">${esc(p)}</span>`;
}

function actionChip(a) {
  const cls = { allow: 'allow', deny: 'deny', reject: 'reject', limit: 'limit' }[(a || '').toLowerCase()] || 'other';
  return `<span class="ufwcfg-action ufwcfg-action-${cls}">${esc(a)}</span>`;
}

export function render(intake) {
  const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
  const cfg = parseUfw(text);

  // Enabled status
  let statusHtml = '';
  if (cfg.enabled === true) {
    statusHtml = '<span class="ufwcfg-status ufwcfg-status-enabled">Enabled</span>';
  } else if (cfg.enabled === false) {
    statusHtml = '<span class="ufwcfg-status ufwcfg-status-disabled">Disabled</span>';
  } else {
    statusHtml = '<span class="ufwcfg-status ufwcfg-status-unknown">Status unknown</span>';
  }

  // Policies table
  const policyRows = Object.entries({
    'Default INPUT': cfg.policies.input,
    'Default OUTPUT': cfg.policies.output,
    'Default FORWARD': cfg.policies.forward,
    'Default APPLICATION': cfg.policies.application,
  }).filter(([, v]) => v).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${policyChip(v)}</td></tr>`).join('');

  const policiesHtml = policyRows
    ? `<div class="ufwcfg-section">
        <h3>Default Policies</h3>
        <div class="ufwcfg-card"><table class="ufwcfg-table">${policyRows}</table></div>
      </div>`
    : '';

  // Settings table (loglevel, ipv6, etc.)
  const settingsList = [];
  if (cfg.loglevel !== null) settingsList.push(['Log level', cfg.loglevel]);
  if (cfg.ipv6 !== null) settingsList.push(['IPv6', cfg.ipv6 ? 'yes' : 'no']);
  for (const [k, v] of Object.entries(cfg.settings)) {
    settingsList.push([k, v]);
  }
  const settingsHtml = settingsList.length
    ? `<div class="ufwcfg-section">
        <h3>Settings</h3>
        <div class="ufwcfg-card"><table class="ufwcfg-table">${settingsList.map(([k, v]) => `<tr><td>${esc(k)}</td><td style="font-family:ui-monospace,monospace;font-size:12px">${esc(v)}</td></tr>`).join('')}</table></div>
      </div>`
    : '';

  // Tuple rules
  const tupleHtml = cfg.tupleRules.length
    ? `<div class="ufwcfg-section">
        <h3>Rules (${cfg.tupleRules.length})</h3>
        <div class="ufwcfg-card">
          ${cfg.tupleRules.map((r) => {
            const portLabel = r.port && r.port !== 'any' ? `:${r.port}` : '';
            const protoLabel = r.proto && r.proto !== 'any' ? `/${r.proto}` : '';
            const from = r.src && r.src !== 'any' && r.src !== '0.0.0.0/0' && r.src !== '::/0' ? ` from ${r.src}` : '';
            return `<div class="ufwcfg-rule">${actionChip(r.action)}<span>${esc(portLabel + protoLabel)}${esc(from)}</span></div>`;
          }).join('')}
        </div>
      </div>`
    : '';

  const fileType = cfg.isTupleFile ? 'user.rules' : 'ufw.conf';
  const sub = `UFW firewall configuration · ${fileType}`;

  const host = document.createElement('div');
  host.className = 'ufwcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="ufwcfg-title"><span class="ufwcfg-badge">UFW</span>Uncomplicated Firewall</div>
<div class="ufwcfg-sub">${esc(sub)}</div>
${statusHtml}
${policiesHtml}
${settingsHtml}
${tupleHtml}`;
  return { parentNode: host };
}
