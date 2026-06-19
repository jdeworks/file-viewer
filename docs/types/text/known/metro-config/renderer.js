const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.metro-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-metro{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0078d4;color:#fff;vertical-align:middle;margin-right:8px;}
.metro-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.metro-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.metro-sec{margin:12px 0;}
.metro-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.metro-kv{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0;}
.metro-kv-item{display:flex;gap:6px;align-items:baseline;font-size:13px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);}
.metro-kv-item span:first-child{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em;}
.metro-kv-item span:last-child{font-family:ui-monospace,monospace;font-weight:600;}
.metro-pill{display:inline-block;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:2px;font-family:ui-monospace,monospace;}
.metro-badge-on{padding:1px 7px;border-radius:8px;background:#d1fae5;border:1px solid #6ee7b7;color:#065f46;font-size:11px;font-weight:700;}
.metro-badge-off{padding:1px 7px;border-radius:8px;background:#f6f8fa;border:1px solid #e0e0e0;color:#888;font-size:11px;}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = (intake.name || intake.filename || 'metro.config.js').split('/').pop();

  // Transformer
  let babelTransformerPath = null;
  const btp = /babelTransformerPath\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  if (btp) babelTransformerPath = btp[1];

  // SVG support (react-native-svg-transformer)
  const hasSvg = /svg-transformer|react-native-svg/.test(text);

  // TypeScript support
  const hasTs = /\.ts[x]?\b/.test(text) || /typescript/i.test(text);

  // Flow support
  const hasFlow = /\.flow\b|flow-bin|flowtype/i.test(text);

  // Source extensions
  const sourceExts = [];
  const seM = /sourceExts\s*:\s*\[([^\]]+)\]/s.exec(text);
  if (seM) {
    const re = /['"`]([^'"`]+)['"`]/g;
    let m;
    while ((m = re.exec(seM[1])) !== null) sourceExts.push(m[1]);
  } else {
    // Look for spread of sourceExts
    const spreadM = /\.\.\.(?:require\s*\(['"]metro-config['"]\)[^)]*\.)?\s*(?:getDefaultConfig[^;]*\.)?resolver\.sourceExts/.exec(text);
    if (spreadM) sourceExts.push('(default + custom)');
  }

  // Server port
  let port = null;
  const portM = /server\s*:\s*\{[^}]*port\s*:\s*(\d+)/s.exec(text) || /port\s*:\s*(\d+)/.exec(text);
  if (portM) port = portM[1];

  // Resolver platforms
  const platforms = [];
  const platM = /platforms\s*:\s*\[([^\]]+)\]/s.exec(text);
  if (platM) {
    const re = /['"`]([^'"`]+)['"`]/g;
    let m;
    while ((m = re.exec(platM[1])) !== null) platforms.push(m[1]);
  }

  // Has transformer block?
  const hasTransformer = /transformer\s*:/.test(text);
  // Has resolver block?
  const hasResolver = /resolver\s*:/.test(text);

  const host = document.createElement('div');
  host.className = 'metro-doc';

  const kvItems = [
    port ? `<div class="metro-kv-item"><span>Server Port</span><span>${esc(port)}</span></div>` : '',
    babelTransformerPath ? `<div class="metro-kv-item"><span>Babel Transformer</span><span>${esc(babelTransformerPath.split('/').pop())}</span></div>` : '',
  ].filter(Boolean).join('');

  const features = [
    { label: 'SVG support', on: hasSvg },
    { label: 'TypeScript', on: hasTs },
    { label: 'Flow', on: hasFlow },
    { label: 'Custom transformer', on: hasTransformer },
    { label: 'Custom resolver', on: hasResolver },
  ];

  host.innerHTML = `<style>${CSS}</style>
<div class="metro-title"><span class="badge-metro">Metro</span>${esc(name)}</div>
<div class="metro-sub">React Native Metro bundler configuration</div>
${kvItems ? `<div class="metro-sec"><div class="metro-kv">${kvItems}</div></div>` : ''}
<div class="metro-sec"><h3>Features</h3><div class="metro-kv">${features.map((f) => `<div class="metro-kv-item"><span>${esc(f.label)}</span><span><span class="${f.on ? 'metro-badge-on' : 'metro-badge-off'}">${f.on ? 'yes' : 'no'}</span></span></div>`).join('')}</div></div>
${sourceExts.length ? `<div class="metro-sec"><h3>Source Extensions</h3><div>${sourceExts.map((e) => `<span class="metro-pill">${esc(e)}</span>`).join('')}</div></div>` : ''}
${platforms.length ? `<div class="metro-sec"><h3>Platforms</h3><div>${platforms.map((p) => `<span class="metro-pill">${esc(p)}</span>`).join('')}</div></div>` : ''}`;

  return { parentNode: host };
}
