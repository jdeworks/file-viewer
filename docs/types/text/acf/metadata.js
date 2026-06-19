function parseKvFlat(text) {
  const out = {};
  for (const m of text.matchAll(/"([^"]+)"\s+"([^"]+)"/g)) out[m[1]] = m[2];
  return out;
}

export async function extractMetadata(intake) {
  const kv = parseKvFlat(intake.text || '');
  const fields = [
    { label: 'Format', value: 'Valve KeyValues (Steam ACF)' },
    { label: 'App ID', value: kv.appid || null },
    { label: 'Name', value: kv.name || null },
    { label: 'Install Dir', value: kv.installdir || null },
    { label: 'Build ID', value: kv.buildid || null },
  ].filter((f) => f.value);
  return { fields };
}
