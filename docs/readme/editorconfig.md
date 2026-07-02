# EditorConfig

> EditorConfig file viewer showing section-by-section glob patterns, formatting rules, root status, and readable annotations for common properties.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.editorconfig` |
| MIME type | `text/plain` |
| Binary / Text | Text |
| Common use | Consistent editor settings (indent style, tab width, line endings) across IDEs and developers |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Section-by-section display | ✅ | Each `[pattern]` block shown as a card |
| `root = true` marker | ✅ | Root declaration highlighted in header |
| Property display | ✅ | All known properties shown with values |
| Glob pattern display | ✅ | Patterns like `[*.js]`, `[{*.ts,*.tsx}]` shown clearly |
| Base settings summary | ✅ | Highlights `[*]` indentation, line ending, charset, whitespace, and final-newline defaults |
| Known-file enhancement | ✅ | `.editorconfig` files also get parent-pane cards with notes for well-known keys |
| Source view | ✅ | Monaco editor with INI syntax highlighting |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Base type reports section count, root status, and indent style; known-file metadata also reports property count |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Real-World Examples

- [`.editorconfig`](../examples/.editorconfig) — example EditorConfig for a mixed-language project

## Known Limitations

- Effective settings for a given file path are not computed
- Conflict detection is visual only; there is no validation pass for contradictory properties

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| File path tester | Med | Med | Enter a file path, show which properties apply |
| Conflict detection | Low | Easy | Flag sections where the same property is set differently |
