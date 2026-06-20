export default {
  id: 'puma-config',
  label: 'Puma config',
  match(intake) {
    const fullPath = (intake.name || intake.filename || '');
    const name = fullPath.split('/').pop();
    if (name !== 'puma.rb') return false;
    // Match puma.rb at root OR at config/puma.rb
    const dir = fullPath.slice(0, fullPath.length - name.length);
    return dir === '' || /^(.*\/)?config\/?$/.test(dir);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Puma web server configuration — workers, threads, port, environment, preload_app, and plugins.',
    usedFor: [{ label: 'Puma', description: 'Concurrent web server for Ruby/Rack applications', href: 'https://puma.io/' }],
  },
};
