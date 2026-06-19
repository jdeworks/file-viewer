export default {
  id: 'terraform-docs',
  label: 'terraform-docs config',
  match: (intake, baseType) => {
    if (baseType?.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.terraform-docs.yml' || name === '.terraform-docs.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'terraform-docs config — shows formatter, output file, and enabled documentation sections.',
    usedFor: [{ label: 'Terraform documentation', description: 'terraform-docs generates documentation from Terraform modules', href: 'https://terraform-docs.io/user-guide/configuration/' }],
  },
};
