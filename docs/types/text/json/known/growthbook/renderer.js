const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gb-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-gb{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.gb-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.gb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.gb-sec{margin:14px 0;}
.gb-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.gb-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.gb-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.gb-kv-k{color:var(--fg-2,#888);min-width:140px;flex-shrink:0;}
.gb-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.gb-masked{font-family:ui-monospace,monospace;letter-spacing:.1em;color:var(--fg-2,#888);}
.gb-pills{display:flex;flex-wrap:wrap;gap:6px;}
.gb-pill{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.gb-pill.on{background:#f0fdf4;border-color:#86efac;color:#166534;}
.gb-pill.off{background:#fef2f2;border-color:#fca5a5;color:#991b1b;}
.gb-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#ede9fe;border:1px solid #c4b5fd;color:#5b21b6;margin-left:4px;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="gb-kv"><span class="gb-kv-k">${esc(label)}</span><span class="gb-kv-v">${esc(value)}</span></div>`;
}

function maskKey(key) {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return esc(key.slice(0, 4)) + '••••' + esc(key.slice(-4));
}

export function render(intake) {
  let cfg;
  try { cfg = JSON.parse(intake.text || '{}'); } catch {
    return { parentNode: Object.assign(document.createElement('div'), { textContent: 'Invalid GrowthBook JSON.' }) };
  }

  const apiHost = cfg.apiHost || cfg.api_host || '';
  const clientKey = cfg.clientKey || cfg.client_key || '';
  const decryptionKey = cfg.decryptionKey || cfg.decryption_key || '';
  const streamingEnabled = cfg.streamingEnabled ?? cfg.streaming_enabled;
  const enableDevMode = cfg.enableDevMode ?? cfg.enable_dev_mode;
  const subscribeToChanges = cfg.subscribeToChanges ?? cfg.subscribe_to_changes;
  const backgroundSync = cfg.backgroundSync ?? cfg.background_sync;
  const qaMode = cfg.qaMode ?? cfg.qa_mode;
  const remoteEval = cfg.remoteEval ?? cfg.remote_eval;
  const renderer = cfg.renderer || '';

  // Features object
  const features = cfg.features || {};
  const featureKeys = Object.keys(features);

  // Attributes schema
  const attributes = Array.isArray(cfg.attributes) ? cfg.attributes : [];

  // Experiments
  const experiments = Array.isArray(cfg.experiments) ? cfg.experiments : [];

  const boolRow = (label, val) => {
    if (val == null) return '';
    return `<div class="gb-kv"><span class="gb-kv-k">${esc(label)}</span><span class="gb-pill ${val ? 'on' : 'off'}" style="padding:1px 8px">${val ? 'enabled' : 'disabled'}</span></div>`;
  };

  const settingsHtml = (apiHost || clientKey || streamingEnabled != null || enableDevMode != null || remoteEval != null) ? `
<div class="gb-sec"><h3>SDK Settings</h3><div class="gb-card">
${kv('API Host', apiHost)}
${clientKey ? `<div class="gb-kv"><span class="gb-kv-k">Client Key</span><span class="gb-masked">${maskKey(clientKey)}</span></div>` : ''}
${decryptionKey ? `<div class="gb-kv"><span class="gb-kv-k">Decryption Key</span><span class="gb-masked">${maskKey(decryptionKey)}</span></div>` : ''}
${boolRow('Streaming', streamingEnabled)}
${boolRow('Dev Mode', enableDevMode)}
${boolRow('Subscribe to Changes', subscribeToChanges)}
${boolRow('Background Sync', backgroundSync)}
${boolRow('QA Mode', qaMode)}
${boolRow('Remote Eval', remoteEval)}
${kv('Renderer', renderer)}
</div></div>` : '';

  const featuresHtml = featureKeys.length ? `
<div class="gb-sec"><h3>Features (${featureKeys.length})</h3>
<div class="gb-pills">
${featureKeys.slice(0, 20).map((k) => {
    const f = features[k];
    const defVal = f?.defaultValue;
    const tip = defVal != null ? ` = ${String(defVal).slice(0, 20)}` : '';
    return `<span class="gb-pill">${esc(k)}${tip ? `<span style="color:var(--fg-2,#888);font-size:11px">${esc(tip)}</span>` : ''}</span>`;
  }).join('')}
${featureKeys.length > 20 ? `<span style="font-size:11px;color:var(--fg-2,#888)">+${featureKeys.length - 20} more</span>` : ''}
</div></div>` : '';

  const attrsHtml = attributes.length ? `
<div class="gb-sec"><h3>Attribute Schema (${attributes.length})</h3>
<div class="gb-pills">
${attributes.slice(0, 15).map((a) => `<span class="gb-pill">${esc(a.id || a.attribute || a)}${a.datatype ? `<span class="gb-tag">${esc(a.datatype)}</span>` : ''}</span>`).join('')}
${attributes.length > 15 ? `<span style="font-size:11px;color:var(--fg-2,#888)">+${attributes.length - 15} more</span>` : ''}
</div></div>` : '';

  const expHtml = experiments.length ? `
<div class="gb-sec"><h3>Experiments (${experiments.length})</h3>
<div class="gb-pills">
${experiments.slice(0, 10).map((e) => `<span class="gb-pill">${esc(e.key || e.trackingKey || '(unnamed)')}</span>`).join('')}
${experiments.length > 10 ? `<span style="font-size:11px;color:var(--fg-2,#888)">+${experiments.length - 10} more</span>` : ''}
</div></div>` : '';

  const subParts = [
    featureKeys.length ? `${featureKeys.length} feature${featureKeys.length !== 1 ? 's' : ''}` : '',
    experiments.length ? `${experiments.length} experiment${experiments.length !== 1 ? 's' : ''}` : '',
    apiHost,
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'gb-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-gb">GrowthBook</span>
  <span class="gb-title">Feature Flag Config</span>
  ${featureKeys.length ? `<span class="gb-tag">${featureKeys.length} feature${featureKeys.length !== 1 ? 's' : ''}</span>` : ''}
</div>
<div class="gb-sub">${esc(subParts.join(' · '))}</div>
${settingsHtml}${featuresHtml}${attrsHtml}${expHtml}`;
  return { parentNode: host };
}
