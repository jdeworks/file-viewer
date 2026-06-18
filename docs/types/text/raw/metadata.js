export async function extractMetadata(intake) {
  const text = intake.text || '';
  const words = (text.match(/\S+/g) || []).length;
  return {
    fields: [
      { label: 'Words', value: words, section: 'Type-specific details' },
      { label: 'Characters', value: text.length, section: 'Type-specific details' },
    ],
  };
}
