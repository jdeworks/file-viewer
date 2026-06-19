// KML (Keyhole Markup Language) viewer — parses Placemarks, Folders, styles.
// Uses the browser's DOMParser (available in preview iframe context).

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function tag(doc, name) {
  return [...doc.getElementsByTagName(name)];
}

function text(el, name) {
  const child = el.getElementsByTagName(name)[0];
  return child?.textContent?.trim() || null;
}

function parseKml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) throw new Error('KML XML parse error');

  const placemarks = tag(doc, 'Placemark');
  const folders = tag(doc, 'Folder');
  const networkLinks = tag(doc, 'NetworkLink');
  const groundOverlays = tag(doc, 'GroundOverlay');
  const name = text(doc.documentElement, 'name') || text(doc.querySelector('Document'), 'name');
  const description = text(doc.querySelector('Document'), 'description');

  // Count geometry types
  let points = 0, lines = 0, polygons = 0;
  for (const pm of placemarks) {
    if (pm.getElementsByTagName('Point').length) points++;
    if (pm.getElementsByTagName('LineString').length || pm.getElementsByTagName('MultiGeometry').length) lines++;
    if (pm.getElementsByTagName('Polygon').length) polygons++;
  }

  // Extract placemark list (up to 50)
  const pmItems = placemarks.slice(0, 50).map((pm) => {
    const pmName = text(pm, 'name') || '(unnamed)';
    const pmDesc = text(pm, 'description') || '';
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

export function render(intake) {
  const text_ = intake.text || '';
  let info;
  try {
    info = parseKml(text_);
  } catch (e) {
    return { bodyHtml: `<div class="kml-preview"><p class="kml-note">KML parse error: ${esc(e.message)}</p></div>` };
  }

  const stats = [
    info.placemarks && `<div class="kml-stat"><div class="kml-stat-value">${info.placemarks}</div><div class="kml-stat-label">Placemarks</div></div>`,
    info.folders && `<div class="kml-stat"><div class="kml-stat-value">${info.folders}</div><div class="kml-stat-label">Folders</div></div>`,
    info.points && `<div class="kml-stat"><div class="kml-stat-value">${info.points}</div><div class="kml-stat-label">Points</div></div>`,
    info.lines && `<div class="kml-stat"><div class="kml-stat-value">${info.lines}</div><div class="kml-stat-label">Lines</div></div>`,
    info.polygons && `<div class="kml-stat"><div class="kml-stat-value">${info.polygons}</div><div class="kml-stat-label">Polygons</div></div>`,
    info.networkLinks && `<div class="kml-stat"><div class="kml-stat-value">${info.networkLinks}</div><div class="kml-stat-label">Network Links</div></div>`,
    info.groundOverlays && `<div class="kml-stat"><div class="kml-stat-value">${info.groundOverlays}</div><div class="kml-stat-label">Overlays</div></div>`,
  ].filter(Boolean).join('');

  const pmRows = info.pmItems.map((pm) =>
    `<tr><td class="kml-geom">${GEOM_ICON[pm.geomType] || ''}</td><td>${esc(pm.name)}</td><td class="kml-desc">${esc(pm.desc)}</td></tr>`
  ).join('');

  const more = info.placemarks > 50 ? `<p class="kml-note">Showing first 50 of ${info.placemarks} placemarks.</p>` : '';

  const bodyHtml = `<div class="kml-preview">
  <div class="kml-header"><span class="kml-badge">KML</span>${info.name ? `<span class="kml-title">${esc(info.name)}</span>` : ''}</div>
  ${info.description ? `<p class="kml-desc-text">${esc(info.description.slice(0, 200))}</p>` : ''}
  <div class="kml-stats">${stats}</div>
  ${pmRows ? `<table class="kml-table"><thead><tr><th></th><th>Name</th><th>Description</th></tr></thead><tbody>${pmRows}</tbody></table>` : ''}
  ${more}
</div>`;

  return { bodyHtml };
}
