export default {
  id: 'nzbget-config',
  label: 'NZBGet Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'nzbget.conf') return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('MainDir') && text.includes('TempDir') && text.includes('DestDir')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'NZBGet Usenet downloader configuration — paths, news servers, web control, and post-processing settings.',
    tags: ['nzbget', 'usenet', 'download', 'config'],
  },
};
