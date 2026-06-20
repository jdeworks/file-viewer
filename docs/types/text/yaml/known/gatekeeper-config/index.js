export default {
  id: 'gatekeeper-config',
  label: 'Gatekeeper',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const text = intake.text || '';
    return text.includes('constraints.gatekeeper.sh') || text.includes('gatekeeper.sh/v1beta1');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'OPA Gatekeeper constraint templates and constraints enforce policy as code on Kubernetes clusters using Open Policy Agent.',
    usedFor: [{ label: 'OPA Gatekeeper', description: 'Define ConstraintTemplates with Rego logic and Constraint resources to enforce policies on Kubernetes admission requests.', href: 'https://open-policy-agent.github.io/gatekeeper/' }],
  },
};
