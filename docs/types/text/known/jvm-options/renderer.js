const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.jo-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-jo{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e65100;color:#fff;vertical-align:middle;margin-right:8px}
.jo-title{font-size:18px;font-weight:700;margin:0 0 4px}
.jo-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.jo-sec{margin:14px 0}
.jo-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.jo-count{font-size:11px;font-weight:normal;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:9px;padding:1px 7px;margin-left:6px;vertical-align:middle}
.jo-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.jo-list{list-style:none;margin:0;padding:0}
.jo-item{font:13px/1.6 ui-monospace,monospace;padding:2px 0;border-bottom:1px solid var(--border,#e0e0e0);color:var(--fg-2,#555)}
.jo-item:last-child{border-bottom:none}
.jo-item.heap{font-weight:700;color:#c62828}
.jo-item.sysprop{color:#1565c0}
.jo-item.gc{color:#2e7d32}
`;

export async function render(intake, _ctx) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const lines = text.split('\n');

  const heap = [];
  const gc = [];
  const sysprops = [];
  const other = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('##')) continue;
    if (/^-Xms|-Xmx|-Xss|-Xmn/.test(line)) {
      heap.push(line);
    } else if (/^-XX:|-Xgc/.test(line)) {
      gc.push(line);
    } else if (/^-D/.test(line)) {
      sysprops.push(line);
    } else if (line.startsWith('-') || line.startsWith('--')) {
      other.push(line);
    }
  }

  const filename = intake.name || 'jvm.options';

  function section(title, items, cls) {
    if (!items.length) return '';
    const rows = items.map((i) => `<li class="jo-item ${cls}">${esc(i)}</li>`).join('');
    return `<div class="jo-sec"><h3>${esc(title)} <span class="jo-count">${items.length}</span></h3>
      <div class="jo-card"><ul class="jo-list">${rows}</ul></div></div>`;
  }

  const host = document.createElement('div');
  host.className = 'jo-doc';
  host.innerHTML = `<style>${CSS}</style>
    <p class="jo-title"><span class="badge-jo">JVM Options</span>${esc(filename)}</p>
    <p class="jo-sub">JVM tuning flags — heap, GC, system properties, and other options</p>
    ${section('Heap Settings', heap, 'heap')}
    ${section('GC Settings', gc, 'gc')}
    ${section('System Properties', sysprops, 'sysprop')}
    ${section('Other Flags', other, '')}`;

  return { parentNode: host };
}
