// Cargo.toml enhancement: a TOML file we understand — render package info + dependency links to
// crates.io and docs.rs (the Rust analogue of the package.json → npm enhancement).
export default {
  id: 'cargo-toml',
  label: 'Cargo.toml',
  match: (intake, baseType) => baseType.id === 'toml' && /(^|\/)Cargo\.toml$/i.test(intake.filename || ''),
  loadRenderer: () => import('./render.js'),
};
