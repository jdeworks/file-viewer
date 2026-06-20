export const plugin = {
  id: 'spacelift-config',
  label: 'Spacelift Config',
  tags: ['spacelift', 'iac', 'terraform', 'pulumi', 'ci', 'yaml'],
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const full = (intake.name || intake.filename || '').toLowerCase();
    return (n === 'config.yml' && full.includes('.spacelift')) || n === 'spacelift-config.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Spacelift IaC CI/CD configuration — shows stacks, backend, branch, project root, and auto-apply settings.',
    usedFor: [{ label: 'IaC CI/CD automation', description: 'Spacelift automates Terraform, Pulumi, and other IaC workflows', href: 'https://docs.spacelift.io/' }],
  },
};
export default plugin;
