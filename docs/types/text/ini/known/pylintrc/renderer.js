const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-pl{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#b5a000;color:#fff;vertical-align:middle;margin-right:8px;}
.pl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pl-sec{margin:12px 0;}
.pl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.pl-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.pl-row{display:flex;gap:8px;font-size:13px;padding:3px 0;}
.pl-key{color:var(--fg-2,#888);min-width:160px;flex-shrink:0;font-size:12px;font-family:ui-monospace,monospace;}
.pl-val{font-family:ui-monospace,monospace;word-break:break-all;}
.pl-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;}
.pl-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:#fef9c3;border:1px solid #fde047;color:#713f12;font-family:ui-monospace,monospace;}
.pl-chip.dis{background:#fef2f2;border-color:#fca5a5;color:#b91c1c;}
`;

function parseIni(text) {
  const secs = {};
  let cur = null;
  for (const rawLine of (text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const sec = line.match(/^\[([^\]]+)\]/);
    if (sec) { cur = sec[1].trim(); secs[cur] = {}; continue; }
    if (cur) {
      const kv = line.match(/^([^=]+)=(.*)/);
      if (kv) {
        const key = kv[1].trim();
        const val = kv[2].trim();
        if (!(key in secs[cur])) secs[cur][key] = val;
      }
    }
  }
  return secs;
}

function row(label, value) {
  if (value == null || value === '') return '';
  return `<div class="pl-row"><span class="pl-key">${esc(label)}</span><span class="pl-val">${esc(value)}</span></div>`;
}

export function render(intake) {
  const ini = parseIni(intake.text || '');

  // Normalize section keys case-insensitively
  const sectionMap = {};
  for (const k of Object.keys(ini)) sectionMap[k.toUpperCase()] = ini[k];

  const main = sectionMap['MAIN'] || {};
  const messages = sectionMap['MESSAGES CONTROL'] || sectionMap['MESSAGE_CONTROL'] || sectionMap['MESSAGES_CONTROL'] || {};
  const fmt = sectionMap['FORMAT'] || {};
  const basic = sectionMap['BASIC'] || {};
  const score = sectionMap['MASTER'] || sectionMap['REPORTS'] || sectionMap['SCORE'] || {};

  // [MAIN]
  const jobs = main['jobs'] || '';
  const persistent = main['persistent'] || '';
  const suggestion = main['suggestion-mode'] || '';
  const mainHtml = (jobs || persistent || suggestion) ? `
<div class="pl-sec"><h3>[MAIN]</h3><div class="pl-card">
${row('jobs', jobs)}
${row('persistent', persistent)}
${row('suggestion-mode', suggestion)}
</div></div>` : '';

  // [MESSAGES CONTROL] disable
  const disableRaw = messages['disable'] || '';
  const disableCodes = disableRaw.split(',').map((s) => s.trim()).filter(Boolean);
  const disableHtml = disableCodes.length ? `
<div class="pl-sec"><h3>[MESSAGES CONTROL] — disabled (${disableCodes.length})</h3>
<div class="pl-chips">${disableCodes.slice(0, 40).map((c) => `<span class="pl-chip dis">${esc(c)}</span>`).join('')}${disableCodes.length > 40 ? `<span class="pl-chip">+${disableCodes.length - 40} more</span>` : ''}</div>
</div>` : '';

  // [FORMAT]
  const maxLine = fmt['max-line-length'] || fmt['max_line_length'] || '';
  const indent = fmt['indent-string'] || fmt['indent_string'] || '';
  const fmtHtml = maxLine ? `
<div class="pl-sec"><h3>[FORMAT]</h3><div class="pl-card">
${row('max-line-length', maxLine)}
${row('indent-string', indent)}
</div></div>` : '';

  // [BASIC] naming
  const nameKeys = ['good-names', 'bad-names', 'function-naming-style', 'variable-naming-style',
    'class-naming-style', 'method-naming-style', 'argument-naming-style', 'attr-naming-style'];
  const basicRows = nameKeys.map((k) => row(k, basic[k] || basic[k.replace(/-/g, '_')] || '')).filter(Boolean).join('');
  const basicHtml = basicRows ? `<div class="pl-sec"><h3>[BASIC] — Naming</h3><div class="pl-card">${basicRows}</div></div>` : '';

  // score
  const scoreEnabled = main['score'] || score['score'] || '';
  const scoreHtml = scoreEnabled ? `
<div class="pl-sec"><h3>Scoring</h3><div class="pl-card">
${row('score', scoreEnabled)}
</div></div>` : '';

  const subParts = [];
  if (jobs) subParts.push(`jobs: ${jobs}`);
  if (maxLine) subParts.push(`max-line: ${maxLine}`);
  if (disableCodes.length) subParts.push(`${disableCodes.length} disabled`);
  const sub = subParts.join(' · ') || 'Pylint static analysis configuration';

  const host = document.createElement('div');
  host.className = 'pl-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="pl-title"><span class="badge-pl">Pylint</span>Pylint Configuration</div>
<div class="pl-sub">${esc(sub)}</div>
${mainHtml}${disableHtml}${fmtHtml}${basicHtml}${scoreHtml}`;
  return { parentNode: host };
}
