# Metadata Extraction Overview

This app is static and client-only. Metadata extraction runs in the browser from
the active `intake` object and must not execute the opened file, call off-origin
services, add telemetry, or load new parser stacks. Extractors should use
browser-native APIs or libraries already vendored in `docs/vendor/`, and they
should stay bounded for large or malformed files.

All unfinished metadata, sample-library, parser, and compatibility work is
tracked only in the repository [`TASKS.md`](../TASKS.md).

## Runtime Flow

1. `docs/core/intake.js` creates an intake object with filename, MIME, bytes,
   text, size, browser file timestamps, detected text encoding, and bounded
   decode warnings. BOM evidence wins over a conflicting MIME charset;
   BOM-less UTF-16 inference requires a strong alternating-NUL pattern.
2. `docs/core/detect.js` selects a base type from `docs/core/registry.js`.
3. `docs/known/registry.js` may attach a known-file enhancement such as
   Dockerfile, OpenAPI, or package manifest renderers.
4. `docs/core/meta-drawer.js` renders generic rows, then appends rows from:
   - `state.type.loadMetadata().extract(intake)`
   - `state.known.loadMetadata().extract(intake)` when an enhanced known-file
     view is active
5. When the drawer opens, Web Crypto calculates a SHA-256 fingerprint only if
   all file bytes are already loaded. Streamed and truncated files are never
   hashed as though their prefix were the complete file.

Extractors can return `{ label, value, section, dedupeKey, priority }` rows.
The drawer catches extractor failures, so malformed metadata fails closed and
leaves the rest of the drawer usable. Stable dedupe keys resolve semantic
overlap; exact label/value duplicates across sections prefer security, custom,
or open type-specific placement over collapsed generic facts.

## Drawer presentation

- Filename, concrete base type, enhanced-view identity, size, format purpose,
  and the format-information link remain visible without expanding anything.
- Type-specific details and security/privacy findings are open by default.
  Labels for risks, warnings, sensitive values, credentials, JWT/OAuth,
  encryption, signatures, scripts, inline handlers, and remote/external
  resources route to the security section unless an extractor places them more
  explicitly.
- Text structure and advanced file facts are collapsed by default. The latter
  contains MIME/timestamps, extension/content kind, load completeness, BOM,
  decoded text encoding, stable magic-byte identity, and the local SHA-256
  fingerprint. MIME/extension-versus-magic mismatches and executable-content
  signatures are promoted into the open security section.
- Enhanced views use their own label and purpose text. A tailored description
  supplied by the plugin wins; otherwise the drawer supplies a concrete
  enhanced-view explanation while retaining the base format documentation link.

## Safety Rules

- Do not execute source files, document scripts, macros, formulas, or embedded
  active content.
- Do not make CDN, analytics, telemetry, tile, font, or other off-origin
  requests.
- SHA-256 drawer fingerprints are local calculations. Neither the fingerprint
  nor the file is transmitted, and incomplete byte prefixes are labelled as
  unavailable instead of fingerprinted.
- Prefer header, central-directory, manifest, and already-parsed structure
  reads.
- Keep scans bounded. For chunked binary formats, stop after metadata chunks or
  a small fixed cap.
- Avoid full archive extraction in metadata. Listing headers is fine; decoding
  payloads belongs in explicit render/open actions.
- For text formats, reuse existing structured parsers where available instead
  of adding regex-only scraping for complex grammars.
- An optional internet-backed check must remain user-initiated, disclose the
  exact data sent, and expose offline/error guidance without automatic retry.
  The executable viewer's VirusTotal link is the current implementation: it
  sends only the full-file SHA-256 after a click, blocks the click while
  offline, and never uploads file contents.

## Registry audit invariants

The July 2026 audit covers all 144 registered base types and all 896 enhanced
known-file views. `tests/metadata-coverage.test.mjs` keeps the result from
regressing as registries grow:

- every base type has a lazy metadata extractor and concrete format name,
  purpose, and information link;
- every enhanced view has a tailored renderer plus concrete identity, purpose,
  and information link in the drawer;
- registry identifiers remain unique.

Useful structural counts remain extractor-specific: tables expose rows/columns,
archives expose entries and risks, media exposes duration/dimensions, code
exposes line/structure counts, and container formats expose their native header
or manifest facts. The generic layer supplies safe identity, text structure,
load completeness, filename/path spoofing risk, archive-entry name risk,
BOM/encoding diagnostics, magic-byte mismatch risk, executable-content
warnings, and fingerprint facts to every type.

## Type-Family Coverage

Images and media:

- Images report decoded dimensions plus container/header details for PNG, GIF,
  WebP, ICO, and JPEG EXIF where present.
- Audio/video report browser-probed duration/dimensions, ID3 tags, and bounded
  header facts for WAV, MP3, and ISO BMFF media.

Documents and ebooks:

- PDF uses pdf.js metadata for pages and document info.
- DOCX, PPTX, XLSX, and ODF read standard embedded property XML or existing
  workbook/document libraries.
- EPUB, FB2, MOBI, LRF, and comic archives expose book/container metadata
  without executing content.

Text, data, config, and mail:

- JSON, YAML, TOML, XML, CSV, INI/env, logs, patches, subtitles, Markdown, HTML,
  GeoJSON/GPX, ICS, vCard, notebooks, EML, and MBOX expose validation,
  structure counts, date/bounds ranges, and format-specific summaries.
- Known-file metadata extractors enrich selected manifests/configs such as
  Dockerfile, OpenAPI, Go modules, requirements, Gemfile, Pipfile, CODEOWNERS,
  `.editorconfig`, `.gitignore`, and Gradle files. Every other enhanced view
  still receives base/generic facts plus its concrete enhanced identity and
  purpose.

Archives, databases, and binary:

- ZIP reads central-directory facts, compression methods, encrypted-entry
  counts, image counts, and newest-entry dates.
- Generic archives use header-only format detection and bounded TAR block
  inspection.
- SQLite reports table counts through sql.js plus pure header fields from the
  100-byte database header.
- Generic hex/binary retains a lightweight type-level extractor plus the common
  safe drawer facts; specialized binary types add bounded header/container
  structure.

Code, 3D, and fonts:

- Code metadata reports line/comment/TODO counts plus local JS/TS
  import/export/class heuristics and existing function complexity summaries.
- STL, OBJ, PLY, and glTF/GLB expose mesh/header counts and dimensions from
  existing mesh parsers.
- Font metadata reads sfnt tables for family names, units per em, glyph count,
  weight, width, and collection count where available.

## Test Coverage

Focused parser tests:

- `node tests/image-media-metadata.test.mjs`
- `node tests/archive-metadata.test.mjs`
- `node tests/metadata-owned.test.mjs`
- `node tests/metadata-coverage.test.mjs`
- `node tests/metadata-normalize.test.mjs`
- `node tests/movediff.test.mjs`

Browser and trust coverage:

- `node tests/smoke.mjs`
- `./scripts/check.sh --fast` (routine)
- `./scripts/check.sh` (release gate)
- `./scripts/check.sh --exhaustive` (memory-capped full sweep)
