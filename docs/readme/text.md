# Plain Text

> Universal fallback viewer for `.txt`, generic text, and unrecognized file types — rendered as a pre-formatted block with word/character counts.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.txt`, `.text`, and any file the viewer cannot classify more specifically |
| MIME type | `text/plain` |
| Binary / Text | Text |
| Common use | README files, notes, secrets, configuration snippets, miscellaneous text |
| Spec / Docs | RFC 2046 — `text/plain` media type |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Plain text preview | ✅ | Rendered as `<pre>` block; HTML-escaped |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Word count, character count |
| Screenshot | ✅ | Canvas snapshot of the preview panel |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Convert to other formats | ❌ | Plain text is not converted |

## Relationship to Other Types

The plain-text type (`raw`) is the universal floor — it scores a small non-zero weight for every non-binary file so the viewer always has something to show, even when no more specific type matches. Files with `.txt` or `.text` extensions score slightly higher (0.2 vs 0.05) to favour this type over pure inference.

Types that build on top of plain text and win when their detection passes:

| Type | Detected by | README |
|------|-------------|--------|
| Log | `.log` extension or timestamped + leveled content | [log.md](log.md) |
| Code | Source file extension (`.js`, `.py`, `.go`, …) | [code.md](code.md) |
| Markdown | `.md`, `.markdown` | [markdown.md](markdown.md) |
| CSV/TSV | `.csv`, `.tsv`, `.tab` | [csv.md](csv.md) |
| JSON | `.json`, `.jsonc` | [json.md](json.md) |
| YAML | `.yaml`, `.yml` | [yaml.md](yaml.md) |
| TOML | `.toml` | [toml.md](toml.md) |
| XML | `.xml` and related | [xml.md](xml.md) |

## Real-World Examples

- [`sample.txt`](../examples/sample.txt) — generic plain text file
- [`secret.txt`](../examples/secret.txt) — plain text with sensitive-looking content (tests redaction UI)

## Known Limitations

- No word-wrap toggle (long lines scroll horizontally in the preview `<pre>` block)
- No line numbers in the preview mode (only in Monaco source view)
- Word count is whitespace-split token count — not linguistic word counting

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Word wrap toggle | Med | Easy | CSS `white-space: pre-wrap` controlled by a settings toggle |
| Line count in metadata | Med | Easy | Add `lines` field alongside `words`/`characters` |
| Encoding detection | Low | Med | Surface UTF-8 vs Latin-1 vs UTF-16 in metadata |
| Export as Markdown | Low | Easy | Wrap in ` ``` ` block for easy sharing |
