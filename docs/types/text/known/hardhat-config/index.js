export default {
  id: 'hardhat-config',
  label: 'Hardhat Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'hardhat.config.js' || n === 'hardhat.config.ts';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Hardhat Ethereum/EVM development framework configuration — defines networks, Solidity compiler settings, paths, plugins, and gas reporter options.',
    usedFor: [{ label: 'Hardhat', description: 'Ethereum development environment for professionals', href: 'https://hardhat.org/docs' }],
  },
};
