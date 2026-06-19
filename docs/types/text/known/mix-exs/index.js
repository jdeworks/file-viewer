export default {
  id: 'mix-exs',
  label: 'Elixir/Mix',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop();
    return n === 'mix.exs';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Elixir Mix build file — defines the project name, version, Elixir requirement, dependencies, and OTP application configuration.' },
};
