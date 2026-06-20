const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cpanfile-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.cpanfile-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#003087;color:#fff;vertical-align:middle;margin-right:8px}
.cpanfile-title{font-size:18px;font-weight:700;margin:0 0 8px;display:flex;align-items:center;gap:6px}
.cpanfile-summary{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}
.cpanfile-tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg-2,#888)}
.cpanfile-sec{margin:14px 0}
.cpanfile-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;display:flex;align-items:center;gap:6px}
.cpanfile-count{font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:10px;padding:1px 6px;color:var(--fg-2,#888);font-weight:500}
.cpanfile-table{width:100%;border-collapse:collapse;font-size:13px}
.cpanfile-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0);font-weight:600}
.cpanfile-table td{padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.cpanfile-table tr:last-child td{border-bottom:none}
.cpanfile-mod{font:13px/1 ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da)}
.cpanfile-ver{font:12px ui-monospace,monospace;color:var(--fg-2,#888)}
.cpanfile-any{font-size:12px;color:var(--fg-2,#888);font-style:italic}
.cpanfile-phase-label{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg-2,#888);margin-right:6px}
.cpanfile-pills{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0}
.cpanfile-pill{font:12px ui-monospace,monospace;padding:2px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg,#24292f)}
`;

function parseCpanfile(text) {
  const lines = text.split(/\r?\n/);
  const required = [];
  const recommended = [];
  const suggested = [];
  const phases = {}; // { test: [...], develop: [...] }

  let currentPhase = null;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    // Strip comments
    const line = raw.replace(/#.*$/, '').trimEnd();
    if (!line.trim()) continue;

    // Track phase blocks: `on 'test' => sub {`
    const phaseM = line.match(/^on\s+['"](\w+)['"]\s*=>/);
    if (phaseM) {
      currentPhase = phaseM[1];
      if (!phases[currentPhase]) phases[currentPhase] = [];
      braceDepth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      continue;
    }

    // Track brace depth when inside a phase block
    if (currentPhase) {
      braceDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      if (braceDepth <= 0) {
        currentPhase = null;
        braceDepth = 0;
        continue;
      }
    }

    // Parse dependency lines
    let m;
    // requires 'Module::Name' => 'version'; or requires 'Module::Name';
    if ((m = line.trim().match(/^(requires|recommends|suggests)\s+['"]([^'"]+)['"]\s*(?:=>\s*['"]([^'"]*)['"]\s*)?;/))) {
      const kind = m[1];
      const mod = m[2];
      const ver = m[3] || '';
      const entry = { mod, ver };
      if (currentPhase) {
        phases[currentPhase].push(entry);
      } else if (kind === 'requires') {
        required.push(entry);
      } else if (kind === 'recommends') {
        recommended.push(entry);
      } else if (kind === 'suggests') {
        suggested.push(entry);
      }
    }
  }

  return { required, recommended, suggested, phases };
}

export function render(intake) {
  const text = intake.text || '';
  const { required, recommended, suggested, phases } = parseCpanfile(text);

  const host = document.createElement('div');
  host.className = 'cpanfile-doc';

  const totalRequired = required.length;
  const totalOptional = recommended.length + suggested.length;
  const phaseKeys = Object.keys(phases).filter((k) => phases[k].length > 0);

  let html = `<style>${CSS}</style>`;
  html += `<div class="cpanfile-title"><span class="cpanfile-badge">Perl</span>cpanfile</div>`;
  html += `<div class="cpanfile-summary">`;
  if (totalRequired > 0) html += `<span class="cpanfile-tag">${totalRequired} required</span>`;
  if (totalOptional > 0) html += `<span class="cpanfile-tag">${totalOptional} optional</span>`;
  for (const ph of phaseKeys) html += `<span class="cpanfile-tag">${phases[ph].length} ${ph}</span>`;
  html += `</div>`;

  // Required dependencies table
  if (required.length) {
    html += `<div class="cpanfile-sec"><h3>Required <span class="cpanfile-count">${required.length}</span></h3>`;
    html += `<table class="cpanfile-table"><thead><tr><th>Module</th><th>Version</th></tr></thead><tbody>`;
    for (const { mod, ver } of required) {
      html += `<tr><td><span class="cpanfile-mod">${esc(mod)}</span></td><td>${ver ? `<span class="cpanfile-ver">${esc(ver)}</span>` : `<span class="cpanfile-any">any</span>`}</td></tr>`;
    }
    html += `</tbody></table></div>`;
  }

  // Recommended section
  if (recommended.length) {
    html += `<div class="cpanfile-sec"><h3>Recommended <span class="cpanfile-count">${recommended.length}</span></h3>`;
    html += `<div class="cpanfile-pills">`;
    for (const { mod, ver } of recommended) {
      html += `<span class="cpanfile-pill">${esc(mod)}${ver ? ` <span style="color:var(--fg-2,#888)">${esc(ver)}</span>` : ''}</span>`;
    }
    html += `</div></div>`;
  }

  // Suggested section
  if (suggested.length) {
    html += `<div class="cpanfile-sec"><h3>Suggested <span class="cpanfile-count">${suggested.length}</span></h3>`;
    html += `<div class="cpanfile-pills">`;
    for (const { mod } of suggested) {
      html += `<span class="cpanfile-pill">${esc(mod)}</span>`;
    }
    html += `</div></div>`;
  }

  // Phase blocks (test, develop, etc.)
  for (const ph of phaseKeys) {
    const deps = phases[ph];
    html += `<div class="cpanfile-sec"><h3><span class="cpanfile-phase-label">${esc(ph)}</span>Dependencies <span class="cpanfile-count">${deps.length}</span></h3>`;
    html += `<div class="cpanfile-pills">`;
    for (const { mod, ver } of deps) {
      html += `<span class="cpanfile-pill">${esc(mod)}${ver ? ` <span style="color:var(--fg-2,#888)">${esc(ver)}</span>` : ''}</span>`;
    }
    html += `</div></div>`;
  }

  if (!required.length && !recommended.length && !suggested.length && !phaseKeys.length) {
    html += `<p style="color:var(--fg-2,#888);font-size:13px">No dependencies found.</p>`;
  }

  host.innerHTML = html;
  return { parentNode: host };
}
