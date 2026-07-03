# JSON

> Collapsible tree preview with JSONC tolerance, JSONPath search/filter, context copy actions, semantic key-tree diff, sort controls, and YAML/pretty/minified export.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.json`, `.jsonc`, `.json5` |
| MIME type | `application/json` |
| Binary / Text | Text |
| Common use | Configuration files, APIs, data exchange, package manifests |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Collapsible tree | ✅ | `<details>`/`<summary>` — all nesting levels |
| JSONC recovery | ✅ | Trailing commas and `//` comments tolerated |
| Sort object keys | ✅ | A-Z / Z-A / original order (setting) |
| JSONPath query | ✅ | Search/filter the live tree with `$..key`, `$.path[*]`, or bare key queries |
| Context copy | ✅ | Right-click a tree row to copy JSONPath, key/path, or value; secret-like values stay redacted |
| Key/value type coloring | ✅ | String, number, boolean, null styled distinctly |
| Parse error message | ✅ | Position shown on invalid JSON |
| Source view | ✅ | Monaco editor with JSON syntax highlighting |
| Semantic diff | ✅ | Key-tree diff (`jsondiff.js`) — not just text diff |
| Text diff | ✅ | Standard line diff also available |
| Metadata | ✅ | Root type, node count, depth, objects, arrays, top-level keys |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Download as CSV | ✅ | Array-of-objects table, object key/value rows, or scalar value column |
| Download as YAML | ✅ | Via vendored js-yaml |
| Download pretty JSON | ✅ | 2-space indented |
| Download minified JSON | ✅ | Single-line compact |

## Known-File Enhancement

Well over 90 well-known JSON config files get a Layer-3 plugin (`docs/types/text/json/known/<name>/`)
that adds a rich summary panel — see that directory for the full, current list. A representative
sample:

| Plugin | File(s) |
|--------|---------|
| `package-json` | `package.json` — scripts, dependencies, version |
| `tsconfig` | `tsconfig.json` / `tsconfig.*.json` — compiler options |
| `eslint` | `.eslintrc.json`, `eslint.config.json` |
| `jest` | `jest.config.json` |
| `babel` | `babel.config.json`, `.babelrc` |
| `biome` | `biome.json` |
| `angular` | `angular.json` |
| `capacitor` | `capacitor.config.json` |
| `commitlint` | `.commitlintrc.json` |
| `devcontainer` | `.devcontainer/devcontainer.json` |
| `lerna` | `lerna.json` |
| `nx` | `nx.json` |
| `composer-json` / `composer-lock` | `composer.json` / `composer.lock` (PHP) |
| `deno` | `deno.json`, `deno.jsonc` |
| `jsconfig` | `jsconfig.json` |

`openapi` (OpenAPI / Swagger — paths, operations) is a shared plugin at
`docs/types/text/known/openapi/`, not under `json/known/`, because it matches both YAML and JSON specs.

## Real-World Examples

- [`sample.json`](../examples/sample.json) — example JSON object

## Known Limitations

- JSON5 with unquoted keys parsed in JSONC recovery mode (best-effort, not full JSON5)
- Very large files (>10 MB) may be slow in tree mode; source view is always available

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Schema validation (JSON Schema) | High | Med | Validate against a schema; show errors inline |
| JSON Pointer navigation | Low | Easy | Copy RFC 6901 pointer alongside JSONPath |
