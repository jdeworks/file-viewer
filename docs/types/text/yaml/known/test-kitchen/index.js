export const plugin = {
  id: 'test-kitchen',
  label: 'Test Kitchen',
  tags: ['chef', 'testing', 'infrastructure'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.kitchen.yml' || n === '.kitchen.yaml' || n === 'kitchen.yml' || n === 'kitchen.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Test Kitchen configuration — driver, provisioner, verifier, platforms, and test suites for Chef infrastructure testing.',
    usedFor: [{ label: 'Infrastructure testing', description: 'Configure Test Kitchen to create sandbox environments and run integration tests against Chef cookbooks and infrastructure code.', href: 'https://kitchen.ci/docs/getting-started/introduction/' }],
  },
};
export default plugin;
