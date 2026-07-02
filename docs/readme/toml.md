# TOML

> Collapsible tree preview parsed by a hand-rolled TOML parser with Date support, source-line jumps, diagnostics, query filtering, form editing, and JSON/YAML export.

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
| Query/filter panel | ✅ | JSONPath-style TOML path queries such as `$.table.key`, `$..name`, and `array[*]` |
| Source line jumps | ✅ | Click keys/paths to open the matching source line |
| Diagnostics | ✅ | Duplicate table/key warnings and sensitive-looking value redaction |
| Collapsed source preview | ✅ | Redacted source shown below the tree |
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
| Form editing | ✅ | Typed form editor for scalar values; preserves a leading comment block |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Download as JSON | ✅ | Via hand-rolled TOML parser |
| Download as YAML | ✅ | Via TOML parser plus local YAML serializer |

## Known-File Enhancement

TOML files get Layer-3 plugins for specific file names. Current plugins live in `docs/types/text/toml/known/` and cover 46 known TOML variants, including `Cargo.toml`, `.cargo/config.toml`, `pyproject.toml`, `Cargo.lock`, `wrangler.toml`, `fly.toml`, `cliff.toml`, `uv.toml`, `ruff.toml`, `mise.toml`, `bunfig.toml`, `netlify.toml`, `telegraf.conf`, `vector.toml`, and Rust/Julia/Supabase/Starship/Helix/Gitleaks configs.

## Real-World Examples

- [`sample.toml`](../examples/sample.toml) — example TOML config

## Known Limitations

- TOML v1.1 edge cases may not parse correctly
- No semantic diff (only text diff)
- Form editing covers scalar values and scalar arrays; complex table structure changes still require source editing

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Semantic diff | Med | Med | Table-level diff like JSON has |
| Known-plugin index docs | Low | Easy | Generate the plugin list from `docs/types/text/toml/known/` |
