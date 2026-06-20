export default {
  id: 'dbt-project',
  label: 'dbt project',
  match(intake, baseType) {
    if (!baseType || baseType.id !== 'yaml') return false;
    const name = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    return name === 'dbt_project.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'dbt (data build tool) project configuration — defines the project name, version, profile, model paths, seed paths, and model-level configurations such as materializations, schemas, and tags.',
    usedFor: [{ label: 'dbt', description: 'Analytics engineering framework for data transformations', href: 'https://docs.getdbt.com/reference/dbt_project.yml' }],
  },
};
