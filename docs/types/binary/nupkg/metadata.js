export async function metadata(intake) {
  const { filename, bytes: b } = intake;
  if (!b || b[0] !== 0x50 || b[1] !== 0x4b) return {};
  const ext = (filename || '').split('.').pop().toLowerCase();
  return { format: { nupkg: 'NuGet', vsix: 'VS Extension', whl: 'Python Wheel', jar: 'Java JAR' }[ext] || ext.toUpperCase() };
}
