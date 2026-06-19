# YAML

> Collapsible tree preview with multi-document stream support, exported to JSON; Docker Compose and OpenAPI metadata extracted automatically.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.yaml`, `.yml` |
| MIME type | `application/yaml`, `text/yaml` |
| Binary / Text | Text |
| Common use | Configuration files, CI/CD pipelines, Docker Compose, Kubernetes manifests, OpenAPI specs |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Collapsible tree | ✅ | Reuses JSON tree styling; Date objects shown as ISO string |
| Multi-document stream | ✅ | `---` separators supported; each document shown separately |
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

Many well-known YAML files get a Layer-3 plugin. Current plugins (in `docs/types/text/yaml/known/`):

| Plugin | File(s) |
|--------|---------|
| `github-actions` | `.github/workflows/*.yml` |
| `k8s-manifest` | Kubernetes resource YAML |
| `docker-compose` | `docker-compose.yml`, `compose.yml` |
| `gitlab-ci` | `.gitlab-ci.yml` |
| `codecov` | `codecov.yml`, `.codecov.yml` |
| `azure-pipelines` | `azure-pipelines.yml` |
| `amplify` | `amplify.yml` |
| `circleci` | `.circleci/config.yml` |
| `codebuild` | `buildspec.yml` |
| `dependabot` | `.github/dependabot.yml` |

## Real-World Examples

- [`sample.yaml`](../examples/sample.yaml) — example YAML configuration

## Known Limitations

- Only the first document is exported to JSON (multi-document YAML export produces first doc)
- YAML anchors/aliases are resolved by js-yaml before display (merged result shown, not raw)

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Semantic diff | Med | Med | Key-tree diff like JSON has |
| Export all documents as JSON array | Med | Easy | Multi-doc YAML → JSON array |
| Schema validation | Low | Med | Validate against JSON Schema or Kwalify |
