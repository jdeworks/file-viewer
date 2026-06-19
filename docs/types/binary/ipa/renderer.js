import { vendor, loadGlobal } from '../../../core/script-loader.js';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parsePlist(xml) {
  // Parse Apple XML plist — very simplified for Info.plist values
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const dict = doc.querySelector('dict');
  if (!dict) return {};
  const result = {};
  const children = [...dict.children];
  for (let i = 0; i < children.length - 1; i += 2) {
    const key = children[i].textContent.trim();
    const val = children[i + 1];
    if (!val) continue;
    if (val.tagName === 'string') result[key] = val.textContent.trim();
    else if (val.tagName === 'integer') result[key] = parseInt(val.textContent.trim());
    else if (val.tagName === 'true') result[key] = true;
    else if (val.tagName === 'false') result[key] = false;
    else if (val.tagName === 'array') {
      result[key] = [...val.children].map(c => c.textContent.trim());
    }
  }
  return result;
}

export async function render(intake) {
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  const zip = await JSZip.loadAsync(intake.bytes);

  // Find Info.plist inside Payload/*.app/
  const plistKey = Object.keys(zip.files).find(f => /^Payload\/[^/]+\.app\/Info\.plist$/.test(f));
  if (!plistKey) {
    return { bodyHtml: '<p style="color:#90a4ae">No Info.plist found in IPA archive.</p>', hadUnsafe: false };
  }

  const plistXml = await zip.files[plistKey].async('string');
  const info = parsePlist(plistXml);

  const appName = info['CFBundleDisplayName'] || info['CFBundleName'] || info['CFBundleExecutable'] || null;
  const bundleId = info['CFBundleIdentifier'] || null;
  const version = info['CFBundleShortVersionString'] || info['CFBundleVersion'] || null;
  const build = info['CFBundleVersion'] || null;
  const minOs = info['MinimumOSVersion'] || info['LSMinimumSystemVersion'] || null;
  const platforms = info['CFBundleSupportedPlatforms'] || [];
  const deviceFamily = info['UIDeviceFamily'];
  const requiredCaps = info['UIRequiredDeviceCapabilities'] || [];
  const urlSchemes = [];
  const urlTypesXml = new DOMParser().parseFromString(plistXml, 'text/xml')
    .querySelectorAll('key');
  // Extract URL schemes from raw plist for display
  const rawUrlMatch = plistXml.match(/CFBundleURLSchemes[\s\S]*?<array>([\s\S]*?)<\/array>/);
  if (rawUrlMatch) {
    const schemes = [...rawUrlMatch[1].matchAll(/<string>([^<]+)<\/string>/g)].map(m => m[1]);
    urlSchemes.push(...schemes.slice(0, 6));
  }

  const familyLabels = { 1: 'iPhone', 2: 'iPad' };
  const familyStr = Array.isArray(deviceFamily)
    ? deviceFamily.map(f => familyLabels[f] || `Family ${f}`).join(', ')
    : deviceFamily !== undefined ? familyLabels[deviceFamily] || String(deviceFamily) : null;

  const files = Object.keys(zip.files).filter(f => !f.endsWith('/'));
  const appSize = files.reduce((sum, k) => sum + (zip.files[k]._data?.uncompressedSize || 0), 0);
  const sizeMB = appSize > 0 ? (appSize / 1024 / 1024).toFixed(1) + ' MB' : null;

  const metaRows = [
    appName ? ['App name', appName] : null,
    bundleId ? ['Bundle ID', bundleId] : null,
    version ? ['Version', version + (build && build !== version ? ` (build ${build})` : '')] : null,
    minOs ? ['Min iOS', minOs] : null,
    familyStr ? ['Devices', familyStr] : null,
    platforms.length ? ['Platforms', platforms.join(', ')] : null,
    sizeMB ? ['Uncompressed', sizeMB] : null,
    urlSchemes.length ? ['URL schemes', urlSchemes.join(', ')] : null,
  ].filter(Boolean);

  const overviewHtml = metaRows.map(([k, v]) =>
    `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(String(v))}</span></div>`
  ).join('');

  const capsHtml = Array.isArray(requiredCaps) && requiredCaps.length
    ? `<div class="meta-section"><h4 class="meta-section-title">Required Capabilities</h4>
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          ${requiredCaps.map(c => `<span class="ipa-cap">${esc(c)}</span>`).join('')}
        </div></div>`
    : '';

  return {
    bodyHtml: `
      <style>
        .badge-ipa { background: #1565c0; color: #fff; }
        .ipa-cap { display:inline-block; background:#e3f2fd; color:#1565c0; border-radius:3px; padding:1px 7px; font-size:0.8rem; }
      </style>
      <div class="badge-row"><span class="badge badge-ipa">iOS App (IPA)</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">App Info</h4>
        ${overviewHtml}
      </div>
      ${capsHtml}
    `,
    hadUnsafe: false,
  };
}
