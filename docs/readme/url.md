# URL Inspector

> URL parsing and analysis — scheme, host, path, query params decoded individually; JWT tokens in params decoded; `.url` desktop shortcuts supported.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.url`, `.webloc`, plain URLs in `.txt` files |
| MIME type | `text/plain` |
| Binary / Text | Text |
| Common use | Browser bookmarks, desktop shortcuts, API endpoint sharing, link inspection |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| URL decomposition | ✅ | Scheme, username, host, port, path, query, fragment shown separately |
| Query parameter table | ✅ | Each `?key=value` decoded and shown as a row |
| JWT decode | ✅ | If a param value looks like a JWT, header+payload decoded (signature never verified) |
| Windows `.url` shortcut | ✅ | `[InternetShortcut]` files parsed; URL extracted |
| macOS `.webloc` | ✅ | XML plist shortcut files parsed |
| Multi-URL files | ✅ | Multiple URLs in a text file shown as separate cards |
| Copy URL | ✅ | Copy-to-clipboard button per URL |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | URL count, scheme breakdown, param count |

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

- [`sample.url`](../examples/sample.url) — example Windows URL shortcut

## Known Limitations

- URL previews (loading page screenshots) are not available — zero-off-origin policy
- OAuth tokens in query params are shown decoded but marked as sensitive

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| QR code for URL | Low | Easy | Render a QR code for mobile sharing |
| Redirect chain trace | Low | Hard | Would require server-side proxy; violates zero-off-origin |
