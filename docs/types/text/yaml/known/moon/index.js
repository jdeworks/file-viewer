export default {
  id: 'moon-yml',
  label: 'Moonrepo project',
  match: (intake, baseType) => {
    if (!['yaml'].includes(baseType.id)) return false;
    const name = (intake.filename || '').split('/').pop();
    if (name !== 'moon.yml') return false;
    // Guard against non-moonrepo moon.yml files: require moonrepo-specific keys
    const text = intake.text || '';
    return /\$schema[^:]*moon/i.test(text) || (/\btasks\b/.test(text) && /\blanguage\b/.test(text));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Moonrepo project configuration — defines tasks, language, dependencies, and project metadata for a monorepo project.',
    usedFor: [{ label: 'Moonrepo', description: 'Powerful monorepo management and task runner', href: 'https://moonrepo.dev/docs/config/project' }],
  },
};
