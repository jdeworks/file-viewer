// Conda environment.yml renderer: shows name, channels, python version, dep counts, pip sub-list.
import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const chip = (text, cls = '') => `<span class="conda-chip${cls ? ' ' + cls : ''}">${esc(text)}</span>`;

const CSS = `
.conda-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-conda{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#43a047;color:#fff;vertical-align:middle;margin-right:8px;}
.conda-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.conda-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.conda-env-name{display:inline-block;font:15px/1.3 ui-monospace,monospace;font-weight:700;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#d0d7de);border-radius:6px;padding:4px 12px;margin:0 0 14px;}
.conda-sec{margin:14px 0 8px;}
.conda-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;font-weight:600;}
.conda-chips{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 12px;}
.conda-chip{display:inline-block;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:500;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#d0d7de);color:var(--fg,#24292f);}
.conda-chip.ch-forge{background:#e8f5e9;border-color:#a5d6a7;color:#1b5e20;}
.conda-chip.ch-defaults{background:#e3f2fd;border-color:#90caf9;color:#0d47a1;}
.conda-chip.py-ver{background:#fff3e0;border-color:#ffcc80;color:#e65100;font-family:ui-monospace,monospace;font-weight:700;}
.conda-list{list-style:none;margin:0;padding:0;}
.conda-list li{display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-size:13px;}
.conda-list li:last-child{border-bottom:none;}
.conda-pkg{font:13px/1.4 ui-monospace,monospace;}
.conda-ver{font-size:11px;color:var(--fg-2,#888);font-family:ui-monospace,monospace;}
.conda-stat{font-size:13px;color:var(--fg-2,#888);}
.conda-pip-hdr{font-size:12px;font-weight:600;margin:10px 0 4px;color:var(--fg-2,#888);}
.conda-pip-list{list-style:none;margin:0;padding:0 0 0 12px;}
.conda-pip-list li{font:12px/1.8 ui-monospace,monospace;color:var(--fg,#24292f);}
`;

function parseDeps(depsArr) {
  const direct = [];
  const pip = [];
  for (const entry of (depsArr || [])) {
    if (entry && typeof entry === 'object' && entry.pip) {
      for (const p of (entry.pip || [])) pip.push(String(p));
    } else if (typeof entry === 'string') {
      direct.push(entry);
    }
  }
  return { direct, pip };
}

function extractPython(direct) {
  for (const d of direct) {
    const m = /^python([=<>!~\s].+)?$/.exec(d.trim());
    if (m) return d.trim();
  }
  return null;
}

function channelClass(ch) {
  if (ch === 'conda-forge') return 'ch-forge';
  if (ch === 'defaults') return 'ch-defaults';
  return '';
}

export async function render(intake) {
  let doc = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    doc = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch {
    doc = {};
  }

  const envName = doc.name || null;
  const channels = Array.isArray(doc.channels) ? doc.channels.map(String) : [];
  const { direct, pip } = parseDeps(doc.dependencies);
  const pythonEntry = extractPython(direct);
  const nonPythonDeps = direct.filter((d) => !/^python([=<>!~\s]|$)/.test(d.trim()));

  const channelChips = channels.length
    ? channels.map((ch) => chip(ch, channelClass(ch))).join('')
    : '<span class="conda-stat">none specified</span>';

  const depRows = nonPythonDeps.map((d) => {
    const m = /^([A-Za-z0-9_.\-]+)\s*(.*)/.exec(d.trim());
    const name = m ? m[1] : d.trim();
    const ver = m && m[2] ? m[2].trim() : '';
    return `<li><span class="conda-pkg">${esc(name)}</span>${ver ? `<span class="conda-ver">${esc(ver)}</span>` : ''}</li>`;
  }).join('');

  const pipSection = pip.length
    ? `<div class="conda-pip-hdr">pip packages (${pip.length})</div>
<ul class="conda-pip-list">${pip.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`
    : '';

  const host = document.createElement('div');
  host.className = 'conda-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="conda-title"><span class="badge-conda">Conda</span>environment.yml</div>
<div class="conda-sub">Conda environment specification</div>
${envName ? `<div class="conda-env-name">${esc(envName)}</div>` : ''}
${pythonEntry ? `<div class="conda-chips"><span class="conda-chip py-ver">${esc(pythonEntry)}</span></div>` : ''}
<div class="conda-sec"><h3>Channels</h3><div class="conda-chips">${channelChips}</div></div>
<div class="conda-sec">
  <h3>Dependencies${nonPythonDeps.length ? ` <span style="font-weight:400;text-transform:none;letter-spacing:0">(${nonPythonDeps.length} conda${pip.length ? ` + ${pip.length} pip` : ''})</span>` : ''}</h3>
  ${nonPythonDeps.length
    ? `<ul class="conda-list">${depRows}</ul>`
    : '<div class="conda-stat">No conda packages.</div>'}
  ${pipSection}
</div>`;

  return { parentNode: host };
}
