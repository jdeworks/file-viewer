export default {
  id: 'k8s-hpa',
  label: 'Kubernetes HPA',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const t = intake.text || intake.textSample || '';
    return /kind:\s+HorizontalPodAutoscaler/.test(t) && t.includes('autoscaling');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Kubernetes HorizontalPodAutoscaler — shows target workload, replica range, and metric thresholds with a visual scale bar.',
    usedFor: [{ label: 'Auto-scaling', description: 'Automatically scale Kubernetes workloads based on CPU, memory, or custom metrics.', href: 'https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/' }],
  },
};
