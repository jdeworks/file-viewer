# Outlook Email (.msg)

> Outlook MSG viewer — subject, sender, recipients, sanitized message body, and attachment names from OLE2/MAPI data.

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
| Date | ❌ | Delivery-time properties are not surfaced yet |
| Body (HTML/plain text) | ✅ | `PR_HTML` is sanitized in an iframe when present; otherwise `PR_BODY` plain text is shown |
| Attachment list | ✅ | Attachment names from long/short filename properties |
| Importance | ❌ | Importance/priority properties are not decoded yet |
| Source view | ❌ | Binary OLE2 format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Subject, sender, To/CC, HTML flag, and attachment count |

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

- HTML body rendering is sanitized and isolated, but not a full Outlook layout engine
- Embedded messages (`.msg` within `.msg`) are shown as attachments only
- Attachment payloads and sizes are not extracted yet

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Delivery date / importance | Med | Easy | Decode the relevant MAPI scalar properties |
| Attachment extraction | Med | Med | Download individual attachments |
| Meeting request / calendar support | Low | Hard | Parse IPM.Schedule properties |
