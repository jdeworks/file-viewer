export default {
  id: 'overseerr-config',
  label: 'Overseerr Config',
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    // Explicit overseerr filename
    if (n === 'overseerr-settings.json') {
      return true;
    }
    // Generic settings.json — require overseerr-specific fields (plex key distinguishes from jellyseerr)
    if (n === 'settings.json') {
      return (
        intake.parsed &&
        intake.parsed.clientId !== undefined &&
        intake.parsed.main !== undefined &&
        intake.parsed.plex !== undefined
      );
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Overseerr media request manager configuration — app settings, security, Plex integration, and notification agents.',
    usedFor: [
      { label: 'Media requests', description: 'Self-hosted media request and discovery manager for Plex.', href: 'https://overseerr.dev' },
    ],
  },
};
