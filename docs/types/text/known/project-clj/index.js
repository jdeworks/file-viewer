export default {
  id: 'project-clj',
  label: 'Leiningen',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop();
    return n.toLowerCase() === 'project.clj';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Leiningen build file for Clojure projects — defines project name, version, dependencies, plugins, and build profiles.' },
};
