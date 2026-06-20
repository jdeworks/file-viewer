export default {
  id: 'ejabberd-config',
  label: 'ejabberd config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'ejabberd.yml' || n === 'ejabberd.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'ejabberd XMPP server configuration — controls hosts, listeners, modules, authentication, and database backends.',
    usedFor: [{ label: 'ejabberd', description: 'Robust, scalable, and extensible XMPP/MQTT/SIP server', href: 'https://docs.ejabberd.im/admin/configuration/' }],
  },
};
