const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ncurc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-ncurc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#16a34a;color:#fff;vertical-align:middle;margin-right:8px;}
.ncurc-title{font-size:18px;font-weight:700;margin:0 0 12px;}
.ncurc-sec{margin:14px 0;}
.ncurc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.ncurc-pills{display:flex;flex-wrap:wrap;gap:6px;}
.ncurc-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.ncurc-pill.target-latest{background:#dcfce7;border-color:#86efac;color:#15803d;}
.ncurc-pill.target-newest{background:#dcfce7;border-color:#86efac;color:#15803d;}
.ncurc-pill.target-greatest{background:#fef9c3;border-color:#fde047;color:#854d0e;}
.ncurc-pill.target-minor{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8;}
.ncurc-pill.target-patch{background:#f0fdf4;border-color:#bbf7d0;color:#166534;}
.ncurc-pill.target-semver{background:#faf5ff;border-color:#e9d5ff;color:#7e22ce;}
.ncurc-pill.reject{background:#fef2f2;border-color:#fecaca;color:#991b1b;}
.ncurc-pill.filter{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8;}
.ncurc-pill.pm{background:#f3f4f6;border-color:#d1d5db;color:#374151;}
.ncurc-kv{display:flex;gap:8px;align-items:baseline;margin:4px 0;font-size:13px;}
.ncurc-kv-k{color:var(--fg-2,#888);min-width:120px;flex-shrink:0;}
.ncurc-kv-v{font-family:ui-monospace,monospace;}
.ncurc-bool-on{display:inline-block;font-size:11px;padding:1px 7px;border-radius:4px;background:#dcfce7;border:1px solid #86efac;color:#15803d;}
.ncurc-bool-off{display:inline-block;font-size:11px;padding:1px 7px;border-radius:4px;background:#f3f4f6;border:1px solid #d1d5db;color:#6b7280;}
`;

function patternList(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return [val];
  return [];
}

export function render(intake) {
  const cfg = intake.parsed ?? (() => { try { return JSON.parse(intake.text || '{}'); } catch { return {}; } })();

  const target = cfg.target || '';
  const filter = patternList(cfg.filter);
  const reject = patternList(cfg.reject);
  const pm = cfg.packageManager || cfg['package-manager'] || '';
  const peer = cfg.peer;
  const root = cfg.root;
  const upgrade = cfg.upgrade;
  const jsonAll = cfg.jsonAll;
  const pre = cfg.pre;

  // target is untrusted file content — only build a CSS class from a known-safe value so it
  // can never break out of the class="" attribute in the innerHTML template below.
  const KNOWN_TARGETS = new Set(['latest', 'newest', 'greatest', 'minor', 'patch', 'semver']);
  const targetClass = target && KNOWN_TARGETS.has(target.toLowerCase()) ? `target-${target.toLowerCase()}` : '';

  const boolRow = (key, val) => {
    if (val == null) return '';
    return `<div class="ncurc-kv"><span class="ncurc-kv-k">${esc(key)}</span><span class="${val ? 'ncurc-bool-on' : 'ncurc-bool-off'}">${val ? 'true' : 'false'}</span></div>`;
  };

  const filterHtml = filter.length
    ? `<div class="ncurc-sec"><h3>Filter — ${filter.length} pattern${filter.length !== 1 ? 's' : ''}</h3><div class="ncurc-pills">${filter.map((p) => `<span class="ncurc-pill filter">${esc(String(p))}</span>`).join('')}</div></div>`
    : '';

  const rejectHtml = reject.length
    ? `<div class="ncurc-sec"><h3>Reject — ${reject.length} pattern${reject.length !== 1 ? 's' : ''}</h3><div class="ncurc-pills">${reject.map((p) => `<span class="ncurc-pill reject">${esc(String(p))}</span>`).join('')}</div></div>`
    : '';

  const boolsHtml = (peer != null || root != null || upgrade != null || jsonAll != null || pre != null)
    ? `<div class="ncurc-sec"><h3>Options</h3>
${boolRow('peer', peer)}
${boolRow('root', root)}
${boolRow('upgrade', upgrade)}
${boolRow('jsonAll', jsonAll)}
${boolRow('pre-release', pre)}
</div>`
    : '';

  const host = document.createElement('div');
  host.className = 'ncurc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
  <span class="badge-ncurc">ncu</span>
  <span class="ncurc-title">npm-check-updates</span>
</div>
${target ? `<div class="ncurc-sec"><h3>Target</h3><span class="ncurc-pill ${targetClass}">${esc(target)}</span></div>` : ''}
${pm ? `<div class="ncurc-sec"><h3>Package Manager</h3><span class="ncurc-pill pm">${esc(pm)}</span></div>` : ''}
${filterHtml}
${rejectHtml}
${boolsHtml}`;

  return { parentNode: host };
}
