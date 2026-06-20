export default {
  id: 'foundry-toml',
  label: 'Foundry Config',
  match(intake, baseType) {
    if (baseType && baseType.id !== 'toml') return false;
    const name = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    if (name !== 'foundry.toml') return false;
    const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
    return /\[profile\.default\]/.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Foundry Solidity testing framework configuration — defines profiles, compiler settings, RPC endpoints, and Etherscan keys.',
    usedFor: [{ label: 'Foundry', description: 'Blazing fast, portable and modular toolkit for Ethereum application development', href: 'https://book.getfoundry.sh/reference/config/overview' }],
  },
};
