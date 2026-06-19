function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

export async function render(intake) {
  const bytes = intake.bytes;
  if (!bytes || bytes.length < 4) {
    return { bodyHtml: '<div class="apk-preview"><p class="apk-note">Too small to parse.</p></div>' };
  }

  const { JSZip } = await import('../../../../vendor/jszip/jszip.min.js');
  let zip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch (e) {
    return { bodyHtml: `<div class="apk-preview"><p class="apk-note">Could not open APK: ${esc(e.message)}</p></div>` };
  }

  const files = Object.keys(zip.files);
  const hasManifest = files.includes('AndroidManifest.xml');
  const dexFiles = files.filter((f) => /^classes\d*\.dex$/.test(f));
  const libFiles = files.filter((f) => f.startsWith('lib/')).slice(0, 12);
  const abiDirs = [...new Set(libFiles.map((f) => f.split('/')[1]).filter(Boolean))];
  const hasResources = files.includes('resources.arsc');
  const hasSigning = files.some((f) => f.startsWith('META-INF/'));
  const assetCount = files.filter((f) => f.startsWith('assets/')).length;

  // Try to read META-INF/MANIFEST.MF
  let signerInfo = null;
  const manifestMf = zip.file('META-INF/MANIFEST.MF');
  if (manifestMf) {
    const mfText = await manifestMf.async('string');
    signerInfo = mfText.split('\n').slice(0, 3).map((l) => l.trim()).filter(Boolean).join('; ');
  }

  // Try to detect package name from filename
  const pkgGuess = (intake.filename || '').replace(/\.(apk|aab|xapk)$/i, '').replace(/[_-]/g, '.') || null;
  const ext = (intake.filename || '').match(/\.(apk|aab|xapk)$/i)?.[1]?.toUpperCase() || 'APK';

  const rows = [
    hasManifest ? '' : '<tr><td colspan="2" style="color:var(--fg-2);font-size:.8em">⚠ AndroidManifest.xml not found</td></tr>',
    `<tr><td class="apk-key">DEX files</td><td>${dexFiles.length} (${dexFiles.join(', ')})</td></tr>`,
    abiDirs.length ? `<tr><td class="apk-key">Native ABIs</td><td>${esc(abiDirs.join(', '))}</td></tr>` : '',
    `<tr><td class="apk-key">Resources</td><td>${hasResources ? 'resources.arsc present' : 'none'}</td></tr>`,
    assetCount > 0 ? `<tr><td class="apk-key">Assets</td><td>${assetCount} files</td></tr>` : '',
    `<tr><td class="apk-key">Total files</td><td>${files.length}</td></tr>`,
    hasSigning ? `<tr><td class="apk-key">Signed</td><td>META-INF/ present</td></tr>` : '',
  ].filter(Boolean).join('');

  return { bodyHtml: `<div class="apk-preview">
  <div class="apk-header">
    <span class="apk-badge">${esc(ext)}</span>
    <span class="apk-title">${esc(intake.filename || 'Android Package')}</span>
  </div>
  <table class="apk-table">${rows}</table>
  ${signerInfo ? `<p class="apk-note apk-signer">${esc(signerInfo)}</p>` : ''}
</div>` };
}
