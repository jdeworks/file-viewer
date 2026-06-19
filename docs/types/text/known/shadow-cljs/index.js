export default {
  id: 'shadow-cljs',
  label: 'Shadow-cljs',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop();
    return n.toLowerCase() === 'shadow-cljs.edn';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Shadow-cljs build tool configuration — source paths, npm dependencies, and build targets for ClojureScript.' },
};
