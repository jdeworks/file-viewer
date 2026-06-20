function hasReasonContent(text) {
  if (!text) return false;
  const sample = text.slice(0, 2000);
  return /\blet\s+/.test(sample) && (/\bmodule\s+/.test(sample) || /\btype\s+/.test(sample) || /\bopen\s+/.test(sample));
}

export const plugin = {
  id: 'reason-lang',
  label: 'Reason',
  tags: ['reason', 're', 'rei', 'ocaml', 'react', 'reasonml'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.rei')) return true;
    if (name.endsWith('.re')) {
      return hasReasonContent(intake.text);
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Reason (ReasonML) is a syntax extension and toolchain for OCaml. It provides a familiar JavaScript-like syntax while retaining the strong type system of OCaml, popular for React development via ReasonReact.',
    usedFor: [
      { label: 'Reason', description: 'Official Reason language site', href: 'https://reasonml.github.io/' },
      { label: 'ReasonReact', description: 'React bindings for Reason', href: 'https://reasonml.github.io/reason-react/' },
    ],
  },
};
export default plugin;
