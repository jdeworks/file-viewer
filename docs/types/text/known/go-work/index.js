export default {
  id: 'go-work',
  label: 'Go Workspace',
  match(intake) {
    const n = (intake.filename || '').split('/').pop();
    return n === 'go.work' || n === 'go.work.sum';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Go workspace file — defines a multi-module workspace with shared module replacements and Go version.',
    usedFor: [
      { label: 'Go workspaces', description: 'Multi-module Go projects managed with go work', href: 'https://go.dev/ref/mod#go-work-files' },
    ],
  },
};
