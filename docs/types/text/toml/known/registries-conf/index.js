export const plugin = {
  id: 'registries-conf',
  label: 'Container registries',
  tags: ['podman', 'containers', 'registry', 'oci'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'registries.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'OCI/Podman container image registry configuration — defines search registries, mirrors, insecure registries, and blocked registries.',
    usedFor: [{ label: 'Podman / Buildah / CRI-O registry config', description: 'Controls how container tools resolve image names and where they pull from', href: 'https://github.com/containers/image/blob/main/docs/containers-registries.conf.5.md' }],
  },
};

export default plugin;
