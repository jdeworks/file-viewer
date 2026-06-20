export const plugin = {
  id: 'solidity-lang',
  label: 'Solidity',
  tags: ['solidity', 'ethereum', 'smart-contract', 'blockchain', 'evm'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.sol')) return false;
    const text = (intake.text || '').slice(0, 2000);
    if (!text.includes('pragma solidity') && !text.includes('contract ')) return null;
    return true;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Solidity is the primary object-oriented programming language for writing Ethereum smart contracts.',
    usedFor: [
      { label: 'soliditylang.org', description: 'Official Solidity language documentation', href: 'https://soliditylang.org/' },
      { label: 'Ethereum Smart Contracts', description: 'Solidity is the most popular language for EVM smart contracts', href: 'https://ethereum.org/en/developers/docs/smart-contracts/' },
    ],
  },
};
export default plugin;
