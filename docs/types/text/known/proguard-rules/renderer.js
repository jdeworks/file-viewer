const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-pg{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3ddc84;color:#1a1a1a;vertical-align:middle;margin-right:8px}
.pg-title{font-size:18px;font-weight:700;margin:0 0 4px}
.pg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.pg-sec{margin:14px 0}
.pg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;display:flex;align-items:center;gap:6px}
.pg-count{font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:0 6px;color:var(--fg-2,#888)}
.pg-summary{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px}
.pg-chip{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.pg-chip-n{font-size:11px;font-weight:700;background:#3ddc84;color:#1a1a1a;border-radius:6px;padding:0 5px}
.pg-table{width:100%;border-collapse:collapse;font-size:12px}
.pg-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px 4px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.pg-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;vertical-align:top}
.pg-table tr:last-child td{border-bottom:none}
.pg-rule-type{display:inline-block;font-size:10px;padding:1px 6px;border-radius:5px;background:#d1fae5;border:1px solid #6ee7b7;color:#065f46;font-weight:600;white-space:nowrap}
.pg-rule-type.warn{background:#fef3c7;border-color:#fcd34d;color:#92400e}
.pg-comment{color:var(--fg-2,#888);font-size:12px;font-style:italic}
`;

const RULE_TYPES = [
  { prefix: '-keepclassmembers', label: '-keepclassmembers' },
  { prefix: '-keepclasseswithmembers', label: '-keepclasseswithmembers' },
  { prefix: '-keepnames', label: '-keepnames' },
  { prefix: '-keepclassmembernames', label: '-keepclassmembernames' },
  { prefix: '-keep ', label: '-keep' },
  { prefix: '-keep\t', label: '-keep' },
  { prefix: '-dontwarn', label: '-dontwarn' },
  { prefix: '-dontshrink', label: '-dontshrink' },
  { prefix: '-dontobfuscate', label: '-dontobfuscate' },
  { prefix: '-dontoptimize', label: '-dontoptimize' },
  { prefix: '-keepattributes', label: '-keepattributes' },
  { prefix: '-obfuscationdictionary', label: '-obfuscationdictionary' },
  { prefix: '-printmapping', label: '-printmapping' },
  { prefix: '-printseeds', label: '-printseeds' },
  { prefix: '-assumenosideeffects', label: '-assumenosideeffects' },
  { prefix: '-adaptclassstrings', label: '-adaptclassstrings' },
];

const KEEP_PREFIXES = ['-keep ', '-keep\t', '-keepclassmembers', '-keepclasseswithmembers', '-keepnames', '-keepclassmembernames'];

function classPattern(line) {
  // Extract the class pattern from a -keep rule line
  const m = line.match(/(?:class|interface|enum)\s+([\w.*$]+)/);
  return m ? m[1] : '';
}

export function render(intake) {
  const text = intake.text || '';
  const lines = text.split('\n');

  // Count rule types
  const counts = {};
  const keepRules = [];
  let commentCount = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) { commentCount++; continue; }

    let matched = false;
    for (const { prefix, label } of RULE_TYPES) {
      if (line.startsWith(prefix)) {
        counts[label] = (counts[label] || 0) + 1;
        if (KEEP_PREFIXES.some((p) => line.startsWith(p))) {
          const cls = classPattern(line);
          keepRules.push({ type: label, cls, raw: line });
        }
        matched = true;
        break;
      }
    }
    if (!matched && line.startsWith('-')) {
      const directive = line.split(/[\s{]/)[0];
      counts[directive] = (counts[directive] || 0) + 1;
    }
  }

  const totalRules = Object.values(counts).reduce((a, b) => a + b, 0);
  const filename = (intake.name || intake.filename || 'proguard-rules.pro').split('/').pop();

  // Summary chips
  const summaryChips = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, n]) => `<span class="pg-chip"><span class="pg-chip-n">${n}</span>${esc(label)}</span>`)
    .join('');

  // Keep rules table (up to 50)
  const keepSlice = keepRules.slice(0, 50);
  const keepTableHtml = keepSlice.length ? `
<div class="pg-sec">
  <h3>Keep rules <span class="pg-count">${keepRules.length}</span></h3>
  <table class="pg-table">
    <thead><tr><th>Type</th><th>Class pattern</th></tr></thead>
    <tbody>
      ${keepSlice.map((r) => {
        const isWarn = r.type === '-dontwarn';
        return `<tr>
          <td><span class="pg-rule-type${isWarn ? ' warn' : ''}">${esc(r.type)}</span></td>
          <td>${esc(r.cls || r.raw.slice(0, 80))}</td>
        </tr>`;
      }).join('')}
      ${keepRules.length > 50 ? `<tr><td colspan="2" style="color:var(--fg-2,#888)">…and ${keepRules.length - 50} more</td></tr>` : ''}
    </tbody>
  </table>
</div>` : '';

  const host = document.createElement('div');
  host.className = 'pg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="pg-title"><span class="badge-pg">ProGuard</span>${esc(filename)}</div>
<div class="pg-sub">${totalRules} directive${totalRules !== 1 ? 's' : ''}${commentCount ? ` · ${commentCount} comment line${commentCount !== 1 ? 's' : ''}` : ''}</div>
${summaryChips ? `<div class="pg-summary">${summaryChips}</div>` : ''}
${keepTableHtml}`;

  return { parentNode: host };
}
