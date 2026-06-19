export default {
  id: 'terragrunt',
  label: 'Terragrunt Config',
  match(intake, _baseType) {
    const n = (intake.name || intake.filename || '').split('/').pop();
    return n === 'terragrunt.hcl';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Terragrunt IaC wrapper configuration — module source, includes, inputs, and dependencies.',
    usedFor: [{ label: 'Terragrunt', description: 'Terragrunt DRY wrapper for Terraform: module source, includes, inputs, and dependencies.', href: 'https://terragrunt.gruntwork.io/docs/reference/config-blocks-and-attributes/' }],
  },
};
