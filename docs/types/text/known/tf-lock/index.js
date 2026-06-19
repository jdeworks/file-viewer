export default {
  id: 'tf-lock',
  label: 'Terraform Lock File',
  match(intake, _baseType) {
    const n = (intake.name || intake.filename || '').split('/').pop();
    return n === '.terraform.lock.hcl';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Terraform provider lock file — pinned provider versions and integrity hashes.',
    usedFor: [{ label: 'Terraform', description: 'Terraform dependency lock file: pinned provider versions, constraints, and integrity hashes.', href: 'https://developer.hashicorp.com/terraform/language/files/dependency-lock' }],
  },
};
