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

## File Examples Compatibility Matrix

File Examples is treated as a format catalogue, edge-case checklist, and optional source of
validated external samples. Do not assume files downloaded from that site are valid or licensed for
shipping. Promote only files that are locally validated, useful in the viewer, and provenance-safe.

Matrix columns for each format:

- Format and extensions.
- Viewer type or planned plugin.
- Support level: full, partial, inspect-only, error-fixture, or unsupported.
- Preview depth: rendered, structured table/tree, header summary, hex, or friendly note.
- Metadata depth: basic, structural, content-specific, security-specific.
- Edit/export depth: raw edit, structured edit, binary edit, export conversions, none.
- Security checks: active content, double extension, MIME/magic mismatch, secrets, formulas,
  macros/scripts, encryption/passwords, EXIF/privacy, archive traversal, or executable risk.
- Sample status: built-in sample, incoming triage sample, external candidate, missing, broken
  fixture.
- Known parser gaps.
- Test coverage: unit/parser, smoke open, smoke interaction, dark/light, mobile, error path.

Seed rows for high-priority supported formats:

| Format | Viewer type | Support | Preview | Metadata | Edit/export | Security checks | Sample status | Known gaps | Tests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| JSON `.json` | `json` | full | sortable tree | structure counts, parse mode, generic text | raw edit, YAML/minified export | JSONC recovery warns on comments/trailing commas | built-in | JSON5 single quotes/unquoted keys/NaN still planned | smoke + custom diff |
| CSV `.csv` | `csv` | full | table | delimiter, rows, line facts | raw edit, JSON/XLSX export | formula-injection warnings planned | built-in | mixed delimiter recovery planned | smoke + export |
| Markdown `.md` | `markdown` | partial+editing | rendered HTML | generic text and headings where available | raw edit, tools menu, DOCX/HTML/PDF export | sanitized HTML | built-in | WYSIWYG/table-cell mapping planned | smoke + tool tests |
| PDF `.pdf` | `pdf` | full | rendered pages | pages, document info | page delete/rotate/image insert/merge | script/macros not executed; password samples missing | built-in | password unlock flow missing | smoke editing |
| ZIP `.zip` | `zip` | partial | entry table and archive tree | counts, compression, encryption | open entries | encrypted entry warning; traversal checks | built-in + locked sample | password entry unlock missing | smoke archive |
| SQLite `.sqlite` | `sqlite` | full | tables and query | tables plus header facts | read-only queries | password/encryption samples missing | built-in | password unlock flow missing | smoke query |
| EML/MBOX `.eml`, `.mbox` | `eml`, `mbox` | partial | message cards/body | headers, body kind, attachments | none | sanitized HTML, no remote loads | built-in | MSG dark-mode/noise audit remains | smoke mail |
| GLB/glTF `.glb`, `.gltf` | `gltf` | partial | mesh canvas with base material colors | mesh counts/dimensions/material counts | mesh export not yet | malformed GLB error path | built-in + incoming triage | textures/advanced PBR still missing | smoke mesh + parser |
| Images `.png`, `.jpg`, `.gif`, `.webp`, `.bmp` | `image` | full | decoded image | dimensions, EXIF/container where supported | text overlay, PNG/JPEG/WebP export | EXIF privacy warnings planned | built-in sourced samples | broader real-photo corpus needed | smoke image edit/export |
| Code `.py`, `.js`, `.ts`, `.go`, etc. | `code` | partial | Monaco raw/editor | LOC, comments, complexity where parsed | raw edit/format where available | executable-risk metadata planned | built-in language samples | language-specific labels/settings still need expansion | smoke CodeLens |
| `.env` | `env` | full+sensitive | redacted preview | variable/sensitive counts, text facts | raw edit with reveal controls | secrets redaction; no copy of sensitive values | built-in | theme audit ongoing | smoke redaction |
| SSH config | `ssh-config` | full+sensitive | structured command cards | hosts, identities, jumps, security notes | raw edit | sensitive paths/options surfaced carefully | built-in | more host/key summaries possible | smoke dark mode |

Category-level triage from the current File Examples catalogue:

