const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gfl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.gfl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#CC342D;color:#fff;vertical-align:middle;margin-right:8px}
.gfl-title{font-size:18px;font-weight:700;margin:0 0 4px}
.gfl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.gfl-sec{margin:14px 0}
.gfl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.gfl-pills{display:flex;flex-wrap:wrap;gap:6px}
.gfl-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.gfl-pill-dep{background:#fff0f0;border-color:#f5c6c5}
.gfl-info{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin:8px 0}
.gfl-kv{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 12px}
.gfl-kv dt{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 2px}
.gfl-kv dd{margin:0;font:13px/1.4 ui-monospace,monospace;font-weight:600}
`;

export async function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const lines = text.split(/\r?\n/);

  // Parse BUNDLED WITH
  let bundledWith = '';
  for (let i = 0; i < lines.length; i++) {
    if (/^BUNDLED WITH/.test(lines[i])) {
      bundledWith = (lines[i + 1] || '').trim();
      break;
    }
  }

  // Count GEM specs: lines with 4-space indent then word+version in parens
  const gemSpecRe = /^    [a-zA-Z][^ ]+ \([\d.]+\)/;
  const gemCount = lines.filter((l) => gemSpecRe.test(l)).length;

  // Parse PLATFORMS
  let inPlatforms = false;
  const platforms = [];
  for (const line of lines) {
    if (/^PLATFORMS/.test(line)) { inPlatforms = true; continue; }
    if (inPlatforms) {
      if (/^\S/.test(line) && line.trim()) { inPlatforms = false; continue; }
      const p = line.trim();
      if (p) platforms.push(p);
    }
  }

  // Parse DEPENDENCIES
  let inDeps = false;
  const deps = [];
  for (const line of lines) {
    if (/^DEPENDENCIES/.test(line)) { inDeps = true; continue; }
    if (inDeps) {
      if (/^\S/.test(line) && line.trim()) { inDeps = false; continue; }
      const d = line.trim();
      if (d) deps.push(d);
    }
  }

  const infoHtml = `<dl class="gfl-info">
    ${bundledWith ? `<div class="gfl-kv"><dt>Bundled With</dt><dd>${esc(bundledWith)}</dd></div>` : ''}
    <div class="gfl-kv"><dt>Locked Gems</dt><dd>${gemCount}</dd></div>
    <div class="gfl-kv"><dt>Platforms</dt><dd>${platforms.length || '—'}</dd></div>
    <div class="gfl-kv"><dt>Dependencies</dt><dd>${deps.length}</dd></div>
  </dl>`;

  const platformHtml = platforms.length
    ? `<div class="gfl-sec"><h3>Platforms</h3><div class="gfl-pills">${platforms.map((p) => `<span class="gfl-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const depHtml = deps.length
    ? `<div class="gfl-sec"><h3>Top-level Dependencies (${deps.length})</h3><div class="gfl-pills">${deps.map((d) => `<span class="gfl-pill gfl-pill-dep">${esc(d)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'gfl-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="gfl-title"><span class="gfl-badge">Bundler</span>Gemfile.lock</div>
<div class="gfl-sub">${gemCount} locked gem${gemCount !== 1 ? 's' : ''}${bundledWith ? ` · Bundler ${esc(bundledWith)}` : ''}</div>
${infoHtml}${platformHtml}${depHtml}`;
  return { parentNode: host };
}
