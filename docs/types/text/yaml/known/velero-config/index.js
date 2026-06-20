export default {
  id: 'velero-config',
  label: 'Velero config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const t = intake.text || intake.textSample || '';
    return t.includes('velero.io') ||
      t.includes('kind: BackupStorageLocation') ||
      (t.includes('kind: Schedule') && t.includes('velero')) ||
      t.includes('kind: Backup');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Velero backup manifest — shows kind, storage provider, bucket, schedule (cron), TTL, and namespace filters.',
    usedFor: [{ label: 'Kubernetes backup and restore', description: 'Velero backs up and restores Kubernetes cluster resources and persistent volumes.', href: 'https://velero.io/docs/' }],
  },
};
