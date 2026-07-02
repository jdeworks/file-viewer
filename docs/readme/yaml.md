# YAML

> Collapsible YAML tree preview with multi-document streams, JSONPath-style queries, source-line jumps, redacted source review, JSON export, and known-file enhancements.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.yaml`, `.yml`; explicit `.txt` / `.text` files can still keep YAML available as a low-confidence option |
| MIME type | `application/yaml`, `text/yaml` |
| Binary / Text | Text |
| Common use | Configuration files, CI/CD pipelines, Docker Compose, Kubernetes manifests, OpenAPI specs |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Collapsible tree | ✅ | Reuses JSON tree styling; Date objects shown as ISO string |
| Multi-document stream | ✅ | `---` separators supported; each document shown separately |
| YAMLPath query panel | ✅ | JSONPath-style filters such as `$..name`, `$.a.b`, and `arr[*]` |
| Source-line jumps | ✅ | Keys, paths, and step rows link into a collapsed redacted source preview |
| Structure review | ✅ | Duplicate-key and secret-like scalar diagnostics are shown where detectable |
| Step summary | ✅ | CI/pipeline-style `steps` arrays are summarized with capped rows |
| Parse error | ✅ | js-yaml error message surfaced with position |
| Source view | ✅ | Monaco editor with YAML syntax highlighting |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Document count, root type, total nodes, depth, mappings, sequences |
| Docker Compose extras | ✅ | Service count and volume count extracted |
| OpenAPI extras | ✅ | API title and endpoint count extracted |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Download as JSON | ✅ | First document via js-yaml |

## Known-File Enhancement

Many well-known YAML files get a Layer-3 plugin. The current registry has 208 plugin folders in `docs/types/text/yaml/known/`, covering CI/CD systems, Kubernetes and Helm, observability configs, cloud deployment files, security scanners, self-hosted app configs, package managers, docs tooling, and infra-as-code manifests.

## Real-World Examples

- [`sample.yaml`](../examples/sample.yaml) — example YAML configuration

## Known Limitations

- Only the first document is exported to JSON (multi-document YAML export produces first doc)
- YAML anchors/aliases are resolved by js-yaml before display (merged result shown, not raw)
- Query syntax is JSONPath-style over parsed YAML, not full YAMLPath

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Semantic diff | Med | Med | Key-tree diff like JSON has |
| Export all documents as JSON array | Med | Easy | Multi-doc YAML → JSON array |
| Schema validation | Low | Med | Validate against JSON Schema or Kwalify |
| Generated known-plugin docs | Low | Easy | Build a compact plugin index from `docs/types/text/yaml/known/` |
