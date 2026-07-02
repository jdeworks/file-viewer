# Chat Export (WhatsApp / Telegram / Discord / Messenger)

> Chat export viewer — platform detection, participant stats, message counts, date range, and media/attachment summary.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.txt`, `.json` |
| MIME type | `text/plain`, `application/json` |
| Binary / Text | Text |
| Common use | Exported conversation logs from messaging apps |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Platform detection | ✅ | WhatsApp, Telegram, Discord, Facebook Messenger |
| Message count | ✅ | Total messages across all participants |
| Participant count | ✅ | Unique senders identified |
| Top participants | ✅ | Bar chart of top-5 by message count |
| Date range | ✅ | First and last message dates shown |
| Chat/group name | ✅ | For Telegram, Discord, Messenger exports |
| Media count | ✅ | Media items in Telegram exports |
| Attachment count | ✅ | Attachments in Discord exports |
| Platform colour | ✅ | Badge colour matches platform brand |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Diff | ❌ | Disabled — message logs grow monotonically |
| Metadata | ✅ | Platform, message count, and participant details where available |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- WhatsApp format varies by locale / OS; unusual date formats may not be detected
- Message content (text) is not shown in preview — only metadata and stats
- Telegram secret chat exports may have different JSON structure
- Messenger support covers the common JSON export shape with `participants` and `sender_name`

## Real-World Examples

- [`sample-telegram.json`](../examples/sample-telegram.json) — Telegram JSON chat export sample

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Message content preview | Med | Easy | Show first N message texts |
| Word frequency / word cloud | Low | Med | Top words per participant |
| Export stats as CSV | Low | Easy | Participant stats download |
