export default {
  id: 'atlantis',
  label: 'Atlantis config',
  match: (intake, baseType) => {
    if (baseType?.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'atlantis.yaml' || name === 'atlantis.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Atlantis Terraform PR automation config — shows projects, workflows, and parallel plan/apply settings.',
    usedFor: [{ label: 'Terraform PR automation', description: 'Atlantis automates Terraform plan/apply in pull requests', href: 'https://www.runatlantis.io/docs/repo-level-atlantis-yaml.html' }],
  },
};
