export default {
  id: 'sabnzbd-config',
  label: 'SABnzbd Config',
  match(intake, baseType) {
    if (baseType?.id !== 'ini') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'sabnzbd.ini') return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('[misc]') && text.includes('host =') && text.includes('port =') && text.includes('download_dir')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'SABnzbd Usenet downloader configuration — web interface, paths, news servers, and sorting settings.',
    tags: ['sabnzbd', 'usenet', 'download', 'config'],
  },
};
