# Patch / Diff

> Unified diff viewer with color-coded added/removed/hunk-header lines and file change statistics.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.patch`, `.diff` |
| MIME type | `text/x-diff`, `text/x-patch` |
| Binary / Text | Text |
| Common use | Source code patches, `git diff` output, email-based code review |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Colorized diff lines | ✅ | Added (+) green · removed (-) red · hunk (@@ ) blue · file header gray |
| Git extended header parsing | ✅ | `diff --git`, `index`, `new file`, `deleted file`, `rename` lines recognized |
| Selectable hunks | ✅ | Include/exclude checkboxes rebuild a filtered patch in a copyable textarea |
| Source view | ✅ | Monaco editor with `diff` syntax highlighting |
| Text diff | ✅ | Diff of the diff (meta-diff) |
| Metadata | ✅ | Files, hunks, added/removed lines, new files, deleted files, renames |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |
| Apply patch | ❌ | Patch application not implemented |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Real-World Examples

- [`sample.patch`](../examples/sample.patch) — example unified diff / patch

## Known Limitations

- Only unified diff format is supported (no context or side-by-side `diff` formats)
- Patch application (actually modifying the target file) is not implemented
- Filtered selected-hunk output is copyable text, not a direct download from the sandboxed preview

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Patch application | Med | Hard | Apply the patch to a target file uploaded by the user |
| Download selected hunks | Low | Easy | Move filtered patch export into a trusted parent action |
| Split / side-by-side view | Med | Med | Two-column before/after for each file |
| Stats chart | Low | Easy | Bar chart of added vs removed per file |
