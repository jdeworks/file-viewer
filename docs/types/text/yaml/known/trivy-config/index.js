export default {
  id: 'trivy-config',
  label: 'Trivy',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || '').toLowerCase();
    return ['trivy.yaml', 'trivy.yml', '.trivy.yaml', '.trivy.yml', 'trivy-config.yaml', 'trivy-config.yml'].includes(n);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Trivy security scanner configuration — scans for vulnerabilities, secrets, misconfigurations, and license issues.',
    usedFor: [{ label: 'Security scanning', description: 'Aqua Trivy all-in-one open source vulnerability scanner', href: 'https://aquasecurity.github.io/trivy/latest/docs/references/configuration/config-file/' }],
  },
};
