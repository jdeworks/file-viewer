export default {
  id: 'jsconfig',
  label: 'jsconfig.json',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'jsconfig.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'jsconfig.json — JavaScript project configuration for editor IntelliSense (based on TypeScript compiler options).',
    usedFor: [{ label: 'JS project config', description: 'Configure editor IntelliSense for JavaScript projects', href: 'https://code.visualstudio.com/docs/languages/jsconfig' }],
  },
};
