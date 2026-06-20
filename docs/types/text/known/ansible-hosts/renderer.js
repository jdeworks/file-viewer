const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ansinv-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-ansinv{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#EE0000;color:#fff;vertical-align:middle;margin-right:8px;}
.ansinv-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ansinv-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ansinv-group{margin:10px 0;border:1px solid var(--border,#e0e0e0);border-radius:6px;overflow:hidden;}
.ansinv-group-hd{padding:6px 12px;background:var(--bg-2,#f6f8fa);font-size:13px;font-weight:600;font-family:ui-monospace,monospace;display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none;}
.ansinv-group-hd:hover{background:var(--bg-3,#eaeef2);}
.ansinv-group-count{font-size:11px;color:var(--fg-2,#888);font-weight:400;}
.ansinv-group-body{padding:0;}
.ansinv-host-row{padding:5px 12px;border-top:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:12px;align-items:baseline;}
.ansinv-host-name{color:var(--fg,#24292f);font-weight:600;min-width:140px;}
.ansinv-host-vars{color:var(--fg-2,#888);word-break:break-all;}
.ansinv-children-note{padding:5px 12px;border-top:1px solid var(--border,#e0e0e0);font-size:12px;color:var(--fg-2,#888);font-style:italic;}
.ansinv-arrow{font-size:10px;color:var(--fg-2,#888);transition:transform .15s;}
.ansinv-arrow.open{transform:rotate(90deg);}
`;

function parseInventory(text) {
  // Returns: { groups: Map<name, { hosts: [{name, vars}], children: string[], isChildren: bool }> }
  const groups = new Map();
  let curGroup = null;
  let isChildrenSection = false;

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;

    const secMatch = line.match(/^\[([^\]]+)\]/);
    if (secMatch) {
      const secName = secMatch[1].trim();
      isChildrenSection = secName.endsWith(':children') || secName.endsWith(':vars');
      curGroup = secName;
      if (!groups.has(secName)) {
        groups.set(secName, { hosts: [], children: [], isChildren: isChildrenSection });
      }
      continue;
    }

    if (!curGroup) {
      // Ungrouped host
      if (!groups.has('ungrouped')) groups.set('ungrouped', { hosts: [], children: [], isChildren: false });
      const parts = line.split(/\s+/);
      const hostname = parts[0];
      const vars = parts.slice(1).join(' ');
      groups.get('ungrouped').hosts.push({ name: hostname, vars });
      continue;
    }

    const entry = groups.get(curGroup);
    if (isChildrenSection) {
      entry.children.push(line);
    } else {
      const parts = line.split(/\s+/);
      const hostname = parts[0];
      const vars = parts.slice(1).join(' ');
      entry.hosts.push({ name: hostname, vars });
    }
  }

  return groups;
}

export function render(intake) {
  const text = intake.text || '';
  const groups = parseInventory(text);

  // Count total unique hosts (skip :children and :vars meta-sections)
  const allHosts = new Set();
  for (const [, grp] of groups) {
    if (!grp.isChildren) {
      for (const h of grp.hosts) allHosts.add(h.name);
    }
  }
  const totalHosts = allHosts.size;
  const totalGroups = [...groups.keys()].filter(k => !k.endsWith(':children') && !k.endsWith(':vars')).length;

  let groupsHtml = '';
  let idx = 0;
  for (const [name, grp] of groups) {
    const isOpen = idx === 0;
    const bodyStyle = isOpen ? '' : ' style="display:none"';
    const arrowClass = isOpen ? ' open' : '';

    let bodyContent = '';
    if (grp.isChildren) {
      if (grp.children.length) {
        bodyContent = grp.children.map(c =>
          `<div class="ansinv-children-note">${esc(c)}</div>`
        ).join('');
      } else {
        bodyContent = '<div class="ansinv-children-note">No child groups listed.</div>';
      }
    } else {
      const MAX_SHOWN = 20;
      const shown = grp.hosts.slice(0, MAX_SHOWN);
      const extra = grp.hosts.length - shown.length;
      bodyContent = shown.map(h =>
        `<div class="ansinv-host-row"><span class="ansinv-host-name">${esc(h.name)}</span>${h.vars ? `<span class="ansinv-host-vars">${esc(h.vars)}</span>` : ''}</div>`
      ).join('');
      if (extra > 0) {
        bodyContent += `<div class="ansinv-children-note">… and ${extra} more host${extra !== 1 ? 's' : ''}</div>`;
      }
      if (!grp.hosts.length) {
        bodyContent = '<div class="ansinv-children-note">No hosts listed.</div>';
      }
    }

    const countLabel = grp.isChildren
      ? `${grp.children.length} child${grp.children.length !== 1 ? 'ren' : ''}`
      : `${grp.hosts.length} host${grp.hosts.length !== 1 ? 's' : ''}`;

    groupsHtml += `<div class="ansinv-group">
  <div class="ansinv-group-hd" onclick="(function(el){var body=el.nextElementSibling;var arr=el.querySelector('.ansinv-arrow');var open=body.style.display==='none';body.style.display=open?'':'none';arr.classList.toggle('open',open);})(this)">
    <span>[${esc(name)}]</span>
    <span><span class="ansinv-group-count">${countLabel}</span>&nbsp;<span class="ansinv-arrow${arrowClass}">▶</span></span>
  </div>
  <div class="ansinv-group-body"${bodyStyle}>${bodyContent}</div>
</div>`;
    idx++;
  }

  if (!groupsHtml) {
    groupsHtml = '<p style="color:var(--fg-2,#888);font-size:13px;">No groups or hosts found.</p>';
  }

  const host = document.createElement('div');
  host.className = 'ansinv-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="ansinv-title"><span class="badge-ansinv">Ansible</span>Inventory</div>
<div class="ansinv-sub">${totalGroups} group${totalGroups !== 1 ? 's' : ''} · ${totalHosts} host${totalHosts !== 1 ? 's' : ''}</div>
${groupsHtml}`;
  return { parentNode: host };
}
