# Environment Variables File (.env)

> App configuration files in KEY=VALUE format — parsed into a redacted key/value table with source-line links and a redacted source preview.

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
| Raw text view | ✅ | Raw pane available; no dedicated dotenv syntax language is registered |
| Key/value table | ✅ | Supports comments, `export KEY=VALUE`, quoted values, and multi-line quoted values |
| Secrets masking | ✅ | Sensitive-looking keys and URL passwords are redacted before being embedded in preview DOM |
| Redacted source preview | ✅ | Source lines shown with masked values and jump links from each parsed key |
| Raw source view | ✅ | Available through the raw pane |
| Text diff | ❌ | Disabled intentionally to reduce accidental secret exposure in diff output |

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

Several known-file plugins in `docs/types/text/known/` detect common env-like files such as `.env.example`, `bookstack.env`, `vaultwarden.env`, `.envrc`, `/etc/environment`, and OpenVPN configs. They provide targeted structure where available; otherwise the generic `.env` renderer shows the redacted key/value table.

The generic fallback does not group by prefix. It keeps the file order, shows line numbers, masks sensitive values, and includes a redacted source block.

## Real-World Examples

- [`.env.example`](../examples/.env.example) — sample environment file showing structured view with masked secrets

## Known Limitations

- Masking is heuristic; it is not a full secret scanner or leak detector
- No diff against `.env.example` to show missing or extra keys
- `.env.vault` (Dotenv Vault encrypted format) is shown as raw text

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Secret leak detection | High | Med | Regex patterns for AWS keys, tokens, etc. |
| Diff against .env.example | Med | Med | Show missing/extra keys compared to example file |
| Dotenv Vault decryption | Low | Hard | Requires the DOTENV_KEY at runtime |
