export default {
  id: 'spectral',
  label: 'Spectral',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.filename || '').split('/').pop().toLowerCase();
    return ['.spectral.yml', '.spectral.yaml'].includes(n);
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Stoplight Spectral API linter config — extends rulesets, defines custom rules, and targets OpenAPI/AsyncAPI documents.' },
};
