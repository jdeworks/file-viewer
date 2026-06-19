export default {
  id: 'circleci',
  label: 'CircleCI config',
  match: (intake, baseType) => {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType.id)) return false;
    const fn = intake.filename || '';
    const name = fn.split('/').pop().toLowerCase();
    if (/\.circleci\//i.test(fn) && name === 'config.yml') return true;
    if (['.circleci.yml', 'circleci.yml'].includes(name)) return true;
    const text = intake.textSample || intake.text || '';
    return /^version\s*:\s*2/m.test(text) && /^jobs\s*:/m.test(text) && /^workflows\s*:/m.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'CircleCI configuration — shows version, orbs, workflows, and jobs overview.',
    usedFor: [{ label: 'CI/CD', description: 'Cloud-native continuous integration with CircleCI', href: 'https://circleci.com/docs/configuration-reference/' }],
  },
};
