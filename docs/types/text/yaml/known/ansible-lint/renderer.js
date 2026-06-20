import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ansiblelint-doc { padding: 16px 18px; max-width: 860px; margin: 0 auto; font: 14px/1.55 system-ui, sans-serif; color: var(--fg, #24292f); }
.ansiblelint-doc .al-badge { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 700; background: #EE0000; color: #fff; vertical-align: middle; margin-right: 8px; }
.ansiblelint-doc .al-title { font-size: 18px; font-weight: 700; margin: 0 0 3px; }
.ansiblelint-doc .al-sub { font-size: 12px; color: var(--fg-2, #888); margin: 0 0 14px; }
.ansiblelint-doc .al-sec { margin: 12px 0; }
.ansiblelint-doc .al-sec h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--fg-2, #888); margin: 0 0 6px; }
.ansiblelint-doc .al-pills { display: flex; flex-wrap: wrap; gap: 6px; }
.ansiblelint-doc .al-pill { display: inline-flex; align-items: center; font-size: 12px; padding: 3px 10px; border-radius: 12px; background: var(--bg-2, #f6f8fa); border: 1px solid var(--border, #e0e0e0); font-family: ui-monospace, monospace; }
.ansiblelint-doc .al-pill-profile { background: #fff3cd; border-color: #ffc107; color: #664d03; font-weight: 600; }
.ansiblelint-doc .al-pill-skip { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
.ansiblelint-doc .al-pill-warn { background: #fff8e1; border-color: #ffd54f; color: #5d4037; }
.ansiblelint-doc .al-pill-enable { background: #dcfce7; border-color: #86efac; color: #166534; }
.ansiblelint-doc .al-pill-flag { background: #eff6ff; border-color: #bfdbfe; color: #1e40af; font-weight: 600; }
.ansiblelint-doc .al-kv { display: flex; gap: 8px; align-items: baseline; margin: 2px 0; }
.ansiblelint-doc .al-kv-k { font-size: 12px; color: var(--fg-2, #888); min-width: 130px; }
.ansiblelint-doc .al-kv-v { font-size: 13px; font-family: ui-monospace, monospace; word-break: break-all; }
.ansiblelint-doc .al-paths { display: flex; flex-direction: column; gap: 4px; }
.ansiblelint-doc .al-path { font-size: 12px; font-family: ui-monospace, monospace; background: var(--bg-2, #f6f8fa); border: 1px solid var(--border, #e0e0e0); border-radius: 4px; padding: 2px 8px; }
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const filename = (intake.name || intake.filename || '').split('/').pop() || '.ansible-lint';

  const profile = cfg.profile || '';
  const skipList = Array.isArray(cfg.skip_list) ? cfg.skip_list : [];
  const warnList = Array.isArray(cfg.warn_list) ? cfg.warn_list : [];
  const enableList = Array.isArray(cfg.enable_list) ? cfg.enable_list : [];
  const excludePaths = Array.isArray(cfg.exclude_paths) ? cfg.exclude_paths : [];
  const offline = cfg.offline === true;
  const useDefaultRules = cfg.use_default_rules;
  const rulesdir = cfg.rulesdir ? (Array.isArray(cfg.rulesdir) ? cfg.rulesdir : [cfg.rulesdir]) : [];
  const kinds = Array.isArray(cfg.kinds) ? cfg.kinds : [];

  // Summary
  const parts = [];
  if (profile) parts.push(`profile: ${profile}`);
  if (skipList.length) parts.push(`${skipList.length} skipped`);
  if (warnList.length) parts.push(`${warnList.length} warned`);
  if (enableList.length) parts.push(`${enableList.length} extra rules`);

  // Profile chip
  const profileHtml = profile
    ? `<div class="al-sec"><h3>Profile</h3><div class="al-pills"><span class="al-pill al-pill-profile">${esc(profile)}</span></div></div>`
    : '';

  // Flags
  const flagPills = [];
  if (offline) flagPills.push(`<span class="al-pill al-pill-flag">offline</span>`);
  if (useDefaultRules === true) flagPills.push(`<span class="al-pill al-pill-flag">use_default_rules</span>`);
  if (useDefaultRules === false) flagPills.push(`<span class="al-pill al-pill-skip">no default rules</span>`);
  const flagsHtml = flagPills.length
    ? `<div class="al-sec"><h3>Flags</h3><div class="al-pills">${flagPills.join('')}</div></div>`
    : '';

  // Exclude paths
  const excludeHtml = excludePaths.length
    ? `<div class="al-sec"><h3>Exclude Paths</h3><div class="al-paths">${excludePaths.slice(0, 8).map((p) => `<span class="al-path">${esc(p)}</span>`).join('')}${excludePaths.length > 8 ? `<span class="al-pill" style="align-self:flex-start">+${excludePaths.length - 8} more</span>` : ''}</div></div>`
    : '';

  // Skip list
  const skipHtml = skipList.length
    ? `<div class="al-sec"><h3>Skip List</h3><div class="al-pills">${skipList.slice(0, 15).map((r) => `<span class="al-pill al-pill-skip">${esc(r)}</span>`).join('')}${skipList.length > 15 ? `<span class="al-pill">+${skipList.length - 15} more</span>` : ''}</div></div>`
    : '';

  // Warn list
  const warnHtml = warnList.length
    ? `<div class="al-sec"><h3>Warn List</h3><div class="al-pills">${warnList.slice(0, 10).map((r) => `<span class="al-pill al-pill-warn">${esc(r)}</span>`).join('')}${warnList.length > 10 ? `<span class="al-pill">+${warnList.length - 10} more</span>` : ''}</div></div>`
    : '';

  // Enable list
  const enableHtml = enableList.length
    ? `<div class="al-sec"><h3>Enable List</h3><div class="al-pills">${enableList.slice(0, 10).map((r) => `<span class="al-pill al-pill-enable">${esc(r)}</span>`).join('')}${enableList.length > 10 ? `<span class="al-pill">+${enableList.length - 10} more</span>` : ''}</div></div>`
    : '';

  // Custom rules dir
  const rulesdirHtml = rulesdir.length
    ? `<div class="al-sec"><h3>Rules Dir</h3><div class="al-paths">${rulesdir.map((d) => `<span class="al-path">${esc(d)}</span>`).join('')}</div></div>`
    : '';

  // Kinds
  const kindsHtml = kinds.length
    ? `<div class="al-sec"><h3>Kinds</h3><div class="al-pills">${kinds.slice(0, 12).map((k) => {
        if (typeof k === 'object' && k !== null) {
          const entries = Object.entries(k);
          return entries.map(([pattern, kind]) => `<span class="al-pill"><code>${esc(pattern)}</code>&nbsp;→&nbsp;${esc(kind)}</span>`).join('');
        }
        return `<span class="al-pill">${esc(k)}</span>`;
      }).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'ansiblelint-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="al-title"><span class="al-badge">ansible-lint</span>${esc(filename)}</div>
<div class="al-sub">${parts.join(' · ') || 'ansible-lint configuration'}</div>
${profileHtml}
${flagsHtml}
${excludeHtml}
${skipHtml}
${warnHtml}
${enableHtml}
${rulesdirHtml}
${kindsHtml}`;

  return { parentNode: host };
}
