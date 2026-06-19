export async function extractMetadata(intake) {
  const bytes = intake.bytes;
  if (!bytes) return { fields: [] };
  const ext = (intake.filename || '').match(/\.(apk|aab|xapk)$/i)?.[1]?.toUpperCase() || 'APK';
  return { fields: [{ label: 'Format', value: ext }] };
}
