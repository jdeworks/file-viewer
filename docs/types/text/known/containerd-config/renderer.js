const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ctrd-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-ctrd{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#575757;color:#fff;margin-right:8px;}
.ctrd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ctrd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ctrd-sec{margin:12px 0;}
.ctrd-sec h3{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;font-weight:600;}
.ctrd-tbl{width:100%;border-collapse:collapse;font-size:13px;}
.ctrd-tbl td{padding:5px 12px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.ctrd-tbl tr:last-child td{border-bottom:none;}
.ctrd-label{color:var(--fg-2,#888);font-size:12px;white-space:nowrap;min-width:140px;}
.ctrd-val{font:13px ui-monospace,monospace;word-break:break-all;}
.ctrd-mirror-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 12px;margin-bottom:6px;}
.ctrd-mirror-host{font:13px/1.4 ui-monospace,monospace;font-weight:700;color:var(--fg,#24292f);margin-bottom:4px;}
.ctrd-mirror-ep{font-size:12px;color:var(--fg-2,#888);font-family:ui-monospace,monospace;margin:2px 0;}
`;

function extract(text, pattern) {
  const m = text.match(pattern);
  return m ? m[1] : null;
}

function extractAll(text, pattern) {
  const results = [];
  let m;
  const re = new RegExp(pattern.source, 'g');
  while ((m = re.exec(text)) !== null) results.push(m[1]);
  return results;
}

export function render(intake) {
  const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');

  // Top-level version
  const version = extract(text, /^\s*version\s*=\s*(\d+)/m);

  // [grpc] address
  const grpcAddress = extract(text, /\[grpc\][^\[]*address\s*=\s*"([^"]+)"/s);

  // [metrics] address
  const metricsAddress = extract(text, /\[metrics\][^\[]*address\s*=\s*"([^"]+)"/s);

  // CRI plugin section
  const criSection = text.match(/\[plugins\."io\.containerd\.grpc\.v1\.cri"\]([^[]*(?:\[[^\]]*\][^[]*)*)/s)?.[0] || '';

  const sandboxImage = extract(criSection || text, /sandbox_image\s*=\s*"([^"]+)"/);

  // snapshotter from containerd sub-section
  const snapshotter = extract(text, /snapshotter\s*=\s*"([^"]+)"/);

  // default_runtime_name
  const defaultRuntime = extract(text, /default_runtime_name\s*=\s*"([^"]+)"/);

  // Registry mirrors — find all mirror host names and their endpoints
  const mirrorSection = text.match(/\[plugins\."io\.containerd\.grpc\.v1\.cri"\.registry\.mirrors\]([\s\S]*?)(?=\[plugins\."io\.containerd\.grpc\.v1\.cri"\.registry\.[a-z]|\[plugins\."io\.containerd(?!\.grpc\.v1\.cri"\.registry\.mirrors)|\[(?!plugins\."io\.containerd\.grpc\.v1\.cri"\.registry)|$)/)?.[1] || '';

  // Parse mirror blocks: [plugins."...".registry.mirrors."docker.io"]
  const mirrorBlocks = [];
  const mirrorRe = /\[plugins\."io\.containerd\.grpc\.v1\.cri"\.registry\.mirrors\."([^"]+)"\]\s*([\s\S]*?)(?=\[|$)/g;
  let mm;
  while ((mm = mirrorRe.exec(text)) !== null) {
    const host = mm[1];
    const block = mm[2];
    // Extract endpoint array: endpoint = ["...", "..."]
    const epMatch = block.match(/endpoint\s*=\s*\[([^\]]+)\]/s);
    const endpoints = epMatch
      ? (epMatch[1].match(/"([^"]+)"/g) || []).map((e) => e.replace(/"/g, ''))
      : [];
    mirrorBlocks.push({ host, endpoints });
  }

  // Build rows
  const runtimeRows = [
    version ? `<tr><td class="ctrd-label">config version</td><td class="ctrd-val">${esc(version)}</td></tr>` : '',
    grpcAddress ? `<tr><td class="ctrd-label">grpc address</td><td class="ctrd-val">${esc(grpcAddress)}</td></tr>` : '',
    metricsAddress ? `<tr><td class="ctrd-label">metrics address</td><td class="ctrd-val">${esc(metricsAddress)}</td></tr>` : '',
  ].filter(Boolean).join('');

  const criRows = [
    sandboxImage ? `<tr><td class="ctrd-label">sandbox_image</td><td class="ctrd-val">${esc(sandboxImage)}</td></tr>` : '',
    snapshotter ? `<tr><td class="ctrd-label">snapshotter</td><td class="ctrd-val">${esc(snapshotter)}</td></tr>` : '',
    defaultRuntime ? `<tr><td class="ctrd-label">default_runtime_name</td><td class="ctrd-val">${esc(defaultRuntime)}</td></tr>` : '',
  ].filter(Boolean).join('');

  const mirrorsHtml = mirrorBlocks.map((mb) => {
    const epLines = mb.endpoints.map((ep) => `<div class="ctrd-mirror-ep">${esc(ep)}</div>`).join('');
    return `<div class="ctrd-mirror-card">
  <div class="ctrd-mirror-host">${esc(mb.host)}</div>
  ${epLines}
</div>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'ctrd-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="ctrd-title"><span class="badge-ctrd">containerd</span>containerd Configuration</div>
<div class="ctrd-sub">config.toml</div>

${runtimeRows ? `<div class="ctrd-sec"><h3>Runtime</h3><table class="ctrd-tbl">${runtimeRows}</table></div>` : ''}

${criRows ? `<div class="ctrd-sec"><h3>CRI Plugin</h3><table class="ctrd-tbl">${criRows}</table></div>` : ''}

${mirrorsHtml ? `<div class="ctrd-sec"><h3>Registry Mirrors (${mirrorBlocks.length})</h3>${mirrorsHtml}</div>` : ''}`;

  return { parentNode: host };
}
