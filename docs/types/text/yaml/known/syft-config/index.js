export default {
  id: 'syft-config',
  label: 'Syft config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const fn = (intake.filename || '').replace(/^.*\//, '');
    return fn === '.syft.yaml' || fn === 'syft.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Syft SBOM generation configuration — output formats, catalogers, and secret scanning settings.',
    usedFor: [{ label: 'SBOM generation', description: 'Syft is a CLI tool and Go library for generating a Software Bill of Materials from container images and filesystems.', href: 'https://github.com/anchore/syft' }],
  },
};
