export default {
  id: 'buf-config',
  label: 'Buf config',
  match: (intake, baseType) => {
    if (baseType?.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    // buf.gen.yaml is a distinct plugin (buf-gen); don't shadow it here.
    return name === 'buf.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Buf configuration — manages Protobuf linting, breaking change detection, and code generation for gRPC/protobuf projects.',
    usedFor: [{ label: 'Protobuf toolchain', description: 'Build, lint, and generate code from Protocol Buffers', href: 'https://buf.build/docs/configuration/v2/buf-yaml' }],
  },
};
