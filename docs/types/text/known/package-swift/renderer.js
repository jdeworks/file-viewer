const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.swift-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-swift{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f05138;color:#fff;vertical-align:middle;margin-right:8px}
.swift-title{font-size:18px;font-weight:700;margin:0 0 4px}
.swift-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.swift-sec{margin:12px 0}
.swift-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.swift-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px}
.swift-item{display:flex;align-items:baseline;gap:8px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.swift-name{font:13px/1 ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da)}
.swift-kind{font:11px ui-monospace,monospace;padding:1px 6px;border-radius:8px;background:#fde8e2;border:1px solid #f9c0b0;color:#b02a10}
.swift-pills{display:flex;flex-wrap:wrap;gap:6px}
.swift-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.swift-meta{font-size:13px;color:var(--fg-2,#888);margin:4px 0}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const lines = text.split('\n');

  // Swift tools version
  let toolsVersion = null;
  for (const line of lines) {
    const m = /\/\/\s*swift-tools-version:\s*([\d.]+)/i.exec(line);
    if (m) { toolsVersion = m[1]; break; }
  }

  // Package name
  let pkgName = null;
  for (const line of lines) {
    const m = /Package\s*\([\s\S]*?name\s*:\s*"([^"]+)"/.exec(line);
    if (m) { pkgName = m[1]; break; }
  }
  if (!pkgName) {
    // multi-line: search full text
    const m = /Package\s*\([^)]*name\s*:\s*"([^"]+)"/.exec(text);
    if (m) pkgName = m[1];
  }

  // Swift language versions
  const swiftLangVersions = [];
  const slvMatch = /\.swiftLanguageVersions\s*:\s*\[([^\]]*)\]/.exec(text);
  if (slvMatch) {
    const raw = slvMatch[1];
    for (const m of raw.matchAll(/\.v(\w+)/g)) swiftLangVersions.push(m[1]);
    for (const m of raw.matchAll(/"([\d.]+)"/g)) swiftLangVersions.push(m[1]);
  }

  // Products: executables and libraries
  const products = [];
  for (const line of lines) {
    const exe = /\.executable\s*\(\s*name\s*:\s*"([^"]+)"/.exec(line);
    if (exe) products.push({ name: exe[1], kind: 'executable' });
    const lib = /\.library\s*\(\s*name\s*:\s*"([^"]+)"/.exec(line);
    if (lib) products.push({ name: lib[1], kind: 'library' });
  }

  // Dependencies
  const deps = [];
  const seenDeps = new Set();
  for (const line of lines) {
    const byUrl = /\.package\s*\([^)]*url\s*:\s*"([^"]+)"/.exec(line);
    if (byUrl) {
      const url = byUrl[1];
      const short = url.split('/').pop().replace(/\.git$/, '');
      if (!seenDeps.has(short)) { seenDeps.add(short); deps.push(short); }
    }
    const byName = /\.package\s*\([^)]*name\s*:\s*"([^"]+)"/.exec(line);
    if (byName && !seenDeps.has(byName[1])) { seenDeps.add(byName[1]); deps.push(byName[1]); }
  }

  // Targets
  const targets = [];
  const seenTargets = new Set();
  const targetPatterns = [
    [/\.executableTarget\s*\(\s*name\s*:\s*"([^"]+)"/, 'executable'],
    [/\.testTarget\s*\(\s*name\s*:\s*"([^"]+)"/, 'test'],
    [/\.target\s*\(\s*name\s*:\s*"([^"]+)"/, 'target'],
  ];
  for (const line of lines) {
    for (const [re, kind] of targetPatterns) {
      const m = re.exec(line);
      if (m && !seenTargets.has(m[1])) { seenTargets.add(m[1]); targets.push({ name: m[1], kind }); break; }
    }
  }

  // Platforms
  const platforms = [];
  const platformRe = /\.(macOS|iOS|watchOS|tvOS|visionOS|linux)\s*\(\s*[".]([\w.]+)[".]?\s*\)/g;
  let pm;
  while ((pm = platformRe.exec(text)) !== null) {
    platforms.push(`${pm[1]} ${pm[2]}`);
  }
  const uniquePlatforms = [...new Set(platforms)];

  const metaHtml = [
    toolsVersion ? `<div class="swift-meta">Swift tools version: <strong>${esc(toolsVersion)}</strong></div>` : '',
    swiftLangVersions.length ? `<div class="swift-meta">Swift language versions: <strong>${swiftLangVersions.map(esc).join(', ')}</strong></div>` : '',
  ].join('');

  const productsHtml = products.length
    ? `<div class="swift-sec"><h3>Products (${products.length})</h3><ul class="swift-list">${products.map((p) => `<li class="swift-item"><span class="swift-name">${esc(p.name)}</span><span class="swift-kind">${esc(p.kind)}</span></li>`).join('')}</ul></div>`
    : '';

  const targetsHtml = targets.length
    ? `<div class="swift-sec"><h3>Targets (${targets.length})</h3><ul class="swift-list">${targets.map((t) => `<li class="swift-item"><span class="swift-name">${esc(t.name)}</span><span class="swift-kind">${esc(t.kind)}</span></li>`).join('')}</ul></div>`
    : '';

  const depsHtml = deps.length
    ? `<div class="swift-sec"><h3>Dependencies (${deps.length})</h3><div class="swift-pills">${deps.map((d) => `<span class="swift-pill">${esc(d)}</span>`).join('')}</div></div>`
    : '';

  const platformsHtml = uniquePlatforms.length
    ? `<div class="swift-sec"><h3>Platforms</h3><div class="swift-pills">${uniquePlatforms.map((p) => `<span class="swift-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'swift-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="swift-title"><span class="badge-swift">Swift Package</span>${esc(pkgName || 'Package.swift')}</div>
<div class="swift-sub">Swift Package Manager manifest</div>
${metaHtml}${productsHtml}${depsHtml}${targetsHtml}${platformsHtml}`;
  return { parentNode: host };
}
