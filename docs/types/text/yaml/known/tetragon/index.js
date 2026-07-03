export const plugin = {
  id: 'tetragon',
  label: 'Tetragon policy',
  tags: ['security', 'ebpf', 'runtime', 'cilium'],
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'tetragon.yaml' || n === 'tetragon.yml') return true;
    // content heuristic: Tetragon TracingPolicy CRD
    const t = intake.text || '';
    return /kind:\s*(TracingPolicy|TracingPolicyNamespaced)/m.test(t) && /apiVersion:\s*cilium\.io/m.test(t);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Cilium Tetragon TracingPolicy — eBPF-based runtime security policy for tracing kernel functions, syscalls, and user-space probes.',
    usedFor: [{ label: 'Runtime security', description: 'Tetragon is a Cilium project providing eBPF-based security observability and enforcement.', href: 'https://tetragon.io/docs/' }],
  },
};
export default plugin;
