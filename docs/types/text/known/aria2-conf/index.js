export default {
  id: 'aria2-conf',
  label: 'aria2 Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'aria2.conf' || n === '.aria2.conf' || n === 'aria2rc') return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('max-concurrent-downloads=') && text.includes('continue=')) return true;
    if (text.includes('dir=') && (text.includes('split=') || text.includes('max-connection-per-server='))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'aria2 multi-protocol download manager configuration — concurrency, BitTorrent, RPC, and proxy settings.',
    tags: ['aria2', 'download', 'torrent', 'config'],
  },
};
