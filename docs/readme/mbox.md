# Mailbox (mbox)

> Inbox-style message list parsed from mbox format — sender, subject, date, and text snippet per message.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.mbox` |
| MIME type | `application/mbox` |
| Binary / Text | Text |
| Common use | Email archive exports (Gmail Takeout, Thunderbird, Unix mail) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Message list | ✅ | One row per message with from, date, subject, and text snippet |
| Text snippet | ✅ | First ~280 chars of plain text (HTML stripped for snippet) |
| Attachment indicator | ✅ | Paperclip count shown per message |
| MIME parsing | ✅ | Shares EML MIME parser — handles multipart messages |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Message count, sender count, attachment count, HTML message count |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Extract individual messages | ❌ | Not yet implemented |

## Real-World Examples

- [`sample.mbox`](../examples/sample.mbox) — example mbox with multiple messages

## Known Limitations

- Large mbox files with many messages may be slow to render all cards; no pagination
- Individual message bodies are not expandable in-line — only the snippet is shown
- No search across messages

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Expandable message body | High | Med | Click to expand full message (reuse EML renderer) |
| Message count pagination | Med | Med | Virtual scroll for archives with thousands of messages |
| Extract to individual EML files | Med | Med | Split mbox into separate .eml downloads |
| Search / filter by sender or subject | Low | Med | In-browser text search across headers |
