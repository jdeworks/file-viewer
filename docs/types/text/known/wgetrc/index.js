export default {
  id: 'wgetrc',
  label: 'wgetrc',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === '.wgetrc' || n === 'wgetrc') return true;
    const text = intake.textSample || intake.text || '';
    // wgetrc: follow_ftp, tries, timeout, content_disposition
    if (text.includes('follow_ftp') || text.includes('content_disposition')) return true;
    if (text.includes('tries') && text.includes('timeout') && text.includes('user_agent')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'wget download tool default configuration — timeouts, retries, user agent, and proxy settings.',
    tags: ['wget', 'wgetrc', 'download', 'config'],
  },
};
