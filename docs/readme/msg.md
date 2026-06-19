# Outlook Email (.msg)

> Outlook MSG viewer — subject, sender, recipients, date, body text, and attachment list.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.msg` |
| MIME type | `application/vnd.ms-outlook` |
| Binary / Text | Binary (Compound Document / OLE2) |
| Common use | Microsoft Outlook email messages, saved from Outlook desktop |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Subject | ✅ | PR_SUBJECT MAPI property |
| From / sender | ✅ | PR_SENDER_NAME and PR_SENDER_EMAIL |
| Recipients | ✅ | To / CC extracted from recipient table |
| Date | ✅ | PR_MESSAGE_DELIVERY_TIME |
| Body (plain text) | ✅ | PR_BODY property shown |
| Attachment list | ✅ | PR_ATTACH_FILENAME + size for each attachment |
| Importance | ✅ | Normal / High / Low |
| Source view | ❌ | Binary OLE2 format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Subject, sender, date, recipient/attachment counts |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary OLE2 format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Extract attachments | ❌ | Not yet implemented |

## Known Limitations

- HTML body (`PR_HTML`) is not rendered — plain text only
- Embedded messages (`.msg` within `.msg`) are shown as attachments only

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| HTML body rendering | Med | Med | Render PR_HTML in sandboxed iframe |
| Attachment extraction | Med | Med | Download individual attachments |
| Meeting request / calendar support | Low | Hard | Parse IPM.Schedule properties |
