const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.debctrl-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.debctrl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#b71c1c;color:#fff;vertical-align:middle;margin-right:8px;}
.debctrl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.debctrl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.debctrl-format-badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;margin-left:8px;vertical-align:middle;}
.debctrl-format-source{background:#e3f2fd;color:#1565c0;border:1px solid #90caf9;}
.debctrl-format-binary{background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7;}
.debctrl-section{margin:16px 0;}
.debctrl-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.debctrl-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.debctrl-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.debctrl-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-size:13px;}
.debctrl-table tr:last-child td{border-bottom:none;}
.debctrl-mono{font-family:ui-monospace,monospace;font-size:12px;}
.debctrl-dep{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:500;background:var(--bg-2,#eef2f7);border:1px solid var(--border,#d0d7de);margin:2px;}
.debctrl-desc{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;font-size:13px;line-height:1.6;white-space:pre-wrap;margin-top:8px;}
`;

function parseControl(text) {
  const lines = (text || '').split(/\r?\n/);
  const fields = {};
  let currentKey = null;

  for (const line of lines) {
    if (/^\s+/.test(line) && currentKey) {
      // Continuation line
      fields[currentKey] = (fields[currentKey] || '') + '\n' + line.trim();
    } else {
      const m = line.match(/^([A-Za-z][A-Za-z0-9-]*):\s*(.*)$/);
      if (m) {
        currentKey = m[1].toLowerCase().replace(/-/g, '_');
        fields[currentKey] = m[2].trim();
      } else {
        currentKey = null;
      }
    }
  }

  // Determine source vs binary
  const isSource = !!fields.source;
  const name = fields.source || fields.package || '';

  // Parse depends list
  const depsRaw = fields.depends || fields.build_depends || '';
  const deps = depsRaw ? depsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];

  return { fields, isSource, name, deps };
}

export function render(intake) {
  const { fields, isSource, name, deps } = parseControl(intake.text || '');

  const host = document.createElement('div');
  host.className = 'debctrl-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'debctrl-title';
  const formatClass = isSource ? 'debctrl-format-source' : 'debctrl-format-binary';
  const formatLabel = isSource ? 'Source' : 'Binary';
  title.innerHTML = `<span class="debctrl-badge">Debian Control</span>${esc(name || 'Package')}<span class="debctrl-format-badge ${formatClass}">${formatLabel}</span>`;
  host.appendChild(title);

  const subParts = [];
  if (fields.version) subParts.push(`v${fields.version}`);
  if (fields.architecture) subParts.push(fields.architecture);
  if (fields.maintainer) subParts.push(fields.maintainer);

  const sub = document.createElement('div');
  sub.className = 'debctrl-sub';
  sub.textContent = subParts.join(' · ') || 'Debian Package Control';
  host.appendChild(sub);

  // Metadata table
  const sec = document.createElement('div');
  sec.className = 'debctrl-section';
  const h3 = document.createElement('h3');
  h3.textContent = isSource ? 'Source Package' : 'Binary Package';
  sec.appendChild(h3);

  const metaRows = isSource
    ? [
        ['Source', fields.source],
        ['Standards-Version', fields.standards_version],
        ['Maintainer', fields.maintainer],
        ['Homepage', fields.homepage],
        ['Priority', fields.priority],
        ['Section', fields.section],
      ]
    : [
        ['Package', fields.package],
        ['Version', fields.version],
        ['Architecture', fields.architecture],
        ['Priority', fields.priority],
        ['Section', fields.section],
        ['Maintainer', fields.maintainer],
        ['Installed-Size', fields.installed_size ? `${fields.installed_size} KB` : null],
        ['Homepage', fields.homepage],
      ];

  const table = document.createElement('table');
  table.className = 'debctrl-table';
  const tbody = document.createElement('tbody');
  for (const [label, value] of metaRows) {
    if (!value) continue;
    const tr = document.createElement('tr');
    const tdL = document.createElement('td');
    tdL.style.cssText = 'font-weight:600;width:150px;color:var(--fg-2,#666);';
    tdL.textContent = label;
    const tdV = document.createElement('td');
    tdV.textContent = value;
    tr.appendChild(tdL);
    tr.appendChild(tdV);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  sec.appendChild(table);
  host.appendChild(sec);

  // Dependencies
  const depsField = isSource ? 'Build-Depends' : 'Depends';
  const depsData = isSource ? (fields.build_depends || '') : (fields.depends || '');
  if (depsData) {
    const depSec = document.createElement('div');
    depSec.className = 'debctrl-section';
    const depH3 = document.createElement('h3');
    depH3.textContent = depsField;
    depSec.appendChild(depH3);
    const depsDiv = document.createElement('div');
    const depList = depsData.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 8);
    for (const dep of depList) {
      const span = document.createElement('span');
      span.className = 'debctrl-dep debctrl-mono';
      span.textContent = dep;
      depsDiv.appendChild(span);
    }
    const total = depsData.split(',').filter((s) => s.trim()).length;
    if (total > 8) {
      const more = document.createElement('span');
      more.style.cssText = 'font-size:12px;color:var(--fg-2,#888);margin-left:4px;';
      more.textContent = `+${total - 8} more`;
      depsDiv.appendChild(more);
    }
    depSec.appendChild(depsDiv);
    host.appendChild(depSec);
  }

  // Description
  if (fields.description) {
    const descSec = document.createElement('div');
    descSec.className = 'debctrl-section';
    const descH3 = document.createElement('h3');
    descH3.textContent = 'Description';
    descSec.appendChild(descH3);
    const descDiv = document.createElement('div');
    descDiv.className = 'debctrl-desc';
    descDiv.textContent = fields.description;
    descSec.appendChild(descDiv);
    host.appendChild(descSec);
  }

  return { parentNode: host };
}
