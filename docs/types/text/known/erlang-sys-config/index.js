export default {
  id: 'erlang-sys-config',
  label: 'Erlang sys.config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'sys.config' || n === 'sys.config.src') return true;
    // Erlang term format: starts with [ and contains {app_name, [...]}].
    if (text.trim().startsWith('[') && text.includes('{') && text.match(/\[\s*\{\s*\w+\s*,\s*\[/)) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Erlang/OTP application configuration — a list of {ApplicationName, [{Key, Value}]} tuples configuring OTP applications at runtime.',
    usedFor: [
      { label: 'Erlang/OTP', description: 'Concurrent, distributed runtime system', href: 'https://www.erlang.org/doc/man/config.html' },
      { label: 'Elixir', description: 'Uses sys.config via Mix releases', href: 'https://hexdocs.pm/mix/Mix.Tasks.Release.html' },
    ],
  },
};
