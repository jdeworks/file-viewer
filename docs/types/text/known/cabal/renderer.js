const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cabal-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-cabal{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5b2d8e;color:#fff;vertical-align:middle;margin-right:8px}
.cabal-title{font-size:18px;font-weight:700;margin:0 0 4px}
.cabal-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.cabal-meta{font-size:13px;color:var(--fg-2,#888);margin:2px 0}
.cabal-meta strong{color:var(--fg,#24292f)}
.cabal-sec{margin:12px 0}
.cabal-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.cabal-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:3px}
.cabal-item{display:flex;align-items:baseline;gap:8px;padding:3px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.cabal-name{font:13px/1 ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da)}
.cabal-ver{font:12px ui-monospace,monospace;color:var(--fg-2,#888)}
.cabal-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.cabal-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.cabal-stanza{display:flex;align-items:baseline;gap:8px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);margin:3px 0}
.cabal-stanza-type{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);min-width:80px}
.cabal-stanza-name{font:13px ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da)}
`;

function parseField(text, field) {
  const re = new RegExp('^' + field + ':\\s*(.+)', 'im');
  const m = re.exec(text);
  return m ? m[1].trim() : null;
}

function parseMultilineField(text, field) {
  // Handles fields that may span multiple continuation lines (indented)
  const lines = text.split('\n');
  const startRe = new RegExp('^' + field + ':\\s*(.*)', 'i');
  let idx = lines.findIndex((l) => startRe.test(l));
  if (idx < 0) return null;
  const firstVal = (startRe.exec(lines[idx]) || [])[1]?.trim() || '';
  const parts = firstVal ? [firstVal] : [];
  for (let i = idx + 1; i < lines.length; i++) {
    if (/^\s+\S/.test(lines[i])) parts.push(lines[i].trim());
    else break;
  }
  return parts.join(' ');
}

function parseBuildDepends(text) {
  // Find all build-depends fields across all stanzas
  const deps = new Set();
  const re = /^\s*build-depends\s*:([\s\S]*?)(?=\n\s*[a-z])/gim;
  let m;
  while ((m = re.exec(text)) !== null) {
    // Split by commas, handling multi-line
    const block = m[1].replace(/\n\s+/g, ' ');
    for (const dep of block.split(',')) {
      const d = dep.trim().split(/[\s>=<!^]/)[0].trim();
      if (d && d !== '--') deps.add(d);
    }
  }
  // Also catch trailing block at end of file
  const lastRe = /^\s*build-depends\s*:([\s\S]*)$/im;
  const last = lastRe.exec(text);
  if (last) {
    const block = last[1].replace(/\n\s+/g, ' ');
    for (const dep of block.split(',')) {
      const d = dep.trim().split(/[\s>=<!^]/)[0].trim();
      if (d && d !== '--') deps.add(d);
    }
  }
  return [...deps].filter((d) => d.length > 0);
}

function parseStanzas(text) {
  const stanzas = [];
  const re = /^(executable|library|test-suite|benchmark)\s*(.*)/gim;
  let m;
  while ((m = re.exec(text)) !== null) {
    stanzas.push({ type: m[1].toLowerCase(), name: m[2].trim() || '(unnamed)' });
  }
  return stanzas;
}

function parseGhcOptions(text) {
  const re = /^ghc-options\s*:\s*(.+)/im;
  const m = re.exec(text);
  return m ? m[1].trim() : null;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);

  const name = parseField(text, 'name') || '(unnamed)';
  const version = parseField(text, 'version') || '';
  const synopsis = parseField(text, 'synopsis') || '';
  const description = parseMultilineField(text, 'description') || '';
  const license = parseField(text, 'license') || parseField(text, 'license-file') || '';
  const ghcOptions = parseGhcOptions(text);
  const buildDeps = parseBuildDepends(text);
  const stanzas = parseStanzas(text);

  const host = document.createElement('div');
  host.className = 'cabal-doc';

  let html = `<style>${CSS}</style>
<div class="cabal-title"><span class="badge-cabal">Cabal</span>${esc(name)}${version ? `<span style="font-size:14px;font-weight:400;color:var(--fg-2,#888);margin-left:8px">${esc(version)}</span>` : ''}</div>`;

  if (synopsis) html += `<div class="cabal-sub">${esc(synopsis)}</div>`;
  if (description && description !== synopsis) html += `<div class="cabal-meta">${esc(description.length > 200 ? description.slice(0, 200) + '…' : description)}</div>`;
  if (license) html += `<div class="cabal-meta">License: <strong>${esc(license)}</strong></div>`;
  if (ghcOptions) html += `<div class="cabal-meta">GHC options: <strong><code>${esc(ghcOptions)}</code></strong></div>`;

  if (stanzas.length) {
    html += `<div class="cabal-sec"><h3>Components (${stanzas.length})</h3>`;
    for (const s of stanzas) {
      html += `<div class="cabal-stanza"><span class="cabal-stanza-type">${esc(s.type)}</span><span class="cabal-stanza-name">${esc(s.name)}</span></div>`;
    }
    html += `</div>`;
  }

  if (buildDeps.length) {
    const SHOW = 30;
    html += `<div class="cabal-sec"><h3>Build Dependencies (${buildDeps.length})</h3><div class="cabal-pills">`;
    html += buildDeps.slice(0, SHOW).map((d) => `<span class="cabal-pill">${esc(d)}</span>`).join('');
    html += `</div>`;
    if (buildDeps.length > SHOW) html += `<p style="font-size:12px;color:var(--fg-2,#888);margin:4px 0 0">… and ${buildDeps.length - SHOW} more</p>`;
    html += `</div>`;
  }

  host.innerHTML = html;
  return { parentNode: host };
}
