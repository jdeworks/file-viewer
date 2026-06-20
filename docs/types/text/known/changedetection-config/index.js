export default {
  id: 'changedetection-config',
  label: 'changedetection.io Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'changedetection.env') return true;
    const text = intake.text || '';
    return text.includes('PLAYWRIGHT_DRIVER_URL') || (text.includes('WEBDRIVER_URL') && text.includes('HIDE_REFERER'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'changedetection.io web page change monitoring environment configuration — app, browser, notification, proxy, and logging settings.',
    tags: ['changedetection', 'monitoring', 'web-scraping', 'self-hosted', 'config'],
  },
};
