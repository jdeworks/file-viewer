# Contacts (vCard)

> Contact card viewer with emails, phones, addresses, URLs, birthday, and note — exports to CSV or JSON.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.vcf`, `.vcard` |
| MIME type | `text/vcard` |
| Binary / Text | Text |
| Common use | Contact exports from phone/email apps, address book sharing |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Contact cards | ✅ | One card per `BEGIN:VCARD` block |
| Email addresses | ✅ | Shown with type label (HOME/WORK/etc.), mailto: linked |
| Phone numbers | ✅ | Shown with type label, tel: linked |
| Physical addresses | ✅ | Shown with type label |
| URLs | ✅ | Clickable links (http/https) |
| Organization / title | ✅ | Shown under the name |
| Birthday | ✅ | Shown with birthday icon |
| Note | ✅ | Full note field shown |
| Multi-contact file | ✅ | Multiple vCards in one file all shown |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Contact count, email count, phone count, unique organizations |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Download as CSV | ✅ | One row per contact; Name/Org/Title/Email/Phone/URL/Address/Birthday/Note |
| Download as JSON | ✅ | Array of contact objects |

## Real-World Examples

- [`contacts.vcf`](../examples/contacts.vcf) — example vCard file with multiple contacts

## Known Limitations

- vCard 2.1 encoded fields (Quoted-Printable) may not decode correctly
- `PHOTO` fields (base64 contact photos) are not rendered
- Multiple email/phone values per field are shown but only one is listed in CSV export

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Contact photo display | Med | Easy | Decode base64 PHOTO field and show avatar |
| vCard 2.1 QP decoding | Low | Med | Quoted-Printable value decoding for older vCard files |
| Merge / deduplicate contacts | Low | Hard | Detect and merge duplicate vCard entries |
