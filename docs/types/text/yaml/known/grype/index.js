export const plugin = {
  id: 'grype',
  label: 'Grype config',
  tags: ['security', 'vulnerability', 'sbom', 'containers'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.grype.yaml' || n === '.grype.yml' || n === 'grype.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Anchore Grype vulnerability scanner configuration — severity thresholds, ignore rules, registry auth, and output settings.',
    usedFor: [{ label: 'Vulnerability scanning', description: 'Grype is a vulnerability scanner for container images and filesystems by Anchore.', href: 'https://github.com/anchore/grype' }],
  },
};
export default plugin;
