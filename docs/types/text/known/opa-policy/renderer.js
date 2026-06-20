const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.opa-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.opa-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4D9DE0;color:#fff;vertical-align:middle;margin-right:8px}
.opa-title{font-size:18px;font-weight:700;margin:0 0 4px}
.opa-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.opa-sec{margin:14px 0}
.opa-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.opa-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.opa-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.opa-kv-k{color:var(--fg-2,#888);min-width:90px;flex-shrink:0}
.opa-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.opa-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 3px 2px 0}
.opa-count{display:inline-block;font-size:12px;padding:2px 8px;border-radius:10px;margin-right:6px}
.opa-count.allow{background:#e8f5e9;border:1px solid #a5d6a7;color:#1b5e20}
.opa-count.deny{background:#fde8e8;border:1px solid #fca5a5;color:#b91c1c}
.opa-count.fn{background:#eaf4ff;border:1px solid #a5c8f7;color:#1a5c99}
`;

export async function render(intake) {
  const text = intake.text || '';

  // Extract package name
  const pkgMatch = text.match(/^package\s+(\S+)/m);
  const packageName = pkgMatch ? pkgMatch[1] : '(unknown)';

  // Extract imports
  const imports = [];
  for (const line of text.split('\n')) {
    if (/^import\s/.test(line)) {
      imports.push(line.replace(/^import\s+/, '').trim());
    }
  }

  // Count allow rules
  const allowMatches = text.match(/^\s*allow\b/gm) || [];
  const allowCount = allowMatches.length;

  // Count deny rules
  const denyMatches = text.match(/^\s*deny\b/gm) || [];
  const denyCount = denyMatches.length;

  // Count function definitions (word followed by ( that is not allow/deny)
  const fnMatches = [];
  const fnRe = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm;
  let m;
  while ((m = fnRe.exec(text)) !== null) {
    const name = m[1];
    if (name !== 'allow' && name !== 'deny') {
      fnMatches.push(name);
    }
  }
  const fnCount = fnMatches.length;

  const importsHtml = imports.length
    ? imports.map((i) => `<span class="opa-chip">${esc(i)}</span>`).join('')
    : '<span style="color:var(--fg-2,#888);font-size:12px">none</span>';

  const fnList = [...new Set(fnMatches)];
  const fnHtml = fnList.length
    ? fnList.map((f) => `<span class="opa-chip">${esc(f)}</span>`).join('')
    : '';

  const host = document.createElement('div');
  host.className = 'opa-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="opa-badge">OPA Policy</span>
  <span class="opa-title">${esc(packageName)}</span>
</div>
<div class="opa-sub">Rego policy · package ${esc(packageName)}</div>
<div class="opa-sec">
  <h3>Rules</h3>
  <span class="opa-count allow">${allowCount} allow</span>
  <span class="opa-count deny">${denyCount} deny</span>
  ${fnCount > 0 ? `<span class="opa-count fn">${fnCount} helper function${fnCount !== 1 ? 's' : ''}</span>` : ''}
</div>
${imports.length > 0 ? `<div class="opa-sec"><h3>Imports</h3><div>${importsHtml}</div></div>` : ''}
${fnList.length > 0 ? `<div class="opa-sec"><h3>Functions</h3><div>${fnHtml}</div></div>` : ''}`;

  return { parentNode: host };
}
