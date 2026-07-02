# Docker Compose

> Docker Compose service summary — services, images/builds, ports, volumes, dependencies, environment references, and review hints shown in a structured overview.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `docker-compose.yml`, `docker-compose.yaml`, `compose.yml`, `compose.yaml` |
| MIME type | `text/yaml` |
| Binary / Text | Text (YAML) |
| Common use | Multi-container application definitions for local development and production deployment |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Service overview | ✅ | Each service shown as a card |
| Image / build source | ✅ | `image:` or `build:` context shown |
| Port mappings | ✅ | Host:container port mappings listed |
| Volume mounts | ✅ | Named volumes and bind mounts listed |
| Environment variables | ✅ | Inline values shown with secret-like values masked; `env_file` references are counted |
| Dependencies | ✅ | `depends_on` relationships shown as service fields |
| Network info | ✅ | Service networks and top-level network names shown by the known-file enhancement |
| Compose review hints | ✅ | Flags privileged mode, host networking/PID, floating image tags, Docker socket mounts, secret-like env keys, and missing healthchecks |
| Source preview links | ✅ | Known-file enhancement links service cards and issues back to source lines |
| Source view | ✅ | Monaco editor with YAML syntax highlighting |
| Text diff | ✅ | Standard line diff |
| Preferred mode | Split | Preview + source side-by-side by default |
| Metadata | ✅ | Services, images, builds, ports, dependencies, env vars/files, networks, volumes, secrets, and local-path hints |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known-File Enhancement

Docker Compose YAML files are also enhanced by the `docker-compose` plugin in the YAML known-file plugins. That plugin uses vendored `js-yaml` for fuller parsing, richer metadata, source-line links, and review hints. The base `docker-compose` type still provides a lightweight service overview when the known-file path is not used.

## Real-World Examples

- [`docker-compose.yml`](../examples/docker-compose.yml) — example multi-service Compose file

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Service dependency graph visualization | Med | Med | Visual DAG of depends_on relationships |
| Secrets display | Low | Easy | Show secret names (not values) |
| Healthcheck display | Low | Easy | Show healthcheck command and intervals, not only missing-healthcheck hints |
