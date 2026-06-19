export async function extractMetadata(intake) {
  const text = intake.text || '';
  let doc;
  try { doc = JSON.parse(text); } catch { return { fields: [] }; }

  const t = doc.type || '';
  if (t === 'Topology') {
    const objects = Object.keys(doc.objects || {});
    return { fields: [
      { label: 'Format', value: 'TopoJSON' },
      { label: 'Objects', value: objects.join(', ') || null },
    ].filter((f) => f.value) };
  }

  const features = t === 'FeatureCollection' ? (doc.features || []) : t === 'Feature' ? [doc] : [];
  const geomTypes = [...new Set(features.map((f) => f?.geometry?.type).filter(Boolean))];
  return { fields: [
    { label: 'Format', value: t || 'GeoJSON' },
    { label: 'Features', value: features.length ? String(features.length) : null },
    { label: 'Geometry types', value: geomTypes.join(', ') || null },
  ].filter((f) => f.value) };
}
