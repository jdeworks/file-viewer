export const plugin = {
  id: 'storage-conf',
  label: 'Containers storage',
  tags: ['podman', 'buildah', 'cri-o', 'containers', 'storage', 'overlay'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'storage.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'containers/storage configuration for Podman, Buildah, and CRI-O — defines the storage driver, graph root, and overlay options.',
    usedFor: [{ label: 'containers/storage config', description: 'Controls where and how container images and layers are stored on disk', href: 'https://github.com/containers/storage/blob/main/docs/containers-storage.conf.5.md' }],
  },
};

export default plugin;
