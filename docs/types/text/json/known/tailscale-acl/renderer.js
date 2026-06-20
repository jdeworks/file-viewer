const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tailscale-acl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.ts-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0064FF;color:#fff;vertical-align:middle;margin-right:8px}
.ts-title{font-size:18px;font-weight:700;margin:0 0 4px}
.ts-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.ts-sec{margin:14px 0}
.ts-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.ts-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.ts-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.ts-kv-k{color:var(--fg-2,#888);min-width:160px;flex-shrink:0}
.ts-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.ts-status-ok{display:inline-block;padding:1px 8px;border-radius:8px;font-size:11px;font-weight:700;background:#d4edda;color:#155724;border:1px solid #c3e6cb}
.ts-status-warn{display:inline-block;padding:1px 8px;border-radius:8px;font-size:11px;font-weight:700;background:#fff3cd;color:#856404;border:1px solid #ffc107}
.ts-pills{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0}
.ts-pill{display:inline-block;font-size:11px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f0f0ff);border:1px solid #c8b8ff;font-family:ui-monospace,monospace;color:#5a3fbf}
.ts-pill-tag{background:#e8f4ff;border-color:#99ccff;color:#004080}
.ts-pill-host{background:#e8ffe8;border-color:#99dd99;color:#005000}
.ts-rule{border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 12px;margin:5px 0;background:var(--bg-2,#f6f8fa);font-size:12px;font-family:ui-monospace,monospace}
.ts-rule-action-accept{color:#1a7f37;font-weight:700}
.ts-rule-arrow{color:var(--fg-2,#888);margin:0 6px}
.ts-rule-dst{color:#0550ae}
.ts-rule-src{color:#6f42c1}
.ts-rule-port{color:#888;font-size:11px}
`;

function parseHuJson(text) {
  if (!text) return null;
  try {
    // Strip // line comments and trailing commas
    const stripped = text
      .replace(/\/\/[^\n]*/g, '')
      .replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(stripped);
  } catch {
    return null;
  }
}

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="ts-kv"><span class="ts-kv-k">${esc(label)}</span><span class="ts-kv-v">${esc(value)}</span></div>`;
}

function pills(items, cls = '') {
  if (!items || !items.length) return '';
  return `<div class="ts-pills">${items.map((i) => `<span class="ts-pill ${cls}">${esc(i)}</span>`).join('')}</div>`;
}

function renderAclRule(rule, idx) {
  const action = rule.action || '';
  const src = Array.isArray(rule.src) ? rule.src.join(', ') : (rule.src || '');
  const dst = Array.isArray(rule.dst) ? rule.dst.join(', ') : (rule.dst || '');
  const proto = rule.proto ? esc(rule.proto) : '';
  const actionCls = action === 'accept' ? 'ts-rule-action-accept' : '';
  return `<div class="ts-rule">
    <span class="${actionCls}">${esc(action)}</span>
    <span class="ts-rule-arrow">·</span>
    <span class="ts-rule-src">${esc(src)}</span>
    <span class="ts-rule-arrow">→</span>
    <span class="ts-rule-dst">${esc(dst)}</span>
    ${proto ? `<span class="ts-rule-port">(${proto})</span>` : ''}
  </div>`;
}

export function render(intake) {
  let cfg = intake.parsed;
  if (!cfg && intake.text) {
    cfg = parseHuJson(intake.text);
  }
  cfg = cfg || {};

  const acls = Array.isArray(cfg.acls) ? cfg.acls : [];
  const groups = cfg.groups || {};
  const hosts = cfg.hosts || {};
  const tagOwners = cfg.tagOwners || {};
  const ssh = Array.isArray(cfg.ssh) ? cfg.ssh : [];
  const tests = Array.isArray(cfg.tests) ? cfg.tests : [];
  const grants = Array.isArray(cfg.grants) ? cfg.grants : [];

  const hasAccept = acls.some((r) => r.action === 'accept');
  const groupNames = Object.keys(groups);
  const hostNames = Object.keys(hosts);
  const tagNames = Object.keys(tagOwners);

  const statusBadge = hasAccept
    ? `<span class="ts-status-ok">accept rules present</span>`
    : (acls.length ? `<span class="ts-status-warn">no accept rules</span>` : '');

  const subParts = [
    acls.length ? `${acls.length} rule${acls.length !== 1 ? 's' : ''}` : '',
    groupNames.length ? `${groupNames.length} group${groupNames.length !== 1 ? 's' : ''}` : '',
    hostNames.length ? `${hostNames.length} host${hostNames.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);

  // Summary section
  const summaryRows = [
    kv('ACL rules', String(acls.length)),
    ssh.length ? kv('SSH rules', String(ssh.length)) : '',
    tests.length ? kv('Policy tests', String(tests.length)) : '',
    grants.length ? kv('Grants', String(grants.length)) : '',
    groupNames.length ? kv('Groups', String(groupNames.length)) : '',
    hostNames.length ? kv('Hosts/aliases', String(hostNames.length)) : '',
    tagNames.length ? kv('Tag owners', String(tagNames.length)) : '',
  ].filter(Boolean).join('');

  // Groups section
  const groupsHtml = groupNames.length
    ? `<div class="ts-sec"><h3>Groups</h3>${groupNames.map((g) => {
        const members = Array.isArray(groups[g]) ? groups[g] : [];
        return `<div class="ts-card">
          <div class="ts-kv"><span class="ts-kv-k">${esc(g)}</span><span style="font-size:11px;color:var(--fg-2,#888)">${members.length} member${members.length !== 1 ? 's' : ''}</span></div>
          ${pills(members)}
        </div>`;
      }).join('')}</div>`
    : '';

  // Hosts section
  const hostsHtml = hostNames.length
    ? `<div class="ts-sec"><h3>Hosts / Aliases</h3><div class="ts-card">${hostNames.map((h) => kv(h, hosts[h])).join('')}</div></div>`
    : '';

  // Tag owners section
  const tagOwnersHtml = tagNames.length
    ? `<div class="ts-sec"><h3>Tag Owners</h3>${tagNames.map((t) => {
        const owners = Array.isArray(tagOwners[t]) ? tagOwners[t] : [];
        return `<div class="ts-card">
          <div class="ts-kv"><span class="ts-kv-k"><span class="ts-pill ts-pill-tag" style="margin:0">${esc(t)}</span></span><span style="font-size:11px;color:var(--fg-2,#888)">${owners.length} owner${owners.length !== 1 ? 's' : ''}</span></div>
          ${pills(owners)}
        </div>`;
      }).join('')}</div>`
    : '';

  // ACL rules section
  const aclsHtml = acls.length
    ? `<div class="ts-sec"><h3>ACL Rules ${statusBadge}</h3>${acls.map((r, i) => renderAclRule(r, i)).join('')}</div>`
    : `<div class="ts-sec"><h3>ACL Rules</h3><p style="margin:0;font-size:12px;color:var(--fg-2,#888)">No ACL rules defined.</p></div>`;

  // SSH rules section
  const sshHtml = ssh.length
    ? `<div class="ts-sec"><h3>SSH Rules</h3>${ssh.map((r) => {
        const action = r.action || '';
        const src = Array.isArray(r.src) ? r.src.join(', ') : (r.src || '');
        const dst = Array.isArray(r.dst) ? r.dst.join(', ') : (r.dst || '');
        const users = Array.isArray(r.users) ? r.users.join(', ') : (r.users || '');
        return `<div class="ts-rule">
          <span class="ts-rule-action-accept">${esc(action)}</span>
          <span class="ts-rule-arrow">·</span>
          <span class="ts-rule-src">${esc(src)}</span>
          <span class="ts-rule-arrow">→</span>
          <span class="ts-rule-dst">${esc(dst)}</span>
          ${users ? `<span class="ts-rule-port">users: ${esc(users)}</span>` : ''}
        </div>`;
      }).join('')}</div>`
    : '';

  const host = document.createElement('div');
  host.className = 'tailscale-acl-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="ts-title"><span class="ts-badge">Tailscale</span>ACL Policy</div>
<div class="ts-sub">${esc(subParts.join(' · ') || 'Tailscale network access control policy')}</div>
${summaryRows ? `<div class="ts-sec"><h3>Summary</h3><div class="ts-card">${summaryRows}</div></div>` : ''}
${groupsHtml}
${hostsHtml}
${tagOwnersHtml}
${aclsHtml}
${sshHtml}`;

  return { parentNode: host };
}
