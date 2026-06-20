const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.corosync-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.corosync-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#CC3333;color:#fff;vertical-align:middle;margin-right:8px}
.corosync-title{font-size:18px;font-weight:700;margin:0 0 4px}
.corosync-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.corosync-sec{margin:14px 0}
.corosync-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.corosync-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px}
.corosync-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px}
.corosync-kv-key{color:var(--fg-2,#888);min-width:150px;flex-shrink:0}
.corosync-kv-val{font-family:ui-monospace,monospace;word-break:break-all}
.corosync-table{width:100%;border-collapse:collapse;font-size:13px}
.corosync-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:4px 8px 4px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.corosync-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-size:12px;font-family:ui-monospace,monospace}
.corosync-nodeid{font-weight:600;color:var(--fg,#24292f)}
.corosync-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:#e0f2fe;color:#075985;border:1px solid #7dd3fc;margin:1px 2px 1px 0}
.corosync-chip-on{background:#dcfce7;color:#166534;border-color:#86efac}
.corosync-chip-off{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
`;

// Strip inline comments and trim
function cleanLine(l) {
  return l.replace(/#.*$/, '').trim();
}

function linesOf(body) {
  return body.split('\n').map(cleanLine).filter(Boolean);
}

// Extract a brace-delimited block body starting after the opening {
function extractBlock(text, startIdx) {
  let depth = 1, i = startIdx;
  while (i < text.length && depth > 0) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') depth--;
    i++;
  }
  return text.slice(startIdx, i - 1);
}

// Parse key: value pairs from a block body
function parseKV(body) {
  const kv = {};
  for (const l of linesOf(body)) {
    const m = /^(\w+)\s*:\s*(.+)$/.exec(l);
    if (m) kv[m[1].trim()] = m[2].trim();
  }
  return kv;
}

function parseCorosync(text) {
  const result = {
    totem: null,
    quorum: null,
    nodes: [],
    logging: null,
  };

  let i = 0;
  while (i < text.length) {
    // Skip comments
    if (text[i] === '#') {
      const nl = text.indexOf('\n', i);
      i = nl === -1 ? text.length : nl + 1;
      continue;
    }

    const rest = text.slice(i);

    // Match top-level blocks: totem, quorum, nodelist, logging
    const blockM = /^(totem|quorum|nodelist|logging)\s*\{/.exec(rest);
    if (blockM) {
      const keyword = blockM[1];
      const braceStart = i + blockM[0].length;
      const body = extractBlock(text, braceStart);
      i = braceStart + body.length + 1;

      if (keyword === 'totem') {
        result.totem = parseTotem(body);
      } else if (keyword === 'quorum') {
        result.quorum = parseKV(body);
      } else if (keyword === 'nodelist') {
        result.nodes = parseNodelist(body);
      } else if (keyword === 'logging') {
        result.logging = parseLogging(body);
      }
      continue;
    }
    i++;
  }
  return result;
}

function parseTotem(body) {
  const t = parseKV(body);
  // Parse interface sub-blocks
  const interfaces = [];
  let j = 0;
  while (j < body.length) {
    const rest = body.slice(j);
    const m = /^interface\s*\{/.exec(rest);
    if (m) {
      const start = j + m[0].length;
      const blk = extractBlock(body, start);
      interfaces.push(parseKV(blk));
      j = start + blk.length + 1;
    } else {
      j++;
    }
  }
  t._interfaces = interfaces;
  return t;
}

function parseNodelist(body) {
  const nodes = [];
  let j = 0;
  while (j < body.length) {
    const rest = body.slice(j);
    const m = /^node\s*\{/.exec(rest);
    if (m) {
      const start = j + m[0].length;
      const blk = extractBlock(body, start);
      nodes.push(parseKV(blk));
      j = start + blk.length + 1;
    } else {
      j++;
    }
  }
  return nodes;
}

function parseLogging(body) {
  const l = parseKV(body);
  // Parse logger_subsys sub-blocks (ignore, just return top-level)
  return l;
}

function yesNo(val) {
  if (!val) return null;
  const v = val.toLowerCase();
  if (v === 'yes' || v === 'on' || v === 'true' || v === '1') return true;
  if (v === 'no' || v === 'off' || v === 'false' || v === '0') return false;
  return null;
}

function boolChip(val, label) {
  const b = yesNo(val);
  if (b === null) return `<span class="corosync-kv-val">${esc(val || '—')}</span>`;
  return `<span class="corosync-chip ${b ? 'corosync-chip-on' : 'corosync-chip-off'}">${esc(label || (b ? 'yes' : 'no'))}</span>`;
}

export function render(intake) {
  const text = intake.text || '';
  const { totem, quorum, nodes, logging } = parseCorosync(text);

  const parts = [];

  // Sub-line
  const subParts = [];
  if (totem && totem.cluster_name) subParts.push(`cluster: ${totem.cluster_name}`);
  if (nodes.length) subParts.push(`${nodes.length} node${nodes.length !== 1 ? 's' : ''}`);
  if (quorum && quorum.two_node === '1') subParts.push('two-node mode');
  const sub = subParts.join(' · ') || 'Corosync cluster messaging configuration';

  // Totem section
  if (totem) {
    const rows = [];
    if (totem.version) rows.push(`<div class="corosync-kv"><span class="corosync-kv-key">version</span><span class="corosync-kv-val">${esc(totem.version)}</span></div>`);
    if (totem.cluster_name) rows.push(`<div class="corosync-kv"><span class="corosync-kv-key">cluster_name</span><span class="corosync-kv-val">${esc(totem.cluster_name)}</span></div>`);
    if (totem.secauth) rows.push(`<div class="corosync-kv"><span class="corosync-kv-key">secauth</span>${boolChip(totem.secauth)}</div>`);
    if (totem.transport) rows.push(`<div class="corosync-kv"><span class="corosync-kv-key">transport</span><span class="corosync-kv-val">${esc(totem.transport)}</span></div>`);
    if (totem.token) rows.push(`<div class="corosync-kv"><span class="corosync-kv-key">token</span><span class="corosync-kv-val">${esc(totem.token)} ms</span></div>`);
    if (totem.join) rows.push(`<div class="corosync-kv"><span class="corosync-kv-key">join</span><span class="corosync-kv-val">${esc(totem.join)} ms</span></div>`);
    if (totem.consensus) rows.push(`<div class="corosync-kv"><span class="corosync-kv-key">consensus</span><span class="corosync-kv-val">${esc(totem.consensus)} ms</span></div>`);

    // Interfaces
    const ifaceRows = totem._interfaces && totem._interfaces.length
      ? totem._interfaces.map((iface) => {
          const ring = iface.ringnumber || iface.linknumber || '—';
          const bind = iface.bindnetaddr || iface.bindnetaddress || '—';
          const mcast = iface.mcastaddr || '';
          const port = iface.mcastport || '';
          return `<tr><td>${esc(ring)}</td><td>${esc(bind)}</td><td>${esc(mcast) || '—'}</td><td>${esc(port) || '—'}</td></tr>`;
        }).join('')
      : '';

    let totemHtml = `<div class="corosync-sec"><h3>Totem Settings</h3><div class="corosync-card">${rows.join('')}`;
    if (ifaceRows) {
      totemHtml += `<div style="margin-top:10px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin-bottom:5px">Interfaces</div>
<table class="corosync-table"><thead><tr><th>Ring</th><th>Bind Address</th><th>Multicast</th><th>Port</th></tr></thead><tbody>${ifaceRows}</tbody></table></div>`;
    }
    totemHtml += `</div></div>`;
    parts.push(totemHtml);
  }

  // Quorum section
  if (quorum && Object.keys(quorum).length) {
    const rows = [];
    if (quorum.provider) rows.push(`<div class="corosync-kv"><span class="corosync-kv-key">provider</span><span class="corosync-kv-val">${esc(quorum.provider)}</span></div>`);
    if (quorum.votes) rows.push(`<div class="corosync-kv"><span class="corosync-kv-key">votes</span><span class="corosync-kv-val">${esc(quorum.votes)}</span></div>`);
    if (quorum.expected_votes) rows.push(`<div class="corosync-kv"><span class="corosync-kv-key">expected_votes</span><span class="corosync-kv-val">${esc(quorum.expected_votes)}</span></div>`);
    if (quorum.two_node !== undefined) rows.push(`<div class="corosync-kv"><span class="corosync-kv-key">two_node</span>${boolChip(quorum.two_node === '1' ? 'yes' : 'no', quorum.two_node === '1' ? 'enabled' : 'disabled')}</div>`);
    if (quorum.wait_for_all) rows.push(`<div class="corosync-kv"><span class="corosync-kv-key">wait_for_all</span>${boolChip(quorum.wait_for_all)}</div>`);
    if (rows.length) parts.push(`<div class="corosync-sec"><h3>Quorum</h3><div class="corosync-card">${rows.join('')}</div></div>`);
  }

  // Nodelist section
  if (nodes.length) {
    const nodeRows = nodes.map((n) => {
      const id = n.nodeid || '—';
      const ring0 = n.ring0_addr || n.name || '—';
      const ring1 = n.ring1_addr || '';
      const name = n.name || '';
      return `<tr><td class="corosync-nodeid">${esc(id)}</td><td>${esc(ring0)}</td><td>${esc(ring1) || '—'}</td><td>${esc(name) || '—'}</td></tr>`;
    }).join('');
    parts.push(`<div class="corosync-sec"><h3>Node List (${nodes.length})</h3>
<table class="corosync-table">
  <thead><tr><th>Node ID</th><th>Ring 0 Address</th><th>Ring 1 Address</th><th>Name</th></tr></thead>
  <tbody>${nodeRows}</tbody>
</table></div>`);
  }

  // Logging section
  if (logging && Object.keys(logging).length) {
    const rows = [];
    if (logging.to_syslog) rows.push(`<div class="corosync-kv"><span class="corosync-kv-key">to_syslog</span>${boolChip(logging.to_syslog)}</div>`);
    if (logging.to_logfile) rows.push(`<div class="corosync-kv"><span class="corosync-kv-key">to_logfile</span>${boolChip(logging.to_logfile)}</div>`);
    if (logging.logfile) rows.push(`<div class="corosync-kv"><span class="corosync-kv-key">logfile</span><span class="corosync-kv-val">${esc(logging.logfile)}</span></div>`);
    if (logging.logfile_priority) rows.push(`<div class="corosync-kv"><span class="corosync-kv-key">logfile_priority</span><span class="corosync-kv-val">${esc(logging.logfile_priority)}</span></div>`);
    if (logging.debug) rows.push(`<div class="corosync-kv"><span class="corosync-kv-key">debug</span>${boolChip(logging.debug)}</div>`);
    if (logging.timestamp) rows.push(`<div class="corosync-kv"><span class="corosync-kv-key">timestamp</span>${boolChip(logging.timestamp)}</div>`);
    if (rows.length) parts.push(`<div class="corosync-sec"><h3>Logging</h3><div class="corosync-card">${rows.join('')}</div></div>`);
  }

  const host = document.createElement('div');
  host.className = 'corosync-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="corosync-badge">Corosync</span>
  <span class="corosync-title">Cluster Messaging Config</span>
</div>
<div class="corosync-sub">${esc(sub)}</div>
${parts.join('')}`;

  return { parentNode: host };
}
