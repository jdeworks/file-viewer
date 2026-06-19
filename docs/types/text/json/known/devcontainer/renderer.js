const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dvc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-dvc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0078d4;color:#fff;vertical-align:middle;margin-right:8px;}
.dvc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.dvc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.dvc-sec{margin:12px 0;}
.dvc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.dvc-pills{display:flex;flex-wrap:wrap;gap:6px;}
.dvc-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.dvc-pill.feat{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.dvc-pill.port{background:#fef3c7;border-color:#fcd34d;color:#92400e;}
.dvc-pill.ext{background:#f0fdf4;border-color:#86efac;color:#166534;font-family:ui-monospace,monospace;font-size:11px;}
.dvc-cmd{font:12px/1.5 ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:5px 10px;white-space:pre-wrap;word-break:break-all;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const name = cfg.name || '';
  const image = cfg.image || (cfg.build?.dockerfile ? `Dockerfile: ${cfg.build.dockerfile}` : '');
  const features = cfg.features ? Object.keys(cfg.features) : [];
  const ports = Array.isArray(cfg.forwardPorts) ? cfg.forwardPorts : [];
  const postCreate = cfg.postCreateCommand || '';
  const postStart = cfg.postStartCommand || '';
  const extensions = cfg.customizations?.vscode?.extensions || cfg.extensions || [];
  const settings = cfg.customizations?.vscode?.settings || {};
  const settingCount = Object.keys(settings).length;

  const featHtml = features.length
    ? `<div class="dvc-sec"><h3>Features (${features.length})</h3><div class="dvc-pills">${features.slice(0, 8).map((f) => {
        const short = f.split('/').pop().split(':')[0];
        return `<span class="dvc-pill feat">${esc(short)}</span>`;
      }).join('')}</div></div>`
    : '';

  const portHtml = ports.length
    ? `<div class="dvc-sec"><h3>Forwarded ports</h3><div class="dvc-pills">${ports.slice(0, 8).map((p) => `<span class="dvc-pill port">:${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const extHtml = extensions.length
    ? `<div class="dvc-sec"><h3>VS Code extensions (${extensions.length})</h3><div class="dvc-pills">${extensions.slice(0, 8).map((e) => `<span class="dvc-pill ext">${esc(e)}</span>`).join('')}${extensions.length > 8 ? `<span class="dvc-pill">+${extensions.length - 8} more</span>` : ''}</div></div>`
    : '';

  const cmdHtml = (postCreate || postStart)
    ? `<div class="dvc-sec"><h3>Post-create command</h3><div class="dvc-cmd">${esc(postCreate || postStart)}</div></div>`
    : '';

  const sub = [
    image ? image.split('/').pop().split(':')[0] : '',
    features.length ? `${features.length} feature${features.length !== 1 ? 's' : ''}` : '',
    extensions.length ? `${extensions.length} extension${extensions.length !== 1 ? 's' : ''}` : '',
    settingCount ? `${settingCount} setting${settingCount !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'dvc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="dvc-title"><span class="badge-dvc">Dev Container</span>${esc(name || 'devcontainer.json')}</div>
<div class="dvc-sub">${esc(sub) || 'Development container configuration'}</div>
${image ? `<div class="dvc-sec"><h3>Image</h3><div class="dvc-pills"><span class="dvc-pill">${esc(image)}</span></div></div>` : ''}
${featHtml}${portHtml}${extHtml}${cmdHtml}`;
  return { parentNode: host };
}
