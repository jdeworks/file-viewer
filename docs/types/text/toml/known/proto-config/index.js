export default {
  id: 'proto-config',
  label: 'proto toolchain config',
  match: (intake, baseType) => {
    if (!baseType || baseType.id !== 'toml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.prototools';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'proto toolchain manager configuration — pinned tool versions for the current directory.' },
};
