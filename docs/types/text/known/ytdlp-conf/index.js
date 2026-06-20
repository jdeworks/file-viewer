export default {
  id: 'ytdlp-conf',
  label: 'yt-dlp Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'yt-dlp.conf' || n === '.yt-dlp.conf' || n === 'youtube-dl.conf' || n === '.youtube-dl.conf') return true;
    // yt-dlp/youtube-dl config: lines starting with --flag or # comments
    const text = intake.textSample || intake.text || '';
    if (text.includes('--format') && text.includes('--output') && text.includes('--merge-output-format')) return true;
    if ((text.includes('--format') || text.includes('-f ')) && text.includes('--embed-thumbnail') && text.includes('--add-metadata')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'yt-dlp/youtube-dl video downloader configuration — format selection, output paths, and metadata.',
    tags: ['yt-dlp', 'youtube-dl', 'download', 'video', 'config'],
  },
};
