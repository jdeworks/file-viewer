export default {
  id: 'buf-config',
  label: 'Buf config',
  match: (intake, baseType) => {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType?.id)) return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'buf.yaml' || name === 'buf.gen.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Buf configuration — manages Protobuf linting, breaking change detection, and code generation for gRPC/protobuf projects.',
    usedFor: [{ label: 'Protobuf toolchain', description: 'Build, lint, and generate code from Protocol Buffers', href: 'https://buf.build/docs/configuration/v2/buf-yaml' }],
  },
};
