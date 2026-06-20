export default {
  id: 'mlflow-project',
  label: 'MLflow Project',
  match(intake, baseType) {
    if (!baseType || baseType.id !== 'yaml') return false;
    const name = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    const isMLproject = name === 'mlproject' || name === 'mlflow.yaml';
    const hasEntryPoints = text.includes('entry_points:');
    const hasEnv = text.includes('conda_env:') || text.includes('python_env:');
    return isMLproject || (hasEntryPoints && hasEnv);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'MLflow project definition — specifies the project name, environment, and entry points for packaging and running ML code.',
    usedFor: [{ label: 'MLflow', description: 'Open-source platform for the ML lifecycle', href: 'https://mlflow.org/docs/latest/projects.html' }],
  },
};
