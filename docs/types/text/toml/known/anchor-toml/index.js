export default {
  id: 'anchor-toml',
  label: 'Anchor Config',
  match(intake, baseType) {
    if (baseType && baseType.id !== 'toml') return false;
    const name = (intake.filename || intake.name || '').split('/').pop();
    if (name !== 'Anchor.toml') return false;
    const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
    return /\[programs\.(localnet|devnet|mainnet|testnet)\]/.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Anchor Solana smart contract framework configuration — defines program IDs per cluster, provider settings, and workspace members.',
    usedFor: [{ label: 'Anchor', description: 'Framework for Solana\'s Sealevel runtime', href: 'https://www.anchor-lang.com/docs' }],
  },
};
