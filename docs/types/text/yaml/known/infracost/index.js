export default {
  id: 'infracost',
  label: 'Infracost config',
  match: (intake, baseType) => {
    if (baseType?.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'infracost.yml' || name === 'infracost.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Infracost cloud cost estimation config — shows projects, currency, and Terraform variable paths.',
    usedFor: [{ label: 'Cloud cost estimation', description: 'Infracost shows cloud cost estimates for Terraform changes in pull requests', href: 'https://www.infracost.io/docs/features/config_file/' }],
  },
};
