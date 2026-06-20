const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ansiblecfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ansiblecfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#cc0000;color:#fff;vertical-align:middle;margin-right:8px;}
.ansiblecfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ansiblecfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ansiblecfg-card{margin:10px 0;border:1px solid var(--border,#e0e0e0);border-radius:6px;overflow:hidden;}
.ansiblecfg-card-hd{padding:6px 12px;background:var(--bg-2,#f6f8fa);font-size:13px;font-weight:600;font-family:ui-monospace,monospace;cursor:pointer;display:flex;align-items:center;justify-content:space-between;user-select:none;}
.ansiblecfg-card-hd:hover{background:var(--bg-3,#eaeef2);}
.ansiblecfg-card-body{padding:0;}
.ansiblecfg-table{width:100%;border-collapse:collapse;font-size:12px;}
.ansiblecfg-table td{padding:5px 12px;border-top:1px solid var(--border,#e0e0e0);vertical-align:top;}
.ansiblecfg-table td:first-child{font-family:ui-monospace,monospace;color:var(--fg-2,#888);width:38%;white-space:nowrap;}
.ansiblecfg-table td:last-child{font-family:ui-monospace,monospace;word-break:break-word;}
.ansiblecfg-arrow{font-size:10px;color:var(--fg-2,#888);transition:transform .15s;}
.ansiblecfg-arrow.open{transform:rotate(90deg);}
.ansiblecfg-chip{display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;margin:1px 2px;font-family:ui-monospace,monospace;}
.chip-green{background:#e6f4ea;color:#1a7f37;}
.chip-orange{background:#fff3e0;color:#e65100;}
.chip-blue{background:#e3f2fd;color:#0d47a1;}
.chip-gray{background:var(--bg-2,#f6f8fa);color:var(--fg-2,#888);border:1px solid var(--border,#e0e0e0);}
.ansiblecfg-val{font-family:ui-monospace,monospace;color:var(--fg,#24292f);}
`;

function parseIni(text) {
  const secs = {};
  const order = [];
  let cur = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const sec = line.match(/^\[([^\]]+)\]/);
    if (sec) {
      cur = sec[1].trim();
      if (!secs[cur]) { secs[cur] = []; order.push(cur); }
      continue;
    }
    if (cur) {
      const kv = line.match(/^([^=:]+)[=:](.*)/);
      if (kv) secs[cur].push([kv[1].trim(), kv[2].trim()]);
    }
  }
  return { secs, order };
}

function chip(text, cls) {
  return `<span class="ansiblecfg-chip ${cls}">${esc(text)}</span>`;
}

function val(text) {
  return `<span class="ansiblecfg-val">${esc(text)}</span>`;
}

function boolChip(v, trueLabel, trueColor, falseLabel, falseColor) {
  const lower = v.trim().toLowerCase();
  if (lower === 'true') return chip(trueLabel || 'enabled', trueColor || 'chip-green');
  if (lower === 'false') return chip(falseLabel || 'disabled', falseColor || 'chip-gray');
  return val(v);
}

function renderRow(k, display) {
  return `<tr><td>${esc(k)}</td><td>${display}</td></tr>`;
}

function renderDefaultsSection(pairs) {
  const map = Object.fromEntries(pairs);
  const rows = [];

  if (map.inventory != null) rows.push(renderRow('inventory', val(map.inventory)));
  if (map.remote_user != null) rows.push(renderRow('remote_user', val(map.remote_user)));
  if (map.host_key_checking != null)
    rows.push(renderRow('host_key_checking', boolChip(map.host_key_checking, 'enabled', 'chip-green', 'disabled', 'chip-orange')));
  if (map.timeout != null) rows.push(renderRow('timeout', chip(map.timeout + 's', 'chip-gray')));
  if (map.forks != null) rows.push(renderRow('forks', chip(map.forks + ' parallel', 'chip-blue')));
  if (map.roles_path != null) rows.push(renderRow('roles_path', val(map.roles_path)));
  if (map.collections_paths != null) rows.push(renderRow('collections_paths', val(map.collections_paths)));
  if (map.log_path != null) rows.push(renderRow('log_path', val(map.log_path)));
  if (map.retry_files_enabled != null)
    rows.push(renderRow('retry_files_enabled', boolChip(map.retry_files_enabled, 'enabled', 'chip-orange', 'disabled', 'chip-green')));
  if (map.stdout_callback != null) {
    const cb = map.stdout_callback.trim().toLowerCase();
    const cbCls = cb === 'yaml' ? 'chip-blue' : cb === 'json' ? 'chip-green' : 'chip-gray';
    rows.push(renderRow('stdout_callback', chip(map.stdout_callback, cbCls)));
  }
  if (map.callbacks_enabled != null) {
    const items = map.callbacks_enabled.split(',').map(s => s.trim()).filter(Boolean);
    rows.push(renderRow('callbacks_enabled', items.map(c => chip(c, 'chip-gray')).join(' ')));
  }
  if (map.interpreter_python != null) {
    const ip = map.interpreter_python.trim();
    const ipCls = ip === 'auto_silent' || ip === 'auto' ? 'chip-green' : ip.startsWith('/') ? 'chip-blue' : 'chip-gray';
    rows.push(renderRow('interpreter_python', chip(ip, ipCls)));
  }
  // Remaining keys not explicitly handled
  const handled = new Set(['inventory','remote_user','host_key_checking','timeout','forks','roles_path','collections_paths','log_path','retry_files_enabled','stdout_callback','callbacks_enabled','interpreter_python']);
  for (const [k, v] of pairs) {
    if (!handled.has(k)) rows.push(renderRow(k, val(v)));
  }
  return rows.join('');
}

function renderPrivEscSection(pairs) {
  const map = Object.fromEntries(pairs);
  const rows = [];
  if (map.become != null)
    rows.push(renderRow('become', boolChip(map.become, 'enabled', 'chip-orange', 'disabled', 'chip-gray')));
  if (map.become_method != null) {
    const m = map.become_method.trim().toLowerCase();
    const mCls = m === 'sudo' ? 'chip-blue' : 'chip-gray';
    rows.push(renderRow('become_method', chip(map.become_method, mCls)));
  }
  if (map.become_user != null) rows.push(renderRow('become_user', val(map.become_user)));
  if (map.become_ask_pass != null)
    rows.push(renderRow('become_ask_pass', boolChip(map.become_ask_pass, 'enabled', 'chip-orange', 'disabled', 'chip-green')));
  const handled = new Set(['become','become_method','become_user','become_ask_pass']);
  for (const [k, v] of pairs) {
    if (!handled.has(k)) rows.push(renderRow(k, val(v)));
  }
  return rows.join('');
}

function renderSshSection(pairs) {
  const map = Object.fromEntries(pairs);
  const rows = [];
  if (map.ssh_args != null) rows.push(renderRow('ssh_args', val(map.ssh_args)));
  if (map.pipelining != null)
    rows.push(renderRow('pipelining', boolChip(map.pipelining, 'enabled', 'chip-green', 'disabled', 'chip-gray')));
  if (map.control_path_dir != null) rows.push(renderRow('control_path_dir', val(map.control_path_dir)));
  if (map.transfer_method != null) rows.push(renderRow('transfer_method', chip(map.transfer_method, 'chip-gray')));
  const handled = new Set(['ssh_args','pipelining','control_path_dir','transfer_method']);
  for (const [k, v] of pairs) {
    if (!handled.has(k)) rows.push(renderRow(k, val(v)));
  }
  return rows.join('');
}

function renderGenericSection(pairs) {
  return pairs.map(([k, v]) => renderRow(k, val(v))).join('');
}

function renderSection(name, pairs, idx) {
  const isOpen = idx === 0;
  const bodyStyle = isOpen ? '' : ' style="display:none"';
  const arrowClass = isOpen ? ' open' : '';

  const lower = name.toLowerCase();
  let rows;
  if (lower === 'defaults') rows = renderDefaultsSection(pairs);
  else if (lower === 'privilege_escalation') rows = renderPrivEscSection(pairs);
  else if (lower === 'ssh_connection') rows = renderSshSection(pairs);
  else rows = renderGenericSection(pairs);

  return `<div class="ansiblecfg-card">
  <div class="ansiblecfg-card-hd" onclick="(function(el){var b=el.nextElementSibling;var a=el.querySelector('.ansiblecfg-arrow');var o=b.style.display==='none';b.style.display=o?'':'none';a.classList.toggle('open',o);})(this)">
    <span>[${esc(name)}]</span>
    <span class="ansiblecfg-arrow${arrowClass}">▶</span>
  </div>
  <div class="ansiblecfg-card-body"${bodyStyle}>
    ${rows ? `<table class="ansiblecfg-table"><tbody>${rows}</tbody></table>` : '<p style="padding:8px 12px;color:var(--fg-2,#888);font-size:12px;margin:0">No settings.</p>'}
  </div>
</div>`;
}

export function render(intake) {
  const { secs, order } = parseIni(intake.text || '');

  const totalKeys = order.reduce((n, s) => n + secs[s].length, 0);
  const sectionsHtml = order.length
    ? order.map((name, i) => renderSection(name, secs[name], i)).join('')
    : '<p style="color:var(--fg-2,#888);font-size:13px;">No configuration sections found.</p>';

  const host = document.createElement('div');
  host.className = 'ansiblecfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="ansiblecfg-title"><span class="ansiblecfg-badge">Ansible</span>Ansible Config</div>
<div class="ansiblecfg-sub">${order.length} section${order.length !== 1 ? 's' : ''} · ${totalKeys} setting${totalKeys !== 1 ? 's' : ''}</div>
${sectionsHtml}`;
  return { parentNode: host };
}
