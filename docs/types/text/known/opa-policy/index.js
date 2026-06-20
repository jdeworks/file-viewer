export default {
  id: 'opa-policy',
  label: 'OPA Policy',
  match: (intake) => {
    return (intake.filename || '').toLowerCase().endsWith('.rego');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Open Policy Agent (OPA) Rego policy files define authorization logic using rules, functions, and data queries.',
    usedFor: [{ label: 'OPA Policy Language', description: 'Write allow/deny rules and helper functions for fine-grained authorization using the Rego policy language.', href: 'https://www.openpolicyagent.org/docs/latest/policy-language/' }],
  },
};
