export default {
  id: 'rebar-config',
  label: 'Erlang rebar3',
  match(intake) {
    const n = (intake.name || '').toLowerCase();
    return n === 'rebar.config' || n === 'rebar3.config';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Erlang rebar3 build configuration — defines project dependencies, OTP version requirements, plugins, profiles, and dialyzer settings.',
    usedFor: [
      { label: 'Erlang projects', description: 'OTP applications and libraries built with rebar3' },
    ],
  },
};
