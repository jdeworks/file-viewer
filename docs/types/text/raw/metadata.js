export async function extractMetadata(intake) {
  const text = intake.text || '';
  const words = (text.match(/\S+/g) || []).length;
  const lines = text === '' ? 0 : text.split('\n').length;
  return {
    fields: [
      { label: 'Lines', value: lines, section: 'Type-specific details' },
      { label: 'Words', value: words, section: 'Type-specific details' },
      { label: 'Characters', value: text.length, section: 'Type-specific details' },
    ],
  };
}
