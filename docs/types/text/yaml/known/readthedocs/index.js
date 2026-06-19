export default {
  id: 'readthedocs',
  label: 'ReadTheDocs config',
  match(intake, baseType) {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType?.id)) return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.readthedocs.yaml' || name === '.readthedocs.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'ReadTheDocs build configuration — specifies the build OS, Python/Node versions, documentation tool (Sphinx or MkDocs), output formats, and search settings.',
    usedFor: [{ label: 'Documentation hosting', description: 'Automated documentation build and hosting on ReadTheDocs', href: 'https://docs.readthedocs.io/en/stable/config-file/v2.html' }],
  },
};
