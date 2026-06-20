export const plugin = {
  id: 'rego-policy',
  label: 'Rego Policy',
  tags: ['opa', 'policy', 'authorization', 'security'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const ext = name.includes('.') ? name.split('.').pop() : '';
    return ext === 'rego';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Open Policy Agent (OPA) Rego policy file — defines authorization logic using rules, functions, imports, and data queries for fine-grained access control.',
    usedFor: [
      { label: 'OPA Policy Language', description: 'Write allow/deny rules, functions, and helper rules using the Rego policy language.', href: 'https://www.openpolicyagent.org/docs/latest/policy-language/' },
      { label: 'Rego Playground', description: 'Test and debug Rego policies interactively', href: 'https://play.openpolicyagent.org/' },
    ],
  },
};
export default plugin;
