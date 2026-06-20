export default {
  id: 'analysis-options',
  label: 'Dart Analysis Options',
  match: (intake, baseType) => {
    if (!baseType || baseType.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop();
    return name === 'analysis_options.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Flutter/Dart static analysis configuration — linter rules, analyzer options, and error severity overrides.',
    usedFor: [
      { label: 'Flutter apps', description: 'Enforces lint rules and code style in Flutter projects' },
      { label: 'Dart packages', description: 'Configures the Dart analyzer for libraries and CLI tools' },
    ],
  },
};
