const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.valeini-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.valeini-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#007AFF;color:#fff;vertical-align:middle;margin-right:8px;}
.valeini-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.valeini-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.valeini-sec{margin:14px 0;}
.valeini-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.valeini-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin-bottom:8px;}
.valeini-kv{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;font-size:12px;margin:2px 0;}
.valeini-kv dt{font-weight:600;white-space:nowrap;color:var(--fg-2,#888);font-family:ui-monospace,monospace;}
.valeini-kv dd{margin:0;color:var(--fg,#24292f);font-family:ui-monospace,monospace;word-break:break-all;}
.valeini-alert{display:inline-block;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600;}
.valeini-alert-suggestion{background:#dbeafe;color:#1e40af;}
.valeini-alert-warning{background:#fef9c3;color:#713f12;}
.valeini-alert-error{background:#fee2e2;color:#991b1b;}
.valeini-glob-header{font-family:ui-monospace,monospace;font-weight:700;font-size:13px;margin-bottom:6px;color:var(--fg,#24292f);}
.valeini-style-pills{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0;}
.valeini-style-pill{display:inline-flex;align-items:center;font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.valeini-rule-row{display:flex;align-items:baseline;gap:8px;font-size:12px;padding:2px 0;border-bottom:1px solid var(--border,#f0f0f0);}
.valeini-rule-row:last-child{border-bottom:none;}
.valeini-rule-name{font-family:ui-monospace,monospace;color:var(--fg,#24292f);}
.valeini-on{display:inline-block;padding:1px 6px;border-radius:6px;font-size:10px;font-weight:700;background:#dcfce7;color:#166534;}
.valeini-off{display:inline-block;padding:1px 6px;border-radius:6px;font-size:10px;font-weight:700;background:#fee2e2;color:#991b1b;}
`;

/**
 * Parse INI text into sections: { sectionName: { key: value } }
 * Section names are lowercased; key names preserved as-is.
 */
function parseIni(text) {
  const sections = {};
  let current = null;
  for (const rawLine of (text || '').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) continue;
    const sectionMatch = /^\[([^\]]+)\]/.exec(line);
    if (sectionMatch) {
      current = sectionMatch[1]; // preserve case for glob sections
      if (!sections[current]) sections[current] = {};
      continue;
    }
    if (!current) continue;
    const kvMatch = /^([^=\s]+)\s*=\s*(.*)$/.exec(line);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const value = kvMatch[2].trim().replace(/\s+[;#].*$/, ''); // strip inline comments
      sections[current][key] = value;
    }
  }
  return sections;
}

const KNOWN_STYLES = ['Vale', 'write-good', 'proselint', 'Google', 'Microsoft', 'RedHat', 'alex', 'Joblint'];

function alertLevelBadge(level) {
  const l = (level || '').toLowerCase();
  const cls = l === 'suggestion' ? 'valeini-alert-suggestion' : l === 'error' ? 'valeini-alert-error' : 'valeini-alert-warning';
  return `<span class="valeini-alert ${cls}">${esc(level || 'suggestion')}</span>`;
}

export function render(intake) {
  const sections = parseIni(intake.text || '');

  // Vale uses [core] or [vale] for global settings
  const coreSection = sections['core'] || sections['Core'] || sections['vale'] || sections['Vale'] || {};

  const stylesPath = coreSection['StylesPath'] || coreSection['stylesPath'] || '';
  const minAlertLevel = coreSection['MinAlertLevel'] || coreSection['minAlertLevel'] || 'suggestion';
  const packages = coreSection['Packages'] || coreSection['packages'] || '';
  const vocab = coreSection['Vocab'] || coreSection['vocab'] || '';

  // Parse packages list
  const packageList = packages ? packages.split(/[,\s]+/).filter(Boolean) : [];

  const subParts = [];
  if (stylesPath) subParts.push(`styles: ${stylesPath}`);
  subParts.push(`min level: ${minAlertLevel}`);
  if (packageList.length) subParts.push(`${packageList.length} package${packageList.length !== 1 ? 's' : ''}`);

  // [core] section HTML
  const coreHtml = `<div class="valeini-sec"><h3>[core]</h3><div class="valeini-card">
    <dl class="valeini-kv">
      ${stylesPath ? `<dt>StylesPath</dt><dd>${esc(stylesPath)}</dd>` : ''}
      <dt>MinAlertLevel</dt><dd>${alertLevelBadge(minAlertLevel)}</dd>
      ${vocab ? `<dt>Vocab</dt><dd>${esc(vocab)}</dd>` : ''}
      ${packageList.length ? `<dt>Packages</dt><dd>${packageList.map((p) => `<span class="valeini-style-pill">${esc(p)}</span>`).join(' ')}</dd>` : ''}
    </dl>
  </div></div>`;

  // File glob sections (everything except core/vale)
  const coreKeys = new Set(['core', 'Core', 'vale', 'Vale']);
  const globSections = Object.entries(sections)
    .filter(([name]) => !coreKeys.has(name))
    .slice(0, 5);

  const globsHtml = globSections.length ? `<div class="valeini-sec"><h3>File Rules (${globSections.length} glob${globSections.length !== 1 ? 's' : ''})</h3>
    ${globSections.map(([glob, rules]) => {
      const basedOn = rules['BasedOnStyles'] || rules['BasedOnStyles'] || '';
      const styles = basedOn ? basedOn.split(/[,\s]+/).filter(Boolean) : [];
      // Other rule overrides (not BasedOnStyles)
      const overrides = Object.entries(rules)
        .filter(([k]) => k !== 'BasedOnStyles')
        .slice(0, 8);

      const stylesHtml = styles.length ? `<div style="margin:4px 0;">
        <span style="font-size:11px;color:var(--fg-2,#888);margin-right:6px;">BasedOnStyles:</span>
        <span class="valeini-style-pills">${styles.map((s) => `<span class="valeini-style-pill">${esc(s)}</span>`).join('')}</span>
      </div>` : '';

      const overridesHtml = overrides.length ? `<div style="margin-top:6px;">
        ${overrides.map(([k, v]) => {
          const isOn = v.toUpperCase() === 'YES';
          const isOff = v.toUpperCase() === 'NO';
          return `<div class="valeini-rule-row">
            <span class="valeini-rule-name">${esc(k)}</span>
            ${isOn ? '<span class="valeini-on">YES</span>' : isOff ? '<span class="valeini-off">NO</span>' : `<span style="font-size:11px;font-family:ui-monospace,monospace;color:var(--fg-2,#666);">${esc(v)}</span>`}
          </div>`;
        }).join('')}
      </div>` : '';

      return `<div class="valeini-card">
        <div class="valeini-glob-header">${esc(glob)}</div>
        ${stylesHtml}${overridesHtml}
      </div>`;
    }).join('')}
  </div>` : '';

  const host = document.createElement('div');
  host.className = 'valeini-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="valeini-title"><span class="valeini-badge">Vale</span>Vale Prose Linter Config</div>
<div class="valeini-sub">${esc(subParts.join(' · '))}</div>
${coreHtml}${globsHtml}`;
  return { parentNode: host };
}
