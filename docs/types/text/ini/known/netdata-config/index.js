export default {
  id: 'netdata-config',
  label: 'Netdata Config (INI)',
  match(intake, baseType) {
    if (baseType?.id !== 'ini') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'netdata.conf' || n === 'netdata.conf.d') return true;
    const t = intake.text || '';
    if (t.includes('[global]') && t.includes('hostname') && t.includes('update every')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Netdata real-time monitoring agent configuration — global settings, web API, plugins, and database engine.',
    usedFor: [{ label: 'Netdata', description: 'Real-time infrastructure monitoring with thousands of built-in metrics', href: 'https://www.netdata.cloud/' }],
  },
};
