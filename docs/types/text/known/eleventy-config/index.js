export default {
  id: 'eleventy-config',
  label: 'Eleventy Config',
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name === '.eleventy.js' || name === 'eleventy.config.js' || name === 'eleventy.config.mjs' || name === '.eleventy.cjs';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Eleventy (11ty) static site generator configuration — defines template formats, plugins, and directory settings.' },
};
