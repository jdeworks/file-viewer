# Email (EML)

> RFC 822 email viewer with header card, sandboxed HTML body, plain-text fallback, MIME multipart parsing, and attachment listing.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.eml` |
| MIME type | `message/rfc822` |
| Binary / Text | Text |
| Common use | Individual email messages, email client exports, phishing analysis |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Header card | ✅ | From, To, Cc, Subject, Date shown in a table |
| HTML body | ✅ | Rendered in a sandboxed iframe after scripts, event handlers, and external media resources are stripped |
| Plain-text body | ✅ | Pre-formatted when no HTML part |
| Attachment listing | ✅ | Count, filenames, MIME type, and approximate encoded size listed (content not extracted) |
| Unsafe-content handling | ✅ | HTML content is sandboxed and external resource URLs are blanked |
| MIME multipart parsing | ✅ | Picks HTML or plain-text part from multipart/alternative |
| Source view | ✅ | Monaco editor (plaintext) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Subject, from, to, cc, date, body type, attachment count |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Extract attachments | ❌ | Not yet implemented |

## Real-World Examples

- [`sample.eml`](../examples/sample.eml) — example email with HTML body

## Known Limitations

- Attachments are listed but their content cannot be extracted or downloaded
- Encoded words (`=?UTF-8?Q?...?=`) are decoded for headers; complex encodings may not decode fully
- Outlook `.msg` format is handled by the separate Outlook Email viewer, not this RFC 822 renderer

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Attachment extraction | High | Med | Download individual attachments from MIME parts |
| DKIM / SPF header display | Med | Easy | Surface email authentication headers |
| Thread view | Low | Hard | Group related EML files by Message-ID/References |
