export default {
  id: 'swcrc',
  label: 'SWC Config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.swcrc';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'SWC compiler configuration — JavaScript/TypeScript transpiler settings, module output, and source maps.' },
};
