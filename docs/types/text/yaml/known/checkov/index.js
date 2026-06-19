export default {
  id: 'checkov',
  label: 'Checkov config',
  match: (intake, baseType) => {
    if (baseType?.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.checkov.yaml' || name === '.checkov.yml' || name === 'checkov.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Checkov IaC security scanner config — shows frameworks, check filters, output format, and scan directories.',
    usedFor: [{ label: 'IaC security scanning', description: 'Checkov scans Terraform, CloudFormation, Kubernetes and more for misconfigurations', href: 'https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html' }],
  },
};
