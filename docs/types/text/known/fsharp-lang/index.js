export const plugin = {
  id: 'fsharp-lang',
  label: 'F#',
  tags: ['fsharp', 'fs', 'fsi', 'fsx', 'functional', 'dotnet', 'ml-family'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    const isFs = name.endsWith('.fs');
    const isFsi = name.endsWith('.fsi');
    const isFsx = name.endsWith('.fsx');
    if (!isFs && !isFsi && !isFsx) return false;

    const text = intake.text || '';

    // .fs can be a GLSL fragment shader — if it looks like one, bail out
    if (isFs && (/void\s+main\s*\(/.test(text) || /gl_FragColor/.test(text) || /\#version\s+\d/.test(text))) {
      return null;
    }

    // For .fsi/.fsx always match; for .fs require at least one F# indicator
    if (isFsi || isFsx) return true;

    const hits = [
      /^module\s+/m.test(text),
      /^let\s+/m.test(text),
      /^type\s+/m.test(text),
      /^open\s+/m.test(text),
      /\|>/i.test(text),
      /\bmember\b/.test(text),
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'F# is a functional-first programming language on the .NET platform. .fs files are source, .fsi are interface/signature files, and .fsx are interactive scripts. Note: .fs is also used for GLSL fragment shaders — the plugin skips those.',
    usedFor: [
      { label: 'F# Software Foundation', description: 'Official F# language home', href: 'https://fsharp.org/' },
      { label: 'F# Docs', description: 'Microsoft F# documentation', href: 'https://learn.microsoft.com/en-us/dotnet/fsharp/' },
    ],
  },
};
export default plugin;
