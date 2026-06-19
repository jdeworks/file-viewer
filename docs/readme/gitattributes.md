# Git Attributes

> Git attributes rule viewer with human-readable explanations for each attribute — EOL, diff, merge, LFS, and GitHub Linguist overrides.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.gitattributes` |
| MIME type | `text/plain` |
| Binary / Text | Text |
| Common use | Line ending normalization, custom diff drivers, Git LFS tracking, GitHub language stats |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Rule list | ✅ | Each pattern + attributes shown as a row |
| Attribute explanations | ✅ | Common attributes translated to plain English (`filter=lfs` → "stored in Git LFS") |
| Category badges | ✅ | EOL / diff / merge / binary / LFS / Linguist categories labeled |
| GitHub Linguist support | ✅ | `linguist-generated`, `linguist-vendored`, `linguist-language` explained |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Rule count, LFS-tracked file count, Linguist override count |

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

- [`.gitattributes`](../examples/.gitattributes) — example gitattributes for a Node.js project

## Known Limitations

- Pattern matching is display-only — viewer does not simulate which files match each rule

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| LFS object listing | Low | Hard | Would need .git access — out of scope for static viewer |
| Pattern match tester | Low | Med | Enter a file path to show matching rules |
