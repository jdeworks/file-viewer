export default {
  id: 'cloudbuild',
  label: 'Google Cloud Build',
  match: (intake, baseType) => {
    if (baseType?.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'cloudbuild.yaml' || name === 'cloudbuild.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Google Cloud Build configuration — build steps, substitutions, artifacts, and timeout.',
    usedFor: [{ label: 'CI/CD on GCP', description: 'Build and test with Google Cloud Build', href: 'https://cloud.google.com/build/docs/build-config-file-schema' }],
  },
};
