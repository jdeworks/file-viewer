# Metadata Extraction Overview

This app is static and client-only. Metadata extraction runs in the browser from the active
`intake` object and must not execute the opened file, call off-origin services, add telemetry, or
load new parser stacks. Extractors should use browser-native APIs or libraries already vendored in
`docs/vendor/`, and they should stay bounded for large or malformed files.

## Runtime Flow

1. `docs/core/intake.js` creates an intake object with filename, MIME, bytes, text, size, and browser
   file timestamps.
2. `docs/core/detect.js` selects a base type from `docs/core/registry.js`.
3. `docs/known/registry.js` may attach a known-file enhancement such as Dockerfile, OpenAPI, or
   package manifest renderers.
4. `docs/core/meta-drawer.js` renders generic rows, then appends rows from:
   - `state.type.loadMetadata().extract(intake)`
   - `state.known.loadMetadata().extract(intake)` when an enhanced known-file view is active

Each extractor returns rows shaped as `{ label, value }`. The drawer catches extractor failures, so
malformed metadata should fail closed and leave the rest of the drawer usable.

## Safety Rules

- Do not execute source files, document scripts, macros, formulas, or embedded active content.
- Do not make CDN, analytics, telemetry, tile, font, or other off-origin requests.
- Prefer header, central-directory, manifest, and already-parsed structure reads.
- Keep scans bounded. For chunked binary formats, stop after metadata chunks or a small fixed cap.
- Avoid full archive extraction in metadata. Listing headers is fine; decoding payloads belongs in
  explicit render/open actions.
- For text formats, reuse existing structured parsers where available instead of adding regex-only
  scraping for complex grammars.

## Type-Family Coverage

Images and media:
- Images report decoded dimensions plus container/header details for PNG, GIF, WebP, ICO, and JPEG
  EXIF where present.
- Audio/video report browser-probed duration/dimensions, ID3 tags, and bounded header facts for WAV,
  MP3, and ISO BMFF media.

Documents and ebooks:
- PDF uses pdf.js metadata for pages and document info.
- DOCX, PPTX, XLSX, and ODF read standard embedded property XML or existing workbook/document
  libraries.
- EPUB, FB2, MOBI, LRF, and comic archives expose book/container metadata without executing content.

Text, data, config, and mail:
- JSON, YAML, TOML, XML, CSV, INI/env, logs, patches, subtitles, markdown, HTML, GeoJSON/GPX, ICS,
  vCard, notebooks, EML, and MBOX expose validation, structure counts, date/bounds ranges, and
  format-specific summaries.
- Known-file metadata exists for selected manifests/configs such as Dockerfile, OpenAPI, Go modules,
  requirements, Gemfile, Pipfile, CODEOWNERS, .editorconfig, .gitignore, and Gradle files.

Archives, databases, and binary:
- ZIP reads central-directory facts, compression methods, encrypted-entry counts, image counts, and
  newest-entry dates.
- Generic archives use header-only format detection and bounded TAR block inspection.
- SQLite reports table counts through sql.js plus pure header fields from the 100-byte database
  header.
- Generic hex/binary currently has no type-level metadata hook beyond generic drawer rows.

Code, 3D, and fonts:
- Code metadata reports line/comment/TODO counts plus local JS/TS import/export/class heuristics and
  existing function complexity summaries.
- STL, OBJ, PLY, and glTF/GLB expose mesh/header counts and dimensions from existing mesh parsers.
- Font metadata reads sfnt tables for family names, units per em, glyph count, weight, width, and
  collection count where available.

## Test Coverage

Focused parser tests:
- `node tests/image-media-metadata.test.mjs`
- `node tests/archive-metadata.test.mjs`
- `node tests/metadata-owned.test.mjs`
- `node tests/movediff.test.mjs`

Browser and trust coverage:
- `node tests/smoke.mjs`
- `./scripts/check.sh`

`./scripts/check.sh` regenerates `docs/asset-manifest.json`, runs unit/parser coverage, and runs the
full smoke suite, including the zero off-origin request guarantee.
