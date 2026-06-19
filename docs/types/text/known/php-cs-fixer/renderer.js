// Enhanced PHP CS Fixer config view. The file is a PHP script returning a
// Finder+Config object, so we use regex-based extraction on the raw text.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pcf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pcf-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.badge-pcf{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#16a34a;color:#fff;vertical-align:middle;}
.pcf-title{font-size:18px;font-weight:700;margin:0;}
.pcf-sub{font-size:12px;color:var(--fg-2,#888);margin:2px 0 0;}
.pcf-sec{margin-top:16px;}
.pcf-sec h3{font-size:12px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px;}
.pcf-pills{display:flex;flex-wrap:wrap;gap:6px;}
.pcf-pill{display:inline-block;padding:2px 9px;border-radius:10px;font-size:12px;font-family:ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.pcf-pill.dir{background:#f0fdf4;border-color:#86efac;color:#166534;}
.pcf-pill.fixer{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;}
.pcf-pill.rule{background:#fefce8;border-color:#fde68a;color:#78350f;}
.pcf-pill.on{background:#f0fdf4;border-color:#86efac;color:#166534;}
.pcf-pill.off{background:#fef2f2;border-color:#fca5a5;color:#7f1d1d;}
.pcf-kv{display:flex;gap:10px;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border,#eaecef);}
.pcf-kv:last-child{border-bottom:none;}
.pcf-kv-k{font-family:ui-monospace,monospace;font-weight:600;min-width:140px;flex-shrink:0;}
.pcf-kv-v{font-family:ui-monospace,monospace;color:var(--fg-2,#888);}
`;

// Extract string arguments from method chains: ->method('arg1') or ->method(__DIR__.'/arg1')
function extractMethodArgs(text, methodName) {
  const results = [];
  const re = new RegExp(`->${methodName}\\s*\\(([^)]+)\\)`, 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    // split on comma, extract string literals
    const args = m[1];
    const strRe = /['"]([^'"]+)['"]/g;
    let sm;
    while ((sm = strRe.exec(args)) !== null) results.push(sm[1]);
    // Also handle __DIR__ . '/path'
    const dirRe = /__DIR__\s*\.\s*['"]([^'"]+)['"]/g;
    while ((sm = dirRe.exec(args)) !== null) results.push('<project>' + sm[1]);
  }
  return results;
}

// Extract rules from ->setRules([...]) block
function extractRules(text) {
  const m = /->setRules\s*\(\s*\[([^\]]+)\]/s.exec(text);
  if (!m) return { presets: [], fixers: [] };
  const block = m[1];
  const presets = [];
  const fixers = [];
  // Preset sets like '@PSR2' => true
  const presetRe = /'(@[^']+)'\s*=>\s*(true|false)/g;
  let pm;
  while ((pm = presetRe.exec(block)) !== null) presets.push({ name: pm[1], enabled: pm[2] === 'true' });
  // Individual fixers
  const fixerRe = /'([^@][^']+)'\s*=>\s*(true|false|\[[^\]]*\]|\d+)/g;
  let fm;
  while ((fm = fixerRe.exec(block)) !== null) fixers.push({ name: fm[1], value: fm[2] });
  return { presets, fixers };
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const host = document.createElement('div');
  host.className = 'pcf-doc';

  // Extract finder directories
  const inDirs = extractMethodArgs(text, 'in');
  const excludeDirs = extractMethodArgs(text, 'exclude');
  const notPaths = extractMethodArgs(text, 'notPath');
  const nameDirs = extractMethodArgs(text, 'name');

  // Extract rules
  const { presets, fixers } = extractRules(text);

  // Detect risky fixers allowed
  const allowRisky = /->setRiskyAllowed\s*\(\s*true\s*\)/.test(text);

  // Detect PHP version target
  const phpVersion = (/PhpVersion::PHP_(\d+)_(\d+)/.exec(text) || [])[0];
  const phpVer = phpVersion ? phpVersion.replace('PhpVersion::PHP_', '').replace('_', '.') : null;

  // Cache dir
  const cacheFile = (/'\.php-cs-fixer\.cache'|setCacheFile\([^)]+\)/.exec(text) || [])[0];

  const subtitle = [
    inDirs.length ? `${inDirs.length} director${inDirs.length !== 1 ? 'ies' : 'y'}` : '',
    presets.length ? `${presets.length} rule set${presets.length !== 1 ? 's' : ''}` : '',
    fixers.length ? `${fixers.length} fixer${fixers.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ') || 'PHP CS Fixer configuration';

  const dirsHtml = inDirs.length ? `<div class="pcf-sec"><h3>Directories Scanned (${inDirs.length})</h3><div class="pcf-pills">
    ${inDirs.map((d) => `<span class="pcf-pill dir">${esc(d)}</span>`).join('')}
  </div></div>` : '';

  const excludeHtml = excludeDirs.length ? `<div class="pcf-sec"><h3>Excluded Directories</h3><div class="pcf-pills">
    ${excludeDirs.map((d) => `<span class="pcf-pill">${esc(d)}</span>`).join('')}
  </div></div>` : '';

  const presetsHtml = presets.length ? `<div class="pcf-sec"><h3>Rule Sets</h3><div class="pcf-pills">
    ${presets.map((p) => `<span class="pcf-pill fixer ${p.enabled ? 'on' : 'off'}">${esc(p.name)}</span>`).join('')}
  </div></div>` : '';

  const fixersHtml = fixers.length ? `<div class="pcf-sec"><h3>Custom Fixers (${fixers.length})</h3><div class="pcf-pills">
    ${fixers.slice(0, 12).map((f) => `<span class="pcf-pill rule">${esc(f.name)}</span>`).join('')}
    ${fixers.length > 12 ? `<span class="pcf-pill" style="color:var(--fg-2,#888);">+${fixers.length - 12} more</span>` : ''}
  </div></div>` : '';

  const settingsRows = [
    phpVer ? `<div class="pcf-kv"><span class="pcf-kv-k">PHP version</span><span class="pcf-kv-v">${esc(phpVer)}</span></div>` : '',
    `<div class="pcf-kv"><span class="pcf-kv-k">risky fixers</span><span class="pcf-kv-v"><span class="pcf-pill ${allowRisky ? 'on' : 'off'}" style="display:inline-block;">${allowRisky ? 'allowed' : 'not allowed'}</span></span></div>`,
  ].filter(Boolean).join('');

  host.innerHTML = `<style>${CSS}</style>
<div class="pcf-head">
  <span class="badge-pcf">PHP CS Fixer</span>
  <div>
    <div class="pcf-title">.php-cs-fixer.php</div>
    <div class="pcf-sub">${esc(subtitle)}</div>
  </div>
</div>
<div class="pcf-sec"><h3>Settings</h3>${settingsRows}</div>
${dirsHtml}${excludeHtml}${presetsHtml}${fixersHtml}`;

  return { parentNode: host };
}
