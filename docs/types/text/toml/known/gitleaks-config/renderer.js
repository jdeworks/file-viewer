import { parseTOML } from '../../toml.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.gl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#b91c1c;color:#fff;vertical-align:middle;margin-right:8px;}
.gl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.gl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.gl-sec{margin:12px 0;}
.gl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.gl-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:0 0 10px;}
.gl-rule-id{font:12px/1.4 ui-monospace,monospace;font-weight:700;color:var(--fg,#24292f);}
.gl-rule-desc{font-size:12px;color:var(--fg-2,#888);margin:2px 0 4px;}
.gl-regex{font:11px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:580px;display:block;margin:2px 0;}
.gl-chips{display:flex;flex-wrap:wrap;gap:3px;margin-top:4px;}
.gl-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:#fef2f2;border:1px solid #fca5a5;color:#991b1b;font-family:ui-monospace,monospace;}
.gl-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.gl-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.gl-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
.gl-more{font-size:12px;color:var(--fg-2,#888);padding:4px 0;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }

  const title = cfg.title || null;
  const description = cfg.description || null;
  const rules = Array.isArray(cfg.rules) ? cfg.rules : [];
  const allowlists = Array.isArray(cfg.allowlists) ? cfg.allowlists : [];
  const extendsList = cfg.extends ? (Array.isArray(cfg.extends) ? cfg.extends : [cfg.extends]) : [];

  const DISPLAY_MAX = 20;
  const displayRules = rules.slice(0, DISPLAY_MAX);

  const rulesHtml = displayRules.map((rule) => {
    const id = rule.id || rule.name || '(unnamed)';
    const desc = rule.description || '';
    const regex = rule.regex || rule.regexp || '';
    const tags = Array.isArray(rule.tags) ? rule.tags : [];

    const truncRegex = regex.length > 100 ? regex.slice(0, 97) + '…' : regex;
    const tagChips = tags.slice(0, 8).map((t) => `<span class="gl-chip">${esc(t)}</span>`).join('');

    return `<div class="gl-card">
  <div class="gl-rule-id">${esc(id)}</div>
  ${desc ? `<div class="gl-rule-desc">${esc(desc)}</div>` : ''}
  ${regex ? `<code class="gl-regex" title="${esc(regex)}">${esc(truncRegex)}</code>` : ''}
  ${tags.length ? `<div class="gl-chips">${tagChips}${tags.length > 8 ? `<span style="font-size:11px;color:var(--fg-2,#888);">+${tags.length - 8} more</span>` : ''}</div>` : ''}
</div>`;
  }).join('');

  const moreHtml = rules.length > DISPLAY_MAX
    ? `<div class="gl-more">…and ${rules.length - DISPLAY_MAX} more rule${rules.length - DISPLAY_MAX !== 1 ? 's' : ''}</div>`
    : '';

  const allowlistsHtml = allowlists.length
    ? `<div class="gl-sec"><h3>Allowlists (${allowlists.length})</h3>
        ${allowlists.map((al) => {
          const alId = al.id || al.description || '(unnamed)';
          const commits = Array.isArray(al.commits) ? al.commits.length : 0;
          const paths = Array.isArray(al.paths) ? al.paths.length : 0;
          const regexes = Array.isArray(al.regexes) ? al.regexes.length : 0;
          const parts = [commits ? `${commits} commit${commits !== 1 ? 's' : ''}` : '', paths ? `${paths} path${paths !== 1 ? 's' : ''}` : '', regexes ? `${regexes} regex${regexes !== 1 ? 'es' : ''}` : ''].filter(Boolean);
          return `<div class="gl-card"><div class="gl-rule-id">${esc(alId)}</div>${parts.length ? `<div class="gl-rule-desc">${parts.join(' · ')}</div>` : ''}</div>`;
        }).join('')}
      </div>`
    : '';

  const extendsHtml = extendsList.length
    ? `<div class="gl-sec"><h3>Extends (${extendsList.length})</h3>
        <div class="gl-card"><div class="gl-kv">
          ${extendsList.map((e) => `<span class="gl-k">extends</span><span class="gl-v">${esc(e)}</span>`).join('')}
        </div></div>
      </div>`
    : '';

  const subParts = [
    rules.length ? `${rules.length} rule${rules.length !== 1 ? 's' : ''}` : 'No rules',
    allowlists.length ? `${allowlists.length} allowlist${allowlists.length !== 1 ? 's' : ''}` : '',
    extendsList.length ? `extends ${extendsList.length}` : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'gl-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="gl-title"><span class="gl-badge">Gitleaks</span>${esc(title || 'Gitleaks config')}</div>
<div class="gl-sub">${esc(description || subParts.join(' · ') || 'Gitleaks secrets detection configuration')}</div>
${rules.length ? `<div class="gl-sec"><h3>Rules (${rules.length})</h3>${rulesHtml}${moreHtml}</div>` : ''}
${allowlistsHtml}${extendsHtml}`;

  return { parentNode: host };
}
