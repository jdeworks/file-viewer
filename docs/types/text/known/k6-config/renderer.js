const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.k6-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-k6{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7b2d8b;color:#fff;vertical-align:middle;margin-right:8px}
.k6-title{font-size:18px;font-weight:700;margin:0 0 4px}
.k6-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.k6-sec{margin:12px 0}
.k6-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.k6-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0}
.k6-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888)}
.k6-v{font:12px/1.6 ui-monospace,monospace;font-weight:600}
.k6-table{width:100%;border-collapse:collapse;font-size:13px;margin:4px 0}
.k6-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.k6-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px}
.k6-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.k6-pill{display:inline-flex;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.k6-pass{color:#16a34a}.k6-fail{color:#dc2626}
`;

function extract(text) {
  const result = {
    vus: null,
    duration: null,
    stages: [],
    thresholds: [],
  };

  // vus (top-level options.vus or export const options = { vus: N })
  const vusM = /\bvus\s*:\s*(\d+)/.exec(text);
  if (vusM) result.vus = Number(vusM[1]);

  // duration (top-level options.duration)
  const durM = /\bduration\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (durM) result.duration = durM[1];

  // stages: [ { duration: '...', target: N }, ... ]
  const stagesM = /stages\s*:\s*\[([^\]]+)\]/s.exec(text);
  if (stagesM) {
    const stagesText = stagesM[1];
    // Each stage is a { duration: '...', target: N } block
    for (const m of stagesText.matchAll(/\{[^}]+\}/g)) {
      const block = m[0];
      const dM = /duration\s*:\s*['"`]([^'"`]+)['"`]/.exec(block);
      const tM = /target\s*:\s*(\d+)/.exec(block);
      if (dM || tM) {
        result.stages.push({ duration: dM ? dM[1] : '?', target: tM ? Number(tM[1]) : '?' });
      }
    }
  }

  // thresholds: { 'http_req_duration': [...], ... }
  const thrM = /thresholds\s*:\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s.exec(text);
  if (thrM) {
    for (const m of thrM[1].matchAll(/['"`]([^'"`]+)['"`]\s*:/g)) {
      result.thresholds.push(m[1]);
      if (result.thresholds.length >= 8) break;
    }
  }

  return result;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const cfg = extract(text);

  const kvRows = [];
  if (cfg.vus != null) kvRows.push(`<div class="k6-k">vus</div><div class="k6-v">${esc(cfg.vus)}</div>`);
  if (cfg.duration) kvRows.push(`<div class="k6-k">duration</div><div class="k6-v">${esc(cfg.duration)}</div>`);

  const settingsHtml = kvRows.length
    ? `<div class="k6-sec"><h3>Options</h3><div class="k6-kv">${kvRows.join('')}</div></div>`
    : '';

  const stagesHtml = cfg.stages.length
    ? `<div class="k6-sec"><h3>Stages (${cfg.stages.length})</h3>
<table class="k6-table"><thead><tr><th>#</th><th>Duration</th><th>Target VUs</th></tr></thead>
<tbody>${cfg.stages.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s.duration)}</td><td>${esc(s.target)}</td></tr>`).join('')}</tbody>
</table></div>`
    : '';

  const thresholdsHtml = cfg.thresholds.length
    ? `<div class="k6-sec"><h3>Thresholds</h3><div class="k6-pills">${cfg.thresholds.map((t) => `<span class="k6-pill">${esc(t)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'k6-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="k6-title"><span class="badge-k6">k6</span>k6.config</div>
<div class="k6-sub">k6 performance test configuration</div>
${settingsHtml}${stagesHtml}${thresholdsHtml}`;
  return { parentNode: host };
}
