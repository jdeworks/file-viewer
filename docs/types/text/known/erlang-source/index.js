export const plugin = {
  id: 'erlang-source',
  label: 'Erlang',
  tags: ['erlang', 'erl', 'hrl', 'otp', 'functional', 'concurrent'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const isErl = name.endsWith('.erl');
    const isHrl = name.endsWith('.hrl');
    if (!isErl && !isHrl) return false;

    const text = intake.text || '';
    // For .erl files, require Erlang source markers
    if (isErl) {
      const hasErlangMarker = /-module\s*\(/.test(text) || /-export\s*\(/.test(text) || /-import\s*\(/.test(text);
      if (!hasErlangMarker) return false;
    }
    return true;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Erlang is a general-purpose, concurrent, functional programming language originally designed for telecom systems. It is known for fault tolerance and the OTP framework.',
    usedFor: [
      { label: 'erlang.org', description: 'Official Erlang language home', href: 'https://www.erlang.org/' },
      { label: 'OTP Design Principles', description: 'Erlang/OTP documentation', href: 'https://www.erlang.org/doc/design_principles/des_princ.html' },
    ],
  },
};
export default plugin;
