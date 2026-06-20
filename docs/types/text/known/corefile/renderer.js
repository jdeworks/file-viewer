const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.coredns-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-coredns{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#03A9F4;color:#fff;margin-right:8px;}
.coredns-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.coredns-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.coredns-sec{margin:12px 0;}
.coredns-sec h3{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;font-weight:600;}
.coredns-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.coredns-zone{font:14px/1.4 ui-monospace,monospace;font-weight:700;color:var(--fg,#24292f);margin-bottom:6px;}
.coredns-plugins{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;}
.coredns-chip{font-size:11px;padding:2px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.coredns-chip.fwd{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.coredns-chip.k8s{background:#f0fdf4;border-color:#86efac;color:#166534;}
.coredns-chip.health{background:#fefce8;border-color:#fde047;color:#713f12;}
.coredns-fwd{font-size:12px;color:var(--fg-2,#888);margin:4px 0 2px;font-family:ui-monospace,monospace;}
.coredns-fwd-targets{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px;}
.coredns-fwd-target{font:12px ui-monospace,monospace;background:var(--bg-2,#f5f5f5);padding:2px 8px;border-radius:4px;border:1px solid var(--border,#e0e0e0);}
`;

const KNOWN_PLUGINS = new Set([
  'errors', 'health', 'ready', 'kubernetes', 'prometheus',
  'forward', 'cache', 'loop', 'reload', 'loadbalance',
  'log', 'file', 'auto', 'secondary', 'nsid', 'debug',
  'whoami', 'chaos', 'rewrite', 'hosts', 'template',
  'transfer', 'any', 'bind', 'bufsize', 'cancel',
  'dnssec', 'dnstap', 'erratic', 'etcd', 'grpc',
  'header', 'metadata', 'minimal', 'pprof', 'root',
  'sign', 'trace', 'view', 'acl', 'tls',
]);

function parseCorefile(text) {
  const lines = text.split('\n');
  const zones = [];
  let depth = 0;
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    // strip comments
    const line = raw.replace(/#.*/g, '').trim();
    if (!line) continue;

    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;

    if (depth === 0 && opens > 0) {
      // Zone block header: ".:53 {" or "cluster.local {" etc
      const header = line.replace(/\s*\{.*$/, '').trim();
      if (header) {
        current = { zone: header, plugins: [], forwardTargets: [], healthEndpoints: [], cacheTime: null };
        zones.push(current);
      }
    } else if (depth === 1 && current) {
      if (opens > 0) {
        // sub-block like "health { lameduck 5s }"
        const plugin = line.split(/[\s{]/)[0];
        if (plugin && KNOWN_PLUGINS.has(plugin) && !current.plugins.includes(plugin)) {
          current.plugins.push(plugin);
          if (plugin === 'health' || plugin === 'ready') {
            // look for endpoint in same line or sub-lines — just mark it
            const epMatch = line.match(/:(\d+)/);
            if (epMatch) current.healthEndpoints.push(`${plugin}:${epMatch[1]}`);
          }
        }
      } else if (!closes) {
        const parts = line.split(/\s+/);
        const plugin = parts[0];
        if (!plugin) continue;

        if (KNOWN_PLUGINS.has(plugin) && !current.plugins.includes(plugin)) {
          current.plugins.push(plugin);
        }

        if (plugin === 'forward') {
          // "forward . /etc/resolv.conf" or "forward . 10.0.0.1 10.0.0.2"
          const targets = parts.slice(2).filter((p) => !p.startsWith('{'));
          current.forwardTargets.push(...targets.filter(Boolean));
        }

        if (plugin === 'prometheus') {
          const ep = parts[1];
          if (ep) current.healthEndpoints.push(`prometheus: ${ep}`);
        }

        if (plugin === 'cache' && parts[1]) {
          current.cacheTime = parts[1];
        }
      }
    }

    depth += opens - closes;
    if (depth <= 0) {
      depth = 0;
      current = null;
    }
  }

  return zones;
}

function pluginClass(name) {
  if (name === 'forward') return 'fwd';
  if (name === 'kubernetes') return 'k8s';
  if (name === 'health' || name === 'ready' || name === 'prometheus') return 'health';
  return '';
}

export function render(intake) {
  const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
  const zones = parseCorefile(text);

  const sub = `${zones.length} zone${zones.length !== 1 ? 's' : ''}`;

  const zoneCards = zones.map((z) => {
    const chips = z.plugins.map((p) => {
      const cls = pluginClass(p);
      return `<span class="coredns-chip${cls ? ' ' + cls : ''}">${esc(p)}</span>`;
    }).join('');

    const fwdHtml = z.forwardTargets.length
      ? `<div class="coredns-fwd">forward targets:</div>
         <div class="coredns-fwd-targets">${z.forwardTargets.map((t) => `<span class="coredns-fwd-target">${esc(t)}</span>`).join('')}</div>`
      : '';

    const epHtml = z.healthEndpoints.length
      ? `<div class="coredns-fwd" style="margin-top:6px">endpoints: ${z.healthEndpoints.map(esc).join(' &nbsp; ')}</div>`
      : '';

    const cacheHtml = z.cacheTime
      ? `<div class="coredns-fwd">cache TTL: <strong>${esc(z.cacheTime)}s</strong></div>`
      : '';

    return `<div class="coredns-card">
  <div class="coredns-zone">${esc(z.zone)}</div>
  ${chips ? `<div class="coredns-plugins">${chips}</div>` : ''}
  ${fwdHtml}${epHtml}${cacheHtml}
</div>`;
  }).join('');

  const noZones = !zones.length
    ? '<div style="color:var(--fg-2,#888);font-size:13px">No zone blocks found.</div>'
    : '';

  const host = document.createElement('div');
  host.className = 'coredns-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="coredns-title"><span class="badge-coredns">CoreDNS</span>Corefile</div>
<div class="coredns-sub">${esc(sub)}</div>
<div class="coredns-sec"><h3>Zones</h3>${zoneCards}${noZones}</div>`;
  return { parentNode: host };
}
