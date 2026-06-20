export default {
  id: 'curlrc',
  label: 'curlrc',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === '.curlrc' || n === 'curlrc' || n === '_curlrc') return true;
    const text = intake.textSample || intake.text || '';
    // curlrc: lines like "silent" or "retry = 5" or "user-agent = ..."
    if ((text.includes('user-agent') || text.includes('max-time')) && (text.includes('retry') || text.includes('location'))) return true;
    if (text.includes('# curl') && text.includes('silent') && text.includes('location')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'curl default options file — sets global defaults for all curl invocations.',
    tags: ['curl', 'curlrc', 'http', 'config'],
  },
};
