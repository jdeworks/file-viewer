const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nj-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-nj{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#37474f;color:#fff;vertical-align:middle;margin-right:8px}
.nj-title{font-size:18px;font-weight:700;margin:0 0 4px}
.nj-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.nj-sec{margin:12px 0}
.nj-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.nj-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px}
.nj-item{display:flex;align-items:baseline;gap:8px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.nj-out{font:13px/1 ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nj-rule{font:11px ui-monospace,monospace;padding:1px 6px;border-radius:8px;background:#f1f5f9;border:1px solid #cbd5e1;color:#475569}
.nj-pills{display:flex;flex-wrap:wrap;gap:6px}
.nj-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.nj-stat{font-size:13px;color:var(--fg-2,#888);margin:4px 0}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const lines = text.split('\n');

  // Parse ninja build format
  // Rules: `rule NAME`
  // Builds: `build OUT: RULE [INPUTS]`
  // Variables: `NAME = VALUE`

  const rules = [];
  const seenRules = new Set();
  const builds = [];
  const vars = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const stripped = line.trim();
    i++;

    if (!stripped || stripped.startsWith('#')) continue;

    // rule declaration
    const ruleM = /^rule\s+(\S+)/.exec(stripped);
    if (ruleM && !seenRules.has(ruleM[1])) {
      seenRules.add(ruleM[1]);
      rules.push(ruleM[1]);
      continue;
    }

    // build statement: `build outputs: rule inputs`
    const buildM = /^build\s+(.+?)\s*:\s*(\S+)/.exec(stripped);
    if (buildM) {
      const outs = buildM[1].split(/\s+/).filter(Boolean);
      const rule = buildM[2];
      builds.push({ out: outs[0], rule });
      continue;
    }

    // variable assignment at top level (not indented)
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      const varM = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=/.exec(stripped);
      if (varM && !['rule', 'build', 'default', 'pool', 'subninja', 'include'].includes(varM[1])) {
        vars.push(varM[1]);
      }
    }
  }

  const MAX_BUILDS = 30;
  const shown = builds.slice(0, MAX_BUILDS);
  const extra = builds.length - shown.length;

  const buildsHtml = builds.length
    ? `<div class="nj-sec"><h3>Build edges (${builds.length})</h3><ul class="nj-list">${shown.map((b) => `<li class="nj-item"><span class="nj-out">${esc(b.out)}</span><span class="nj-rule">${esc(b.rule)}</span></li>`).join('')}${extra > 0 ? `<li class="nj-stat">… and ${extra} more</li>` : ''}</ul></div>`
    : '<div class="nj-stat">No build edges found</div>';

  const rulesHtml = rules.length
    ? `<div class="nj-sec"><h3>Rules (${rules.length})</h3><div class="nj-pills">${rules.map((r) => `<span class="nj-pill">${esc(r)}</span>`).join('')}</div></div>`
    : '';

  const varsHtml = vars.length
    ? `<div class="nj-stat">${vars.length} variable${vars.length !== 1 ? 's' : ''} defined</div>`
    : '';

  const host = document.createElement('div');
  host.className = 'nj-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="nj-title"><span class="badge-nj">Ninja</span>build.ninja</div>
<div class="nj-sub">${builds.length} build edge${builds.length !== 1 ? 's' : ''}, ${rules.length} rule${rules.length !== 1 ? 's' : ''}</div>
${buildsHtml}${rulesHtml}${varsHtml}`;
  return { parentNode: host };
}
