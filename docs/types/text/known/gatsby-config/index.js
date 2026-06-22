export default {
  id: 'gatsby-config',
  label: 'Gatsby Config',
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name === 'gatsby-config.js' || name === 'gatsby-config.ts' || name === 'gatsby-config.mjs';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Gatsby static site generator configuration — defines site metadata, plugins, and flags.' },
};
