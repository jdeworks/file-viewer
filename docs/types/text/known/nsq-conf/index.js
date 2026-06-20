export const plugin = {
  id: 'nsq-conf',
  label: 'NSQ config',
  tags: ['nsq', 'messaging', 'queue'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'nsqd.cfg' || n === 'nsqlookupd.cfg' || n === 'nsq.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'NSQ distributed messaging system configuration — network addresses, storage, timeouts, TLS, and message limits.',
    usedFor: [{ label: 'nsqd / nsqlookupd config', description: 'Controls TCP/HTTP listener addresses, data path, message timeouts, and TLS settings', href: 'https://nsq.io/components/nsqd.html' }],
  },
};

export default plugin;
