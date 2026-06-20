export default {
  id: 'opencost-config',
  label: 'OpenCost config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'opencost.yaml' || name === 'opencost.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'OpenCost configuration — shows cluster, Prometheus endpoint, exporter settings, and UI status.',
    usedFor: [{ label: 'Kubernetes cost monitoring', description: 'OpenCost is an open-source cost monitoring tool for Kubernetes workloads.', href: 'https://www.opencost.io/docs/' }],
  },
};
