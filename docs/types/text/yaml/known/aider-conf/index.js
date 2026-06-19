export default {
  id: 'aider-conf',
  label: 'Aider AI config',
  match(intake, baseType) {
    if (!baseType || !['yaml'].includes(baseType.id)) return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'aider.conf.yml' || name === '.aider.conf.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Aider AI configuration file — settings for the Aider AI pair programming tool, including model selection, edit format, and git integration.',
    usedFor: [{ label: 'AI coding assistant', description: 'Aider AI pair programmer configuration', href: 'https://aider.chat/docs/config/aider_conf.html' }],
  },
};
