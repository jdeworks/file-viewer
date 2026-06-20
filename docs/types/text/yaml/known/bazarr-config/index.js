export default {
  id: 'bazarr-config',
  label: 'Bazarr Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'bazarr.yaml' || n === 'bazarr.yml') return true;
    const t = intake.text || '';
    // Bazarr-specific: general object with use_sonarr OR both sonarr+radarr top-level keys AND general.port
    const hasUseSonarr = t.includes('use_sonarr:') && t.includes('general:');
    const hasBothServices = t.includes('sonarr:') && t.includes('radarr:') && t.includes('general:') && t.includes('port:');
    return hasUseSonarr || hasBothServices;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Bazarr automatic subtitle downloader configuration for Sonarr and Radarr — defines server, integration, and subtitle preferences.',
    usedFor: [
      { label: 'Bazarr', description: 'Configure Bazarr to automatically download subtitles for your media library managed by Sonarr and Radarr.', href: 'https://wiki.bazarr.media/Getting-Started/Setup-Guide/' },
    ],
  },
};
