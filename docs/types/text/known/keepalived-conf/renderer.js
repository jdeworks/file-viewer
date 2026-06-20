const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.kalivd-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.kalivd-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#C0392B;color:#fff;vertical-align:middle;margin-right:8px}
.kalivd-title{font-size:18px;font-weight:700;margin:0 0 4px}
.kalivd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.kalivd-sec{margin:14px 0}
.kalivd-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.kalivd-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px}
.kalivd-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px}
.kalivd-kv-key{color:var(--fg-2,#888);min-width:130px;flex-shrink:0}
.kalivd-kv-val{font-family:ui-monospace,monospace;word-break:break-all}
.kalivd-table{width:100%;border-collapse:collapse;font-size:13px}
.kalivd-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:4px 8px 4px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.kalivd-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-size:12px;font-family:ui-monospace,monospace}
.kalivd-id{font-weight:600;color:var(--fg,#24292f)}
.kalivd-state-master{display:inline-block;font-size:11px;padding:2px 8px;border-radius:10px;background:#dcfce7;color:#166534;border:1px solid #86efac;font-weight:700}
.kalivd-state-backup{display:inline-block;font-size:11px;padding:2px 8px;border-radius:10px;background:#ffedd5;color:#9a3412;border:1px solid #fdba74;font-weight:700}
.kalivd-state-other{display:inline-block;font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);color:var(--fg-2,#555);border:1px solid var(--border,#e0e0e0);font-weight:700}
.kalivd-vip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:5px;background:#e0f2fe;color:#075985;border:1px solid #7dd3fc;margin:1px 2px 1px 0}
`;

// Parse a brace-delimited block body given text starting after the opening {
function extractBlock(text, startIdx) {
  let depth = 1, i = startIdx;
  while (i < text.length && depth > 0) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') depth--;
    i++;
  }
  return text.slice(startIdx, i - 1);
}

function parseKeepalived(text) {
  const result = {
    global: null,
    vrrpInstances: [],
    vrrpScripts: [],
    virtualServers: [],
  };

  let i = 0;
  while (i < text.length) {
    // Skip comments and whitespace
    if (text[i] === '#' || text[i] === '!') {
      const nl = text.indexOf('\n', i);
      i = nl === -1 ? text.length : nl + 1;
      continue;
    }

    // Match block keywords
    const rest = text.slice(i);
    const blockM = /^(global_defs|vrrp_instance|vrrp_script|virtual_server)\b([^\{]*)\{/.exec(rest);
    if (blockM) {
      const keyword = blockM[1];
      const nameRaw = blockM[2].trim();
      const braceStart = i + blockM[0].length;
      const body = extractBlock(text, braceStart);
      i = braceStart + body.length + 1;

      if (keyword === 'global_defs') {
        result.global = parseGlobalDefs(body);
      } else if (keyword === 'vrrp_instance') {
        result.vrrpInstances.push(parseVrrpInstance(nameRaw, body));
      } else if (keyword === 'vrrp_script') {
        result.vrrpScripts.push(parseVrrpScript(nameRaw, body));
      } else if (keyword === 'virtual_server') {
        result.virtualServers.push(parseVirtualServer(nameRaw, body));
      }
      continue;
    }
    i++;
  }
  return result;
}

function lines(body) {
  return body.split('\n').map((l) => l.trim().replace(/#.*$/, '').trim()).filter(Boolean);
}

function parseGlobalDefs(body) {
  const g = { routerId: null, smtpServer: null, smtpTimeout: null, emails: [] };
  let inEmail = false;
  for (const l of lines(body)) {
    if (/^notification_email\s*\{/.test(l)) { inEmail = true; continue; }
    if (inEmail && l === '}') { inEmail = false; continue; }
    if (inEmail) { g.emails.push(l); continue; }
    const rid = /^router_id\s+(\S+)/.exec(l); if (rid) g.routerId = rid[1];
    const smtp = /^smtp_server\s+(\S+)/.exec(l); if (smtp) g.smtpServer = smtp[1];
    const stout = /^smtp_connect_timeout\s+(\S+)/.exec(l); if (stout) g.smtpTimeout = stout[1];
  }
  return g;
}

function parseVrrpInstance(name, body) {
  const inst = { name, state: null, interface: null, virtualRouterId: null, priority: null, advertInt: null, vips: [] };
  let inVipBlock = false;
  for (const l of lines(body)) {
    if (/^virtual_ipaddress\s*\{/.test(l)) { inVipBlock = true; continue; }
    if (inVipBlock && l === '}') { inVipBlock = false; continue; }
    if (inVipBlock) { inst.vips.push(l); continue; }
    const st = /^state\s+(\S+)/.exec(l); if (st) inst.state = st[1];
    const iface = /^interface\s+(\S+)/.exec(l); if (iface) inst.interface = iface[1];
    const vrid = /^virtual_router_id\s+(\S+)/.exec(l); if (vrid) inst.virtualRouterId = vrid[1];
    const pri = /^priority\s+(\S+)/.exec(l); if (pri) inst.priority = pri[1];
    const adv = /^advert_int\s+(\S+)/.exec(l); if (adv) inst.advertInt = adv[1];
  }
  return inst;
}

function parseVrrpScript(name, body) {
  const s = { name, script: null, interval: null, weight: null };
  for (const l of lines(body)) {
    const sc = /^script\s+"?([^"]+)"?/.exec(l); if (sc) s.script = sc[1].trim().replace(/^["']|["']$/g, '');
    const iv = /^interval\s+(\S+)/.exec(l); if (iv) s.interval = iv[1];
    const wt = /^weight\s+(\S+)/.exec(l); if (wt) s.weight = wt[1];
  }
  return s;
}

function parseVirtualServer(nameRaw, body) {
  const vs = { addr: nameRaw, lbAlgo: null, lbKind: null, delayLoop: null, realServers: [] };
  let inReal = false, realBuf = [];
  for (const l of lines(body)) {
    if (/^real_server\b/.test(l)) { inReal = true; realBuf = [l]; continue; }
    if (inReal) {
      if (l === '}') {
        vs.realServers.push(realBuf.join(' '));
        inReal = false;
      } else { realBuf.push(l); }
      continue;
    }
    const la = /^lb_algo\s+(\S+)/.exec(l); if (la) vs.lbAlgo = la[1];
    const lk = /^lb_kind\s+(\S+)/.exec(l); if (lk) vs.lbKind = lk[1];
    const dl = /^delay_loop\s+(\S+)/.exec(l); if (dl) vs.delayLoop = dl[1];
  }
  return vs;
}

function stateChip(state) {
  const s = (state || '').toUpperCase();
  if (s === 'MASTER') return `<span class="kalivd-state-master">MASTER</span>`;
  if (s === 'BACKUP') return `<span class="kalivd-state-backup">BACKUP</span>`;
  return `<span class="kalivd-state-other">${esc(state || '—')}</span>`;
}

export function render(intake) {
  const text = intake.text || '';
  const { global: gd, vrrpInstances, vrrpScripts, virtualServers } = parseKeepalived(text);

  const parts = [];
  if (vrrpInstances.length) parts.push(`${vrrpInstances.length} VRRP instance${vrrpInstances.length !== 1 ? 's' : ''}`);
  if (virtualServers.length) parts.push(`${virtualServers.length} virtual server${virtualServers.length !== 1 ? 's' : ''}`);
  if (vrrpScripts.length) parts.push(`${vrrpScripts.length} script${vrrpScripts.length !== 1 ? 's' : ''}`);

  // Global settings card
  const globalHtml = gd ? `<div class="kalivd-sec"><h3>Global Settings</h3>
<div class="kalivd-card">
  ${gd.routerId ? `<div class="kalivd-kv"><span class="kalivd-kv-key">router_id</span><span class="kalivd-kv-val">${esc(gd.routerId)}</span></div>` : ''}
  ${gd.smtpServer ? `<div class="kalivd-kv"><span class="kalivd-kv-key">smtp_server</span><span class="kalivd-kv-val">${esc(gd.smtpServer)}</span></div>` : ''}
  ${gd.smtpTimeout ? `<div class="kalivd-kv"><span class="kalivd-kv-key">smtp_timeout</span><span class="kalivd-kv-val">${esc(gd.smtpTimeout)}s</span></div>` : ''}
  ${gd.emails.length ? `<div class="kalivd-kv"><span class="kalivd-kv-key">notify_email</span><span class="kalivd-kv-val">${gd.emails.map(esc).join(', ')}</span></div>` : ''}
</div></div>` : '';

  // VRRP instances table
  const vrrpHtml = vrrpInstances.length ? `<div class="kalivd-sec"><h3>VRRP Instances (${vrrpInstances.length})</h3>
<table class="kalivd-table">
  <thead><tr><th>Instance</th><th>State</th><th>Interface</th><th>Priority</th><th>Router ID</th><th>VIPs</th></tr></thead>
  <tbody>${vrrpInstances.map((inst) => `<tr>
    <td><span class="kalivd-id">${esc(inst.name)}</span></td>
    <td>${stateChip(inst.state)}</td>
    <td>${esc(inst.interface || '—')}</td>
    <td>${esc(inst.priority || '—')}</td>
    <td>${esc(inst.virtualRouterId || '—')}</td>
    <td>${inst.vips.length ? inst.vips.map((v) => `<span class="kalivd-vip">${esc(v)}</span>`).join('') : '—'}</td>
  </tr>`).join('')}</tbody>
</table></div>` : '';

  // VRRP scripts
  const scriptsHtml = vrrpScripts.length ? `<div class="kalivd-sec"><h3>VRRP Scripts (${vrrpScripts.length})</h3>
<table class="kalivd-table">
  <thead><tr><th>Name</th><th>Script</th><th>Interval</th><th>Weight</th></tr></thead>
  <tbody>${vrrpScripts.map((s) => `<tr>
    <td><span class="kalivd-id">${esc(s.name)}</span></td>
    <td>${esc(s.script || '—')}</td>
    <td>${esc(s.interval || '—')}${s.interval ? 's' : ''}</td>
    <td>${esc(s.weight || '—')}</td>
  </tr>`).join('')}</tbody>
</table></div>` : '';

  // Virtual servers
  const vsHtml = virtualServers.length ? `<div class="kalivd-sec"><h3>Virtual Servers (${virtualServers.length})</h3>
${virtualServers.map((vs) => `<div class="kalivd-card">
  <div style="font-family:ui-monospace,monospace;font-size:13px;font-weight:600;margin-bottom:6px;">${esc(vs.addr)}</div>
  ${vs.lbAlgo ? `<div class="kalivd-kv"><span class="kalivd-kv-key">lb_algo</span><span class="kalivd-kv-val">${esc(vs.lbAlgo)}</span></div>` : ''}
  ${vs.lbKind ? `<div class="kalivd-kv"><span class="kalivd-kv-key">lb_kind</span><span class="kalivd-kv-val">${esc(vs.lbKind)}</span></div>` : ''}
  ${vs.delayLoop ? `<div class="kalivd-kv"><span class="kalivd-kv-key">delay_loop</span><span class="kalivd-kv-val">${esc(vs.delayLoop)}s</span></div>` : ''}
  ${vs.realServers.length ? `<div class="kalivd-kv"><span class="kalivd-kv-key">real servers</span><span class="kalivd-kv-val">${vs.realServers.length}</span></div>` : ''}
</div>`).join('')}</div>` : '';

  const host = document.createElement('div');
  host.className = 'kalivd-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="kalivd-badge">Keepalived</span>
  <span class="kalivd-title">VRRP High Availability</span>
</div>
<div class="kalivd-sub">${parts.length ? esc(parts.join(' · ')) : 'Keepalived configuration'}</div>
${globalHtml}${vrrpHtml}${scriptsHtml}${vsHtml}`;

  return { parentNode: host };
}
