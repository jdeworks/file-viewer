// Registers a Monaco CodeLens provider that shows `ƒ name · N LOC · complexity M` above each
// function, for code languages. Display-only: it reads the model text, never edits it, and
// reuses Monaco's own highlighting. Registered once (idempotent) when Monaco warms up.
import { analyze } from './metrics.js';

const LANGS = ['javascript', 'typescript', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'php', 'swift', 'kotlin', 'scala', 'dart', 'python'];
let registered = false;

export function registerCodeMetrics(monaco) {
  if (registered || !monaco) return;
  registered = true;
  monaco.languages.registerCodeLensProvider(LANGS, {
    provideCodeLenses(model) {
      let functions = [];
      try { ({ functions } = analyze(model.getValue(), model.getLanguageId())); } catch { /* never break the editor */ }
      const lenses = functions.map((f, idx) => ({
        range: new monaco.Range(f.line, 1, f.line, 1),
        id: 'fnmetric-' + idx,
        command: { id: '', title: `ƒ ${f.name} · ${f.loc} LOC · complexity ${f.complexity}` },
      }));
      return { lenses, dispose() {} };
    },
    resolveCodeLens(_model, lens) { return lens; },
  });
}
