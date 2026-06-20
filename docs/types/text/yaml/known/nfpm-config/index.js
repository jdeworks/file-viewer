export default {
  id: 'nfpm-config',
  label: 'nfpm',
  match: (intake, baseType) => {
    if (baseType?.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'nfpm.yaml' || name === 'nfpm.yml' || name === '.nfpm.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'nfpm configuration — packages Go binaries and files into .deb, .rpm, .apk, and .ipk archives.',
    usedFor: [{ label: 'Native package creation', description: 'Build Linux packages from Go binaries without FPM', href: 'https://nfpm.goreleaser.com' }],
  },
};
