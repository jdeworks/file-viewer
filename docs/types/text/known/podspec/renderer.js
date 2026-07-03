const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function safeHref(url) {
  if (typeof url !== 'string') return null;
  return /^https?:\/\//i.test(url.trim()) ? url : null;
}

const CSS = `
.ps-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-ps{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e74c3c;color:#fff;vertical-align:middle;margin-right:8px}
.ps-title{font-size:18px;font-weight:700;margin:0 0 2px}
.ps-ver{font-size:13px;color:var(--fg-2,#888);margin:0 0 4px}
.ps-summary{font-size:13px;margin:0 0 10px;color:var(--fg,#24292f)}
.ps-meta-row{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}
.ps-meta-chip{font-size:12px;padding:3px 10px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0)}
.ps-link{color:#0969da;text-decoration:none;font-size:12px}
.ps-link:hover{text-decoration:underline}
.ps-sec{margin:12px 0}
.ps-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;display:flex;align-items:center;gap:6px}
.ps-count{font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:0 6px;color:var(--fg-2,#888)}
.ps-table{width:100%;border-collapse:collapse;font-size:12px}
.ps-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.ps-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px}
.ps-table tr:last-child td{border-bottom:none}
.ps-pills{display:flex;flex-wrap:wrap;gap:6px}
.ps-pill{font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.ps-note{color:var(--fg-2,#888);font-size:13px;font-style:italic}
`;

function strVal(text, key) {
  const m = text.match(new RegExp(`\\.${key}\\s*=\\s*["']([^"']+)["']`));
  return m ? m[1] : null;
}

function arrVal(text, key) {
  const m = text.match(new RegExp(`\\.${key}\\s*=\\s*\\[([^\\]]+)\\]`));
  if (!m) return [];
  return [...m[1].matchAll(/["']([^"']+)["']/g)].map((x) => x[1]);
}

function parseDeps(text) {
  // s.dependency 'Name' or s.dependency 'Name', '~> 1.0'
  const re = /\.dependency\s+["']([^"']+)["']\s*(?:,\s*["']([^"']+)["'])?/g;
  const deps = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    deps.push({ name: m[1], constraint: m[2] || '' });
  }
  return deps;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const filename = (intake.name || intake.filename || '').split('/').pop();

  const name = strVal(text, 'name');
  const version = strVal(text, 'version');
  const summary = strVal(text, 'summary');
  const homepage = strVal(text, 'homepage');
  const license = strVal(text, 'license');
  const authors = arrVal(text, 'authors');
  const platforms = (() => {
    const m = text.match(/\.platform\s*=\s*:([a-z_]+)(?:\s*,\s*["']?([^"'\n,]+)["']?)?/i);
    return m ? [m[2] ? `${m[1]} ${m[2].trim()}` : m[1]] : [];
  })();
  const deps = parseDeps(text);

  const homepageHref = homepage ? safeHref(homepage.trim()) : null;
  const metaChips = [
    license && `<span class="ps-meta-chip">⚖ ${esc(license)}</span>`,
    ...platforms.map((p) => `<span class="ps-meta-chip">${esc(p)}</span>`),
    homepageHref
      ? `<a class="ps-link ps-meta-chip" href="${esc(homepageHref)}" target="_blank" rel="noopener noreferrer">${esc(homepage.replace(/^https?:\/\//, '').slice(0, 48))} ↗</a>`
      : homepage && `<span class="ps-meta-chip">${esc(homepage.slice(0, 48))}</span>`,
  ].filter(Boolean).join('');

  const authorsHtml = authors.length
    ? `<div class="ps-sec"><h3>Authors <span class="ps-count">${authors.length}</span></h3><div class="ps-pills">${authors.map((a) => `<span class="ps-pill">${esc(a)}</span>`).join('')}</div></div>`
    : '';

  const depsHtml = deps.length
    ? `<div class="ps-sec"><h3>Dependencies <span class="ps-count">${deps.length}</span></h3>
<table class="ps-table"><thead><tr><th>Pod</th><th>Constraint</th></tr></thead><tbody>
${deps.map((d) => `<tr><td>${esc(d.name)}</td><td>${esc(d.constraint) || '<span style="color:var(--fg-2,#888)">(any)</span>'}</td></tr>`).join('')}
</tbody></table></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'ps-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="ps-title"><span class="badge-ps">CocoaPods</span>${esc(name || filename)}</div>
${version ? `<div class="ps-ver">v${esc(version)}</div>` : ''}
${summary ? `<div class="ps-summary">${esc(summary)}</div>` : ''}
${metaChips ? `<div class="ps-meta-row">${metaChips}</div>` : ''}
${authorsHtml}
${depsHtml || '<p class="ps-note">No dependencies declared.</p>'}`;
  return { parentNode: host };
}
