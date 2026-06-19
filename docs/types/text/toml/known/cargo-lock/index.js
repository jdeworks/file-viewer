// Cargo.lock enhancement: show version badge, total crate count, workspace member list.
// Note: Cargo.lock is TOML (not to be confused with Cargo.toml, which is also TOML).
export default {
  id: 'cargo-lock',
  label: 'Cargo.lock',
  match: (intake, baseType) => baseType.id === 'toml' && /(^|\/)Cargo\.lock$/.test(intake.filename || ''),
  loadRenderer: () => import('./renderer.js'),
};
