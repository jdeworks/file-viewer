const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.registriescfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.registriescfg-doc .badge-reg{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#892CA0;color:#fff;vertical-align:middle;margin-right:8px;}
.registriescfg-doc .reg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.registriescfg-doc .reg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.registriescfg-doc .reg-sec{margin:14px 0;}
.registriescfg-doc .reg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.registriescfg-doc .reg-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.registriescfg-doc .reg-pill{display:inline-flex;align-items:center;gap:5px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.registriescfg-doc .reg-pill-warn{background:#fff8e1;border-color:#ffe082;color:#7c5800;}
.registriescfg-doc .reg-pill-block{background:#fde8e8;border-color:#f5c6c6;color:#b91c1c;}
.registriescfg-doc .reg-table{width:100%;border-collapse:collapse;font-size:13px;margin:4px 0;}
.registriescfg-doc .reg-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.registriescfg-doc .reg-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px;}
.registriescfg-doc .reg-flag{display:inline-block;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:700;margin-left:4px;}
.registriescfg-doc .reg-flag-warn{background:#fff8e1;color:#7c5800;border:1px solid #ffe082;}
.registriescfg-doc .reg-flag-block{background:#fde8e8;color:#b91c1c;border:1px solid #f5c6c6;}
.registriescfg-doc .reg-flag-ok{background:#e6f4ea;color:#1a7f37;border:1px solid #b4e0be;}
.registriescfg-doc .reg-mirrors{font-size:11px;color:var(--fg-2,#888);margin-top:1px;}
`;

function arrOf(v) {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') return [v];
  return [];
}

export function render(intake) {
  const cfg = intake.parsed || {};

  // Detect format: new (podman v4+) uses [[registry]] array, old uses [registries.search] etc.
  const registries = Array.isArray(cfg.registry) ? cfg.registry : [];
  const oldSearch = arrOf((cfg.registries || {}).search && (cfg.registries.search.registries || cfg.registries.search));
  const oldInsecure = arrOf((cfg.registries || {}).insecure && (cfg.registries.insecure.registries || cfg.registries.insecure));
  const oldBlock = arrOf((cfg.registries || {}).block && (cfg.registries.block.registries || cfg.registries.block));

  const isNewFormat = registries.length > 0;

  // Summary counts
  const totalReg = isNewFormat ? registries.length : (oldSearch.length + oldInsecure.length);
  const blockedCount = isNewFormat ? registries.filter((r) => r.blocked).length : oldBlock.length;
  const insecureCount = isNewFormat ? registries.filter((r) => r.insecure).length : oldInsecure.length;
  const mirrorsCount = isNewFormat ? registries.filter((r) => Array.isArray(r.mirror) && r.mirror.length > 0).length : 0;

  // Search list section
  let searchHtml = '';
  if (isNewFormat) {
    const ordered = registries.filter((r) => !r.blocked);
    if (ordered.length) {
      searchHtml = `<div class="reg-sec"><h3>Registries (${ordered.length})</h3><div class="reg-pills">${ordered.map((r) => {
        const loc = r.location || r.prefix || '—';
        const flags = (r.insecure ? `<span class="reg-flag reg-flag-warn">insecure</span>` : '') + (r.blocked ? `<span class="reg-flag reg-flag-block">blocked</span>` : '');
        return `<span class="reg-pill">${esc(loc)}${flags}</span>`;
      }).join('')}</div></div>`;
    }
  } else if (oldSearch.length) {
    searchHtml = `<div class="reg-sec"><h3>Search registries (${oldSearch.length})</h3><div class="reg-pills">${oldSearch.map((r) => `<span class="reg-pill">${esc(r)}</span>`).join('')}</div></div>`;
  }

  // Registry table (new format only — rich info)
  let tableHtml = '';
  if (isNewFormat && registries.length) {
    const rows = registries.map((r) => {
      const prefix = r.prefix || r.location || '—';
      const location = r.location || '—';
      const mirrors = Array.isArray(r.mirror) ? r.mirror : [];
      const mirrorText = mirrors.length ? `${mirrors.length} mirror${mirrors.length !== 1 ? 's' : ''}` : '—';
      const mirrorDetail = mirrors.map((m) => esc(m.location || m)).join(', ');
      const insFlag = r.insecure ? `<span class="reg-flag reg-flag-warn">insecure</span>` : `<span class="reg-flag reg-flag-ok">secure</span>`;
      const blFlag = r.blocked ? `<span class="reg-flag reg-flag-block">blocked</span>` : '';
      return `<tr>
        <td>${esc(prefix)}${prefix !== location ? `<div class="reg-mirrors">${esc(location)}</div>` : ''}</td>
        <td>${mirrorText}${mirrorDetail ? `<div class="reg-mirrors">${mirrorDetail}</div>` : ''}</td>
        <td>${insFlag}${blFlag}</td>
      </tr>`;
    }).join('');
    tableHtml = `<div class="reg-sec"><h3>Registry details</h3><table class="reg-table">
      <thead><tr><th>Prefix / Location</th><th>Mirrors</th><th>Flags</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  }

  // Insecure section (old format)
  let insecureHtml = '';
  if (!isNewFormat && oldInsecure.length) {
    insecureHtml = `<div class="reg-sec"><h3>Insecure registries (${oldInsecure.length})</h3><div class="reg-pills">${oldInsecure.map((r) => `<span class="reg-pill reg-pill-warn">${esc(r)}</span>`).join('')}</div></div>`;
  }

  // Blocked section
  let blockedHtml = '';
  const blockedList = isNewFormat ? registries.filter((r) => r.blocked).map((r) => r.prefix || r.location || '?') : oldBlock;
  if (blockedList.length) {
    blockedHtml = `<div class="reg-sec"><h3>Blocked registries (${blockedList.length})</h3><div class="reg-pills">${blockedList.map((r) => `<span class="reg-pill reg-pill-block">${esc(r)}</span>`).join('')}</div></div>`;
  }

  // Mirrors section (old format — new format inlines mirrors in table)
  let mirrorsHtml = '';
  if (isNewFormat && mirrorsCount > 0) {
    const withMirrors = registries.filter((r) => Array.isArray(r.mirror) && r.mirror.length > 0);
    const items = withMirrors.map((r) => {
      const prefix = r.prefix || r.location || '?';
      const mlist = r.mirror.map((m) => esc(m.location || m)).join(', ');
      return `<li><span style="font-weight:600">${esc(prefix)}</span> → ${mlist}</li>`;
    }).join('');
    mirrorsHtml = `<div class="reg-sec"><h3>Mirrors (${withMirrors.length} ${withMirrors.length === 1 ? 'registry' : 'registries'})</h3><ul style="margin:4px 0;padding-left:18px;font:12px/1.6 ui-monospace,monospace;">${items}</ul></div>`;
  }

  const subParts = [
    totalReg ? `${totalReg} ${totalReg === 1 ? 'registry' : 'registries'}` : '',
    insecureCount ? `${insecureCount} insecure` : '',
    blockedCount ? `${blockedCount} blocked` : '',
    mirrorsCount ? `${mirrorsCount} with mirrors` : '',
    isNewFormat ? 'v4+ format' : 'legacy format',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'registriescfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="reg-title"><span class="badge-reg">Podman</span>Container Registries</div>
<div class="reg-sub">${esc(subParts.join(' · '))}</div>
${searchHtml}
${tableHtml}
${insecureHtml}
${blockedHtml}
${mirrorsHtml}`;

  return { parentNode: host };
}
