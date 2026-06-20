export default {
  id: 'ko-config',
  label: 'ko',
  match: (intake, baseType) => {
    if (baseType?.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.ko.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'ko configuration — builds and publishes Go container images without a Dockerfile.',
    usedFor: [{ label: 'Go container builds', description: 'Build minimal container images for Go binaries', href: 'https://ko.build' }],
  },
};
