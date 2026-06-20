export const plugin = {
  id: 'terraform-hcl',
  label: 'Terraform HCL',
  tags: ['infrastructure', 'iac', 'hashicorp', 'terraform'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!/\.tf$/.test(name)) return false;
    // Defer specific files to their dedicated plugins
    if (name === 'versions.tf' || name === 'providers.tf') return false;
    return true;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'HashiCorp Configuration Language (HCL) Terraform file — defines infrastructure resources, variables, outputs, providers, modules, and data sources.',
    usedFor: [{ label: 'Terraform docs', description: 'Infrastructure as Code using the Terraform HCL format', href: 'https://developer.hashicorp.com/terraform/language' }],
  },
};
export default plugin;
