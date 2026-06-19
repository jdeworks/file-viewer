export default {
  id: 'versions-tf',
  label: 'Terraform Versions',
  match(intake, _baseType) {
    const n = (intake.name || intake.filename || '').split('/').pop();
    if (n === 'versions.tf') return true;
    if (n === 'providers.tf') {
      const text = intake.textSample || intake.text || '';
      return text.includes('required_providers');
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Terraform version constraints and required provider declarations.',
    usedFor: [{ label: 'Terraform', description: 'Terraform version constraints and required provider source/version declarations.', href: 'https://developer.hashicorp.com/terraform/language/settings' }],
  },
};
