import { parseTOML } from '../../toml.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.clk-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-clk{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#dea584;color:#2d1b00;vertical-align:middle;margin-right:8px;}
.clk-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.clk-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.clk-stats{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 14px;}
.clk-stat{display:flex;flex-direction:column;align-items:center;padding:8px 16px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);min-width:80px;}
.clk-stat-n{font-size:22px;font-weight:700;color:var(--fg,#24292f);}
.clk-stat-l{font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;}
.clk-sec{margin:12px 0;}
.clk-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.clk-pills{display:flex;flex-wrap:wrap;gap:6px;}
.clk-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.clk-pill.ws{background:#fef9ef;border-color:#f5cba7;}
.clk-note{font-size:12px;color:var(--fg-2,#888);margin:8px 0 0;}
`;

export function render(intake) {
  let lock = {};
  try { lock = parseTOML(intake.text || '') || {}; } catch { lock = {}; }

  const version = lock.version ?? '?';
  const packages = Array.isArray(lock.package) ? lock.package : [];
  const totalCount = packages.length;

  // Workspace members: packages without a 'source' field are typically local workspace crates
  const workspaceMembers = packages.filter((p) => !p.source).map((p) => p.name).filter(Boolean);

  const SHOW = 50;
  const sampleNames = packages.slice(0, SHOW).map((p) => `${p.name || '?'} ${p.version || ''}`);

  const statsHtml = `<div class="clk-stats">
    <div class="clk-stat"><span class="clk-stat-n">${esc(totalCount)}</span><span class="clk-stat-l">Crates</span></div>
    <div class="clk-stat"><span class="clk-stat-n">${esc(workspaceMembers.length)}</span><span class="clk-stat-l">Workspace</span></div>
  </div>`;

  const wsHtml = workspaceMembers.length
    ? `<div class="clk-sec"><h3>Workspace members</h3><div class="clk-pills">${workspaceMembers.map((n) => `<span class="clk-pill ws">${esc(n)}</span>`).join('')}</div></div>`
    : '';

  const pillsHtml = sampleNames.length
    ? `<div class="clk-sec"><h3>All crates</h3><div class="clk-pills">${sampleNames.map((n) => `<span class="clk-pill">${esc(n)}</span>`).join('')}</div>${totalCount > SHOW ? `<p class="clk-note">… and ${totalCount - SHOW} more crates</p>` : ''}</div>`
    : '';

  const host = document.createElement('div');
  host.className = 'clk-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="clk-title"><span class="badge-clk">Cargo</span>Cargo.lock</div>
<div class="clk-sub">version ${esc(version)} · ${totalCount} crate${totalCount !== 1 ? 's' : ''}</div>
${statsHtml}
${wsHtml}${pillsHtml}`;

  return { parentNode: host };
}
