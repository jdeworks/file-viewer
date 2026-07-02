# SARIF Security Report

> Static analysis results viewer with severity summaries, paginated findings, severity filters, rule IDs, file:line locations, and tool attribution.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.sarif` |
| MIME type | `application/sarif+json` |
| Binary / Text | Text (JSON) |
| Common use | CodeQL, ESLint, Semgrep, Bandit, and other static analysis tool output |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Finding table | ✅ | Each result shown with severity badge, rule ID, message, file, and line |
| Severity filter | ✅ | `All`, error, warning, note, and none chips where present |
| Pagination | ✅ | 50 findings per page, capped at 2000 rendered rows |
| Severity summary | ✅ | Count badges per severity in header |
| Tool attribution | ✅ | Tool name and version shown per run |
| Multi-run files | ✅ | Multiple SARIF runs shown with tool labels |
| Preferred mode | Preview | Opens directly in preview mode |
| Source view | ✅ | Monaco editor with JSON syntax highlighting |
| Diff | ❌ | `diff: false` |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export as CSV | ❌ | Not yet implemented |

## Real-World Examples

- [`sample.sarif`](../examples/sample.sarif) — example SARIF output from a static analyzer

## Known Limitations

- Code snippets (`region.snippet`) are not shown inline
- Rule help text (from `rules[]`) is not surfaced in the UI
- `relatedLocations` (secondary locations) are not displayed
- Very large reports render the first 2000 findings in the preview

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Code snippet display | Med | Easy | Show the relevant code line from `region` |
| Export as CSV | Med | Easy | One row per finding: file, line, severity, rule, message |
| Rule help / description | Low | Easy | Show rule's `helpText.text` on hover |
| Related locations | Low | Med | Expand finding rows with secondary locations |
