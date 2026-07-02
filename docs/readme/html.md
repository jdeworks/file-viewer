# HTML

> HTML files rendered in a sandboxed iframe with DOMPurify sanitization by default; opt-in script execution; structural DOM diff.

## Format Details
| Field | Value |
|-------|-------|
| Extensions | `.html`, `.htm`, `.xhtml` |
| MIME type | `text/html` |
| Binary/Text | Text |
| Common use | Web pages, email templates, documentation, reports |

## Capabilities

### View
| Feature | Status | Details |
|---------|--------|---------|
| Rendered preview | ✅ | Sandboxed iframe (`sandbox="allow-scripts"`, no `allow-same-origin`) — layout & styles always render; `<img>` src and CSS `url()` only load when same-origin-relative or `data:` — remote/absolute references are blanked by default so opening a file can never silently phone home |
| Script execution | ⚠️ Opt-in | Scripts sanitized by default; user prompt to allow in sandbox (opting in also lifts the off-origin-fetch blocking below, since the raw document is trusted at that point) |
| DOMPurify sanitization | ✅ | `<script>`/`<iframe>`/`<object>`/`<embed>`/`<video>`/`<audio>`/`<source>`/`<track>`/`<form>`/`<meta>`/`<base>`/`<link>` and legacy `background=`/`poster=` stripped outright; remaining `<style>`/`style=""`/`<img src>` are kept but any off-origin `url()`/`src` reference inside them is neutralized — safe by default |
| Source view | ✅ | Full HTML in Monaco with syntax highlighting |
| Structural diff | ✅ | DOM-level diff (not text diff) — shows added/removed/moved elements |
| Text diff | ✅ | Standard text diff also available |
| Metadata | ✅ | Title, meta description, links, images, scripts count |

### Edit
| Feature | Status | Details |
|---------|--------|---------|
| Source editing | ✅ | Full Monaco HTML editor |
| Live preview sync | ✅ | Preview updates on save |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Feature | Status | Details |
|---------|--------|---------|
| Download original | ✅ | Always available |
| Print / Save as PDF | ✅ | Browser print on rendered view |
| Screenshot | ✅ | Captures the sanitized rendered view as a PNG (html2canvas, off-screen same-origin iframe) |

## Example Files
- [`sample.html`](../examples/sample.html) — sample HTML page

## Gaps / Planned Improvements
| Feature | Priority | Notes |
|---------|----------|-------|
| CSS isolation (scoped styles) | Medium | Styles inside viewer may bleed; Shadow DOM could isolate |
| Template variable substitution | Low | Fill in `{{variable}}` placeholders from a JSON data file |
| Accessibility audit | Low | Run axe-core in the sandbox and report issues |
