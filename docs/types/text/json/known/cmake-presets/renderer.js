const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cmp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-cmake-presets{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#064e8a;color:#fff;vertical-align:middle;margin-right:8px}
.cmp-title{font-size:18px;font-weight:700;margin:0 0 4px}
.cmp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.cmp-meta{font-size:13px;color:var(--fg-2,#888);margin:2px 0}
.cmp-tags{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 12px}
.cmp-tag{display:inline-flex;align-items:center;font-size:12px;padding:2px 10px;border-radius:10px;background:#dbeafe;border:1px solid #93c5fd;color:#1e40af;font-weight:600}
.cmp-sec{margin:12px 0}
.cmp-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.cmp-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px}
.cmp-item{display:flex;align-items:baseline;gap:8px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);flex-wrap:wrap}
.cmp-name{font:13px/1 ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da)}
.cmp-kind{font:11px ui-monospace,monospace;padding:1px 6px;border-radius:8px;background:#f3e8ff;border:1px solid #d8b4fe;color:#6b21a8}
.cmp-ref{font:11px ui-monospace,monospace;padding:1px 6px;border-radius:8px;background:#dcfce7;border:1px solid #86efac;color:#15803d}
.cmp-hint{font-size:12px;color:var(--fg-2,#888)}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { /* malformed JSON */ }

  const filename = (intake.filename || '').split('/').pop() || 'CMakePresets.json';
  const cmakeMinReq = cfg.cmakeMinimumRequired;
  const minVersion = cmakeMinReq
    ? [cmakeMinReq.major, cmakeMinReq.minor, cmakeMinReq.patch].filter((v) => v != null).join('.')
    : null;

  const configurePresets = Array.isArray(cfg.configurePresets) ? cfg.configurePresets : [];
  const buildPresets = Array.isArray(cfg.buildPresets) ? cfg.buildPresets : [];
  const testPresets = Array.isArray(cfg.testPresets) ? cfg.testPresets : [];
  const packagePresets = Array.isArray(cfg.packagePresets) ? cfg.packagePresets : [];
  const workflowPresets = Array.isArray(cfg.workflowPresets) ? cfg.workflowPresets : [];

  const total = configurePresets.length + buildPresets.length + testPresets.length + packagePresets.length + workflowPresets.length;

  const host = document.createElement('div');
  host.className = 'cmp-doc';

  let html = `<style>${CSS}</style>`;
  html += `<div class="cmp-title"><span class="badge-cmake-presets">CMake Presets</span>${esc(filename)}</div>`;
  html += `<div class="cmp-sub">CMake preset configuration</div>`;
  if (minVersion) html += `<div class="cmp-meta">CMake &ge; <strong>${esc(minVersion)}</strong></div>`;

  // Summary tags
  const summaryTags = [];
  if (configurePresets.length) summaryTags.push(`${configurePresets.length} configure`);
  if (buildPresets.length) summaryTags.push(`${buildPresets.length} build`);
  if (testPresets.length) summaryTags.push(`${testPresets.length} test`);
  if (packagePresets.length) summaryTags.push(`${packagePresets.length} package`);
  if (workflowPresets.length) summaryTags.push(`${workflowPresets.length} workflow`);
  if (summaryTags.length) {
    html += `<div class="cmp-tags">${summaryTags.map((t) => `<span class="cmp-tag">${esc(t)}</span>`).join('')}</div>`;
  }

  if (configurePresets.length) {
    html += `<div class="cmp-sec"><h3>Configure Presets (${configurePresets.length})</h3><ul class="cmp-list">`;
    for (const p of configurePresets) {
      if (p.hidden) continue;
      html += `<li class="cmp-item"><span class="cmp-name">${esc(p.name)}</span>`;
      if (p.generator) html += `<span class="cmp-kind">${esc(p.generator)}</span>`;
      if (p.binaryDir) html += `<span class="cmp-hint">${esc(p.binaryDir)}</span>`;
      if (p.description) html += `<span class="cmp-hint">${esc(p.description)}</span>`;
      html += '</li>';
    }
    html += '</ul></div>';
  }

  if (buildPresets.length) {
    html += `<div class="cmp-sec"><h3>Build Presets (${buildPresets.length})</h3><ul class="cmp-list">`;
    for (const p of buildPresets) {
      if (p.hidden) continue;
      html += `<li class="cmp-item"><span class="cmp-name">${esc(p.name)}</span>`;
      if (p.configurePreset) html += `<span class="cmp-ref">${esc(p.configurePreset)}</span>`;
      if (p.description) html += `<span class="cmp-hint">${esc(p.description)}</span>`;
      html += '</li>';
    }
    html += '</ul></div>';
  }

  if (testPresets.length) {
    html += `<div class="cmp-sec"><h3>Test Presets (${testPresets.length})</h3><ul class="cmp-list">`;
    for (const p of testPresets) {
      if (p.hidden) continue;
      html += `<li class="cmp-item"><span class="cmp-name">${esc(p.name)}</span>`;
      if (p.configurePreset) html += `<span class="cmp-ref">${esc(p.configurePreset)}</span>`;
      if (p.description) html += `<span class="cmp-hint">${esc(p.description)}</span>`;
      html += '</li>';
    }
    html += '</ul></div>';
  }

  if (packagePresets.length) {
    html += `<div class="cmp-sec"><h3>Package Presets (${packagePresets.length})</h3><ul class="cmp-list">`;
    for (const p of packagePresets) {
      if (p.hidden) continue;
      html += `<li class="cmp-item"><span class="cmp-name">${esc(p.name)}</span>`;
      if (p.configurePreset) html += `<span class="cmp-ref">${esc(p.configurePreset)}</span>`;
      html += '</li>';
    }
    html += '</ul></div>';
  }

  if (workflowPresets.length) {
    html += `<div class="cmp-sec"><h3>Workflow Presets (${workflowPresets.length})</h3><ul class="cmp-list">`;
    for (const p of workflowPresets) {
      if (p.hidden) continue;
      html += `<li class="cmp-item"><span class="cmp-name">${esc(p.name)}</span>`;
      if (p.description) html += `<span class="cmp-hint">${esc(p.description)}</span>`;
      html += '</li>';
    }
    html += '</ul></div>';
  }

  host.innerHTML = html;
  return { parentNode: host };
}
