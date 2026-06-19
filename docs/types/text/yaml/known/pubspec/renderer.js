const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function parseScalar(text, key) {
  const m = new RegExp('^' + key + ':\\s*(.+)', 'm').exec(text);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}

function parseBlock(text, key) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => new RegExp('^' + key + ':').test(l));
  if (start < 0) return [];
  const result = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l.startsWith('  ') && l.trim() && !/^\s+/.test(l)) break;
    const m = /^\s{2}(\S[^:]+?):\s*(.*)/.exec(l);
    if (m) result.push({ name: m[1].trim(), version: m[2].trim() || null });
  }
  return result;
}

export function render(intake) {
  const t = intake.text || '';
  const name = parseScalar(t, 'name') || '(unnamed)';
  const desc = parseScalar(t, 'description') || '';
  const version = parseScalar(t, 'version') || '';
  const sdk = (/environment:[\s\S]*?sdk:\s*["']?([^\n"']+)/.exec(t) || [])[1] || null;
  const flutter = (/environment:[\s\S]*?flutter:\s*["']?([^\n"']+)/.exec(t) || [])[1] || null;
  const isFlutter = /\bflutter:\s*$/m.test(t) || /flutter_sdk|flutter_test/.test(t);
  const deps = parseBlock(t, 'dependencies');
  const devDeps = parseBlock(t, 'dev_dependencies');

  const badge = `<span class="badge-pubspec">${isFlutter ? 'Flutter' : 'Dart'} Package</span>`;
  let html = `<style>
.pubspec-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif}
.badge-pubspec{display:inline-block;background:#0175C2;color:#fff;padding:2px 9px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.04em;margin-bottom:10px}
.pubspec-name{font-size:20px;font-weight:700;margin:4px 0}
.pubspec-desc{color:var(--fg-2);margin:4px 0 12px}
.pubspec-sdk{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.pubspec-sdk span{background:var(--bg-3);border-radius:4px;padding:2px 8px;font:12px ui-monospace,monospace}
.pubspec-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2);margin:12px 0 4px}
.pubspec-deps{list-style:none;margin:0;padding:0}
.pubspec-deps li{display:flex;justify-content:space-between;gap:12px;padding:3px 0;border-bottom:1px solid var(--border)}
.pubspec-dep-name{color:var(--accent);font:12px ui-monospace,monospace}
.pubspec-dep-ver{color:var(--fg-2);font:12px ui-monospace,monospace}
</style>
<div class="pubspec-doc">
${badge}
<div class="pubspec-name">${esc(name)}${version ? `<span style="font-size:14px;font-weight:400;color:var(--fg-2);margin-left:8px">${esc(version)}</span>` : ''}</div>
${desc ? `<div class="pubspec-desc">${esc(desc)}</div>` : ''}
<div class="pubspec-sdk">
${sdk ? `<span>Dart SDK: ${esc(sdk)}</span>` : ''}
${flutter ? `<span>Flutter SDK: ${esc(flutter)}</span>` : ''}
</div>`;

  if (deps.length) {
    html += `<div class="pubspec-sec"><h3>Dependencies (${deps.length})</h3><ul class="pubspec-deps">`;
    html += deps.map((d) => `<li><span class="pubspec-dep-name">${esc(d.name)}</span><span class="pubspec-dep-ver">${esc(d.version || 'any')}</span></li>`).join('');
    html += '</ul></div>';
  }
  if (devDeps.length) {
    html += `<div class="pubspec-sec"><h3>Dev Dependencies (${devDeps.length})</h3><ul class="pubspec-deps">`;
    html += devDeps.map((d) => `<li><span class="pubspec-dep-name">${esc(d.name)}</span><span class="pubspec-dep-ver">${esc(d.version || 'any')}</span></li>`).join('');
    html += '</ul></div>';
  }

  html += '</div>';
  const host = document.createElement('div');
  host.className = 'pubspec-host';
  host.innerHTML = html;
  return { parentNode: host };
}
