export default {
  id: 'docusaurus-config',
  label: 'Docusaurus Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'docusaurus.config.js' || n === 'docusaurus.config.ts' || n === 'docusaurus.config.mjs';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Docusaurus documentation site configuration — defines site metadata, plugins, themes, and navigation.' },
};
