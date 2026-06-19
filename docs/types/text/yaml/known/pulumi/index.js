export default {
  id: 'pulumi',
  label: 'Pulumi project',
  match: (intake, baseType) => {
    if (baseType.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    // Pulumi.<stack>.yaml or Pulumi.yaml
    return name === 'pulumi.yaml' || /^pulumi\.[a-z0-9_-]+\.yaml$/.test(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Pulumi project or stack configuration — name, runtime, and config values.',
    usedFor: [{ label: 'Infrastructure as Code', description: 'Define Pulumi infrastructure projects with runtime and config settings.', href: 'https://www.pulumi.com/docs/concepts/projects/' }],
  },
};
