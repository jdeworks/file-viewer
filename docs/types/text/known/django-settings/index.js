export default {
  id: 'django-settings',
  label: 'Django Settings',
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop();
    if (name !== 'settings.py') return false;
    const text = intake.textSample || intake.text || '';
    return text.includes('INSTALLED_APPS') && text.includes('DATABASES');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Django settings module — installed apps, database config, middleware, debug flag, allowed hosts, and secret key status.',
    usedFor: [{ label: 'Django', description: 'Python web framework configuration via settings.py', href: 'https://docs.djangoproject.com/en/stable/topics/settings/' }],
  },
};
