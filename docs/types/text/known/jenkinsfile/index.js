export default {
  id: 'jenkinsfile',
  label: 'Jenkinsfile',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop();
    // Case-insensitive match: Jenkinsfile, jenkinsfile, Jenkinsfile.groovy, etc.
    return /^[Jj]enkinsfile(\.groovy)?$/.test(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Jenkins declarative or scripted pipeline — shows pipeline stages, agents, and post conditions.',
    usedFor: [{ label: 'CI/CD', description: 'Continuous delivery pipelines with Jenkins', href: 'https://www.jenkins.io/doc/book/pipeline/syntax/' }],
  },
};
