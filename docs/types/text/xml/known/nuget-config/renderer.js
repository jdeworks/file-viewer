// Enhanced NuGet.Config view. Rendered in the parent pane (trusted DOM).
// Parses XML with the browser's built-in DOMParser. Shows package sources, active source,
// fallback folders, and clear-sources flag.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nu-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.nu-head{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.badge-nu{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#004880;color:#fff;vertical-align:middle;}
.nu-title{font-size:18px;font-weight:700;margin:0;}
.nu-sec{margin-top:16px;}
.nu-sec h3{font-size:13px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px;}
.nu-source-list{list-style:none;margin:0;padding:0;}
.nu-source-item{display:flex;flex-direction:column;padding:7px 0;border-bottom:1px solid var(--border,#e8eaed);}
.nu-source-item:last-child{border-bottom:none;}
.nu-source-key{font-family:ui-monospace,monospace;font-weight:700;font-size:13px;color:#004880;}
.nu-source-url{font-size:12px;color:var(--fg-2,#888);font-family:ui-monospace,monospace;word-break:break-all;}
.nu-tag{display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:600;}
.nu-tag.active{background:#e8f5e9;color:#276749;border:1px solid #9ae6b4;}
.nu-tag.clear{background:#fff3cd;color:#7a5c00;border:1px solid #ffe082;}
.nu-tag.disabled{background:#f7f7f7;color:#888;border:1px solid #ddd;}
.nu-fallback-list{list-style:none;margin:0;padding:0;}
.nu-fallback-item{font-size:12px;font-family:ui-monospace,monospace;color:var(--fg,#24292f);padding:3px 0;}
.nu-kv-list{list-style:none;margin:0;padding:0;}
.nu-kv-item{display:flex;gap:10px;font-size:12px;padding:3px 0;}
.nu-kv-key{font-family:ui-monospace,monospace;font-weight:600;min-width:140px;flex-shrink:0;}
.nu-kv-val{font-family:ui-monospace,monospace;color:var(--fg-2,#888);}
.nu-err{color:#c62828;font-size:13px;}
`;

// Get all <add key="..." value="..." /> children of a section
function getAdds(doc, sectionTag) {
  const sections = doc.getElementsByTagName(sectionTag);
  const results = [];
  for (const sec of sections) {
    for (const child of sec.getElementsByTagName('add')) {
      results.push({
        key: child.getAttribute('key') || child.getAttribute('Key') || '',
        value: child.getAttribute('value') || child.getAttribute('Value') || '',
        protocolVersion: child.getAttribute('protocolVersion') || null,
      });
    }
  }
  return results;
}

// Get all <clear /> indicators
function hasClear(doc, sectionTag) {
  const sections = doc.getElementsByTagName(sectionTag);
  for (const sec of sections) {
    if (sec.getElementsByTagName('clear').length > 0) return true;
  }
  return false;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const host = document.createElement('div');
  host.className = 'nu-doc';

  let doc = null;
  try { doc = new DOMParser().parseFromString(text, 'text/xml'); } catch (e) {
    host.innerHTML = `<style>${CSS}</style><p class="nu-err">Failed to parse XML: ${esc(e.message)}</p>`;
    return { parentNode: host };
  }

  if (doc.getElementsByTagName('parsererror').length) {
    host.innerHTML = `<style>${CSS}</style><p class="nu-err">Could not parse NuGet.Config as XML.</p>`;
    return { parentNode: host };
  }

  const sources = getAdds(doc, 'packageSources');
  const disabledSources = getAdds(doc, 'disabledPackageSources');
  const disabledSet = new Set(disabledSources.filter((d) => d.value.toLowerCase() === 'true').map((d) => d.key.toLowerCase()));
  const activeSource = getAdds(doc, 'activePackageSource');
  const fallbackFolders = getAdds(doc, 'fallbackPackageFolders');
  const clearSources = hasClear(doc, 'packageSources');
  const configOptions = getAdds(doc, 'config');

  const sourceItems = sources.map((s) => {
    const isDisabled = disabledSet.has(s.key.toLowerCase());
    const isActive = activeSource.some((a) => a.key.toLowerCase() === s.key.toLowerCase());
    const tags = [
      isActive ? '<span class="nu-tag active">active</span>' : '',
      isDisabled ? '<span class="nu-tag disabled">disabled</span>' : '',
      s.protocolVersion ? `<span class="nu-tag" style="background:#f0f4ff;color:#3b4ecc;border:1px solid #c3cff9;">v${esc(s.protocolVersion)}</span>` : '',
    ].filter(Boolean).join(' ');
    return `<li class="nu-source-item">
      <div style="display:flex;align-items:center;gap:8px;"><span class="nu-source-key">${esc(s.key)}</span>${tags}</div>
      <div class="nu-source-url">${esc(s.value)}</div>
    </li>`;
  }).join('');

  const fallbackItems = fallbackFolders.map((f) =>
    `<li class="nu-fallback-item">${esc(f.value)}</li>`
  ).join('');

  const configItems = configOptions.map((c) =>
    `<li class="nu-kv-item"><span class="nu-kv-key">${esc(c.key)}</span><span class="nu-kv-val">${esc(c.value)}</span></li>`
  ).join('');

  host.innerHTML = `<style>${CSS}</style>
<div class="nu-head">
  <span class="badge-nu">NuGet</span>
  <div class="nu-title">NuGet.Config</div>
</div>
${clearSources ? '<div style="margin-bottom:10px;"><span class="nu-tag clear">clears inherited sources</span></div>' : ''}
${sources.length ? `<div class="nu-sec"><h3>Package Sources <span style="font-size:11px;font-weight:400;">(${sources.length})</span></h3><ul class="nu-source-list">${sourceItems}</ul></div>` : '<p style="color:var(--fg-2,#888);font-size:13px;">No package sources defined.</p>'}
${fallbackFolders.length ? `<div class="nu-sec"><h3>Fallback Folders</h3><ul class="nu-fallback-list">${fallbackItems}</ul></div>` : ''}
${configOptions.length ? `<div class="nu-sec"><h3>Config Options</h3><ul class="nu-kv-list">${configItems}</ul></div>` : ''}`;

  return { parentNode: host };
}
