export default {
  id: 'trivy-config',
  label: 'Trivy',
  tags: ['trivy', 'security', 'scanning'],
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!['trivy.yaml', 'trivy.yml', '.trivy.yaml', '.trivy.yml', 'trivy-config.yaml', 'trivy-config.yml'].includes(n)) return false;
    const text = intake.text || '';
    return text.includes('severity:') || text.includes('vulnerability:') || text.includes('scan:') || text.includes('format:') || text.includes('scanners:');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Trivy security scanner configuration — scans for vulnerabilities, secrets, misconfigurations, and license issues.',
    usedFor: [{ label: 'Security scanning', description: 'Aqua Trivy all-in-one open source vulnerability scanner', href: 'https://aquasecurity.github.io/trivy/latest/docs/references/configuration/config-file/' }],
  },
};