| File Examples category | Example extensions shown there | Current status | Next matrix action |
| --- | --- | --- | --- |
| Document | `.docx`, `.pdf`, `.doc` | strong for PDF/DOCX; legacy `.doc` inspect-only gap | Add `.doc` row and sample/error expectation. |
| Spreadsheet | `.xlsx`, `.csv`, `.xls` | strong for XLSX/CSV; legacy `.xls` likely inspect-only | Add `.xls` row and decide parser vs friendly note. |
| Presentation | `.pptx`, `.odp`, `.ppt` | PPTX/ODP present; `.ppt` gap | Add legacy binary Office rows. |
| Image | `.jpg`, `.png`, `.gif` | broad raster support, editing/export present | Expand per-extension rows for AVIF/HEIF/BMP/ICO/WebP/SVG/RAW. |
| Audio | `.mp3`, `.wav`, `.ogg` | media playback plus selected metadata | Add codec/container rows for OGG/FLAC/M4A/WMA. |
| Video | `.mp4`, `.mkv`, `.avi` | browser playback plus ffmpeg opt-in for non-native | Add rows for MKV/MOV/WebM/AVI/WMV/FLV/TS. |
| Code | `.js`, `.py`, `.html` | Monaco/code metrics and many samples | Generate Monaco-language coverage matrix with missing samples. |
| Font | `.ttf`, `.otf`, `.woff` | font specimen and sfnt metadata | Add WOFF/WOFF2/collection rows and samples. |
| Ebook | `.epub`, `.mobi`, `.azw3` | EPUB/MOBI/FB2/LRF/comic partial | Add AZW3/KF8, PDF-ebook, and longer public-domain samples. |
| Archive | `.zip`, `.rar`, `.7z` | ZIP strong; RAR/7z partial/friendly notes | Add password/unlock and lazy-folder rows. |
| Executable | `.exe`, `.apk`, `.msi` | inspect-only/security warning target | Add PE/APK/MSI header metadata rows; never execute. |
| Database | `.db`, `.sqlite`, `.mdb` | SQLite strong | Add MDB/ACCDB/Parquet-adjacent inspect rows. |
| Configuration | `.ini`, `.yaml`, `.toml` | strong for common text configs | Add `.properties`, `.conf`, `.cfg`, `.jsonc`, kubeconfig specifics. |
| Disk Image | `.iso`, `.img`, `.vmdk` | hex/ROM/disk image gaps | Add inspect-only rows for ISO/IMG/VMDK/DMG. |
| Virtual Machine | `.vdi`, `.ova`, `.vmx` | v86 path exists but broad VM formats gap | Add inspect-only OVA/OVF/VDI/VMX rows. |
| 3D Models | `.obj`, `.stl`, `.fbx` | STL/OBJ/PLY/glTF/3MF strong/partial | Add FBX/DAE/STEP/STP and material/texture gap rows. |
| Vector Graphics | `.ai`, `.eps`, `.svg` | SVG strong, AI/EPS gaps | Add PostScript/EPS/AI inspect/safe-render rows. |
| Subtitles | `.srt`, `.vtt`, `.ass` | SRT/VTT path present | Add ASS/SSA row and sample. |
| CAD Files | `.dwg`, `.dxf`, `.step` | mostly unsupported/inspect-only | Add DXF text preview and STEP metadata candidate rows. |
| Design Files | `.psd`, `.sketch`, `.fig` | Sketch/Procreate/Clip partial, PSD/XCF gaps | Add layered-format rows and sample requirements. |
| Data Files | `.parquet`, `.avro`, `.hdf5` | mostly unsupported | Add inspect-only rows for Parquet/Avro/HDF5/Arrow/JSONL. |
| GIS & Maps | `.geojson`, `.kml`, `.gpx` | GeoJSON/GPX strong | Add KML/KMZ/Shapefile rows. |
| Email & Calendar | `.eml`, `.mbox`, `.pst` | EML/MBOX/ICS strong, MSG partial | Add PST/OST and MSG theme/error rows. |
| Scripting | `.sh`, `.ps1`, `.bat` | code/raw support | Add executable-risk metadata per script extension. |
| Markup & Templates | `.tex`, `.rst`, `.adoc` | raw/code mostly | Add render candidates for RST/AsciiDoc/LaTeX summary. |
| Firmware & Embedded | `.hex`, `.bin`, `.elf` | binary/hex mostly | Add Intel HEX/ELF metadata rows. |
| Security & Crypto | `.pem`, `.crt`, `.csr` | PEM/cert strong and private-key safe | Add PFX/P12/JKS/age/gpg inspect rows. |
| Science & Research | `.fits`, `.nc`, `.mat` | mostly unsupported | Add FITS/NetCDF/MAT/NIfTI metadata rows. |
| AI & Machine Learning | `.onnx`, `.pt`, `.h5` | mostly unsupported | Add model-header metadata rows; never execute pickle/code. |
| Blockchain & Web3 | `.sol`, `.json`, `.move` | code/JSON support | Add Solidity/Move language labels and samples. |
| Gaming & Mods | `.unitypackage`, `.uasset`, `.tscn` | ROM headers partial; broad game assets gap | Add Godot/Unity/Unreal inspect rows. |
| IoT & Smart Devices | `.json`, `.jsonld`, `.xml` | base structured support | Add JSON-LD and device-manifest rows. |
| DevOps & CI/CD | `.yml`, `.groovy`, `.yaml` | YAML/code plus known files partial | Add GitHub Actions/GitLab/Jenkins rows. |
| Accessibility | `.html`, `.docx`, `.json` | base support | Add accessibility audit metadata candidates. |
| Medical & Health | `.dcm`, `.json`, `.hl7` | DICOM/HL7 gaps | Add DICOM metadata with privacy warnings; HL7 text parser row. |
| Automation & RPA | `.xaml`, `.json`, `.py` | base XML/JSON/code | Add XAML workflow metadata row. |
| Localization & i18n | `.po`, `.xlf`, `.json` | JSON/XML base | Add PO/XLIFF/strings plural-count rows. |
| Legal & Compliance | `.docx`, `.pdf`, `.md` | base document support | Add redaction/privacy metadata candidates. |
| Education & Learning | `.zip`, `.json`, `.xml` | archive/structured base | Add SCORM/xAPI package row. |
| API & Integration | `.yaml`, `.json`, `.graphql` | OpenAPI enhanced; GraphQL gap | Add GraphQL schema/query row. |
| Typography & Typesetting | `.cls`, `.sty`, `.bib` | raw/code only | Add BibTeX/TeX package metadata rows. |
| Networking & Protocols | `.pcap`, `.pcapng`, `.har` | HAR strong; PCAP gap | Add PCAP/PCAPNG metadata rows. |
| Logging & Monitoring | `.log`, `.jsonl`, `.prom` | log strong; JSONL/Prom gaps | Add JSONL and Prometheus parser rows. |
| Testing & Automation | `.xml`, `.feature`, `.js` | base XML/code | Add Gherkin feature metadata row. |
| Packaging & Distribution | `.json`, `.cfg`, `.toml` | package manifests partial | Add pyproject/npm lock/wheel/package rows. |
| Print & Publishing | `.indd`, `.idml`, `.qxp` | unsupported | Add IDML ZIP/XML inspect row; proprietary friendly notes. |
| Backup & Recovery | `.bak`, `.sparsebundle`, `.vbk` | unsupported/hex | Add inspect-only rows with safety warnings. |
| Robotics & Drones | `.urdf`, `.sdf`, `.bag` | XML base; ROS bag gap | Add URDF/SDF metadata and ROS bag inspect row. |
| Music Production | `.mid`, `.als`, `.flp` | MIDI/Ableton strong, FLP gap | Add FLP/project metadata row. |
| Photography & RAW | `.cr3`, `.nef`, `.arw` | image metadata gaps | Add RAW header/EXIF preview rows. |

File Examples tool and edge-case parity backlog:

| Source area | File Examples coverage | Viewer parity status | Next implementation action |
| --- | --- | --- | --- |
| Validators | JSON, XML, CSV syntax/format/minify | JSON/XML/CSV render and partial validation exist | Add user-visible validation panels with line/column facts. |
| Generator | CSV, JSON, XML, TXT, PDF samples | local new-file exists; no sample generator | Add local sample generator wizard for simple structured files. |
| Inspector | MIME, encoding, magic bytes | generic metadata has extension/content/BOM; magic mismatch partial | Add magic-vs-extension row and warning severity. |
| Checksums | MD5/SHA family | not generally shown | Add optional local hashes under advanced metadata. |
| Diff | CSV/JSON/XML/text | Monaco and custom JSON/XML/HTML diffs exist | Add CSV-aware diff row and improve custom diff fallback. |
| Edge cases | 16 malformed files across JSON/CSV/XML/PDF/PNG/JPEG/ZIP/encoding | JSON comments/trailing commas recovered; others mostly planned | Add fixtures for CSV mixed delimiter/inconsistent rows, XML bad encoding, truncated PNG/JPEG/ZIP. |

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
