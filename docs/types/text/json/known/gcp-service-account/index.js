export default {
  id: 'gcp-service-account',
  label: 'GCP Service Account',
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    const name = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.json')) return false;
    const text = intake.textSample || intake.text || '';
    return text.includes('"type": "service_account"') || text.includes('"type":"service_account"');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'GCP service account key file — project identity, client email, and redacted private key.',
    usedFor: [{ label: 'Google Cloud', description: 'Authenticate service accounts to GCP APIs', href: 'https://cloud.google.com/iam/docs/service-account-creds' }],
  },
};
