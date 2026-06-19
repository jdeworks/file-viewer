export default {
  id: 'github-actions',
  label: 'GitHub Actions workflow',
  match: (intake, baseType) => {
    if (baseType.id !== 'yaml' && baseType.id !== 'docker-compose') return false;
    const fn = intake.filename || '';
    const text = intake.textSample || intake.text || '';
    // Path-based: .github/workflows/ directory
    if (/\.github\/workflows\//i.test(fn)) return true;
    // Content-based: has 'on:' trigger section AND 'jobs:' key typical of GHA
    return /^on\s*:/m.test(text) && /^jobs\s*:/m.test(text) && !/^services\s*:/m.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'GitHub Actions workflow — shows triggers, jobs, and environment overview.',
    usedFor: [{ label: 'CI/CD automation', description: 'Define automated build, test, and deploy pipelines triggered by GitHub events.', href: 'https://docs.github.com/en/actions' }],
  },
};
