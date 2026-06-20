export default {
  id: 'scrutiny-config',
  label: 'Scrutiny Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'scrutiny.yaml' || n === 'scrutiny.yml') return true;
    const t = intake.text || '';
    // Scrutiny-specific: version + web.listen + notify keys
    return t.includes('version:') && t.includes('web:') && t.includes('listen:') && t.includes('notify:');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Scrutiny hard drive health monitoring dashboard configuration — defines web server, notifications, and logging settings.',
    usedFor: [
      { label: 'Scrutiny', description: 'Configure Scrutiny to monitor hard drive S.M.A.R.T. data and send health alerts.', href: 'https://github.com/AnalogJ/scrutiny/blob/master/docs/CONFIGURATION.md' },
    ],
  },
};
