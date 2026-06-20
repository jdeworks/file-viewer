export default {
  id: 'erlang-vm-args',
  label: 'Erlang vm.args',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'vm.args' || n === 'vm.args.src') return true;
    if ((text.includes('-name ') || text.includes('-sname ')) && text.includes('-setcookie')) return true;
    if (text.includes('+K true') || text.includes('+P ') || text.includes('+W w')) {
      if (text.includes('-name') || text.includes('-sname')) return true;
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Erlang VM startup arguments — configures the node name, cookie, scheduler threads, memory, and other BEAM virtual machine settings.',
    usedFor: [
      { label: 'Erlang/OTP', description: 'Configure BEAM virtual machine startup', href: 'https://www.erlang.org/doc/man/erl.html' },
      { label: 'Elixir', description: 'Used in Mix releases to configure the runtime', href: 'https://hexdocs.pm/mix/Mix.Tasks.Release.html' },
    ],
  },
};
