const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.rc-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.badge-rc{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#FF6B35;color:#fff;vertical-align:middle;}
.rc-title{font-size:18px;font-weight:700;margin:0;}
.rc-sub{font-size:12px;color:var(--fg-2,#888);margin:2px 0 0;}
.rc-sec{margin-top:16px;}
.rc-sec h3{font-size:12px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px;}
.rc-card{border:1px solid var(--border,#e8eaed);border-radius:6px;padding:8px 12px;}
.rc-kv{display:flex;gap:10px;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border,#eaecef);}
.rc-kv:last-child{border-bottom:none;}
.rc-kv-k{font-family:ui-monospace,monospace;font-weight:600;min-width:160px;flex-shrink:0;color:var(--fg,#24292f);}
.rc-kv-v{font-family:ui-monospace,monospace;color:var(--fg-2,#888);}
.rc-pill{display:inline-block;padding:2px 9px;border-radius:10px;font-size:12px;font-family:ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.rc-pill.rule{background:#fff7ed;border-color:#fed7aa;color:#9a3412;}
.rc-pill.set{background:#fef3c7;border-color:#fcd34d;color:#78350f;}
.rc-pill.path{background:#f0fdf4;border-color:#86efac;color:#166534;}
.rc-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
`;

// Extract class names from ->withRules([...]) block
function extractWithRules(text) {
  const m = /->withRules\s*\(\s*\[([^\]]+)\]/s.exec(text);
  if (!m) return [];
  const block = m[1];
  const classes = [];
  const re = /\\?([A-Za-z_][A-Za-z0-9_]*)::class/g;
  let match;
  while ((match = re.exec(block)) !== null) classes.push(match[1]);
  // Also handle bare class name strings
  const strRe = /['"]([A-Za-z\\][A-Za-z0-9_\\]+Rector)['"]/g;
  while ((match = strRe.exec(block)) !== null) {
    const name = match[1].split('\\').pop();
    if (!classes.includes(name)) classes.push(name);
  }
  return classes;
}

// Extract sets from ->withPhpSets(...)
function extractPhpSets(text) {
  const sets = [];
  // ->withPhpSets(php81: true, php80: true)
  const m = /->withPhpSets\s*\(([^)]+)\)/s.exec(text);
  if (m) {
    const args = m[1];
    const re = /([a-zA-Z0-9_]+)\s*:\s*true/g;
    let match;
    while ((match = re.exec(args)) !== null) sets.push(match[1]);
    if (!sets.length && args.trim()) sets.push(args.trim());
  }
  return sets;
}

// Extract dead code level from ->withDeadCodeLevel(N)
function extractDeadCodeLevel(text) {
  const m = /->withDeadCodeLevel\s*\(\s*(\d+)\s*\)/.exec(text);
  return m ? m[1] : null;
}

// Extract ->withTypeCoverageLevel(N)
function extractTypeCoverageLevel(text) {
  const m = /->withTypeCoverageLevel\s*\(\s*(\d+)\s*\)/.exec(text);
  return m ? m[1] : null;
}

// Extract PHP version target: PhpVersion::PHP_81, PHP_VERSION_ID, or ->withPhpVersion(...)
function extractPhpVersion(text) {
  // PhpVersion::PHP_81 style
  let m = /PhpVersion::PHP_(\d)(\d+)/.exec(text);
  if (m) return `${m[1]}.${m[2]}`;
  // ->withPhpVersion(PhpVersion::PHP_81)
  m = /->withPhpVersion\s*\(\s*PhpVersion::PHP_(\d)(\d+)\s*\)/.exec(text);
  if (m) return `${m[1]}.${m[2]}`;
  // ->withPhpVersion(80100) or similar int
  m = /->withPhpVersion\s*\(\s*(\d{5,})\s*\)/.exec(text);
  if (m) {
    const v = m[1];
    const major = parseInt(v.slice(0, 2), 10);
    const minor = parseInt(v.slice(2, 4), 10);
    return `${major}.${minor}`;
  }
  return null;
}

// Extract paths from ->withPaths([...])
function extractPaths(text) {
  const m = /->withPaths\s*\(\s*\[([^\]]+)\]/s.exec(text);
  if (!m) return [];
  const block = m[1];
  const paths = [];
  const re = /['"]([^'"]+)['"]/g;
  let match;
  while ((match = re.exec(block)) !== null) paths.push(match[1].replace(/__DIR__\s*\.?\s*/, '<project>'));
  // Also __DIR__ . '/path'
  const dirRe = /__DIR__\s*\.\s*['"]([^'"]+)['"]/g;
  while ((match = dirRe.exec(block)) !== null) {
    const p = '<project>' + match[1];
    if (!paths.includes(p)) paths.push(p);
  }
  return [...new Set(paths)];
}

// Extract ->withSkip([...]) classes/patterns
function extractSkip(text) {
  const m = /->withSkip\s*\(\s*\[([^\]]+)\]/s.exec(text);
  if (!m) return [];
  const block = m[1];
  const items = [];
  const re = /\\?([A-Za-z_][A-Za-z0-9_\\]*)::class/g;
  let match;
  while ((match = re.exec(block)) !== null) items.push(match[1].split('\\').pop());
  return items;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const host = document.createElement('div');
  host.className = 'rc-doc';

  const rules = extractWithRules(text);
  const phpSets = extractPhpSets(text);
  const deadCodeLevel = extractDeadCodeLevel(text);
  const typeCoverageLevel = extractTypeCoverageLevel(text);
  const phpVersion = extractPhpVersion(text);
  const paths = extractPaths(text);
  const skipped = extractSkip(text);

  // Detect additional set methods
  const additionalSets = [];
  if (/->withPreparedSets\s*\(/.test(text)) {
    const m = /->withPreparedSets\s*\(([^)]+)\)/s.exec(text);
    if (m) {
      const args = m[1];
      const re = /([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*true/g;
      let match;
      while ((match = re.exec(args)) !== null) additionalSets.push(match[1]);
    }
  }

  const subtitle = [
    phpVersion ? `PHP ${phpVersion}` : '',
    phpSets.length ? `PHP sets: ${phpSets.join(', ')}` : '',
    rules.length ? `${rules.length} rule${rules.length !== 1 ? 's' : ''}` : '',
    deadCodeLevel ? `dead code level ${deadCodeLevel}` : '',
  ].filter(Boolean).join(' · ') || 'Rector PHP refactoring configuration';

  const settingsRows = [
    phpVersion ? `<div class="rc-kv"><span class="rc-kv-k">PHP target version</span><span class="rc-kv-v">${esc(phpVersion)}</span></div>` : '',
    deadCodeLevel ? `<div class="rc-kv"><span class="rc-kv-k">withDeadCodeLevel</span><span class="rc-kv-v">${esc(deadCodeLevel)}</span></div>` : '',
    typeCoverageLevel ? `<div class="rc-kv"><span class="rc-kv-k">withTypeCoverageLevel</span><span class="rc-kv-v">${esc(typeCoverageLevel)}</span></div>` : '',
  ].filter(Boolean).join('');

  const settingsHtml = settingsRows ? `<div class="rc-sec"><h3>Settings</h3><div class="rc-card">${settingsRows}</div></div>` : '';

  const phpSetsAll = [...phpSets, ...additionalSets];
  const setsHtml = phpSetsAll.length ? `<div class="rc-sec"><h3>PHP Sets &amp; Prepared Sets</h3><div class="rc-pills">
${phpSetsAll.map((s) => `<span class="rc-pill set">${esc(s)}</span>`).join('')}
</div></div>` : '';

  const rulesHtml = rules.length ? `<div class="rc-sec"><h3>Rules (${rules.length})</h3><div class="rc-pills">
${rules.map((r) => `<span class="rc-pill rule">${esc(r)}</span>`).join('')}
</div></div>` : '';

  const pathsHtml = paths.length ? `<div class="rc-sec"><h3>Scanned Paths (${paths.length})</h3><div class="rc-pills">
${paths.map((p) => `<span class="rc-pill path">${esc(p)}</span>`).join('')}
</div></div>` : '';

  const skipHtml = skipped.length ? `<div class="rc-sec"><h3>Skipped Rules (${skipped.length})</h3><div class="rc-pills">
${skipped.map((s) => `<span class="rc-pill">${esc(s)}</span>`).join('')}
</div></div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="rc-head">
  <span class="badge-rc">Rector</span>
  <div>
    <div class="rc-title">rector.php</div>
    <div class="rc-sub">${esc(subtitle)}</div>
  </div>
</div>
${settingsHtml}${setsHtml}${rulesHtml}${pathsHtml}${skipHtml}`;

  return { parentNode: host };
}
