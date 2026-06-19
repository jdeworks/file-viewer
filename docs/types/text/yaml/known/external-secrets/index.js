export default {
  id: 'external-secrets',
  label: 'External Secrets',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const text = intake.textSample || intake.text || '';
    return /kind:\s*(ExternalSecret|SecretStore|ClusterExternalSecret|ClusterSecretStore)\b/.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'External Secrets Operator manifest — synchronises secrets from external providers (AWS SSM, Vault, GCP Secret Manager, etc.) into Kubernetes Secrets.',
    usedFor: [{ label: 'Secret management', description: 'Define ExternalSecret, SecretStore, or ClusterExternalSecret resources for External Secrets Operator.', href: 'https://external-secrets.io/latest/' }],
  },
};
