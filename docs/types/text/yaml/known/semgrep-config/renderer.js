import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sgr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sgr-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a7f37;color:#fff;vertical-align:middle;margin-right:8px;}
.sgr-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sgr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.sgr-sec{margin:12px 0;}
.sgr-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.sgr-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:0 0 10px;}
.sgr-rule-id{font:12px/1.4 ui-monospace,monospace;font-weight:700;color:var(--fg,#24292f);}
.sgr-rule-msg{font-size:12px;color:var(--fg-2,#888);margin:2px 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:600px;}
.sgr-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;}
.sgr-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.sgr-chip.err{background:#fef2f2;border-color:#fca5a5;color:#991b1b;}
.sgr-chip.warn{background:#fff7ed;border-color:#fdba74;color:#c2410c;}
.sgr-chip.info{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.sgr-chip.lang{background:#f0fdf4;border-color:#86efac;color:#166534;}
.sgr-chip.pat{background:#f5f3ff;border-color:#c4b5fd;color:#6d28d9;}
.sgr-more{font-size:12px;color:var(--fg-2,#888);padding:4px 0;}
`;

const SEV_CLASS = { ERROR: 'err', WARNING: 'warn', INFO: 'info' };

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const rules = Array.isArray(cfg.rules) ? cfg.rules : [];

  // Count severity distribution
  const sevCount = {};
  for (const rule of rules) {
    const sev = (rule.severity || 'UNKNOWN').toUpperCase();
    sevCount[sev] = (sevCount[sev] || 0) + 1;
  }

  const DISPLAY_MAX = 20;
  const displayRules = rules.slice(0, DISPLAY_MAX);

  const rulesHtml = displayRules.map((rule) => {
    const id = rule.id || rule.name || '(unnamed)';
    const message = rule.message || '';
    const sev = (rule.severity || '').toUpperCase();
    const sevCls = SEV_CLASS[sev] || '';
    const langs = Array.isArray(rule.languages) ? rule.languages : (rule.language ? [rule.language] : []);
    const hasPattern = rule.pattern || rule.pattern_either || rule.pattern_regex;
    const patternsCount = Array.isArray(rule.patterns) ? rule.patterns.length : 0;

    const langChips = langs.slice(0, 6).map((l) => `<span class="sgr-chip lang">${esc(l)}</span>`).join('');
    const sevChip = sev ? `<span class="sgr-chip ${sevCls}">${esc(sev)}</span>` : '';
    const patChip = hasPattern ? `<span class="sgr-chip pat">pattern</span>` : (patternsCount ? `<span class="sgr-chip pat">${patternsCount} patterns</span>` : '');

    return `<div class="sgr-card">
  <div class="sgr-rule-id">${esc(id)}</div>
  ${message ? `<div class="sgr-rule-msg" title="${esc(message)}">${esc(message.length > 120 ? message.slice(0, 117) + '…' : message)}</div>` : ''}
  <div class="sgr-chips">${sevChip}${langChips}${patChip}</div>
</div>`;
  }).join('');

  const moreHtml = rules.length > DISPLAY_MAX
    ? `<div class="sgr-more">…and ${rules.length - DISPLAY_MAX} more rule${rules.length - DISPLAY_MAX !== 1 ? 's' : ''}</div>`
    : '';

  const sevSummaryParts = Object.entries(sevCount)
    .sort(([a], [b]) => ['ERROR', 'WARNING', 'INFO'].indexOf(a) - ['ERROR', 'WARNING', 'INFO'].indexOf(b))
    .map(([sev, count]) => `${count} ${sev.toLowerCase()}`);

  const subParts = [
    rules.length ? `${rules.length} rule${rules.length !== 1 ? 's' : ''}` : 'No rules',
    ...sevSummaryParts,
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'sgr-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="sgr-title"><span class="sgr-badge">Semgrep</span>Semgrep config</div>
<div class="sgr-sub">${esc(subParts.join(' · ') || 'Semgrep static analysis configuration')}</div>
${rules.length ? `<div class="sgr-sec"><h3>Rules (${rules.length})</h3>${rulesHtml}${moreHtml}</div>` : '<div class="sgr-sub">No rules defined</div>'}`;

  return { parentNode: host };
}
