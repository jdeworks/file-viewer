# Email

> In-browser email viewer supporting RFC 822 `.eml`, Outlook `.msg`, and Unix mailbox `.mbox` — headers, sandboxed HTML body, text fallback, metadata, and attachment-name listing.

## Format Details

| Format | Extension(s) | MIME type | Description |
|--------|-------------|-----------|-------------|
| RFC 822 email | `.eml` | `message/rfc822` | Standard internet email message |
| Outlook message | `.msg` | `application/vnd.ms-outlook` | Outlook OLE2 compound-document email |
| Unix mailbox | `.mbox` | `application/mbox` | Concatenated multi-message archive |

## Capabilities

### View — EML (RFC 822)

| Feature | Status | Details |
|---------|--------|---------|
| Header card | ✅ | From, To, Cc, Subject, Date displayed in a structured table |
| HTML body | ✅ | Rendered in a sandboxed iframe after script handlers and external resources are stripped |
| Plain-text fallback | ✅ | `<pre>` block when no HTML body is present |
| Multipart parsing | ✅ | `multipart/alternative` — picks HTML then plain; `multipart/mixed` for attachments |
| Attachment listing | ✅ | Count and filenames shown; content not extracted |
| Unsafe-content handling | ✅ | HTML content is sandboxed; external media resources are blanked |
| Source / diff | ✅ | Monaco editor (plaintext) + standard line diff |

### View — MSG (Outlook)

| Feature | Status | Details |
|---------|--------|---------|
| Header card | ✅ | From (name + address), To, Cc, Subject |
| HTML body | ✅ | Rendered in a sandboxed `<iframe>` after minimal script/style strip |
| Plain-text body | ✅ | Shown as `<pre>` when no HTML part |
| Attachment listing | ✅ | Attachment filenames listed; content not extracted |
| CFB / OLE2 parsing | ✅ | Via vendored `cfb.min.js` (Compound File Binary parser) |
| Source view | ❌ | Binary OLE2 format — no raw text view |

### View — MBOX

| Feature | Status | Details |
|---------|--------|---------|
| Message list | ✅ | One row per message with From, Subject, Date, text snippet, and attachment count when present |
| Snippet | ✅ | First ~280 chars of plain text (HTML stripped for snippet generation) |
| Attachment indicator | ✅ | Paperclip count per message row |
| MIME parsing | ✅ | Shares EML MIME parser for each message |
| Source / diff | ✅ | Monaco editor (plaintext) + line diff |
| Individual message expand | ❌ | Only snippet shown; full body not expandable in-line |

### Edit

| Feature | Status | Details |
|---------|--------|---------|
| EML / MBOX source editing | ✅ | Full Monaco editor |
| MSG editing | ❌ | Binary format — read-only |

### Export

| Feature | Status | Details |
|---------|--------|---------|
| Download original | ✅ | Always available |
| Extract attachments | ❌ | Not implemented for any format |
| Extract MBOX → individual EML | ❌ | Not implemented |

## Real-World Examples

- [`sample.eml`](../examples/sample.eml) — RFC 822 email with HTML body
- [`sample.msg`](../examples/sample.msg) — Outlook `.msg` file
- [`sample.mbox`](../examples/sample.mbox) — mbox archive with multiple messages

## Known Limitations

- EML attachment content cannot be extracted or downloaded — filenames, MIME types, and approximate sizes only
- MSG attachment content is not extracted
- Large MBOX files with thousands of messages render all rows at once (no pagination)
- `=?UTF-8?Q?...?=` encoded-word decoding handles common cases; edge cases may not fully decode
- No support for S/MIME or PGP encrypted/signed messages
- MSG date field is not currently extracted (only EML `Date:` header is shown)

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| EML attachment extraction | High | Medium | Decode MIME parts and offer individual downloads |
| MSG date extraction | Medium | Easy | Read PR_MESSAGE_DELIVERY_TIME property (tag 0E06) from CFB |
| Expandable MBOX message body | High | Medium | Click row to expand full EML renderer inline |
| MBOX pagination / virtual scroll | Medium | Medium | Essential for large archives (Gmail Takeout exports) |
| Split MBOX → individual EMLs | Medium | Easy | Extract each `From ` block and offer download |
| DKIM / SPF header display | Low | Easy | Surface authentication headers for security review |
| S/MIME decryption | Low | Hard | Requires private key — out of scope for a static viewer |
