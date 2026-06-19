export default {
  id: 'deps-edn',
  label: 'Clojure CLI',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop();
    return n.toLowerCase() === 'deps.edn';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Clojure CLI / tools.deps dependency spec — defines library dependencies, source paths, and alias configurations.' },
};
