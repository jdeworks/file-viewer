# EPUB

> The open e-book standard — a ZIP container of XHTML chapters, used by publishers and open-source ebook tools worldwide.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.epub` |
| MIME type | `application/epub+zip` |
| Binary / Text | Binary container (ZIP of XHTML + media) |
| Created by | International Digital Publishing Forum (now W3C) |
| Common use | E-books, digital magazines, open-access publications |
| Spec / Docs | [EPUB 3 spec](https://www.w3.org/publishing/epub3/) |

## Capabilities

### View

| Feature | Status | Details |
|---------|--------|---------|
| Chapter rendering | ✅ | One XHTML spine item rendered at a time with viewer-controlled typography |
| Table of contents | ✅ | Sidebar TOC built from the NCX/OPF manifest; click to jump |
| Chapter navigation | ✅ | Prev / Next buttons + keyboard arrow keys |
| Spine position indicator | ✅ | "Chapter N / Total" shown in reader toolbar |
| Inline images | ✅ | All `<img>` and SVG `<image>` refs rewritten to blob: URLs — no off-origin requests |
| Internal links | ✅ | `<a href>` within the book navigate to the correct spine item |
| External links | ✅ | Open in a new tab with `rel=noopener` |
| XSS sanitization | ✅ | DOMPurify strips scripts, event handlers, `<style>`, `<link>`, and `srcset` before rendering |
| Metadata | ✅ | Title, creator, chapters, TOC entries, language, publisher, date, identifier, and rights when present |
| Reading progress | ✅ | Chapter index and scroll position saved per file via `fingerprint` + `localStorage` |
| Diff/compare | ❌ | Not supported (binary container) |

### Reader Preferences

| Feature | Status | Details |
|---------|--------|---------|
| Font size | ✅ | A− / A+ buttons; range 12–32 px; reflows text |
| Font family | ✅ | Toggle between Serif (Georgia) and Sans (system-ui) |
| Reading theme | ✅ | Light, Sepia, Dark |
| Two-column mode | ✅ | 1 or 2 CSS columns for wide screens |
| Preference persistence | ✅ | All preferences saved globally across books in `localStorage` |

### Export

| Feature | Status | Details |
|---------|--------|---------|
| Download original | ✅ | Always available |
| Export to HTML | ❌ | Not implemented |
| Export single chapter | ❌ | Not implemented |

## Real-World Examples

- [`sample.epub`](../examples/sample.epub) — full EPUB with TOC, chapters, and images

## Known Limitations

- One spine item (chapter) rendered at a time — no continuous scroll across all chapters
- DOMPurify removes `<style>` and `<link>` tags, so chapter-specific CSS is not applied; layout relies on the viewer's own stylesheet
- Encrypted/DRM-protected EPUBs are not supported (DRM requires a vendor key)
- `srcset` attributes are stripped to prevent off-origin image probing
- Non-XHTML spine items (SVG documents used as full pages) may not render correctly

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Chapter-level CSS injection | Medium | Medium | Allow a per-book `<style>` namespace to avoid conflicts with app CSS |
| Export to single-file HTML | Medium | Medium | Concatenate spine items, rewrite image refs to data: URLs |
| Continuous scroll mode | Low | Hard | Stream chapters progressively; large books need virtual scroll |
| DRM-free decryption | Low | Hard | Adobe DRM / Readium LCP require external license servers |
| Font embedding | Low | Medium | Load embedded OTF/WOFF resources from the ZIP via FontFace API |
| Search within book | Medium | Medium | Full-text index across spine items; highlight matches |
