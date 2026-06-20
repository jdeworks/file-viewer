const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.storagecfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.storagecfg-doc .badge-stor{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#892CA0;color:#fff;vertical-align:middle;margin-right:8px;}
.storagecfg-doc .stor-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.storagecfg-doc .stor-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.storagecfg-doc .stor-sec{margin:14px 0;}
.storagecfg-doc .stor-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.storagecfg-doc .stor-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:4px 0;}
.storagecfg-doc .stor-key{color:var(--fg-2,#888);font-size:12px;white-space:nowrap;}
.storagecfg-doc .stor-val{font:12px/1.4 ui-monospace,monospace;font-weight:600;word-break:break-all;}
.storagecfg-doc .stor-driver{display:inline-block;padding:2px 10px;border-radius:10px;background:#e8f0fe;color:#1a73e8;border:1px solid #c5d9fb;font:11px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:8px;}
.storagecfg-doc .stor-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.storagecfg-doc .stor-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
`;

function kv(key, val) {
  if (val == null || val === '') return '';
  return `<span class="stor-key">${esc(key)}</span><span class="stor-val">${esc(val)}</span>`;
}

function kvBool(key, val) {
  if (val == null) return '';
  return `<span class="stor-key">${esc(key)}</span><span class="stor-val">${val ? 'true' : 'false'}</span>`;
}

export function render(intake) {
  const cfg = intake.parsed || {};
  const storage = cfg.storage || {};
  const opts = storage.options || {};
  const overlay = opts.overlay || {};

  const driver = storage.driver || '';
  const graphRoot = storage.graphRoot || storage.graphroot || '';
  const runRoot = storage.runRoot || storage.runroot || '';
  const imageStore = storage.imageStore || storage.imagestore || '';

  // [storage] section
  const storLines = [
    driver ? kv('driver', driver) : '',
    graphRoot ? kv('graphRoot', graphRoot) : '',
    runRoot ? kv('runRoot', runRoot) : '',
    imageStore ? kv('imageStore', imageStore) : '',
  ].filter(Boolean);

  const storHtml = storLines.length
    ? `<div class="stor-sec">
        <h3>Storage</h3>
        ${driver ? `<div><span class="stor-driver">${esc(driver)}</span></div>` : ''}
        <div class="stor-grid">${storLines.filter((l) => !l.includes(esc('driver'))).join('')}</div>
      </div>`
    : '';

  // [storage.options] section
  const optLines = [
    opts.mount_program ? kv('mount_program', opts.mount_program) : '',
    opts.size ? kv('size', opts.size) : '',
    opts.ignore_chown_errors != null ? kvBool('ignore_chown_errors', opts.ignore_chown_errors) : '',
    opts.pull_options ? kv('pull_options', JSON.stringify(opts.pull_options)) : '',
  ].filter(Boolean);

  const optsHtml = optLines.length
    ? `<div class="stor-sec"><h3>Options</h3><div class="stor-grid">${optLines.join('')}</div></div>`
    : '';

  // [storage.options.overlay] section
  const overlayLines = [
    overlay.mountopt ? kv('mountopt', overlay.mountopt) : '',
    overlay.size ? kv('size', overlay.size) : '',
    overlay.ignore_chown_errors != null ? kvBool('ignore_chown_errors', overlay.ignore_chown_errors) : '',
    overlay.mount_program ? kv('mount_program', overlay.mount_program) : '',
    overlay.force_mask ? kv('force_mask', overlay.force_mask) : '',
  ].filter(Boolean);

  const overlayHtml = overlayLines.length
    ? `<div class="stor-sec"><h3>Overlay options</h3><div class="stor-grid">${overlayLines.join('')}</div></div>`
    : '';

  // Additional image stores
  const additionalStores = Array.isArray(opts.additionalimagestores)
    ? opts.additionalimagestores
    : (Array.isArray(opts.additionalimagestorage) ? opts.additionalimagestorage : []);
  // Also handle [[storage.options.additionalimagestores]] table array form
  const additionalArr = additionalStores.map((s) => (typeof s === 'string' ? s : (s.path || String(s))));

  const additionalHtml = additionalArr.length
    ? `<div class="stor-sec"><h3>Additional image stores (${additionalArr.length})</h3><div class="stor-pills">${additionalArr.map((p) => `<span class="stor-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const subParts = [
    driver ? `driver: ${driver}` : '',
    graphRoot ? `graph: ${graphRoot}` : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'storagecfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="stor-title"><span class="badge-stor">Podman</span>Containers Storage</div>
<div class="stor-sub">${esc(subParts.join(' · '))}</div>
${storHtml}
${optsHtml}
${overlayHtml}
${additionalHtml}`;

  return { parentNode: host };
}
