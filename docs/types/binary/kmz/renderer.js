// KMZ viewer — extracts the embedded KML from the ZIP archive and renders it.
import { vendor, loadGlobal } from '../../../core/script-loader.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function tag(doc, name) { return [...doc.getElementsByTagName(name)]; }
function textOf(el, name) {
  const child = el.getElementsByTagName(name)[0];
  return child?.textContent?.trim() || null;
}

function parseKml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('KML XML parse error');

  const placemarks = tag(doc, 'Placemark');
  const folders = tag(doc, 'Folder');
  const networkLinks = tag(doc, 'NetworkLink');
  const groundOverlays = tag(doc, 'GroundOverlay');
  const name = textOf(doc.documentElement, 'name') || textOf(doc.querySelector('Document'), 'name');
  const description = textOf(doc.querySelector('Document'), 'description');

  let points = 0, lines = 0, polygons = 0;
  for (const pm of placemarks) {
    if (pm.getElementsByTagName('Point').length) points++;
    if (pm.getElementsByTagName('LineString').length || pm.getElementsByTagName('MultiGeometry').length) lines++;
    if (pm.getElementsByTagName('Polygon').length) polygons++;
  }

  const pmItems = placemarks.slice(0, 50).map((pm) => {
    const pmName = textOf(pm, 'name') || '(unnamed)';
    const pmDesc = textOf(pm, 'description') || '';
    let geomType = 'Point';
    if (pm.getElementsByTagName('LineString').length) geomType = 'LineString';
    else if (pm.getElementsByTagName('Polygon').length) geomType = 'Polygon';
    else if (pm.getElementsByTagName('MultiGeometry').length) geomType = 'Multi';
    return { name: pmName, desc: pmDesc.slice(0, 80), geomType };
  });

  return { name, description, placemarks: placemarks.length, folders: folders.length,
    networkLinks: networkLinks.length, groundOverlays: groundOverlays.length,
    points, lines, polygons, pmItems };
}

const GEOM_ICON = { Point: '📍', LineString: '〰', Polygon: '🔷', Multi: '⬡' };

function renderKmlInfo(info, containerFiles) {
  const stats = [
    info.placemarks && `<div class="kml-stat"><div class="kml-stat-value">${info.placemarks}</div><div class="kml-stat-label">Placemarks</div></div>`,
    info.folders && `<div class="kml-stat"><div class="kml-stat-value">${info.folders}</div><div class="kml-stat-label">Folders</div></div>`,
    info.points && `<div class="kml-stat"><div class="kml-stat-value">${info.points}</div><div class="kml-stat-label">Points</div></div>`,
    info.lines && `<div class="kml-stat"><div class="kml-stat-value">${info.lines}</div><div class="kml-stat-label">Lines</div></div>`,
    info.polygons && `<div class="kml-stat"><div class="kml-stat-value">${info.polygons}</div><div class="kml-stat-label">Polygons</div></div>`,
    containerFiles > 1 && `<div class="kml-stat"><div class="kml-stat-value">${containerFiles}</div><div class="kml-stat-label">Files</div></div>`,
  ].filter(Boolean).join('');

  const pmRows = info.pmItems.map((pm) =>
    `<tr><td class="kml-geom">${GEOM_ICON[pm.geomType] || ''}</td><td>${esc(pm.name)}</td><td class="kml-desc">${esc(pm.desc)}</td></tr>`
  ).join('');

  const more = info.placemarks > 50 ? `<p class="kml-note">Showing first 50 of ${info.placemarks} placemarks.</p>` : '';

  return `<div class="kml-preview">
  <div class="kml-header"><span class="kml-badge badge-kmz">KMZ</span>${info.name ? `<span class="kml-title">${esc(info.name)}</span>` : ''}</div>
  ${info.description ? `<p class="kml-desc-text">${esc(info.description.slice(0, 200))}</p>` : ''}
  <div class="kml-stats">${stats}</div>
  ${pmRows ? `<table class="kml-table"><thead><tr><th></th><th>Name</th><th>Description</th></tr></thead><tbody>${pmRows}</tbody></table>` : ''}
  ${more}
</div>`;
}

export async function render(intake) {
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');

  let zip;
  try {
    zip = await JSZip.loadAsync(intake.bytes);
  } catch (e) {
    return { bodyHtml: `<div class="kml-preview"><p class="kml-note">Could not read KMZ: ${esc(e.message)}</p></div>` };
  }

  const allFiles = Object.keys(zip.files).filter((f) => !zip.files[f].dir);
  const kmlFiles = allFiles.filter((f) => f.toLowerCase().endsWith('.kml'));
  if (!kmlFiles.length) {
    return { bodyHtml: '<div class="kml-preview"><p class="kml-note">No KML file found inside the KMZ archive.</p></div>' };
  }

  const primary = kmlFiles.find((f) => /(?:^|\/)doc\.kml$/i.test(f)) || kmlFiles[0];
  let kmlText;
  try {
    kmlText = await zip.files[primary].async('string');
  } catch (e) {
    return { bodyHtml: `<div class="kml-preview"><p class="kml-note">Could not extract ${esc(primary)}: ${esc(e.message)}</p></div>` };
  }

  let info;
  try {
    info = parseKml(kmlText);
  } catch (e) {
    return { bodyHtml: `<div class="kml-preview"><p class="kml-note">KML parse error: ${esc(e.message)}</p></div>` };
  }

  return { bodyHtml: renderKmlInfo(info, allFiles.length) };
}
