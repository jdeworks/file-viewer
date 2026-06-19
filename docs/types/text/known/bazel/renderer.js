const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.bzl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-bzl{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#43a047;color:#fff;vertical-align:middle;margin-right:8px}
.bzl-title{font-size:18px;font-weight:700;margin:0 0 4px}
.bzl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.bzl-sec{margin:12px 0}
.bzl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.bzl-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px}
.bzl-item{display:flex;align-items:baseline;gap:8px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.bzl-name{font:13px/1 ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da)}
.bzl-kind{font:11px ui-monospace,monospace;padding:1px 6px;border-radius:8px;background:#dcfce7;border:1px solid #86efac;color:#166534}
.bzl-pills{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 4px}
.bzl-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.bzl-stat{font-size:13px;color:var(--fg-2,#888);margin:4px 0}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const lines = text.split('\n');

  const filename = (intake.filename || '').split('/').pop() || 'BUILD';
  const isWorkspace = /^WORKSPACE/.test(filename);

  // Parse rule calls: rule_name(name = "...", ...)
  const targets = [];
  const seenTargets = new Set();
  let inBlock = 0;
  let ruleName = null;
  let targetName = null;

  for (const line of lines) {
    const stripped = line.trim();
    // Skip comments
    if (stripped.startsWith('#')) continue;

    // Detect rule start: identifier followed by (
    if (inBlock === 0) {
      const ruleMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/.exec(stripped);
      if (ruleMatch && !['if', 'for', 'def', 'class'].includes(ruleMatch[1])) {
        ruleName = ruleMatch[1];
        targetName = null;
        inBlock = (stripped.match(/\(/g) || []).length - (stripped.match(/\)/g) || []).length;
        // name might be on the same line
        const nm = /name\s*=\s*["']([^"']+)["']/.exec(stripped);
        if (nm) targetName = nm[1];
        if (inBlock <= 0) {
          // single-line rule
          if (ruleName && targetName && !seenTargets.has(targetName)) {
            seenTargets.add(targetName);
            targets.push({ name: targetName, rule: ruleName });
          }
          inBlock = 0; ruleName = null; targetName = null;
        }
      }
    } else {
      inBlock += (stripped.match(/\(/g) || []).length - (stripped.match(/\)/g) || []).length;
      if (!targetName) {
        const nm = /name\s*=\s*["']([^"']+)["']/.exec(stripped);
        if (nm) targetName = nm[1];
      }
      if (inBlock <= 0) {
        if (ruleName && targetName && !seenTargets.has(targetName)) {
          seenTargets.add(targetName);
          targets.push({ name: targetName, rule: ruleName });
        }
        inBlock = 0; ruleName = null; targetName = null;
      }
    }
  }

  // Extract distinct rule kinds used
  const ruleKinds = [...new Set(targets.map((t) => t.rule))];

  // For WORKSPACE: also extract http_archive / git_repository dependencies
  const deps = [];
  if (isWorkspace) {
    for (const t of targets) {
      if (/http_archive|git_repository|local_repository|maven_jar/.test(t.rule)) {
        deps.push(t.name);
      }
    }
  }

  const targetHtml = targets.length
    ? `<div class="bzl-sec"><h3>Targets (${targets.length})</h3><ul class="bzl-list">${targets.map((t) => `<li class="bzl-item"><span class="bzl-name">${esc(t.name)}</span><span class="bzl-kind">${esc(t.rule)}</span></li>`).join('')}</ul></div>`
    : '<div class="bzl-stat">No named targets found</div>';

  const rulesHtml = ruleKinds.length > 1
    ? `<div class="bzl-sec"><h3>Rules used (${ruleKinds.length})</h3><div class="bzl-pills">${ruleKinds.map((r) => `<span class="bzl-pill">${esc(r)}</span>`).join('')}</div></div>`
    : '';

  const depsHtml = deps.length
    ? `<div class="bzl-sec"><h3>External dependencies (${deps.length})</h3><div class="bzl-pills">${deps.map((d) => `<span class="bzl-pill">${esc(d)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'bzl-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="bzl-title"><span class="badge-bzl">Bazel</span>${esc(filename)}</div>
<div class="bzl-sub">${isWorkspace ? 'Workspace definition' : 'Build targets'}</div>
${targetHtml}${rulesHtml}${depsHtml}`;
  return { parentNode: host };
}
