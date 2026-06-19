const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ff-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-ff{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00b4a0;color:#fff;vertical-align:middle;margin-right:8px;}
.ff-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ff-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ff-sec{margin:14px 0;}
.ff-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.ff-lane{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;}
.ff-lane-name{font-weight:600;font-family:ui-monospace,monospace;font-size:13px;}
.ff-lane-plat{font-size:11px;color:var(--fg-2,#888);margin-left:6px;}
.ff-lane-desc{font-size:12px;color:var(--fg-2,#888);margin-top:2px;}
.ff-actions{margin-top:4px;display:flex;flex-wrap:wrap;gap:3px;}
.ff-chip{display:inline-block;font-size:11px;padding:2px 9px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.ff-plat-chip{font-size:11px;padding:2px 8px;border-radius:8px;font-weight:600;}
.ff-plat-chip.ios{background:#eff6ff;border:1px solid #93c5fd;color:#1d4ed8;}
.ff-plat-chip.android{background:#f0fdf4;border:1px solid #86efac;color:#166534;}
`;

function parseLanes(text) {
  const lanes = [];
  // lane :name or lane(:name) optionally with platform prefix
  const laneRe = /(?:(platform)\s*[:=]\s*:?(\w+)\s*do)?\s*lane\s*[:(]?:?(\w+)[):]?\s*(?:do)?\s*(?:\|[^|]*\|)?([^]*?)(?=\n\s*(?:lane|platform|end\s*$))/gm;
  const re = /^\s*(?:(ios|android|mac)\s+)?lane\s*[:(]?:?(\w+)[):]?\s*(?:do)?/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const platform = m[1] || '';
    const name = m[2];
    // Try to grab a desc comment on the prior line
    const before = text.slice(0, m.index);
    const lines = before.split('\n');
    const prevLine = lines[lines.length - 2] || '';
    const desc = prevLine.match(/^\s*#\s*(.+)/) ? prevLine.match(/^\s*#\s*(.+)/)[1] : '';
    // Extract action calls in the lane body
    const bodyStart = m.index + m[0].length;
    const bodyEnd = text.indexOf('\n  end', bodyStart);
    const body = bodyEnd > 0 ? text.slice(bodyStart, bodyEnd) : text.slice(bodyStart, bodyStart + 300);
    const actions = [...body.matchAll(/^\s+(\w+)\s*[({:]/gm)].map((a) => a[1]).filter((a) => a !== 'do' && a !== 'if' && a !== 'end');
    lanes.push({ name, platform, desc, actions: [...new Set(actions)].slice(0, 8) });
  }
  return lanes;
}

export function render(intake) {
  const text = intake.text || '';
  const lanes = parseLanes(text);

  // Detect platforms
  const hasIos = /^\s*platform\s*[:=]\s*:?ios/m.test(text) || lanes.some((l) => l.platform === 'ios');
  const hasAndroid = /^\s*platform\s*[:=]\s*:?android/m.test(text) || lanes.some((l) => l.platform === 'android');

  const host = document.createElement('div');
  host.className = 'ff-doc';

  let html = `<style>${CSS}</style>
<div class="ff-title"><span class="badge-ff">Fastlane</span>Fastfile</div>
<div class="ff-sub">CI/CD automation · ${lanes.length} lane${lanes.length !== 1 ? 's' : ''}${hasIos ? ' · <span class="ff-plat-chip ios">iOS</span>' : ''}${hasAndroid ? ' · <span class="ff-plat-chip android">Android</span>' : ''}</div>`;

  if (lanes.length) {
    html += `<div class="ff-sec"><h3>Lanes</h3>
      ${lanes.map((l) => `<div class="ff-lane">
        <div class="ff-lane-name">:${esc(l.name)}${l.platform ? `<span class="ff-lane-plat">[${esc(l.platform)}]</span>` : ''}</div>
        ${l.desc ? `<div class="ff-lane-desc">${esc(l.desc)}</div>` : ''}
        ${l.actions.length ? `<div class="ff-actions">${l.actions.map((a) => `<span class="ff-chip">${esc(a)}</span>`).join('')}</div>` : ''}
      </div>`).join('')}
    </div>`;
  }

  host.innerHTML = html;
  return { parentNode: host };
}
