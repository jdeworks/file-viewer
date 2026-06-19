# Docker Compose

> Docker Compose service summary — services, ports, volumes, images, networks, and environment variable counts shown in a structured overview.

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
| Environment variables | ✅ | Count shown; values from `env_file` not loaded |
| Dependency graph | ✅ | `depends_on` relationships shown |
| Network info | ✅ | Named networks listed |
| Source view | ✅ | Monaco editor with YAML syntax highlighting |
| Text diff | ✅ | Standard line diff |
| Preferred mode | Split | Preview + source side-by-side by default |
| Metadata | ✅ | Service count, port count, volume count, network count |

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

Docker Compose YAML files are also enhanced by the `docker-compose` plugin in the YAML known-file plugins.

## Real-World Examples

- [`docker-compose.yml`](../examples/docker-compose.yml) — example multi-service Compose file

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Service dependency graph visualization | Med | Med | Visual DAG of depends_on relationships |
| Secrets display | Low | Easy | Show secret names (not values) |
| Healthcheck display | Low | Easy | Show healthcheck command and intervals |
