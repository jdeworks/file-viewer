export default {
  id: 'citation-cff',
  label: 'Citation File Format',
  match(intake, baseType) {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType?.id)) return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'citation.cff';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Citation File Format (CFF) — machine-readable software or dataset citation metadata including authors, DOI, version, and license.',
    usedFor: [{ label: 'Software citation', description: 'Standard format for citing software and datasets', href: 'https://citation-file-format.github.io/' }],
  },
};
