const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.scalafix-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.scalafix-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#336699;color:#fff;vertical-align:middle;margin-right:8px;}
.scalafix-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.scalafix-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.scalafix-sec{margin:12px 0;}
.scalafix-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.scalafix-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.scalafix-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.scalafix-kv-key{color:var(--fg-2,#888);min-width:160px;flex-shrink:0;}
.scalafix-kv-val{font-family:ui-monospace,monospace;}
.scalafix-chips{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.scalafix-chip{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;background:var(--bg-3,#e0ecff);color:var(--fg,#24292f);font-family:ui-monospace,monospace;}
.scalafix-chip.rule{background:#dbeafe;color:#1e3a5f;}
.scalafix-chip.setting{background:#f0e6ff;color:#5a2d82;}
.scalafix-chip.flag{background:#d4edda;color:#155724;}
.scalafix-chip.flag.off{background:#f8d7da;color:#721c24;}
`;

function parseScalafix(text) {
  // Parse top-level rules = [ ... ] or rules = \n  - RuleName
  let rules = [];
  const rulesBlock = /^rules\s*=\s*\[([^\]]*)\]/m.exec(text);
  if (rulesBlock) {
    rules = rulesBlock[1].split(',').map((r) => r.trim().replace(/^"|"$/g, '')).filter(Boolean);
  } else {
    // YAML-style list under "rules:"
    const yamlRules = /^rules\s*:\s*\n((?:\s*-\s*.+\n?)+)/m.exec(text);
    if (yamlRules) {
      rules = yamlRules[1].split('\n').map((l) => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean);
    }
  }

  const get = (key) => {
    const m = new RegExp(`^\\s*${key}\\s*[=:]+\\s*(.+)`, 'm').exec(text);
    return m ? m[1].trim().replace(/^"|"$/g, '') : null;
  };

  const getBool = (key) => {
    const val = get(key);
    if (val === null) return null;
    return val.toLowerCase() === 'true';
  };

  return {
    rules: rules.slice(0, 15),
    // OrganizeImports settings
    oiGroupedImports: get('OrganizeImports\\.groupedImports'),
    oiGroups: (() => {
      const m = /OrganizeImports\.groups\s*=\s*\[([^\]]*)\]/.exec(text);
      return m ? m[1].split(',').map((g) => g.trim().replace(/^"|"$/g, '')).filter(Boolean).slice(0, 5) : [];
    })(),
    // DisableSyntax flags
    dsNoVars: getBool('DisableSyntax\\.noVars'),
    dsNoThrows: getBool('DisableSyntax\\.noThrows'),
    dsNoAsInstanceOf: getBool('DisableSyntax\\.noAsInstanceOf'),
    // RemoveUnused settings
    ruImports: getBool('RemoveUnused\\.imports'),
    ruPrivates: getBool('RemoveUnused\\.privates'),
    ruLocals: getBool('RemoveUnused\\.locals'),
  };
}

function flagChip(label, value) {
  if (value === null) return '';
  return `<span class="scalafix-chip flag${value ? '' : ' off'}">${esc(label)}: ${value ? 'on' : 'off'}</span>`;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'scalafix-doc';
  const text = intake.text || '';
  const info = parseScalafix(text);

  const rulesHtml = info.rules.length
    ? `<div class="scalafix-sec"><h3>Rules</h3><div class="scalafix-chips">${info.rules.map((r) => `<span class="scalafix-chip rule">${esc(r)}</span>`).join('')}</div></div>`
    : '';

  const oiSettingsRows = [];
  if (info.oiGroupedImports) oiSettingsRows.push(['groupedImports', info.oiGroupedImports]);
  const oiGroupsHtml = info.oiGroups.length
    ? `<div style="margin-top:4px"><span style="font-size:11px;color:var(--fg-2,#888)">groups:</span><div class="scalafix-chips" style="margin-top:4px">${info.oiGroups.map((g) => `<span class="scalafix-chip setting">${esc(g)}</span>`).join('')}</div></div>`
    : '';
  const oiHtml = (oiSettingsRows.length || info.oiGroups.length)
    ? `<div class="scalafix-sec"><h3>OrganizeImports</h3><div class="scalafix-card">${oiSettingsRows.map(([k, v]) => `<div class="scalafix-kv"><span class="scalafix-kv-key">${esc(k)}</span><span class="scalafix-kv-val">${esc(v)}</span></div>`).join('')}${oiGroupsHtml}</div></div>`
    : '';

  const dsFlags = [flagChip('noVars', info.dsNoVars), flagChip('noThrows', info.dsNoThrows), flagChip('noAsInstanceOf', info.dsNoAsInstanceOf)].filter(Boolean);
  const dsHtml = dsFlags.length
    ? `<div class="scalafix-sec"><h3>DisableSyntax</h3><div class="scalafix-chips">${dsFlags.join('')}</div></div>`
    : '';

  const ruFlags = [flagChip('imports', info.ruImports), flagChip('privates', info.ruPrivates), flagChip('locals', info.ruLocals)].filter(Boolean);
  const ruHtml = ruFlags.length
    ? `<div class="scalafix-sec"><h3>RemoveUnused</h3><div class="scalafix-chips">${ruFlags.join('')}</div></div>`
    : '';

  const ruleCount = info.rules.length;
  host.innerHTML = `<style>${CSS}</style>
<div class="scalafix-title"><span class="scalafix-badge">Scalafix</span>Scalafix configuration</div>
<div class="scalafix-sub">${ruleCount ? `${ruleCount} rule${ruleCount !== 1 ? 's' : ''} configured` : 'Scala linter and rewriter config'}</div>
${rulesHtml}${oiHtml}${dsHtml}${ruHtml}`;

  return { parentNode: host };
}
