# Dockerfile

> Dockerfile summary showing build stages, base images, exposed ports, ENV vars, LABEL metadata, and security warnings.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `Dockerfile`, `dockerfile`, `Containerfile` |
| MIME type | `text/x-dockerfile` |
| Binary / Text | Text |
| Common use | Container image build instructions for Docker and OCI-compatible runtimes |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Stage listing | ✅ | Each `FROM` shown with base image and optional alias |
| Multi-stage detection | ✅ | Stage count and AS alias listed |
| Exposed ports | ✅ | All `EXPOSE` directives collected |
| ENV variables | ✅ | Environment variables shown (up to 10) |
| LABEL metadata | ✅ | Label key/value pairs shown (up to 8) |
| RUN commands preview | ✅ | First 8 RUN commands shown (truncated at 80 chars) |
| Security warnings | ✅ | `USER root` flagged as a warning |
| Source view | ✅ | Monaco editor with Dockerfile syntax highlighting |
| Text diff | ✅ | Standard line diff |
| Preferred mode | Split | Preview + source side-by-side by default |

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

- [`Dockerfile`](../examples/Dockerfile) — example multi-stage Dockerfile

## Known Limitations

- `HEALTHCHECK`, `ONBUILD`, `STOPSIGNAL`, `SHELL` instructions not shown in summary
- Line continuation (`\`) is handled but only for single-level continuations

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| COPY/ADD source/dest listing | Med | Easy | Show what files are copied into the image |
| Layer size estimation | Low | Hard | Requires knowledge of base image |
| Hadolint-style lint warnings | Low | Med | Surface common Dockerfile best-practice issues |
