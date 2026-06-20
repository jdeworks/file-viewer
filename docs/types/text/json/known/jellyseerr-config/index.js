export default {
  id: 'jellyseerr-config',
  label: 'Jellyseerr Config',
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    // Explicit jellyseerr filename
    if (n === 'jellyseerr-settings.json') {
      return true;
    }
    // Generic settings.json — require jellyseerr-specific fields
    if (n === 'settings.json') {
      return (
        intake.parsed &&
        intake.parsed.clientId !== undefined &&
        intake.parsed.main !== undefined &&
        intake.parsed.main.apiKey !== undefined
      );
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Jellyseerr media request manager configuration — app settings, security, Jellyfin integration, and notification agents.',
    usedFor: [
      { label: 'Media requests', description: 'Self-hosted media request and discovery manager for Jellyfin and Plex.', href: 'https://github.com/Fallenbagel/jellyseerr' },
    ],
  },
};
