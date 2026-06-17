// go.mod enhancement: show the module path, the Go version, and each required module with a
// link to its pkg.go.dev page. Handles both single-line `require x v1` and `require ( … )` blocks.
export default {
  id: 'go-mod',
  label: 'go.mod',
  match: (intake) => /(^|\/)go\.mod$/i.test(intake.filename || ''),
  loadRenderer: () => import('./render.js'),
  loadMetadata: () => import('./metadata.js'),
};
