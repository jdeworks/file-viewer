# URL Inspector

> URL parsing and analysis — scheme, host, path, query params decoded individually; OAuth/JWT indicators, JSON param pretty-printing, `data:` and `mailto:` helpers, and multi-URL summaries.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.url`, `.webloc`, plain URLs in text files |
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
| OAuth parameter hints | ✅ | Common OAuth params are badged as sensitive/security-relevant |
| URL-encoded JSON | ✅ | JSON-looking param values can be expanded as pretty-printed JSON |
| `mailto:` and `data:` helpers | ✅ | Mail fields and data URI metadata/content previews are shown |
| `.url` / `.webloc` extension routing | ⚠️ | Extensions route to this type, but wrapper INI/plist extraction is not implemented yet |
| Multi-URL files | ✅ | Multiple URLs in a text file shown as separate cards |
| Copy URL | ✅ | Copy-to-clipboard button per URL |
| Copy params/all URLs | ✅ | Copy query params as JSON or copy multi-URL lists as JSON |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Scheme, host, TLD, path depth, query param count, fragment/JWT/OAuth flags, URL length |

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
- Windows `.url` and macOS `.webloc` wrappers are detected by extension but not unwrapped into their target URL yet

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| QR code for URL | Low | Easy | Render a QR code for mobile sharing |
| `.url` / `.webloc` wrapper parsing | Med | Easy | Extract `URL=` from Windows shortcuts and plist URLs from macOS bookmarks |
| Redirect chain trace | Low | Hard | Would require server-side proxy; violates zero-off-origin |
