export default {
  id: 'opentelemetry-k8s',
  label: 'OTel Operator resource',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const text = intake.text || '';
    return text.includes('opentelemetry.io') && (text.includes('kind: OpenTelemetryCollector') || text.includes('kind: Instrumentation'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'OpenTelemetry Operator Kubernetes resource — collector deployment mode, pipeline config, or auto-instrumentation settings.',
    usedFor: [{ label: 'OTel Operator', description: 'Kubernetes custom resources for the OpenTelemetry Operator: OpenTelemetryCollector and Instrumentation CRDs.', href: 'https://opentelemetry.io/docs/kubernetes/operator/' }],
  },
};
