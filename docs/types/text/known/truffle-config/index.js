export default {
  id: 'truffle-config',
  label: 'Truffle Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'truffle-config.js' && n !== 'truffle.config.js') return false;
    const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
    return /\bnetworks\s*[=:]/.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Truffle Ethereum smart contract development framework configuration — defines networks, Solidity compiler settings, and migration paths.',
    usedFor: [{ label: 'Truffle', description: 'Smart contract development framework for Ethereum', href: 'https://trufflesuite.com/docs/truffle/reference/configuration/' }],
  },
};
