export default {
  id: 'nest-cli',
  label: 'NestJS CLI Config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'nest-cli.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'NestJS CLI configuration — monorepo projects, compiler options, and build settings.' },
};
