export function detect(intake) {
  if (intake.bytes?.[0] > 127) return 0;
  const name = intake.filename?.toLowerCase() ?? '';
  const text = intake.textSample ?? '';

  // Strong content signal: kubeconfig-specific YAML keys
  const isKubeContent = text.includes('apiVersion: v1') &&
    (text.includes('kind: Config') || text.includes('kind:Config')) &&
    text.includes('clusters:') && text.includes('contexts:');

  // Known filenames
  if ((name === 'config' || name === 'kubeconfig') && isKubeContent) return 0.97;
  if (name.endsWith('.kubeconfig') || name.endsWith('.kube')) return isKubeContent ? 0.97 : 0.7;

  // Content-only match (any filename)
  if (isKubeContent) return 0.88;

  // Partial content signal
  if (text.includes('current-context:') && text.includes('clusters:')) return 0.7;

  return 0;
}
