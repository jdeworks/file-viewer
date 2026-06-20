# Environment Variables File (.env)

> App configuration files in KEY=VALUE format — 100+ known-file plugins show structured, secrets-masked views for specific apps.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.env`, `.env.local`, `.env.development`, `.env.production`, `.env.example`, `.env.test` |
| MIME type | `text/plain` |
| Binary / Text | Text |
| Created by | Convention (popularised by dotenv / 12-factor app) |
| Common use | App configuration, secrets management, Docker Compose, CI/CD |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Syntax highlighting | ✅ | Monaco `dotenv` language mode |
| Known-file structured view | ✅ | 100+ app-specific plugins (see below) |
| Secrets masking | ✅ | Sensitive fields masked by default in structured view |
| Raw source view | ✅ | Always accessible alongside structured view |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Text editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known-File Enhancement

Over 100 known-file plugins in `docs/types/text/env/known/` detect the target application from filename patterns and/or content keys, then display a structured, app-specific panel with sensitive fields masked:

Examples include: **Nextcloud**, **Gitea**, **Ghost**, **Keycloak**, **Grafana**, **Prometheus**, **MinIO**, **Redis**, **PostgreSQL**, **MySQL**, **MongoDB**, **RabbitMQ**, **Kafka**, and many more.

The generic fallback groups all KEY=VALUE pairs into sections by prefix (e.g. `DB_*`, `SMTP_*`) with no masking.

## Real-World Examples

- [`.env.example`](../examples/.env.example) — sample environment file showing structured view with masked secrets

## Known Limitations

- Secret scanning / leak detection not built in (no pattern matching against known secret formats)
- No diff against `.env.example` to show missing or extra keys
- `.env.vault` (Dotenv Vault encrypted format) is shown as raw text

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Secret leak detection | High | Med | Regex patterns for AWS keys, tokens, etc. |
| Diff against .env.example | Med | Med | Show missing/extra keys compared to example file |
| Dotenv Vault decryption | Low | Hard | Requires the DOTENV_KEY at runtime |
