export default {
  id: 'podman-quadlet',
  label: 'Podman Quadlet',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!n.endsWith('.container') && !n.endsWith('.pod') && !n.endsWith('.kube') && !n.endsWith('.network')) return false;
    const text = intake.text || '';
    return text.includes('[Container]') || text.includes('[Pod]') || text.includes('[Kube]');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Podman Quadlet systemd unit file — defines a container, pod, Kubernetes workload, or network managed by systemd via Podman.',
    usedFor: [{ label: 'Podman Quadlet', description: 'Run Podman containers as systemd services using declarative unit files.', href: 'https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html' }],
  },
};
