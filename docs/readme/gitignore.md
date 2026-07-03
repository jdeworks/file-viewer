# .gitignore / Ignore Rules

> Syntax-highlighted ignore rule viewer with rule classification breakdown and extension chip list.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.gitignore`, `.npmignore`, `.dockerignore`, `.prettierignore`, `.eslintignore`, `.hgignore` |
| MIME type | `text/plain` |
| Binary / Text | Text |
| Common use | Specifying files/patterns excluded from version control or tool processing |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Syntax-highlighted rules | ✅ | Extensions amber · directories blue · negations green · comments gray · other rules white |
| Rule classification breakdown | ✅ | Count of dirs, extension patterns, globs, specific files, negations, comments |
| Extension chips | ✅ | Unique `*.ext` extensions shown as chips (up to 8) |
| Rule count summary | ✅ | Total active rules displayed prominently |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Rule count, comment count, negation count, directory rule count |

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

- [`.gitignore`](../examples/.gitignore) — example gitignore for a Node.js project

## Known Limitations

- Rule matching is not simulated — viewer categorizes rules visually but does not test which files would be ignored
- `!` negation rules are highlighted but their interaction with positive rules is not modeled

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| File path tester | Med | Med | Type a path, show if it would be ignored |
| Merge / deduplicate rules | Low | Easy | Remove duplicate patterns |
| Template library | Low | Med | Insert gitignore templates for common languages/frameworks |
