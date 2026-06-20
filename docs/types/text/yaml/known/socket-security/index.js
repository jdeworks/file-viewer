export default {
  id: 'socket-security',
  label: 'Socket Security',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    return n === 'socket.yml' || n === '.socket.yml' || n === 'socket.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Socket.dev security configuration — protects against supply chain attacks in npm, PyPI, and other package ecosystems.',
    usedFor: [{ label: 'Supply chain security', description: 'Socket.dev monitors packages for malware, typosquatting, and vulnerabilities', href: 'https://docs.socket.dev/docs/socket-yml' }],
  },
};
