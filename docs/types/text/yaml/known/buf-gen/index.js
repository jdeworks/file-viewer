export const plugin = {
  id: 'buf-gen',
  label: 'Buf code generation',
  tags: ['protobuf', 'grpc', 'buf', 'codegen'],
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const name = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    return name === 'buf.gen.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Buf code generation configuration — defines plugins, output paths, options, managed mode settings, and input sources for protobuf code generation.',
    usedFor: [{ label: 'Buf', description: 'Generate code from Protocol Buffers with the Buf CLI', href: 'https://buf.build/docs/configuration/v2/buf-gen-yaml' }],
  },
};
export default plugin;
