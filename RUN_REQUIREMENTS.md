# File Viewer Long-Run Requirements

## Operating Rules

- Work in small, committed increments on `dev`.
- After each increment, run `./scripts/check.sh`; it must pass before commit.
- If files under `docs/` are added or removed, keep `docs/asset-manifest.json` current.
- Push every completed increment.
- Use subagents for research/audit work where useful.

## Sample Library

- Every registered file type needs a meaningful dedicated sample.
- Every enhanced or known-file renderer needs a dedicated sample.
- Samples should contain realistic, useful data rather than mechanical placeholders.
- Prefer CC0, public-domain, or clearly free examples when importing from the internet.
- Track provenance for externally sourced samples where practical.
- Add more programming samples using Monaco language support as the guide, including Python, JavaScript, TypeScript, JSX/TSX, Ruby, Go, Rust, Java, C, C++, C#, shell, SQL, HTML, CSS, and other available languages.
- Replace placeholder-like Flash, ROM, image, and binary samples with valid examples that exercise the renderer meaningfully.
- Metagame samples must not be visible before the metagame is unlocked.
- Keep sample browsing useful: folder/category browsing and "show all" stay; text filtering stays; duplicate category chip filtering should be removed.
- Add tests that open every indexed sample and catch preview crashes, bad detections, off-origin requests, and dark-mode readability regressions where feasible.

## Preview And Interaction UX

- Fix split-view drag locking, including with `sample.ans` and iframe previews.
- Continue redesigning compare/diff interactions so users can compare with files already in the folder/sidebar without being forced into a file picker.
- Improve move-aware diff so moves plus unrelated insertions are reported correctly.
- Review each file type for useful interactions such as sorting, filtering, folding, toggling, zooming, searching, exporting, or safe online checks.
- JSON preview should render clean disclosure controls, avoid broken escaped glyphs, and support useful key sorting.
- Sorting should be considered for structured/table-like types such as JSON, CSV, XLSX, text lines, and similar formats.
- PWA install suppression should avoid noisy `beforeinstallprompt.preventDefault()` console messages where possible while preserving the no-install promise.
- Metadata should include a file-type description/link explaining what the format is used for.
- Sample tiles should expose a short hover description of what the sample demonstrates.
- Password-protected formats such as PDF, SQLite, ZIP, and similar containers should have password-protected samples and unlock flows where the user can provide the password to view contents.
- Sensitive file types that may contain protected data, such as `.env` and SSH config, should open in rendered-view mode by default and hide or blur values until explicitly revealed.

## Metadata

- Perform a thorough metadata audit for every registered type and every enhanced known-file view.
- Include generic metadata candidates: size, extension, MIME, detected type/confidence, binary/text status, encoding, BOM, line endings, line count, trailing newline, and local hashes/fingerprints where useful.
- Add content-specific metadata where useful:
  - Text/code: lines, words, characters, blank/comment lines, language, functions/classes, imports/dependencies, complexity.
  - CSV/XLSX: delimiter, quote style, line breaks, rows/columns/sheets, header presence, inconsistent rows, sortable columns.
  - JSON/YAML/TOML/XML/INI: keys, depth, node counts, schema-ish hints, duplicate or suspicious keys.
  - SSH config: host count, distinct host patterns, identity files, users, ports, proxy/jump settings, forwarded keys, security-relevant options.
  - Requirements/package files: package counts, pinned/unpinned versions, extras, markers, index URLs, and safe optional online issue/update checks with explicit warning.
  - Docker Compose: services, images, builds, ports, networks, volumes, relative bind mounts versus Docker-managed volumes, environment/secrets, and potential issue hints.
  - Images/media/documents/ebooks/archives/binaries: dimensions, pages, duration, codecs, EXIF/ICC, compression, encryption, headers, architecture/version fields, and safety-relevant flags.
- For optional internet checks, clearly show what data would be sent, require explicit action, and handle offline mode.
- Metadata must respect existing security rules for secrets, PEM/private keys, JWT signatures, `.env`, archives, email, and companion saves.

## Enhanced Views

- Review each enhanced renderer one by one for better summaries, explanations, sorting, links, warnings, and optional safe interactions.
- `requirements.txt` metadata should include package counts and dependency facts in addition to the existing easter egg.
- Docker Compose enhanced view should link image references where appropriate, explain `build: .`, distinguish bind mounts from named volumes, and surface potential issues.
- Claude Desktop config should be treated as more than generic MCP config when it contains additional Claude-specific configuration.
- SSH config dark-mode readability must be fixed.

## Ebooks And Long Reading

- E-book readers should align with common reader behavior: font, size, line height, margins, theme, phone-friendly fullscreen, and settings access.
- MOBI samples should be long enough to exercise reading behavior and should not start with accidental selected/highlighted-looking text.

## Research Backlog

- Maintain a concrete implementation backlog from the sample, metadata, and interaction audits.
- Use the backlog to drive follow-up implementation increments until all items above are addressed.
- As the final queue item, perform another thorough file-type check and produce an enhancement plan for more file types.
