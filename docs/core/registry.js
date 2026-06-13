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
import pptxType from '../types/pptx/index.js';
import jsonType from '../types/json/index.js';
import ipynbType from '../types/ipynb/index.js';
import imageType from '../types/image/index.js';
import mediaType from '../types/media/index.js';
import codeType from '../types/code/index.js';
import htmlType from '../types/html/index.js';
import emlType from '../types/eml/index.js';
import icsType from '../types/ics/index.js';
import yamlType from '../types/yaml/index.js';
import tomlType from '../types/toml/index.js';
import xmlType from '../types/xml/index.js';
import iniType from '../types/ini/index.js';
import patchType from '../types/patch/index.js';
import logType from '../types/log/index.js';
import geoType from '../types/geo/index.js';
import fontType from '../types/font/index.js';
import subtitleType from '../types/subtitle/index.js';
import vcardType from '../types/vcard/index.js';
import sqliteType from '../types/sqlite/index.js';
import zipType from '../types/zip/index.js';
import epubType from '../types/epub/index.js';

// Order is fallback priority only when confidences tie. `raw` always present as last resort.
export const REGISTRY = [
  markdownType,
  pdfType,
  csvType,
  xlsxType,
  docxType,
  pptxType,
  htmlType,
  emlType,
  icsType,
  yamlType,
  tomlType,
  xmlType,
  iniType,
  patchType,
  logType,
  subtitleType,
  vcardType,
  geoType,
  ipynbType,
  jsonType,
  imageType,
  mediaType,
  fontType,
  sqliteType,
  epubType,
  zipType,
  codeType,
  rawType,
];

export function getType(id) {
  return REGISTRY.find((t) => t.id === id) || null;
}

export const FALLBACK_TYPE = rawType;
