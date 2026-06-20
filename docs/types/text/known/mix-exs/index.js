// mix.exs enhancement (Elixir/Mix): renders app name, version, Elixir req, OTP application,
// deps separated by env restriction, and aliases count.
export default {
  id: 'mix-exs',
  label: 'Mix',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'mix.exs') return true;
    const t = intake.text || '';
    return /defmodule/.test(t) && (/use Mix\.Project/.test(t) || /def project do/.test(t));
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Elixir Mix build file — defines the project name, version, Elixir requirement, dependencies, and OTP application configuration.' },
};
