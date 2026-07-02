# Markdown

> Richly rendered Markdown with GitHub-flavored extensions, live editing, table tools, and full diff support.

## Format Details
| Field | Value |
|-------|-------|
| Extensions | `.md`, `.markdown`, `.mdown`, `.mkd` |
| MIME type | `text/markdown` |
| Binary/Text | Text |
| Common use | Documentation, README files, blog posts, notes |

## Capabilities

### View
| Feature | Status | Details |
|---------|--------|---------|
| Rendered preview | ✅ | markdown-it with tables, strikethrough, raw HTML sanitization, auto-linking, and smart typography |
| Fenced code blocks | ✅ | Code fences render with language classes; syntax coloring is still planned |
| Tables | ✅ | Standard GFM table rendering |
| Task lists | ◐ | Supported in the TipTap WYSIWYG editor; rendered preview still needs markdown-it task-list support |
| Footnotes | ❌ | `[^ref]` syntax not integrated in markdown-it yet |
| Math (LaTeX) | ❌ | KaTeX/MathJax not integrated |
| Mermaid diagrams | ❌ | Not integrated |
| Source editing + diff | ✅ | Full Monaco editor + text diff |
| Magic selector | ✅ | Click preview element → jump to source line |
| Metadata | ✅ | Word count, heading count, link count |

### Edit
| Feature | Status | Details |
|---------|--------|---------|
| Monaco editor | ✅ | Full keyboard editing with Markdown syntax highlighting |
| WYSIWYG editor | ✅ | TipTap visual editor (toggle in the toolbar); round-trips to CommonMark. Compare / Side-by-side switch back to the code editor automatically |
| Heading levels | ✅ | Toolbar **H** opens a picker — H1–H6 or Normal text — applied in both the Monaco and WYSIWYG editors |
| Bold/italic/strike | ✅ | Toggle on the selection (native marks in WYSIWYG) |
| Link from clipboard | ✅ | Paste URL over selected text to create Markdown link syntax |
| Table insert | ✅ | Size-grid picker → insert GFM table |
| Table sort | ✅ | Right-click column header → sort by that column |
| Save (Companion) | ✅ | Write-back to local file via Companion server |

### Export
| Feature | Status | Details |
|---------|--------|---------|
| Download original | ✅ | Always available |
| Print / Save as PDF | ✅ | Browser print dialog on rendered view |
| Export as HTML | ✅ | Download the rendered, sanitized preview as a standalone HTML file |
| Export as Word (.docx) | ✅ | Convert the rendered preview to a basic OOXML document |

## Settings
| Setting | Default | Description |
|---------|---------|-------------|
| Auto-link URLs | On | Convert bare URLs to links |
| Smart typography | On | Replace `--` → em-dash, `"` → curly quotes |
| Line breaks as `<br>` | Off | Single newlines become hard breaks |

## Example Files
- [`welcome.md`](../examples/welcome.md) — welcome / demo Markdown file

## Gaps / Planned Improvements
| Feature | Priority | Notes |
|---------|----------|-------|
| Math rendering (KaTeX) | High | LaTeX math in `$...$` and `$$...$$` blocks |
| Mermaid diagrams | Medium | Flowcharts, sequence diagrams in fenced blocks |
| Preview syntax highlighting | Medium | Add a local highlighter for fenced code blocks |
| Task-list checkbox rendering | Medium | Add markdown-it task-list support in preview mode |
| Footnote rendering | Medium | Add markdown-it-footnote support |
| Front-matter (YAML) display | Medium | Show/parse YAML front matter as structured metadata |
| Image paste | Medium | Paste image from clipboard → encode as base64 data URI |
| Spell check | Low | Browser spellcheck or custom dictionary |
