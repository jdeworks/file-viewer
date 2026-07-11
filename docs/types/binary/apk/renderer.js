import { loadGlobal, vendor } from '../../../core/script-loader.js';
import { analyzeAndroidPackage } from './layout.js';

function esc(s) { return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

export async function render(intake) {
  const bytes = intake.bytes;
  if (!bytes || bytes.length < 4) {
    return { bodyHtml: '<div class="apk-preview"><p class="apk-note">Too small to parse.</p></div>' };
  }

  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  let zip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch (error) {
    return { bodyHtml: `<div class="apk-preview"><p class="apk-note">Could not open package: ${esc(error.message)}</p></div>` };
  }

  const ext = (intake.filename || '').match(/\.(apk|aab|xapk)$/i)?.[1]?.toLowerCase() || 'apk';
  const files = Object.values(zip.files).filter((entry) => !entry.dir).map((entry) => entry.name);
  const layout = analyzeAndroidPackage(files, bytes, ext);
  let jarManifestInfo = null;
  if (layout.jarManifestPath) {
    const text = await zip.file(layout.jarManifestPath)?.async('string');
    jarManifestInfo = text?.split('\n').slice(0, 3).map((line) => line.trim()).filter(Boolean).join('; ') || null;
  }

  const rows = [];
  if (layout.kind === 'xapk') {
    if (!layout.embeddedApks.length) rows.push('<tr><td colspan="2" style="color:var(--fg-2);font-size:.8em">⚠ No embedded APK files found</td></tr>');
    rows.push(`<tr><td class="apk-key">Embedded APKs</td><td>${layout.embeddedApks.length}${layout.embeddedApks.length ? ` (${esc(layout.embeddedApks.join(', '))})` : ''}</td></tr>`);
    rows.push(`<tr><td class="apk-key">Descriptor</td><td>${layout.descriptor ? esc(layout.descriptor) : 'manifest.json not found'}</td></tr>`);
  } else {
    if (!layout.manifestFiles.length) {
      rows.push(`<tr><td colspan="2" style="color:var(--fg-2);font-size:.8em">⚠ ${layout.kind === 'aab' ? 'Module AndroidManifest.xml' : 'AndroidManifest.xml'} not found</td></tr>`);
    }
    rows.push(`<tr><td class="apk-key">Manifest files</td><td>${layout.manifestFiles.length}${layout.manifestFiles.length ? ` (${esc(layout.manifestFiles.join(', '))})` : ''}</td></tr>`);
    rows.push(`<tr><td class="apk-key">DEX files</td><td>${layout.dexFiles.length}${layout.dexFiles.length ? ` (${esc(layout.dexFiles.join(', '))})` : ''}</td></tr>`);
    if (layout.abiDirs.length) rows.push(`<tr><td class="apk-key">Native ABIs</td><td>${esc(layout.abiDirs.join(', '))}</td></tr>`);
    rows.push(`<tr><td class="apk-key">Resources</td><td>${layout.resources.length ? esc(layout.resources.join(', ')) : 'none detected'}</td></tr>`);
    if (layout.assetCount) rows.push(`<tr><td class="apk-key">Assets</td><td>${layout.assetCount} files</td></tr>`);
  }
  rows.push(`<tr><td class="apk-key">Total files</td><td>${layout.entries.length}</td></tr>`);
  rows.push(`<tr><td class="apk-key">Signature evidence</td><td>${esc(layout.signatureEvidence)}</td></tr>`);

  return { bodyHtml: `<div class="apk-preview">
  <div class="apk-header">
    <span class="apk-badge">${esc(layout.kind.toUpperCase())}</span>
    <span class="apk-title">${esc(intake.filename || 'Android Package')}</span>
  </div>
  <table class="apk-table">${rows.join('')}</table>
  ${jarManifestInfo ? `<p class="apk-note apk-signer">JAR manifest metadata (not signer identity): ${esc(jarManifestInfo)}</p>` : ''}
</div>` };
}
