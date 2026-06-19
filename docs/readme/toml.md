# TOML

> Collapsible tree preview parsed by a hand-rolled TOML parser with Date support, exported to JSON; Cargo.toml dependency count extracted.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.toml` |
| MIME type | `application/toml` |
| Binary / Text | Text |
| Common use | Rust/Cargo configuration, Python project config (`pyproject.toml`), tool configuration |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Collapsible tree | ✅ | Reuses JSON tree styling; datetime values shown as ISO string |
| Date / datetime support | ✅ | TOML native date types rendered correctly |
| Parse error | ✅ | Parser error message surfaced with context |
| Source view | ✅ | Monaco editor with TOML syntax highlighting |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Top-level key count, total nodes, depth, tables, arrays |
| Cargo.toml extras | ✅ | Package name and dependency count extracted |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Download as JSON | ✅ | Via hand-rolled TOML parser |

## Known-File Enhancement

TOML files get Layer-3 plugins for specific file names. Current plugins (in `docs/types/text/toml/known/`):

| Plugin | File(s) |
|--------|---------|
| `wrangler` | `wrangler.toml` — Cloudflare Workers config |
| `fly` | `fly.toml` — Fly.io deployment config |
| `cliff` | `cliff.toml` — git-cliff changelog config |

## Real-World Examples

- [`sample.toml`](../examples/sample.toml) — example TOML config

## Known Limitations

- TOML v1.1 float edge cases (NaN/Inf) may not parse correctly
- No semantic diff (only text diff)

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| pyproject.toml plugin | Med | Easy | Show tool config sections, Python version |
| Semantic diff | Med | Med | Table-level diff like JSON has |
| Convert TOML → YAML | Low | Easy | Via JSON intermediary |
