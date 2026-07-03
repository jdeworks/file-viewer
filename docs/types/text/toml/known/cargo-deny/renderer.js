import { parseTOML } from '../../toml.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cargodeny-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-cargodeny{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#a72145;color:#fff;vertical-align:middle;margin-right:8px;}
.cargodeny-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cargodeny-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.cargodeny-sec{margin:12px 0;}
.cargodeny-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.cargodeny-pills{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0;}
.cargodeny-pill{font-size:12px;padding:2px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.cargodeny-pill.allow{background:#f0fdf4;border-color:#bbf7d0;color:#166534;}
.cargodeny-pill.deny{background:#fef2f2;border-color:#fecaca;color:#991b1b;}
.cargodeny-pill.warn{background:#fffbeb;border-color:#fde68a;color:#92400e;}
.cargodeny-table{width:100%;border-collapse:collapse;font-size:13px;}
.cargodeny-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.cargodeny-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.cargodeny-mono{font:12px/1.4 ui-monospace,monospace;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }

  const licenses = cfg.licenses || {};
  const bans = cfg.bans || {};
  const advisories = cfg.advisories || {};
  const sources = cfg.sources || {};

  const licAllow = Array.isArray(licenses.allow) ? licenses.allow : [];
  const licDeny = Array.isArray(licenses.deny) ? licenses.deny : [];
  const licUnlicensed = licenses.unlicensed;
  const copyleft = licenses.copyleft;
  const bannedCrates = Array.isArray(bans.deny) ? bans.deny : [];
  const skipCrates = Array.isArray(bans.skip) ? bans.skip : [];
  const multipleVersions = bans['multiple-versions'];
  const vuln = advisories.vulnerability;
  const unmaintained = advisories.unmaintained;
  const yanked = advisories.yanked;
  const ignoreAdvisories = Array.isArray(advisories.ignore) ? advisories.ignore : [];
  const sourceAllow = Array.isArray(sources['allow-registry']) ? sources['allow-registry']
    : (Array.isArray(sources.allow) ? sources.allow : []);

  const host = document.createElement('div');
  host.className = 'cargodeny-doc';

  const pillList = (items, cls) =>
    items.slice(0, 20).map((i) => {
      const name = typeof i === 'string' ? i : (i.name || i.id || JSON.stringify(i));
      return `<span class="cargodeny-pill ${cls}">${esc(name)}</span>`;
    }).join('') + (items.length > 20 ? `<span style="font-size:11px;color:var(--fg-2,#888)">+${items.length - 20} more</span>` : '');

  const severityChip = (label, val) => {
    if (val === undefined) return '';
    const cls = val === 'deny' ? 'deny' : val === 'warn' ? 'warn' : 'allow';
    return `<span class="cargodeny-pill ${cls}">${esc(label)}: ${esc(val)}</span>`;
  };

  const advisoriesHtml = (vuln !== undefined || unmaintained !== undefined || yanked !== undefined || ignoreAdvisories.length)
    ? `<div class="cargodeny-sec"><h3>Advisories</h3>
<div class="cargodeny-pills">${severityChip('vulnerability', vuln)}${severityChip('unmaintained', unmaintained)}${severityChip('yanked', yanked)}</div>
${ignoreAdvisories.length ? `<div style="font-size:11px;color:var(--fg-2,#888);margin-top:6px">Ignored advisories (${ignoreAdvisories.length}):</div><div class="cargodeny-pills">${pillList(ignoreAdvisories, 'warn')}</div>` : ''}
</div>` : '';

  const licensesHtml = (licAllow.length || licDeny.length)
    ? `<div class="cargodeny-sec"><h3>Licenses</h3>
${licAllow.length ? `<div style="font-size:11px;color:var(--fg-2,#888);margin-bottom:3px">Allowed (${licAllow.length})</div><div class="cargodeny-pills">${pillList(licAllow, 'allow')}</div>` : ''}
${licDeny.length ? `<div style="font-size:11px;color:var(--fg-2,#888);margin:4px 0 3px">Denied (${licDeny.length})</div><div class="cargodeny-pills">${pillList(licDeny, 'deny')}</div>` : ''}
${copyleft !== undefined ? `<div class="cargodeny-pills" style="margin-top:4px">${severityChip('copyleft', copyleft)}</div>` : ''}
${licUnlicensed !== undefined ? `<div style="font-size:12px;margin-top:4px">Unlicensed: <strong>${esc(licUnlicensed)}</strong></div>` : ''}
</div>` : '';

  const bansHtml = (bannedCrates.length || multipleVersions !== undefined)
    ? `<div class="cargodeny-sec"><h3>Bans</h3>
${multipleVersions !== undefined ? `<div class="cargodeny-pills">${severityChip('multiple-versions', multipleVersions)}</div>` : ''}
${bannedCrates.length ? `<div style="font-size:11px;color:var(--fg-2,#888);margin-top:6px">Denied crates (${bannedCrates.length}):</div><div class="cargodeny-pills">${pillList(bannedCrates, 'deny')}</div>` : ''}
${skipCrates.length ? `<div style="font-size:11px;color:var(--fg-2,#888);margin-top:4px">Skip/allowed duplicates (${skipCrates.length}):</div><div class="cargodeny-pills">${pillList(skipCrates, 'warn')}</div>` : ''}
</div>` : '';

  const sourcesHtml = sourceAllow.length
    ? `<div class="cargodeny-sec"><h3>Allowed sources (${sourceAllow.length})</h3><div class="cargodeny-pills">${pillList(sourceAllow, 'allow')}</div></div>`
    : '';

  const summary = [
    licAllow.length ? `${licAllow.length} allowed license${licAllow.length !== 1 ? 's' : ''}` : '',
    bannedCrates.length ? `${bannedCrates.length} banned crate${bannedCrates.length !== 1 ? 's' : ''}` : '',
    ignoreAdvisories.length ? `${ignoreAdvisories.length} ignored advisor${ignoreAdvisories.length !== 1 ? 'ies' : 'y'}` : '',
  ].filter(Boolean).join(' · ');

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-cargodeny">cargo-deny</span>
  <span class="cargodeny-title">deny.toml</span>
  <span class="cargodeny-sub" style="margin:0">Cargo dependency auditing</span>
</div>
<div class="cargodeny-sub">${summary || 'Security and license auditing for Rust dependencies'}</div>
${advisoriesHtml}
${licensesHtml}
${bansHtml}
${sourcesHtml}`;

  return { parentNode: host };
}
