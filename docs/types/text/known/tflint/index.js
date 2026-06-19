export default {
  id: 'tflint',
  label: 'TFLint Config',
  match(intake, _baseType) {
    const n = (intake.name || intake.filename || '').split('/').pop();
    return n === '.tflint.hcl' || n === 'tflint.hcl';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'TFLint Terraform linter configuration — rules, plugins, and settings.',
    usedFor: [{ label: 'TFLint', description: 'TFLint Terraform linter: rules, plugins, and configuration settings.', href: 'https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/config.md' }],
  },
};
