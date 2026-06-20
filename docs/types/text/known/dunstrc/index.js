export default {
  id: 'dunstrc',
  label: 'dunst Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'dunstrc' || n === 'dunst.conf') return true;
    if (text.includes('[global]') && text.includes('notification_limit') && text.includes('font')) return true;
    if (text.includes('[urgency_low]') || text.includes('[urgency_normal]') || text.includes('[urgency_critical]')) {
      if (text.includes('[global]')) return true;
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'dunst notification daemon configuration — controls notification appearance, urgency levels, timeouts, and keyboard shortcuts.',
    usedFor: [{ label: 'dunst', description: 'Customizable and lightweight notification daemon', href: 'https://dunst-project.org/documentation/' }],
  },
};
