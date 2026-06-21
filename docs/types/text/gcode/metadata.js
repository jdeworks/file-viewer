export function extractMetadata(intake) {
  const text = intake.text || '';
  const lines = text.split(/\r?\n/);
  const lineCount = lines.length;
  let printTime = null, filamentMm = null, layerCount = 0, layerHeight = null;
  let slicer = null, nozzleTemp = null, bedTemp = null;
  let xMax = 0, yMax = 0, zMax = 0;
  let units = null; // G20 = inch, G21 = mm

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith(';')) {
      const c = t.slice(1).trim();
      if (!printTime) { const m = c.match(/estimated printing time[^=:]*[=:]\s*(.+)/i); if (m) printTime = m[1].trim(); }
      if (!filamentMm) { const m = c.match(/filament used \[mm\]\s*=\s*([\d.]+)/i); if (m) filamentMm = parseFloat(m[1]); }
      if (!layerHeight) { const m = c.match(/layer_height\s*=\s*([\d.]+)/i); if (m) layerHeight = parseFloat(m[1]); }
      if (/^LAYER:\d+/i.test(c)) layerCount++;
      if (!slicer) {
        for (const [p, n] of [[/PrusaSlicer/i, 'PrusaSlicer'], [/Cura_SteamEngine/i, 'Cura'], [/Simplify3D/i, 'Simplify3D'], [/OrcaSlicer/i, 'OrcaSlicer'], [/BambuStudio/i, 'BambuStudio'], [/Slic3r/i, 'Slic3r']]) {
          if (p.test(c)) { slicer = n; break; }
        }
      }
    }
    const u = t.toUpperCase();
    if (!units) { if (/^G20\b/.test(u)) units = 'inch'; else if (/^G21\b/.test(u)) units = 'mm'; }
    if (!nozzleTemp) { const m = u.match(/^M1(?:04|09)\s+S(\d+)/); if (m) nozzleTemp = parseInt(m[1]); }
    if (!bedTemp) { const m = u.match(/^M1(?:40|90)\s+S(\d+)/); if (m) bedTemp = parseInt(m[1]); }
    if (/^G[01]\s/i.test(u)) {
      const x = u.match(/X([\d.]+)/); if (x && parseFloat(x[1]) > xMax) xMax = parseFloat(x[1]);
      const y = u.match(/Y([\d.]+)/); if (y && parseFloat(y[1]) > yMax) yMax = parseFloat(y[1]);
      const z = u.match(/Z([\d.]+)/); if (z && parseFloat(z[1]) > zMax) zMax = parseFloat(z[1]);
    }
  }

  return { layerCount: layerCount || null, lineCount, units, printTime, filamentMm, slicerName: slicer, nozzleTemp, bedTemp,
    estimatedWidth: xMax || null, estimatedDepth: yMax || null, estimatedHeight: zMax || null };
}
