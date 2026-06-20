export const plugin = {
  id: 'clojure-lang',
  label: 'Clojure',
  tags: ['clojure', 'clj', 'cljs', 'cljc', 'edn', 'functional', 'lisp', 'jvm'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    const base = name.split('/').pop();
    // Known Clojure build/config files handled by dedicated plugins
    if (base === 'project.clj') return false;
    if (base === 'deps.edn') return false;
    if (base === 'shadow-cljs.edn') return false;
    return name.endsWith('.clj') || name.endsWith('.cljs') || name.endsWith('.cljc') || name.endsWith('.edn');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Clojure is a dynamic, functional Lisp dialect on the JVM. .clj runs on JVM, .cljs compiles to JavaScript, .cljc is cross-platform. .edn (Extensible Data Notation) is Clojure\'s data exchange format.',
    usedFor: [
      { label: 'Clojure.org', description: 'Official Clojure language home', href: 'https://clojure.org/' },
      { label: 'ClojureScript', description: 'Clojure compiled to JavaScript', href: 'https://clojurescript.org/' },
      { label: 'EDN Format', description: 'Extensible Data Notation spec', href: 'https://github.com/edn-format/edn' },
    ],
  },
};
export default plugin;
