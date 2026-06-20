export default {
  id: 'hosts-file',
  label: 'hosts',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop();
    const text = intake.text || '';
    return name === 'hosts' && (text.includes('127.0.0.1') || text.includes('localhost'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'System hosts file — maps hostnames to IP addresses, bypassing DNS resolution.',
    usedFor: [{ label: 'hosts', description: 'Static hostname-to-IP mapping used by the OS resolver before DNS', href: 'https://en.wikipedia.org/wiki/Hosts_(file)' }],
  },
};
