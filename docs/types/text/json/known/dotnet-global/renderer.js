// Enhanced global.json view. Rendered in the parent pane (trusted DOM).
// Shows SDK version, roll-forward policy, allowPrerelease, and MSBuild SDK mappings.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ROLL_FORWARD_DOCS = {
  patch: 'Use the specified version; patch-level updates only if exact not found',
  feature: 'Use the highest patch of the specified feature band',
  minor: 'Use the specified minor version; bump minor if not found',
  major: 'Use the specified version; bump major if not found',
  latestPatch: 'Use the latest installed patch of the specified minor',
  latestFeature: 'Use the latest installed feature band',
  latestMinor: 'Use the latest installed minor of the specified major',
  latestMajor: 'Use the latest installed SDK overall',
  disable: 'No roll-forward; exact version required',
};

const CSS = `
.globaljson-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.dn-head{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.badge-dn{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#512bd4;color:#fff;vertical-align:middle;}
.dn-title{font-size:18px;font-weight:700;margin:0;}
.dn-grid{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:12px 0;align-items:start;}
.dn-key{font-size:12px;font-weight:600;color:var(--fg-2,#888);white-space:nowrap;padding-top:2px;}
.dn-val{font-family:ui-monospace,monospace;font-size:14px;font-weight:700;}
.dn-doc-note{font-size:11px;color:var(--fg-2,#888);margin-top:2px;}
.dn-sec{margin-top:16px;}
.dn-sec h3{font-size:13px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px;}
.dn-sdk-list{list-style:none;margin:0;padding:0;}
.dn-sdk-item{display:flex;gap:10px;padding:4px 0;border-bottom:1px solid var(--border,#e8eaed);font-size:13px;}
.dn-sdk-name{font-family:ui-monospace,monospace;font-weight:600;color:#512bd4;}
.dn-sdk-ver{font-family:ui-monospace,monospace;color:var(--fg,#24292f);}
.dn-tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:#f0ebff;color:#512bd4;border:1px solid #c9b8ff;}
.dn-tag.warn{background:#fff3cd;color:#7a5c00;border-color:#ffe082;}
.dn-err{color:#c62828;font-size:13px;}
`;

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'globaljson-doc';

  let cfg;
  try { cfg = intake.parsed || JSON.parse(intake.text || '{}'); }
  catch (e) {
    host.innerHTML = `<style>${CSS}</style><p class="dn-err">Invalid JSON: ${esc(e.message)}</p>`;
    return { parentNode: host };
  }

  const sdk = cfg.sdk && typeof cfg.sdk === 'object' ? cfg.sdk : {};
  const version = sdk.version || null;
  const rollForward = sdk.rollForward || null;
  const allowPrerelease = sdk.allowPrerelease;
  const msbuildSdks = cfg['msbuild-sdks'] && typeof cfg['msbuild-sdks'] === 'object' ? cfg['msbuild-sdks'] : null;

  const gridRows = [];
  if (version) {
    gridRows.push(`<div class="dn-key">SDK version</div><div><span class="dn-val">${esc(version)}</span></div>`);
  }
  if (rollForward) {
    const doc = ROLL_FORWARD_DOCS[rollForward] || '';
    gridRows.push(
      `<div class="dn-key">Roll-forward</div><div><span class="dn-tag">${esc(rollForward)}</span>${doc ? `<div class="dn-doc-note">${esc(doc)}</div>` : ''}</div>`
    );
  }
  if (allowPrerelease !== undefined) {
    const cls = allowPrerelease ? 'warn' : '';
    gridRows.push(
      `<div class="dn-key">Allow prerelease</div><div><span class="dn-tag ${cls}">${esc(String(allowPrerelease))}</span></div>`
    );
  }

  const sdkRows = msbuildSdks
    ? Object.entries(msbuildSdks).map(([name, ver]) =>
        `<li class="dn-sdk-item"><span class="dn-sdk-name">${esc(name)}</span><span class="dn-sdk-ver">${esc(ver)}</span></li>`
      ).join('')
    : null;

  host.innerHTML = `<style>${CSS}</style>
<div class="dn-head">
  <span class="badge-dn">.NET</span>
  <div class="dn-title">global.json</div>
</div>
${gridRows.length ? `<div class="dn-grid">${gridRows.join('')}</div>` : '<p style="color:var(--fg-2,#888);font-size:13px;">No SDK configuration found.</p>'}
${sdkRows ? `<div class="dn-sec"><h3>MSBuild SDKs <span style="font-size:11px;font-weight:400;">(${Object.keys(msbuildSdks).length})</span></h3><ul class="dn-sdk-list">${sdkRows}</ul></div>` : ''}`;

  return { parentNode: host };
}
