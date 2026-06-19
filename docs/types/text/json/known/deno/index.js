export default {
  id: 'deno-json',
  label: 'deno.json config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return ['deno.json', 'deno.jsonc'].includes(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Deno configuration — import map, tasks, lint/fmt settings, and compiler options.',
    usedFor: [{ label: 'Deno runtime', description: 'Configure Deno projects including import maps and built-in tasks', href: 'https://docs.deno.com/runtime/fundamentals/configuration/' }],
  },
};
