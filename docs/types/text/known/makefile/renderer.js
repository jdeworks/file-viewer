const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.makefile-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.makefile-doc .badge-mkf{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a1a2e;color:#fff;vertical-align:middle;margin-right:8px}
.makefile-doc .mkf-title{font-size:18px;font-weight:700;margin:0 0 4px}
.makefile-doc .mkf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.makefile-doc .mkf-sec{margin:12px 0}
.makefile-doc .mkf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.makefile-doc .mkf-pills{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 6px}
.makefile-doc .mkf-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:#e8f4fd;border:1px solid #e65c00;color:#1a1a2e;font-family:ui-monospace,monospace}
.makefile-doc .mkf-pill-reg{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.makefile-doc .mkf-stat{display:inline-block;font-size:13px;color:var(--fg-2,#888);margin-top:4px}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const lines = text.split('\n');

  // Parse .PHONY targets
  const phonySet = new Set();
  for (const line of lines) {
    const m = /^\.PHONY\s*:\s*(.+)/.exec(line);
    if (m) m[1].trim().split(/\s+/).forEach((t) => phonySet.add(t));
  }

  // Parse targets: lines like `target:` not starting with tab or $
  const allTargets = [];
  const seenTargets = new Set();
  for (const line of lines) {
    if (line.startsWith('\t') || line.startsWith('#') || line.startsWith('$')) continue;
    const m = /^([a-zA-Z_][a-zA-Z0-9_./-]*)\s*:(?!=)/.exec(line);
    if (m && !seenTargets.has(m[1])) {
      seenTargets.add(m[1]);
      allTargets.push(m[1]);
    }
  }

  // Parse variable definitions
  const vars = [];
  for (const line of lines) {
    if (line.startsWith('\t') || line.startsWith('#')) continue;
    const m = /^([A-Z_a-z][A-Z0-9_a-z]*)\s*[:?]?=/.exec(line);
    if (m) vars.push(m[1]);
  }

  const phonyTargets = allTargets.filter((t) => phonySet.has(t));
  const realTargets = allTargets.filter((t) => !phonySet.has(t));

  const phonyHtml = phonyTargets.length
    ? `<div class="mkf-sec"><h3>Phony targets (${phonyTargets.length})</h3><div class="mkf-pills">${phonyTargets.map((t) => `<span class="mkf-pill">${esc(t)}</span>`).join('')}</div></div>`
    : '';

  const realHtml = realTargets.length
    ? `<div class="mkf-sec"><h3>Build targets (${realTargets.length})</h3><div class="mkf-pills">${realTargets.map((t) => `<span class="mkf-pill-reg">${esc(t)}</span>`).join('')}</div></div>`
    : '';

  const varHtml = vars.length ? `<div class="mkf-stat">${vars.length} variable${vars.length !== 1 ? 's' : ''} defined</div>` : '';

  const host = document.createElement('div');
  host.className = 'makefile-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="mkf-title"><span class="badge-mkf">Makefile</span>Makefile</div>
<div class="mkf-sub">${allTargets.length} target${allTargets.length !== 1 ? 's' : ''} total</div>
${phonyHtml}${realHtml}${varHtml}`;
  return { parentNode: host };
}
