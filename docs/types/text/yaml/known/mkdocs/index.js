export default {
  id: 'mkdocs',
  label: 'MkDocs config',
  match: (intake, baseType) => {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType.id)) return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'mkdocs.yml' || name === 'mkdocs.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'MkDocs configuration — shows site name, theme, navigation structure, plugins, and markdown extensions.',
    usedFor: [{ label: 'Documentation', description: 'Static site generator for project docs with MkDocs', href: 'https://www.mkdocs.org/user-guide/configuration/' }],
  },
};
