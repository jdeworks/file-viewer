import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.yamllint-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.yamllint-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3D7DD8;color:#fff;vertical-align:middle;margin-right:8px;}
.yamllint-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.yamllint-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.yamllint-sec{margin:12px 0;}
.yamllint-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.yamllint-kv{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;font-size:12px;margin:4px 0;}
.yamllint-kv dt{font-weight:600;white-space:nowrap;color:var(--fg,#24292f);}
.yamllint-kv dd{margin:0;color:var(--fg-2,#555);font-family:ui-monospace,monospace;}
.yamllint-chip{display:inline-block;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600;}
.yamllint-chip-default{background:#dbeafe;color:#1e40af;}
.yamllint-chip-relaxed{background:#dcfce7;color:#166534;}
.yamllint-chip-custom{background:#f3e8ff;color:#7e22ce;}
.yamllint-rule-list{display:flex;flex-direction:column;gap:4px;}
.yamllint-rule{display:flex;align-items:baseline;gap:8px;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0);}
.yamllint-rule:last-child{border-bottom:none;}
.yamllint-rule-name{font-family:ui-monospace,monospace;font-weight:600;min-width:200px;color:var(--fg,#24292f);}
.yamllint-rule-detail{color:var(--fg-2,#666);font-family:ui-monospace,monospace;font-size:11px;}
.yamllint-lvl{display:inline-block;padding:1px 6px;border-radius:6px;font-size:10px;font-weight:700;margin-left:4px;}
.yamllint-lvl-error{background:#fee2e2;color:#991b1b;}
.yamllint-lvl-warning{background:#fef9c3;color:#713f12;}
.yamllint-lvl-disable{background:#f3f4f6;color:#6b7280;}
`;

function getLevel(rule) {
  if (rule === 'disable') return 'disable';
  if (rule === 'enable') return 'warning';
  if (rule && typeof rule === 'object') return rule.level || 'warning';
  return 'warning';
}

function getRuleValue(rule, key) {
  if (!rule || typeof rule !== 'object') return null;
  return rule[key] ?? null;
}

function levelBadge(level) {
  const cls = level === 'error' ? 'yamllint-lvl-error' : level === 'disable' ? 'yamllint-lvl-disable' : 'yamllint-lvl-warning';
  return `<span class="yamllint-lvl ${cls}">${esc(level)}</span>`;
}

function ruleDetail(name, rule) {
  const parts = [];
  if (name === 'line-length') {
    const max = getRuleValue(rule, 'max');
    const nonBreak = getRuleValue(rule, 'allow-non-breakable-words');
    if (max != null) parts.push(`max: ${max}`);
    if (nonBreak != null) parts.push(`non-breakable: ${nonBreak}`);
  } else if (name === 'indentation') {
    const spaces = getRuleValue(rule, 'spaces');
    const indSeq = getRuleValue(rule, 'indent-sequences');
    if (spaces != null) parts.push(`spaces: ${spaces}`);
    if (indSeq != null) parts.push(`indent-sequences: ${indSeq}`);
  } else if (name === 'truthy') {
    const allowed = getRuleValue(rule, 'allowed-values');
    if (allowed != null) parts.push(`allowed: [${Array.isArray(allowed) ? allowed.join(', ') : allowed}]`);
  } else if (name === 'braces') {
    const minI = getRuleValue(rule, 'min-spaces-inside');
    const maxI = getRuleValue(rule, 'max-spaces-inside');
    if (minI != null) parts.push(`min-inside: ${minI}`);
    if (maxI != null) parts.push(`max-inside: ${maxI}`);
  } else if (name === 'brackets') {
    const minI = getRuleValue(rule, 'min-spaces-inside');
    const maxI = getRuleValue(rule, 'max-spaces-inside');
    if (minI != null) parts.push(`min-inside: ${minI}`);
    if (maxI != null) parts.push(`max-inside: ${maxI}`);
  } else if (name === 'colons') {
    const before = getRuleValue(rule, 'max-spaces-before');
    const after = getRuleValue(rule, 'max-spaces-after');
    if (before != null) parts.push(`max-before: ${before}`);
    if (after != null) parts.push(`max-after: ${after}`);
  } else if (name === 'comments') {
    const minSpaces = getRuleValue(rule, 'min-spaces-from-content');
    const reqStart = getRuleValue(rule, 'require-starting-space');
    if (minSpaces != null) parts.push(`min-spaces: ${minSpaces}`);
    if (reqStart != null) parts.push(`require-starting-space: ${reqStart}`);
  } else if (name === 'document-start') {
    const present = getRuleValue(rule, 'present');
    if (present != null) parts.push(`present: ${present}`);
  } else if (name === 'empty-lines') {
    const max = getRuleValue(rule, 'max');
    if (max != null) parts.push(`max: ${max}`);
  }
  return parts.length ? parts.join(' · ') : '';
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const ext = cfg.extends || '';
  const rules = cfg.rules && typeof cfg.rules === 'object' ? cfg.rules : {};
  const ruleKeys = Object.keys(rules);

  // Extends chip
  let extendsChipClass = 'yamllint-chip-custom';
  if (ext === 'default') extendsChipClass = 'yamllint-chip-default';
  else if (ext === 'relaxed') extendsChipClass = 'yamllint-chip-relaxed';
  const extendsChip = ext ? `<span class="yamllint-chip ${extendsChipClass}">${esc(ext)}</span>` : '<span style="color:var(--fg-2,#888);font-size:12px;">(none)</span>';

  const subParts = [];
  if (ext) subParts.push(`extends: ${ext}`);
  subParts.push(`${ruleKeys.length} rule${ruleKeys.length !== 1 ? 's' : ''} defined`);

  // Base config section
  const baseHtml = `<div class="yamllint-sec"><h3>Base Config</h3><dl class="yamllint-kv">
    <dt>Extends</dt><dd>${extendsChip}</dd>
    <dt>Rules defined</dt><dd>${ruleKeys.length}</dd>
  </dl></div>`;

  // Rules section (up to 15)
  const displayRules = ruleKeys.slice(0, 15);
  const rulesHtml = displayRules.length ? `<div class="yamllint-sec"><h3>Rules (${ruleKeys.length}${ruleKeys.length > 15 ? ', showing 15' : ''})</h3>
    <div class="yamllint-rule-list">
    ${displayRules.map((k) => {
      const rule = rules[k];
      const level = getLevel(rule);
      const detail = ruleDetail(k, rule);
      return `<div class="yamllint-rule">
        <span class="yamllint-rule-name">${esc(k)}</span>
        ${levelBadge(level)}
        ${detail ? `<span class="yamllint-rule-detail">${esc(detail)}</span>` : ''}
      </div>`;
    }).join('')}
    </div>
  </div>` : '';

  const host = document.createElement('div');
  host.className = 'yamllint-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="yamllint-title"><span class="yamllint-badge">yamllint</span>YAML Lint Config</div>
<div class="yamllint-sub">${esc(subParts.join(' · '))}</div>
${baseHtml}${rulesHtml}`;
  return { parentNode: host };
}
