export default {
  id: 'keda-config',
  label: 'KEDA config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const t = intake.text || intake.textSample || '';
    return t.includes('keda.sh') || t.includes('kind: ScaledObject') || t.includes('kind: ScaledJob');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'KEDA ScaledObject/ScaledJob manifest — shows scaling target, replica bounds, polling interval, and trigger summary.',
    usedFor: [{ label: 'Kubernetes event-driven autoscaling', description: 'KEDA provides event-driven autoscaling for Kubernetes workloads using external event sources.', href: 'https://keda.sh/docs/' }],
  },
};
