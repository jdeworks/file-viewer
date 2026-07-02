# Log File

> Severity-colorized log viewer with timestamp highlighting, ANSI SGR rendering, severity filters, and line-level counts.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.log`, `.out`, `.trace` |
| MIME type | `text/plain` |
| Binary / Text | Text |
| Common use | Application logs, server access logs, CI build output, crash traces |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Severity colorization | ✅ | ERROR/FATAL red · WARN yellow · INFO blue · DEBUG gray |
| Timestamp highlighting | ✅ | ISO-8601 and HH:MM:SS timestamps highlighted at line start |
| Severity filter | ✅ | Filter chips for all present severities |
| ANSI color rendering | ✅ | SGR foreground colors, bright colors, 256-color, and true-color sequences rendered |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Line count, error/warn/info/debug counts, timestamped line count |

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

- [`sample.log`](../examples/sample.log) — example log with mixed severity levels

## Known Limitations

- Very large log files (>50 MB) may be slow to render; Monaco source view handles any size
- Log format detection is heuristic (keyword matching) — custom formats may not colorize correctly
- Regex search is not implemented in the preview
- Structured JSON log lines are not parsed as fields

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Regex search with highlight | Med | Med | Jump to matching lines |
| Parse structured JSON logs | Low | Med | `{"level":"error","msg":"..."}`-style log lines |
