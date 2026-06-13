// Plugin registry — the single source of truth for which file types exist.
//
// Client-side code cannot list directories, so adding a type means TWO touches:
//   1) create docs/types/<id>/  (index.js, detect.js, renderer.js, metadata.js, settings.default.json)
//   2) add ONE line below.
// Everything else about a type stays inside its own folder.
//
// ── Module descriptor contract (default export of types/<id>/index.js) ──────────
//   {
//     id: string,                       // unique, matches folder name
//     label: string,                    // human label for the type dropdown
//     detect(intake) => number,         // 0..1 confidence. MUST be cheap (runs for every file).
//     capabilities: {                   // what the core shell should offer for this type
//       rawView:   boolean,             // show Monaco raw editor
//       preview:   boolean,             // show rendered iframe preview
//       diff:      boolean,             // editable -> keep original, offer diff
//       magicSelector: boolean,         // source<->render mapping
//       screenshot:    boolean,         // rendered-content screenshot
//     },
//     syntaxLanguage: string|null,      // Monaco language id for highlighting
//     loadRenderer() => Promise<{render}>,   // lazy: heavy deps live here, not at detect time
//     loadMetadata() => Promise<{extract}>,  // lazy per-type metadata extractor (optional)
//     settingsUrl: URL,                 // settings.default.json location
//   }
//
// ── Intake object (passed to detect / render / extract) ─────────────────────────
//   { filename, mimeType, bytes:Uint8Array, text, textSample, isPaste, size, lastModified }

import rawType from '../types/raw/index.js';
import markdownType from '../types/markdown/index.js';
import pdfType from '../types/pdf/index.js';
import csvType from '../types/csv/index.js';
import xlsxType from '../types/xlsx/index.js';
import docxType from '../types/docx/index.js';

// Order is fallback priority only when confidences tie. `raw` always present as last resort.
export const REGISTRY = [
  markdownType,
  pdfType,
  csvType,
  xlsxType,
  docxType,
  rawType,
];

export function getType(id) {
  return REGISTRY.find((t) => t.id === id) || null;
}

export const FALLBACK_TYPE = rawType;
