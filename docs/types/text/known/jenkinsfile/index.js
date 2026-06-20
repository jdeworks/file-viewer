export const plugin = {
  id: 'jenkinsfile',
  label: 'Jenkinsfile',
  tags: ['jenkins', 'ci', 'pipeline'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'jenkinsfile' || n === 'jenkinsfile.groovy';
  },
  renderer: () => import('./renderer.js'),
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Jenkins declarative or scripted pipeline — shows pipeline stages, agents, and post conditions.',
    usedFor: [{ label: 'CI/CD', description: 'Continuous delivery pipelines with Jenkins', href: 'https://www.jenkins.io/doc/book/pipeline/syntax/' }],
  },
};
export default plugin;
