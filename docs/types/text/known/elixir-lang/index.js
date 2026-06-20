function hasElixirContent(text) {
  if (!text) return false;
  return /\b(defmodule|def |defp |use |alias |import )\b/.test(text);
}

export const plugin = {
  id: 'elixir-lang',
  label: 'Elixir',
  tags: ['elixir', 'functional', 'beam', 'erlang', 'phoenix'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const ext = name.includes('.') ? name.split('.').pop() : '';
    if (ext === 'ex' || ext === 'exs') {
      return hasElixirContent(intake.text);
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Elixir source file — a dynamic, functional language designed for building scalable and maintainable applications on the Erlang VM (BEAM).',
    usedFor: [
      { label: 'Elixir documentation', description: 'Official Elixir language documentation', href: 'https://elixir-lang.org/docs.html' },
      { label: 'Phoenix Framework', description: 'The popular Elixir web framework', href: 'https://www.phoenixframework.org/' },
    ],
  },
};
export default plugin;
