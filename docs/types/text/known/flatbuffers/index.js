export const plugin = {
  id: 'flatbuffers',
  label: 'FlatBuffers',
  tags: ['flatbuffers', 'schema', 'serialization', 'binary'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    return name.endsWith('.fbs');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'FlatBuffers is an efficient cross-platform serialization library. Schema files (.fbs) define tables, structs, enums, unions, and the root type for binary encoding.',
    usedFor: [{ label: 'flatbuffers.dev', description: 'FlatBuffers serialization schema format', href: 'https://flatbuffers.dev/' }],
  },
};
export default plugin;
