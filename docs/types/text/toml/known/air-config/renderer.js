import { parseTOML } from '../../toml.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.air-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-air{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0ea5e9;color:#fff;vertical-align:middle;margin-right:8px}
.air-title{font-size:18px;font-weight:700;margin:0 0 4px}
.air-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.air-sec{margin:12px 0}
.air-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.air-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0}
.air-kv-k{font-size:12px;color:var(--fg-2,#888);min-width:140px}
.air-kv-v{font-size:13px;font-family:ui-monospace,monospace;word-break:break-all}
.air-pills{display:flex;flex-wrap:wrap;gap:6px}
.air-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  let cfg = {};
  try { cfg = parseTOML(text); } catch { cfg = {}; }

  const root = cfg.root || null;
  const build = cfg.build || {};
  const log = cfg.log || {};

  const buildCmd = build.cmd || null;
  const buildBin = build.bin || null;
  const includeExt = Array.isArray(build.include_ext) ? build.include_ext : [];
  const excludeDirs = Array.isArray(build.exclude_dir) ? build.exclude_dir : [];
  const includeDirs = Array.isArray(build.include_dir) ? build.include_dir : [];
  const delay = build.delay != null ? String(build.delay) : null;
  const killDelay = build.kill_delay != null ? String(build.kill_delay) : null;
  const rerunDelay = build.rerun_delay != null ? String(build.rerun_delay) : null;

  const logLevel = log.level != null ? String(log.level) : null;
  const logColor = log.color != null ? String(log.color) : null;
  const logTime = log.time != null ? String(log.time) : null;

  const parts = [];
  if (buildCmd) parts.push('build configured');
  if (includeExt.length) parts.push(`watching .${includeExt.slice(0, 3).join(', .')}`);
  if (delay) parts.push(`${delay}ms delay`);

  const metaHtml = [
    root ? `<div class="air-kv"><span class="air-kv-k">Root directory</span><span class="air-kv-v">${esc(root)}</span></div>` : '',
    buildCmd ? `<div class="air-kv"><span class="air-kv-k">Build command</span><span class="air-kv-v">${esc(buildCmd)}</span></div>` : '',
    buildBin ? `<div class="air-kv"><span class="air-kv-k">Binary</span><span class="air-kv-v">${esc(buildBin)}</span></div>` : '',
    delay ? `<div class="air-kv"><span class="air-kv-k">Delay</span><span class="air-kv-v">${esc(delay)} ms</span></div>` : '',
    killDelay ? `<div class="air-kv"><span class="air-kv-k">Kill delay</span><span class="air-kv-v">${esc(killDelay)} ms</span></div>` : '',
    rerunDelay ? `<div class="air-kv"><span class="air-kv-k">Rerun delay</span><span class="air-kv-v">${esc(rerunDelay)} ms</span></div>` : '',
  ].filter(Boolean).join('');

  const watchExtHtml = includeExt.length
    ? `<div class="air-sec"><h3>Watch extensions (${includeExt.length})</h3><div class="air-pills">${includeExt.map((e) => `<span class="air-pill">.${esc(e)}</span>`).join('')}</div></div>`
    : '';

  const includeDirsHtml = includeDirs.length
    ? `<div class="air-sec"><h3>Include directories (${includeDirs.length})</h3><div class="air-pills">${includeDirs.map((d) => `<span class="air-pill">${esc(d)}</span>`).join('')}</div></div>`
    : '';

  const excludeDirsHtml = excludeDirs.length
    ? `<div class="air-sec"><h3>Exclude directories (${excludeDirs.length})</h3><div class="air-pills">${excludeDirs.map((d) => `<span class="air-pill">${esc(d)}</span>`).join('')}</div></div>`
    : '';

  const logHtml = (logLevel || logColor || logTime)
    ? `<div class="air-sec"><h3>Log</h3>
        ${logLevel ? `<div class="air-kv"><span class="air-kv-k">Level</span><span class="air-kv-v">${esc(logLevel)}</span></div>` : ''}
        ${logColor ? `<div class="air-kv"><span class="air-kv-k">Color</span><span class="air-kv-v">${esc(logColor)}</span></div>` : ''}
        ${logTime ? `<div class="air-kv"><span class="air-kv-k">Time</span><span class="air-kv-v">${esc(logTime)}</span></div>` : ''}
      </div>`
    : '';

  const host = document.createElement('div');
  host.className = 'air-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="air-title"><span class="badge-air">Air</span>.air.toml</div>
<div class="air-sub">${parts.length ? parts.join(' · ') : 'Go live-reload config'}</div>
${metaHtml ? `<div class="air-sec"><h3>Build</h3>${metaHtml}</div>` : ''}
${watchExtHtml}${includeDirsHtml}${excludeDirsHtml}${logHtml}`;
  return { parentNode: host };
}
