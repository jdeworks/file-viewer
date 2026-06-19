export function extractMetadata(intake) {
  const text = intake.text || '';
  if (!text.trimStart().startsWith('ISO-10303-21;')) return {};
  const schemaMatch = text.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i);
  const entityCount = (text.match(/^#\d+\s*=/gm) || []).length;
  return {
    Format: 'STEP (ISO 10303-21)',
    ...(schemaMatch ? { Schema: schemaMatch[1] } : {}),
    'Entity count': String(entityCount),
  };
}
