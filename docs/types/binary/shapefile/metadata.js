const SHAPE_TYPES = {
  0: 'Null', 1: 'Point', 3: 'Polyline', 5: 'Polygon', 8: 'MultiPoint',
  11: 'PointZ', 13: 'PolylineZ', 15: 'PolygonZ', 18: 'MultiPointZ',
  21: 'PointM', 23: 'PolylineM', 25: 'PolygonM', 28: 'MultiPointM', 31: 'MultiPatch',
};

function r32le(b, off) { return ((b[off] | (b[off+1]<<8) | (b[off+2]<<16)) >>> 0) + (b[off+3] * 0x1000000); }
function rf64le(b, off) { const dv = new DataView(b.buffer, b.byteOffset + off, 8); return dv.getFloat64(0, true); }

export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 100) return {};
  const fields = {};
  fields['Format'] = 'ESRI Shapefile';
  const st = r32le(b, 32);
  if (SHAPE_TYPES[st]) fields['Shape Type'] = SHAPE_TYPES[st];
  const xmin = rf64le(b, 36), ymin = rf64le(b, 44), xmax = rf64le(b, 52), ymax = rf64le(b, 60);
  if (isFinite(xmin)) fields['Xmin'] = xmin.toFixed(5);
  if (isFinite(ymin)) fields['Ymin'] = ymin.toFixed(5);
  if (isFinite(xmax)) fields['Xmax'] = xmax.toFixed(5);
  if (isFinite(ymax)) fields['Ymax'] = ymax.toFixed(5);
  return fields;
}
