# Email (EML)

> Email viewer with header card, HTML body sanitization via DOMPurify, plain-text fallback, and attachment listing.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.eml`, `.msg` (RFC 822 only) |
| MIME type | `message/rfc822` |
| Binary / Text | Text |
| Common use | Individual email messages, email client exports, phishing analysis |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Header card | ✅ | From, To, Cc, Subject, Date shown in a table |
| HTML body | ✅ | Rendered after DOMPurify sanitization (`script`, `style`, event handlers removed) |
| Plain-text body | ✅ | Pre-formatted when no HTML part |
| Attachment listing | ✅ | Count and filenames listed (content not extracted) |
| Unsafe-content flag | ✅ | Banner shown when DOMPurify removed something |
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
- Outlook `.msg` format (OLE2) is not supported — only RFC 822 `.eml`

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Attachment extraction | High | Med | Download individual attachments from MIME parts |
| DKIM / SPF header display | Med | Easy | Surface email authentication headers |
| Thread view | Low | Hard | Group related EML files by Message-ID/References |
