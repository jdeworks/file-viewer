export default {
  id: 'plist-config',
  label: 'Apple Property List',
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.text || '';
    return name.endsWith('.plist') || text.includes('<!DOCTYPE plist') || text.includes('<plist version=');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Apple Property List file — structured data format used by macOS and iOS for configuration and preferences.',
    usedFor: [{ label: 'macOS / iOS', description: 'Application configuration and preferences on Apple platforms', href: 'https://developer.apple.com/library/archive/documentation/General/Reference/InfoPlistKeyReference/Introduction/Introduction.html' }],
  },
};
